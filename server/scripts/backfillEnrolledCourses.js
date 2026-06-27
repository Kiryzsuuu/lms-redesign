// One-off migration: populate User.enrolledCourseIds for users who started courses
// (especially free ones) before enrolledCourseIds existed.
//
// enrolledCourseIds = union of:
//   - existing enrolledCourseIds
//   - activeCourseId
//   - purchasedCourseIds
//   - completedCourseIds
//   - every courseId the user has LessonProgress in
//
// Run: node scripts/backfillEnrolledCourses.js
const dotenv = require('dotenv');
const { connectDb } = require('../src/db');
const { getEnv } = require('../src/utils/env');
const { User } = require('../src/models/User');
const { LessonProgress } = require('../src/models/LessonProgress');

async function main() {
  dotenv.config();
  const env = getEnv();
  await connectDb(env.MONGO_URI);

  const users = await User.find({ role: 'student' }).select(
    'enrolledCourseIds activeCourseId purchasedCourseIds completedCourseIds'
  );

  let updated = 0;
  for (const user of users) {
    const progressCourseIds = await LessonProgress.distinct('courseId', { userId: user._id });

    const union = new Set([
      ...(user.enrolledCourseIds || []).map((x) => String(x)),
      ...(user.purchasedCourseIds || []).map((x) => String(x)),
      ...(user.completedCourseIds || []).map((x) => String(x)),
      ...(user.activeCourseId ? [String(user.activeCourseId)] : []),
      ...progressCourseIds.map((x) => String(x)),
    ]);

    const before = new Set((user.enrolledCourseIds || []).map((x) => String(x)));
    const changed = union.size !== before.size || [...union].some((id) => !before.has(id));

    if (changed) {
      user.enrolledCourseIds = [...union];
      await user.save();
      updated += 1;
      console.log(`Updated ${user._id}: ${user.enrolledCourseIds.length} enrolled courses`);
    }
  }

  console.log(`\nDone. ${updated} of ${users.length} students updated.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
