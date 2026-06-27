const mongoose = require('mongoose');

const ROLES = ['admin', 'teacher', 'student'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // username
    fullName: { type: String, trim: true }, // nama lengkap untuk sertifikat
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: 'student', index: true },

    avatarUrl: { type: String, default: '' },
    signatureUrl: { type: String, default: '' },

    // Profile informasi tambahan
    institution: { type: String, trim: true },
    whatsappNumber: { type: String, trim: true },
    referralSource: { type: String, trim: true }, // Dari mana tahunya (dropdown)
    reason: { type: String, trim: true },
    educationLevel: { type: String, trim: true },

    // Referral system
    referralCode: { type: String, unique: true, sparse: true, index: true }, // kode unik milik teacher/admin
    referredBy: { type: String, trim: true }, // referralCode teacher yang mereferensikan user ini
    isFirstPurchaseDone: { type: Boolean, default: false }, // flag diskon 5% pertama kali

    // Royalti & keahlian (untuk teacher/admin)
    royaltyRatio: { type: Number, default: 0, min: 0, max: 1 }, // 0.30 = 30%
    skills: [{ type: String, trim: true }], // keahlian/bidang yang dikuasai

    activeCourseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    enrolledCourseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }], // semua course yang pernah dimulai (termasuk gratis)
    completedCourseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    purchasedCourseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],

    emailVerified: { type: Boolean, default: false, index: true },

    passwordResetTokenHash: { type: String },
    passwordResetExpiresAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = {
  User: mongoose.model('User', userSchema),
  ROLES,
};
