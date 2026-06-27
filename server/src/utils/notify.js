const { Notification } = require('../models/Notification');
const { User } = require('../models/User');
const { sendNewCourseNotification } = require('./emailNotifications');

/**
 * Fan out a "new course" notification to all students:
 *  - persist an in-app Notification per student
 *  - send an email (best-effort) to each student
 *
 * Runs in the background; never throws to the caller.
 */
async function notifyStudentsNewCourse(env, course) {
  try {
    const students = await User.find({ role: 'student' }).select('email name fullName');
    if (students.length === 0) return;

    const link = `/courses/${course._id}`;
    const body =
      (course.priceIdr || 0) > 0
        ? `Harga: Rp ${Number(course.priceIdr).toLocaleString('id-ID')}`
        : 'Gratis · Mulai belajar sekarang';

    // In-app notifications (bulk insert).
    await Notification.insertMany(
      students.map((s) => ({
        userId: s._id,
        type: 'new_course',
        title: `Kursus baru: ${course.title}`,
        body,
        link,
        courseId: course._id,
      })),
      { ordered: false }
    ).catch((e) => console.error('[notify] insert failed:', e?.message));

    // Emails (best-effort, sequential to avoid hammering SMTP).
    for (const s of students) {
      try {
        await sendNewCourseNotification(env, {
          userEmail: s.email,
          userName: s.fullName || s.name || 'Pengguna',
          courseName: course.title,
          courseId: course._id,
          coursePrice: course.priceIdr || 0,
        });
      } catch (e) {
        console.error(`[notify] email to ${s.email} failed:`, e?.message);
      }
    }
  } catch (e) {
    console.error('[notify] notifyStudentsNewCourse failed:', e?.message);
  }
}

module.exports = { notifyStudentsNewCourse };
