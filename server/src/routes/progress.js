const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const { HttpError } = require('../utils/errors');
const { User } = require('../models/User');
const { Lesson } = require('../models/Lesson');
const { Course } = require('../models/Course');
const { LessonProgress } = require('../models/LessonProgress');
const { Quiz } = require('../models/Quiz');
const { Attempt } = require('../models/Attempt');

function progressRouter({ requireAuth }) {
  const router = express.Router();

  // Student progress (active/completed courses)
  router.get(
    '/me',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = await User.findById(req.user.sub).select('activeCourseId completedCourseIds role');
      if (!user) throw new HttpError(401, 'Unauthorized');
      res.json({
        activeCourseId: user.activeCourseId || null,
        completedCourseIds: user.completedCourseIds || [],
        role: user.role,
      });
    })
  );

  // Student: progress for a course (per-lesson completion)
  router.get(
    '/course/:courseId',
    requireAuth,
    asyncHandler(async (req, res) => {
      const course = await Course.findById(req.params.courseId);
      if (!course) throw new HttpError(404, 'Course not found');

      const lessons = await Lesson.find({ courseId: course._id, isPublished: true }).sort({ order: 1, createdAt: 1 });
      const rows = await LessonProgress.find({
        userId: req.user.sub,
        courseId: course._id,
        lessonId: { $in: lessons.map((l) => l._id) },
      }).select('lessonId isCompleted completedAt');

      const byLessonId = new Map(rows.map((r) => [String(r.lessonId), r]));
      res.json({
        courseId: course._id,
        lessons: lessons.map((l) => {
          const p = byLessonId.get(String(l._id));
          return {
            lessonId: l._id,
            isCompleted: Boolean(p?.isCompleted),
            completedAt: p?.completedAt || null,
          };
        }),
      });
    })
  );

  // Student: mark lesson as completed (used for lock progression + badges/certificate)
  router.post(
    '/lessons/:lessonId/complete',
    requireAuth,
    asyncHandler(async (req, res) => {
      const lesson = await Lesson.findById(req.params.lessonId);
      if (!lesson || !lesson.isPublished) throw new HttpError(404, 'Lesson not found');

      // Verify student has access to this course (purchased or free)
      const course = await Course.findById(lesson.courseId).select('priceIdr');
      if (!course) throw new HttpError(404, 'Course not found');
      if ((course.priceIdr || 0) > 0) {
        const user = await User.findById(req.user.sub).select('purchasedCourseIds activeCourseId');
        const hasPurchased = (user?.purchasedCourseIds || []).some((id) => String(id) === String(course._id));
        const isActive = String(user?.activeCourseId) === String(course._id);
        if (!hasPurchased && !isActive) throw new HttpError(403, 'Course belum dibeli');
      }

      await LessonProgress.findOneAndUpdate(
        { userId: req.user.sub, courseId: lesson.courseId, lessonId: lesson._id },
        { $set: { isCompleted: true, completedAt: new Date() } },
        { upsert: true, new: true }
      );

      res.json({ ok: true, lessonId: lesson._id });
    })
  );

  // Student: certificate eligibility (simple boolean)
  router.get(
    '/course/:courseId/certificate',
    requireAuth,
    asyncHandler(async (req, res) => {
      const course = await Course.findById(req.params.courseId);
      if (!course) throw new HttpError(404, 'Course not found');

      const lessons = await Lesson.find({ courseId: course._id, isPublished: true }).select('_id');
      if (lessons.length === 0) return res.json({ eligible: false, reason: 'no_lessons', completed: 0, total: 0, quizzesEligible: true, quizzesSubmitted: 0, quizzesTotal: 0 });

      const completed = await LessonProgress.countDocuments({
        userId: req.user.sub,
        courseId: course._id,
        lessonId: { $in: lessons.map((l) => l._id) },
        isCompleted: true,
      });

      // Quiz eligibility: require a submitted attempt for each published quiz in this course.
      const quizzes = await Quiz.find({ courseId: course._id, isPublished: true }).select('_id');
      const quizzesTotal = quizzes.length;
      let quizzesSubmitted = 0;
      let quizzesEligible = true;

      if (quizzesTotal > 0) {
        const submittedQuizIds = await Attempt.distinct('quizId', {
          userId: req.user.sub,
          quizId: { $in: quizzes.map((q) => q._id) },
          submittedAt: { $exists: true },
        });
        quizzesSubmitted = submittedQuizIds.length;
        quizzesEligible = quizzesSubmitted >= quizzesTotal;
      }

      const lessonsEligible = completed >= lessons.length;
      const eligible = lessonsEligible && quizzesEligible;

      res.json({ eligible, completed, total: lessons.length, quizzesEligible, quizzesSubmitted, quizzesTotal });
    })
  );

  return router;
}

module.exports = { progressRouter };
