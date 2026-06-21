const express = require('express');
const { z } = require('zod');
const { CourseTemplate } = require('../models/CourseTemplate');
const { asyncHandler } = require('../utils/asyncHandler');
const { HttpError } = require('../utils/errors');

const lessonSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['video', 'text', 'quiz', 'assignment']).default('text'),
});

const moduleSchema = z.object({
  title: z.string().min(1),
  lessons: z.array(lessonSchema).default([]),
});

const templateBodySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().default(''),
  modules: z.array(moduleSchema).default([]),
  isActive: z.boolean().optional().default(true),
});

function courseTemplatesRouter({ requireAuth, requireRole }) {
  const router = express.Router();

  router.use(requireAuth);

  // GET - public untuk teacher/admin (pilih template saat buat course)
  router.get(
    '/',
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const filter = req.user.role === 'admin' ? {} : { isActive: true };
      const templates = await CourseTemplate.find(filter).sort({ createdAt: -1 }).lean();
      res.json({ templates });
    })
  );

  router.get(
    '/:id',
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const template = await CourseTemplate.findById(req.params.id).lean();
      if (!template) throw new HttpError(404, 'Template tidak ditemukan');
      res.json({ template });
    })
  );

  router.post(
    '/',
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const data = templateBodySchema.parse(req.body);
      const template = await CourseTemplate.create({ ...data, createdBy: req.user.sub });
      res.status(201).json({ template });
    })
  );

  router.put(
    '/:id',
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const data = templateBodySchema.parse(req.body);
      const template = await CourseTemplate.findByIdAndUpdate(req.params.id, data, { new: true });
      if (!template) throw new HttpError(404, 'Template tidak ditemukan');
      res.json({ template });
    })
  );

  router.delete(
    '/:id',
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const template = await CourseTemplate.findByIdAndDelete(req.params.id);
      if (!template) throw new HttpError(404, 'Template tidak ditemukan');
      res.status(204).end();
    })
  );

  return router;
}

module.exports = { courseTemplatesRouter };
