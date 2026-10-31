/**
 * Small in-process rate limiter.
 *
 * This service currently runs as a single Render instance, so counters live in
 * memory. Every store is registered so the sweep timer can drop expired entries
 * instead of letting unique IPs/accounts grow the maps forever. If the API is
 * ever scaled horizontally or moved to serverless, replace the maps with a
 * shared store (Neon or Redis) behind the same interface.
 */
const { config } = require('../config');

/** All maps created by limiters, so the sweep can clean every one. */
const stores = new Set();

const registerStore = (store) => {
  stores.add(store);
  return store;
};

const sweep = () => {
  const now = Date.now();
  for (const store of stores) {
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }
};

const timer = setInterval(sweep, 60_000);
if (typeof timer.unref === 'function') timer.unref();

/**
 * Prefer Express's resolved `req.ip` (which respects `trust proxy`) over a raw
 * `X-Forwarded-For` value. Reading the first header entry directly lets a
 * caller choose their own rate-limit bucket when the proxy appends rather than
 * replaces the header.
 */
const clientKey = (req) => {
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

/**
 * @param {object} options
 * @param {number} options.windowMs Window length in milliseconds.
 * @param {number} options.max Requests allowed per window per client.
 * @param {string} options.name Bucket name, used in the response headers.
 */
const createRateLimiter = ({ windowMs = config.rateLimit.windowMs, max = config.rateLimit.max, name = 'global' } = {}) => {
  const bucket = registerStore(new Map());

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

  const failures = registerStore(new Map());

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
  for (const store of stores) store.clear();
};

module.exports = { createRateLimiter, createAuthLimiter, clientKey, resetAll };
