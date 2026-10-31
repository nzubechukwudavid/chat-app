const express = require('express');

const { signup, login, session, logout, getMe, updateMe, changePassword, uploadAvatar } = require('../controllers/auth.js');
const { createRateLimiter, createAuthLimiter, clientKey } = require('../middleware/rateLimit');
const { config } = require('../config');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

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

const sensitiveLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  name: 'auth-sensitive',
});

router.post('/signup', ipLimiter, guard, signup);
router.post('/login', ipLimiter, guard, (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    if (req.__accountKey) {
      if (res.statusCode >= 400) accountLimiter.recordFailure(req.__accountKey);
      else accountLimiter.clearFailures(req.__accountKey);
    }
    return originalJson(payload);
  };
  return login(req, res, next);
});

router.get('/session', session);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);
router.patch('/me', requireAuth, sensitiveLimiter, updateMe);
router.put('/me', requireAuth, sensitiveLimiter, updateMe);
router.put('/password', requireAuth, sensitiveLimiter, changePassword);
router.post('/change-password', requireAuth, sensitiveLimiter, changePassword);
router.post('/upload/avatar', requireAuth, sensitiveLimiter, (req, res, next) => {
  upload.single('avatar')(req, res, (error) => {
    if (error) {
      return res.status(400).json({ message: error.message || 'That image could not be uploaded.' });
    }
    return next();
  });
}, uploadAvatar);

module.exports = router;
module.exports.clientKey = clientKey;
