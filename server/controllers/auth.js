const bcrypt = require('bcrypt');
const StreamChat = require('stream-chat').StreamChat;
const crypto = require('crypto');

const { config } = require('../config');
const db = require('../db');
const {
  validateSignupPayload,
  sanitizeText,
  validateEmail,
  validatePassword,
} = require('../middleware/validate');
const { isSupportedImage } = require('../middleware/upload');
const { createAuthLimiter } = require('../middleware/rateLimit');
const { setSessionCookie, clearSessionCookie, readSessionCookie } = require('../services/session');
const { sendPasswordReset } = require('../services/mailer');
const { issueResetToken, hashToken } = require('../services/passwordReset');
const { signSessionToken, verifySessionToken } = require('../utils/token');

/**
 * A valid bcrypt hash of a throwaway string. Comparing against it when the
 * requested account does not exist keeps the response time of "unknown user"
 * and "wrong password" indistinguishable, which closes a user-enumeration
 * timing oracle.
 */
const TIMING_EQUALIZER_HASH = '$2b$12$S/PwA.EDR5tjfl72sKcF1eBzZYPbmUOK8Y/GKtEIq4c4ph30TGk3u';

const GENERIC_LOGIN_FAILURE = 'Invalid username or password.';

/**
 * The forgot-password response never varies, and the endpoint waits at least
 * this long so a hit and a miss cannot be told apart by response time.
 */
const FORGOT_MESSAGE = 'If an account matches, a reset link is on its way. Check your inbox.';
const FORGOT_MIN_RESPONSE_MS = 400;
const INVALID_RESET_MESSAGE = 'This reset link is invalid or has expired.';

const waitForMinimumDuration = async (startedAt, minimumMs) => {
  const remaining = minimumMs - (Date.now() - startedAt);
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
};

/**
 * Used to release the per-account lockout after a successful reset. Login
 * records failures under the lower-cased handle, so clear the same key.
 */
const resetAccountLimiter = createAuthLimiter();

/**
 * Single Stream server client for every privileged operation: issuing user
 * tokens and upserting profiles. Using one SDK avoids the v2/v3 API drift that
 * previously made profile updates silently no-op.
 */
let streamClient = null;
const getStreamClient = () => {
  if (!streamClient) {
    streamClient = StreamChat.getInstance(config.stream.apiKey, config.stream.apiSecret);
  }
  return streamClient;
};

/**
 * The public shape of a user. `password_hash` is never included - the field
 * simply does not exist on this object.
 */
const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  fullName: user.full_name ?? user.fullName ?? user.username,
  phoneNumber: user.phone_number ?? user.phoneNumber ?? '',
  avatarURL: user.avatar_url ?? user.avatarURL ?? '',
  email: user.email ?? '',
});

/** Signs a cookie the server can revoke and returns it. */
const issueSession = (res, user) => {
  const token = signSessionToken(user.id, user.token_version);
  setSessionCookie(res, token);
  return token;
};

/**
 * Stream CDN links are signed and expire after 14 days. Stream re-signs the
 * URL when the user object is fetched, so refresh it before handing the
 * profile to the browser and persist the fresh link for the next boot.
 * Non-Stream URLs (a direct image link) are left untouched.
 */
const refreshStreamAvatar = async (user) => {
  if (!user?.avatar_url || !/stream-io-cdn\.com/i.test(user.avatar_url)) return user;

  try {
    const result = await getStreamClient().queryUsers({ id: user.id }, {}, { limit: 1 });
    const freshImage = result?.users?.[0]?.image;
    if (freshImage && freshImage !== user.avatar_url) {
      await db.updateUser(user.id, { avatar_url: freshImage });
      user.avatar_url = freshImage;
    }
  } catch (streamErr) {
    // An avatar refresh must never block sign-in or profile loads.
    console.error('[STREAM] Failed to refresh avatar URL:', streamErr.message);
  }

  return user;
};

const upsertToStream = async ({ id, username, fullName, avatarURL }) => {
  const client = getStreamClient();

  const payload = {
    id,
    name: username,
    fullName,
    image: avatarURL || undefined,
  };

  await client.upsertUser(payload);
};

