const express = require('express');
const { z } = require('zod');
const { HeroSlide } = require('../models/HeroSlide');
const { Setting } = require('../models/Setting');
const { asyncHandler } = require('../utils/asyncHandler');

const DEFAULT_HERO_TEXT = {
  kicker: 'Belajar & Quiz Interaktif',
  heading: 'Belajar Skill Baru, Setiap Hari',
  subheading: 'Course singkat + quiz interaktif ala Kahoot/Quizizz.',
};

function heroesRouter({ requireAuth, requireRole }) {
  const router = express.Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const slides = await HeroSlide.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
      res.json({ slides });
    })
  );

  // Hero text (separate from slides)
  router.get(
    '/text',
    asyncHandler(async (req, res) => {
      const doc = await Setting.findOne({ key: 'heroText' });
      const value = doc?.value && typeof doc.value === 'object' ? doc.value : DEFAULT_HERO_TEXT;
      res.json({ text: { ...DEFAULT_HERO_TEXT, ...value } });
    })
  );

  router.put(
    '/text',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const schema = z.object({
        kicker: z.string().optional().default(DEFAULT_HERO_TEXT.kicker),
        heading: z.string().optional().default(DEFAULT_HERO_TEXT.heading),
        subheading: z.string().optional().default(DEFAULT_HERO_TEXT.subheading),
      });
      const data = schema.parse(req.body);

      const doc = await Setting.findOneAndUpdate(
        { key: 'heroText' },
        { $set: { value: data } },
        { new: true, upsert: true }
      );

      res.json({ text: { ...DEFAULT_HERO_TEXT, ...(doc?.value || {}) } });
    })
  );

  router.get(
    '/all',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const slides = await HeroSlide.find().sort({ order: 1, createdAt: 1 });
      res.json({ slides });
    })
  );

  router.post(
    '/',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const schema = z.object({
        // Slides are image-only in UI; keep these optional for backward compatibility.
        title: z.string().optional().default('Slide'),
        subtitle: z.string().optional().default(''),
        ctaText: z.string().optional().default('Mulai'),
        ctaHref: z.string().optional().default('/courses'),
        imageUrl: z.string().optional().default(''),
        order: z.coerce.number().optional().default(0),
        isActive: z.coerce.boolean().optional().default(true),
      });
      const data = schema.parse(req.body);
      const slide = await HeroSlide.create(data);
      res.status(201).json({ slide });
    })
  );

  router.put(
    '/:id',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const schema = z.object({
        title: z.string().optional().default('Slide'),
        subtitle: z.string().optional().default(''),
        ctaText: z.string().optional().default('Mulai'),
        ctaHref: z.string().optional().default('/courses'),
        imageUrl: z.string().optional().default(''),
        order: z.coerce.number().optional().default(0),
        isActive: z.coerce.boolean().optional().default(true),
      });
      const data = schema.parse(req.body);
      const slide = await HeroSlide.findByIdAndUpdate(req.params.id, data, { new: true });
      res.json({ slide });
    })
  );

  router.delete(
    '/:id',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      await HeroSlide.findByIdAndDelete(req.params.id);
      res.status(204).end();
    })
  );

  return router;
}

module.exports = { heroesRouter };
