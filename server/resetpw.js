const db = require('./db');
const bcrypt = require('bcrypt');
(async () => {
  try {
    await db.initDb();
    const username = process.argv[2];
    const newPass = process.argv[3] || 'password123';
    if (!username) {
      console.log('usage: node resetpw.js <username> [newPassword]');
      process.exit(1);
    }
    let user = typeof db.findUserByUsername === 'function' ? db.findUserByUsername(username) : null;
    if (!user && typeof db.getUserByUsername === 'function') {
      user = await db.getUserByUsername(username);
    }
    if (!user) {
      console.log('user not found');
      process.exit(1);
    }
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(newPass, salt);
    if (typeof db.updatePassword === 'function') {
      await db.updatePassword(user.id, hash);
    } else {
      // fallback
      if (db.dbType === 'postgres') {
        await db.query ? await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user.id]) : null;
      } else {
        const { DatabaseSync } = require('node:sqlite');
        const { config } = require('./config');
        const d = new DatabaseSync(config.paths.sqliteFile);
        d.prepare('UPDATE users SET password_hash = $1 WHERE id = $2').run(hash, user.id);
        d.close();
      }
    }
    console.log('ok', username, newPass);
    process.exit(0);
  } catch (e) {
    console.error('err', e.message);
    process.exit(1);
  }
})();