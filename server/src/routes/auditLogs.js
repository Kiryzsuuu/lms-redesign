const express = require('express');
const { AuditLog } = require('../models/AuditLog');
const { asyncHandler } = require('../utils/asyncHandler');

function auditLogsRouter({ requireAuth, requireRole }) {
  const router = express.Router();

  // Admin & teacher: list recent audit logs (teacher sees only their own actions)
  router.get(
    '/',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const page  = Math.max(1, parseInt(req.query.page)  || 1);
      const limit = Math.min(100, parseInt(req.query.limit) || 50);
      const skip  = (page - 1) * limit;

      const filter = {};
      if (req.user.role === 'teacher') filter.actorId = req.user.sub;
      if (req.query.resource) filter.resource = req.query.resource;
      if (req.query.action)   filter.action   = req.query.action;
      if (req.query.actor)    filter.actorId  = req.query.actor;

      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('actorId', 'name email'),
        AuditLog.countDocuments(filter),
      ]);

      res.json({ logs, total, page, pages: Math.ceil(total / limit) });
    })
  );

  // Per-resource history (e.g. all changes to a specific course/lesson)
  router.get(
    '/:resource/:resourceId',
    requireAuth,
    requireRole('admin', 'teacher'),
    asyncHandler(async (req, res) => {
      const filter = { resource: req.params.resource, resourceId: req.params.resourceId };
      if (req.user.role === 'teacher') filter.actorId = req.user.sub;
      const logs = await AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('actorId', 'name email');
      res.json({ logs });
    })
  );

  return router;
}

module.exports = { auditLogsRouter };
