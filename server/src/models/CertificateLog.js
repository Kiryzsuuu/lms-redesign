const mongoose = require('mongoose');

const certificateLogSchema = new mongoose.Schema(
  {
    certificateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Certificate', required: true, index: true },
    certificateNumber: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    action: { type: String, enum: ['generated', 'viewed', 'downloaded'], required: true },
    ip: { type: String, default: '' },
  },
  { timestamps: true }
);

const CertificateLog = mongoose.model('CertificateLog', certificateLogSchema);
module.exports = { CertificateLog };
