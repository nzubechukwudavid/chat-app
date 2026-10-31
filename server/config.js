require('dotenv').config();

const path = require('path');

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeOrigin = (value) => String(value || '').trim().replace(/\/+$/, '');

const corsOrigins = [
  'http://localhost:3000',
  process.env.VERCEL_FRONTEND_URL,
  ...(process.env.CORS_ORIGINS || '').split(','),
].map(normalizeOrigin).filter(Boolean);

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: toInt(process.env.PORT, 5000),

  // Number of reverse-proxy hops Express should trust when resolving req.ip.
  // Vercel -> Render is one hop from the API's point of view.
  trustProxy: toInt(process.env.TRUST_PROXY, 1),

  paths: {
    root: path.resolve(__dirname, '..'),
    sqliteFile: path.join(__dirname, 'users.db'),
  },

  cors: {
    origins: [...new Set(corsOrigins)],
    credentials: true,
  },

  stream: {
    apiKey: process.env.STREAM_API_KEY || '',
    apiSecret: process.env.STREAM_API_SECRET || '',
    appId: process.env.STREAM_APP_ID || '',
  },

  databaseUrl: process.env.DATABASE_URL || '',

  auth: {
    bcryptRounds: toInt(process.env.BCRYPT_ROUNDS, 12),
    usernameMinLength: 3,
    usernameMaxLength: 32,
    passwordMinLength: 8,
    passwordMaxLength: 200,
    sessionTtlMs: toInt(process.env.SESSION_TTL_HOURS, 24 * 7) * 60 * 60 * 1000,
    cookieName: process.env.SESSION_COOKIE_NAME || 'railhub_session',
    /**
     * Signs the server-side session cookie. A dedicated secret is better, but
     * falling back to the Stream secret keeps existing deployments working.
     * Rotating this value signs everyone out.
     */
    sessionSecret: process.env.SESSION_SECRET || process.env.STREAM_API_SECRET || '',
  },

  rateLimit: {
    enabled: toBool(process.env.RATE_LIMIT_ENABLED, true),
    windowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: toInt(process.env.RATE_LIMIT_MAX, 300),
    authMax: toInt(process.env.RATE_LIMIT_AUTH_MAX, 30),
    authWindowMs: toInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 10 * 60 * 1000),
    /** Failed attempts on a single account before it is temporarily locked. */
    accountMaxFailures: toInt(process.env.RATE_LIMIT_ACCOUNT_MAX_FAILURES, 6),
  },
};

config.hasStreamCredentials = Boolean(config.stream.apiKey && config.stream.apiSecret);

/**
 * Fails fast on misconfiguration instead of surfacing confusing 500s later.
 */
const assertUsable = () => {
  const problems = [];
  if (!config.hasStreamCredentials) {
    problems.push('STREAM_API_KEY and STREAM_API_SECRET are required');
  }
  if (!config.auth.sessionSecret) {
    problems.push('SESSION_SECRET (or STREAM_API_SECRET as a fallback) is required');
  }
  if (problems.length) {
    throw new Error(`[config] Invalid configuration:\n  - ${problems.join('\n  - ')}`);
  }
};

module.exports = { config, assertUsable };
