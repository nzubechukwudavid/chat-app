'use strict';

// This file makes more requests than the default per-IP auth bucket allows, so
// raise that bucket before the harness (and config) loads. Per-account forgot
// throttling is still exercised with its own, lower limit.
process.env.RATE_LIMIT_AUTH_MAX = '500';

const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const {
  request,
  startTestServer,
  stopTestServer,
  getMailOutbox,
  clearMailOutbox,
} = require('../support/harness');
const { resetAll } = require('../middleware/rateLimit');
const db = require('../db');

const USERNAME = 'reset_user';
const EMAIL = 'reset.user@example.com';
const PASSWORD = 'OriginalPass123';
const SECOND_PASSWORD = 'ReplacementPass456';
const THIRD_PASSWORD = 'ThirdPassword789';
const FOURTH_PASSWORD = 'FourthPassword012';

const OTHER_USERNAME = 'reset_other';
const OTHER_PASSWORD = 'SecondAccount123';
const OTHER_EMAIL = 'second.account@example.com';

const tokenFromUrl = (resetUrl) => new URL(resetUrl).searchParams.get('token');
const sha256 = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');

const activeResets = async (userId) => {
  const client = await db.ensureDb();
  return client
    .prepare('SELECT * FROM password_resets WHERE user_id = ? AND used_at IS NULL')
    .all(userId);
};

const allResets = async (userId) => {
  const client = await db.ensureDb();
  return client
    .prepare('SELECT * FROM password_resets WHERE user_id = ?')
    .all(userId);
};

