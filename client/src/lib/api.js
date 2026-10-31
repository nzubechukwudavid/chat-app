import axios from 'axios';

import { API_URL } from '../config';

/**
 * The single HTTP client for the Rail Hub API.
 *
 * `withCredentials` is required because the session lives in an `httpOnly`
 * cookie - JavaScript never sees it, so every request has to carry it
 * automatically. The chat token returned by `/auth/session` is kept in
 * memory by `useSession` and never persisted.
 */
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  // The API idles down when unused; a cold start can take the better part of a
  // minute, so allow a long request rather than failing a first visit.
  timeout: 45000,
  headers: { 'Content-Type': 'application/json' },
});

/** Normalises an axios failure into a human-readable message. */
export const errorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (axios.isCancel(error)) return '';

  if (error?.code === 'ECONNABORTED') {
    return 'Rail Hub is taking longer than usual to start up. Please try again in a moment.';
  }

  if (!error?.response) {
    return 'Cannot reach Rail Hub. Check your network connection and try again.';
  }

  const data = error.response.data;
  if (typeof data === 'string' && data.trim()) return data.trim();
  if (data?.message) return data.message;

  if (error.response.status === 429) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  if (error.response.status >= 500) {
    return 'Rail Hub is having trouble right now. Please try again shortly.';
  }

  return fallback;
};

/** Exchanges the session cookie for `{ user, token }`. */
export const fetchSession = async () => {
  const { data } = await api.get('/auth/session');
  return data;
};

export const signIn = async (credentials) => {
  await api.post('/auth/login', credentials);
  return fetchSession();
};

export const signUp = async (payload) => {
  await api.post('/auth/signup', payload);
  return fetchSession();
};

export const signOut = async () => {
  try {
    await api.post('/auth/logout');
  } catch {
    // A failed logout must still clear local state - the cookie may already
    // be gone or the network may be down.
  }
};

export const fetchMe = async () => {
  try {
    const res = await api.get('/auth/me');
    return { ok: true, user: res.data?.user || null };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
};

export const updateMe = async (payload) => {
  try {
    const res = await api.patch('/auth/me', payload);
    return { ok: true, user: res.data?.user || null, message: res.data?.message };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
};

export const changePassword = async (payload) => {
  try {
    const res = await api.put('/auth/password', payload);
    return { ok: true, message: res.data?.message || 'Password updated.' };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
};

export const uploadAvatar = async (file) => {
  try {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await api.post('/auth/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { ok: true, avatarURL: res.data?.avatarURL || null };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
};
