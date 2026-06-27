const express = require('express');
const { z } = require('zod');
const { Category } = require('../models/Category');
const { asyncHandler } = require('../utils/asyncHandler');

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function categoriesRouter({ requireAuth, requireRole }) {
  const router = express.Router();

  // Public: list active categories
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const categories = await Category.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
      res.json({ categories });
    })
  );

  // Admin: list all (including inactive)
  router.get(
    '/all',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const categories = await Category.find().sort({ order: 1, createdAt: 1 });
      res.json({ categories });
    })
  );

  // Admin: create
  router.post(
    '/',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const schema = z.object({
        name:          z.string().min(1),
        slug:          z.string().optional(),
        subtitle:      z.string().optional().default(''),
        coverImageUrl: z.string().optional().default(''),
        accent:        z.string().optional().default('#0C628D'),
        iconBg:        z.string().optional().default('#E0F0FA'),
        order:         z.coerce.number().optional().default(0),
        isActive:      z.coerce.boolean().optional().default(true),
      });
      const data = schema.parse(req.body);
      if (!data.slug) data.slug = slugify(data.name);
      // Urutan otomatis: item baru ditaruh paling akhir.
      if (!req.body.order) data.order = await Category.countDocuments();

      const category = await Category.create(data);
      res.status(201).json({ category });
    })
  );

  // Admin: update
  router.put(
    '/:id',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const schema = z.object({
        name:          z.string().min(1).optional(),
        slug:          z.string().optional(),
        subtitle:      z.string().optional(),
        coverImageUrl: z.string().optional(),
        accent:        z.string().optional(),
        iconBg:        z.string().optional(),
        order:         z.coerce.number().optional(),
        isActive:      z.coerce.boolean().optional(),
      });
      const data = schema.parse(req.body);
      if (data.name && !data.slug) data.slug = slugify(data.name);

      const category = await Category.findByIdAndUpdate(req.params.id, data, { new: true });
      if (!category) return res.status(404).json({ error: { message: 'Category not found' } });
      res.json({ category });
    })
  );

  // Admin: delete
  router.delete(
    '/:id',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      await Category.findByIdAndDelete(req.params.id);
      res.status(204).end();
    })
  );

  return router;
}

module.exports = { categoriesRouter };