describe('password reset flow', () => {
  let ctx;
  let user;
  let cookie;
  let password = PASSWORD;

  let otherUser;
  let otherCookie;

  before(async () => {
    ctx = await startTestServer();
    clearMailOutbox();

    const signup = await request(ctx, 'POST', '/auth/signup', {
      body: {
        username: USERNAME,
        password: PASSWORD,
        fullName: 'Reset Test',
        email: 'Reset.User@Example.com',
      },
    });
    assert.equal(signup.status, 201);
    user = signup.data.user;
    cookie = signup.cookie;

    const other = await request(ctx, 'POST', '/auth/signup', {
      body: { username: OTHER_USERNAME, password: OTHER_PASSWORD },
    });
    assert.equal(other.status, 201);
    otherUser = other.data.user;
    otherCookie = other.cookie;
  });

  after(async () => {
    await stopTestServer(ctx);
  });

  // Each test starts with an empty limiter store so a previous test's recovery
  // requests cannot push a later one over the per-account ceiling.
  beforeEach(async () => {
    await resetAll();
  });

  const signIn = async (username, secret) => {
    const response = await request(ctx, 'POST', '/auth/login', {
      body: { username, password: secret },
    });
    return response;
  };

  const requestReset = async (identifier) => {
    clearMailOutbox();
    const response = await request(ctx, 'POST', '/auth/password/forgot', {
      body: { identifier },
    });
    return { response, mail: getMailOutbox() };
  };

  it('stores an optional email in lower-case and never returns a hash', () => {
    assert.equal(user.email, EMAIL);
    assert.equal('password_hash' in user, false);
    assert.equal('passwordHash' in user, false);
    assert.equal(otherUser.email, '');
  });

  it('answers identically for an unknown identifier and sends nothing', async () => {
    const { response, mail } = await requestReset('nobody_here');

    assert.equal(response.status, 200);
    assert.match(response.data.message, /If an account matches/i);
    assert.equal(mail.length, 0);
  });

  it('answers identically for a known account with no email on file', async () => {
    const { response, mail } = await requestReset(OTHER_USERNAME);

    assert.equal(response.status, 200);
    assert.match(response.data.message, /If an account matches/i);
    assert.equal(mail.length, 0);
    assert.equal((await allResets(otherUser.id)).length, 0);
  });

  it('emails a link when the account has an address, storing only its hash', async () => {
    const { response, mail } = await requestReset(EMAIL);

    assert.equal(response.status, 200);
    assert.equal(mail.length, 1);
    assert.equal(mail[0].to, EMAIL);
    assert.match(mail[0].resetUrl, /\/reset-password\?token=/);

    const rawToken = tokenFromUrl(mail[0].resetUrl);
    assert.ok(rawToken && rawToken.length >= 40);

    const rows = await activeResets(user.id);
    assert.equal(rows.length, 1, 'one active token per account');
    assert.equal(rows[0].token_hash, sha256(rawToken));
    assert.notEqual(rows[0].token_hash, rawToken, 'the raw token must not be stored');

    // The stored value must not appear anywhere in the row.
    assert.equal(JSON.stringify(rows[0]).includes(rawToken), false);

    const expiresIn = new Date(rows[0].expires_at).getTime() - Date.now();
    assert.ok(expiresIn > 25 * 60 * 1000 && expiresIn <= 30 * 60 * 1000 + 5000);
  });

  it('rejects a weak new password without consuming the token', async () => {
    const { mail } = await requestReset(USERNAME);
    const token = tokenFromUrl(mail[0].resetUrl);

    const response = await request(ctx, 'POST', '/auth/password/reset', {
      body: { token, newPassword: 'short' },
    });

    assert.equal(response.status, 400);
    assert.match(response.data.message, /at least 8/i);
    assert.equal((await activeResets(user.id)).length, 1, 'token stays usable');
  });

  it('resets the password, revokes old sessions, and burns the token', async () => {
    const { mail } = await requestReset(USERNAME);
    const token = tokenFromUrl(mail[0].resetUrl);
    const oldCookie = cookie;

    const response = await request(ctx, 'POST', '/auth/password/reset', {
      body: { token, newPassword: SECOND_PASSWORD },
    });

    assert.equal(response.status, 200);
    assert.match(response.data.message, /sign in with your new password/i);
    password = SECOND_PASSWORD;

    const oldSession = await request(ctx, 'GET', '/auth/me', { cookie: oldCookie });
    assert.equal(oldSession.status, 401, 'every older cookie must be revoked');

    const oldPassword = await signIn(USERNAME, PASSWORD);
    assert.equal(oldPassword.status, 401);

    const newPassword = await signIn(USERNAME, SECOND_PASSWORD);
    assert.equal(newPassword.status, 200);
    cookie = newPassword.cookie;

    const reuse = await request(ctx, 'POST', '/auth/password/reset', {
      body: { token, newPassword: THIRD_PASSWORD },
    });
    assert.equal(reuse.status, 400);
    assert.match(reuse.data.message, /invalid or has expired/i);

    // A used token is still on file as used, but no longer active.
    assert.equal((await activeResets(user.id)).length, 0);
  });

  it('invalidates an older link when a new one is requested', async () => {
    const first = await requestReset(USERNAME);
    const firstToken = tokenFromUrl(first.mail[0].resetUrl);

    const second = await requestReset(USERNAME);
    const secondToken = tokenFromUrl(second.mail[0].resetUrl);
    assert.notEqual(firstToken, secondToken);
    assert.equal((await activeResets(user.id)).length, 1, 'older link is retired');

    const stale = await request(ctx, 'POST', '/auth/password/reset', {
      body: { token: firstToken, newPassword: THIRD_PASSWORD },
    });
    assert.equal(stale.status, 400);

    const fresh = await request(ctx, 'POST', '/auth/password/reset', {
      body: { token: secondToken, newPassword: THIRD_PASSWORD },
    });
    assert.equal(fresh.status, 200);
    password = THIRD_PASSWORD;

    const signedIn = await signIn(USERNAME, THIRD_PASSWORD);
    assert.equal(signedIn.status, 200);
    cookie = signedIn.cookie;
  });

  it('rejects an expired token', async () => {
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const client = await db.ensureDb();
    client
      .prepare(
        `INSERT INTO password_resets (id, user_id, token_hash, expires_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(
        crypto.randomUUID(),
        user.id,
        sha256(rawToken),
        new Date(Date.now() - 60_000).toISOString(),
      );

    const response = await request(ctx, 'POST', '/auth/password/reset', {
      body: { token: rawToken, newPassword: 'ExpiredToken123' },
    });

    assert.equal(response.status, 400);
    assert.match(response.data.message, /invalid or has expired/i);

    // The expired link must not have changed anything.
    const check = await signIn(USERNAME, password);
    assert.equal(check.status, 200);
    cookie = check.cookie;
  });

  it('rejects an unknown token', async () => {
    const response = await request(ctx, 'POST', '/auth/password/reset', {
      body: { token: crypto.randomBytes(32).toString('base64url'), newPassword: 'UnknownToken123' },
    });

    assert.equal(response.status, 400);
    assert.match(response.data.message, /invalid or has expired/i);
  });

  it('throttles repeated recovery requests for the same identifier', async () => {
    const statuses = [];
    for (let index = 0; index < 4; index += 1) {
      const { response } = await requestReset('throttle_probe');
      statuses.push(response.status);
    }

    assert.deepEqual(statuses.slice(0, 3), [200, 200, 200]);
    assert.equal(statuses[3], 429);
  });

  it('requires the current password to set or change an email', async () => {
    const missing = await request(ctx, 'PATCH', '/auth/me', {
      cookie: otherCookie,
      body: { email: OTHER_EMAIL },
    });
    assert.equal(missing.status, 400);
    assert.match(missing.data.message, /current password/i);

    const wrong = await request(ctx, 'PATCH', '/auth/me', {
      cookie: otherCookie,
      body: { email: OTHER_EMAIL, currentPassword: 'not-the-password' },
    });
    assert.equal(wrong.status, 400);
    assert.match(wrong.data.message, /current password is incorrect/i);

    const invalid = await request(ctx, 'PATCH', '/auth/me', {
      cookie: otherCookie,
      body: { email: 'not-an-email', currentPassword: OTHER_PASSWORD },
    });
    assert.equal(invalid.status, 400);
    assert.match(invalid.data.message, /valid email/i);

    const updated = await request(ctx, 'PATCH', '/auth/me', {
      cookie: otherCookie,
      body: { email: 'Second.Account@Example.com', currentPassword: OTHER_PASSWORD },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.user.email, OTHER_EMAIL, 'email is normalised');

    // Re-submitting the same address does not need the password again.
    const same = await request(ctx, 'PATCH', '/auth/me', {
      cookie: otherCookie,
      body: { email: OTHER_EMAIL },
    });
    assert.equal(same.status, 200);
  });

  it('rejects an email already linked to another account, case-insensitively', async () => {
    const response = await request(ctx, 'PATCH', '/auth/me', {
      cookie: otherCookie,
      body: { email: EMAIL.toUpperCase(), currentPassword: OTHER_PASSWORD },
    });

    assert.equal(response.status, 409);
    assert.match(response.data.message, /already linked/i);
  });

  it('clears a failed-login lockout after a successful reset', async () => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const failure = await signIn(USERNAME, 'definitely-wrong-1');
      assert.equal(failure.status, 401);
    }

    const locked = await signIn(USERNAME, password);
    assert.equal(locked.status, 429, 'the account should be temporarily locked');

    const { mail } = await requestReset(USERNAME);
    const token = tokenFromUrl(mail[0].resetUrl);

    const reset = await request(ctx, 'POST', '/auth/password/reset', {
      body: { token, newPassword: FOURTH_PASSWORD },
    });
    assert.equal(reset.status, 200);
    password = FOURTH_PASSWORD;

    const unlocked = await signIn(USERNAME, password);
    assert.equal(unlocked.status, 200, 'a reset must release the lockout');
    cookie = unlocked.cookie;
  });

  it('signs in without revealing another user’s email', async () => {
    const signedIn = await signIn(USERNAME, password);
    assert.equal(signedIn.status, 200);
    assert.equal(signedIn.data.user.email, EMAIL);

    const other = await signIn(OTHER_USERNAME, OTHER_PASSWORD);
    assert.equal(other.status, 200);
    assert.equal(other.data.user.email, OTHER_EMAIL);
  });
});
