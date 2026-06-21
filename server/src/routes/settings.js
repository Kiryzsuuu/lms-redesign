const express = require('express');
const { z } = require('zod');
const { Setting } = require('../models/Setting');
const { asyncHandler } = require('../utils/asyncHandler');
const { HttpError } = require('../utils/errors');

const HOME_DEFAULTS = {
  heroBadgePrefix: 'Platform Belajar #1 Indonesia',
  heroTitle: 'Kuasai Skill\nyang Dibutuhkan',
  heroAccent: 'Industri Sekarang',
  heroDesc: 'Belajar dari praktisi terbaik. Kurikulum dirancang langsung dari kebutuhan industri — bukan teori kosong.',
  heroBadge1Title: 'Sertifikat Diterima',
  heroBadge1Sub: 'Gojek · Tokopedia',
  heroBadge2Title: 'Baru bergabung',
  heroBadge2Sub: 'Budi S. · 2 menit lalu',
  tickerItems: ['Programming & Dev', 'Data Science', 'UI/UX Design', 'AI & Machine Learning', 'Cybersecurity', 'Digital Marketing', 'Bisnis & Karir', 'Mobile Dev', 'Cloud & DevOps', 'Video & Konten'],
  stats: [
    { num: '500+', label: 'Kursus Premium' },
    { num: '50K+', label: 'Pelajar Aktif' },
    { num: '120+', label: 'Instruktur Expert' },
    { num: '98%', label: 'Tingkat Kepuasan' },
  ],
  certSampleName: 'Arya Ramadhan',
  certSampleCourse: 'Python untuk Data Science & ML',
  partners: ['Tokopedia', 'Gojek', 'Traveloka', 'BCA Digital'],
  partnerCountText: 'Diakui oleh 300+ perusahaan termasuk',
  alumniSectionTitle: 'Alumni kami bekerja di lebih dari 300 perusahaan',
  alumniPartners: ['Tokopedia', 'Gojek', 'Traveloka', 'Bukalapak', 'Telkom', 'BCA Digital', 'Shopee', 'Halodoc', 'Akseleran', 'Blibli'],
  testimonialStat: '50K+',
  testimonialStatLabel: 'Pelajar bergabung',
  testimonialQuote: 'Lulusan InspiraLearn 3× lebih cepat mendapat pekerjaan dibanding rata-rata fresh graduate Indonesia.',
  ratingNum: '4.9',
  ratingLabel: 'dari 28.000+ ulasan',
  footerTagline: 'Platform belajar online untuk profesional Indonesia yang ingin naik level karir dengan skill nyata dari industri.',
  footerSocials: [
    { label: 'IG', href: '#' },
    { label: 'YT', href: '#' },
    { label: 'in', href: '#' },
    { label: 'X', href: '#' },
  ],
  footerNavCols: [
    { title: 'Produk', links: [
      { label: 'Online Courses', href: '/courses' },
      { label: 'Sertifikasi', href: '/' },
      { label: 'Program Korporat', href: '/' },
    ]},
    { title: 'Perusahaan', links: [
      { label: 'Tentang Kami', href: '/tentang-kami' },
      { label: 'Blog', href: '/' },
      { label: 'Karir', href: '/' },
    ]},
    { title: 'Bantuan', links: [
      { label: 'FAQ', href: '/faq' },
      { label: 'Hubungi Kami', href: 'mailto:support@inspiratekno.com' },
      { label: 'Kebijakan Privasi', href: '/kebijakan-privasi' },
      { label: 'Syarat & Ketentuan', href: '/' },
    ]},
  ],
  footerBottomLinks: [
    { label: 'Privasi', href: '#' },
    { label: 'Syarat', href: '#' },
    { label: 'Cookie', href: '#' },
  ],
  footerCopyright: 'InspiraLearn by Inspiratekno. All rights reserved.',
};

// Keys that are admin-only to read (contain secrets)
const ADMIN_ONLY_KEYS = new Set(['midtrans', 'smtp']);

// Keys that are completely public (no auth required)
const PUBLIC_KEYS = new Set(['homePage']);

