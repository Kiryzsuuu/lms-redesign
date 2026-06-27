const express = require('express');
const { z } = require('zod');
const { Course } = require('../models/Course');
const { Lesson } = require('../models/Lesson');
const { Quiz, Question } = require('../models/Quiz');
const { QuestionBankCollection } = require('../models/QuestionBankCollection');
const { BankQuestion } = require('../models/QuestionBank');
const { Attempt } = require('../models/Attempt');
const { User } = require('../models/User');
const { LessonProgress } = require('../models/LessonProgress');
const { asyncHandler } = require('../utils/asyncHandler');
const { HttpError } = require('../utils/errors');
const { getEnv } = require('../utils/env');
const { sendProgressReport } = require('../utils/emailNotifications');

async function assertStudentCanAccessCourse(courseId, userPayload) {
  if (!userPayload || userPayload.role !== 'student') return;
  const user = await User.findById(userPayload.sub).select('activeCourseId');
  if (!user) throw new HttpError(401, 'Unauthorized');
  if (!user.activeCourseId) {
    throw new HttpError(409, 'Mulai course terlebih dahulu sebelum mengerjakan quiz');
  }
  if (String(user.activeCourseId) !== String(courseId)) {
    throw new HttpError(409, 'Selesaikan course aktif terlebih dahulu sebelum mengerjakan quiz course lain');
  }
}

async function assertCanEditCourse(courseId, user) {
  const course = await Course.findById(courseId);
  if (!course) throw new HttpError(404, 'Course not found');
  if (user.role === 'admin') return course;
  if (user.role === 'teacher' && String(course.ownerId) === String(user.sub)) return course;
  throw new HttpError(403, 'Forbidden');
}

