const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const { Notification } = require('../models/Notification');

function notificationsRouter({ requireAuth }) {
  const router = express.Router();

  // List current user's notifications (most recent first).
  router.get(
    '/me',
    requireAuth,
    asyncHandler(async (req, res) => {
      const limit = Math.min(Number(req.query.limit) || 30, 100);
      const notifications = await Notification.find({ userId: req.user.sub })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      const unreadCount = await Notification.countDocuments({ userId: req.user.sub, isRead: false });
      res.json({ notifications, unreadCount });
    })
  );

  // Lightweight unread count (for the bell badge).
  router.get(
    '/me/unread-count',
    requireAuth,
    asyncHandler(async (req, res) => {
      const unreadCount = await Notification.countDocuments({ userId: req.user.sub, isRead: false });
      res.json({ unreadCount });
    })
  );

  // Mark one notification as read.
  router.post(
    '/:id/read',
    requireAuth,
    asyncHandler(async (req, res) => {
      await Notification.updateOne(
        { _id: req.params.id, userId: req.user.sub },
        { $set: { isRead: true } }
      );
      res.json({ ok: true });
    })
  );

  // Mark all as read.
  router.post(
    '/read-all',
    requireAuth,
    asyncHandler(async (req, res) => {
      await Notification.updateMany(
        { userId: req.user.sub, isRead: false },
        { $set: { isRead: true } }
      );
      res.json({ ok: true });
    })
  );

  return router;
}

module.exports = { notificationsRouter };
