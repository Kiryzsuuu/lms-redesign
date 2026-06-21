const mongoose = require('mongoose');

const royaltyRecordSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    courseTitle: { type: String, required: true },
    grossAmountIdr: { type: Number, required: true, min: 0 }, // harga course yang dibayar
    royaltyRatio: { type: Number, required: true, min: 0, max: 1 }, // snapshot rasio saat transaksi
    royaltyAmountIdr: { type: Number, required: true, min: 0 }, // royalti yang terutang
    status: { type: String, enum: ['pending', 'paid'], default: 'pending', index: true },
    paidAt: { type: Date },
    paidNote: { type: String }, // catatan pembayaran royalti (no. transfer, dll)
  },
  { timestamps: true }
);

module.exports = { RoyaltyRecord: mongoose.model('RoyaltyRecord', royaltyRecordSchema) };