const signup = async (req, res) => {
  try {
    const parsed = validateSignupPayload(req.body);
    if (!parsed.ok) {
      return res.status(400).json({ message: parsed.message });
    }

    const { username, password, fullName, phoneNumber, email } = parsed.value;

    if (await db.usernameExists(username)) {
      return res.status(409).json({ message: 'That station handle is already taken. Please choose another.' });
    }

    if (email) {
      const existingEmail = await db.findUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ message: 'That email is already linked to another account.' });
      }
    }

    if (!config.hasStreamCredentials) {
      return res.status(503).json({ message: 'Chat service is not configured. Please try again later.' });
    }

    const userID = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(password, config.auth.bcryptRounds);

    try {
      await db.createUser({
        id: userID,
        username,
        fullName,
        phoneNumber,
        avatarURL: '',
        email,
        passwordHash: hashedPassword,
      });
    } catch (error) {
      // The pre-check above closes the common case; the unique index closes the
      // race between two simultaneous signups claiming the same address.
      if (db.isUniqueViolation(error)) {
        return res.status(409).json({ message: 'That station handle or email is already in use.' });
      }
      throw error;
    }

    try {
      await upsertToStream({ id: userID, username, fullName, avatarURL: '' });
    } catch (streamError) {
      // Stream is a separate system, so compensate instead of leaving a
      // database account whose username can never be used again.
      await db.deleteUser(userID).catch((cleanupError) => {
        console.error('Signup rollback error:', cleanupError.message);
      });
      console.error('Signup Stream upsert error:', streamError.message);
      return res.status(503).json({ message: 'Chat service is unavailable. Please try again shortly.' });
    }

    issueSession(res, { id: userID, token_version: 0 });

    return res.status(201).json({ user: publicUser({ id: userID, username, full_name: fullName, phone_number: phoneNumber, avatar_url: '', email }) });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'We could not create your account. Please try again.' });
  }
};

const login = async (req, res) => {
  try {
    const username = sanitizeText(req.body?.username, 64);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const user = await db.findUserByUsername(username);

    const hashToCompare = user?.password_hash || TIMING_EQUALIZER_HASH;
    const isMatch = await bcrypt.compare(password, hashToCompare);

    if (!user || !user.password_hash || !isMatch) {
      return res.status(401).json({ message: GENERIC_LOGIN_FAILURE });
    }

    issueSession(res, user);

    return res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'We could not sign you in right now. Please try again.' });
  }
};

/**
 * Exchanges the `httpOnly` session cookie for a fresh, short-lived chat token.
 * This is what lets the browser restore a session after a reload without the
 * long-lived credential ever being readable from JavaScript.
 */
const session = async (req, res) => {
  try {
    // This response contains a freshly minted Stream token, so it must never
    // be served from the browser cache or answered with a 304.
    res.set('Cache-Control', 'no-store');

    const token = readSessionCookie(req);
    if (!token) {
      return res.status(401).json({ message: 'No active session.' });
    }

    const sessionData = verifySessionToken(token);
    if (!sessionData) {
      clearSessionCookie(res);
      return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    }

    const user = await db.getUserById(sessionData.userId);
    if (!user) {
      clearSessionCookie(res);
      return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    }

    if ((Number(user.token_version) || 0) !== sessionData.tokenVersion) {
      clearSessionCookie(res);
      return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    }

    await refreshStreamAvatar(user);

    // Sliding expiry keeps active users signed in. Revocation does not depend
    // on this: a password change bumps `token_version`, and every older cookie
    // is rejected even if it was refreshed recently.
    issueSession(res, user);

    const freshToken = getStreamClient().createToken(user.id);

    return res.status(200).json({ user: publicUser(user), token: freshToken });
  } catch (error) {
    console.error('Session error:', error);
    clearSessionCookie(res);
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
};

const logout = async (req, res) => {
  clearSessionCookie(res);
  return res.status(200).json({ message: 'Signed out.' });
};

const uploadAvatar = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    // The multipart Content-Type is attacker-controlled, so trust the bytes
    // themselves before anything is stored or forwarded to Stream.
    if (!isSupportedImage(req.file.buffer)) {
      return res.status(400).json({ message: 'Only JPG, PNG, GIF or WebP images are allowed.' });
    }

    const result = await getStreamClient().uploadImage(
      req.file.buffer,
      req.file.originalname || 'avatar',
      req.file.mimetype,
      { id: userId },
    );

    if (!result?.file) {
      return res.status(502).json({ message: 'The image service did not return a URL.' });
    }

    // Persist the URL before returning it, so the stored profile and the CDN
    // never disagree if the browser closes mid-request.
    const updated = await db.updateUser(userId, { avatar_url: result.file });
    if (!updated) {
      return res.status(404).json({ message: 'User not found.' });
    }

    try {
      await getStreamClient().upsertUser({
        id: updated.id,
        role: 'user',
        name: updated.full_name || updated.username,
        image: result.file,
      });
    } catch (streamErr) {
      // The image is already reachable on the CDN; a failed profile mirror is
      // recoverable on the next session refresh, so do not fail the upload.
      console.error('[STREAM] Failed to upsert avatar:', streamErr.message);
    }

    return res.status(200).json({ avatarURL: result.file, user: publicUser(updated) });
  } catch (error) {
    console.error('UploadAvatar error:', error);
    return res.status(500).json({ message: 'We could not upload the avatar.' });
  }
};

