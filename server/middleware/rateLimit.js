/**
 * A small in-process sliding-window rate limiter.
 *
 * Deliberately dependency-free and in-memory: this service runs as a single
 * instance on Render. If it is ever scaled horizontally, swap the `hits` map
 * for a shared store (Redis) - the interface stays the same.
 */
const { config } = require('../config');

const hits = new Map();

const sweep = () => {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (entry.resetAt <= now) hits.delete(key);
  }
};

const timer = setInterval(sweep, 60_000);
if (typeof timer.unref === 'function') timer.unref();

const clientKey = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

/**
 * @param {object} options
 * @param {number} options.windowMs Sliding window length in milliseconds.
 * @param {number} options.max Requests allowed per window per client.
 * @param {string} options.name Bucket name, used in the response headers.
 */
const createRateLimiter = ({ windowMs = config.rateLimit.windowMs, max = config.rateLimit.max, name = 'global' } = {}) => {
  const bucket = new Map();

  const limiter = (req, res, next) => {
    if (!config.rateLimit.enabled) return next();

    const key = `${name}:${clientKey(req)}`;
    const now = Date.now();
    const entry = bucket.get(key);

    if (!entry || entry.resetAt <= now) {
      bucket.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - 1));
      return next();
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      return res.status(429).json({
        message: 'Too many requests. Please slow down and try again shortly.',
        retryAfter,
      });
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));
    next();
  };

  limiter.reset = () => bucket.clear();
  return limiter;
};

/**
 * Rate limiter that only counts failed authentication attempts, so that a
 * legitimate user who mistypes twice is never locked out mid-session.
 */
const createAuthLimiter = () => {
  const limiter = createRateLimiter({
    windowMs: config.rateLimit.authWindowMs,
    max: config.rateLimit.authMax,
    name: 'auth',
  });

  const failures = new Map();

  limiter.recordFailure = (key) => {
    const now = Date.now();
    const entry = failures.get(key);
    if (!entry || entry.resetAt <= now) {
      failures.set(key, { count: 1, resetAt: now + config.rateLimit.authWindowMs });
      return;
    }
    entry.count += 1;
  };

  limiter.clearFailures = (key) => failures.delete(key);

  limiter.isBlocked = (key) => {
    const entry = failures.get(key);
    if (!entry) return false;
    if (entry.resetAt <= Date.now()) {
      failures.delete(key);
      return false;
    }
    return entry.count >= config.rateLimit.accountMaxFailures;
  };

  limiter.resetFailures = () => failures.clear();

  return limiter;
};

const resetAll = () => {
  hits.clear();
};

module.exports = { createRateLimiter, createAuthLimiter, clientKey, resetAll };
