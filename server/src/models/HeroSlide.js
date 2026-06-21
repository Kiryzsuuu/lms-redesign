const mongoose = require('mongoose');

const heroSlideSchema = new mongoose.Schema(
  {
    // UI uses image-only slides. Keep legacy fields optional for backward compatibility.
    title: { type: String, default: 'Slide', trim: true },
    subtitle: { type: String, default: '', trim: true },
    ctaText: { type: String, default: 'Mulai' },
    ctaHref: { type: String, default: '/courses' },
    imageUrl: { type: String, default: '' },
    order: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = { HeroSlide: mongoose.model('HeroSlide', heroSlideSchema) };
