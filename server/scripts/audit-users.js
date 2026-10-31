// Read-only directory audit for Stream + database users.
//
// This script never deletes anything. Use it to produce a candidate list, then
// explicitly approve IDs for `cleanup-users.js`.
//
// Usage:
//   node scripts/audit-users.js

const { config } = require('../config');
const db = require('../db');
const { StreamChat } = require('stream-chat');

const client = StreamChat.getInstance(config.stream.apiKey, config.stream.apiSecret);

const PAGE_SIZE = 100;

const TEST_PATTERN = /(^|[._-])(test|testbot|demo|sample|temp|qa|check|apitest|uicheck|opcheck)([._\-\d]|$)/i;

const looksLikeTestAccount = (value) => TEST_PATTERN.test(String(value || ''));

const normalizeName = (value) => String(value || '').trim().toLowerCase();

async function fetchAllStreamUsers() {
  const users = [];
  let offset = 0;

  while (true) {
    const page = await client.queryUsers({}, { id: 1 }, { limit: PAGE_SIZE, offset });
    users.push(...page.users);
    if (page.users.length < PAGE_SIZE) break;
    offset += page.users.length;
  }

  return users;
}

async function auditUsers() {
  console.log('=== Rail Hub user directory audit (read-only) ===\n');

  if (!config.hasStreamCredentials) {
    throw new Error('STREAM_API_KEY and STREAM_API_SECRET are required to audit Stream users.');
  }

  await db.initDb();
  const dbUsers = await db.listUsers();
  const streamUsers = await fetchAllStreamUsers();

  const dbById = new Map(dbUsers.map((user) => [user.id, user]));
  const streamById = new Map(streamUsers.map((user) => [user.id, user]));

  const streamOnly = streamUsers.filter((user) => !dbById.has(user.id));
  const dbOnly = dbUsers.filter((user) => !streamById.has(user.id));

  const testCandidates = streamUsers.filter((user) =>
    looksLikeTestAccount(user.name) || looksLikeTestAccount(user.id),
  );

  const names = new Map();
  for (const user of streamUsers) {
    const key = normalizeName(user.name || user.id);
    if (!key) continue;
    if (!names.has(key)) names.set(key, []);
    names.get(key).push(user);
  }
  const duplicateNames = [...names.values()].filter((group) => group.length > 1);

  console.log(`Database backend : ${db.dbType}`);
  console.log(`Database users   : ${dbUsers.length}`);
  console.log(`Stream users     : ${streamUsers.length}`);
  console.log('');
  if (db.dbType === 'sqlite') {
    console.log('Note: this audit used the local SQLite file. Set DATABASE_URL to');
    console.log('audit the production Neon database instead.');
    console.log('');
  }

  const printGroup = (title, rows, describe) => {
    console.log(`${title} (${rows.length})`);
    if (rows.length === 0) {
      console.log('  none');
    } else {
      for (const row of rows) console.log(`  - ${describe(row)}`);
    }
    console.log('');
  };

  printGroup(
    '1. Stream-only users (no database row)',
    streamOnly,
    (user) => `id=${user.id}  name="${user.name || '(none)'}"  role=${user.role || 'user'}  image=${user.image ? 'yes' : 'no'}`,
  );

  printGroup(
    '2. Database-only users (no Stream row)',
    dbOnly,
    (user) => `id=${user.id}  username="${user.username}"  fullName="${user.full_name || ''}"`,
  );

  printGroup(
    '3. Test-pattern accounts',
    testCandidates,
    (user) => `id=${user.id}  name="${user.name || '(none)'}"  image=${user.image ? 'yes' : 'no'}`,
  );

  console.log(`4. Duplicate display names (${duplicateNames.length} group(s))`);
  if (duplicateNames.length === 0) {
    console.log('  none');
  } else {
    for (const group of duplicateNames) {
      console.log(`  - "${group[0].name || '(none)'}"`);
      for (const user of group) {
        console.log(`      id=${user.id}  image=${user.image ? 'yes' : 'no'}  createdAt=${user.created_at || 'unknown'}`);
      }
    }
  }
  console.log('');

  console.log('='.repeat(64));
  console.log('IMPORTANT');
  console.log('='.repeat(64));
  console.log('Stream-only users are NOT automatically safe to delete. A missing');
  console.log('database row can also mean a real account was lost when an ephemeral');
  console.log('database was redeployed. Review names and activity before approving.');
  console.log('');
  console.log('To delete approved users after review:');
  console.log('  node scripts/cleanup-users.js "id1,id2,id3"');
  console.log('The cleanup script asks you to type DELETE before doing anything.');
  console.log('');

  return {
    databaseUsers: dbUsers.length,
    streamUsers: streamUsers.length,
    streamOnly: streamOnly.map((user) => ({ id: user.id, name: user.name || null })),
    dbOnly: dbOnly.map((user) => ({ id: user.id, username: user.username })),
    testCandidates: testCandidates.map((user) => ({ id: user.id, name: user.name || null })),
    duplicateNames: duplicateNames.map((group) =>
      group.map((user) => ({ id: user.id, name: user.name || null })),
    ),
  };
}

module.exports = { auditUsers };

if (require.main === module) {
  auditUsers()
    .then(() => db.closeDb())
    .catch(async (error) => {
      console.error('Audit failed:', error.message);
      await db.closeDb().catch(() => {});
      process.exitCode = 1;
    });
}
