// Hard-delete explicitly approved users from Stream and the database.
//
// This is destructive. Run `audit-users.js` first, review the IDs, back up
// anything important, then pass only the approved IDs on the command line.
//
// Usage:
//   node scripts/cleanup-users.js "id1,id2,id3"

const readline = require('readline');
const { config } = require('../config');
const db = require('../db');
const { StreamChat } = require('stream-chat');

const client = StreamChat.getInstance(config.stream.apiKey, config.stream.apiSecret);

async function confirmDeletion(ids) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => {
    rl.question(`Type DELETE to permanently remove ${ids.length} user(s): `, (value) => {
      rl.close();
      resolve(value.trim());
    });
  });
  return answer === 'DELETE';
}

async function cleanupUsers(approvedUserIds) {
  console.log('=== Rail Hub user cleanup (destructive) ===\n');

  const ids = [...new Set(approvedUserIds.map((id) => String(id).trim()).filter(Boolean))];
  if (ids.length === 0) {
    console.log('No user IDs provided.');
    console.log('Usage: node scripts/cleanup-users.js "id1,id2,id3"');
    return;
  }

  if (!config.hasStreamCredentials) {
    throw new Error('STREAM_API_KEY and STREAM_API_SECRET are required to delete Stream users.');
  }

  await db.initDb();

  console.log('Approved IDs:');
  for (const id of ids) {
    const [streamUser, dbUser] = await Promise.all([
      client.queryUsers({ id }, {}, { limit: 1 }).then((result) => result.users[0] || null).catch(() => null),
      db.findUserById(id),
    ]);
    console.log(
      `  - ${id}  stream=${streamUser ? `"${streamUser.name || ''}"` : 'missing'}  db=${dbUser ? `"${dbUser.username}"` : 'missing'}`,
    );
  }
  console.log('');

  if (!(await confirmDeletion(ids))) {
    console.log('Cleanup cancelled. Nothing was deleted.');
    return;
  }

  let successes = 0;
  let failures = 0;

  for (const id of ids) {
    console.log(`Deleting ${id}...`);

    try {
      // Stream first: if it is already gone, `deleteUser` is still safe to call.
      await client.deleteUser(id, { hard_delete: true, mark_messages_deleted: true });
      const removedFromDb = await db.deleteUser(id);
      console.log(`  done (database row ${removedFromDb ? 'deleted' : 'was already missing'})`);
      successes += 1;
    } catch (error) {
      console.error(`  failed: ${error.message}`);
      failures += 1;
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(`Deleted: ${successes}`);
  console.log(`Failed : ${failures}`);
  console.log('='.repeat(60));

  if (failures > 0) process.exitCode = 1;
}

module.exports = { cleanupUsers };

if (require.main === module) {
  const ids = process.argv[2] ? process.argv[2].split(',') : [];
  cleanupUsers(ids)
    .then(() => db.closeDb())
    .catch(async (error) => {
      console.error('Cleanup failed:', error.message);
      await db.closeDb().catch(() => {});
      process.exitCode = 1;
    });
}
