const mongoose = require('mongoose');

const bankQuestionSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['mcq', 'essay', 'matching'], default: 'mcq', index: true },
    promptHtml: { type: String, default: '' },
    questionImageUrl: { type: String, default: '' },

    choices: {
      type: [{ id: { type: String, required: true }, text: { type: String, required: true }, imageUrl: { type: String, default: '' } }],
      default: [],
    },
    correctChoiceId: { type: String, default: '' },

    pairs: { type: [{ left: { type: String, required: true }, right: { type: String, required: true } }], default: [] },

    rubric: { type: String, default: '' },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

bankQuestionSchema.index({ ownerId: 1, createdAt: -1 });

module.exports = { BankQuestion: mongoose.model('BankQuestion', bankQuestionSchema) };
