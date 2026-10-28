const db = require('./db');
(async () => {
  try {
    await db.initDb();
    // get all users
    if (db.dbType === 'postgres') {
      console.log('pg');
      process.exit(0);
    }
    // sqlite - access via internal? easier to just query differently
    const Database = require('node:sqlite').Database;
    const path = require('path');
    const { config } = require('./config');
    const d = new Database(config.paths.sqliteFile);
    const rows = d.prepare('SELECT id, username, full_name, phone_number, avatar_url, created_at FROM users').all();
    console.log(JSON.stringify(rows));
    d.close();
    process.exit(0);
  } catch (e) {
    console.error('err', e.message);
    process.exit(1);
  }
})();