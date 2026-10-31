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
        token_version INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Existing deployments predate session revocation, so add the column in
    // place rather than requiring a manual migration.
    await pool.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0',
    );

    // Shared rate-limit counters. Keeping them in Neon means every Render
    // instance (and every restart) sees the same limits.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL,
        reset_at TIMESTAMPTZ NOT NULL
      );
    `);
    await pool.query(
      'CREATE INDEX IF NOT EXISTS rate_limits_reset_at_idx ON rate_limits (reset_at)',
    );

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
      token_version INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // SQLite has no `ADD COLUMN IF NOT EXISTS`, so probe the table first.
  const columns = db.prepare('PRAGMA table_info(users)').all();
  if (!columns.some((column) => column.name === 'token_version')) {
    db.exec('ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0');
  }

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

/**
 * Full directory snapshot for the cleanup audit. Returns only the fields the
 * audit needs; password hashes never leave the database.
 */
async function listUsers() {
  await ensureDb();

  if (dbType === 'postgres') {
    const res = await dbClient.query(
      'SELECT id, username, full_name, avatar_url, created_at FROM users ORDER BY created_at ASC',
    );
    return res.rows;
  }

  const stmt = dbClient.prepare(
    'SELECT id, username, full_name, avatar_url, created_at FROM users ORDER BY created_at ASC',
  );
  return stmt.all();
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

const getUserById = async (id) => {
  await ensureDb();
  const row = await findUserById(id);
  if (row) {
    return {
      id: row.id,
      username: row.username,
      full_name: row.full_name,
      phone_number: row.phone_number,
      avatar_url: row.avatar_url,
      password_hash: row.password_hash,
      token_version: Number(row.token_version) || 0,
      created_at: row.created_at,
    };
  }
  return null;
};

const getUserByUsername = async (username) => {
  await ensureDb();
  const row = await findUserByUsername(username);
  if (row) {
    return {
      id: row.id,
      username: row.username,
      full_name: row.full_name,
      phone_number: row.phone_number,
      avatar_url: row.avatar_url,
      password_hash: row.password_hash,
      token_version: Number(row.token_version) || 0,
      created_at: row.created_at,
    };
  }
  return null;
};

const updateUser = async (id, updates = {}) => {
  await ensureDb();
  const allowed = ['full_name', 'phone_number', 'avatar_url'];
  const keys = Object.keys(updates).filter((key) => allowed.includes(key));
  if (keys.length === 0) {
    return getUserById(id);
  }

  if (dbType === 'postgres') {
    const sets = [];
    const params = [];
    keys.forEach((key, idx) => {
      sets.push(`${key} = $${idx + 1}`);
      params.push(updates[key]);
    });
    params.push(id);
    const sql = `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING id, username, full_name, phone_number, avatar_url, created_at`;
    const res = await dbClient.query(sql, params);
    return res.rows[0] || await getUserById(id);
  }

  const client = dbClient;
  const sets = [];
  const params = [];
  keys.forEach((key, idx) => {
    sets.push(`${key} = $${idx + 1}`);
    params.push(updates[key]);
  });
  params.push(id);
  const sql = `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}`;
  const stmt = client.prepare(sql.replace(/\$(\d+)/g, '?'));
  stmt.run(...params);
  const row = await findUserById(id);
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    full_name: row.full_name,
    phone_number: row.phone_number,
    avatar_url: row.avatar_url,
    created_at: row.created_at,
  };
};

const updatePassword = async (id, passwordHash) => {
  await ensureDb();
  if (dbType === 'postgres') {
    const res = await dbClient.query(
      'UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE id = $2 RETURNING token_version',
      [passwordHash, id],
    );
    return Number(res.rows[0]?.token_version) || 0;
  }
  const update = dbClient.prepare(
    'UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?',
  );
  update.run(passwordHash, id);
  const row = dbClient.prepare('SELECT token_version FROM users WHERE id = ?').get(id);
  return Number(row?.token_version) || 0;
};

const deleteUser = async (id) => {
  await ensureDb();
  if (dbType === 'postgres') {
    const res = await dbClient.query('DELETE FROM users WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }
  const stmt = dbClient.prepare('DELETE FROM users WHERE id = ?');
  const info = stmt.run(id);
  return (info.changes || 0) > 0;
};

module.exports = {
  initDb,
  ensureDb,
  findUserByUsername,
  findUserById,
  usernameExists,
  createUser,
  countUsers,
  listUsers,
  closeDb,
  getUserById,
  getUserByUsername,
  updateUser,
  updatePassword,
  deleteUser,
  get dbType() {
    return dbType;
  },
};
