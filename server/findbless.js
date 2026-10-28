const { DatabaseSync } = require('node:sqlite');
const { config } = require('./config');
const db = new DatabaseSync(config.paths.sqliteFile);
const rows = db.prepare("SELECT id, username, full_name, phone_number, avatar_url, created_at FROM users").all();
for (const r of rows) {
  const s = JSON.stringify(r).toLowerCase();
  if (s.includes('ify') || s.includes('bless') || s.includes('ifeoma') || s.includes('nwankwo')) {
    console.log(JSON.stringify(r));
  }
}
db.close();
process.exit(0);
