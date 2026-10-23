const { config } = require('../config');
const { parseCookies } = require('../utils/cookies');

/**
 * Session cookies are `httpOnly` so that a script injected into the page
 * cannot read the long-lived credential. The short-lived Stream token that
 * the browser SDK needs is handed to the client over `/auth/session` and kept
 * in memory only - it is never written to `document.cookie` or
 * `localStorage`.
 */
const cookieOptions = () => ({
  httpOnly: true,
  // Same-origin in production via the Vercel `/api` rewrite, so `none` is only
  // a safety net for direct cross-site API calls (Chrome). It requires Secure,
  // which production always has.
  sameSite: config.isProduction ? 'none' : 'lax',
  secure: config.isProduction,
  path: '/',
  maxAge: config.auth.sessionTtlMs,
});

const setSessionCookie = (res, token) => {
  res.cookie(config.auth.cookieName, token, cookieOptions());
};

const clearSessionCookie = (res) => {
  res.clearCookie(config.auth.cookieName, {
    httpOnly: true,
    sameSite: config.isProduction ? 'none' : 'lax',
    secure: config.isProduction,
    path: '/',
  });
};

const readSessionCookie = (req) => {
  const cookies = parseCookies(req);
  return cookies[config.auth.cookieName] || null;
};

module.exports = { setSessionCookie, clearSessionCookie, readSessionCookie, cookieOptions };
