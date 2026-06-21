const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../utils/asyncHandler');
const { HttpError } = require('../utils/errors');
const { BankQuestion } = require('../models/QuestionBank');
const { QuestionBankCollection } = require('../models/QuestionBankCollection');

function questionBankRouter({ requireAuth, requireRole }) {
  const router = express.Router();

  function shuffleCopy(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function normalizeNewlines(text) {
    return String(text || '').replace(/\r\n?/g, '\n');
  }

  function parseAikenLikeTxt(content) {
    const text = normalizeNewlines(content);
    const blocks = text
      .split(/\n\s*\n+/)
      .map((b) => b.trim())
      .filter(Boolean);

    const parsed = [];

    for (const block of blocks) {
      const lines = block
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length === 0) continue;

      // Strip optional leading "Soal X" prefix
      let promptLine = lines[0].replace(/^Soal\s+\d+[\s.:-]*/i, '').trim();
      if (!promptLine) promptLine = lines[0];

      const optionLines = lines.filter((l) => /^[A-Z]\./.test(l));
      const answerLine = lines.find((l) => /^\s*(answer|jawaban)\s*:/i.test(l));
      const pairLines = lines.filter((l) => /\s*(->|=>|\-\-|\-|:|=)\s*/.test(l) && !/^(answer|jawaban)\s*:/i.test(l) && !/^[A-Z]\./.test(l));

      // MCQ
      if (optionLines.length >= 2) {
        const choices = optionLines
          .map((l) => {
            const m = l.match(/^([A-Z])\.\s*(.+)$/);
            if (!m) return null;
            return { id: m[1], text: m[2].trim() };
          })
          .filter(Boolean);

        const answer = answerLine ? String(answerLine.split(':')[1] || '').trim().toUpperCase() : '';
        const correctChoiceId = answer && choices.some((c) => c.id === answer) ? answer : choices[0]?.id || '';
        parsed.push({ type: 'mcq', promptHtml: promptLine, choices, correctChoiceId, rubric: '' });
        continue;
      }

      // Matching: detect "left -> right" (at least 2 pairs)
      const pairs = [];
      for (const l of lines.slice(1)) {
        if (/^(answer|jawaban)\s*:/i.test(l)) continue;
        const m = l.match(/^(.+?)\s*(->|=>|\-|:)\s*(.+)$/);
        if (m) {
          const left = m[1].trim();
          const right = m[3].trim();
          if (left && right) pairs.push({ left, right });
        }
      }
      if (pairs.length >= 2) {
        parsed.push({ type: 'matching', promptHtml: promptLine, pairs, rubric: '' });
        continue;
      }

      // Essay: store answer text (if provided) as rubric
      const essayRubric = answerLine ? String(answerLine.split(':')[1] || '').trim() : '';
      parsed.push({ type: 'essay', promptHtml: promptLine, rubric: essayRubric });
    }

    return parsed;
  }

  // =============================
  // Collections
  // =============================

  router.get(
    '/collections',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const filter = req.user.role === 'admin' ? {} : { createdBy: req.user.sub };
      const collections = await QuestionBankCollection.find(filter).sort({ createdAt: -1 }).limit(500);
      res.json({ collections });
    })
  );

  router.post(
    '/collections',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const schema = z.object({
        title: z.string().min(1).optional(),
        name: z.string().min(1).optional(),
        description: z.string().optional().default(''),
        category: z.string().optional().default(''),
        tags: z.array(z.string()).optional().default([]),
      });

      const data = schema.parse(req.body);
      const title = (data.title || data.name || '').trim();
      if (!title) throw new HttpError(400, 'Title is required');

      const collection = await QuestionBankCollection.create({
        title,
        description: data.description,
        category: data.category || '',
        tags: data.tags,
        createdBy: req.user.sub,
        questions: [],
        numQuestions: 0,
      });

      res.status(201).json({ collection });
    })
  );

  router.post(
    '/collections/:collectionId/import-txt',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const collection = await QuestionBankCollection.findById(req.params.collectionId);
      if (!collection) throw new HttpError(404, 'Collection not found');
      if (req.user.role !== 'admin' && String(collection.createdBy) !== String(req.user.sub)) throw new HttpError(403, 'Forbidden');

      const schema = z.object({
        content: z.string().min(1),
        shuffleChoices: z.coerce.boolean().optional().default(true),
      });
      const data = schema.parse(req.body);

      const items = parseAikenLikeTxt(data.content);
      if (!items.length) throw new HttpError(400, 'Tidak ada soal yang bisa diparse dari file');

      const ownerId = req.user.sub;
      const created = [];

      for (const q of items) {
        if (q.type === 'mcq') {
          let choices = q.choices || [];
          let correctChoiceId = q.correctChoiceId || '';
          if (data.shuffleChoices && choices.length >= 2) {
            const correct = choices.find((c) => c.id === correctChoiceId) || null;
            choices = shuffleCopy(choices);
            if (correct) {
              const still = choices.find((c) => c.id === correct.id);
              correctChoiceId = still ? still.id : choices[0]?.id || correctChoiceId;
            }
          }
          const item = await BankQuestion.create({
            ownerId,
            type: 'mcq',
            promptHtml: q.promptHtml,
            rubric: q.rubric || '',
            choices,
            correctChoiceId,
          });
          created.push(item._id);
        } else if (q.type === 'matching') {
          const item = await BankQuestion.create({
            ownerId,
            type: 'matching',
            promptHtml: q.promptHtml,
            rubric: q.rubric || '',
            pairs: q.pairs || [],
          });
          created.push(item._id);
        } else {
          const item = await BankQuestion.create({
            ownerId,
            type: 'essay',
            promptHtml: q.promptHtml,
            rubric: q.rubric || '',
          });
          created.push(item._id);
        }
      }

      collection.questions = [...(collection.questions || []), ...created];
      collection.numQuestions = collection.questions.length;
      await collection.save();

      res.status(201).json({ ok: true, imported: created.length, total: collection.numQuestions });
    })
  );

  router.delete(
    '/collections/:collectionId',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const collection = await QuestionBankCollection.findById(req.params.collectionId);
      if (!collection) throw new HttpError(404, 'Collection not found');
      if (req.user.role !== 'admin' && String(collection.createdBy) !== String(req.user.sub)) throw new HttpError(403, 'Forbidden');

      // Delete questions referenced by this collection (best-effort; keep scope simple)
      if (Array.isArray(collection.questions) && collection.questions.length > 0) {
        await BankQuestion.deleteMany({ _id: { $in: collection.questions } });
      }

      await QuestionBankCollection.deleteOne({ _id: collection._id });
      res.status(204).end();
    })
  );

  router.get(
    '/collections/:collectionId/questions',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const collection = await QuestionBankCollection.findById(req.params.collectionId).populate('questions');
      if (!collection) throw new HttpError(404, 'Collection not found');
      if (req.user.role !== 'admin' && String(collection.createdBy) !== String(req.user.sub)) throw new HttpError(403, 'Forbidden');
      res.json({ questions: collection.questions || [] });
    })
  );

  router.post(
    '/collections/:collectionId/questions',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const collection = await QuestionBankCollection.findById(req.params.collectionId);
      if (!collection) throw new HttpError(404, 'Collection not found');
      if (req.user.role !== 'admin' && String(collection.createdBy) !== String(req.user.sub)) throw new HttpError(403, 'Forbidden');

      const schema = z
        .object({
          type: z.enum(['mcq', 'essay', 'matching']).optional().default('mcq'),
          promptHtml: z.string().optional().default(''),
          questionImageUrl: z.string().optional().default(''),
          choices: z.array(z.object({ id: z.string().min(1), text: z.string().min(1), imageUrl: z.string().optional().default('') })).optional().default([]),
          correctChoiceId: z.string().optional().default(''),
          pairs: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).optional().default([]),
          rubric: z.string().optional().default(''),
          tags: z.array(z.string()).optional().default([]),
        })
        .superRefine((val, ctx) => {
          if (!val.promptHtml || !val.promptHtml.trim()) {
            ctx.addIssue({ code: 'custom', path: ['promptHtml'], message: 'promptHtml is required' });
          }
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
      const ownerId = req.user.role === 'admin' && req.body.ownerId ? req.body.ownerId : req.user.sub;
      const item = await BankQuestion.create({ ...data, ownerId });

      collection.questions = collection.questions || [];
      collection.questions.push(item._id);
      collection.numQuestions = collection.questions.length;
      await collection.save();

      res.status(201).json({ item });
    })
  );

  router.put(
    '/collections/:collectionId/questions/:questionId',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const collection = await QuestionBankCollection.findById(req.params.collectionId);
      if (!collection) throw new HttpError(404, 'Collection not found');
      if (req.user.role !== 'admin' && String(collection.createdBy) !== String(req.user.sub)) throw new HttpError(403, 'Forbidden');

      const existing = await BankQuestion.findById(req.params.questionId);
      if (!existing) throw new HttpError(404, 'Bank question not found');
      if (req.user.role !== 'admin' && String(existing.ownerId) !== String(req.user.sub)) throw new HttpError(403, 'Forbidden');

      const schema = z
        .object({
          type: z.enum(['mcq', 'essay', 'matching']).optional(),
          promptHtml: z.string().optional(),
          questionImageUrl: z.string().optional().default(''),
          choices: z.array(z.object({ id: z.string().min(1), text: z.string().min(1), imageUrl: z.string().optional().default('') })).optional(),
          correctChoiceId: z.string().optional(),
          pairs: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).optional(),
          rubric: z.string().optional(),
          tags: z.array(z.string()).optional(),
        })
        .superRefine((val, ctx) => {
          if (val.promptHtml !== undefined && !val.promptHtml.trim()) {
            ctx.addIssue({ code: 'custom', path: ['promptHtml'], message: 'promptHtml cannot be empty' });
          }
          const type = val.type || existing.type || 'mcq';
          if (type === 'mcq') {
            if (val.choices && (!Array.isArray(val.choices) || val.choices.length < 2)) {
              ctx.addIssue({ code: 'custom', path: ['choices'], message: 'choices must have at least 2 items' });
            }
            if (val.correctChoiceId !== undefined && !val.correctChoiceId) {
              ctx.addIssue({ code: 'custom', path: ['correctChoiceId'], message: 'correctChoiceId is required' });
            }
          }
          if (type === 'matching') {
            if (val.pairs && (!Array.isArray(val.pairs) || val.pairs.length < 2)) {
              ctx.addIssue({ code: 'custom', path: ['pairs'], message: 'pairs must have at least 2 items' });
            }
          }
        });

      const data = schema.parse(req.body);
      const update = {};
      if (data.type !== undefined) update.type = data.type;
      if (data.promptHtml !== undefined) update.promptHtml = data.promptHtml;
      if (data.questionImageUrl !== undefined) update.questionImageUrl = data.questionImageUrl;
      if (data.choices !== undefined) update.choices = data.choices;
      if (data.correctChoiceId !== undefined) update.correctChoiceId = data.correctChoiceId;
      if (data.pairs !== undefined) update.pairs = data.pairs;
      if (data.rubric !== undefined) update.rubric = data.rubric;
      if (data.tags !== undefined) update.tags = data.tags;

      const updated = await BankQuestion.findByIdAndUpdate(req.params.questionId, update, { new: true });
      res.json({ item: updated });
    })
  );

  router.delete(
    '/collections/:collectionId/questions/:questionId',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const collection = await QuestionBankCollection.findById(req.params.collectionId);
      if (!collection) throw new HttpError(404, 'Collection not found');
      if (req.user.role !== 'admin' && String(collection.createdBy) !== String(req.user.sub)) throw new HttpError(403, 'Forbidden');

      const existing = await BankQuestion.findById(req.params.questionId);
      if (!existing) throw new HttpError(404, 'Bank question not found');
      if (req.user.role !== 'admin' && String(existing.ownerId) !== String(req.user.sub)) throw new HttpError(403, 'Forbidden');

      collection.questions = (collection.questions || []).filter((id) => String(id) !== String(existing._id));
      collection.numQuestions = collection.questions.length;
      await collection.save();

      await BankQuestion.deleteOne({ _id: existing._id });
      res.status(204).end();
    })
  );

  // List my bank questions
  router.get(
    '/',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const filter = req.user.role === 'admin' ? {} : { ownerId: req.user.sub };
      const items = await BankQuestion.find(filter).sort({ createdAt: -1 }).limit(500);
      res.json({ items });
    })
  );

  // Create
  router.post(
    '/',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const schema = z
        .object({
          type: z.enum(['mcq', 'essay', 'matching']).optional().default('mcq'),
          promptHtml: z.string().optional().default(''),
          questionImageUrl: z.string().optional().default(''),
          choices: z.array(z.object({ id: z.string().min(1), text: z.string().min(1), imageUrl: z.string().optional().default('') })).optional().default([]),
          correctChoiceId: z.string().optional().default(''),
          pairs: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).optional().default([]),
          rubric: z.string().optional().default(''),
          tags: z.array(z.string()).optional().default([]),
        })
        .superRefine((val, ctx) => {
          if (!val.promptHtml || !val.promptHtml.trim()) {
            ctx.addIssue({ code: 'custom', path: ['promptHtml'], message: 'promptHtml is required' });
          }
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
      const ownerId = req.user.role === 'admin' && req.body.ownerId ? req.body.ownerId : req.user.sub;
      const item = await BankQuestion.create({ ...data, ownerId });
      res.status(201).json({ item });
    })
  );

  // Update
  router.put(
    '/:id',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const existing = await BankQuestion.findById(req.params.id);
      if (!existing) throw new HttpError(404, 'Bank question not found');
      if (req.user.role !== 'admin' && String(existing.ownerId) !== String(req.user.sub)) throw new HttpError(403, 'Forbidden');

      const schema = z
        .object({
          type: z.enum(['mcq', 'essay', 'matching']).optional().default(existing.type),
          promptHtml: z.string().optional().default(existing.promptHtml),
          choices: z.array(z.object({ id: z.string().min(1), text: z.string().min(1), imageUrl: z.string().optional().default('') })).optional().default(existing.choices || []),
          correctChoiceId: z.string().optional().default(existing.correctChoiceId || ''),
          pairs: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).optional().default(existing.pairs || []),
          rubric: z.string().optional().default(existing.rubric || ''),
          tags: z.array(z.string()).optional().default(existing.tags || []),
        })
        .superRefine((val, ctx) => {
          if (!val.promptHtml || !val.promptHtml.trim()) {
            ctx.addIssue({ code: 'custom', path: ['promptHtml'], message: 'promptHtml is required' });
          }
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
      const updated = await BankQuestion.findByIdAndUpdate(req.params.id, data, { new: true });
      res.json({ item: updated });
    })
  );

  // Delete
  router.delete(
    '/:id',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const existing = await BankQuestion.findById(req.params.id);
      if (!existing) throw new HttpError(404, 'Bank question not found');
      if (req.user.role !== 'admin' && String(existing.ownerId) !== String(req.user.sub)) throw new HttpError(403, 'Forbidden');

      await BankQuestion.deleteOne({ _id: existing._id });
      res.status(204).end();
    })
  );

  return router;
}

module.exports = { questionBankRouter };
