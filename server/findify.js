const db = require('./db');
(async () => {
  try {
    await db.initDb();
    let u = null;
    if (typeof db.findUserByUsername === 'function') {
      u = db.findUserByUsername('Ifybless');
    } else if (typeof db.getUserByUsername === 'function') {
      u = await db.getUserByUsername('Ifybless');
    }
    console.log(JSON.stringify(u));
    process.exit(0);
  } catch (e) {
    console.error('err', e.message);
    process.exit(1);
  }
})();