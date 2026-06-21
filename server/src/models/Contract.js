const mongoose = require('mongoose');

const CONTRACT_STATUS = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'completed'];

const contractSchema = new mongoose.Schema(
  {
    courseId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true, index: true },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },

    companyName: { type: String, required: true, trim: true },

    status: {
      type: String,
      enum: CONTRACT_STATUS,
      default: 'sent',
      index: true,
    },

    royaltyRatio:     { type: Number, required: true, min: 0, max: 1 },
    validFrom:        { type: Date, required: true },
    validUntil:       { type: Date, required: true },
    responseDeadline: { type: Date, required: true },

    // Contract body (HTML from RichTextEditor)
    scopeHtml:  { type: String, default: '' },
    ipClause:   { type: String, default: '' },
    ndaActive:  { type: Boolean, default: false },
    bonusClause:{ type: String, default: '' },

    // Teacher's response
    acceptedAt:       { type: Date },
    rejectedAt:       { type: Date },
    rejectionReason:  { type: String, default: '' },

    // Admin notes
    adminNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

contractSchema.index({ courseId: 1, status: 1 });
contractSchema.index({ teacherId: 1, status: 1 });

module.exports = {
  Contract: mongoose.model('Contract', contractSchema),
  CONTRACT_STATUS,
};
