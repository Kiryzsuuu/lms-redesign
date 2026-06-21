const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { z } = require('zod');
const { User, ROLES } = require('../models/User');
const { Cart } = require('../models/Cart');
const { Order } = require('../models/Order');
const { LessonProgress } = require('../models/LessonProgress');
const { Attempt } = require('../models/Attempt');
const { AssignmentAttempt } = require('../models/AssignmentAttempt');
const { OTP } = require('../models/OTP');
const { asyncHandler } = require('../utils/asyncHandler');
const { HttpError } = require('../utils/errors');
const { writeAuditLog } = require('../utils/audit');

function generateReferralCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A3F7B2C1"
}

async function ensureUniqueReferralCode() {
  let code;
  let tries = 0;
  do {
    code = generateReferralCode();
    const existing = await User.findOne({ referralCode: code });
    if (!existing) return code;
    tries++;
  } while (tries < 10);
  throw new Error('Gagal generate referral code unik');
}

function adminRouter({ requireAuth, requireRole }) {
  const router = express.Router();

  router.use(requireAuth);
  router.use(requireRole('admin'));

  router.get(
    '/users',
    asyncHandler(async (req, res) => {
      const users = await User.find()
        .select('name email role createdAt referralCode royaltyRatio skills referredBy isFirstPurchaseDone')
        .sort({ createdAt: -1 });
      res.json({ users });
    })
  );

  router.post(
    '/users',
    asyncHandler(async (req, res) => {
      const schema = z.object({
        name: z.string().min(2),
        fullName: z.string().min(2).optional(),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(ROLES),
        royaltyRatio: z.coerce.number().min(0).max(1).optional().default(0),
      });
      const { name, fullName, email, password, role, royaltyRatio } = schema.parse(req.body);

      const existing = await User.findOne({ email });
      if (existing) throw new HttpError(409, 'Email already registered');

      const passwordHash = await bcrypt.hash(password, 10);
      const userData = { name, fullName: fullName || name, email, passwordHash, role, royaltyRatio, emailVerified: true };

      // Auto-generate referral code for teacher/admin
      if (role === 'teacher' || role === 'admin') {
        userData.referralCode = await ensureUniqueReferralCode();
      }

      const user = await User.create(userData);
      res.status(201).json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          referralCode: user.referralCode,
          royaltyRatio: user.royaltyRatio,
        },
      });
    })
  );

  router.put(
    '/users/:id',
    asyncHandler(async (req, res) => {
      const schema = z.object({
        role: z.enum(ROLES).optional(),
        royaltyRatio: z.coerce.number().min(0).max(1).optional(),
        skills: z.array(z.string()).optional(),
      });
      const updates = schema.parse(req.body);

      if (updates.role !== undefined && String(req.params.id) === String(req.user.sub) && updates.role !== req.user.role) {
        throw new HttpError(400, 'Tidak bisa mengubah role diri sendiri');
      }

      const target = await User.findById(req.params.id);
      if (!target) throw new HttpError(404, 'User not found');

      const prevRole = target.role;

      if (updates.role !== undefined) target.role = updates.role;
      if (updates.royaltyRatio !== undefined) target.royaltyRatio = updates.royaltyRatio;
      if (updates.skills !== undefined) target.skills = updates.skills;

      // Auto-generate referral code when promoting to teacher/admin
      const newRole = target.role;
      if ((newRole === 'teacher' || newRole === 'admin') && !target.referralCode) {
        target.referralCode = await ensureUniqueReferralCode();
      }

      await target.save();

      if (updates.role !== undefined) {
        await writeAuditLog({
          req,
          action: 'admin.user.role_updated',
          targetUserId: target._id,
          metadata: { from: prevRole, to: updates.role },
        });
      }

      res.json({
        user: {
          _id: target._id,
          name: target.name,
          email: target.email,
          role: target.role,
          referralCode: target.referralCode,
          royaltyRatio: target.royaltyRatio,
          skills: target.skills,
        },
      });
    })
  );

  // Generate / regenerate referral code for a teacher/admin
  router.post(
    '/users/:id/referral-code',
    asyncHandler(async (req, res) => {
      const target = await User.findById(req.params.id);
      if (!target) throw new HttpError(404, 'User not found');
      if (target.role === 'student') throw new HttpError(400, 'Hanya teacher/admin yang bisa punya referral code');

      target.referralCode = await ensureUniqueReferralCode();
      await target.save();

      res.json({ ok: true, referralCode: target.referralCode });
    })
  );

  router.delete(
    '/users/:id',
    asyncHandler(async (req, res) => {
      const userId = String(req.params.id);
      if (userId === String(req.user.sub)) {
        throw new HttpError(400, 'Tidak bisa menghapus akun sendiri');
      }

      const target = await User.findById(userId).select('role email name');
      if (!target) throw new HttpError(404, 'User not found');

      if (target.role === 'admin') {
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount <= 1) {
          throw new HttpError(400, 'Tidak bisa menghapus admin terakhir');
        }
      }

      await Promise.all([
        Cart.deleteOne({ userId: target._id }),
        Order.deleteMany({ userId: target._id }),
        LessonProgress.deleteMany({ userId: target._id }),
        Attempt.deleteMany({ userId: target._id }),
        AssignmentAttempt.deleteMany({ userId: target._id }),
        OTP.deleteMany({ email: String(target.email || '').toLowerCase() }),
      ]);

      await User.deleteOne({ _id: target._id });

      await writeAuditLog({
        req,
        action: 'admin.user.deleted',
        targetUserId: target._id,
        metadata: { email: target.email, role: target.role, name: target.name },
      });

      res.json({ ok: true });
    })
  );

  return router;
}

module.exports = { adminRouter };
