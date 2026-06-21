const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description: { type: String, default: '' },
    discountType: { type: String, enum: ['percentage', 'fixed', 'free'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    maxUsagePerUser: { type: Number, default: 1, min: 0 },
    maxTotalUsage: { type: Number, default: null },
    currentUsageCount: { type: Number, default: 0 },
    validFrom: { type: Date, default: () => new Date() },
    validUntil: { type: Date, default: null },
    minPurchaseAmount: { type: Number, default: 0 },
    applicableCourseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    usageLog: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
        usedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

couponSchema.index({ code: 1, isActive: 1 });
couponSchema.index({ validFrom: 1, validUntil: 1, isActive: 1 });

module.exports = { Coupon: mongoose.model('Coupon', couponSchema) };
