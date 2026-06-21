const express = require('express');
const { z } = require('zod');
const { Course } = require('../models/Course');
const { Lesson } = require('../models/Lesson');
const { LessonProgress } = require('../models/LessonProgress');
const { Order } = require('../models/Order');
const { User } = require('../models/User');
const { Attempt } = require('../models/Attempt');
const { AssignmentAttempt } = require('../models/AssignmentAttempt');
const { asyncHandler } = require('../utils/asyncHandler');
const { HttpError } = require('../utils/errors');

function formatIdr(n) {
  try {
    return new Intl.NumberFormat('id-ID').format(Number(n) || 0);
  } catch {
    return String(n || 0);
  }
}

function toCsvValue(v) {
  const s = String(v ?? '');
  const needsQuotes = /[",\n\r]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function parseDateRange(query) {
  const schema = z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    status: z.enum(['pending', 'paid', 'failed', 'expired', 'canceled']).optional(),
  });
  const q = schema.parse(query);

  const to = q.to ? new Date(q.to) : new Date();
  const from = q.from ? new Date(q.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

  // normalize to valid range
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new HttpError(400, 'Invalid date range');
  }

  return { from, to, status: q.status };
}

function reportsRouter({ requireAuth, requireRole }) {
  const router = express.Router();

  // Admin: accounting summary
  router.get(
    '/accounting/summary',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const { from, to } = parseDateRange(req.query);
      const match = { createdAt: { $gte: from, $lte: to } };

      const [byStatus, paidAgg] = await Promise.all([
        Order.aggregate([
          { $match: match },
          { $group: { _id: '$status', count: { $sum: 1 }, amountIdr: { $sum: '$amountIdr' } } },
        ]),
        Order.aggregate([
          { $match: { ...match, status: 'paid' } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              amountIdr: { $sum: '$amountIdr' },
              feeIdr: { $sum: { $ifNull: ['$midtrans.feeIdr', 0] } },
            },
          },
        ]),
      ]);

      const statusMap = Object.fromEntries(byStatus.map((x) => [x._id, { count: x.count, amountIdr: x.amountIdr }]));
      const paid = paidAgg?.[0] || { count: 0, amountIdr: 0, feeIdr: 0 };

      res.json({
        range: { from: from.toISOString(), to: to.toISOString() },
        paid: {
          ...paid,
          netIdr: (paid.amountIdr || 0) - (paid.feeIdr || 0),
        },
        byStatus: statusMap,
      });
    })
  );

  // Admin: list orders (accounting ledger)
  router.get(
    '/accounting/orders',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const { from, to, status } = parseDateRange(req.query);
      const filter = { createdAt: { $gte: from, $lte: to } };
      if (status) filter.status = status;

      const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(1000).lean();
      const userIds = [...new Set(orders.map((o) => String(o.userId)))];
      const users = await User.find({ _id: { $in: userIds } }, { name: 1, fullName: 1, email: 1 }).lean();
      const userMap = new Map(users.map((u) => [String(u._id), u]));

      const rows = orders.map((o) => {
        const u = userMap.get(String(o.userId));
        return {
          id: String(o._id),
          orderCode: o.orderCode,
          status: o.status,
          amountIdr: o.amountIdr,
          feeIdr: o.midtrans?.feeIdr || 0,
          netIdr: (o.amountIdr || 0) - (o.midtrans?.feeIdr || 0),
          itemCount: (o.items || []).length,
          items: (o.items || []).map((it) => ({
            courseId: String(it.courseId),
            title: it.title,
            priceIdr: it.priceIdr,
          })),
          user: u
            ? { id: String(u._id), name: u.fullName || u.name || '', email: u.email || '' }
            : { id: String(o.userId), name: '', email: '' },
          midtrans: {
            transactionStatus: o.midtrans?.transactionStatus || '',
            paymentType: o.midtrans?.paymentType || '',
            settlementTime: o.midtrans?.settlementTime || null,
          },
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
        };
      });

      res.json({
        range: { from: from.toISOString(), to: to.toISOString() },
        count: rows.length,
        orders: rows,
      });
    })
  );

  // Admin: export CSV (Excel)
  router.get(
    '/accounting/orders.csv',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const { from, to, status } = parseDateRange(req.query);
      const filter = { createdAt: { $gte: from, $lte: to } };
      if (status) filter.status = status;

      const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(5000).lean();
      const userIds = [...new Set(orders.map((o) => String(o.userId)))];
      const users = await User.find({ _id: { $in: userIds } }, { name: 1, fullName: 1, email: 1 }).lean();
      const userMap = new Map(users.map((u) => [String(u._id), u]));

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="accounting-orders.csv"');

      // UTF-8 BOM for Excel
      res.write('\uFEFF');

      const header = [
        'orderCode',
        'status',
        'amountIdr',
        'feeIdr',
        'netIdr',
        'itemCount',
        'items',
        'userName',
        'userEmail',
        'paymentType',
        'transactionStatus',
        'settlementTime',
        'createdAt',
      ];
      res.write(header.join(',') + '\n');

      for (const o of orders) {
        const u = userMap.get(String(o.userId));
        const items = (o.items || []).map((it) => `${it.title} (${it.priceIdr})`).join(' | ');
        const feeIdr = o.midtrans?.feeIdr || 0;
        const netIdr = (o.amountIdr || 0) - feeIdr;
        const row = [
          toCsvValue(o.orderCode),
          toCsvValue(o.status),
          toCsvValue(o.amountIdr),
          toCsvValue(feeIdr),
          toCsvValue(netIdr),
          toCsvValue((o.items || []).length),
          toCsvValue(items),
          toCsvValue(u?.fullName || u?.name || ''),
          toCsvValue(u?.email || ''),
          toCsvValue(o.midtrans?.paymentType || ''),
          toCsvValue(o.midtrans?.transactionStatus || ''),
          toCsvValue(o.midtrans?.settlementTime ? new Date(o.midtrans.settlementTime).toISOString() : ''),
          toCsvValue(o.createdAt ? new Date(o.createdAt).toISOString() : ''),
        ];
        res.write(row.join(',') + '\n');
      }

      res.end();
    })
  );

  // Admin: per-course revenue summary
  router.get(
    '/accounting/courses',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const { from, to } = parseDateRange(req.query);
      const match = { status: 'paid', createdAt: { $gte: from, $lte: to } };

      // Aggreg order items by course
      const rows = await Order.aggregate([
        { $match: match },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.courseId',
            title: { $first: '$items.title' },
            purchaseCount: { $sum: 1 },
            totalRevenueIdr: { $sum: '$items.priceIdr' },
          },
        },
        { $sort: { totalRevenueIdr: -1 } },
      ]);

      // Get creator info for each course
      const courseIds = rows.map((r) => r._id).filter(Boolean);
      const courses = await Course.find({ _id: { $in: courseIds } }, { ownerId: 1 }).lean();
      const ownerIds = [...new Set(courses.map((c) => c.ownerId?.toString()).filter(Boolean))];
      const owners = await User.find({ _id: { $in: ownerIds } }, { name: 1, fullName: 1 }).lean();
      const ownerMap = new Map(owners.map((u) => [u._id.toString(), u.fullName || u.name || '—']));
      const courseOwnerMap = new Map(courses.map((c) => [c._id.toString(), ownerMap.get(c.ownerId?.toString()) || '—']));

      // Count students per course
      const studentCounts = await User.aggregate([
        { $match: { purchasedCourseIds: { $in: courseIds } } },
        { $unwind: '$purchasedCourseIds' },
        { $match: { purchasedCourseIds: { $in: courseIds } } },
        { $group: { _id: '$purchasedCourseIds', count: { $sum: 1 } } },
      ]);
      const studentMap = new Map(studentCounts.map((s) => [s._id.toString(), s.count]));

      const result = rows.map((r) => ({
        courseId: r._id.toString(),
        title: r.title || '(Dihapus)',
        creatorName: courseOwnerMap.get(r._id.toString()) || '—',
        purchaseCount: r.purchaseCount,
        studentCount: studentMap.get(r._id.toString()) || 0,
        totalRevenueIdr: r.totalRevenueIdr,
      }));

      res.json({ range: { from: from.toISOString(), to: to.toISOString() }, courses: result });
    })
  );

  // Admin: export courses CSV
  router.get(
    '/accounting/courses.csv',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const { from, to } = parseDateRange(req.query);
      const match = { status: 'paid', createdAt: { $gte: from, $lte: to } };

      const rows = await Order.aggregate([
        { $match: match },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.courseId',
            title: { $first: '$items.title' },
            purchaseCount: { $sum: 1 },
            totalRevenueIdr: { $sum: '$items.priceIdr' },
          },
        },
        { $sort: { totalRevenueIdr: -1 } },
      ]);

      const courseIds = rows.map((r) => r._id).filter(Boolean);
      const courses = await Course.find({ _id: { $in: courseIds } }, { ownerId: 1 }).lean();
      const ownerIds = [...new Set(courses.map((c) => c.ownerId?.toString()).filter(Boolean))];
      const owners = await User.find({ _id: { $in: ownerIds } }, { name: 1, fullName: 1 }).lean();
      const ownerMap = new Map(owners.map((u) => [u._id.toString(), u.fullName || u.name || '—']));
      const courseOwnerMap = new Map(courses.map((c) => [c._id.toString(), ownerMap.get(c.ownerId?.toString()) || '—']));

      const studentCounts = await User.aggregate([
        { $match: { purchasedCourseIds: { $in: courseIds } } },
        { $unwind: '$purchasedCourseIds' },
        { $match: { purchasedCourseIds: { $in: courseIds } } },
        { $group: { _id: '$purchasedCourseIds', count: { $sum: 1 } } },
      ]);
      const studentMap = new Map(studentCounts.map((s) => [s._id.toString(), s.count]));

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="accounting-courses.csv"');
      res.write('﻿');

      const header = ['No', 'Judul Course', 'Pembuat', 'Jumlah Pembeli', 'Jumlah Siswa', 'Total Pendapatan (IDR)'];
      res.write(header.join(',') + '\n');

      rows.forEach((r, idx) => {
        const creatorName = courseOwnerMap.get(r._id.toString()) || '—';
        const studentCount = studentMap.get(r._id.toString()) || 0;
        const row = [
          toCsvValue(idx + 1),
          toCsvValue(r.title || '(Dihapus)'),
          toCsvValue(creatorName),
          toCsvValue(r.purchaseCount),
          toCsvValue(studentCount),
          toCsvValue(r.totalRevenueIdr),
        ];
        res.write(row.join(',') + '\n');
      });

      res.end();
    })
  );

  // Student: export PDF progress + achievements for a course
  router.get(
    '/courses/:courseId/progress.pdf',
    requireAuth,
    requireRole('student'),
    asyncHandler(async (req, res) => {
      const course = await Course.findById(req.params.courseId).lean();
      if (!course || !course.isPublished) throw new HttpError(404, 'Course not found');

      const user = await User.findById(req.user.sub).lean();
      if (!user) throw new HttpError(401, 'Unauthorized');

      const price = course.priceIdr || 0;
      if (price > 0) {
        const purchased = (user.purchasedCourseIds || []).some((x) => String(x) === String(course._id));
        if (!purchased) throw new HttpError(402, 'Course belum terbeli.');
      }

      const lessons = await Lesson.find({ courseId: course._id, isPublished: true }).sort({ order: 1, createdAt: 1 }).lean();
      const progress = await LessonProgress.find({ userId: req.user.sub, courseId: course._id }).lean();
      const byLessonId = new Map(progress.map((p) => [String(p.lessonId), p]));

      const totalLessons = lessons.length;
      const completedLessons = lessons.filter((l) => byLessonId.get(String(l._id))?.isCompleted).length;
      const certEligible = totalLessons > 0 && completedLessons === totalLessons;

      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const safeTitle = (course.title || 'course').replace(/[^a-z0-9\- _]/gi, '').slice(0, 60) || 'course';

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="progress-${safeTitle}.pdf"`);
      doc.pipe(res);

      doc.fontSize(18).text('Laporan Progress Belajar', { align: 'left' });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#333333').text(`Nama: ${user.name || '-'}`);
      doc.text(`Email: ${user.email || '-'}`);
      doc.text(`Course: ${course.title}`);
      doc.text(`Harga: Rp ${formatIdr(price)}`);
      doc.text(`Tanggal cetak: ${new Date().toLocaleString('id-ID')}`);

      doc.moveDown();
      doc.fontSize(14).fillColor('#000000').text('Ringkasan', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#333333').text(`Total lesson: ${totalLessons}`);
      doc.text(`Lesson selesai: ${completedLessons}`);
      doc.text(`Sertifikat: ${certEligible ? 'Eligible (semua lesson selesai)' : 'Belum eligible'}`);

      doc.moveDown();
      doc.fontSize(14).fillColor('#000000').text('Detail Lesson', { underline: true });
      doc.moveDown(0.5);

      lessons.forEach((l, idx) => {
        const p = byLessonId.get(String(l._id));
        const done = Boolean(p?.isCompleted);
        const doneAt = p?.completedAt ? new Date(p.completedAt).toLocaleString('id-ID') : '';
        doc
          .fontSize(12)
          .fillColor('#333333')
          .text(`${idx + 1}. ${l.title}  —  ${done ? `SELESAI${doneAt ? ' (' + doneAt + ')' : ''}` : 'BELUM'}`);
      });

      doc.moveDown();
      doc.fontSize(14).fillColor('#000000').text('Achievement', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#333333');

      const achievements = [];
      lessons.forEach((l) => {
        const p = byLessonId.get(String(l._id));
        if (p?.isCompleted) achievements.push(`Badge lesson: ${l.title}`);
      });
      if (certEligible) achievements.push('Certificate: Course completed');

      if (!achievements.length) {
        doc.text('Belum ada achievement.');
      } else {
        achievements.forEach((a) => doc.text(`- ${a}`));
      }

      doc.end();
    })
  );

  // TEACHER MONITORING: GET /reports/course/:courseId/students - Teacher view all students progress in course
  router.get(
    '/course/:courseId/students',
    requireAuth,
    requireRole('teacher', 'admin'),
    asyncHandler(async (req, res) => {
      const course = await Course.findById(req.params.courseId);
      if (!course) throw new HttpError(404, 'Course not found');
      if (req.user.role === 'teacher' && String(course.ownerId) !== String(req.user.sub)) {
        throw new HttpError(403, 'Forbidden');
      }

      // Find all students who have this course
      const students = await User.find({
        $or: [
          { activeCourseId: course._id },
          { completedCourseIds: course._id },
          { purchasedCourseIds: course._id },
        ],
      }).select('name fullName email activeCourseId completedCourseIds purchasedCourseIds').sort({ createdAt: -1 });

      const lessons = await Lesson.find({ courseId: course._id }).sort({ order: 1 });

      // Build detailed student progress
      const studentProgress = await Promise.all(
        students.map(async (student) => {
          const lessonProgresses = await LessonProgress.find({
            userId: student._id,
            courseId: course._id,
          });

          const completedLessons = lessonProgresses.filter((lp) => lp.isCompleted).length;

          return {
            studentId: student._id,
            name: student.name,
            email: student.email,
            isActive: String(student.activeCourseId) === String(course._id),
            isCompleted: (student.completedCourseIds || []).some((id) => String(id) === String(course._id)),
            hasPurchased: (student.purchasedCourseIds || []).some((id) => String(id) === String(course._id)),
            progress: {
              lessonsCompleted: completedLessons,
              lessonsTotal: lessons.length,
              percentage: lessons.length > 0 ? Math.round((completedLessons / lessons.length) * 100) : 0,
            },
          };
        })
      );

      res.json({ course, students: studentProgress });
    })
  );

  // TEACHER MONITORING: GET /reports/course/:courseId/students/:studentId - Teacher view specific student detail
  router.get(
    '/course/:courseId/students/:studentId',
    requireAuth,
    requireRole('teacher', 'admin'),
    asyncHandler(async (req, res) => {
      const course = await Course.findById(req.params.courseId);
      if (!course) throw new HttpError(404, 'Course not found');
      if (req.user.role === 'teacher' && String(course.ownerId) !== String(req.user.sub)) {
        throw new HttpError(403, 'Forbidden');
      }

      const student = await User.findById(req.params.studentId).select('name email');
      if (!student) throw new HttpError(404, 'Student not found');

      const lessons = await Lesson.find({ courseId: course._id }).sort({ order: 1 });
      const lessonProgresses = await LessonProgress.find({
        userId: student._id,
        courseId: course._id,
      });

      // Get quiz data for this course
      const { Quiz } = require('../models/Quiz');
      const quizzes = await Quiz.find({ courseId: course._id }).select('_id title');
      const quizAttempts = await Attempt.find({
        userId: student._id,
        quizId: { $in: quizzes.map((q) => q._id) },
      })
        .populate('quizId', 'title')
        .sort({ createdAt: -1 });

      // Get assignment data for this course
      const assignmentAttempts = await AssignmentAttempt.find({
        userId: student._id,
        courseId: course._id,
      }).sort({ createdAt: -1 });

      const lessonDetails = lessons.map((lesson) => {
        const progress = lessonProgresses.find((lp) => String(lp.lessonId) === String(lesson._id));
        return {
          lessonId: lesson._id,
          title: lesson.title,
          isCompleted: progress?.isCompleted || false,
          completedAt: progress?.completedAt,
        };
      });

      res.json({
        student: { _id: student._id, name: student.name, email: student.email },
        course: { _id: course._id, title: course.title },
        progress: {
          lessonsCompleted: lessonDetails.filter((l) => l.isCompleted).length,
          lessonsTotal: lessonDetails.length,
          lessons: lessonDetails,
          quizzes: quizAttempts,
          assignments: assignmentAttempts,
        },
      });
    })
  );

  return router;
}

module.exports = { reportsRouter };
