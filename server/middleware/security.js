/**
 * Minimal, dependency-free security headers.
 *
 * We avoid `helmet` because the app is a small API + SPA pair and the CSP
 * below is tuned for exactly that shape. Keeping it local also means the
 * policy is visible and editable next to the code it protects.
 */
const { config } = require('../config');

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "font-src 'self' https://fonts.gstatic.com",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "connect-src 'self' https://*.stream-io-api.com https://*.stream-io-api.com:443 wss://*.stream-io-api.com https://localhost:5000 http://localhost:5000",
].join('; ');

const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Content-Security-Policy', CSP_DIRECTIVES);

  if (config.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
};

module.exports = { securityHeaders, CSP_DIRECTIVES };
