const { readSessionCookie } = require('../services/session');
const { verifyUserToken } = require('../utils/token');
const db = require('../db');

const requireAuth = async (req, res, next) => {
  try {
    const token = readSessionCookie(req);
    if (!token) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    // `verifyUserToken` returns the Stream user id itself (a string), not the
    // decoded JWT payload. Treating it as `payload.userId` made every
    // authenticated route answer 401.
    const userId = verifyUserToken(token);
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const user = await db.getUserById(userId);
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
