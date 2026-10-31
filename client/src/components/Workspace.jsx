import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Chat, useChatContext } from 'stream-chat-react';

import ChannelContainer from './ChannelContainer';
import ChannelListContainer from './ChannelListContainer';
import BroadcastConsole from './BroadcastConsole';
import ConnectionBanner from './ui/ConnectionBanner';
import SplashScreen from './ui/SplashScreen';
import { AlertIcon } from './ui/icons';
import { useToast } from './ui/Toast';
import { chatClient, connectChatUser, describeConnectionError, disconnectChatUser, isAuthTokenError, isChatConnected, isStreamConfigError } from '../lib/stream';

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
 * In-app notification for messages that arrive outside the channel currently
 * on screen. Stream already updates unread badges; this adds a short toast so
 * a dispatcher notices a message in another line without switching tabs.
 */
const MessageNotifications = ({ notify }) => {
  const { client, channel, setActiveChannel } = useChatContext();
  const activeCidRef = useRef(channel?.cid || null);

  useEffect(() => {
    activeCidRef.current = channel?.cid || null;
  }, [channel]);

  useEffect(() => {
    if (!client) return undefined;

    const handleNewMessage = (event) => {
      const message = event?.message;
      if (!message || !event.cid) return;
      if (message.user?.id === client.userID) return;
      if (event.cid === activeCidRef.current) return;

      const muted = (client.mutedChannels || []).some(
        (entry) => (entry?.channel?.cid || entry?.cid) === event.cid,
      );
      if (muted) return;

      const sender = message.user?.name || message.user?.id || 'Someone';
      const channelName = event.channel?.name;
      const text = (message.text || '').trim();
      const preview = text
        ? `${text.slice(0, 90)}${text.length > 90 ? '…' : ''}`
        : 'Sent an attachment';

      notify({
        variant: 'info',
        title: channelName ? `${sender} in ${channelName}` : sender,
        description: preview,
        duration: 6000,
        action: {
          label: 'Open',
          onClick: () => {
            try {
              const target = client.channel(event.channel_type, event.channel_id);
              setActiveChannel?.(target);
            } catch (openError) {
              console.error('[RailHub] Could not open notified channel:', openError);
            }
          },
        },
      });
    };

    client.on('message.new', handleNewMessage);

    return () => {
      client.off('message.new', handleNewMessage);
    };
  }, [client, notify, setActiveChannel]);

  return null;
};

/**
 * The authenticated shell.
 *
 * Kept in its own lazily-loaded module so the sign-in screen never pays for
 * the Stream SDK bundle, and the socket connection starts at the same moment
 * the workspace code arrives.
 */
const Workspace = ({ user, token, onSignOut, onSessionExpired, theme = 'dark', updateProfile, changePassword, uploadAvatar }) => {
  const { notify } = useToast();
  const [status, setStatus] = useState(() =>
    isChatConnected(user.id) ? 'ready' : 'connecting',
  );
  const [error, setError] = useState('');
  const [reconnecting, setReconnecting] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [createType, setCreateType] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const openDrawer = useCallback(() => setDrawer(true), []);
  const closeDrawer = useCallback(() => setDrawer(false), []);
  const openBroadcast = useCallback(() => {
    setIsBroadcasting(true);
    setDrawer(false);
  }, []);

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

        // Only a genuine credential rejection means the login is dead. A
        // misconfigured Stream app is an operator problem: signing the user out
        // would just loop them back to this same screen.
        if (isAuthTokenError(connectError) && !isStreamConfigError(connectError) && onSessionExpired) {
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

  // Surface socket-level reconnects (token refresh, dropped websocket) in the
  // same banner as browser-level offline. Without this the "Reconnecting to
  // Rail Hub" state was unreachable.
  useEffect(() => {
    const onConnectionChanged = (event) => {
      setReconnecting(event?.online === false);
    };

    chatClient.on('connection.changed', onConnectionChanged);

    return () => {
      chatClient.off('connection.changed', onConnectionChanged);
    };
  }, []);

  // The drawer is a body class, so it must be cleaned up on unmount and when
  // the viewport grows past the mobile breakpoint.
  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const onBreakpointChange = (event) => {
      if (!event.matches) setDrawer(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setDrawer(false);
    };

    media.addEventListener?.('change', onBreakpointChange);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      media.removeEventListener?.('change', onBreakpointChange);
      document.removeEventListener('keydown', onKeyDown);
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
        <MessageNotifications notify={notify} />

        <ChannelListContainer
          user={user}
          isCreating={isCreating}
          setIsCreating={setIsCreating}
          setCreateType={setCreateType}
          setIsEditing={setIsEditing}
          onCloseDrawer={closeDrawer}
          onStartCreate={startCreate}
          onSignOut={handleSignOut}
          onBroadcast={openBroadcast}
          onUpdateProfile={updateProfile}
          onChangePassword={changePassword}
          onUploadAvatar={uploadAvatar}
          notify={notify}
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
          onBroadcast={openBroadcast}
        />

        <BroadcastConsole
          open={isBroadcasting}
          onClose={() => setIsBroadcasting(false)}
        />
      </Chat>

      <ConnectionBanner reconnecting={reconnecting && status === 'ready'} />
    </div>
  );
};

export default Workspace;
