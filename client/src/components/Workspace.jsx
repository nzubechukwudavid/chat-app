import React, { useCallback, useEffect, useState } from 'react';
import { Chat } from 'stream-chat-react';

import ChannelContainer from './ChannelContainer';
import ChannelListContainer from './ChannelListContainer';
import ConnectionBanner from './ui/ConnectionBanner';
import SplashScreen from './ui/SplashScreen';
import { AlertIcon } from './ui/icons';
import { chatClient, connectChatUser, describeConnectionError, disconnectChatUser, isChatConnected } from '../lib/stream';

/** Mirrors the CSS breakpoint so the drawer behaves the same in JS. */
const MOBILE_QUERY = '(max-width: 768px)';

const setDrawer = (open) => {
  document.body.classList.toggle('mobile-menu-open', open);
};

const StreamUser = (user) => ({
  id: user.id,
  name: user.username || user.fullName || user.id,
  fullName: user.fullName || user.username || user.id,
  image: user.avatarURL || undefined,
  phoneNumber: user.phoneNumber || undefined,
});

/**
 * Number of mounted workspace instances.
 *
 * React StrictMode mounts, unmounts and remounts effects in development, so a
 * cleanup that disconnects immediately would tear down the socket that the
 * remount is about to reuse (and Stream's delayed token reset would then wipe
 * the *new* token). Deferring the disconnect lets a remount claim the
 * connection first, and only a real unmount closes the socket.
 */
let mountedWorkspaces = 0;

/**
 * The authenticated shell.
 *
 * Kept in its own lazily-loaded module so the sign-in screen never pays for
 * the Stream SDK bundle, and the socket connection starts at the same moment
 * the workspace code arrives.
 */
const Workspace = ({ user, token, onSignOut, onSessionExpired, theme = 'dark' }) => {
  const [status, setStatus] = useState(() =>
    isChatConnected(user.id) ? 'ready' : 'connecting',
  );
  const [error, setError] = useState('');

  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [createType, setCreateType] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);

  const openDrawer = useCallback(() => setDrawer(true), []);
  const closeDrawer = useCallback(() => setDrawer(false), []);

  // Connect (or re-use) the chat client.
  useEffect(() => {
    let cancelled = false;

    if (isChatConnected(user.id)) {
      setStatus('ready');
      return undefined;
    }

    setStatus('connecting');
    setError('');

    connectChatUser(StreamUser(user), token)
      .then(() => {
        if (!cancelled) setStatus('ready');
      })
      .catch((connectError) => {
        if (cancelled) return;

        console.error('[RailHub] chat connection failed:', connectError);

        if (/token/i.test(String(connectError?.message || '')) && onSessionExpired) {
          onSessionExpired();
          return;
        }

        setError(describeConnectionError(connectError));
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [user, token, onSessionExpired]);

  // The drawer is a body class, so it must be cleaned up on unmount and when
  // the viewport grows past the mobile breakpoint.
  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const onBreakpointChange = (event) => {
      if (!event.matches) setDrawer(false);
    };

    media.addEventListener?.('change', onBreakpointChange);

    return () => {
      media.removeEventListener?.('change', onBreakpointChange);
      setDrawer(false);
    };
  }, []);

  const startCreate = useCallback((type) => {
    setCreateType(type);
    setIsCreating(true);
    setIsEditing(false);
    setDrawer(false);
  }, []);

  const startEdit = useCallback(() => {
    setIsEditing(true);
    setIsCreating(false);
    setDrawer(false);
  }, []);

  /**
   * Sign-out lives here because this chunk owns the SDK.
   *
   * The chat tree has to be unmounted *before* `disconnectUser()` runs: tearing
   * the client down while channel components are still subscribed makes them
   * throw ("You can't use a channel after client.disconnect() was called").
   * So we flip to the splash screen, yield one frame, then disconnect and clear
   * the server session.
   */
  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    await disconnectChatUser();

    await onSignOut?.();
  }, [onSignOut]);

  // Safety net for session expiry: if the workspace disappears without the
  // explicit sign-out path running, close the socket once nothing is mounted.
  useEffect(() => {
    mountedWorkspaces += 1;

    return () => {
      mountedWorkspaces -= 1;

      if (mountedWorkspaces > 0) return;

      setTimeout(() => {
        if (mountedWorkspaces === 0) disconnectChatUser();
      }, 0);
    };
  }, []);

  const retry = useCallback(() => {
    setStatus('connecting');
    setError('');
    connectChatUser(StreamUser(user), token)
      .then(() => setStatus('ready'))
      .catch((connectError) => {
        setError(describeConnectionError(connectError));
        setStatus('error');
      });
  }, [user, token]);

  if (isSigningOut) {
    return <SplashScreen message="Signing out" />;
  }

  if (status === 'connecting') {
    return <SplashScreen message="Connecting to Rail Hub" />;
  }

  if (status === 'error') {
    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary__icon">
          <AlertIcon size={30} />
        </div>
        <h1 className="error-boundary__title">Chat service unavailable</h1>
        <p className="error-boundary__message">{error}</p>
        <div className="empty-state__actions">
          <button type="button" className="btn btn--primary" onClick={retry}>
            Try again
          </button>
          <button type="button" className="btn btn--secondary" onClick={onSessionExpired}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app__wrapper">
      <div
        className="mobile-drawer-backdrop"
        onClick={closeDrawer}
        role="presentation"
        aria-hidden="true"
      />

      <Chat client={chatClient} theme={theme === 'light' ? 'messenger light' : 'messenger dark'}>
        <ChannelListContainer
          user={user}
          isCreating={isCreating}
          setIsCreating={setIsCreating}
          setCreateType={setCreateType}
          setIsEditing={setIsEditing}
          onCloseDrawer={closeDrawer}
          onStartCreate={startCreate}
          onSignOut={handleSignOut}
        />

        <ChannelContainer
          isCreating={isCreating}
          setIsCreating={setIsCreating}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          createType={createType}
          onOpenDrawer={openDrawer}
          onStartCreate={startCreate}
          onStartEdit={startEdit}
        />
      </Chat>

      <ConnectionBanner />
    </div>
  );
};

export default Workspace;
