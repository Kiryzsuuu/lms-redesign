const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['link', 'file'], required: true },
    name: { type: String, default: '' },
    url: { type: String, required: true },
  },
  { _id: false }
);

const lessonSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', index: true, default: null },
    title: { type: String, required: true, trim: true },
    contentMarkdown: { type: String, default: '' },
    contentHtml: { type: String, default: '' },
    attachments: { type: [attachmentSchema], default: [] },

    // Optional sections for a "Lesson" (Model A): video, quiz, assignment.
    videoEmbedUrl: { type: String, default: '' },
    // Optional: customize content flow order in UI (drag & drop).
    // If empty, the UI falls back to a default order.
    contentBlocks: {
      type: [
        {
          type: {
            type: String,
            enum: ['video', 'content', 'attachments'],
            required: true,
          },
          title: { type: String, default: '' },
        },
      ],
      default: [],
    },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },
    assignment: {
      instructionsHtml: { type: String, default: '' },
      openAt: { type: Date },
      closeAt: { type: Date },
      durationSec: { type: Number },
    },

    order: { type: Number, default: 0, index: true },
    isPublished: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

module.exports = { Lesson: mongoose.model('Lesson', lessonSchema) };
