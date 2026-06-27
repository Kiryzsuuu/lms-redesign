const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { connectDb } = require('./db');
const { getEnv } = require('./utils/env');
const { notFound, errorHandler } = require('./utils/errors');
const { requireAuth, requireRole } = require('./middleware/auth');
const { authRouter } = require('./routes/auth');
const { heroesRouter } = require('./routes/heroes');
const { coursesRouter } = require('./routes/courses');
const { notificationsRouter } = require('./routes/notifications');
const { referralRouter } = require('./routes/referral');
const { quizzesRouter } = require('./routes/quizzes');
const { adminRouter } = require('./routes/admin');
const { progressRouter } = require('./routes/progress');
const { uploadsRouter, UPLOAD_DIR } = require('./routes/uploads');
const { questionBankRouter } = require('./routes/questionBank');
const { assignmentsRouter } = require('./routes/assignments');
const { cartRouter } = require('./routes/cart');
const { paymentsRouter } = require('./routes/payments');
const { reportsRouter } = require('./routes/reports');
const { certificatesRouter } = require('./routes/certificates');
const { aboutRouter } = require('./routes/about');
const { couponsRouter } = require('./routes/coupons');
const { royaltiesRouter } = require('./routes/royalties');
const { courseTemplatesRouter } = require('./routes/courseTemplates');
const { categoriesRouter } = require('./routes/categories');
const { testimonialsRouter } = require('./routes/testimonials');
const { auditLogsRouter } = require('./routes/auditLogs');
const { settingsRouter } = require('./routes/settings');
const { discussionsRouter } = require('./routes/discussions');
const { contractsRouter } = require('./routes/contracts');

let appPromise = null;

async function createApp() {
  const env = getEnv();
  let dbConnected = false;
  try {
    await connectDb(env.MONGO_URI);
    dbConnected = true;
  } catch (err) {
    console.error('MongoDB connection failed at startup:', err?.message || err);
  }

  const app = express();

  app.set('trust proxy', 1);
  app.use(morgan('dev'));
  app.use(express.json({ limit: '1mb' }));

  const allowedOrigins = String(env.CLIENT_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.length === 0) return callback(null, true);
        if (allowedOrigins.includes('*')) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: false,
    })
  );

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, dbConnected });
  });

  app.use('/uploads', express.static(UPLOAD_DIR));

  if (process.env.NODE_ENV !== 'production') {
    app.get('/', (req, res) => {
      if (allowedOrigins[0]) return res.redirect(allowedOrigins[0]);
      return res.json({ ok: true, message: 'API server running.' });
    });
  }

  app.use('/api/auth', authRouter({ jwtSecret: env.JWT_SECRET }));
  app.use('/api/heroes', heroesRouter({ requireAuth: requireAuth(env.JWT_SECRET), requireRole }));
  app.use('/api/about', aboutRouter({ requireAuth: requireAuth(env.JWT_SECRET), requireRole }));
  app.use('/api/courses', coursesRouter({ requireAuth: requireAuth(env.JWT_SECRET), requireRole, env }));
  app.use('/api/notifications', notificationsRouter({ requireAuth: requireAuth(env.JWT_SECRET) }));
  app.use('/api/referral', referralRouter({ requireAuth: requireAuth(env.JWT_SECRET) }));
  app.use('/api/quizzes', quizzesRouter({ requireAuth: requireAuth(env.JWT_SECRET), requireRole }));
  app.use('/api/admin', adminRouter({ requireAuth: requireAuth(env.JWT_SECRET), requireRole }));
  app.use('/api/progress', progressRouter({ requireAuth: requireAuth(env.JWT_SECRET) }));
  app.use('/api/uploads', uploadsRouter({ requireAuth: requireAuth(env.JWT_SECRET), requireRole }));
  app.use('/api/question-bank', questionBankRouter({ requireAuth: requireAuth(env.JWT_SECRET), requireRole }));
  app.use('/api/assignments', assignmentsRouter({ requireAuth: requireAuth(env.JWT_SECRET), requireRole }));
  app.use('/api/cart', cartRouter({ requireAuth: requireAuth(env.JWT_SECRET), requireRole }));
  app.use(
    '/api/payments',
    paymentsRouter({
      requireAuth: requireAuth(env.JWT_SECRET),
      requireRole,
      midtrans: {
        serverKey: env.MIDTRANS_SERVER_KEY,
        clientKey: env.MIDTRANS_CLIENT_KEY,
        isProduction: env.MIDTRANS_IS_PRODUCTION,
      },
    })
  );
  app.use('/api/reports', reportsRouter({ requireAuth: requireAuth(env.JWT_SECRET), requireRole }));
  app.use('/api/certificates', certificatesRouter({ requireAuth: requireAuth(env.JWT_SECRET), requireRole }));
  app.use('/api/coupons', couponsRouter({ requireAuth: requireAuth(env.JWT_SECRET), requireRole }));
  app.use('/api/royalties', royaltiesRouter({ requireAuth: requireAuth(env.JWT_SECRET), requireRole }));
  app.use('/api/course-templates', courseTemplatesRouter({ requireAuth: requireAuth(env.JWT_SECRET), requireRole }));
  app.use('/api/categories', categoriesRouter({ requireAuth: requireAuth(env.JWT_SECRET), requireRole }));
  app.use('/api/testimonials', testimonialsRouter({ requireAuth: requireAuth(env.JWT_SECRET), requireRole }));
  app.use('/api/audit-logs', auditLogsRouter({ requireAuth: requireAuth(env.JWT_SECRET), requireRole }));
  app.use('/api/settings', settingsRouter({ requireAuth: requireAuth(env.JWT_SECRET), requireRole }));
  app.use('/api/discussions', discussionsRouter({ requireAuth: requireAuth(env.JWT_SECRET) }));
  app.use('/api/contracts', contractsRouter({ requireAuth: requireAuth(env.JWT_SECRET), requireRole }));

  // Dev: proxy non-API traffic to Vite dev server
  if (process.env.NODE_ENV !== 'production' && env.CLIENT_ORIGIN) {
    const { createProxyMiddleware } = require('http-proxy-middleware');
    app.use(
      '/',
      createProxyMiddleware({
        target: env.CLIENT_ORIGIN,
        changeOrigin: true,
        ws: true,
        logLevel: 'silent',
        filter: (req) => {
          if (req.path === '/') return false;
          if (req.path.startsWith('/api/')) return false;
          return true;
        },
      })
    );
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

function getApp() {
  if (!appPromise) appPromise = createApp();
  return appPromise;
}

module.exports = { getApp };
