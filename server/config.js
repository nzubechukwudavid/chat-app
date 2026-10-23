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

const corsOrigins = [
  'http://localhost:3000',
  process.env.VERCEL_FRONTEND_URL,
].filter(Boolean);

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: toInt(process.env.PORT, 5000),

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
    /**
     * When enabled the bcrypt hash is mirrored into the Stream user record so
     * credentials survive an ephemeral (disk-less) deployment restart.
     * Off by default: it means the hash is readable by anyone holding the
     * Stream API secret. Only turn it on when the primary database is
     * genuinely non-durable.
     */
    credentialFallback: toBool(process.env.STREAM_CREDENTIAL_FALLBACK, false),
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID || '',
  },

  databaseUrl: process.env.DATABASE_URL || '',

  /**
   * Shared secret for the Stream webhook endpoint. Stream can be configured to
   * append `?auth_token=...` to webhook calls; when set, the endpoint rejects
   * anything that does not present the right value.
   */
  streamWebhookSecret: process.env.STREAM_WEBHOOK_SECRET || '',

  auth: {
    bcryptRounds: toInt(process.env.BCRYPT_ROUNDS, 12),
    usernameMinLength: 3,
    usernameMaxLength: 32,
    passwordMinLength: 8,
    passwordMaxLength: 200,
    sessionTtlMs: toInt(process.env.SESSION_TTL_HOURS, 24 * 7) * 60 * 60 * 1000,
    cookieName: process.env.SESSION_COOKIE_NAME || 'railhub_session',
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
config.hasTwilio = Boolean(
  config.twilio.accountSid && config.twilio.authToken && config.twilio.messagingServiceSid,
);

/**
 * Fails fast on misconfiguration instead of surfacing confusing 500s later.
 */
const assertUsable = () => {
  const problems = [];
  if (!config.hasStreamCredentials) {
    problems.push('STREAM_API_KEY and STREAM_API_SECRET are required');
  }
  if (problems.length) {
    throw new Error(`[config] Invalid configuration:\n  - ${problems.join('\n  - ')}`);
  }
};

module.exports = { config, assertUsable };
