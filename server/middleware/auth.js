const { readSessionCookie, clearSessionCookie } = require('../services/session');
const { verifySessionToken } = require('../utils/token');
const db = require('../db');

const requireAuth = async (req, res, next) => {
  try {
    const token = readSessionCookie(req);
    if (!token) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const session = verifySessionToken(token);
    if (!session) {
      clearSessionCookie(res);
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const user = await db.getUserById(session.userId);
    if (!user) {
      clearSessionCookie(res);
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    // A password change bumps the stored version, so every older cookie is
    // rejected even though its signature and `exp` are still valid.
    if ((Number(user.token_version) || 0) !== session.tokenVersion) {
      clearSessionCookie(res);
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    req.user = user;
    req.userId = user.id;
    return next();
  } catch (err) {
    console.error('[AUTH] requireAuth error:', err.message);
    return res.status(401).json({ message: 'Not authenticated.' });
  }
};

module.exports = { requireAuth };
