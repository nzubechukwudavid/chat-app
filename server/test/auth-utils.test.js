'use strict';

// Must be set before config.js is loaded.
process.env.SESSION_SECRET = 'test-session-secret-not-for-production';

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { signSessionToken, verifySessionToken } = require('../utils/token');
const { validatePassword, sanitizeText } = require('../middleware/validate');

test('session token round-trips user id and version', () => {
  const token = signSessionToken('user-123', 4);
  const session = verifySessionToken(token);

  assert.deepEqual(session, { userId: 'user-123', tokenVersion: 4 });
});

test('session token with a different secret is rejected', () => {
  const forged = jwt.sign({ sub: 'user-123', sv: 0 }, 'wrong-secret', {
    algorithm: 'HS256',
    expiresIn: 60,
  });

  assert.equal(verifySessionToken(forged), null);
});

test('tampered session token is rejected', () => {
  const token = signSessionToken('user-123', 0);
  const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;

  assert.equal(verifySessionToken(tampered), null);
});

test('empty or non-string session tokens are rejected', () => {
  assert.equal(verifySessionToken(''), null);
  assert.equal(verifySessionToken(null), null);
  assert.equal(verifySessionToken(42), null);
});

test('password policy matches signup rules', () => {
  assert.equal(validatePassword('short1').ok, false);
  assert.equal(validatePassword('abcdefgh').ok, false, 'needs a number');
  assert.equal(validatePassword('12345678').ok, false, 'needs a letter');
  assert.equal(validatePassword('password123').ok, false, 'common password');
  assert.equal(validatePassword('railway9').ok, true);
});

test('sanitizeText strips control characters and trims', () => {
  assert.equal(sanitizeText('  hello\u0000 world  ', 50), 'hello world');
  assert.equal(sanitizeText('abcdef', 3), 'abc');
  assert.equal(sanitizeText(null), '');
});
