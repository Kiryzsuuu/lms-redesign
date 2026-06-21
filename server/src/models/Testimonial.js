const mongoose = require('mongoose');

const GRADS = [
  'linear-gradient(135deg,#0C628D,#2E86B5)',
  'linear-gradient(135deg,#E84393,#a0005a)',
  'linear-gradient(135deg,#0FADA8,#0a7a76)',
  'linear-gradient(135deg,#6C5CE7,#a084f5)',
  'linear-gradient(135deg,#F3921B,#D97C0D)',
  'linear-gradient(135deg,#84CC16,#4D7C0F)',
];

const testimonialSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:    { type: String, required: true },
  role:    { type: String, default: '' },
  text:    { type: String, required: true, maxlength: 500 },
  grad:    { type: String, default: GRADS[0] },
  status:  { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
}, { timestamps: true });

module.exports = { Testimonial: mongoose.model('Testimonial', testimonialSchema), GRADS };
