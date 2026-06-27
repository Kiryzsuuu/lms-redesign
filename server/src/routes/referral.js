const express = require('express');
const crypto = require('crypto');
const { z } = require('zod');
const { User } = require('../models/User');
const { Voucher } = require('../models/Voucher');
const { asyncHandler } = require('../utils/asyncHandler');
const { HttpError } = require('../utils/errors');

const MAX_REFERRAL_VOUCHERS = 3;

async function genVoucherCode() {
  let tries = 0;
  do {
    const code = 'VCR-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const existing = await Voucher.findOne({ code }).select('_id');
    if (!existing) return code;
    tries++;
  } while (tries < 10);
  throw new Error('Gagal generate kode voucher');
}

function referralRouter({ requireAuth }) {
  const router = express.Router();

  // Buyer memasukkan kode referral milik orang lain -> referrer dapat voucher 5%.
  router.post(
    '/redeem',
    requireAuth,
    asyncHandler(async (req, res) => {
      const { code } = z.object({ code: z.string().min(1) }).parse(req.body);
      const norm = code.toUpperCase().trim();

      const referrer = await User.findOne({ referralCode: norm }).select('_id');
      if (!referrer) throw new HttpError(400, 'Kode referral tidak valid');
      if (String(referrer._id) === String(req.user.sub)) {
        throw new HttpError(400, 'Tidak bisa memakai kode referral sendiri');
      }

      // 1 voucher per pembeli unik
      const already = await Voucher.findOne({ userId: referrer._id, fromUserId: req.user.sub }).select('_id');
      if (already) {
        return res.json({ ok: true, granted: false, message: 'Kode referral ini sudah pernah kamu pakai.' });
      }

      // Maksimal 3 voucher referral seumur hidup
      const count = await Voucher.countDocuments({ userId: referrer._id, source: 'referral' });
      if (count >= MAX_REFERRAL_VOUCHERS) {
        return res.json({ ok: true, granted: false, message: 'Kode referral diterima.' });
      }

      try {
        await Voucher.create({
          userId: referrer._id,
          fromUserId: req.user.sub,
          code: await genVoucherCode(),
          discountPercent: 5,
          source: 'referral',
        });
      } catch (e) {
        if (e?.code === 11000) {
          return res.json({ ok: true, granted: false, message: 'Kode referral ini sudah pernah kamu pakai.' });
        }
        throw e;
      }

      res.json({ ok: true, granted: true, message: 'Terima kasih! Pemilik kode mendapat voucher diskon 5%.' });
    })
  );

  // Voucher milik user yang login (untuk halaman "Voucher Saya").
  router.get(
    '/my-vouchers',
    requireAuth,
    asyncHandler(async (req, res) => {
      const vouchers = await Voucher.find({ userId: req.user.sub }).sort({ createdAt: -1 }).lean();
      const me = await User.findById(req.user.sub).select('referralCode').lean();
      res.json({
        referralCode: me?.referralCode || '',
        vouchers,
        earnedCount: vouchers.length,
        maxVouchers: MAX_REFERRAL_VOUCHERS,
      });
    })
  );

  return router;
}

module.exports = { referralRouter, MAX_REFERRAL_VOUCHERS };
