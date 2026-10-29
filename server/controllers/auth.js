const bcrypt = require('bcrypt');
const StreamChat = require('stream-chat').StreamChat;
const crypto = require('crypto');

const { config } = require('../config');
const db = require('../db');
const { validateSignupPayload, sanitizeText } = require('../middleware/validate');
const { setSessionCookie, clearSessionCookie, readSessionCookie } = require('../services/session');
const { verifyUserToken } = require('../utils/token');

/**
 * A valid bcrypt hash of a throwaway string. Comparing against it when the
 * requested account does not exist keeps the response time of "unknown user"
 * and "wrong password" indistinguishable, which closes a user-enumeration
 * timing oracle.
 */
const TIMING_EQUALIZER_HASH = '$2b$12$S/PwA.EDR5tjfl72sKcF1eBzZYPbmUOK8Y/GKtEIq4c4ph30TGk3u';

const GENERIC_LOGIN_FAILURE = 'Invalid username or password.';

/**
 * Single Stream server client for every privileged operation: issuing user
 * tokens, upserting profiles and deleting accounts. Using one SDK avoids the
 * v2/v3 API drift that previously made profile updates silently no-op.
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
});

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

    const { username, password, fullName, phoneNumber, avatarURL } = parsed.value;

    if (await db.usernameExists(username)) {
      return res.status(409).json({ message: 'That station handle is already taken. Please choose another.' });
    }

    if (!config.hasStreamCredentials) {
      return res.status(503).json({ message: 'Chat service is not configured. Please try again later.' });
    }

    const userID = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(password, config.auth.bcryptRounds);

    await db.createUser({
      id: userID,
      username,
      fullName,
      phoneNumber,
      avatarURL,
      passwordHash: hashedPassword,
    });

    await upsertToStream({ id: userID, username, fullName, avatarURL });

    const token = getStreamClient().createToken(userID);
    setSessionCookie(res, token);

    return res.status(201).json({ user: publicUser({ id: userID, username, full_name: fullName, phone_number: phoneNumber, avatar_url: avatarURL }) });
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

    const token = getStreamClient().createToken(user.id);
    setSessionCookie(res, token);

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
    const token = readSessionCookie(req);
    if (!token) {
      return res.status(401).json({ message: 'No active session.' });
    }

    let userId = verifyUserToken(token);

    if (!userId) {
      clearSessionCookie(res);
      return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    }

    const user = await db.findUserById(userId);
    if (!user) {
      clearSessionCookie(res);
      return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    }

    const freshToken = getStreamClient().createToken(user.id);
    setSessionCookie(res, freshToken);

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
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    const protocol = req.protocol;
    const host = req.get('host');
    const avatarUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    return res.status(200).json({ avatarURL: avatarUrl });
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
    return res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({ message: 'We could not fetch your profile.' });
  }
};

const isValidHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const updateMe = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const { fullName, full_name, phoneNumber, phone_number, avatarURL, avatar_url } = req.body || {};
    const updates = {};

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

    const nextAvatar = avatarURL !== undefined ? avatarURL : avatar_url;
    if (nextAvatar !== undefined) {
      const sanitized = sanitizeText(nextAvatar, 512);
      if (sanitized !== '' && !isValidHttpUrl(sanitized)) {
        return res.status(400).json({ message: 'Avatar URL must be a valid http(s) link.' });
      }
      updates.avatar_url = sanitized === '' ? null : sanitized;
    }

    if (Object.keys(updates).length === 0) {
      const user = await db.getUserById(userId);
      if (!user) return res.status(404).json({ message: 'User not found.' });
      return res.status(200).json({ user: publicUser(user) });
    }

    const updated = await db.updateUser(userId, updates);
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
    if (String(newPassword).length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters.' });
    }

    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const match = await bcrypt.compare(String(currentPassword), user.password_hash || '');
    if (!match) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(String(newPassword), salt);
    await db.updatePassword(userId, hash);

    return res.status(200).json({ message: 'Password updated.' });
  } catch (error) {
    console.error('ChangePassword error:', error);
    return res.status(500).json({ message: 'We could not change your password.' });
  }
};

const deleteMe = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const { confirm, password } = req.body || {};
    if (confirm !== true && confirm !== 'true') {
      return res.status(400).json({ message: 'Please confirm account deletion.' });
    }

    const user = await db.getUserById(userId);
    if (!user) {
      clearSessionCookie(res);
      return res.status(200).json({ message: 'Account deleted.' });
    }

    if (password) {
      const match = await bcrypt.compare(String(password), user.password_hash || '');
      if (!match) {
        return res.status(400).json({ message: 'Password is incorrect.' });
      }
    }

    await db.deleteUser(userId);
    try {
      const serverClient = getStreamClient();
      await serverClient.deleteUser(userId, { hard_delete: true });
    } catch (streamErr) {
      console.error('[STREAM] Failed to delete user:', streamErr.message);
    }

    clearSessionCookie(res);
    return res.status(200).json({ message: 'Account deleted.' });
  } catch (error) {
    console.error('DeleteMe error:', error);
    return res.status(500).json({ message: 'We could not delete your account.' });
  }
};

module.exports = { signup, login, session, logout, publicUser, getMe, updateMe, changePassword, deleteMe, uploadAvatar };
