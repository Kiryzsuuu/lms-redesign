const express = require('express');
const { z } = require('zod');
const { Course } = require('../models/Course');
const { Module } = require('../models/Module');
const { Lesson } = require('../models/Lesson');
const { CourseTemplate } = require('../models/CourseTemplate');
const { Quiz } = require('../models/Quiz');
const { Attempt } = require('../models/Attempt');
const { LessonProgress } = require('../models/LessonProgress');
const { User } = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');
const { HttpError } = require('../utils/errors');
const { audit, diffFields } = require('../utils/audit');
const { notifyStudentsNewCourse } = require('../utils/notify');

// Create modules + (empty draft) lessons on a course from a template outline.
// Appends after any existing modules so it is safe on courses that already have content.
// Returns { modulesCreated, lessonsCreated }.
async function applyTemplateToCourse(courseId, templateId) {
  const tpl = await CourseTemplate.findById(templateId);
  if (!tpl || !Array.isArray(tpl.modules)) return { modulesCreated: 0, lessonsCreated: 0 };

  const existingModules = await Module.countDocuments({ courseId });
  let modulesCreated = 0;
  let lessonsCreated = 0;

  for (let mi = 0; mi < tpl.modules.length; mi++) {
    const m = tpl.modules[mi];
    const mod = await Module.create({
      courseId,
      title: m.title || `Modul ${existingModules + mi + 1}`,
      order: existingModules + mi,
      isPublished: false,
    });
    modulesCreated += 1;

    const lessons = Array.isArray(m.lessons) ? m.lessons : [];
    for (let li = 0; li < lessons.length; li++) {
      const l = lessons[li];
      await Lesson.create({
        courseId,
        moduleId: mod._id,
        title: l.title || `Materi ${li + 1}`,
        order: li,
        isPublished: false,
      });
      lessonsCreated += 1;
    }
  }

  return { modulesCreated, lessonsCreated };
}

async function assertCanEditCourse(courseId, user) {
  const course = await Course.findById(courseId);
  if (!course) throw new HttpError(404, 'Course not found');
  if (user.role === 'admin') return course;
  if (user.role === 'teacher' && String(course.ownerId) === String(user.sub)) return course;
  throw new HttpError(403, 'Forbidden');
}

