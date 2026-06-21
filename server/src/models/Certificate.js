const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    certificateNumber: { type: String, required: true, unique: true, index: true },
    issuedAt: { type: Date, default: Date.now },
    completionDate: { type: Date, required: true },
    score: { type: Number, default: 0 },
    metadata: {
      userName: { type: String, default: '' },
      courseName: { type: String, default: '' },
      instructorName: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

certificateSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = { Certificate: mongoose.model('Certificate', certificateSchema) };
