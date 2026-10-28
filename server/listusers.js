const db = require('./db');
(async () => {
  try {
    await db.initDb();
    if (db.dbType === 'postgres') {
      const { Pool } = require('pg');
      const pool = new Pool({ connectionString: require('./config').config.databaseUrl });
      const res = await pool.query('SELECT id, username, full_name, phone_number, avatar_url, created_at FROM users');
      console.log(JSON.stringify(res.rows));
      await pool.end();
    } else {
      const client = require('better-sqlite3');
      const path = require('path');
      const dbPath = path.join(__dirname, 'users.db');
      const c = new client(dbPath);
      const rows = c.prepare('SELECT id, username, full_name, phone_number, avatar_url, created_at FROM users').all();
      console.log(JSON.stringify(rows));
      c.close();
    }
    process.exit(0);
  } catch (e) {
    console.error('err', e.message);
    process.exit(1);
  }
})();