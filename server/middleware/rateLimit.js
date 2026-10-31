/**
 * Rate limiting with a shared Postgres/Neon store in production.
 *
 * Local development falls back to an in-memory store so no database setup is
 * required. The store interface is deliberately small (`increment`, `get`,
 * `clear`, `sweep`) so a Redis implementation could be dropped in later.
 *
 * If the shared store is unavailable the limiter fails open: a database outage
 * should not take authentication down with it. The failure is logged.
 */
const { config } = require('../config');
const db = require('../db');

const memoryStore = () => {
  const entries = new Map();

  return {
    async increment(key, windowMs) {
      const now = Date.now();
      const entry = entries.get(key);

      if (!entry || entry.resetAt <= now) {
        const next = { count: 1, resetAt: now + windowMs };
        entries.set(key, next);
        return next;
      }

      entry.count += 1;
      return entry;
    },

    async get(key) {
      const entry = entries.get(key);
      if (!entry) return null;
      if (entry.resetAt <= Date.now()) {
        entries.delete(key);
        return null;
      }
      return entry;
    },

    async clear(key) {
      entries.delete(key);
    },

    async clearAll() {
      entries.clear();
    },

    sweep() {
      const now = Date.now();
      for (const [key, entry] of entries) {
        if (entry.resetAt <= now) entries.delete(key);
      }
    },
  };
};

const postgresStore = () => ({
  async increment(key, windowMs) {
    const client = await db.ensureDb();
    if (db.dbType !== 'postgres') {
      throw new Error('Postgres rate-limit store selected without DATABASE_URL');
    }

    const res = await client.query(
      `INSERT INTO rate_limits (key, count, reset_at)
       VALUES ($1, 1, NOW() + ($2::double precision * INTERVAL '1 millisecond'))
       ON CONFLICT (key) DO UPDATE SET
         count = CASE
           WHEN rate_limits.reset_at <= NOW() THEN 1
           ELSE rate_limits.count + 1
         END,
         reset_at = CASE
           WHEN rate_limits.reset_at <= NOW() THEN NOW() + ($2::double precision * INTERVAL '1 millisecond')
           ELSE rate_limits.reset_at
         END
       RETURNING count, reset_at`,
      [key, windowMs],
    );

    const row = res.rows[0];
    return { count: Number(row.count), resetAt: new Date(row.reset_at).getTime() };
  },

  async get(key) {
    const client = await db.ensureDb();
    if (db.dbType !== 'postgres') return null;

    const res = await client.query(
      'SELECT count, reset_at FROM rate_limits WHERE key = $1 AND reset_at > NOW() LIMIT 1',
      [key],
    );
    const row = res.rows[0];
    if (!row) return null;
    return { count: Number(row.count), resetAt: new Date(row.reset_at).getTime() };
  },

  async clear(key) {
    const client = await db.ensureDb();
    if (db.dbType !== 'postgres') return;
    await client.query('DELETE FROM rate_limits WHERE key = $1', [key]);
  },

  async clearAll() {
    const client = await db.ensureDb();
    if (db.dbType !== 'postgres') return;
    await client.query('DELETE FROM rate_limits');
  },

  async sweep() {
    const client = await db.ensureDb();
    if (db.dbType !== 'postgres') return;
    await client.query('DELETE FROM rate_limits WHERE reset_at <= NOW()');
  },
});

const createStore = () => {
  if (config.rateLimit.store === 'postgres') {
    if (!config.databaseUrl) {
      console.warn('[rate-limit] RATE_LIMIT_STORE=postgres but DATABASE_URL is empty; using memory');
      return memoryStore();
    }
    console.log('[rate-limit] using shared PostgreSQL/Neon counters');
    return postgresStore();
  }
  return memoryStore();
};

const store = createStore();

const timer = setInterval(() => {
  Promise.resolve(store.sweep()).catch((error) => {
    console.error('[rate-limit] sweep failed:', error.message);
  });
}, 60_000);
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
 * @param {string} options.name Bucket name, used in response headers and keys.
 */
const createRateLimiter = ({ windowMs = config.rateLimit.windowMs, max = config.rateLimit.max, name = 'global' } = {}) => {
  const limiter = async (req, res, next) => {
    if (!config.rateLimit.enabled) return next();

    try {
      const entry = await store.increment(`${name}:${clientKey(req)}`, windowMs);
      const remaining = Math.max(0, max - entry.count);

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', remaining);

      if (entry.count > max) {
        const retryAfter = Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 1000));
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({
          message: 'Too many requests. Please slow down and try again shortly.',
          retryAfter,
        });
      }

      return next();
    } catch (error) {
      console.error('[rate-limit] store error, allowing request:', error.message);
      return next();
    }
  };

  return limiter;
};

/**
 * Only counts failed authentication attempts, so a legitimate user who
 * mistypes twice is never locked out mid-session.
 */
const createAuthLimiter = () => ({
  async recordFailure(key) {
    await store.increment(`authfail:${key}`, config.rateLimit.authWindowMs);
  },

  async clearFailures(key) {
    await store.clear(`authfail:${key}`);
  },

  async isBlocked(key) {
    const entry = await store.get(`authfail:${key}`);
    return Boolean(entry && entry.count >= config.rateLimit.accountMaxFailures);
  },
});

const resetAll = () => store.clearAll();

module.exports = { createRateLimiter, createAuthLimiter, clientKey, resetAll };
