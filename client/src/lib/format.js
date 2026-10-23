/** Small presentation helpers shared by the chat UI. */

/** First letter of a name, falling back to a neutral glyph. */
export const initial = (name) => {
  const value = String(name || '').trim();
  return value ? value[0].toUpperCase() : '?';
};

/** "David Okafor" -> "DO" */
export const initials = (name) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
});

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
});

/** Compact clock for message rows: 14:32 */
export const formatTime = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return timeFormatter.format(date);
};

/**
 * Sidebar timestamp: time for today, weekday for this week, else a date.
 */
export const formatRelative = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return timeFormatter.format(date);

  const dayMs = 24 * 60 * 60 * 1000;
  const diff = now.getTime() - date.getTime();
  if (diff < 6 * dayMs && diff >= 0) {
    return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date);
  }

  return shortDateFormatter.format(date);
};

/** 0-4 password score, used by the signup strength meter. */
export const passwordScore = (value = '') => {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(score, 4);
};

export const passwordLabel = (score) =>
  ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score] || 'Weak';

/** Truncates long labels for compact layouts. */
export const truncate = (value, max = 42) => {
  const text = String(value || '');
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
};

/** "Operations Lagos" -> "operations-lagos" (safe for a Stream channel id). */
export const slugify = (value, max = 40) => {
  const text = String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');
  return text || 'channel';
};

/** Short collision-resistant suffix for generated resource ids. */
export const shortId = (length = 6) => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, length);
  }
  return Math.random().toString(36).slice(2, 2 + length);
};
