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
        email TEXT,
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

    // Recovery email. Nullable because signup does not require it, and unique
    // case-insensitively so two accounts cannot claim the same inbox.
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT');
    await pool.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (LOWER(email)) WHERE email IS NOT NULL',
    );

    // One-time password reset tokens. Only the SHA-256 hash is stored; the raw
    // token exists in the emailed link and nowhere else.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id TEXT PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        requested_ip TEXT
      );
    `);
    await pool.query(
      'CREATE INDEX IF NOT EXISTS password_resets_user_idx ON password_resets (user_id)',
    );
    await pool.query(
      'CREATE INDEX IF NOT EXISTS password_resets_expires_idx ON password_resets (expires_at)',
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
      email TEXT,
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
  if (!columns.some((column) => column.name === 'email')) {
    db.exec('ALTER TABLE users ADD COLUMN email TEXT');
  }
  db.exec(
    'CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (LOWER(email)) WHERE email IS NOT NULL',
  );

  // Cascading deletes need the pragma enabled per connection in SQLite.
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      requested_ip TEXT
    );
  `);
  db.exec(
    'CREATE INDEX IF NOT EXISTS password_resets_user_idx ON password_resets (user_id)',
  );
  db.exec(
    'CREATE INDEX IF NOT EXISTS password_resets_expires_idx ON password_resets (expires_at)',
  );

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

async function findUserByEmail(email) {
  await ensureDb();

  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return null;

  if (dbType === 'postgres') {
    const res = await dbClient.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [cleanEmail],
    );
    return res.rows[0] || null;
  }

  const stmt = dbClient.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1');
  return stmt.get(cleanEmail) || null;
}

/**
 * Login-adjacent lookups accept either a station handle or an email, so the
 * recovery form can stay simple. Returns null for anything unknown.
 */
async function findUserByIdentifier(identifier) {
  const value = (identifier || '').trim();
  if (!value) return null;
  if (value.includes('@')) {
    return findUserByEmail(value);
  }
  return findUserByUsername(value);
}

async function createUser({ id, username, fullName, phoneNumber, avatarURL, email, passwordHash }) {
  await ensureDb();

  if (dbType === 'postgres') {
    await dbClient.query(
      `INSERT INTO users (id, username, full_name, phone_number, avatar_url, email, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         username = EXCLUDED.username,
         full_name = EXCLUDED.full_name,
         phone_number = EXCLUDED.phone_number,
         avatar_url = EXCLUDED.avatar_url,
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash`,
      [id, username, fullName || '', phoneNumber || '', avatarURL || '', email || null, passwordHash],
    );
  } else {
    const stmt = dbClient.prepare(
      `INSERT INTO users (id, username, full_name, phone_number, avatar_url, email, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         username = excluded.username,
         full_name = excluded.full_name,
         phone_number = excluded.phone_number,
         avatar_url = excluded.avatar_url,
         email = excluded.email,
         password_hash = excluded.password_hash`,
    );
    stmt.run(
      id,
      username,
      fullName || '',
      phoneNumber || '',
      avatarURL || '',
      email || null,
      passwordHash,
    );
  }

  return {
    id,
    username,
    full_name: fullName,
    phone_number: phoneNumber,
    avatar_url: avatarURL,
    email: email || null,
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
      email: row.email,
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
      email: row.email,
      password_hash: row.password_hash,
      token_version: Number(row.token_version) || 0,
      created_at: row.created_at,
    };
  }
  return null;
};

const getUserByEmail = async (email) => {
  await ensureDb();
  const row = await findUserByEmail(email);
  if (row) {
    return {
      id: row.id,
      username: row.username,
      full_name: row.full_name,
      phone_number: row.phone_number,
      avatar_url: row.avatar_url,
      email: row.email,
      password_hash: row.password_hash,
      token_version: Number(row.token_version) || 0,
      created_at: row.created_at,
    };
  }
  return null;
};

const getUserByIdentifier = async (identifier) => {
  await ensureDb();
  const row = await findUserByIdentifier(identifier);
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    full_name: row.full_name,
    phone_number: row.phone_number,
    avatar_url: row.avatar_url,
    email: row.email,
    password_hash: row.password_hash,
    token_version: Number(row.token_version) || 0,
    created_at: row.created_at,
  };
};

const updateUser = async (id, updates = {}) => {
  await ensureDb();
  const allowed = ['full_name', 'phone_number', 'avatar_url', 'email'];
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
    const sql = `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING id, username, full_name, phone_number, avatar_url, email, created_at`;
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
    email: row.email,
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

/**
 * Issues a fresh reset token, retiring any unused token the same user already
 * has. Keeping one active link per account means an old email cannot be used
 * after the user asks for a new one.
 */
const createPasswordReset = async ({ id, userId, tokenHash, expiresAt, requestedIp }) => {
  await ensureDb();
  const expires = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);

  if (dbType === 'postgres') {
    const client = await dbClient.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'DELETE FROM password_resets WHERE user_id = $1 AND used_at IS NULL',
        [userId],
      );
      await client.query(
        `INSERT INTO password_resets (id, user_id, token_hash, expires_at, requested_ip)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, userId, tokenHash, expires, requestedIp || null],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
    return;
  }

  const client = dbClient;
  client.exec('BEGIN IMMEDIATE');
  try {
    client
      .prepare('DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL')
      .run(userId);
    client
      .prepare(
        `INSERT INTO password_resets (id, user_id, token_hash, expires_at, requested_ip)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(id, userId, tokenHash, expires.toISOString(), requestedIp || null);
    client.exec('COMMIT');
  } catch (error) {
    try {
      client.exec('ROLLBACK');
    } catch {
      // The transaction may already be closed; the original error matters more.
    }
    throw error;
  }
};

