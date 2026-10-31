'use strict';

/**
 * Shared harness for HTTP integration tests.
 *
 * Environment and the Stream SDK stub must be installed *before* `../index`
 * (and therefore `../config`) is required, so this module does that at load
 * time. Each test file runs in its own child process, which keeps the
 * configuration in this file from leaking into the unit tests.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { once } = require('node:events');
const Module = require('node:module');

const dbFile = path.join(
  os.tmpdir(),
  `railhub-test-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.db`,
);

process.env.NODE_ENV = 'test';
process.env.SQLITE_FILE = dbFile;
process.env.STREAM_API_KEY = process.env.STREAM_API_KEY || 'test-stream-key';
process.env.STREAM_API_SECRET = process.env.STREAM_API_SECRET || 'test-stream-secret';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret';
process.env.RATE_LIMIT_STORE = process.env.RATE_LIMIT_STORE || 'memory';
process.env.RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED || 'true';
// bcrypt cost is deliberately low here: these tests exercise routing and
// state, not hashing strength, and cost 12 would add ~300ms per login.
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || '4';

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'railhub_session';

const streamCalls = [];
const fakeStreamClient = {
  createToken: (userId) => `fake-stream-token-${userId}`,
  upsertUser: async (user) => {
    streamCalls.push({ method: 'upsertUser', user });
    return { users: { [user.id]: user } };
  },
  queryUsers: async () => ({ users: [{ id: 'unknown', image: null }] }),
  uploadImage: async (buffer, name, mimetype, options) => {
    streamCalls.push({
      method: 'uploadImage',
      name,
      mimetype,
      userId: options?.id,
      bytes: buffer?.length || 0,
    });
    return { file: 'https://example.com/uploaded-avatar.png' };
  },
};

// Replace `require('stream-chat')` with an in-process fake. Doing this through
// the module cache means the controllers and routes stay untouched.
const streamChatPath = require.resolve('stream-chat');
const streamChatModule = new Module(streamChatPath, module);
streamChatModule.filename = streamChatPath;
streamChatModule.loaded = true;
streamChatModule.exports = {
  StreamChat: {
    getInstance: () => fakeStreamClient,
  },
};
require.cache[streamChatPath] = streamChatModule;

const { app } = require('../index');
const db = require('../db');

const getSessionCookie = (response) => {
  const cookies = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [];
  const sessionCookie = cookies.find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`));
  return sessionCookie ? sessionCookie.split(';')[0] : null;
};

const startTestServer = async () => {
  await db.initDb();
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();

  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
  };
};

const stopTestServer = async (context) => {
  if (context?.server) {
    context.server.closeAllConnections?.();
    await new Promise((resolve) => context.server.close(resolve));
  }

  await db.closeDb();

  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(`${dbFile}${suffix}`, { force: true });
  }
};

/**
 * Minimal `fetch` wrapper with JSON helpers and a cookie jar of one.
 * `cookie` is the `name=value` pair captured from a previous response.
 */
const request = async (context, method, route, { body, cookie, form } = {}) => {
  const headers = {};
  let payload;

  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  if (cookie) headers.Cookie = cookie;

  const response = await fetch(`${context.baseUrl}${route}`, {
    method,
    headers,
    body: payload,
    redirect: 'manual',
  });

  const text = await response.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Keep the raw text for endpoints that do not return JSON.
  }

  return {
    status: response.status,
    headers: response.headers,
    data,
    cookie: getSessionCookie(response),
    setCookies: typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [],
  };
};

const resetStreamCalls = () => {
  streamCalls.length = 0;
};

module.exports = {
  COOKIE_NAME,
  dbFile,
  fakeStreamClient,
  getSessionCookie,
  request,
  resetStreamCalls,
  startTestServer,
  stopTestServer,
  streamCalls,
};
