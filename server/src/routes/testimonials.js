const express = require('express');
const { z } = require('zod');
const { Testimonial, GRADS } = require('../models/Testimonial');
const { asyncHandler } = require('../utils/asyncHandler');

function testimonialsRouter({ requireAuth, requireRole }) {
  const router = express.Router();

  // Public: approved only
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const testimonials = await Testimonial.find({ status: 'approved' })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('-userId');
      res.json({ testimonials });
    })
  );

  // Student: view own submissions
  router.get(
    '/my',
    requireAuth,
    asyncHandler(async (req, res) => {
      const testimonials = await Testimonial.find({ userId: req.user._id }).sort({ createdAt: -1 });
      res.json({ testimonials });
    })
  );

  // Admin: view all
  router.get(
    '/all',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const testimonials = await Testimonial.find().sort({ createdAt: -1 }).populate('userId', 'name email');
      res.json({ testimonials });
    })
  );

  // Student: submit testimonial (one pending/approved per user at a time)
  router.post(
    '/',
    requireAuth,
    asyncHandler(async (req, res) => {
      if (req.user.role !== 'student') {
        return res.status(403).json({ error: { message: 'Hanya siswa yang dapat mengirim testimoni' } });
      }
      const schema = z.object({
        text: z.string().min(10, 'Minimal 10 karakter').max(500, 'Maksimal 500 karakter'),
        role: z.string().max(100).optional().default(''),
      });
      const { text, role } = schema.parse(req.body);

      // Prevent duplicate pending/approved
      const existing = await Testimonial.findOne({ userId: req.user._id, status: { $in: ['pending', 'approved'] } });
      if (existing) {
        return res.status(409).json({ error: { message: 'Kamu sudah memiliki testimoni yang sedang menunggu persetujuan atau sudah disetujui.' } });
      }

      const total = await Testimonial.countDocuments();
      const grad = GRADS[total % GRADS.length];

      const testimonial = await Testimonial.create({
        userId: req.user._id,
        name: req.user.name,
        role,
        text,
        grad,
        status: 'pending',
      });
      res.status(201).json({ testimonial });
    })
  );

  // Student: delete own pending testimonial (so they can resubmit)
  router.delete(
    '/my',
    requireAuth,
    asyncHandler(async (req, res) => {
      await Testimonial.deleteMany({ userId: req.user._id, status: 'pending' });
      res.status(204).end();
    })
  );

  // Admin: approve
  router.put(
    '/:id/approve',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const t = await Testimonial.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
      if (!t) return res.status(404).json({ error: { message: 'Tidak ditemukan' } });
      res.json({ testimonial: t });
    })
  );

  // Admin: reject
  router.put(
    '/:id/reject',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const t = await Testimonial.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
      if (!t) return res.status(404).json({ error: { message: 'Tidak ditemukan' } });
      res.json({ testimonial: t });
    })
  );

  // Admin: delete
  router.delete(
    '/:id',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      await Testimonial.findByIdAndDelete(req.params.id);
      res.status(204).end();
    })
  );

  return router;
}

module.exports = { testimonialsRouter };
