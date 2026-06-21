const nodemailer = require('nodemailer');
const { Setting } = require('../models/Setting');

/**
 * getSmtpConfig - Load SMTP configuration.
 * Priority: 1. Database  2. Environment variables
 * Never throws.
 */
async function getSmtpConfig() {
  try {
    const doc = await Setting.findOne({ key: 'smtp' }).lean();
    if (doc?.value?.host && doc?.value?.user && doc?.value?.pass) {
      return {
        host: doc.value.host,
        port: Number(doc.value.port) || 465,
        user: doc.value.user,
        pass: doc.value.pass,
        from: doc.value.from || doc.value.user,
      };
    }
  } catch {
    // DB unavailable — fall through to env
  }

  return {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 465,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  };
}

function hasSmtpConfigured(env) {
  // Legacy check (synchronous) for places that haven't been updated yet.
  return Boolean(env?.SMTP_HOST && env?.SMTP_PORT && env?.SMTP_USER && env?.SMTP_PASS);
}

function createTransport(cfg) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });
}

/**
 * sendMail - Sends an email.
 * Reads config from DB first, falls back to env.
 */
async function sendMail(env, { to, subject, text, html }) {
  const cfg = await getSmtpConfig();

  if (!cfg.host || !cfg.user || !cfg.pass) {
    // Check env as last resort (synchronous legacy check)
    if (!hasSmtpConfigured(env)) {
      const err = new Error('SMTP is not configured');
      err.code = 'SMTP_NOT_CONFIGURED';
      throw err;
    }
    // Use env values
    cfg.host = env.SMTP_HOST;
    cfg.port = Number(env.SMTP_PORT) || 465;
    cfg.user = env.SMTP_USER;
    cfg.pass = env.SMTP_PASS;
    cfg.from = env.SMTP_FROM || env.SMTP_USER;
  }

  const transporter = createTransport(cfg);
  return transporter.sendMail({ from: cfg.from, to, subject, text, html });
}

module.exports = { hasSmtpConfigured, sendMail, getSmtpConfig };
