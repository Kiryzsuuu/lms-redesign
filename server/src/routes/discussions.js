const express = require('express');
const { LessonComment } = require('../models/LessonComment');
const { Lesson } = require('../models/Lesson');
const { asyncHandler } = require('../utils/asyncHandler');
const { HttpError } = require('../utils/errors');

function discussionsRouter({ requireAuth }) {
  const router = express.Router();

  // GET /api/discussions/lesson/:lessonId
  router.get(
    '/lesson/:lessonId',
    requireAuth,
    asyncHandler(async (req, res) => {
      const comments = await LessonComment.find({
        lessonId: req.params.lessonId,
        parentId: null,
      })
        .populate('userId', 'name fullName avatarUrl')
        .sort({ createdAt: -1 })
        .limit(100);
      res.json({ comments });
    })
  );

  // POST /api/discussions/lesson/:lessonId
  router.post(
    '/lesson/:lessonId',
    requireAuth,
    asyncHandler(async (req, res) => {
      const { content, parentId } = req.body;
      if (!content?.trim()) throw new HttpError(400, 'Content is required');

      const lesson = await Lesson.findById(req.params.lessonId).select('courseId');
      if (!lesson) throw new HttpError(404, 'Lesson not found');

      const comment = await LessonComment.create({
        lessonId: req.params.lessonId,
        courseId: lesson.courseId,
        userId: req.user.sub,
        content: content.trim().slice(0, 2000),
        parentId: parentId || null,
      });

      await comment.populate('userId', 'name fullName avatarUrl');
      res.status(201).json({ comment });
    })
  );

  // DELETE /api/discussions/:commentId
  router.delete(
    '/:commentId',
    requireAuth,
    asyncHandler(async (req, res) => {
      const comment = await LessonComment.findById(req.params.commentId);
      if (!comment) throw new HttpError(404, 'Comment not found');

      const isOwner = String(comment.userId) === String(req.user.sub);
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) throw new HttpError(403, 'Forbidden');

      await comment.deleteOne();
      res.json({ ok: true });
    })
  );

  return router;
}

module.exports = { discussionsRouter };
