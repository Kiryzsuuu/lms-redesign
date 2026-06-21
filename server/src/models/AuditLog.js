const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Who did the action
  actorId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  actorName:    { type: String, default: '' },
  actorRole:    { type: String, default: '' },

  // What happened
  action:       { type: String, enum: ['create', 'update', 'delete', 'publish', 'unpublish'], required: true, index: true },

  // What was affected
  resource:     { type: String, enum: ['course', 'module', 'lesson', 'quiz', 'question', 'category', 'hero', 'user', 'coupon', 'testimonial'], required: true, index: true },
  resourceId:   { type: mongoose.Schema.Types.ObjectId, index: true },
  resourceName: { type: String, default: '' },   // e.g. lesson title
  parentId:     { type: mongoose.Schema.Types.ObjectId },
  parentName:   { type: String, default: '' },   // e.g. course name when resource=lesson

  // What changed (array of field names, or notes string)
  changedFields: { type: [String], default: [] },
  notes:         { type: String, default: '' },

  // Legacy fields kept for backward compat
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata:     { type: mongoose.Schema.Types.Mixed },
  ip:           { type: String },
  userAgent:    { type: String },
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });

module.exports = { AuditLog: mongoose.model('AuditLog', auditLogSchema) };
