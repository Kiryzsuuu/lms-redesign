const express = require('express');
const { z } = require('zod');
const { RoyaltyRecord } = require('../models/RoyaltyRecord');
const { User } = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');
const { HttpError } = require('../utils/errors');

function royaltiesRouter({ requireAuth, requireRole }) {
  const router = express.Router();

  router.use(requireAuth);

  // Admin: list all royalty records (dengan filter opsional)
  // Teacher: hanya milik sendiri
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { teacherId, status, page = 1, limit = 50 } = req.query;
      const filter = {};

      // Fallback: if role is missing from token (old token), fetch from DB
      let userRole = req.user.role;
      if (!userRole && req.user.sub) {
        const dbUser = await User.findById(req.user.sub).select('role').lean();
        userRole = dbUser?.role;
      }

      if (userRole === 'teacher') {
        filter.teacherId = req.user.sub;
      } else if (userRole !== 'admin') {
        throw new HttpError(403, 'Forbidden');
      } else if (teacherId) {
        filter.teacherId = teacherId;
      }

      if (status && ['pending', 'paid'].includes(status)) {
        filter.status = status;
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [records, total] = await Promise.all([
        RoyaltyRecord.find(filter)
          .populate('teacherId', 'name email')
          .populate('studentId', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        RoyaltyRecord.countDocuments(filter),
      ]);

      // Summary stats
      const pendingTotal = await RoyaltyRecord.aggregate([
        { $match: { ...filter, status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$royaltyAmountIdr' } } },
      ]);
      const paidTotal = await RoyaltyRecord.aggregate([
        { $match: { ...filter, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$royaltyAmountIdr' } } },
      ]);

      res.json({
        records,
        total,
        page: Number(page),
        pendingAmountIdr: pendingTotal[0]?.total || 0,
        paidAmountIdr: paidTotal[0]?.total || 0,
      });
    })
  );

  // Admin: mark royalty record(s) as paid
  router.put(
    '/:id/pay',
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const schema = z.object({
        paidNote: z.string().optional().default(''),
      });
      const { paidNote } = schema.parse(req.body);

      const record = await RoyaltyRecord.findById(req.params.id);
      if (!record) throw new HttpError(404, 'Record tidak ditemukan');
      if (record.status === 'paid') throw new HttpError(400, 'Sudah dibayar');

      record.status = 'paid';
      record.paidAt = new Date();
      record.paidNote = paidNote;
      await record.save();

      res.json({ ok: true, record });
    })
  );

  // Admin: summary per teacher (untuk laporan royalti global)
  router.get(
    '/summary',
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const summary = await RoyaltyRecord.aggregate([
        {
          $group: {
            _id: '$teacherId',
            totalGross: { $sum: '$grossAmountIdr' },
            totalRoyalty: { $sum: '$royaltyAmountIdr' },
            pendingRoyalty: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$royaltyAmountIdr', 0] },
            },
            paidRoyalty: {
              $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$royaltyAmountIdr', 0] },
            },
            transactionCount: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'teacher',
          },
        },
        { $unwind: { path: '$teacher', preserveNullAndEmpty: true } },
        {
          $project: {
            teacherId: '$_id',
            teacherName: '$teacher.name',
            teacherEmail: '$teacher.email',
            royaltyRatio: '$teacher.royaltyRatio',
            totalGross: 1,
            totalRoyalty: 1,
            pendingRoyalty: 1,
            paidRoyalty: 1,
            transactionCount: 1,
          },
        },
        { $sort: { pendingRoyalty: -1 } },
      ]);

      res.json({ summary });
    })
  );

  // Admin: list referral stats — siapa yang mendaftar dengan kode siapa
  router.get(
    '/referrals',
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const { teacherId } = req.query;
      const filter = { referredBy: { $exists: true, $ne: '' } };

      let referralCode;
      if (teacherId) {
        const teacher = await User.findById(teacherId).select('referralCode');
        if (!teacher) throw new HttpError(404, 'Teacher tidak ditemukan');
        referralCode = teacher.referralCode;
        filter.referredBy = referralCode;
      }

      const referred = await User.find(filter)
        .select('name email referredBy isFirstPurchaseDone createdAt purchasedCourseIds')
        .sort({ createdAt: -1 })
        .lean();

      res.json({ referred });
    })
  );

  return router;
}

module.exports = { royaltiesRouter };