/**
 * Atomically consumes a token and changes the password. Returns null for a
 * missing, expired or already-used token - callers must not distinguish
 * between those cases in the response.
 */
const consumePasswordReset = async ({ tokenHash, passwordHash }) => {
  await ensureDb();

  if (dbType === 'postgres') {
    const client = await dbClient.connect();
    try {
      await client.query('BEGIN');
      const found = await client.query(
        'SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token_hash = $1 FOR UPDATE',
        [tokenHash],
      );
      const row = found.rows[0];
      if (
        !row ||
        row.used_at ||
        new Date(row.expires_at).getTime() <= Date.now()
      ) {
        await client.query('ROLLBACK');
        return null;
      }

      const updated = await client.query(
        `UPDATE users
         SET password_hash = $1, token_version = token_version + 1
         WHERE id = $2
         RETURNING token_version, username`,
        [passwordHash, row.user_id],
      );
      if (!updated.rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }

      await client.query('UPDATE password_resets SET used_at = NOW() WHERE id = $1', [row.id]);
      await client.query(
        'DELETE FROM password_resets WHERE user_id = $1 AND id <> $2',
        [row.user_id, row.id],
      );
      await client.query('COMMIT');

      return {
        userId: row.user_id,
        username: updated.rows[0].username,
        tokenVersion: Number(updated.rows[0].token_version) || 0,
      };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  const client = dbClient;
  client.exec('BEGIN IMMEDIATE');
  try {
    const row = client
      .prepare('SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?')
      .get(tokenHash);
    if (
      !row ||
      row.used_at ||
      new Date(row.expires_at).getTime() <= Date.now()
    ) {
      client.exec('ROLLBACK');
      return null;
    }

    const update = client
      .prepare(
        'UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?',
      )
      .run(passwordHash, row.user_id);
    if (!update.changes) {
      client.exec('ROLLBACK');
      return null;
    }

    const user = client
      .prepare('SELECT username, token_version FROM users WHERE id = ?')
      .get(row.user_id);

    client
      .prepare("UPDATE password_resets SET used_at = ? WHERE id = ?")
      .run(new Date().toISOString(), row.id);
    client
      .prepare('DELETE FROM password_resets WHERE user_id = ? AND id <> ?')
      .run(row.user_id, row.id);
    client.exec('COMMIT');

    return {
      userId: row.user_id,
      username: user?.username || '',
      tokenVersion: Number(user?.token_version) || 0,
    };
  } catch (error) {
    try {
      client.exec('ROLLBACK');
    } catch {
      // Already closed.
    }
    throw error;
  }
};

/** Drops every outstanding link for a user, e.g. after a password change. */
const deletePasswordResetsForUser = async (userId) => {
  await ensureDb();
  if (dbType === 'postgres') {
    await dbClient.query('DELETE FROM password_resets WHERE user_id = $1', [userId]);
    return;
  }
  dbClient.prepare('DELETE FROM password_resets WHERE user_id = ?').run(userId);
};

/** Housekeeping: expired links can never be used, so stop storing them. */
const deleteExpiredPasswordResets = async () => {
  await ensureDb();
  if (dbType === 'postgres') {
    await dbClient.query('DELETE FROM password_resets WHERE expires_at <= NOW()');
    return;
  }
  dbClient
    .prepare('DELETE FROM password_resets WHERE expires_at <= ?')
    .run(new Date().toISOString());
};

/**
 * Detects a unique-index violation without leaking driver-specific details to
 * the caller. Postgres reports SQLSTATE 23505, SQLite reports it in the text.
 */
const isUniqueViolation = (error) => {
  if (!error) return false;
  if (error.code === '23505' || error.code === 'SQLITE_CONSTRAINT_UNIQUE') return true;
  return /UNIQUE constraint failed/i.test(String(error.message || ''));
};

module.exports = {
  initDb,
  ensureDb,
  findUserByUsername,
  findUserById,
  findUserByEmail,
  findUserByIdentifier,
  usernameExists,
  createUser,
  countUsers,
  listUsers,
  closeDb,
  getUserById,
  getUserByUsername,
  getUserByEmail,
  getUserByIdentifier,
  updateUser,
  updatePassword,
  deleteUser,
  createPasswordReset,
  consumePasswordReset,
  deletePasswordResetsForUser,
  deleteExpiredPasswordResets,
  isUniqueViolation,
  get dbType() {
    return dbType;
  },
};
