const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    coverImageUrl: { type: String, default: '' },
    previewVideoUrl: { type: String, default: '' },
    priceIdr: { type: Number, default: 0, min: 0 },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    isPublished: { type: Boolean, default: false, index: true },
    order: { type: Number, default: 0, index: true }, // urutan tampil (drag & drop)
    tags: [{ type: String, trim: true }], // keahlian/topik yang dicakup course ini
    whatYouLearn:  [{ type: String, trim: true }],
    requirements:  [{ type: String, trim: true }],
    targetAudience:[{ type: String, trim: true }],
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseTemplate' }, // template outline yang dipakai
  },
  { timestamps: true }
);

module.exports = { Course: mongoose.model('Course', courseSchema) };
