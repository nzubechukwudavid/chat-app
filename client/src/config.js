/**
 * API base URL.
 *
 * Production builds talk to `/api`, which `vercel.json` rewrites to the
 * Render service. Keeping the call same-origin means the `httpOnly` session
 * cookie is first-party: it survives Safari's third-party cookie blocking and
 * needs no CORS preflight. Point a different deployment at another backend by
 * editing the rewrite destination in `vercel.json`, not this file.
 *
 * Local development still talks to the Express server directly so CORS and
 * cookies are exercised in their cross-origin form.
 */
const DEV_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const API_URL = process.env.NODE_ENV === 'production' ? '/api' : DEV_API_URL;

export const STREAM_API_KEY = process.env.REACT_APP_STREAM_API_KEY || 'spz529r7wxmx';
