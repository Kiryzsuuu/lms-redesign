const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', index: true },
    title: { type: String, required: true },
    description: String,
    type: { type: String, enum: ['file_upload', 'question_based'], required: true, index: true },
    
    // File upload type
    acceptedFileTypes: { type: [String], default: ['pdf', 'docx', 'doc'] }, // .pdf, .docx, etc
    
    // Question-based type
    questions: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId },
        questionText: String,
        type: String, // multiple_choice, essay, etc
        choices: [{ id: String, text: String }],
        correctChoice: String,
        explanation: String,
        points: { type: Number, default: 1, min: 0 },
      },
    ],
    questionBankId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionBankCollection', index: true },
    selectedQuestionIds: [{ type: mongoose.Schema.Types.ObjectId }], // if pulling from bank
    
    // Attempt limits & timing
    maxAttempts: { type: Number, default: 1, min: 1 },
    openedAt: { type: Date },
    closedAt: { type: Date },
    dueDate: { type: Date },
    
    // Grading
    points: { type: Number, default: 10, min: 0 },
    showAnswers: { type: Boolean, default: false }, // show correct answers after submission
    
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

assignmentSchema.index({ courseId: 1, lessonId: 1, createdAt: -1 });

module.exports = {
  Assignment: mongoose.model('Assignment', assignmentSchema),
};
