const crypto = require('crypto');

const { config } = require('../config');
const db = require('../db');

/**
 * Password reset tokens.
 *
 * The raw token is handed to the user (by email or the admin script) and is
 * never stored. The database keeps only a SHA-256 hash, so a database leak
 * does not hand an attacker working reset links.
 */
const TOKEN_BYTES = 32;

const generateToken = () => crypto.randomBytes(TOKEN_BYTES).toString('base64url');

const hashToken = (token) =>
  crypto.createHash('sha256').update(String(token || ''), 'utf8').digest('hex');

const buildResetUrl = (token) =>
  `${config.passwordReset.publicAppUrl}/reset-password?token=${encodeURIComponent(token)}`;

/**
 * Creates a token for a user, invalidating any older unused token they have.
 * Returns the raw token and the URL to deliver - never the hash.
 */
const issueResetToken = async ({ userId, ip }) => {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + config.passwordReset.ttlMs);

  await db.createPasswordReset({
    id: crypto.randomUUID(),
    userId,
    tokenHash: hashToken(token),
    expiresAt,
    requestedIp: ip || null,
  });

  return {
    token,
    tokenHash: hashToken(token),
    expiresAt,
    resetUrl: buildResetUrl(token),
  };
};

module.exports = {
  TOKEN_BYTES,
  generateToken,
  hashToken,
  buildResetUrl,
  issueResetToken,
};
