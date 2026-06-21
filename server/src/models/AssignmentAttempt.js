const mongoose = require('mongoose');

const assignmentAttemptSchema = new mongoose.Schema(
  {
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },

    attemptNumber: { type: Number, default: 1, min: 1 },
    
    // File upload
    uploadedFileUrl: String,
    uploadedFileName: String,
    uploadedFileSize: Number, // bytes

    // Question-based answers (same structure as quiz Attempt)
    answers: [
      {
        questionId: mongoose.Schema.Types.ObjectId,
        choiceId: String,
        textAnswer: String,
        matchingAnswer: [{ left: String, right: String }],
      },
    ],

    // Grading
    score: { type: Number, default: 0, min: 0 },
    maxScore: { type: Number, default: 0, min: 0 },
    feedback: String,
    grade: { type: String }, // A, B, C, etc or Pass/Fail
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // teacher/admin who graded
    gradedAt: { type: Date },

    startedAt: { type: Date, required: true },
    submittedAt: { type: Date },
    dueAt: { type: Date },
  },
  { timestamps: true }
);

assignmentAttemptSchema.index({ userId: 1, assignmentId: 1, attemptNumber: 1 });
assignmentAttemptSchema.index({ courseId: 1, userId: 1, createdAt: -1 });

module.exports = { AssignmentAttempt: mongoose.model('AssignmentAttempt', assignmentAttemptSchema) };
