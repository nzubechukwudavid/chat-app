const { connect } = require('getstream');
const bcrypt = require('bcrypt');
const StreamChat = require('stream-chat').StreamChat;
const crypto = require('crypto');
const db = require('../db');

require('dotenv').config();

const api_key = process.env.STREAM_API_KEY;
const api_secret = process.env.STREAM_API_SECRET;
const app_id = process.env.STREAM_APP_ID;

const signup = async (req, res) => {
  try {
    const { fullName, username, password, phoneNumber, avatarURL } = req.body;

    if (!username || !username.trim() || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const cleanUsername = username.trim();

    // Check if user already exists in persistence layer
    const existingUser = await db.findUserByUsername(cleanUsername);
    if (existingUser) {
      return res.status(409).json({ message: 'Username is already taken. Please choose another.' });
    }

    const userID = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save to persistence layer
    await db.createUser({
      id: userID,
      username: cleanUsername,
      fullName: (fullName || '').trim() || cleanUsername,
      phoneNumber: (phoneNumber || '').trim(),
      avatarURL: (avatarURL || '').trim(),
      passwordHash: hashedPassword,
    });

    // Create user in Stream Chat WITHOUT exposing the password hash in metadata
    if (api_key && api_secret) {
      const client = StreamChat.getInstance(api_key, api_secret);
      await client.upsertUser({
        id: userID,
        name: cleanUsername,
        fullName: (fullName || '').trim() || cleanUsername,
        phoneNumber: (phoneNumber || '').trim(),
        image: (avatarURL || '').trim() || undefined,
      });

      const serverClient = connect(api_key, api_secret, app_id);
      const token = serverClient.createUserToken(userID);

      return res.status(201).json({
        token,
        userID,
        username: cleanUsername,
        fullName: (fullName || '').trim() || cleanUsername,
        phoneNumber: (phoneNumber || '').trim(),
        avatarURL: (avatarURL || '').trim(),
      });
    }

    return res.status(500).json({ message: 'Stream Chat service is not properly configured.' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: error.message || 'An error occurred during signup.' });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const cleanUsername = username.trim();

    // Look up user in persistence layer
    let user = await db.findUserByUsername(cleanUsername);

    // Backwards-compatibility: if user not in local DB, check legacy Stream Chat metadata
    if (!user && api_key && api_secret) {
      const client = StreamChat.getInstance(api_key, api_secret);
      const { users } = await client.queryUsers({ name: cleanUsername });

      if (users && users.length > 0 && users[0].hashedPassword) {
        // Automatically migrate legacy user to the database
        user = await db.createUser({
          id: users[0].id,
          username: users[0].name || cleanUsername,
          fullName: users[0].fullName || users[0].name || cleanUsername,
          phoneNumber: users[0].phoneNumber || '',
          avatarURL: users[0].image || '',
          passwordHash: users[0].hashedPassword,
        });

        // Clean up legacy hashedPassword from Stream Chat metadata
        try {
          await client.partialUpdateUser({
            id: users[0].id,
            unset: ['hashedPassword'],
          });
        } catch (cleanupErr) {
          console.warn('Could not unset legacy hashedPassword in Stream Chat:', cleanupErr.message);
        }
      }
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found. Please sign up.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password. Please check your credentials.' });
    }

    const serverClient = connect(api_key, api_secret, app_id);
    const token = serverClient.createUserToken(user.id);

    return res.status(200).json({
      token,
      userID: user.id,
      username: user.username,
      fullName: user.full_name,
      phoneNumber: user.phone_number,
      avatarURL: user.avatar_url,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message || 'An error occurred during login.' });
  }
};

module.exports = { signup, login };
