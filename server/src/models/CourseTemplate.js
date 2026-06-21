const mongoose = require('mongoose');

const lessonTemplateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ['video', 'text', 'quiz', 'assignment'], default: 'text' },
  },
  { _id: false }
);

const moduleTemplateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    lessons: [lessonTemplateSchema],
  },
  { _id: false }
);

const courseTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    modules: [moduleTemplateSchema],
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = { CourseTemplate: mongoose.model('CourseTemplate', courseTemplateSchema) };
