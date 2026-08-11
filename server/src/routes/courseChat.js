const express = require('express');
const { Course } = require('../models/Course');
const { User } = require('../models/User');
const { CourseChatMessage } = require('../models/CourseChatMessage');
const { asyncHandler } = require('../utils/asyncHandler');
const { HttpError } = require('../utils/errors');

async function loadCourseForChat(courseId) {
  const course = await Course.findById(courseId).select('ownerId chatEnabled title');
  if (!course) throw new HttpError(404, 'Course not found');
  return course;
}

async function assertStudentAccess(req, course) {
  if (!course.chatEnabled) throw new HttpError(403, 'Chat belum diaktifkan untuk course ini');
  const user = await User.findById(req.user.sub).select('purchasedCourseIds');
  const owns = (user?.purchasedCourseIds || []).some((id) => String(id) === String(course._id));
  if (!owns) throw new HttpError(403, 'Anda belum memiliki akses ke course ini');
}

function assertStaffAccess(req, course) {
  const isAdmin = req.user.role === 'admin';
  const isOwner = String(course.ownerId) === String(req.user.sub);
  if (!isAdmin && !isOwner) throw new HttpError(403, 'Forbidden');
}

function courseChatRouter({ requireAuth }) {
  const router = express.Router();

  // GET /api/course-chat/:courseId/threads — daftar student yang sudah chat (untuk teacher/admin)
  router.get(
    '/:courseId/threads',
    requireAuth,
    asyncHandler(async (req, res) => {
      const course = await loadCourseForChat(req.params.courseId);
      assertStaffAccess(req, course);

      const messages = await CourseChatMessage.find({ courseId: course._id })
        .sort({ createdAt: -1 })
        .populate('studentId', 'name fullName email')
        .lean();

      const byStudent = new Map();
      for (const m of messages) {
        const key = String(m.studentId?._id || m.studentId);
        if (!byStudent.has(key)) {
          byStudent.set(key, {
            student: m.studentId,
            lastMessage: m.content,
            lastMessageAt: m.createdAt,
            unread: 0,
          });
        }
        if (!m.readByTeacher && m.senderRole === 'student') {
          byStudent.get(key).unread += 1;
        }
      }

      res.json({ threads: [...byStudent.values()] });
    })
  );

  // GET /api/course-chat/:courseId/messages — student: thread sendiri; teacher/admin: ?studentId=
  router.get(
    '/:courseId/messages',
    requireAuth,
    asyncHandler(async (req, res) => {
      const course = await loadCourseForChat(req.params.courseId);

      let studentId;
      if (req.user.role === 'student') {
        await assertStudentAccess(req, course);
        studentId = req.user.sub;
      } else {
        assertStaffAccess(req, course);
        studentId = req.query.studentId;
        if (!studentId) throw new HttpError(400, 'studentId wajib diisi');
      }

      const messages = await CourseChatMessage.find({ courseId: course._id, studentId })
        .sort({ createdAt: 1 })
        .limit(500);

      const readField = req.user.role === 'student' ? 'readByStudent' : 'readByTeacher';
      await CourseChatMessage.updateMany(
        { courseId: course._id, studentId, [readField]: false },
        { $set: { [readField]: true } }
      );

      res.json({ messages, chatEnabled: course.chatEnabled });
    })
  );

  // POST /api/course-chat/:courseId/messages
  router.post(
    '/:courseId/messages',
    requireAuth,
    asyncHandler(async (req, res) => {
      const course = await loadCourseForChat(req.params.courseId);
      const content = String(req.body.content || '').trim().slice(0, 2000);
      if (!content) throw new HttpError(400, 'Pesan tidak boleh kosong');

      let studentId;
      let senderRole;
      if (req.user.role === 'student') {
        await assertStudentAccess(req, course);
        studentId = req.user.sub;
        senderRole = 'student';
      } else {
        assertStaffAccess(req, course);
        studentId = req.body.studentId;
        if (!studentId) throw new HttpError(400, 'studentId wajib diisi');
        senderRole = 'teacher'; // admin membalas atas nama teacher
      }

      const message = await CourseChatMessage.create({
        courseId: course._id,
        studentId,
        senderRole,
        authorId: req.user.sub,
        content,
        readByStudent: senderRole === 'student',
        readByTeacher: senderRole === 'teacher',
      });

      res.status(201).json({ message });
    })
  );

  return router;
}

module.exports = { courseChatRouter };
