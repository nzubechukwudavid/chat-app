const { connect } = require('getstream');
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

let streamClient = null;
const getStreamClient = () => {
  if (!streamClient) {
    streamClient = StreamChat.getInstance(config.stream.apiKey, config.stream.apiSecret);
  }
  return streamClient;
};

const getServerClient = () => connect(config.stream.apiKey, config.stream.apiSecret, config.stream.appId);

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

    const token = getServerClient().createUserToken(userID);
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

    const token = getServerClient().createUserToken(user.id);
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

    const freshToken = getServerClient().createUserToken(user.id);
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

module.exports = { signup, login, session, logout, publicUser };
