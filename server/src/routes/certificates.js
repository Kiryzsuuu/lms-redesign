const express = require('express');
const { Certificate } = require('../models/Certificate');
const { CertificateLog } = require('../models/CertificateLog');
const { Course } = require('../models/Course');
const { User } = require('../models/User');
const { Lesson } = require('../models/Lesson');
const { LessonProgress } = require('../models/LessonProgress');
const { Quiz } = require('../models/Quiz');
const { Attempt } = require('../models/Attempt');
const { asyncHandler } = require('../utils/asyncHandler');
const { HttpError } = require('../utils/errors');

function certificatesRouter({ requireAuth, requireRole }) {
  const router = express.Router();

  function generateCertificateNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CERT-${timestamp}-${random}`;
  }

  // Public: verify certificate by number
  router.get(
    '/verify/:certificateNumber',
    asyncHandler(async (req, res) => {
      const certificate = await Certificate.findOne({
        certificateNumber: req.params.certificateNumber,
      })
        .populate('userId', 'name fullName')
        .populate('courseId', 'title');

      if (!certificate) throw new HttpError(404, 'Certificate not found');

      res.json({
        valid: true,
        certificateNumber: certificate.certificateNumber,
        studentName: certificate.metadata?.userName,
        courseName: certificate.metadata?.courseName,
        completionDate: certificate.completionDate,
        issuedAt: certificate.issuedAt || certificate.createdAt,
      });
    })
  );

  // Student: get my certificates
  router.get(
    '/my-certificates',
    requireAuth,
    asyncHandler(async (req, res) => {
      const certificates = await Certificate.find({ userId: req.user.sub })
        .populate('courseId', 'title')
        .sort({ issuedAt: -1 });
      res.json({ certificates });
    })
  );

  // Student: get certificate for a specific course
  router.get(
    '/course/:courseId',
    requireAuth,
    asyncHandler(async (req, res) => {
      const certificate = await Certificate.findOne({
        userId: req.user.sub,
        courseId: req.params.courseId,
      }).populate('courseId', 'title');

      if (!certificate) throw new HttpError(404, 'Certificate not found');

      // Always sync userName from fullName so stale/incorrect names are corrected.
      // Only update if fullName is set — never fall back to username/name field.
      const user = await User.findById(req.user.sub).select('fullName');
      if (user?.fullName && user.fullName !== certificate.metadata?.userName) {
        certificate.metadata = { ...certificate.metadata, userName: user.fullName };
        await certificate.save();
      }

      // Log view
      CertificateLog.create({
        certificateId: certificate._id,
        certificateNumber: certificate.certificateNumber,
        userId: req.user.sub,
        courseId: req.params.courseId,
        action: 'viewed',
        ip: req.ip || '',
      }).catch(() => {});

      res.json({ certificate });
    })
  );

  // Student: generate certificate
  router.post(
    '/generate/:courseId',
    requireAuth,
    requireRole('student'),
    asyncHandler(async (req, res) => {
      const course = await Course.findById(req.params.courseId).populate('ownerId', 'fullName name signatureUrl');
      if (!course) throw new HttpError(404, 'Course not found');

      const user = await User.findById(req.user.sub);
      if (!user) throw new HttpError(401, 'Unauthorized');

      const lessons = await Lesson.find({ courseId: course._id, isPublished: true }).select('_id');
      if (lessons.length === 0) throw new HttpError(409, 'Course belum memiliki materi');

      const completedCount = await LessonProgress.countDocuments({
        userId: user._id,
        courseId: course._id,
        lessonId: { $in: lessons.map((l) => l._id) },
        isCompleted: true,
      });

      const lessonsEligible = completedCount >= lessons.length;

      const quizzes = await Quiz.find({ courseId: course._id, isPublished: true }).select('_id');
      let quizzesEligible = true;
      if (quizzes.length > 0) {
        const submittedCount = await Attempt.distinct('quizId', {
          userId: user._id,
          quizId: { $in: quizzes.map((q) => q._id) },
          submittedAt: { $exists: true },
        });
        quizzesEligible = submittedCount.length >= quizzes.length;
      }

      if (!lessonsEligible || !quizzesEligible) {
        throw new HttpError(409, 'Selesaikan semua materi dan quiz terlebih dahulu');
      }

      let certificate = await Certificate.findOne({
        userId: user._id,
        courseId: course._id,
      });

      const isNew = !certificate;

      if (!certificate) {
        certificate = await Certificate.create({
          userId: user._id,
          courseId: course._id,
          certificateNumber: generateCertificateNumber(),
          completionDate: new Date(),
          metadata: {
            userName: user.fullName || '',
            courseName: course.title,
            instructorName: course.ownerId?.fullName || course.ownerId?.name || 'InspiraLearn',
            instructorSignatureUrl: course.ownerId?.signatureUrl || '',
          },
        });

        // Log generation
        CertificateLog.create({
          certificateId: certificate._id,
          certificateNumber: certificate.certificateNumber,
          userId: user._id,
          courseId: course._id,
          action: 'generated',
          ip: req.ip || '',
        }).catch(() => {});
      }

      res.json({ certificate, isNew });
    })
  );

  // Admin/Teacher: list certificates (teacher only sees their own courses)
  router.get(
    '/all',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      let filter = {};
      if (req.user.role === 'teacher') {
        const { Course } = require('../models/Course');
        const teacherCourses = await Course.find({ ownerId: req.user.sub }).select('_id');
        filter = { courseId: { $in: teacherCourses.map((c) => c._id) } };
      }
      const certificates = await Certificate.find(filter)
        .populate('userId', 'name email fullName')
        .populate('courseId', 'title')
        .sort({ issuedAt: -1 })
        .limit(100);
      res.json({ certificates });
    })
  );

  // Admin: certificate logs
  router.get(
    '/logs',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const logs = await CertificateLog.find()
        .populate('userId', 'name fullName email')
        .populate('courseId', 'title')
        .sort({ createdAt: -1 })
        .limit(200);
      res.json({ logs });
    })
  );

  return router;
}

module.exports = { certificatesRouter };
