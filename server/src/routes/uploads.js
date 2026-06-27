const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { HttpError } = require('../utils/errors');

// Persisten di disk server (VPS). Bisa dioverride via env UPLOAD_DIR.
// Vercel (serverless, fs read-only) hanya boleh menulis ke /tmp.
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : process.env.VERCEL
    ? '/tmp/uploads'
    : path.resolve(__dirname, '../../uploads');

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function uploadsRouter({ requireAuth, requireRole }) {
  const router = express.Router();

  ensureUploadDir();

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext || ''}`;
      cb(null, name);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype || !file.mimetype.startsWith('image/')) {
        return cb(new HttpError(400, 'Hanya file gambar yang diperbolehkan'));
      }
      cb(null, true);
    },
  });

  const uploadPdf = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype !== 'application/pdf') {
        return cb(new HttpError(400, 'Hanya file PDF yang diperbolehkan'));
      }
      cb(null, true);
    },
  });

  router.post(
    '/image',
    requireAuth,
    requireRole('admin', 'teacher'),
    upload.single('file'),
    (req, res) => {
      if (!req.file) return res.status(400).json({ error: { message: 'File is required' } });
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const url = `${baseUrl}/uploads/${encodeURIComponent(req.file.filename)}`;
      res.status(201).json({ url });
    }
  );

  // Avatar upload — accessible to all authenticated users
  router.post(
    '/avatar',
    requireAuth,
    upload.single('file'),
    (req, res) => {
      if (!req.file) return res.status(400).json({ error: { message: 'File is required' } });
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const url = `${baseUrl}/uploads/${encodeURIComponent(req.file.filename)}`;
      res.status(201).json({ url });
    }
  );

  // Signature upload — accessible to all authenticated users (teacher/admin use for certificates)
  router.post(
    '/signature',
    requireAuth,
    upload.single('file'),
    (req, res) => {
      if (!req.file) return res.status(400).json({ error: { message: 'File is required' } });
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const url = `${baseUrl}/uploads/${encodeURIComponent(req.file.filename)}`;
      res.status(201).json({ url });
    }
  );

  router.post(
    '/pdf',
    requireAuth,
    requireRole('admin', 'teacher'),
    uploadPdf.single('file'),
    (req, res) => {
      if (!req.file) return res.status(400).json({ error: { message: 'File is required' } });
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const url = `${baseUrl}/uploads/${encodeURIComponent(req.file.filename)}`;
      res.status(201).json({ url });
    }
  );

  return router;
}

module.exports = { uploadsRouter, UPLOAD_DIR };
