const { readSessionCookie } = require('../services/session');
const { verifyUserToken } = require('../utils/token');
const db = require('../db');

const requireAuth = async (req, res, next) => {
  try {
    const token = readSessionCookie(req);
    if (!token) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const payload = verifyUserToken(token);
    if (!payload?.userId) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const user = await db.getUserById(payload.userId);
    if (!user) {
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
