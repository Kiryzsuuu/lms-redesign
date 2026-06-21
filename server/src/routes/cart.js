const express = require('express');
const { z } = require('zod');
const { Cart } = require('../models/Cart');
const { Course } = require('../models/Course');
const { asyncHandler } = require('../utils/asyncHandler');
const { HttpError } = require('../utils/errors');

function cartRouter({ requireAuth, requireRole }) {
  const router = express.Router();

  router.get(
    '/',
    requireAuth,
    requireRole('student'),
    asyncHandler(async (req, res) => {
      const cart = await Cart.findOne({ userId: req.user.sub }).lean();
      const ids = (cart?.items || []).map((i) => i.courseId);
      const courses = ids.length
        ? await Course.find({ _id: { $in: ids }, isPublished: true }).lean()
        : [];

      const byId = new Map(courses.map((c) => [String(c._id), c]));
      const items = (cart?.items || [])
        .map((i) => byId.get(String(i.courseId)))
        .filter(Boolean)
        .map((c) => ({
          course: {
            _id: c._id,
            title: c.title,
            description: c.description,
            coverImageUrl: c.coverImageUrl,
            priceIdr: c.priceIdr || 0,
          },
        }));

      const totalIdr = items.reduce((sum, it) => sum + (it.course.priceIdr || 0), 0);
      res.json({ items, totalIdr });
    })
  );

  router.post(
    '/items',
    requireAuth,
    requireRole('student'),
    asyncHandler(async (req, res) => {
      const schema = z.object({ courseId: z.string().min(1) });
      const { courseId } = schema.parse(req.body);

      const course = await Course.findById(courseId);
      if (!course || !course.isPublished) throw new HttpError(404, 'Course not found');

      const cart = await Cart.findOneAndUpdate(
        { userId: req.user.sub },
        { $setOnInsert: { userId: req.user.sub }, $addToSet: { items: { courseId } } },
        { new: true, upsert: true }
      );

      res.status(201).json({ ok: true, cartId: cart._id });
    })
  );

  router.delete(
    '/items/:courseId',
    requireAuth,
    requireRole('student'),
    asyncHandler(async (req, res) => {
      const courseId = req.params.courseId;
      await Cart.updateOne({ userId: req.user.sub }, { $pull: { items: { courseId } } });
      res.status(204).end();
    })
  );

  router.post(
    '/clear',
    requireAuth,
    requireRole('student'),
    asyncHandler(async (req, res) => {
      await Cart.findOneAndUpdate({ userId: req.user.sub }, { $set: { items: [] } }, { upsert: true });
      res.json({ ok: true });
    })
  );

  return router;
}

module.exports = { cartRouter };
