const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const { HttpError } = require('../utils/errors');
const { logAudit } = require('../utils/audit');
const { Lesson } = require('../models/Lesson');
const { Course } = require('../models/Course');
const { User } = require('../models/User');
const { Assignment } = require('../models/Assignment');
const { AssignmentAttempt } = require('../models/AssignmentAttempt');

async function assertStudentCanAccessCourse(courseId, userPayload) {
  if (!userPayload || userPayload.role !== 'student') return;
  const user = await User.findById(userPayload.sub).select('activeCourseId');
  if (!user) throw new HttpError(401, 'Unauthorized');
  if (!user.activeCourseId) {
    throw new HttpError(409, 'Mulai course terlebih dahulu sebelum mengerjakan assignment');
  }
  if (String(user.activeCourseId) !== String(courseId)) {
    throw new HttpError(409, 'Selesaikan course aktif terlebih dahulu sebelum mengerjakan assignment course lain');
  }
}

function computeAvailability(assignment) {
  if (!assignment) return { now: new Date(), openAt: null, closeAt: null, isOpen: true };
  const now = new Date();
  const openAt = assignment.openedAt ? new Date(assignment.openedAt) : null;
  const closeAt = assignment.closedAt ? new Date(assignment.closedAt) : null;
  const isOpen = (!openAt || now >= openAt) && (!closeAt || now <= closeAt);
  return { now, openAt, closeAt, isOpen };
}

