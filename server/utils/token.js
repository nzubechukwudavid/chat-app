const jwt = require('jsonwebtoken');

const { config } = require('../config');

/**
 * Stream user tokens are HS256 JWTs signed with the API secret and carry a
 * single meaningful claim: `user_id`.
 *
 * We verify the signature locally instead of trusting the cookie blindly, so
 * a tampered session cookie cannot be used to impersonate another officer.
 */
const verifyUserToken = (token) => {
  if (!token || typeof token !== 'string') return null;

  try {
    const decoded = jwt.verify(token, config.stream.apiSecret, {
      algorithms: ['HS256'],
      // Stream issues tokens without a timestamp by default, so there is no
      // `exp` to validate here. The session cookie carries the real TTL.
      ignoreExpiration: true,
    });

    const userId = decoded?.user_id;
    return typeof userId === 'string' && userId ? userId : null;
  } catch {
    return null;
  }
};

module.exports = { verifyUserToken };