const getMe = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }
    const user = await db.getUserById(userId) || await db.findUserById(userId);
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }
    await refreshStreamAvatar(user);
    res.set('Cache-Control', 'no-store');
    return res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({ message: 'We could not fetch your profile.' });
  }
};

const updateMe = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const { fullName, full_name, phoneNumber, phone_number, avatarURL, avatar_url, email, currentPassword } = req.body || {};
    const updates = {};

    // Avatars are uploads only. Reject the field instead of ignoring it, so a
    // stale client cannot quietly believe it changed something.
    if (avatarURL !== undefined || avatar_url !== undefined) {
      return res.status(400).json({ message: 'Avatars are uploaded from Settings, not set by URL.' });
    }

    const nextFullName = fullName !== undefined ? fullName : full_name;
    if (nextFullName !== undefined) {
      const sanitized = sanitizeText(nextFullName, 100);
      if (sanitized.length === 0 && nextFullName !== '') {
        return res.status(400).json({ message: 'Full name is too long.' });
      }
      updates.full_name = sanitized === '' ? null : sanitized;
    }

    const nextPhone = phoneNumber !== undefined ? phoneNumber : phone_number;
    if (nextPhone !== undefined) {
      const sanitized = sanitizeText(nextPhone, 20);
      // Allow empty to clear
      if (sanitized !== '' && !/^[0-9+\-\s()]{7,20}$/.test(sanitized)) {
        return res.status(400).json({ message: 'Enter a valid phone number.' });
      }
      updates.phone_number = sanitized === '' ? null : sanitized;
    }

    // Email is a recovery address, so changing it is treated like changing a
    // password: a stolen session must not be able to quietly redirect future
    // reset links to another inbox.
    if (email !== undefined) {
      const parsedEmail = validateEmail(email);
      if (!parsedEmail.ok) {
        return res.status(400).json({ message: parsedEmail.message });
      }

      const user = await db.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const currentEmail = String(user.email || '').toLowerCase();
      if (parsedEmail.value !== currentEmail) {
        if (!currentPassword) {
          return res.status(400).json({ message: 'Enter your current password to change your email.' });
        }

        const match = await bcrypt.compare(String(currentPassword), user.password_hash || '');
        if (!match) {
          return res.status(400).json({ message: 'Current password is incorrect.' });
        }

        if (parsedEmail.value) {
          const owner = await db.findUserByEmail(parsedEmail.value);
          if (owner && owner.id !== userId) {
            return res.status(409).json({ message: 'That email is already linked to another account.' });
          }
        }

        updates.email = parsedEmail.value || null;
      }
    }

    if (Object.keys(updates).length === 0) {
      const user = await db.getUserById(userId);
      if (!user) return res.status(404).json({ message: 'User not found.' });
      return res.status(200).json({ user: publicUser(user) });
    }

    let updated;
    try {
      updated = await db.updateUser(userId, updates);
    } catch (error) {
      if (db.isUniqueViolation(error)) {
        return res.status(409).json({ message: 'That email is already linked to another account.' });
      }
      throw error;
    }
    if (!updated) {
      return res.status(404).json({ message: 'User not found.' });
    }
    try {
      const serverClient = getStreamClient();
      await serverClient.upsertUser({
        id: updated.id,
        role: 'user',
        name: updated.full_name || updated.username,
        image: updated.avatar_url || undefined,
      });
    } catch (streamErr) {
      console.error('[STREAM] Failed to upsert user after profile update:', streamErr.message);
    }

    return res.status(200).json({ user: publicUser(updated) });
  } catch (error) {
    console.error('UpdateMe error:', error);
    return res.status(500).json({ message: 'We could not update your profile.' });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Enter your current and new password.' });
    }
    const passwordCheck = validatePassword(String(newPassword));
    if (!passwordCheck.ok) {
      return res.status(400).json({ message: passwordCheck.message });
    }

    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const match = await bcrypt.compare(String(currentPassword), user.password_hash || '');
    if (!match) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    const hash = await bcrypt.hash(String(newPassword), config.auth.bcryptRounds);
    const tokenVersion = await db.updatePassword(userId, hash);

    // A password change makes any outstanding recovery link obsolete.
    await db.deletePasswordResetsForUser(userId).catch((error) => {
      console.error('[password-reset] failed to clear tokens:', error.message);
    });

    // Keep this device signed in with the new version while every other
    // cookie (which still carries the old version) is now invalid.
    issueSession(res, { id: userId, token_version: tokenVersion });

    return res.status(200).json({ message: 'Password updated.' });
  } catch (error) {
    console.error('ChangePassword error:', error);
    return res.status(500).json({ message: 'We could not change your password.' });
  }
};

