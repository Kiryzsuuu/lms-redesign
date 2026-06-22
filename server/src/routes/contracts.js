const express = require('express');
const { z } = require('zod');
const { Contract } = require('../models/Contract');
const { Course } = require('../models/Course');
const { User } = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');
const { HttpError } = require('../utils/errors');
const { audit } = require('../utils/audit');

function contractsRouter({ requireAuth, requireRole }) {
  const router = express.Router();
  router.use(requireAuth);

  // ── ADMIN: list all contracts (with optional filters) ─────────────────────
  router.get(
    '/',
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const { status, teacherId, courseId } = req.query;
      const filter = {};
      if (status)    filter.status    = status;
      if (teacherId) filter.teacherId = teacherId;
      if (courseId)  filter.courseId  = courseId;

      const contracts = await Contract.find(filter)
        .populate('courseId',  'title isPublished')
        .populate('teacherId', 'name email skills')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .lean();

      res.json({ contracts });
    })
  );

  // ── TEACHER: list own contracts ───────────────────────────────────────────
  router.get(
    '/mine',
    requireRole('teacher'),
    asyncHandler(async (req, res) => {
      const contracts = await Contract.find({ teacherId: req.user.sub })
        .populate('courseId',  'title isPublished coverImageUrl')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .lean();

      res.json({ contracts });
    })
  );

  // ── ADMIN: create a contract ──────────────────────────────────────────────
  router.post(
    '/',
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const schema = z.object({
        courseId:         z.string().min(1),
        teacherId:        z.string().min(1),
        companyName:      z.string().min(2).max(200),
        royaltyRatio:     z.coerce.number().min(0).max(1),
        validFrom:        z.coerce.date(),
        validUntil:       z.coerce.date(),
        responseDeadline: z.coerce.date(),
        scopeHtml:        z.string().default(''),
        ipClause:         z.string().default(''),
        ndaActive:        z.boolean().default(false),
        bonusClause:      z.string().default(''),
        adminNotes:       z.string().default(''),
      });

      const data = schema.parse(req.body);

      // Verify course exists and belongs to system
      const course = await Course.findById(data.courseId);
      if (!course) throw new HttpError(404, 'Course not found');

      // Verify teacher exists
      const teacher = await User.findById(data.teacherId).select('role name email');
      if (!teacher || teacher.role !== 'teacher') {
        throw new HttpError(400, 'Invalid teacher');
      }

      if (data.validUntil <= data.validFrom) {
        throw new HttpError(400, 'validUntil must be after validFrom');
      }
      if (data.responseDeadline > data.validUntil) {
        throw new HttpError(400, 'responseDeadline must be before validUntil');
      }

      const contract = await Contract.create({
        ...data,
        createdBy: req.user.sub,
        status: 'sent',
      });

      audit({
        actor: req.user,
        action: 'create',
        resource: 'contract',
        resourceId: contract._id,
        resourceName: `${data.companyName} → ${teacher.name}`,
        req,
      });

      res.status(201).json({ contract });
    })
  );

  // ── GET single contract ───────────────────────────────────────────────────
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const contract = await Contract.findById(req.params.id)
        .populate('courseId',  'title isPublished coverImageUrl')
        .populate('teacherId', 'name email')
        .populate('createdBy', 'name')
        .lean();

      if (!contract) throw new HttpError(404, 'Contract not found');

      // Admin can see any; teacher can only see own
      if (req.user.role === 'teacher' && String(contract.teacherId._id) !== String(req.user.sub)) {
        throw new HttpError(403, 'Forbidden');
      }

      res.json({ contract });
    })
  );

  // ── ADMIN: update contract (only when still in draft/sent) ────────────────
  router.put(
    '/:id',
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const contract = await Contract.findById(req.params.id);
      if (!contract) throw new HttpError(404, 'Contract not found');

      if (!['draft', 'sent'].includes(contract.status)) {
        throw new HttpError(409, 'Cannot edit a contract that has already been responded to');
      }

      const schema = z.object({
        companyName:      z.string().min(2).max(200).optional(),
        royaltyRatio:     z.coerce.number().min(0).max(1).optional(),
        validFrom:        z.coerce.date().optional(),
        validUntil:       z.coerce.date().optional(),
        responseDeadline: z.coerce.date().optional(),
        scopeHtml:        z.string().optional(),
        ipClause:         z.string().optional(),
        ndaActive:        z.boolean().optional(),
        bonusClause:      z.string().optional(),
        adminNotes:       z.string().optional(),
        status:           z.enum(['draft', 'sent']).optional(),
        teacherId:        z.string().optional(),
      });

      const data = schema.parse(req.body);

      if (data.teacherId) {
        const teacher = await User.findById(data.teacherId).select('role');
        if (!teacher || teacher.role !== 'teacher') {
          throw new HttpError(400, 'Invalid teacher');
        }
      }

      Object.assign(contract, data);
      await contract.save();

      audit({
        actor: req.user,
        action: 'update',
        resource: 'contract',
        resourceId: contract._id,
        resourceName: contract.companyName,
        req,
      });

      res.json({ contract });
    })
  );

  // ── TEACHER: accept contract ──────────────────────────────────────────────
  router.post(
    '/:id/accept',
    requireRole('teacher'),
    asyncHandler(async (req, res) => {
      const contract = await Contract.findById(req.params.id);
      if (!contract) throw new HttpError(404, 'Contract not found');

      if (String(contract.teacherId) !== String(req.user.sub)) {
        throw new HttpError(403, 'Forbidden');
      }
      if (contract.status !== 'sent') {
        throw new HttpError(409, 'Contract is not in a respondable state');
      }
      if (contract.responseDeadline < new Date()) {
        throw new HttpError(400, 'Response deadline has passed');
      }

      contract.status = 'accepted';
      contract.acceptedAt = new Date();
      contract.teacherDescription = (req.body.teacherDescription || '').trim();
      contract.teacherExpertise = (req.body.teacherExpertise || '').trim();
      await contract.save();

      // Update the course ownerId to this teacher so they can edit it.
      // Seed the course description from the teacher's contract description.
      const courseUpdate = { ownerId: contract.teacherId };
      if (contract.teacherDescription) courseUpdate.description = contract.teacherDescription;
      if (contract.teacherExpertise) {
        courseUpdate.tags = contract.teacherExpertise.split(',').map(s => s.trim()).filter(Boolean);
      }
      await Course.findByIdAndUpdate(contract.courseId, courseUpdate);

      audit({
        actor: req.user,
        action: 'update',
        resource: 'contract',
        resourceId: contract._id,
        resourceName: `Accepted: ${contract.companyName}`,
        req,
      });

      res.json({ ok: true, contract });
    })
  );

  // ── TEACHER: reject contract ──────────────────────────────────────────────
  router.post(
    '/:id/reject',
    requireRole('teacher'),
    asyncHandler(async (req, res) => {
      const contract = await Contract.findById(req.params.id);
      if (!contract) throw new HttpError(404, 'Contract not found');

      if (String(contract.teacherId) !== String(req.user.sub)) {
        throw new HttpError(403, 'Forbidden');
      }
      if (contract.status !== 'sent') {
        throw new HttpError(409, 'Contract is not in a respondable state');
      }

      const schema = z.object({
        rejectionReason: z.string().max(1000).default(''),
      });
      const { rejectionReason } = schema.parse(req.body);

      contract.status = 'rejected';
      contract.rejectedAt = new Date();
      contract.rejectionReason = rejectionReason;
      await contract.save();

      audit({
        actor: req.user,
        action: 'update',
        resource: 'contract',
        resourceId: contract._id,
        resourceName: `Rejected: ${contract.companyName}`,
        req,
      });

      res.json({ ok: true, contract });
    })
  );

  // ── ADMIN: cancel/expire a contract ──────────────────────────────────────
  router.delete(
    '/:id',
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const contract = await Contract.findById(req.params.id);
      if (!contract) throw new HttpError(404, 'Contract not found');

      if (contract.status === 'completed') {
        throw new HttpError(409, 'Cannot cancel a completed contract');
      }

      contract.status = 'expired';
      await contract.save();

      audit({
        actor: req.user,
        action: 'delete',
        resource: 'contract',
        resourceId: contract._id,
        resourceName: contract.companyName,
        req,
      });

      res.json({ ok: true });
    })
  );

  return router;
}

module.exports = { contractsRouter };
