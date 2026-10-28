const { DatabaseSync } = require('node:sqlite');
const { config } = require('./config');
const bcrypt = require('bcrypt');
(async () => {
  try {
    const db = new DatabaseSync(config.paths.sqliteFile);
    const username = process.argv[2];
    const newPass = process.argv[3] || 'morah';
    const user = db.prepare("SELECT * FROM users WHERE LOWER(username)=LOWER(?)").get(username);
    if (!user) {
      console.log('not found');
      db.close();
      process.exit(1);
    }
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(newPass, salt);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
    console.log('ok');
    db.close();
    process.exit(0);
  } catch (e) {
    console.error('err', e.message);
    process.exit(1);
  }
})();