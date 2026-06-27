const express = require('express');
const { z } = require('zod');
const { Teacher } = require('../models/Teacher');
const { Setting } = require('../models/Setting');
const { asyncHandler } = require('../utils/asyncHandler');

const DEFAULT_ABOUT_TEXT = {
  title: 'Tentang Inspira Innovation',
  tagline: 'Platform Pembelajaran Terpadu',
  description: 'Kami menyediakan platform pembelajaran online yang inovatif dengan fitur quiz interaktif untuk mendukung pengembangan skill Anda.',
  mission: 'Memberdayakan individu melalui pendidikan berkualitas tinggi yang dapat diakses oleh semua orang.',
  vision: 'Menjadi platform pembelajaran terdepan yang menginspirasi dan mengembangkan talenta Indonesia.',
};

function aboutRouter({ requireAuth, requireRole }) {
  const router = express.Router();

  // Get about text (public)
  router.get(
    '/text',
    asyncHandler(async (req, res) => {
      const doc = await Setting.findOne({ key: 'aboutPage' });
      const value = doc?.value && typeof doc.value === 'object' ? doc.value : {};
      res.json({ text: { ...DEFAULT_ABOUT_TEXT, ...value } });
    })
  );

  // Update about text (admin, teacher)
  router.put(
    '/text',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const schema = z.object({
        title: z.string().optional().default(DEFAULT_ABOUT_TEXT.title),
        tagline: z.string().optional().default(DEFAULT_ABOUT_TEXT.tagline),
        description: z.string().optional().default(DEFAULT_ABOUT_TEXT.description),
        mission: z.string().optional().default(DEFAULT_ABOUT_TEXT.mission),
        vision: z.string().optional().default(DEFAULT_ABOUT_TEXT.vision),
      });
      const data = schema.parse(req.body);

      const doc = await Setting.findOneAndUpdate(
        { key: 'aboutPage' },
        { $set: { value: data } },
        { new: true, upsert: true }
      );

      res.json({ text: { ...DEFAULT_ABOUT_TEXT, ...(doc?.value || {}) } });
    })
  );

  // Get active teachers (public)
  router.get(
    '/teachers',
    asyncHandler(async (req, res) => {
      const teachers = await Teacher.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
      res.json({ teachers });
    })
  );

  // Get all teachers (admin, teacher)
  router.get(
    '/teachers/all',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const teachers = await Teacher.find().sort({ order: 1, createdAt: 1 });
      res.json({ teachers });
    })
  );

  // Create teacher (admin, teacher)
  router.post(
    '/teachers',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
        role: z.string().optional().default(''),
        bio: z.string().optional().default(''),
        imageUrl: z.string().optional().default(''),
        order: z.coerce.number().optional().default(0),
        isActive: z.coerce.boolean().optional().default(true),
      });
      const data = schema.parse(req.body);
      // Urutan otomatis: anggota baru ditaruh paling akhir.
      if (!req.body.order) data.order = await Teacher.countDocuments();
      const teacher = await Teacher.create(data);
      res.status(201).json({ teacher });
    })
  );

  // Update teacher (admin, teacher)
  router.put(
    '/teachers/:id',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
        role: z.string().optional().default(''),
        bio: z.string().optional().default(''),
        imageUrl: z.string().optional().default(''),
        order: z.coerce.number().optional(),
        isActive: z.coerce.boolean().optional().default(true),
      });
      const data = schema.parse(req.body);
      const teacher = await Teacher.findByIdAndUpdate(req.params.id, data, { new: true });
      res.json({ teacher });
    })
  );

  // Delete teacher (admin)
  router.delete(
    '/teachers/:id',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      await Teacher.findByIdAndDelete(req.params.id);
      res.status(204).end();
    })
  );

  return router;
}

module.exports = { aboutRouter };
