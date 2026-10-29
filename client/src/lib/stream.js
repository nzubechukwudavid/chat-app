import { StreamChat } from 'stream-chat';

import { STREAM_API_KEY } from '../config';

/**
 * One client per page lifetime. `getInstance` is idempotent and keeps any
 * existing websocket alive across React re-renders (and Fast Refresh).
 */
export const chatClient = StreamChat.getInstance(STREAM_API_KEY, {
  // Recover quickly on flaky mobile networks without hammering the API.
  allowServerSideEncryption: false,
});

/**
 * True when this user is connected *and* the websocket is live.
 *
 * `client.userID` survives `disconnectUser()`, so checking it alone would let a
 * dead client render the workspace (and every query would fail with "Both
 * secret and user tokens are not set").
 */
export const isChatConnected = (userId) =>
  Boolean(userId) &&
  chatClient.userID === userId &&
  Boolean(chatClient.wsConnection?.isHealthy);

let connectPromise = null;
let connectingUserId = null;

/** Connects once per user, sharing the in-flight promise across mounts. */
export const connectChatUser = (user, token) => {
  if (isChatConnected(user.id)) return Promise.resolve(chatClient);

  if (connectPromise && connectingUserId === user.id) return connectPromise;

  connectingUserId = user.id;
  connectPromise = chatClient
    .connectUser(user, token)
    .finally(() => {
      connectPromise = null;
      connectingUserId = null;
    });

  return connectPromise;
};

/** Closes the socket and forgets the cached connection. */
export const disconnectChatUser = async () => {
  connectPromise = null;
  connectingUserId = null;

  try {
    await chatClient.disconnectUser();
  } catch {
    // A dead socket is not an error worth surfacing.
  }
};

/**
 * Stream wraps API failures in an `Error` whose message is a JSON string
 * (`{"code":43,"StatusCode":401,...}`), so a plain regex on the message is
 * unsafe: nearly every message contains the word "token".
 */
const parseStreamError = (error) => {
  const raw = String(error?.message || '');
  const start = raw.indexOf('{');
  if (start === -1) return null;
  try {
    return JSON.parse(raw.slice(start));
  } catch {
    return null;
  }
};

/** True when Stream rejected the credentials (expired or invalid token). */
export const isAuthTokenError = (error) => {
  const payload = parseStreamError(error);
  const status = payload?.StatusCode ?? payload?.status ?? error?.status ?? error?.response?.status;
  const code = payload?.code ?? error?.code;

  if (status === 401) return true;
  return code === 40 || code === 43;
};

/**
 * True when the rejection is our own misconfiguration (client and server using
 * different Stream apps) rather than an expired user session. Signing out
 * cannot fix this, so the UI must not bounce the user back to the login screen.
 */
export const isStreamConfigError = (error) =>
  isAuthTokenError(error) && /api[_ ]?key|signature is not valid/i.test(String(error?.message || ''));

/** Human-readable explanation for the Stream connection failure modes we hit. */
export const describeConnectionError = (error) => {
  const message = String(error?.message || '');

  if (isStreamConfigError(error)) {
    return 'The chat service rejected this app\'s credentials. This is a server configuration problem, not a problem with your account.';
  }
  if (isAuthTokenError(error)) return 'Your chat session expired. Please sign in again.';
  if (/network|fetch|websocket/i.test(message)) {
    return 'Cannot reach the chat service. Check your connection and try again.';
  }
  return 'Could not connect to the chat service. Please try again.';
};

export default chatClient;
