const jwt = require('jsonwebtoken');

const { config } = require('../config');

/**
 * The browser session is a server-issued JWT, not the Stream token. That lets
 * us revoke every device by bumping `users.token_version`: old cookies carry
 * the previous version and stop verifying immediately.
 *
 * The short-lived Stream token the browser SDK needs is created separately and
 * handed to the client over `/auth/session`.
 */
const sessionTtlSeconds = Math.max(60, Math.floor(config.auth.sessionTtlMs / 1000));

const signSessionToken = (userId, tokenVersion = 0) =>
  jwt.sign(
    { sub: userId, sv: Number(tokenVersion) || 0 },
    config.auth.sessionSecret,
    { algorithm: 'HS256', expiresIn: sessionTtlSeconds },
  );

const verifySessionToken = (token) => {
  if (!token || typeof token !== 'string') return null;

  try {
    const decoded = jwt.verify(token, config.auth.sessionSecret, {
      algorithms: ['HS256'],
    });

    if (typeof decoded?.sub !== 'string' || !decoded.sub) return null;

    return {
      userId: decoded.sub,
      tokenVersion: Number(decoded.sv) || 0,
    };
  } catch {
    return null;
  }
};

module.exports = { signSessionToken, verifySessionToken };
