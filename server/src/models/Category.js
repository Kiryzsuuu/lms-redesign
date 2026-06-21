const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, trim: true },
    slug:          { type: String, required: true, trim: true, unique: true, index: true },
    subtitle:      { type: String, default: '' },
    coverImageUrl: { type: String, default: '' },
    accent:        { type: String, default: '#0C628D' },
    iconBg:        { type: String, default: '#E0F0FA' },
    order:         { type: Number, default: 0, index: true },
    isActive:      { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = { Category: mongoose.model('Category', categorySchema) };
