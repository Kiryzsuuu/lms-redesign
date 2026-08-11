const mongoose = require('mongoose');

// Chat privat per course antara satu student dan teacher (courseId + studentId = 1 thread).
// Admin bisa membalas atas nama teacher (senderRole tetap 'teacher', authorId tetap admin untuk audit).
const courseChatMessageSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    senderRole: { type: String, enum: ['student', 'teacher'], required: true }, // peran yang ditampilkan
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // pengirim asli (bisa admin)
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    readByStudent: { type: Boolean, default: false },
    readByTeacher: { type: Boolean, default: false },
  },
  { timestamps: true }
);

courseChatMessageSchema.index({ courseId: 1, studentId: 1, createdAt: 1 });

const CourseChatMessage = mongoose.model('CourseChatMessage', courseChatMessageSchema);
module.exports = { CourseChatMessage };
