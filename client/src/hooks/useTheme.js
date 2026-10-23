import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'railhub:theme';
const VALID = ['dark', 'light'];

const readStoredTheme = () => {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return VALID.includes(stored) ? stored : null;
  } catch {
    // localStorage can be blocked (private mode, embedded webview).
    return null;
  }
};

const systemTheme = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';

const applyTheme = (theme) => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f4f7f6' : '#040d09');
};

/**
 * A tiny shared store rather than component state.
 *
 * Several parts of the tree need the current theme: the page chrome, the
 * Stream `Chat` provider and the toggle buttons. Keeping it in a module-level
 * store means toggling anywhere updates every subscriber, and the value is
 * applied before first paint so the app never flashes the wrong palette.
 */
let currentTheme = readStoredTheme() || systemTheme();
const listeners = new Set();

applyTheme(currentTheme);

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const setThemeValue = (next) => {
  if (!VALID.includes(next) || next === currentTheme) return;

  currentTheme = next;
  applyTheme(next);

  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Non-fatal: the theme still applies for this session.
  }

  listeners.forEach((listener) => listener(next));
};

export const useTheme = () => {
  const [theme, setTheme] = useState(currentTheme);

  useEffect(() => subscribe(setTheme), []);

  // Follow the OS while the user has not made an explicit choice.
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: light)');
    if (!media) return undefined;

    const onChange = (event) => {
      if (!readStoredTheme()) setThemeValue(event.matches ? 'light' : 'dark');
    };

    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeValue(currentTheme === 'dark' ? 'light' : 'dark');
  }, []);

  return { theme, setTheme: setThemeValue, toggleTheme };
};

export const getTheme = () => currentTheme;

export default useTheme;