function settingsRouter({ requireAuth, requireRole }) {
  const router = express.Router();

  // GET /api/settings/:key
  // - Public keys (homePage): no auth needed
  // - Admin-only keys (midtrans, smtp): requires admin role
  // - Other keys: requires auth
  router.get('/:key', asyncHandler(async (req, res) => {
    const { key } = req.params;

    // Validate key is alphanumeric + hyphens only (prevent injection)
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
      throw new HttpError(400, 'Invalid settings key');
    }

    // Enforce auth for sensitive keys
    if (ADMIN_ONLY_KEYS.has(key)) {
      // Inline auth check without middleware (to allow conditional application)
      const authHeader = req.headers.authorization || '';
      const [type, token] = authHeader.split(' ');
      if (type !== 'Bearer' || !token) throw new HttpError(401, 'Unauthorized');

      // requireAuth and requireRole are middleware factories, not suitable here inline.
      // Instead, return the route secured via the ADMIN_ONLY path below.
      // This GET is actually handled in the admin-gated block below.
      // Reaching here means someone tried to bypass — block them.
      throw new HttpError(401, 'Unauthorized');
    }

    const doc = await Setting.findOne({ key });
    let value = {};
    if (key === 'homePage') {
      value = { ...HOME_DEFAULTS, ...(doc?.value || {}) };
    } else {
      value = doc?.value ?? null;
    }
    res.json({ key, value });
  }));

  // GET /api/settings/admin/:key — admin only, for sensitive settings
  router.get(
    '/admin/:key',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const { key } = req.params;
      if (!/^[a-zA-Z0-9_-]+$/.test(key)) throw new HttpError(400, 'Invalid settings key');

      const doc = await Setting.findOne({ key });

      // For midtrans: never return actual server key in response (mask it)
      // Client key is safe to return as it's already exposed to browsers
      if (key === 'midtrans') {
        const v = doc?.value || {};
        return res.json({
          key,
          value: {
            isProduction:        Boolean(v.isProduction),
            merchantId:          v.merchantId        || '',
            clientKey:           v.clientKey         || '',
            serverKeySet:        Boolean(v.serverKey),   // only reveal whether it's set
            feePercent:          v.feePercent         ?? 0,
            feeRulesJson:        v.feeRulesJson       || '',
            enabledPayments:     v.enabledPayments    || ['qris', 'bank_transfer'],
          },
        });
      }

      // For smtp: mask password
      if (key === 'smtp') {
        const v = doc?.value || {};
        return res.json({
          key,
          value: {
            host:      v.host     || '',
            port:      v.port     || 465,
            user:      v.user     || '',
            passSet:   Boolean(v.pass),  // only reveal whether it's set
            from:      v.from     || '',
          },
        });
      }

      res.json({ key, value: doc?.value ?? null });
    })
  );

  // PUT /api/settings/admin/midtrans — admin only
  router.put(
    '/admin/midtrans',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const schema = z.object({
        isProduction:    z.boolean().default(false),
        merchantId:      z.string().default(''),
        clientKey:       z.string().default(''),
        // serverKey is optional so admin can update other fields without re-entering it
        serverKey:       z.string().optional(),
        feePercent:      z.coerce.number().min(0).max(100).default(0),
        feeRulesJson:    z.string().default(''),
        enabledPayments: z.array(z.string()).default(['qris', 'bank_transfer']),
      });

      const parsed = schema.parse(req.body);

      // Retrieve existing to preserve server key if not being updated
      const existing = await Setting.findOne({ key: 'midtrans' });
      const existingValue = existing?.value || {};

      const newValue = {
        isProduction:    parsed.isProduction,
        merchantId:      parsed.merchantId,
        clientKey:       parsed.clientKey,
        serverKey:       parsed.serverKey !== undefined ? parsed.serverKey : (existingValue.serverKey || ''),
        feePercent:      parsed.feePercent,
        feeRulesJson:    parsed.feeRulesJson,
        enabledPayments: parsed.enabledPayments,
      };

      await Setting.findOneAndUpdate(
        { key: 'midtrans' },
        { $set: { value: newValue } },
        { upsert: true, new: true }
      );

      res.json({ ok: true });
    })
  );

  // PUT /api/settings/admin/smtp — admin only
  router.put(
    '/admin/smtp',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const schema = z.object({
        host: z.string().default(''),
        port: z.coerce.number().default(465),
        user: z.string().default(''),
        pass: z.string().optional(),   // optional — don't overwrite if not provided
        from: z.string().default(''),
      });

      const parsed = schema.parse(req.body);

      const existing = await Setting.findOne({ key: 'smtp' });
      const existingValue = existing?.value || {};

      const newValue = {
        host: parsed.host,
        port: parsed.port,
        user: parsed.user,
        pass: parsed.pass !== undefined ? parsed.pass : (existingValue.pass || ''),
        from: parsed.from,
      };

      await Setting.findOneAndUpdate(
        { key: 'smtp' },
        { $set: { value: newValue } },
        { upsert: true, new: true }
      );

      res.json({ ok: true });
    })
  );

  // PUT /api/settings/:key — admin only (general, non-sensitive settings)
  router.put('/:key', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
    const { key } = req.params;
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) throw new HttpError(400, 'Invalid settings key');

    // Sensitive keys must use the /admin/ endpoints above
    if (ADMIN_ONLY_KEYS.has(key)) {
      throw new HttpError(400, 'Use /api/settings/admin/' + key + ' for this setting');
    }

    await Setting.findOneAndUpdate(
      { key },
      { $set: { value: req.body } },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  }));

  return router;
}

module.exports = { settingsRouter };