function quizzesRouter({ requireAuth, requireRole }) {
  const router = express.Router();

  async function syncQuizLessonLink({ quizId, courseId, lessonId }) {
    // Clear existing lesson links for this quiz
    await Lesson.updateMany({ courseId, quizId }, { $unset: { quizId: 1 } });

    if (!lessonId) return;

    const lesson = await Lesson.findOne({ _id: lessonId, courseId });
    if (!lesson) throw new HttpError(400, 'Materi tidak ditemukan untuk course ini');

    // Ensure the selected lesson points to this quiz
    await Lesson.updateOne({ _id: lessonId }, { $set: { quizId } });
  }

  function shuffleCopy(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Teacher/Admin: list quizzes for a course
  router.get(
    '/course/:courseId',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      await assertCanEditCourse(req.params.courseId, req.user);
      const quizzes = await Quiz.find({ courseId: req.params.courseId }).sort({ createdAt: -1 });
      res.json({ quizzes });
    })
  );

  // Teacher/Admin: create quiz
  router.post(
    '/course/:courseId',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      await assertCanEditCourse(req.params.courseId, req.user);
      const schema = z.object({
        title: z.string().min(2),
        description: z.string().optional().default(''),
        timeLimitSec: z.coerce.number().optional().default(0),
        randomizeQuestions: z.coerce.boolean().optional().default(false),
        allowClearAnswers: z.coerce.boolean().optional().default(false),
        isPublished: z.coerce.boolean().optional().default(false),
        lessonId: z.string().optional().default(''),
      });
      const data = schema.parse(req.body);
      const lessonId = data.lessonId ? String(data.lessonId) : '';
      const quiz = await Quiz.create({
        courseId: req.params.courseId,
        title: data.title,
        description: data.description,
        timeLimitSec: data.timeLimitSec,
        randomizeQuestions: data.randomizeQuestions,
        allowClearAnswers: data.allowClearAnswers,
        isPublished: data.isPublished,
        lessonId: lessonId || undefined,
      });
      await syncQuizLessonLink({ quizId: quiz._id, courseId: quiz.courseId, lessonId: lessonId || null });
      res.status(201).json({ quiz });
    })
  );

  router.put(
    '/:quizId',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const quiz = await Quiz.findById(req.params.quizId);
      if (!quiz) throw new HttpError(404, 'Quiz not found');
      await assertCanEditCourse(quiz.courseId, req.user);

      const schema = z.object({
        title: z.string().min(2),
        description: z.string().optional().default(''),
        timeLimitSec: z.coerce.number().optional().default(0),
        randomizeQuestions: z.coerce.boolean().optional().default(false),
        allowClearAnswers: z.coerce.boolean().optional().default(false),
        isPublished: z.coerce.boolean().optional().default(false),
        lessonId: z.string().optional().default(''),
      });
      const data = schema.parse(req.body);
      const lessonId = data.lessonId ? String(data.lessonId) : '';
      const updated = await Quiz.findByIdAndUpdate(
        req.params.quizId,
        {
          title: data.title,
          description: data.description,
          timeLimitSec: data.timeLimitSec,
          randomizeQuestions: data.randomizeQuestions,
          allowClearAnswers: data.allowClearAnswers,
          isPublished: data.isPublished,
          lessonId: lessonId || undefined,
        },
        { new: true }
      );
      await syncQuizLessonLink({ quizId: updated._id, courseId: updated.courseId, lessonId: lessonId || null });
      res.json({ quiz: updated });
    })
  );

  router.delete(
    '/:quizId',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const quiz = await Quiz.findById(req.params.quizId);
      if (!quiz) throw new HttpError(404, 'Quiz not found');
      await assertCanEditCourse(quiz.courseId, req.user);

      await Lesson.updateMany({ courseId: quiz.courseId, quizId: quiz._id }, { $unset: { quizId: 1 } });

      await Question.deleteMany({ quizId: quiz._id });
      await Attempt.deleteMany({ quizId: quiz._id });
      await Quiz.findByIdAndDelete(req.params.quizId);
      res.status(204).end();
    })
  );

  // Teacher/Admin: quiz preview (meta + questions WITH correct answers, no attempt).
  router.get(
    '/:quizId/preview',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const quiz = await Quiz.findById(req.params.quizId);
      if (!quiz) throw new HttpError(404, 'Quiz not found');
      await assertCanEditCourse(quiz.courseId, req.user);

      let lessonId = quiz.lessonId || null;
      if (!lessonId) {
        const l = await Lesson.findOne({ quizId: quiz._id }).select('_id');
        lessonId = l?._id || null;
      }
      const questions = await Question.find({ quizId: quiz._id }).sort({ order: 1, createdAt: 1 });
      res.json({
        quiz: {
          _id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          courseId: quiz.courseId,
          lessonId,
        },
        questions,
      });
    })
  );

  // Teacher/Admin: questions CRUD
  router.get(
    '/:quizId/questions',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const quiz = await Quiz.findById(req.params.quizId);
      if (!quiz) throw new HttpError(404, 'Quiz not found');
      await assertCanEditCourse(quiz.courseId, req.user);

      const questions = await Question.find({ quizId: quiz._id }).sort({ order: 1, createdAt: 1 });
      res.json({ questions });
    })
  );

  router.post(
    '/:quizId/questions',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const quiz = await Quiz.findById(req.params.quizId);
      if (!quiz) throw new HttpError(404, 'Quiz not found');
      await assertCanEditCourse(quiz.courseId, req.user);

      const schema = z
        .object({
          type: z.enum(['mcq', 'essay', 'matching']).optional().default('mcq'),
          prompt: z.string().optional().default(''),
          promptHtml: z.string().optional().default(''),
          imageUrl: z.string().optional().default(''),
          choices: z.array(z.object({ id: z.string().min(1), text: z.string().min(1), imageUrl: z.string().optional().default('') })).optional().default([]),
          correctChoiceId: z.string().optional().default(''),
          pairs: z
            .array(z.object({ left: z.string().min(1), right: z.string().min(1) }))
            .optional()
            .default([]),
          rubric: z.string().optional().default(''),
          order: z.coerce.number().optional().default(0),
        })
        .superRefine((val, ctx) => {
          const promptOk = (val.promptHtml && val.promptHtml.trim()) || (val.prompt && val.prompt.trim());
          if (!promptOk) ctx.addIssue({ code: 'custom', path: ['prompt'], message: 'prompt is required' });
          if (val.type === 'mcq') {
            if (!Array.isArray(val.choices) || val.choices.length < 2) {
              ctx.addIssue({ code: 'custom', path: ['choices'], message: 'choices must have at least 2 items' });
            }
            if (!val.correctChoiceId) {
              ctx.addIssue({ code: 'custom', path: ['correctChoiceId'], message: 'correctChoiceId is required' });
            }
          }
          if (val.type === 'matching') {
            if (!Array.isArray(val.pairs) || val.pairs.length < 2) {
              ctx.addIssue({ code: 'custom', path: ['pairs'], message: 'pairs must have at least 2 items' });
            }
          }
        });
      const data = schema.parse(req.body);
      const question = await Question.create({ ...data, quizId: quiz._id });
      res.status(201).json({ question });
    })
  );

  router.put(
    '/:quizId/questions/:questionId',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const quiz = await Quiz.findById(req.params.quizId);
      if (!quiz) throw new HttpError(404, 'Quiz not found');
      await assertCanEditCourse(quiz.courseId, req.user);

      const schema = z
        .object({
          type: z.enum(['mcq', 'essay', 'matching']).optional(),
          prompt: z.string().optional(),
          promptHtml: z.string().optional(),
          imageUrl: z.string().optional(),
          choices: z.array(z.object({ id: z.string().min(1), text: z.string().min(1), imageUrl: z.string().optional().default('') })).optional(),
          correctChoiceId: z.string().optional(),
          pairs: z
            .array(z.object({ left: z.string().min(1), right: z.string().min(1) }))
            .optional(),
          rubric: z.string().optional(),
          order: z.coerce.number().optional(),
        })
        .superRefine((val, ctx) => {
          // Only validate content fields if prompt/promptHtml is being updated
          if ('promptHtml' in val || 'prompt' in val) {
            const promptOk = (val.promptHtml && val.promptHtml.trim()) || (val.prompt && val.prompt.trim());
            if (!promptOk) ctx.addIssue({ code: 'custom', path: ['prompt'], message: 'prompt is required' });
          }

          // Only validate type-specific fields if they're being updated
          if ('type' in val || 'choices' in val || 'correctChoiceId' in val || 'pairs' in val) {
            const type = val.type || 'mcq';
            
            if (type === 'mcq') {
              if ('choices' in val) {
                if (!Array.isArray(val.choices) || val.choices.length < 2) {
                  ctx.addIssue({ code: 'custom', path: ['choices'], message: 'choices must have at least 2 items' });
                }
              }
              if ('correctChoiceId' in val && !val.correctChoiceId) {
                ctx.addIssue({ code: 'custom', path: ['correctChoiceId'], message: 'correctChoiceId is required' });
              }
            }
            
            if (type === 'matching') {
              if ('pairs' in val) {
                if (!Array.isArray(val.pairs) || val.pairs.length < 2) {
                  ctx.addIssue({ code: 'custom', path: ['pairs'], message: 'pairs must have at least 2 items' });
                }
              }
            }
          }
        });
      const data = schema.parse(req.body);
      
      // Remove undefined fields so MongoDB only updates what was provided
      const updateData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );

      const question = await Question.findOneAndUpdate(
        { _id: req.params.questionId, quizId: quiz._id },
        updateData,
        { new: true }
      );
      if (!question) throw new HttpError(404, 'Question not found');
      res.json({ question });
    })
  );

  router.delete(
    '/:quizId/questions/:questionId',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const quiz = await Quiz.findById(req.params.quizId);
      if (!quiz) throw new HttpError(404, 'Quiz not found');
      await assertCanEditCourse(quiz.courseId, req.user);

      await Question.deleteOne({ _id: req.params.questionId, quizId: quiz._id });
      res.status(204).end();
    })
  );

  // Teacher/Admin: import N questions from question bank collection into a quiz
  router.post(
    '/:quizId/import-from-bank',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const quiz = await Quiz.findById(req.params.quizId);
      if (!quiz) throw new HttpError(404, 'Quiz not found');
      await assertCanEditCourse(quiz.courseId, req.user);

      const schema = z.object({
        collectionId: z.string().min(1),
        count: z.coerce.number().int().min(1).max(200),
        shuffle: z.coerce.boolean().optional().default(true),
        questionTypes: z.array(z.enum(['mcq', 'essay', 'matching'])).optional().default(['mcq', 'essay', 'matching']),
      });
      const data = schema.parse(req.body);

      const collectionQuery = { _id: data.collectionId, isActive: true };
      if (req.user.role !== 'admin') {
        collectionQuery.createdBy = req.user.sub;
      }

      const collection = await QuestionBankCollection.findOne(collectionQuery).lean();
      if (!collection) throw new HttpError(404, 'Koleksi tidak ditemukan');

      const bankQuestions = await BankQuestion.find({ _id: { $in: collection.questions || [] } }).lean();
      if (!bankQuestions.length) return res.json({ imported: 0 });

      const bankById = new Map(bankQuestions.map((q) => [String(q._id), q]));
      const ordered = (collection.questions || []).map((qid) => bankById.get(String(qid))).filter(Boolean);
      
      // Filter by question types
      const filtered = ordered.filter((q) => data.questionTypes.includes(q.type || 'mcq'));
      if (!filtered.length) return res.json({ imported: 0 });
      
      const source = data.shuffle ? shuffleCopy(filtered) : filtered;
      const picked = source.slice(0, Math.min(data.count, source.length));

      const last = await Question.findOne({ quizId: quiz._id }).sort({ order: -1 }).select('order').lean();
      const startOrder = Number(last?.order || 0) + 1;

      const docs = picked.map((bq, idx) => ({
        quizId: quiz._id,
        type: bq.type || 'mcq',
        promptHtml: bq.promptHtml || '',
        prompt: '',
        imageUrl: bq.questionImageUrl || '',
        choices: Array.isArray(bq.choices) ? bq.choices : [],
        correctChoiceId: bq.correctChoiceId || '',
        pairs: Array.isArray(bq.pairs) ? bq.pairs : [],
        rubric: bq.rubric || '',
        order: startOrder + idx,
      }));

      // Ensure MCQ questions still validate
      const safeDocs = docs.filter((d) => {
        if ((d.type || 'mcq') !== 'mcq') return true;
        return Array.isArray(d.choices) && d.choices.length >= 2 && Boolean(d.correctChoiceId);
      });

      if (!safeDocs.length) return res.json({ imported: 0 });
      await Question.insertMany(safeDocs);
      res.json({ imported: safeDocs.length });
    })
  );

  // Student: get quiz for play (published only)
  router.get(
    '/play/:quizId',
    requireAuth,
    asyncHandler(async (req, res) => {
      const quiz = await Quiz.findById(req.params.quizId);
      if (!quiz || !quiz.isPublished) throw new HttpError(404, 'Quiz not found');

      await assertStudentCanAccessCourse(quiz.courseId, req.user);

      // Link quiz to lesson (prefer quiz.lessonId; fallback to lesson.quizId for older data)
      let lesson = null;
      if (quiz.lessonId) {
        lesson = await Lesson.findById(quiz.lessonId).select('_id courseId order isPublished');
      }
      if (!lesson) {
        lesson = await Lesson.findOne({ quizId: quiz._id }).select('_id courseId order isPublished');
      }

      const questionsRaw = await Question.find({ quizId: quiz._id }).sort({ order: 1, createdAt: 1 });
      if (!questionsRaw.length) throw new HttpError(409, 'Quiz belum memiliki pertanyaan');

      // Resume: find latest in-progress attempt (not submitted)
      let attempt = await Attempt.findOne({ quizId: quiz._id, userId: req.user.sub, submittedAt: { $exists: false } })
        .sort({ createdAt: -1 });

      // If the attempt has no question order (older data), restore from current questions
      // Use the non-randomized order for old data to keep it stable
      if (attempt && (!Array.isArray(attempt.questionOrder) || attempt.questionOrder.length === 0)) {
        attempt.questionOrder = questionsRaw.map((q) => q._id);
        if (!attempt.startedAt) attempt.startedAt = new Date();
        await attempt.save();
      }

      // Start new attempt if none — shuffle only at this point so order is locked in
      if (!attempt) {
        const orderedForNew = quiz.randomizeQuestions ? shuffleCopy(questionsRaw) : questionsRaw;
        attempt = await Attempt.create({
          quizId: quiz._id,
          userId: req.user.sub,
          startedAt: new Date(),
          questionOrder: orderedForNew.map((q) => q._id),
          answers: [],
        });
      }

      // Build questions array based on saved order (stable resume, never re-shuffle)
      const byQid = new Map(questionsRaw.map((q) => [String(q._id), q]));
      const orderedQuestions = (attempt.questionOrder || [])
        .map((qid) => byQid.get(String(qid)))
        .filter(Boolean);
      const questions = orderedQuestions.length ? orderedQuestions : questionsRaw;

      const serverNow = new Date();
      const timeLimitSec = Number(quiz.timeLimitSec || 0);
      const startedAt = attempt.startedAt || attempt.createdAt || serverNow;
      const elapsedSec = Math.floor((serverNow.getTime() - new Date(startedAt).getTime()) / 1000);
      const remainingSec = timeLimitSec > 0 ? Math.max(0, timeLimitSec - elapsedSec) : 0;

      // Hide correct answers
      res.json({
        quiz: {
          _id: quiz._id,
          courseId: quiz.courseId,
          lessonId: lesson?._id || null,
          title: quiz.title,
          description: quiz.description,
          timeLimitSec: quiz.timeLimitSec,
          randomizeQuestions: Boolean(quiz.randomizeQuestions),
          allowClearAnswers: Boolean(quiz.allowClearAnswers),
        },
        attempt: {
          _id: attempt._id,
          startedAt,
          answers: attempt.answers || [],
          meta: attempt.meta || undefined,
        },
        serverNow,
        remainingSec,
        questions: questions.map((q) => ({
          _id: q._id,
          type: q.type || 'mcq',
          prompt: q.prompt,
          promptHtml: q.promptHtml,
          imageUrl: q.imageUrl,
          choices: q.type === 'mcq' ? q.choices : [],
          pairs: q.type === 'matching' ? q.pairs : [],
          order: q.order,
        })),
      });
    })
  );

  // Student: autosave in-progress attempt (answers/meta)
  router.patch(
    '/play/:quizId/attempt/:attemptId',
    requireAuth,
    asyncHandler(async (req, res) => {
      const quiz = await Quiz.findById(req.params.quizId);
      if (!quiz || !quiz.isPublished) throw new HttpError(404, 'Quiz not found');

      await assertStudentCanAccessCourse(quiz.courseId, req.user);

      const attempt = await Attempt.findOne({ _id: req.params.attemptId, quizId: quiz._id, userId: req.user.sub });
      if (!attempt) throw new HttpError(404, 'Attempt not found');
      if (attempt.submittedAt) throw new HttpError(409, 'Attempt already submitted');

      const schema = z.object({
        answers: z
          .array(
            z.object({
              questionId: z.string().min(1),
              choiceId: z.string().optional(),
              textAnswer: z.string().optional(),
              matchingAnswer: z.array(z.object({ left: z.string(), right: z.string() })).optional(),
            })
          )
          .optional(),
        meta: z
          .object({
            currentIdx: z.coerce.number().optional(),
            pinnedById: z.record(z.coerce.boolean()).optional(),
          })
          .optional(),
      });
      const data = schema.parse(req.body);

      if (data.answers) {
        // Replace-by-questionId merge
        const next = new Map((attempt.answers || []).map((a) => [String(a.questionId), a]));
        for (const a of data.answers) {
          next.set(String(a.questionId), {
            questionId: a.questionId,
            choiceId: a.choiceId,
            textAnswer: a.textAnswer,
            matchingAnswer: a.matchingAnswer,
          });
        }
        attempt.answers = Array.from(next.values());
      }

      if (data.meta) {
        attempt.meta = {
          ...(attempt.meta || {}),
          ...(data.meta || {}),
        };
      }

      await attempt.save();
      res.json({ ok: true });
    })
  );

  // Student: submit quiz
  router.post(
    '/play/:quizId/submit',
    requireAuth,
    asyncHandler(async (req, res) => {
      const quiz = await Quiz.findById(req.params.quizId);
      if (!quiz || !quiz.isPublished) throw new HttpError(404, 'Quiz not found');

      await assertStudentCanAccessCourse(quiz.courseId, req.user);

      // Check attempt limiting
      const maxAttempts = quiz.maxAttempts || 1;
      const completedAttempts = await Attempt.countDocuments({
        quizId: quiz._id,
        userId: req.user.sub,
        submittedAt: { $exists: true, $ne: null },
      });

      if (completedAttempts >= maxAttempts) {
        throw new HttpError(409, `Anda telah mencapai batas maksimal percobaan (${maxAttempts})`);
      }

      const schema = z.object({
        attemptId: z.string().optional(),
        answers: z
          .array(
            z.object({
              questionId: z.string().min(1),
              choiceId: z.string().optional(),
              textAnswer: z.string().optional(),
              matchingAnswer: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).optional(),
            })
          )
          .optional()
          .default([]),
      });
      const { attemptId, answers } = schema.parse(req.body);

      const questions = await Question.find({ quizId: quiz._id });
      const byId = new Map(questions.map((q) => [String(q._id), q]));

      // Link quiz to lesson (prefer quiz.lessonId; fallback to lesson.quizId for older data)
      let lesson = null;
      if (quiz.lessonId) {
        lesson = await Lesson.findById(quiz.lessonId).select('_id courseId order isPublished');
      }
      if (!lesson) {
        lesson = await Lesson.findOne({ quizId: quiz._id }).select('_id courseId order isPublished');
      }

      let score = 0;
      // maxScore = auto-gradable (MCQ) questions only; essay/matching are graded manually
      let maxScore = 0;
      let totalQuestions = questions.length;
      for (const q of questions) {
        if ((q.type || 'mcq') === 'mcq') maxScore += 1;
      }

      for (const a of answers) {
        const q = byId.get(String(a.questionId));
        if (!q) continue;
        const type = q.type || 'mcq';
        if (type !== 'mcq') continue;
        if (q.correctChoiceId && a.choiceId && q.correctChoiceId === a.choiceId) score += 1;
      }

      const gradingByQuestionId = {};
      for (const q of questions) {
        const type = q.type || 'mcq';
        if (type !== 'mcq') {
          gradingByQuestionId[String(q._id)] = { type, isAutoGradable: false };
          continue;
        }
        const ans = answers.find((x) => String(x.questionId) === String(q._id));
        const selectedChoiceId = ans?.choiceId || null;
        const correctChoiceId = q.correctChoiceId || null;
        const isCorrect = Boolean(correctChoiceId && selectedChoiceId && correctChoiceId === selectedChoiceId);
        gradingByQuestionId[String(q._id)] = {
          type,
          isAutoGradable: true,
          selectedChoiceId,
          correctChoiceId,
          isCorrect,
        };
      }

      let attempt = null;
      if (attemptId) {
        attempt = await Attempt.findOne({ _id: attemptId, quizId: quiz._id, userId: req.user.sub });
      }
      if (!attempt) {
        attempt = await Attempt.findOne({ quizId: quiz._id, userId: req.user.sub, submittedAt: { $exists: false } })
          .sort({ createdAt: -1 });
      }

      if (!attempt) {
        attempt = await Attempt.create({
          quizId: quiz._id,
          userId: req.user.sub,
          startedAt: new Date(),
          questionOrder: questions.map((q) => q._id),
          answers: [],
        });
      }

      attempt.answers = answers.map((a) => ({
        questionId: a.questionId,
        choiceId: a.choiceId,
        textAnswer: a.textAnswer,
        matchingAnswer: a.matchingAnswer,
      }));
      attempt.score = score;
      attempt.maxScore = maxScore;
      attempt.totalQuestions = totalQuestions;
      attempt.submittedAt = new Date();
      await attempt.save();

      // If linked to a lesson, mark it completed and compute next lesson
      let nextLessonId = null;
      if (lesson && lesson.isPublished) {
        await LessonProgress.findOneAndUpdate(
          { userId: req.user.sub, courseId: lesson.courseId, lessonId: lesson._id },
          { $set: { isCompleted: true, completedAt: new Date() } },
          { upsert: true, new: true }
        );

        const next = await Lesson.findOne({ courseId: lesson.courseId, isPublished: true, order: { $gt: lesson.order } })
          .sort({ order: 1, createdAt: 1 })
          .select('_id');
        nextLessonId = next?._id || null;
      }

      // Calculate course progress and send email
      const env = getEnv();
      try {
        const user = await User.findById(req.user.sub);
        const course = await Course.findById(quiz.courseId);
        if (user && course) {
          // Get total lessons and completed lessons for this course
          const allLessons = await Lesson.find({ courseId: quiz.courseId, isPublished: true }).count();
          const completedLessons = await LessonProgress.find({
            userId: req.user.sub,
            courseId: quiz.courseId,
            isCompleted: true,
          }).count();
          
          const progress = allLessons > 0 ? Math.round((completedLessons / allLessons) * 100) : 0;

          await sendProgressReport(env, {
            userEmail: user.email,
            userName: user.fullName || user.name,
            courseName: course.title,
            taskName: `${quiz.title} - ${Math.round((score / maxScore) * 100)}%`,
            progress,
            completedAt: new Date(),
          });
        }
      } catch (emailErr) {
        console.error('Failed to send progress report:', emailErr);
        // Don't fail submission if email fails
      }

      res.json({
        attempt: {
          _id: attempt._id,
          score: attempt.score,
          maxScore: attempt.maxScore,
          submittedAt: attempt.submittedAt,
        },
        gradingByQuestionId,
        courseId: quiz.courseId,
        lessonId: lesson?._id || null,
        nextLessonId,
      });
    })
  );

  // Student: my attempts
  router.get(
    '/:quizId/my-attempts',
    requireAuth,
    asyncHandler(async (req, res) => {
      const attempts = await Attempt.find({ quizId: req.params.quizId, userId: req.user.sub })
        .sort({ createdAt: -1 })
        .limit(20);
      res.json({ attempts });
    })
  );

  return router;
}

module.exports = { quizzesRouter };
