const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    // Optional: if quiz belongs to a specific lesson
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    timeLimitSec: { type: Number, default: 0 },
    randomizeQuestions: { type: Boolean, default: false },
    allowClearAnswers: { type: Boolean, default: false }, // izinkan siswa menghapus/reset jawaban
    maxAttempts: { type: Number, default: 1, min: 1 },
    openedAt: { type: Date },
    closedAt: { type: Date },
    isPublished: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

const questionSchema = new mongoose.Schema(
  {
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    type: { type: String, enum: ['mcq', 'essay', 'matching'], default: 'mcq', index: true },
    prompt: { type: String, default: '' },
    promptHtml: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    choices: {
      type: [{ id: { type: String, required: true }, text: { type: String, required: true }, imageUrl: { type: String, default: '' } }],
      default: [],
      validate: {
        validator: function (arr) {
          if (this.type !== 'mcq') return true;
          return Array.isArray(arr) && arr.length >= 2;
        },
        message: 'choices must have at least 2 items for mcq',
      },
    },
    correctChoiceId: {
      type: String,
      required: function () {
        return this.type === 'mcq';
      },
    },
    pairs: {
      type: [{ left: { type: String, required: true }, right: { type: String, required: true } }],
      default: [],
      validate: {
        validator: function (arr) {
          if (this.type !== 'matching') return true;
          return Array.isArray(arr) && arr.length >= 2;
        },
        message: 'pairs must have at least 2 items for matching',
      },
    },
    rubric: { type: String, default: '' },
    order: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

questionSchema.index({ quizId: 1, order: 1 });

module.exports = {
  Quiz: mongoose.model('Quiz', quizSchema),
  Question: mongoose.model('Question', questionSchema),
};
