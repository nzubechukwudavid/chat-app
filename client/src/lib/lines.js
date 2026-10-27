/**
 * Presentation helpers for the "line" metaphor.
 *
 * A channel is a line, a message is a dispatch. These helpers derive the
 * timetable-ish metadata the board and the route map need, and keep the
 * derivation in one place so the sidebar and the board never disagree.
 */

/** Stable three-digit service number, derived from the channel id. */
export const serviceCode = (channel) => {
  const key = String(channel?.cid || channel?.id || 'rail');
  let hash = 0;

  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 1000;
  }

  return `SVC ${String(hash).padStart(3, '0')}`;
};

const isAudio = (attachment) =>
  attachment?.type === 'voice' ||
  String(attachment?.mime_type || '').startsWith('audio/') ||
  String(attachment?.asset_url || '').includes('.webm');

/** A one-line description of the latest dispatch, without lying about it. */
export const lastDispatch = (channel) => {
  const messages = channel?.state?.messages || [];
  const message = messages[messages.length - 1];

  if (!message) return 'No messages yet';

  const text = String(message.text || '').trim();

  if (text) return text.replace(/\s+/g, ' ');

  const attachments = message.attachments || [];

  if (attachments.some(isAudio)) return 'Voice message';
  if (attachments.length) return 'Attachment';

  return 'Message';
};

/** Members of a channel, excluding the signed-in user. */
export const otherMembers = (channel, userId) =>
  Object.values(channel?.state?.members || {})
    .map((member) => member.user)
    .filter((user) => user && user.id !== userId);

/** Watch label derived from the West Africa Time hour. 06:00-17:59 is day. */
export const watchLabel = (date = new Date()) => {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Lagos',
      hour: '2-digit',
      hour12: false,
    }).format(date),
  );

  return hour >= 6 && hour < 18 ? 'Day watch' : 'Night watch';
};

/** "Mon 26 Oct" in West Africa Time. */
export const boardDate = (date = new Date()) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(date);

/**
 * Flattens a Stream channel into the plain shape the board renders.
 *
 * Plain data is deliberate: board rows re-render on live events, and reading
 * from the channel object directly would make each row depend on SDK internals.
 */
export const describeLine = (channel, userId) => {
  const members = otherMembers(channel, userId);
  const last = channel?.state?.messages?.[channel.state.messages.length - 1] || null;

  return {
    id: channel?.id,
    cid: channel?.cid,
    type: channel?.type,
    name: channel?.data?.name || channel?.id || 'Untitled line',
    code: serviceCode(channel),
    lastText: lastDispatch(channel),
    lastAt: last?.created_at || channel?.state?.last_message_at || null,
    unread: channel?.countUnread?.() || 0,
    members,
    memberCount: Math.max(0, Object.keys(channel?.state?.members || {}).length - 1),
    online: members.some((user) => user.online),
    channel,
  };
};

/** Sorts the board by the freshest dispatch, then by unread pressure. */
export const byActivity = (a, b) => {
  const left = a.lastAt ? new Date(a.lastAt).getTime() : 0;
  const right = b.lastAt ? new Date(b.lastAt).getTime() : 0;
  if (right !== left) return right - left;
  return b.unread - a.unread;
};
