'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const {
  request,
  startTestServer,
  stopTestServer,
  resetStreamCalls,
  streamCalls,
} = require('../support/harness');

const USERNAME = 'morah_test';
const PASSWORD = 'CorrectPass123';
const NEW_PASSWORD = 'NewCorrectPass456';

describe('auth API integration', () => {
  let ctx;
  let cookie;
  let userId;

  before(async () => {
    ctx = await startTestServer();
  });

  after(async () => {
    await stopTestServer(ctx);
  });

  it('reports service health', async () => {
    const response = await request(ctx, 'GET', '/health');

    assert.equal(response.status, 200);
    assert.equal(response.data.status, 'ok');
    assert.equal(response.data.database, 'sqlite');
    assert.equal(response.data.rateLimits, 'memory');
  });

  it('rejects invalid signup payloads before creating anything', async () => {
    const cases = [
      { username: 'ab', password: PASSWORD },
      { username: 'valid_handle', password: 'short1' },
      { username: 'valid_handle2', password: 'letters-only' },
      { username: 'valid_handle3', password: PASSWORD, avatarURL: 'http://example.com/a.png' },
      { username: 'valid_handle4', password: PASSWORD, phoneNumber: 'not-a-number' },
    ];

    for (const body of cases) {
      const response = await request(ctx, 'POST', '/auth/signup', { body });
      assert.equal(response.status, 400, `expected 400 for ${JSON.stringify(body)}`);
      assert.equal(response.cookie, null);
    }
  });

  it('creates an account, signs the user in, and mirrors the profile to Stream', async () => {
    resetStreamCalls();

    const response = await request(ctx, 'POST', '/auth/signup', {
      body: {
        username: USERNAME,
        password: PASSWORD,
        fullName: 'Morah Test',
        phoneNumber: '08012345678',
        avatarURL: 'https://example.com/morah.png',
      },
    });

    assert.equal(response.status, 201);
    assert.equal(response.data.user.username, USERNAME);
    assert.equal(response.data.user.fullName, 'Morah Test');
    assert.equal(response.data.user.phoneNumber, '08012345678');
    assert.equal(response.data.user.avatarURL, 'https://example.com/morah.png');
    assert.equal('password_hash' in response.data.user, false, 'hash must never be returned');
    assert.equal('passwordHash' in response.data.user, false, 'hash must never be returned');

    assert.ok(response.cookie, 'signup should issue a session cookie');
    assert.match(response.setCookies.join('\n'), /HttpOnly/i);

    userId = response.data.user.id;
    const upsert = streamCalls.find((call) => call.method === 'upsertUser');
    assert.ok(upsert, 'profile should be upserted to Stream');
    assert.equal(upsert.user.id, userId);
    assert.equal(upsert.user.name, USERNAME);
  });

  it('rejects a duplicate handle case-insensitively', async () => {
    const response = await request(ctx, 'POST', '/auth/signup', {
      body: { username: USERNAME.toUpperCase(), password: PASSWORD },
    });

    assert.equal(response.status, 409);
  });

  it('returns the same generic error for unknown users and wrong passwords', async () => {
    const wrongPassword = await request(ctx, 'POST', '/auth/login', {
      body: { username: USERNAME, password: 'wrong-password-123' },
    });
    const unknownUser = await request(ctx, 'POST', '/auth/login', {
      body: { username: 'nobody_here', password: 'wrong-password-123' },
    });

    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownUser.status, 401);
    assert.equal(wrongPassword.data.message, unknownUser.data.message);
    assert.equal(wrongPassword.cookie, null);
  });

  it('logs in case-insensitively and reports rate-limit headers', async () => {
    const response = await request(ctx, 'POST', '/auth/login', {
      body: { username: USERNAME.toUpperCase(), password: PASSWORD },
    });

    assert.equal(response.status, 200);
    assert.ok(response.cookie);
    assert.equal(response.headers.get('x-ratelimit-limit'), '30');
    assert.ok(Number(response.headers.get('x-ratelimit-remaining')) >= 0);
    cookie = response.cookie;
  });

  it('exchanges the session cookie for a fresh Stream token without caching', async () => {
    const response = await request(ctx, 'GET', '/auth/session', { cookie });

    assert.equal(response.status, 200);
    assert.equal(response.data.user.id, userId);
    assert.equal(response.data.token, `fake-stream-token-${userId}`);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('etag'), null);
    assert.ok(response.cookie, 'session refresh should extend the cookie');
  });

  it('rejects session and profile reads without a cookie', async () => {
    const session = await request(ctx, 'GET', '/auth/session');
    const me = await request(ctx, 'GET', '/auth/me');

    assert.equal(session.status, 401);
    assert.equal(me.status, 401);
  });

  it('reads the current profile', async () => {
    const response = await request(ctx, 'GET', '/auth/me', { cookie });

    assert.equal(response.status, 200);
    assert.equal(response.data.user.id, userId);
    assert.equal(response.data.user.username, USERNAME);
  });

  it('updates editable profile fields and validates each one', async () => {
    const updated = await request(ctx, 'PATCH', '/auth/me', {
      cookie,
      body: { fullName: 'Morah Updated', phoneNumber: '+2348012345678' },
    });

    assert.equal(updated.status, 200);
    assert.equal(updated.data.user.fullName, 'Morah Updated');
    assert.equal(updated.data.user.phoneNumber, '+2348012345678');

    const badPhone = await request(ctx, 'PATCH', '/auth/me', {
      cookie,
      body: { phoneNumber: 'abc' },
    });
    assert.equal(badPhone.status, 400);

    const badAvatar = await request(ctx, 'PATCH', '/auth/me', {
      cookie,
      body: { avatarURL: 'http://example.com/insecure.png' },
    });
    assert.equal(badAvatar.status, 400);

    const newAvatar = await request(ctx, 'PATCH', '/auth/me', {
      cookie,
      body: { avatarURL: 'https://example.com/new-avatar.png' },
    });
    assert.equal(newAvatar.status, 200);
    assert.equal(newAvatar.data.user.avatarURL, 'https://example.com/new-avatar.png');

    const reread = await request(ctx, 'GET', '/auth/me', { cookie });
    assert.equal(reread.data.user.fullName, 'Morah Updated');
    assert.equal(reread.data.user.avatarURL, 'https://example.com/new-avatar.png');
  });

  it('changes the password, revokes older cookies, and rotates the current one', async () => {
    const oldCookie = cookie;

    const wrongCurrent = await request(ctx, 'PUT', '/auth/password', {
      cookie: oldCookie,
      body: { currentPassword: 'not-the-password', newPassword: NEW_PASSWORD },
    });
    assert.equal(wrongCurrent.status, 400);

    const weakNew = await request(ctx, 'PUT', '/auth/password', {
      cookie: oldCookie,
      body: { currentPassword: PASSWORD, newPassword: 'short' },
    });
    assert.equal(weakNew.status, 400);

    const changed = await request(ctx, 'PUT', '/auth/password', {
      cookie: oldCookie,
      body: { currentPassword: PASSWORD, newPassword: NEW_PASSWORD },
    });
    assert.equal(changed.status, 200);
    assert.ok(changed.cookie, 'password change should issue a new cookie');
    assert.notEqual(changed.cookie, oldCookie);

    const staleSession = await request(ctx, 'GET', '/auth/me', { cookie: oldCookie });
    assert.equal(staleSession.status, 401, 'old cookies must be revoked');

    const freshSession = await request(ctx, 'GET', '/auth/me', { cookie: changed.cookie });
    assert.equal(freshSession.status, 200);

    const oldPassword = await request(ctx, 'POST', '/auth/login', {
      body: { username: USERNAME, password: PASSWORD },
    });
    assert.equal(oldPassword.status, 401);

    const newPassword = await request(ctx, 'POST', '/auth/login', {
      body: { username: USERNAME, password: NEW_PASSWORD },
    });
    assert.equal(newPassword.status, 200);

    cookie = newPassword.cookie;
  });

  it('protects mutation routes without a session', async () => {
    const patch = await request(ctx, 'PATCH', '/auth/me', { body: { fullName: 'Nope' } });
    const password = await request(ctx, 'PUT', '/auth/password', {
      body: { currentPassword: 'a', newPassword: 'b' },
    });
    const upload = await request(ctx, 'POST', '/auth/upload/avatar', { body: {} });

    assert.equal(patch.status, 401);
    assert.equal(password.status, 401);
    assert.equal(upload.status, 401);
  });

  it('rejects non-image avatar uploads', async () => {
    const form = new FormData();
    form.append('avatar', new Blob(['plain text'], { type: 'text/plain' }), 'notes.txt');

    const response = await request(ctx, 'POST', '/auth/upload/avatar', { cookie, form });

    assert.equal(response.status, 400);
    assert.match(response.data.message, /JPG|PNG|image/i);
  });

  it('uploads an image to Stream and returns its CDN URL', async () => {
    resetStreamCalls();

    const form = new FormData();
    form.append(
      'avatar',
      new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' }),
      'avatar.png',
    );

    const response = await request(ctx, 'POST', '/auth/upload/avatar', { cookie, form });

    assert.equal(response.status, 200);
    assert.equal(response.data.avatarURL, 'https://example.com/uploaded-avatar.png');

    const upload = streamCalls.find((call) => call.method === 'uploadImage');
    assert.ok(upload);
    assert.equal(upload.userId, userId);
    assert.equal(upload.mimetype, 'image/png');
  });

  it('clears the session cookie on logout', async () => {
    const response = await request(ctx, 'POST', '/auth/logout', { cookie });

    assert.equal(response.status, 200);
    assert.ok(response.setCookies.length > 0);
    assert.match(response.setCookies[0], /Expires=Thu, 01 Jan 1970|Max-Age=0/i);
  });
});
