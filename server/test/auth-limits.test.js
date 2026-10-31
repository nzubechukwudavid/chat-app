'use strict';

// Two auth requests per window are enough to prove the per-IP limiter without
// slowing the suite down. The account lockout is effectively disabled.
process.env.RATE_LIMIT_AUTH_MAX = '2';
process.env.RATE_LIMIT_ACCOUNT_MAX_FAILURES = '100';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { request, startTestServer, stopTestServer } = require('../support/harness');

describe('per-IP auth rate limit', () => {
  let ctx;

  before(async () => {
    ctx = await startTestServer();
  });

  after(async () => {
    await stopTestServer(ctx);
  });

  it('returns 429 with retry headers once the auth window is exhausted', async () => {
    const body = { username: 'rate_probe', password: 'wrong-password-1' };

    const first = await request(ctx, 'POST', '/auth/login', { body });
    assert.equal(first.status, 401);
    assert.equal(first.headers.get('x-ratelimit-limit'), '2');
    assert.equal(first.headers.get('x-ratelimit-remaining'), '1');

    const second = await request(ctx, 'POST', '/auth/login', { body });
    assert.equal(second.status, 401);
    assert.equal(second.headers.get('x-ratelimit-remaining'), '0');

    const third = await request(ctx, 'POST', '/auth/login', { body });
    assert.equal(third.status, 429);
    assert.equal(third.headers.get('x-ratelimit-limit'), '2');
    assert.ok(Number(third.headers.get('retry-after')) >= 1);
    assert.match(third.data.message, /Too many requests/i);
    assert.ok(third.data.retryAfter >= 1);
  });
});
