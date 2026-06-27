const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { User } = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');
const { HttpError } = require('../utils/errors');
const { getEnv } = require('../utils/env');
const { sha256Hex, randomTokenHex } = require('../utils/crypto');
const { hasSmtpConfigured, sendMail, getSmtpConfig } = require('../utils/mailer');
const { sendWelcomeEmail, sendOTP } = require('../utils/emailNotifications');
const { buildClientUrl } = require('../utils/urls');
const { OTP } = require('../models/OTP');
const { generateOTP, getOTPExpiration } = require('../utils/otp');

function authRouter({ jwtSecret }) {
  const router = express.Router();

  // Token berlaku 5 jam. Diperpanjang otomatis oleh client selama user aktif
  // (sliding refresh). Jika idle 5 jam, token kedaluwarsa -> harus login + OTP.
  const TOKEN_TTL = '5h';

  async function createAndSendOtp(env, { email, type, meta }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) throw new HttpError(400, 'Email harus diisi');

    const code = generateOTP();
    const expiresAt = getOTPExpiration();

    // Invalidate previous OTPs for this email+type.
    await OTP.updateMany({ email: normalizedEmail, type, verified: false }, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    await OTP.create({
      email: normalizedEmail,
      type,
      codeHash: sha256Hex(code),
      expiresAt,
      attempts: 0,
      verified: false,
      meta: meta || undefined,
    });

    // Only expose the code in the API response when OTP debugging is explicitly
    // enabled. Gated solely on DEBUG_OTP (never NODE_ENV) so a server that is
    // accidentally not running in "production" mode can never leak codes.
    const debugOtp = process.env.DEBUG_OTP === 'true';

    // Cek config sebenarnya: DB lebih dulu, lalu env (bukan env-only).
    const smtpCfg = await getSmtpConfig();
    const smtpReady = Boolean(smtpCfg.host && smtpCfg.user && smtpCfg.pass);
    if (!smtpReady) {
      // No email transport. In debug mode return the code for local testing;
      // otherwise fail loudly so the email service gets configured instead of
      // silently leaving users with no way to receive their code.
      if (debugOtp) return { ok: true, devOtp: code, expiresAt };
      throw new HttpError(500, 'Layanan email belum dikonfigurasi. Hubungi administrator.');
    }

    try {
      await sendOTP(env, { userEmail: normalizedEmail, code, type: type === 'login' ? 'login' : type === 'reset_password' ? 'password' : type === 'email_change' ? 'email' : type === 'password_change' ? 'password' : 'register' });
    } catch (e) {
      // Don't leak SMTP error details to the client.
      if (debugOtp) return { ok: true, devOtp: code, expiresAt };
      throw new HttpError(500, 'Gagal mengirim OTP');
    }

    if (debugOtp) return { ok: true, devOtp: code, expiresAt };

    return { ok: true };
  }

  async function verifyOtp({ email, type, code }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const rawCode = String(code || '').trim();
    if (!normalizedEmail || !rawCode) throw new HttpError(400, 'OTP tidak valid');

    const otp = await OTP.findOne({ email: normalizedEmail, type, verified: false }).sort({ createdAt: -1 });
    if (!otp) throw new HttpError(400, 'OTP tidak valid');
    if (otp.expiresAt.getTime() < Date.now()) throw new HttpError(400, 'OTP expired');
    if ((otp.attempts || 0) >= 3) throw new HttpError(429, 'Terlalu banyak percobaan OTP');

    const ok = sha256Hex(rawCode) === otp.codeHash;
    if (!ok) {
      otp.attempts = (otp.attempts || 0) + 1;
      await otp.save();
      throw new HttpError(400, 'OTP salah');
    }

    otp.verified = true;
    await otp.save();
    return otp;
  }

  router.post(
    '/register',
    asyncHandler(async (req, res) => {
      const env = getEnv();
      const schema = z.object({
        name: z.string().min(2),
        fullName: z.string().min(2).regex(/^[a-zA-Z\s.'-]+$/, 'Nama Lengkap hanya boleh berisi huruf dan spasi'),
        email: z.string().email(),
        password: z.string().min(6),
        whatsappNumber: z.string().optional(),
        institution: z.string().optional(),
        referralSource: z.string().optional(),
        reason: z.string().optional(),
        educationLevel: z.string().optional(),
        referralCode: z.string().optional(), // kode referral dari teacher
      });
      const { name, fullName, email, password, whatsappNumber, institution, referralSource, reason, educationLevel, referralCode } = schema.parse(req.body);

      const normalizedEmail = String(email).toLowerCase();
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) throw new HttpError(409, 'Email already registered');

      // Validasi referral code jika disertakan
      let referredBy;
      if (referralCode) {
        const teacher = await User.findOne({ referralCode: referralCode.toUpperCase().trim() });
        if (!teacher) throw new HttpError(400, 'Kode referral tidak valid');
        referredBy = referralCode.toUpperCase().trim();
      }

      const passwordHash = await bcrypt.hash(password, 10);
      await User.create({
        name,
        fullName,
        email: normalizedEmail,
        passwordHash,
        role: 'student',
        emailVerified: false,
        whatsappNumber,
        institution,
        referralSource,
        reason,
        educationLevel,
        referredBy,
      });

      const otpResult = await createAndSendOtp(env, { email: normalizedEmail, type: 'register' });
      res.status(201).json({ ok: true, requiresOtp: true, email: normalizedEmail, ...otpResult });
    })
  );

  router.post(
    '/register/resend-otp',
    asyncHandler(async (req, res) => {
      const env = getEnv();
      const schema = z.object({ email: z.string().email() });
      const { email } = schema.parse(req.body);

      // Always ok to avoid enumeration.
      const normalizedEmail = String(email).toLowerCase();
      const user = await User.findOne({ email: normalizedEmail }).select('emailVerified');
      if (!user || user.emailVerified) return res.json({ ok: true });

      const out = await createAndSendOtp(env, { email: normalizedEmail, type: 'register' });
      return res.json({ ok: true, ...(out.devOtp ? { devOtp: out.devOtp } : {}) });
    })
  );

  router.post(
    '/register/verify-otp',
    asyncHandler(async (req, res) => {
      const schema = z.object({
        email: z.string().email(),
        code: z.string().min(4),
      });
      const { email, code } = schema.parse(req.body);

      await verifyOtp({ email, type: 'register', code });

      const user = await User.findOne({ email: String(email).toLowerCase() });
      if (!user) throw new HttpError(400, 'Akun tidak ditemukan');

      user.emailVerified = true;
      await user.save();

      // Send welcome email (after verification)
      const env = getEnv();
      try {
        await sendWelcomeEmail(env, {
          userEmail: user.email,
          userName: user.fullName || user.name,
        });
      } catch {
        // ignore
      }

      const token = jwt.sign({ sub: String(user._id), role: user.role, name: user.name }, jwtSecret, {
        expiresIn: TOKEN_TTL,
      });

      res.json({ ok: true, token });
    })
  );

  // Langkah 1: verifikasi email+password, lalu kirim OTP login ke email.
  // Token TIDAK diberikan di sini — wajib verifikasi OTP dulu.
  router.post(
    '/login',
    asyncHandler(async (req, res) => {
      const env = getEnv();
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(1),
      });
      const { email, password } = schema.parse(req.body);

      const user = await User.findOne({ email: String(email).toLowerCase() });
      if (!user) throw new HttpError(401, 'Email atau password salah');

      if (!user.emailVerified) {
        throw new HttpError(403, 'Email belum terverifikasi. Silakan cek OTP di email.');
      }

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) throw new HttpError(401, 'Email atau password salah');

      const otpResult = await createAndSendOtp(env, { email: user.email, type: 'login' });
      res.json({ ok: true, requiresOtp: true, email: user.email, ...otpResult });
    })
  );

  // Langkah 2: verifikasi OTP login -> terbitkan token (berlaku 5 jam).
  router.post(
    '/login/verify-otp',
    asyncHandler(async (req, res) => {
      const schema = z.object({
        email: z.string().email(),
        code: z.string().min(4).max(12),
      });
      const { email, code } = schema.parse(req.body);

      await verifyOtp({ email, type: 'login', code });

      const user = await User.findOne({ email: String(email).toLowerCase() });
      if (!user) throw new HttpError(400, 'Akun tidak ditemukan');

      const token = jwt.sign({ sub: String(user._id), role: user.role, name: user.name }, jwtSecret, {
        expiresIn: TOKEN_TTL,
      });

      res.json({
        token,
        user: {
          _id: String(user._id),
          name: user.name,
          fullName: user.fullName || '',
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
        },
      });
    })
  );

  // Kirim ulang OTP login.
  router.post(
    '/login/resend-otp',
    asyncHandler(async (req, res) => {
      const env = getEnv();
      const schema = z.object({ email: z.string().email() });
      const { email } = schema.parse(req.body);

      // Selalu balas ok untuk mencegah enumerasi akun.
      const normalizedEmail = String(email).toLowerCase();
      const user = await User.findOne({ email: normalizedEmail }).select('emailVerified');
      if (!user || !user.emailVerified) return res.json({ ok: true });

      const out = await createAndSendOtp(env, { email: normalizedEmail, type: 'login' });
      return res.json({ ok: true, ...(out.devOtp ? { devOtp: out.devOtp } : {}) });
    })
  );

  router.get(
    '/me',
    asyncHandler(async (req, res) => {
      const header = req.headers.authorization || '';
      const [type, token] = header.split(' ');
      if (type !== 'Bearer' || !token) throw new HttpError(401, 'Unauthorized');

      let payload;
      try {
        payload = jwt.verify(token, jwtSecret);
      } catch {
        throw new HttpError(401, 'Invalid token');
      }

      const user = await User.findById(payload.sub).select(
        'name fullName email role createdAt emailVerified activeCourseId completedCourseIds purchasedCourseIds institution whatsappNumber referralSource reason educationLevel avatarUrl signatureUrl'
      );
      if (!user) throw new HttpError(401, 'Unauthorized');

      res.json({ user });
    })
  );

  router.post(
    '/forgot-password',
    asyncHandler(async (req, res) => {
      const env = getEnv();
      const schema = z.object({ email: z.string().email() });
      const { email } = schema.parse(req.body);

      // Always respond ok to avoid account enumeration.
      const user = await User.findOne({ email });
      if (!user) return res.json({ ok: true });

      const out = await createAndSendOtp(env, {
        email,
        type: 'reset_password',
      });

      if (process.env.NODE_ENV !== 'production') {
        return res.json({ ok: true, devOtp: out.devOtp });
      }
      return res.json({ ok: true });
    })
  );

  router.post(
    '/reset-password',
    asyncHandler(async (req, res) => {
      const schema = z.object({
        email: z.string().email(),
        code: z.string().min(4).max(12),
        newPassword: z.string().min(6),
      });
      const { email, code, newPassword } = schema.parse(req.body);

      await verifyOtp({ email, type: 'reset_password', code });

      const user = await User.findOne({ email });
      if (!user) throw new HttpError(400, 'Invalid email');

      user.passwordHash = await bcrypt.hash(newPassword, 10);
      // Back-compat cleanup if these fields exist on older user docs.
      user.passwordResetTokenHash = undefined;
      user.passwordResetExpiresAt = undefined;
      await user.save();

      res.json({ ok: true });
    })
  );

  // Require auth middleware
  const { requireAuth } = require('../middleware/auth');
  const authMiddleware = requireAuth(jwtSecret);

  // Sliding refresh: client memanggil ini saat user aktif untuk memperpanjang
  // token 5 jam berikutnya. Jika idle 5 jam, token kedaluwarsa -> 401 -> logout.
  router.post(
    '/refresh',
    authMiddleware,
    asyncHandler(async (req, res) => {
      const user = await User.findById(req.user.sub).select('name role');
      if (!user) throw new HttpError(401, 'Unauthorized');

      const token = jwt.sign({ sub: String(user._id), role: user.role, name: user.name }, jwtSecret, {
        expiresIn: TOKEN_TTL,
      });
      res.json({ token });
    })
  );

  // PUT /auth/me - Update profile
  router.put(
    '/me',
    authMiddleware,
    asyncHandler(async (req, res) => {
      const schema = z.object({
        fullName: z.string().optional(),
        institution: z.string().optional(),
        whatsappNumber: z.string().optional(),
        referralSource: z.string().optional(),
        reason: z.string().optional(),
        educationLevel: z.string().optional(),
        avatarUrl: z.string().optional(),
        signatureUrl: z.string().optional(),
      });
      const updates = schema.parse(req.body);

      const user = await User.findByIdAndUpdate(req.user.sub, updates, { new: true }).select(
        'name fullName email role institution whatsappNumber referralSource reason educationLevel avatarUrl signatureUrl'
      );

      res.json({ user });
    })
  );

  // Email change via OTP
  router.post(
    '/email/request-otp',
    authMiddleware,
    asyncHandler(async (req, res) => {
      const env = getEnv();
      const schema = z.object({ newEmail: z.string().email() });
      const { newEmail } = schema.parse(req.body);

      const existing = await User.findOne({ email: newEmail });
      if (existing && existing._id.toString() !== req.user.sub) {
        throw new HttpError(409, 'Email already in use');
      }

      const out = await createAndSendOtp(env, {
        email: newEmail,
        type: 'email_change',
        meta: { userId: req.user.sub },
      });

      if (process.env.NODE_ENV !== 'production') {
        return res.json({ ok: true, devOtp: out.devOtp });
      }
      return res.json({ ok: true });
    })
  );

  router.post(
    '/email/verify-otp',
    authMiddleware,
    asyncHandler(async (req, res) => {
      const schema = z.object({ newEmail: z.string().email(), code: z.string().min(4).max(12) });
      const { newEmail, code } = schema.parse(req.body);

      const otp = await verifyOtp({ email: newEmail, type: 'email_change', code });
      if (!otp.meta || String(otp.meta.userId) !== String(req.user.sub)) {
        throw new HttpError(400, 'Invalid OTP');
      }

      const user = await User.findByIdAndUpdate(
        req.user.sub,
        { email: newEmail, emailVerified: true },
        { new: true }
      ).select('name email role emailVerified');

      const newToken = jwt.sign({ sub: String(user._id), role: user.role, name: user.name }, jwtSecret, {
        expiresIn: TOKEN_TTL,
      });

      res.json({ ok: true, token: newToken, user });
    })
  );

  // Password change via OTP
  router.post(
    '/password/request-otp',
    authMiddleware,
    asyncHandler(async (req, res) => {
      const env = getEnv();
      const schema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(6) });
      const { currentPassword, newPassword } = schema.parse(req.body);

      const user = await User.findById(req.user.sub).select('email passwordHash');
      if (!user) throw new HttpError(401, 'User not found');

      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) throw new HttpError(400, 'Current password is incorrect');

      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      const out = await createAndSendOtp(env, {
        email: user.email,
        type: 'password_change',
        meta: { userId: req.user.sub, newPasswordHash },
      });

      if (process.env.NODE_ENV !== 'production') {
        return res.json({ ok: true, devOtp: out.devOtp });
      }
      return res.json({ ok: true });
    })
  );

  router.post(
    '/password/verify-otp',
    authMiddleware,
    asyncHandler(async (req, res) => {
      const schema = z.object({ code: z.string().min(4).max(12) });
      const { code } = schema.parse(req.body);

      const user = await User.findById(req.user.sub).select('email');
      if (!user) throw new HttpError(401, 'User not found');

      const otp = await verifyOtp({ email: user.email, type: 'password_change', code });
      if (!otp.meta || String(otp.meta.userId) !== String(req.user.sub) || !otp.meta.newPasswordHash) {
        throw new HttpError(400, 'Invalid OTP');
      }

      await User.findByIdAndUpdate(req.user.sub, { passwordHash: otp.meta.newPasswordHash });

      res.json({ ok: true });
    })
  );

  // PUT /auth/password - Deprecated (use OTP endpoints)
  router.put(
    '/password',
    authMiddleware,
    asyncHandler(async (req, res) => {
      res.status(400).json({
        ok: false,
        message: 'Use /auth/password/request-otp and /auth/password/verify-otp',
      });
    })
  );

  // Debug endpoint - Get last OTP code for testing (development only)
  router.get(
    '/debug/otp/:email/:type',
    asyncHandler(async (req, res) => {
      const { email, type } = req.params;

      // Only allow in development or with debug flag
      if (process.env.NODE_ENV === 'production' && process.env.DEBUG_OTP !== 'true') {
        throw new HttpError(403, 'Endpoint not available in production');
      }

      const normalizedEmail = String(email).toLowerCase();
      const otp = await OTP.findOne({
        email: normalizedEmail,
        type,
        verified: false
      }).sort({ createdAt: -1 });

      if (!otp) {
        throw new HttpError(404, 'No OTP found for this email');
      }

      res.json({
        ok: true,
        email: normalizedEmail,
        type,
        message: 'This endpoint is for testing only. OTP was sent via email.',
        note: 'In production, use the email to get the OTP code'
      });
    })
  );

  return router;
}

module.exports = { authRouter };
