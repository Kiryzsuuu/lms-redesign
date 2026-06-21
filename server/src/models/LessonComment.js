const mongoose = require('mongoose');

const lessonCommentSchema = new mongoose.Schema(
  {
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'LessonComment', default: null, index: true },
  },
  { timestamps: true }
);

const LessonComment = mongoose.model('LessonComment', lessonCommentSchema);
module.exports = { LessonComment };
