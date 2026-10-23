const path = require('path');
const { config } = require('./config');

let dbClient = null;
let dbType = 'sqlite';
let initPromise = null;

/**
 * Guards against the classic double-initialisation race: `initDb()` is called
 * once at boot *and* lazily from every query helper, so a request arriving
 * before boot finished must not spin up a second connection pool.
 */
async function doInit() {
  if (config.databaseUrl) {
    dbType = 'postgres';
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.isProduction ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30_000,
    });

    pool.on('error', (err) => {
      console.error('[DB] Unexpected idle client error:', err.message);
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
    return pool;
  }

  dbType = 'sqlite';
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(config.paths.sqliteFile);

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
  console.log(`[DB] Using local SQLite database at ${config.paths.sqliteFile}`);
  return db;
}

async function initDb() {
  if (dbClient) return dbClient;
  if (!initPromise) {
    initPromise = doInit().catch((err) => {
      // Allow a later attempt to retry rather than caching the failure forever.
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

const ensureDb = async () => {
  if (!dbClient) await initDb();
  return dbClient;
};

async function findUserByUsername(username) {
  await ensureDb();

  const cleanUsername = (username || '').trim().toLowerCase();
  if (!cleanUsername) return null;

  if (dbType === 'postgres') {
    const res = await dbClient.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1',
      [cleanUsername],
    );
    return res.rows[0] || null;
  }

  const stmt = dbClient.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1');
  return stmt.get(cleanUsername) || null;
}

async function findUserById(id) {
  await ensureDb();
  if (!id) return null;

  if (dbType === 'postgres') {
    const res = await dbClient.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    return res.rows[0] || null;
  }

  const stmt = dbClient.prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
  return stmt.get(id) || null;
}

/**
 * Case-insensitive "does this handle exist" probe used to produce a precise
 * conflict message without ever loading the password hash.
 */
async function usernameExists(username) {
  const user = await findUserByUsername(username);
  return Boolean(user);
}

async function createUser({ id, username, fullName, phoneNumber, avatarURL, passwordHash }) {
  await ensureDb();

  if (dbType === 'postgres') {
    await dbClient.query(
      `INSERT INTO users (id, username, full_name, phone_number, avatar_url, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         username = EXCLUDED.username,
         full_name = EXCLUDED.full_name,
         phone_number = EXCLUDED.phone_number,
         avatar_url = EXCLUDED.avatar_url,
         password_hash = EXCLUDED.password_hash`,
      [id, username, fullName || '', phoneNumber || '', avatarURL || '', passwordHash],
    );
  } else {
    const stmt = dbClient.prepare(
      `INSERT INTO users (id, username, full_name, phone_number, avatar_url, password_hash)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         username = excluded.username,
         full_name = excluded.full_name,
         phone_number = excluded.phone_number,
         avatar_url = excluded.avatar_url,
         password_hash = excluded.password_hash`,
    );
    stmt.run(id, username, fullName || '', phoneNumber || '', avatarURL || '', passwordHash);
  }

  return {
    id,
    username,
    full_name: fullName,
    phone_number: phoneNumber,
    avatar_url: avatarURL,
    password_hash: passwordHash,
  };
}

async function countUsers() {
  await ensureDb();

  if (dbType === 'postgres') {
    const res = await dbClient.query('SELECT COUNT(*)::int AS count FROM users');
    return res.rows[0]?.count ?? 0;
  }

  const stmt = dbClient.prepare('SELECT COUNT(*) AS count FROM users');
  return stmt.get()?.count ?? 0;
}

async function closeDb() {
  if (!dbClient) return;
  try {
    if (typeof dbClient.end === 'function') await dbClient.end();
    else if (typeof dbClient.close === 'function') dbClient.close();
  } catch (err) {
    console.error('[DB] Error while closing database:', err.message);
  } finally {
    dbClient = null;
    initPromise = null;
  }
}

module.exports = {
  initDb,
  ensureDb,
  findUserByUsername,
  findUserById,
  usernameExists,
  createUser,
  countUsers,
  closeDb,
  get dbType() {
    return dbType;
  },
};