/**
 * Starts the recovery flow.
 *
 * Always answers with the same message and roughly the same timing: whether
 * the identifier exists, has an email, or was throttled must not be
 * observable. Delivery failures are logged, never returned.
 */
const forgotPassword = async (req, res) => {
  const startedAt = Date.now();

  try {
    const identifier = sanitizeText(req.body?.identifier, 254);
    if (!identifier) {
      return res.status(400).json({ message: 'Enter your station handle or email.' });
    }

    const user = await db.findUserByIdentifier(identifier);

    if (user?.email) {
      try {
        const { resetUrl } = await issueResetToken({ userId: user.id, ip: req.ip });
        const delivery = await sendPasswordReset({
          to: user.email,
          username: user.username,
          resetUrl,
        });
        if (!delivery.ok) {
          console.error('[mail] password reset delivery failed:', delivery.error);
        }
      } catch (error) {
        console.error('[password-reset] issue failed:', error.message);
      }
    }
  } catch (error) {
    console.error('ForgotPassword error:', error);
  }

  await waitForMinimumDuration(startedAt, FORGOT_MIN_RESPONSE_MS);
  return res.status(200).json({ message: FORGOT_MESSAGE });
};

/**
 * Completes the recovery flow. The token is only consumed here - never on a
 * GET - so mail scanners that prefetch links cannot burn a user's link.
 */
const resetPassword = async (req, res) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!token) {
      return res.status(400).json({ message: INVALID_RESET_MESSAGE });
    }

    const passwordCheck = validatePassword(req.body?.newPassword);
    if (!passwordCheck.ok) {
      return res.status(400).json({ message: passwordCheck.message });
    }

    const hash = await bcrypt.hash(String(req.body.newPassword), config.auth.bcryptRounds);
    const result = await db.consumePasswordReset({
      tokenHash: hashToken(token),
      passwordHash: hash,
    });

    if (!result) {
      return res.status(400).json({ message: INVALID_RESET_MESSAGE });
    }

    // The reset screen is unauthenticated; clearing the cookie also signs out
    // any session that happened to share this browser.
    clearSessionCookie(res);

    // A successful reset must also release a failed-login lockout, otherwise
    // the user could set a password and still be blocked from using it.
    if (result.username) {
      await resetAccountLimiter.clearFailures(result.username.toLowerCase()).catch((error) => {
        console.error('[rate-limit] failed to clear lockout after reset:', error.message);
      });
    }

    return res.status(200).json({ message: 'Password updated. Sign in with your new password.' });
  } catch (error) {
    console.error('ResetPassword error:', error);
    return res.status(500).json({ message: 'We could not reset your password. Please try again.' });
  }
};

module.exports = {
  signup,
  login,
  session,
  logout,
  publicUser,
  getMe,
  updateMe,
  changePassword,
  uploadAvatar,
  forgotPassword,
  resetPassword,
};