function assignmentsRouter({ requireAuth, requireRole }) {
  const router = express.Router();

  // Student: list assignments across enrolled courses with attempt status
  router.get(
    '/mine',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = await User.findById(req.user.sub).select('purchasedCourseIds completedCourseIds activeCourseId');
      if (!user) throw new HttpError(401, 'Unauthorized');
      const courseIds = [
        ...(user.purchasedCourseIds || []),
        ...(user.completedCourseIds || []),
        ...(user.activeCourseId ? [user.activeCourseId] : []),
      ];
      const uniqueIds = [...new Set(courseIds.map((c) => String(c)))];
      if (uniqueIds.length === 0) return res.json({ assignments: [] });

      const assignments = await Assignment.find({ courseId: { $in: uniqueIds } })
        .populate('courseId', 'title')
        .sort({ dueDate: 1, createdAt: -1 })
        .lean();

      const attempts = await AssignmentAttempt.find({
        userId: req.user.sub,
        assignmentId: { $in: assignments.map((a) => a._id) },
      }).select('assignmentId status submittedAt score').lean();
      const byAssignment = new Map(attempts.map((t) => [String(t.assignmentId), t]));

      const now = new Date();
      const result = assignments.map((a) => {
        const attempt = byAssignment.get(String(a._id)) || null;
        const submitted = !!(attempt && attempt.submittedAt);
        const overdue = !submitted && a.dueDate && new Date(a.dueDate) < now;
        return {
          _id: a._id,
          title: a.title,
          type: a.type,
          courseId: a.courseId?._id,
          courseTitle: a.courseId?.title || 'Kursus',
          lessonId: a.lessonId,
          dueDate: a.dueDate || null,
          status: submitted ? 'done' : overdue ? 'late' : 'upcoming',
          score: attempt?.score ?? null,
        };
      });
      res.json({ assignments: result });
    })
  );

  // Get assignment details with student's current attempt
  router.get(
    '/:assignmentId',
    requireAuth,
    asyncHandler(async (req, res) => {
      const assignment = await Assignment.findById(req.params.assignmentId);
      if (!assignment) throw new HttpError(404, 'Assignment not found');

      const course = await Course.findById(assignment.courseId);
      if (!course) throw new HttpError(404, 'Course not found');

      await assertStudentCanAccessCourse(course._id, req.user);

      const { isOpen } = computeAvailability(assignment);

      // Get student's current attempt
      const currentAttempt = await AssignmentAttempt.findOne({
        assignmentId: assignment._id,
        userId: req.user.sub,
      });

      // Check attempt limit
      const previousAttempts = await AssignmentAttempt.countDocuments({
        assignmentId: assignment._id,
        userId: req.user.sub,
        submittedAt: { $exists: true, $ne: null },
      });

      const canAttempt = previousAttempts < (assignment.maxAttempts || 1);

      res.json({
        _id: assignment._id,
        title: assignment.title,
        description: assignment.description,
        type: assignment.type, // 'file_upload' or 'question_based'
        points: assignment.points,
        maxAttempts: assignment.maxAttempts || 1,
        openedAt: assignment.openedAt,
        closedAt: assignment.closedAt,
        isOpen,
        attemptCount: previousAttempts,
        canAttempt,
        currentAttempt: currentAttempt
          ? {
              _id: currentAttempt._id,
              attemptNumber: currentAttempt.attemptNumber,
              startedAt: currentAttempt.startedAt,
              submittedAt: currentAttempt.submittedAt,
              uploadedFile: currentAttempt.uploadedFile,
              answers: currentAttempt.answers,
              score: currentAttempt.score,
              grade: currentAttempt.grade,
              feedback: currentAttempt.feedback,
            }
          : null,
        // For question-based assignment, include question details
        ...(assignment.type === 'question_based' && { questions: assignment.questions }),
      });
    })
  );

  // Start new attempt (creates AssignmentAttempt record)
  router.post(
    '/:assignmentId/start',
    requireAuth,
    asyncHandler(async (req, res) => {
      const assignment = await Assignment.findById(req.params.assignmentId);
      if (!assignment) throw new HttpError(404, 'Assignment not found');

      const course = await Course.findById(assignment.courseId);
      if (!course) throw new HttpError(404, 'Course not found');

      await assertStudentCanAccessCourse(course._id, req.user);

      const { isOpen, now } = computeAvailability(assignment);
      if (!isOpen) throw new HttpError(409, 'Assignment belum dibuka / sudah ditutup');

      // Check attempt limit
      const previousAttempts = await AssignmentAttempt.countDocuments({
        assignmentId: assignment._id,
        userId: req.user.sub,
        submittedAt: { $exists: true, $ne: null },
      });

      if (previousAttempts >= (assignment.maxAttempts || 1)) {
        throw new HttpError(409, 'Anda telah mencapai batas maksimal percobaan');
      }

      // Create new attempt
      const attempt = new AssignmentAttempt({
        assignmentId: assignment._id,
        courseId: assignment.courseId,
        lessonId: assignment.lessonId,
        userId: req.user.sub,
        attemptNumber: previousAttempts + 1,
        startedAt: now,
      });

      await attempt.save();

      res.json({
        ok: true,
        attempt: {
          _id: attempt._id,
          attemptNumber: attempt.attemptNumber,
          startedAt: attempt.startedAt,
        },
      });
    })
  );

  // Submit student's assignment (file or answers)
  router.post(
    '/:assignmentId/submit',
    requireAuth,
    asyncHandler(async (req, res) => {
      const assignment = await Assignment.findById(req.params.assignmentId);
      if (!assignment) throw new HttpError(404, 'Assignment not found');

      const course = await Course.findById(assignment.courseId);
      if (!course) throw new HttpError(404, 'Course not found');

      await assertStudentCanAccessCourse(course._id, req.user);

      const { isOpen, now } = computeAvailability(assignment);
      if (!isOpen) throw new HttpError(409, 'Assignment belum dibuka / sudah ditutup');

      const { attemptId } = req.body;
      const attempt = await AssignmentAttempt.findOne({
        _id: attemptId,
        assignmentId: assignment._id,
        userId: req.user.sub,
      });

      if (!attempt) throw new HttpError(404, 'Attempt not found');
      if (attempt.submittedAt) throw new HttpError(409, 'Assignment sudah disubmit');

      // Handle file upload or question answers
      if (assignment.type === 'file_upload') {
        // For MVP, just store file info; in production use multer/S3
        const { fileName, fileSize, fileType } = req.body;
        if (!fileName) throw new HttpError(400, 'File name required');

        attempt.uploadedFile = {
          fileName,
          fileSize,
          fileType,
          uploadedAt: now,
        };
      } else if (assignment.type === 'question_based') {
        const { answers } = req.body; // answers: [{ questionId, answer }, ...]
        if (!Array.isArray(answers)) throw new HttpError(400, 'Answers must be array');

        attempt.answers = answers;
      }

      attempt.submittedAt = now;
      await attempt.save();

      // Log the submission
      await logAudit({
        action: 'ASSIGNMENT_SUBMIT',
        userId: req.user.sub,
        targetId: assignment._id,
        targetType: 'Assignment',
        details: { attemptNumber: attempt.attemptNumber },
      });

      res.json({
        ok: true,
        attempt: {
          _id: attempt._id,
          attemptNumber: attempt.attemptNumber,
          submittedAt: attempt.submittedAt,
        },
      });
    })
  );

  // Grade assignment (teacher/admin only)
  router.post(
    '/:assignmentId/grade',
    requireAuth,
    requireRole('teacher', 'admin'),
    asyncHandler(async (req, res) => {
      const assignment = await Assignment.findById(req.params.assignmentId);
      if (!assignment) throw new HttpError(404, 'Assignment not found');
      if (req.user.role === 'teacher') {
        const course = await Course.findById(assignment.courseId);
        if (!course || String(course.ownerId) !== String(req.user.sub)) throw new HttpError(403, 'Forbidden');
      }

      const { attemptId, score, feedback, grade } = req.body;
      if (score === undefined || typeof score !== 'number') throw new HttpError(400, 'Score required');
      if (typeof grade !== 'string') throw new HttpError(400, 'Grade required (A/B/C/D/E)');

      const attempt = await AssignmentAttempt.findByIdAndUpdate(
        attemptId,
        {
          $set: {
            score,
            feedback: feedback || '',
            grade,
            gradedBy: req.user.sub,
            gradedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!attempt) throw new HttpError(404, 'Attempt not found');

      // Log grading
      await logAudit({
        action: 'ASSIGNMENT_GRADE',
        userId: req.user.sub,
        targetId: assignment._id,
        targetType: 'Assignment',
        details: { score, grade, attemptId: attempt._id },
      });

      res.json({
        ok: true,
        attempt,
      });
    })
  );

  // Reopen attempt for student (teacher/admin can allow re-attempt)
  router.post(
    '/:assignmentId/reopen',
    requireAuth,
    requireRole('teacher', 'admin'),
    asyncHandler(async (req, res) => {
      const assignment = await Assignment.findById(req.params.assignmentId);
      if (!assignment) throw new HttpError(404, 'Assignment not found');
      if (req.user.role === 'teacher') {
        const course = await Course.findById(assignment.courseId);
        if (!course || String(course.ownerId) !== String(req.user.sub)) throw new HttpError(403, 'Forbidden');
      }

      const { attemptId } = req.body;
      const attempt = await AssignmentAttempt.findByIdAndUpdate(
        attemptId,
        { $set: { submittedAt: null, score: null, grade: null, feedback: null, gradedBy: null, gradedAt: null } },
        { new: true }
      );

      if (!attempt) throw new HttpError(404, 'Attempt not found');

      // Log reopening
      await logAudit({
        action: 'ASSIGNMENT_REOPEN',
        userId: req.user.sub,
        targetId: assignment._id,
        targetType: 'Assignment',
        details: { attemptId: attempt._id },
      });

      res.json({
        ok: true,
        attempt,
      });
    })
  );

  return router;
}

module.exports = { assignmentsRouter };
