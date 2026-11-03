const { config } = require('../config');

const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{2,31}$/;
const FULL_NAME_PATTERN = /^[\p{L}][\p{L}\p{M}\p{N}\s'.-]{0,99}$/u;
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const TRIMMED_COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  'qwerty123',
  'letmein123',
  'iloveyou1',
  'admin1234',
  'welcome123',
  'railhub123',
  'station123',
]);

/**
 * Removes control characters and collapses runaway whitespace. Applied to every
 * free-text field before it is persisted or forwarded to Stream.
 */
const sanitizeText = (value, maxLength = 255) => {
  if (typeof value !== 'string') return '';
  // Guard against callers passing an options object: `slice(0, {} )` yields
  // `slice(0, NaN)` and silently truncates the value to an empty string.
  const limit = Number.isFinite(maxLength) ? Math.max(0, maxLength) : 255;
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, limit);
};

const validateUsername = (raw) => {
  const value = sanitizeText(raw, 64);
  if (!value) return { ok: false, message: 'Username is required.' };
  if (!USERNAME_PATTERN.test(value)) {
    return {
      ok: false,
      message:
        'Username must be 3-32 characters, start with a letter or number, and use only letters, numbers, dots, dashes or underscores.',
    };
  }
  return { ok: true, value };
};

const validateFullName = (raw) => {
  const value = sanitizeText(raw, 100);
  if (!value) return { ok: true, value: '' };
  if (!FULL_NAME_PATTERN.test(value)) {
    return { ok: false, message: 'Full name contains unsupported characters.' };
  }
  return { ok: true, value };
};

const validatePhone = (raw) => {
  const value = sanitizeText(raw, 20);
  if (!value) return { ok: true, value: '' };
  if (!PHONE_PATTERN.test(value)) {
    return { ok: false, message: 'Phone number must be 7-15 digits, optionally starting with +.' };
  }
  return { ok: true, value };
};

/**
 * Email is an optional recovery address, so an empty value is valid and means
 * "clear it". Stored lower-case so the unique index is effectively
 * case-insensitive without relying on Postgres collation.
 */
const validateEmail = (raw) => {
  const value = sanitizeText(raw, 254).toLowerCase();
  if (!value) return { ok: true, value: '' };
  if (!EMAIL_PATTERN.test(value)) {
    return { ok: false, message: 'Enter a valid email address.' };
  }
  return { ok: true, value };
};

const validatePassword = (raw) => {
  if (typeof raw !== 'string' || !raw.length) {
    return { ok: false, message: 'Password is required.' };
  }
  if (raw.length < config.auth.passwordMinLength) {
    return {
      ok: false,
      message: `Password must be at least ${config.auth.passwordMinLength} characters long.`,
    };
  }
  if (raw.length > config.auth.passwordMaxLength) {
    return {
      ok: false,
      message: `Password must be at most ${config.auth.passwordMaxLength} characters long.`,
    };
  }
  if (!/[A-Za-z]/.test(raw) || !/[0-9]/.test(raw)) {
    return { ok: false, message: 'Password must contain at least one letter and one number.' };
  }
  if (TRIMMED_COMMON_PASSWORDS.has(raw.toLowerCase())) {
    return { ok: false, message: 'That password is too common. Please choose something more unique.' };
  }
  return { ok: true, value: raw };
};

/**
 * Validates and normalises a signup payload.
 * @returns {{ok: true, value: object} | {ok: false, message: string}}
 */
const validateSignupPayload = (body = {}) => {
  const username = validateUsername(body.username);
  if (!username.ok) return username;

  const password = validatePassword(body.password);
  if (!password.ok) return password;

  const fullName = validateFullName(body.fullName);
  if (!fullName.ok) return fullName;

  const phoneNumber = validatePhone(body.phoneNumber);
  if (!phoneNumber.ok) return phoneNumber;

  const email = validateEmail(body.email);
  if (!email.ok) return email;

  return {
    ok: true,
    value: {
      username: username.value,
      password: password.value,
      fullName: fullName.value || username.value,
      phoneNumber: phoneNumber.value,
      email: email.value,
    },
  };
};

module.exports = {
  sanitizeText,
  validateUsername,
  validateFullName,
  validatePhone,
  validateEmail,
  validatePassword,
  validateSignupPayload,
  USERNAME_PATTERN,
};
