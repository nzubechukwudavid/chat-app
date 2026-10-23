const express = require('express');

const { signup, login, session, logout } = require('../controllers/auth.js');
const { createRateLimiter, createAuthLimiter, clientKey } = require('../middleware/rateLimit');
const { config } = require('../config');

const router = express.Router();

const ipLimiter = createRateLimiter({
  windowMs: config.rateLimit.authWindowMs,
  max: config.rateLimit.authMax,
  name: 'auth-ip',
});

/**
 * Per-account limiter. It only blocks an account after repeated *failed*
 * attempts, so a legitimate user who slips up twice is never locked out.
 */
const accountLimiter = createAuthLimiter();

const guard = (req, res, next) => {
  const key = String(req.body?.username || '').trim().toLowerCase();
  if (key && accountLimiter.isBlocked(key)) {
    return res.status(429).json({
      message: 'Too many failed attempts for this account. Please wait a few minutes and try again.',
    });
  }
  req.__accountKey = key;
  return next();
};

router.post('/signup', ipLimiter, guard, signup);
router.post('/login', ipLimiter, guard, (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    if (res.statusCode >= 400 && req.__accountKey) {
      accountLimiter.recordFailure(req.__accountKey);
    }
    return originalJson(payload);
  };
  return login(req, res, next);
});

router.get('/session', session);
router.post('/logout', logout);

module.exports = router;
module.exports.clientKey = clientKey;
