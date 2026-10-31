'use strict';

// Configured before the app loads so this file exercises the real lockout path
// with a short window. The per-IP limiter is raised out of the way.
process.env.RATE_LIMIT_ACCOUNT_MAX_FAILURES = '2';
process.env.RATE_LIMIT_AUTH_MAX = '1000';
process.env.RATE_LIMIT_AUTH_WINDOW_MS = '500';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { request, startTestServer, stopTestServer } = require('../support/harness');

const PASSWORD = 'CorrectPass123';

describe('failed-login lockout', () => {
  let ctx;

  before(async () => {
    ctx = await startTestServer();
  });

  after(async () => {
    await stopTestServer(ctx);
  });

  it('locks only after the configured number of failures and clears on success', async () => {
    const signup = await request(ctx, 'POST', '/auth/signup', {
      body: { username: 'lock_me', password: PASSWORD },
    });
    assert.equal(signup.status, 201);

    const wrongOnce = await request(ctx, 'POST', '/auth/login', {
      body: { username: 'lock_me', password: 'wrong-password-1' },
    });
    assert.equal(wrongOnce.status, 401);

    // A successful sign-in must reset the failure counter immediately.
    const success = await request(ctx, 'POST', '/auth/login', {
      body: { username: 'lock_me', password: PASSWORD },
    });
    assert.equal(success.status, 200);

    const wrongTwice = await request(ctx, 'POST', '/auth/login', {
      body: { username: 'lock_me', password: 'wrong-password-2' },
    });
    const wrongThrice = await request(ctx, 'POST', '/auth/login', {
      body: { username: 'lock_me', password: 'wrong-password-3' },
    });
    assert.equal(wrongTwice.status, 401);
    assert.equal(wrongThrice.status, 401);

    const locked = await request(ctx, 'POST', '/auth/login', {
      body: { username: 'lock_me', password: PASSWORD },
    });
    assert.equal(locked.status, 429);
    assert.match(locked.data.message, /Too many failed attempts/i);

    // The lock is per account, not global.
    await request(ctx, 'POST', '/auth/signup', {
      body: { username: 'other_account', password: PASSWORD },
    });
    const otherAccount = await request(ctx, 'POST', '/auth/login', {
      body: { username: 'other_account', password: 'wrong-password-4' },
    });
    assert.equal(otherAccount.status, 401);

    // The window is short in this test, so the account unlocks on its own.
    await new Promise((resolve) => setTimeout(resolve, 700));
    const unlocked = await request(ctx, 'POST', '/auth/login', {
      body: { username: 'lock_me', password: PASSWORD },
    });
    assert.equal(unlocked.status, 200);
  });
});
