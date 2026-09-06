const path = require('path');
const fs = require('fs');

let dbClient = null;
let dbType = 'sqlite';

const isPostgres = Boolean(process.env.DATABASE_URL);

async function initDb() {
  if (isPostgres) {
    dbType = 'postgres';
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        full_name VARCHAR(255),
        phone_number VARCHAR(50),
        avatar_url TEXT,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    dbClient = pool;
    console.log('[DB] Connected to PostgreSQL via DATABASE_URL');
  } else {
    dbType = 'sqlite';
    const { DatabaseSync } = require('node:sqlite');
    const dbFilePath = path.join(__dirname, 'users.db');
    const db = new DatabaseSync(dbFilePath);

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        full_name TEXT,
        phone_number TEXT,
        avatar_url TEXT,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    dbClient = db;
    console.log(`[DB] Using local SQLite database at ${dbFilePath}`);
  }
}

async function findUserByUsername(username) {
  if (!dbClient) await initDb();

  const cleanUsername = (username || '').trim().toLowerCase();
  if (!cleanUsername) return null;

  if (dbType === 'postgres') {
    const res = await dbClient.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1',
      [cleanUsername]
    );
    return res.rows[0] || null;
  } else {
    const stmt = dbClient.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1');
    return stmt.get(cleanUsername) || null;
  }
}

async function findUserById(id) {
  if (!dbClient) await initDb();

  if (dbType === 'postgres') {
    const res = await dbClient.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    return res.rows[0] || null;
  } else {
    const stmt = dbClient.prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    return stmt.get(id) || null;
  }
}

async function createUser({ id, username, fullName, phoneNumber, avatarURL, passwordHash }) {
  if (!dbClient) await initDb();

  if (dbType === 'postgres') {
    await dbClient.query(
      `INSERT INTO users (id, username, full_name, phone_number, avatar_url, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, username, fullName || '', phoneNumber || '', avatarURL || '', passwordHash]
    );
  } else {
    const stmt = dbClient.prepare(
      `INSERT INTO users (id, username, full_name, phone_number, avatar_url, password_hash)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    stmt.run(id, username, fullName || '', phoneNumber || '', avatarURL || '', passwordHash);
  }

  return {
    id,
    username,
    full_name: fullName,
    phone_number: phoneNumber,
    avatar_url: avatarURL,
  };
}

module.exports = {
  initDb,
  findUserByUsername,
  findUserById,
  createUser,
};
