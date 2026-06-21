const express = require('express');
const { Coupon } = require('../models/Coupon');
const { asyncHandler } = require('../utils/asyncHandler');
const { HttpError } = require('../utils/errors');

function couponsRouter({ requireAuth, requireRole }) {
  const router = express.Router();

  // Admin: Create coupon
  router.post(
    '/',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const { code, description, discountType, discountValue, maxUsagePerUser, maxTotalUsage, validFrom, validUntil, minPurchaseAmount, applicableCourseIds } = req.body;

      if (!code || !discountType || discountValue === undefined) {
        throw new HttpError(400, 'Code, discountType, dan discountValue harus diisi');
      }

      if (!['percentage', 'fixed', 'free'].includes(discountType)) {
        throw new HttpError(400, 'Invalid discountType');
      }

      const coupon = await Coupon.create({
        code: code.toUpperCase().trim(),
        description,
        discountType,
        discountValue,
        maxUsagePerUser: maxUsagePerUser || 1,
        maxTotalUsage: maxTotalUsage || null,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        minPurchaseAmount: minPurchaseAmount || 0,
        applicableCourseIds: applicableCourseIds || [],
        createdBy: req.user.sub,
      });

      res.status(201).json({ coupon });
    })
  );

  // Admin: List all coupons
  router.get(
    '/',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const coupons = await Coupon.find().sort({ createdAt: -1 }).limit(100);
      res.json({ coupons });
    })
  );

  // Admin: Get coupon by ID
  router.get(
    '/:couponId',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const coupon = await Coupon.findById(req.params.couponId);
      if (!coupon) throw new HttpError(404, 'Coupon tidak ditemukan');
      res.json({ coupon });
    })
  );

  // Admin: Update coupon
  router.patch(
    '/:couponId',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const { description, discountValue, isActive, maxUsagePerUser, maxTotalUsage, validFrom, validUntil, minPurchaseAmount, applicableCourseIds } = req.body;
      const updates = {};

      if (description !== undefined) updates.description = description;
      if (discountValue !== undefined) updates.discountValue = discountValue;
      if (isActive !== undefined) updates.isActive = isActive;
      if (maxUsagePerUser !== undefined) updates.maxUsagePerUser = maxUsagePerUser;
      if (maxTotalUsage !== undefined) updates.maxTotalUsage = maxTotalUsage;
      if (validFrom !== undefined) updates.validFrom = new Date(validFrom);
      if (validUntil !== undefined) updates.validUntil = validUntil ? new Date(validUntil) : null;
      if (minPurchaseAmount !== undefined) updates.minPurchaseAmount = minPurchaseAmount;
      if (applicableCourseIds !== undefined) updates.applicableCourseIds = applicableCourseIds;

      const coupon = await Coupon.findByIdAndUpdate(req.params.couponId, { $set: updates }, { new: true });
      if (!coupon) throw new HttpError(404, 'Coupon tidak ditemukan');
      res.json({ coupon });
    })
  );

  // Admin: Delete coupon
  router.delete(
    '/:couponId',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const coupon = await Coupon.findByIdAndDelete(req.params.couponId);
      if (!coupon) throw new HttpError(404, 'Coupon tidak ditemukan');
      res.json({ ok: true });
    })
  );

  // Student: Validate coupon (check if applicable and calculate discount)
  router.post(
    '/validate',
    requireAuth,
    requireRole('student'),
    asyncHandler(async (req, res) => {
      const { code, totalAmount, courseIds, referralDiscountAmount } = req.body;

      if (!code) throw new HttpError(400, 'Code harus diisi');

      const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
      if (!coupon) throw new HttpError(404, 'Coupon tidak ditemukan');

      // Check if active
      if (!coupon.isActive) throw new HttpError(400, 'Coupon tidak aktif');

      // Check validity dates
      const now = new Date();
      if (coupon.validFrom && now < coupon.validFrom) throw new HttpError(400, 'Coupon belum berlaku');
      if (coupon.validUntil && now > coupon.validUntil) throw new HttpError(400, 'Coupon sudah kadaluarsa');

      // Check max total usage
      if (coupon.maxTotalUsage && coupon.currentUsageCount >= coupon.maxTotalUsage) {
        throw new HttpError(400, 'Coupon sudah mencapai batas penggunaan');
      }

      // Check user usage limit
      const userUsageCount = (coupon.usageLog || []).filter((log) => String(log.userId) === String(req.user.sub)).length;
      if (userUsageCount >= coupon.maxUsagePerUser) {
        throw new HttpError(400, 'Anda sudah mencapai batas penggunaan coupon ini');
      }

      // Check minimum purchase amount against base after referral (mirrors checkout logic)
      const baseAfterReferral = Math.max(0, (totalAmount || 0) - (referralDiscountAmount || 0));
      if (baseAfterReferral < coupon.minPurchaseAmount) {
        throw new HttpError(400, `Minimum pembelian adalah Rp ${coupon.minPurchaseAmount}`);
      }

      // Check if applicable to courses
      if (coupon.applicableCourseIds.length > 0 && courseIds && courseIds.length > 0) {
        const applicableSet = new Set(coupon.applicableCourseIds.map((id) => String(id)));
        const isApplicable = courseIds.some((id) => applicableSet.has(String(id)));
        if (!isApplicable) throw new HttpError(400, 'Coupon tidak berlaku untuk course yang dipilih');
      }

      // Calculate discount
      let discountAmount = 0;
      if (coupon.discountType === 'percentage') {
        discountAmount = Math.round((totalAmount * coupon.discountValue) / 100);
      } else if (coupon.discountType === 'fixed') {
        discountAmount = coupon.discountValue;
      } else if (coupon.discountType === 'free') {
        discountAmount = totalAmount;
      }

      res.json({
        valid: true,
        coupon: {
          _id: coupon._id,
          code: coupon.code,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
        },
        discountAmount,
        finalAmount: Math.max(0, totalAmount - discountAmount),
      });
    })
  );

  return router;
}

module.exports = { couponsRouter };
