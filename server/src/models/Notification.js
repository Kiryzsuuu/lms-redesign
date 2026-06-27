const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, default: 'general', index: true }, // e.g. 'new_course'
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '', trim: true },
    link: { type: String, default: '' }, // in-app relative path, e.g. /courses/:id
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = {
  Notification: mongoose.model('Notification', notificationSchema),
};
