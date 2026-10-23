/**
 * Workspace user directory.
 *
 * Stream only supports `$autocomplete` on indexed fields (`id` and `name`), so a
 * server-side search cannot match the display name people actually recognise
 * ("Amina Bello"). Instead the directory is loaded once per session (paged, up
 * to a sane ceiling) and filtered in memory: search then matches handles, ids
 * *and* display names, and costs no network round trip per keystroke.
 */
const MAX_USERS = 500;
const PAGE_SIZE = 100;
const CACHE_TTL_MS = 5 * 60 * 1000;

let cache = { userId: null, at: 0, users: [] };

const isFresh = (userId) =>
  Boolean(userId) &&
  cache.userId === userId &&
  cache.users.length > 0 &&
  Date.now() - cache.at < CACHE_TTL_MS;

/** Loads (and memoises) every teammate the current user is allowed to see. */
export const loadDirectory = async (client, { force = false } = {}) => {
  if (!client?.userID) return [];

  if (!force && isFresh(client.userID)) return cache.users;

  const users = [];

  for (let offset = 0; offset < MAX_USERS; offset += PAGE_SIZE) {
    const response = await client.queryUsers(
      { id: { $ne: client.userID } },
      { name: 1 },
      { limit: PAGE_SIZE, offset },
    );

    const page = response?.users || [];
    users.push(...page);

    if (page.length < PAGE_SIZE) break;
  }

  cache = { userId: client.userID, at: Date.now(), users };
  return users;
};

/** Case-insensitive match across handle, display name and id. */
export const filterDirectory = (users = [], term = '') => {
  const needle = String(term).trim().toLowerCase();
  if (!needle) return users;

  return users.filter((user) =>
    [user.name, user.fullName, user.id]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle)),
  );
};

/** Call after a profile change so the next reader sees fresh names. */
export const invalidateDirectory = () => {
  cache = { userId: null, at: 0, users: [] };
};

export default loadDirectory;
