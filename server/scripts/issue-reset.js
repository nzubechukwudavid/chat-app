// Issue a one-time password reset link for an account.
//
// This is the manual fallback for users with no recovery email on file, or for
// when the mail provider is unavailable. The printed URL is a bearer
// credential: anyone who sees it can change that account's password until it
// expires. Send it through a private channel and do not paste it into tickets.
//
// Usage:
//   node scripts/issue-reset.js <username-or-email>

const { config } = require('../config');
const db = require('../db');
const { issueResetToken } = require('../services/passwordReset');

const identifier = process.argv[2];

async function main() {
  console.log('=== Rail Hub password reset link ===\n');

  if (!identifier) {
    console.log('Usage: node scripts/issue-reset.js <username-or-email>');
    process.exitCode = 1;
    return;
  }

  await db.initDb();

  const user = await db.getUserByIdentifier(identifier);
  if (!user) {
    console.log(`No account matches "${identifier}".`);
    process.exitCode = 1;
    return;
  }

  const { token, resetUrl, expiresAt } = await issueResetToken({
    userId: user.id,
    ip: 'admin-script',
  });

  console.log(`Account   : ${user.username} (${user.id})`);
  console.log(`Email     : ${user.email || '(none on file)'}`);
  console.log(`Expires   : ${expiresAt.toISOString()} (${Math.round(config.passwordReset.ttlMs / 60_000)} minutes)`);
  console.log(`Token     : ${token}`);
  console.log(`Reset URL : ${resetUrl}`);
  console.log('');
  console.log('Send this link privately. It works once, and only after the user');
  console.log('submits the reset form. Requesting another link invalidates this one.');
}

main()
  .catch((error) => {
    console.error('Failed to issue reset link:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.closeDb();
  });
