'use strict';

process.env.RATE_LIMIT_ENABLED = 'true';
process.env.RATE_LIMIT_ACCOUNT_MAX_FAILURES = '2';
process.env.RATE_LIMIT_STORE = 'memory';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createRateLimiter,
  createAuthLimiter,
  clientKey,
  resetAll,
} = require('../middleware/rateLimit');

const makeReq = (ip = '203.0.113.10') => ({
  ip,
  socket: { remoteAddress: ip },
  headers: {},
});

const makeRes = () => ({
  statusCode: 200,
  headers: {},
  body: null,
  setHeader(key, value) {
    this.headers[key] = value;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

test('rate limiter allows requests up to the limit and then returns 429', async () => {
  await resetAll();
  const limiter = createRateLimiter({ windowMs: 60_000, max: 2, name: 'unit' });

  const first = makeRes();
  let nextCalls = 0;
  await limiter(makeReq(), first, () => { nextCalls += 1; });
  assert.equal(nextCalls, 1);
  assert.equal(first.headers['X-RateLimit-Remaining'], 1);

  const second = makeRes();
  await limiter(makeReq(), second, () => { nextCalls += 1; });
  assert.equal(nextCalls, 2);
  assert.equal(second.headers['X-RateLimit-Remaining'], 0);

  const third = makeRes();
  await limiter(makeReq(), third, () => { nextCalls += 1; });
  assert.equal(nextCalls, 2, 'third request must not reach the route');
  assert.equal(third.statusCode, 429);
  assert.equal(third.body.retryAfter > 0, true);
});

test('rate limit buckets are per client', async () => {
  await resetAll();
  const limiter = createRateLimiter({ windowMs: 60_000, max: 1, name: 'per-client' });

  await limiter(makeReq('198.51.100.1'), makeRes(), () => {});
  const otherClient = makeRes();
  let reached = false;
  await limiter(makeReq('198.51.100.2'), otherClient, () => { reached = true; });

  assert.equal(reached, true);
  assert.equal(otherClient.statusCode, 200);
});

test('clientKey prefers the resolved req.ip over a spoofable header', () => {
  const req = {
    ip: '203.0.113.55',
    headers: { 'x-forwarded-for': '1.2.3.4' },
    socket: { remoteAddress: '10.0.0.1' },
  };

  assert.equal(clientKey(req), '203.0.113.55');
});

test('failed-login limiter blocks after the configured threshold and clears', async () => {
  await resetAll();
  const limiter = createAuthLimiter();

  assert.equal(await limiter.isBlocked('alice'), false);
  await limiter.recordFailure('alice');
  assert.equal(await limiter.isBlocked('alice'), false);
  await limiter.recordFailure('alice');
  assert.equal(await limiter.isBlocked('alice'), true);

  await limiter.clearFailures('alice');
  assert.equal(await limiter.isBlocked('alice'), false);
});