function coursesRouter({ requireAuth, requireRole, env }) {
  const router = express.Router();

  // Authenticated: list courses owned by the current teacher (or all courses for admin)
  router.get(
    '/owned',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const filter = req.user.role === 'admin' ? {} : { ownerId: req.user.sub };
      const courses = await Course.find(filter).sort({ order: 1, createdAt: -1 }).populate('categoryId', 'name slug').lean();

      // Hitung jumlah siswa per course (kriteria sama dengan endpoint daftar siswa).
      const withCounts = await Promise.all(
        courses.map(async (c) => {
          const studentCount = await User.countDocuments({
            $or: [
              { activeCourseId: c._id },
              { completedCourseIds: c._id },
              { purchasedCourseIds: c._id },
            ],
          });
          return { ...c, studentCount };
        })
      );

      res.json({ courses: withCounts });
    })
  );

  // Reorder courses by an explicit ordered list of IDs (admin only)
  router.put(
    '/reorder',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const orderedIds = Array.isArray(req.body.orderedIds) ? req.body.orderedIds : [];
      await Promise.all(orderedIds.map((id, idx) => Course.updateOne({ _id: id }, { order: idx })));
      res.json({ ok: true });
    })
  );

  // Public list
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const courses = await Course.find({ isPublished: true }).sort({ order: 1, createdAt: -1 }).populate('categoryId', 'name slug').lean();

      // Hitung jumlah lesson published per course
      const courseIds = courses.map(c => c._id);
      const lessonCounts = await Lesson.aggregate([
        { $match: { courseId: { $in: courseIds }, isPublished: true } },
        { $group: { _id: '$courseId', count: { $sum: 1 } } },
      ]);
      const countMap = new Map(lessonCounts.map(r => [String(r._id), r.count]));
      const withCounts = courses.map(c => ({ ...c, lessonCount: countMap.get(String(c._id)) || 0 }));

      res.json({ courses: withCounts });
    })
  );

  // Authenticated: get user's purchased courses
  router.get(
    '/my-courses',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = await User.findById(req.user.sub);
      if (!user) throw new HttpError(401, 'Unauthorized');

      const courseIds = [
        ...(user.purchasedCourseIds || []),
        ...(user.enrolledCourseIds || []),
        ...(user.completedCourseIds || []),
        ...(user.activeCourseId ? [user.activeCourseId] : []),
      ];

      // Remove duplicates
      const uniqueIds = [...new Set(courseIds.map(id => String(id)))];

      const courses = await Course.find({ _id: { $in: uniqueIds } })
        .sort({ createdAt: -1 })
        .populate('categoryId', 'name slug')
        .lean();

      // Compute progressPercent per course from published lessons + this user's completions.
      const lessons = await Lesson.find({ courseId: { $in: uniqueIds }, isPublished: true }).select('_id courseId');
      const totalByCourse = new Map();
      for (const l of lessons) {
        const k = String(l.courseId);
        totalByCourse.set(k, (totalByCourse.get(k) || 0) + 1);
      }
      const completedRows = await LessonProgress.find({
        userId: req.user.sub,
        courseId: { $in: uniqueIds },
        isCompleted: true,
        lessonId: { $in: lessons.map((l) => l._id) },
      }).select('courseId');
      const doneByCourse = new Map();
      for (const r of completedRows) {
        const k = String(r.courseId);
        doneByCourse.set(k, (doneByCourse.get(k) || 0) + 1);
      }

      const withProgress = courses.map((c) => {
        const k = String(c._id);
        const total = totalByCourse.get(k) || 0;
        const done = doneByCourse.get(k) || 0;
        return {
          ...c,
          lessonCount: total,
          completedLessonCount: done,
          progressPercent: total ? Math.round((done / total) * 100) : 0,
        };
      });

      res.json({ courses: withProgress });
    })
  );

  // Public detail
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const course = await Course.findById(req.params.id).populate('ownerId', 'name skills institution');
      if (!course) throw new HttpError(404, 'Course not found');
      if (!course.isPublished) throw new HttpError(404, 'Course not found');

      const [modules, lessons, quizzes] = await Promise.all([
        Module.find({ courseId: course._id, isPublished: true }).sort({ order: 1, createdAt: 1 }),
        Lesson.find({ courseId: course._id, isPublished: true }).sort({ order: 1, createdAt: 1 }),
        Quiz.find({ courseId: course._id, isPublished: true }).sort({ createdAt: -1 }),
      ]);

      res.json({ course, modules, lessons, quizzes });
    })
  );

  // Teacher/Admin: preview course (bypasses isPublished check)
  router.get(
    '/:id/preview',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      await assertCanEditCourse(req.params.id, req.user);
      const course = await Course.findById(req.params.id).populate('ownerId', 'name skills institution');

      const [modules, lessons, quizzes] = await Promise.all([
        Module.find({ courseId: course._id }).sort({ order: 1, createdAt: 1 }),
        Lesson.find({ courseId: course._id }).sort({ order: 1, createdAt: 1 }),
        Quiz.find({ courseId: course._id }).sort({ createdAt: -1 }),
      ]);

      res.json({ course, modules, lessons, quizzes });
    })
  );

  // Student: start/enroll course (locks to a single active course)
  router.post(
    '/:id/start',
    requireAuth,
    requireRole('student'),
    asyncHandler(async (req, res) => {
      const course = await Course.findById(req.params.id);
      if (!course || !course.isPublished) throw new HttpError(404, 'Course not found');

      const user = await User.findById(req.user.sub);
      if (!user) throw new HttpError(401, 'Unauthorized');

      // Paid course gating: must be purchased unless price is 0
      const price = course.priceIdr || 0;
      if (price > 0) {
        const purchased = (user.purchasedCourseIds || []).some((x) => String(x) === String(course._id));
        if (!purchased) throw new HttpError(402, 'Course belum terbeli. Silakan checkout dulu.');
      }

      // Allow switching active course among enrolled/purchased courses.
      // Keeps a single activeCourseId, but user can choose which one is active.
      user.activeCourseId = course._id;
      // Track every started course (including free ones) so "Kursus Saya" shows all of them.
      if (!(user.enrolledCourseIds || []).some((x) => String(x) === String(course._id))) {
        user.enrolledCourseIds = [...(user.enrolledCourseIds || []), course._id];
      }
      await user.save();

      res.json({ ok: true, activeCourseId: user.activeCourseId });
    })
  );

  // Student: mark course as completed (unlocks taking other courses)
  router.post(
    '/:id/complete',
    requireAuth,
    requireRole('student'),
    asyncHandler(async (req, res) => {
      const course = await Course.findById(req.params.id);
      if (!course || !course.isPublished) throw new HttpError(404, 'Course not found');

      const user = await User.findById(req.user.sub).select('activeCourseId completedCourseIds purchasedCourseIds');
      if (!user) throw new HttpError(401, 'Unauthorized');

      // Must be the active course
      if (!user.activeCourseId || String(user.activeCourseId) !== String(course._id)) {
        throw new HttpError(409, 'Course ini belum menjadi course aktif. Klik "Mulai course" dulu.');
      }

      // Paid course gating: must be purchased unless price is 0
      const price = course.priceIdr || 0;
      if (price > 0) {
        const purchased = (user.purchasedCourseIds || []).some((x) => String(x) === String(course._id));
        if (!purchased) throw new HttpError(402, 'Course belum terbeli. Silakan checkout dulu.');
      }

      // Require all published lessons completed
      const lessons = await Lesson.find({ courseId: course._id, isPublished: true }).select('_id');
      const totalLessons = lessons.length;
      if (totalLessons > 0) {
        const completedLessons = await LessonProgress.countDocuments({
          userId: req.user.sub,
          courseId: course._id,
          lessonId: { $in: lessons.map((l) => l._id) },
          isCompleted: true,
        });
        if (completedLessons < totalLessons) {
          throw new HttpError(409, 'Belum bisa menyelesaikan course. Selesaikan semua materi terlebih dahulu.');
        }
      }

      // Require all published quizzes submitted
      const quizzes = await Quiz.find({ courseId: course._id, isPublished: true }).select('_id');
      const totalQuizzes = quizzes.length;
      if (totalQuizzes > 0) {
        const submittedQuizIds = await Attempt.distinct('quizId', {
          userId: req.user.sub,
          quizId: { $in: quizzes.map((q) => q._id) },
          submittedAt: { $exists: true },
        });
        if (submittedQuizIds.length < totalQuizzes) {
          throw new HttpError(409, 'Belum bisa menyelesaikan course. Kerjakan dan submit semua quiz terlebih dahulu.');
        }
      }

      const already = (user.completedCourseIds || []).some((x) => String(x) === String(course._id));
      if (!already) user.completedCourseIds = [...(user.completedCourseIds || []), course._id];

      user.activeCourseId = undefined;
      await user.save();

      res.json({ ok: true, activeCourseId: null, completedCourseIds: user.completedCourseIds || [] });
    })
  );

  // Teacher/Admin: get course enrollment stats
  router.get(
    '/:id/stats',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      await assertCanEditCourse(req.params.id, req.user);
      
      const course = await Course.findById(req.params.id);
      if (!course) throw new HttpError(404, 'Course not found');

      // Count enrolled students (purchased or active)
      const enrolledStudents = await User.countDocuments({
        $or: [
          { purchasedCourseIds: course._id },
          { activeCourseId: course._id },
        ],
      });

      // Count completed students
      const completedStudents = await User.countDocuments({
        completedCourseIds: course._id,
      });

      // Get student list with details
      const students = await User.find({
        $or: [
          { purchasedCourseIds: course._id },
          { activeCourseId: course._id },
          { completedCourseIds: course._id },
        ],
      }).select('name email fullName createdAt activeCourseId completedCourseIds').sort({ createdAt: -1 });

      const studentDetails = students.map((s) => ({
        _id: s._id,
        name: s.name,
        email: s.email,
        fullName: s.fullName,
        enrolledAt: s.createdAt,
        isActive: String(s.activeCourseId) === String(course._id),
        isCompleted: (s.completedCourseIds || []).some((id) => String(id) === String(course._id)),
      }));

      res.json({
        courseId: course._id,
        courseTitle: course.title,
        enrolledCount: enrolledStudents,
        completedCount: completedStudents,
        activeCount: studentDetails.filter((s) => s.isActive).length,
        students: studentDetails,
      });
    })
  );

  // Teacher/Admin list own
  router.get(
    '/_manage/mine',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const filter = req.user.role === 'admin' ? {} : { ownerId: req.user.sub };
      const courses = await Course.find(filter).sort({ order: 1, createdAt: -1 }).populate('categoryId', 'name slug');
      res.json({ courses });
    })
  );

  async function syncTeacherSkills(ownerId, tags) {
    if (!tags || !tags.length) return;
    await User.updateOne(
      { _id: ownerId },
      { $addToSet: { skills: { $each: tags } } }
    );
  }

  router.post(
    '/',
    requireAuth,
    requireRole('admin'), // hanya admin yang boleh membuat course; teacher mengerjakan course dari kontrak
    asyncHandler(async (req, res) => {
      const schema = z.object({
        title: z.string().min(2),
        description: z.string().optional().default(''),
        coverImageUrl: z.string().optional().default(''),
        priceIdr: z.coerce.number().min(0).optional().default(0),
        isPublished: z.coerce.boolean().optional().default(false),
        tags: z.array(z.string()).optional().default([]),
        templateId: z.string().optional(),
        categoryId: z.string().optional().nullable(),
      });
      const data = schema.parse(req.body);
      if (!data.categoryId) delete data.categoryId; // hindari cast '' ke ObjectId
      const ownerId = req.user.role === 'admin' && req.body.ownerId ? req.body.ownerId : req.user.sub;
      const course = await Course.create({ ...data, ownerId });

      // Apply outline template: create modules + lessons from the chosen template.
      if (data.templateId) {
        try {
          await applyTemplateToCourse(course._id, data.templateId);
        } catch (e) {
          // Non-fatal: course is created even if template application fails.
        }
      }

      await syncTeacherSkills(ownerId, data.tags);
      audit({ actor: req.user, action: 'create', resource: 'course', resourceId: course._id, resourceName: course.title, req });

      // Created already published → notify all students once.
      if (course.isPublished && !course.newCourseNotifiedAt) {
        await Course.updateOne({ _id: course._id }, { newCourseNotifiedAt: new Date() });
        notifyStudentsNewCourse(env, course); // fire-and-forget
      }

      res.status(201).json({ course });
    })
  );

  router.put(
    '/:id',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const course = await assertCanEditCourse(req.params.id, req.user);
      const schema = z.object({
        title: z.string().min(2),
        description: z.string().optional().default(''),
        coverImageUrl: z.string().optional().default(''),
        previewVideoUrl: z.string().optional().default(''),
        priceIdr: z.coerce.number().min(0).optional().default(0),
        isPublished: z.coerce.boolean().optional().default(false),
        tags: z.array(z.string()).optional().default([]),
        whatYouLearn:   z.array(z.string()).optional().default([]),
        requirements:   z.array(z.string()).optional().default([]),
        targetAudience: z.array(z.string()).optional().default([]),
        categoryId: z.string().optional().nullable(),
        templateId: z.string().optional().nullable(),
      });
      const data = schema.parse(req.body);

      // Teacher kontrak hanya boleh mengubah deskripsi, tags, dan kategori.
      // Judul, harga, cover, preview, dan status publish dikunci ke nilai lama
      // (hanya admin yang berhak mengubahnya).
      if (req.user.role === 'teacher') {
        data.title = course.title;
        data.priceIdr = course.priceIdr;
        data.coverImageUrl = course.coverImageUrl;
        data.previewVideoUrl = course.previewVideoUrl;
        data.isPublished = course.isPublished;
      }

      const before = course.toObject();
      const updated = await Course.findByIdAndUpdate(req.params.id, data, { new: true });
      await syncTeacherSkills(course.ownerId, data.tags);
      const changed = diffFields(before, data);
      const action = changed.includes('isPublished') ? (data.isPublished ? 'publish' : 'unpublish') : 'update';
      audit({ actor: req.user, action, resource: 'course', resourceId: updated._id, resourceName: updated.title, changedFields: changed, req });

      // First-ever publish → notify all students (in-app + email), once.
      if (action === 'publish' && !updated.newCourseNotifiedAt) {
        await Course.updateOne({ _id: updated._id }, { newCourseNotifiedAt: new Date() });
        notifyStudentsNewCourse(env, updated); // fire-and-forget
      }

      res.json({ course: updated });
    })
  );

  // Apply a template outline to an existing course (appends modules + draft lessons).
  router.post(
    '/:id/apply-template',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const course = await assertCanEditCourse(req.params.id, req.user);
      const templateId = String(req.body.templateId || '');
      if (!templateId) throw new HttpError(400, 'templateId wajib diisi');

      const tpl = await CourseTemplate.findById(templateId);
      if (!tpl) throw new HttpError(404, 'Template tidak ditemukan');

      const result = await applyTemplateToCourse(course._id, templateId);
      audit({ actor: req.user, action: 'apply-template', resource: 'course', resourceId: course._id, resourceName: course.title, req });
      res.json({ ok: true, ...result });
    })
  );

  router.delete(
    '/:id',
    requireAuth,
    requireRole('admin'), // hanya admin yang boleh menghapus course
    asyncHandler(async (req, res) => {
      const course = await assertCanEditCourse(req.params.id, req.user);
      await Promise.all([
        Lesson.deleteMany({ courseId: req.params.id }),
        Quiz.deleteMany({ courseId: req.params.id }),
        Module.deleteMany({ courseId: req.params.id }),
      ]);
      await Course.findByIdAndDelete(req.params.id);
      audit({ actor: req.user, action: 'delete', resource: 'course', resourceId: req.params.id, resourceName: course.title, req });
      res.status(204).end();
    })
  );

  // ── Module CRUD ──────────────────────────────────────────────────────────────

  router.get(
    '/:courseId/modules',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      await assertCanEditCourse(req.params.courseId, req.user);
      const modules = await Module.find({ courseId: req.params.courseId }).sort({ order: 1, createdAt: 1 });
      res.json({ modules });
    })
  );

  router.post(
    '/:courseId/modules',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      await assertCanEditCourse(req.params.courseId, req.user);
      const schema = z.object({
        title: z.string().min(1),
        description: z.string().optional().default(''),
        order: z.coerce.number().optional().default(0),
        isPublished: z.coerce.boolean().optional().default(false),
      });
      const data = schema.parse(req.body);
      const module = await Module.create({ ...data, courseId: req.params.courseId });
      const parentCourse = await Course.findById(req.params.courseId).select('title');
      audit({ actor: req.user, action: 'create', resource: 'module', resourceId: module._id, resourceName: module.title, parentId: req.params.courseId, parentName: parentCourse?.title || '', req });
      res.status(201).json({ module });
    })
  );

  // Reorder modules by an explicit ordered list of IDs
  router.put(
    '/:courseId/modules/reorder',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      await assertCanEditCourse(req.params.courseId, req.user);
      const orderedIds = Array.isArray(req.body.orderedIds) ? req.body.orderedIds : [];
      await Promise.all(
        orderedIds.map((id, idx) =>
          Module.updateOne({ _id: id, courseId: req.params.courseId }, { order: idx })
        )
      );
      res.json({ ok: true });
    })
  );

  // Reorder lessons within a module by an explicit ordered list of IDs
  router.put(
    '/:courseId/lessons/reorder',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      await assertCanEditCourse(req.params.courseId, req.user);
      const orderedIds = Array.isArray(req.body.orderedIds) ? req.body.orderedIds : [];
      await Promise.all(
        orderedIds.map((id, idx) =>
          Lesson.updateOne({ _id: id, courseId: req.params.courseId }, { order: idx })
        )
      );
      res.json({ ok: true });
    })
  );

  router.put(
    '/:courseId/modules/:moduleId',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      await assertCanEditCourse(req.params.courseId, req.user);
      const schema = z.object({
        title: z.string().min(1),
        description: z.string().optional().default(''),
        order: z.coerce.number().optional().default(0),
        isPublished: z.coerce.boolean().optional().default(false),
      });
      const data = schema.parse(req.body);
      const before = await Module.findById(req.params.moduleId);
      const module = await Module.findOneAndUpdate(
        { _id: req.params.moduleId, courseId: req.params.courseId },
        data,
        { new: true }
      );
      if (!module) throw new HttpError(404, 'Module not found');
      const parentCourse = await Course.findById(req.params.courseId).select('title');
      audit({ actor: req.user, action: 'update', resource: 'module', resourceId: module._id, resourceName: module.title, parentId: req.params.courseId, parentName: parentCourse?.title || '', changedFields: diffFields(before?.toObject(), data), req });
      res.json({ module });
    })
  );

  router.delete(
    '/:courseId/modules/:moduleId',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      await assertCanEditCourse(req.params.courseId, req.user);
      const module = await Module.findById(req.params.moduleId);
      await Module.deleteOne({ _id: req.params.moduleId, courseId: req.params.courseId });
      await Lesson.updateMany(
        { moduleId: req.params.moduleId, courseId: req.params.courseId },
        { $set: { moduleId: null } }
      );
      const parentCourse = await Course.findById(req.params.courseId).select('title');
      audit({ actor: req.user, action: 'delete', resource: 'module', resourceId: req.params.moduleId, resourceName: module?.title || '', parentId: req.params.courseId, parentName: parentCourse?.title || '', req });
      res.status(204).end();
    })
  );

  // Lessons CRUD (teacher/admin)
  router.get(
    '/:courseId/lessons',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      await assertCanEditCourse(req.params.courseId, req.user);
      const filter = { courseId: req.params.courseId };
      if (req.query.moduleId) filter.moduleId = req.query.moduleId;
      const lessons = await Lesson.find(filter).sort({ order: 1, createdAt: 1 });
      res.json({ lessons });
    })
  );

  const lessonSchema = z.object({
    title: z.string().min(2),
    moduleId: z.string().optional().nullable().transform((v) => v || null),
    contentMarkdown: z.string().optional().default(''),
    contentHtml: z.string().optional().default(''),
    videoEmbedUrl: z.string().optional().default(''),
    attachments: z
      .array(
        z.object({
          type: z.enum(['link', 'file']),
          name: z.string().optional().default(''),
          url: z.string().min(1),
        })
      )
      .optional()
      .default([]),
    contentBlocks: z
      .array(
        z.object({
          type: z.enum(['video', 'content', 'attachments']),
          title: z.string().optional().default(''),
        })
      )
      .optional()
      .default([]),
    quizId: z.string().optional().nullable(),
    assignment: z
      .object({
        instructionsHtml: z.string().optional().default(''),
        openAt: z.coerce.date().optional(),
        closeAt: z.coerce.date().optional(),
        durationSec: z.coerce.number().optional(),
      })
      .optional(),
    order: z.coerce.number().optional().default(0),
    isPublished: z.coerce.boolean().optional().default(false),
  });

  router.post(
    '/:courseId/lessons',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      await assertCanEditCourse(req.params.courseId, req.user);
      const data = lessonSchema.parse(req.body);
      const lesson = await Lesson.create({ ...data, courseId: req.params.courseId });
      const parentCourse = await Course.findById(req.params.courseId).select('title');
      audit({ actor: req.user, action: 'create', resource: 'lesson', resourceId: lesson._id, resourceName: lesson.title, parentId: req.params.courseId, parentName: parentCourse?.title || '', req });
      res.status(201).json({ lesson });
    })
  );

  router.put(
    '/:courseId/lessons/:lessonId',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      await assertCanEditCourse(req.params.courseId, req.user);
      const before = await Lesson.findById(req.params.lessonId);
      const data = lessonSchema.parse(req.body);
      const lesson = await Lesson.findOneAndUpdate(
        { _id: req.params.lessonId, courseId: req.params.courseId },
        data,
        { new: true }
      );
      if (!lesson) throw new HttpError(404, 'Lesson not found');
      const parentCourse = await Course.findById(req.params.courseId).select('title');
      const changed = diffFields(before?.toObject(), data);
      const action = changed.includes('isPublished') ? (data.isPublished ? 'publish' : 'unpublish') : 'update';
      audit({ actor: req.user, action, resource: 'lesson', resourceId: lesson._id, resourceName: lesson.title, parentId: req.params.courseId, parentName: parentCourse?.title || '', changedFields: changed, req });
      res.json({ lesson });
    })
  );

  router.delete(
    '/:courseId/lessons/:lessonId',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      await assertCanEditCourse(req.params.courseId, req.user);
      const lesson = await Lesson.findById(req.params.lessonId);
      await Lesson.deleteOne({ _id: req.params.lessonId, courseId: req.params.courseId });
      const parentCourse = await Course.findById(req.params.courseId).select('title');
      audit({ actor: req.user, action: 'delete', resource: 'lesson', resourceId: req.params.lessonId, resourceName: lesson?.title || '', parentId: req.params.courseId, parentName: parentCourse?.title || '', req });
      res.status(204).end();
    })
  );

  return router;
}

module.exports = { coursesRouter };
