const jwt = require('jsonwebtoken');
const { HttpError } = require('../utils/errors');
const { User } = require('../models/User');

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}

function requireAuth(jwtSecret) {
  return function authMiddleware(req, res, next) {
    const token = getBearerToken(req);
    if (!token) return next(new HttpError(401, 'Unauthorized'));

    try {
      const payload = jwt.verify(token, jwtSecret);
      req.user = payload;
      return next();
    } catch {
      return next(new HttpError(401, 'Invalid token'));
    }
  };
}

function requireRole(...roles) {
  const allowedRoles = roles.map((r) => String(r || '').trim().toLowerCase()).filter(Boolean);

  return async function roleMiddleware(req, res, next) {
    try {
      if (!req.user) return next(new HttpError(401, 'Unauthorized'));

      // Always prefer the current role from DB so promotions/demotions
      // take effect immediately (without requiring re-login).
      const userId = req.user.sub;
      const tokenRole = String(req.user.role || '').trim().toLowerCase();
      if (!userId) {
        // Legacy/invalid tokens without sub: fall back to token role check only.
        if (tokenRole && allowedRoles.includes(tokenRole)) return next();
        return next(new HttpError(403, 'Forbidden'));
      }

      const user = await User.findById(userId).select('role').lean();
      const effectiveRole = String(user?.role || tokenRole || '').trim().toLowerCase();
      req.user.role = effectiveRole;

      if (effectiveRole && allowedRoles.includes(effectiveRole)) return next();
      return next(new HttpError(403, 'Forbidden'));
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { requireAuth, requireRole };
