import { useCallback, useEffect, useRef, useState } from 'react';

import { changePassword as apiChangePassword, deleteMe as apiDeleteMe, errorMessage, fetchSession, signIn as apiSignIn, signOut as apiSignOut, signUp as apiSignUp, updateMe as apiUpdateMe } from '../lib/api';

const IDLE = { status: 'idle', user: null, token: null, error: '' };

/**
 * Owns the authentication lifecycle.
 *
 * The long-lived credential is an `httpOnly` cookie the browser sends for us.
 * The short-lived Stream token lives in this hook's state only - it is never
 * written to `localStorage`, `sessionStorage` or `document.cookie`, so an
 * injected script cannot lift a durable chat credential out of the page.
 */
export const useSession = () => {
  const [state, setState] = useState({ ...IDLE, status: 'restoring' });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const commit = useCallback((session) => {
    if (!mounted.current) return;
    setState({ status: 'authenticated', user: session.user, token: session.token, error: '' });
  }, []);

  /** Called once on boot: is there still a valid cookie? */
  const restore = useCallback(async () => {
    try {
      const session = await fetchSession();
      commit(session);
    } catch (error) {
      // 401 is the expected "not signed in" answer, not a failure state.
      if (error?.response?.status !== 401) {
        const message = errorMessage(error, '');
        if (mounted.current && message) {
          setState({ ...IDLE, error: message });
          return;
        }
      }
      if (mounted.current) setState({ ...IDLE });
    }
  }, [commit]);

  const signIn = useCallback(
    async (credentials) => {
      setState((previous) => ({ ...previous, error: '' }));
      const session = await apiSignIn(credentials);
      commit(session);
      return session;
    },
    [commit],
  );

  const signUp = useCallback(
    async (payload) => {
      setState((previous) => ({ ...previous, error: '' }));
      const session = await apiSignUp(payload);
      commit(session);
      return session;
    },
    [commit],
  );

  const signOut = useCallback(async () => {
    // Clear local state first so the UI responds immediately even when the
    // network call is slow.
    setState({ ...IDLE });
    await apiSignOut();
  }, []);

  const updateProfile = useCallback(async (updates) => {
    const res = await apiUpdateMe(updates);
    if (!mounted.current) return res;
    if (res.ok && res.user) {
      setState((prev) => (prev.status === 'authenticated' ? { ...prev, user: res.user, error: '' } : prev));
    }
    return res;
  }, []);

  const changePassword = useCallback(async (payload) => {
    return apiChangePassword(payload);
  }, []);

  const deleteAccount = useCallback(async (payload) => {
    const res = await apiDeleteMe(payload);
    if (!mounted.current) return res;
    if (res.ok) {
      setState({ ...IDLE });
    }
    return res;
  }, []);

  return {
    ...state,
    isAuthenticated: state.status === 'authenticated',
    isLoading: state.status === 'restoring',
    restore,
    signIn,
    signUp,
    signOut,
    updateProfile,
    changePassword,
    deleteAccount,
  };
};

export default useSession;
