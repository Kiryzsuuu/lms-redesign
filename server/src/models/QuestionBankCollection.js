const mongoose = require('mongoose');

const questionBankCollectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, index: true },
    description: String,
    category: { type: String, default: '', trim: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BankQuestion' }],
    numQuestions: { type: Number, default: 0 },
    tags: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

questionBankCollectionSchema.index({ createdBy: 1, isActive: 1, createdAt: -1 });

module.exports = {
  QuestionBankCollection: mongoose.model('QuestionBankCollection', questionBankCollectionSchema),
};
