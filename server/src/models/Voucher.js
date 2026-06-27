const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // pemilik voucher (referrer)
    code: { type: String, required: true, unique: true, index: true },
    discountPercent: { type: Number, default: 5 },
    source: { type: String, default: 'referral' }, // asal voucher
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // pembeli yang memicu voucher
    isUsed: { type: Boolean, default: false, index: true },
    usedAt: { type: Date },
    usedOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  },
  { timestamps: true }
);

// Satu referrer hanya bisa dapat 1 voucher dari pembeli yang sama (anti-abuse).
voucherSchema.index({ userId: 1, fromUserId: 1 }, { unique: true, sparse: true });

module.exports = { Voucher: mongoose.model('Voucher', voucherSchema) };
