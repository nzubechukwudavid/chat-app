import React, { useCallback, useMemo, useState } from 'react';
import { ChannelList, useChatContext } from 'stream-chat-react';

import ChannelSearch from './ChannelSearch';
import TeamChannelList from './TeamChannelList';
import TeamChannelPreview from './TeamChannelPreview';
import Avatar from './ui/Avatar';
import { ChannelListSkeleton } from './ui/Skeleton';
import ThemeToggle from './ui/ThemeToggle';
import { useToast } from './ui/Toast';
import { useConfirm } from './ui/ConfirmDialog';
import { CloseIcon, BoardIcon, BroadcastIcon, LogoutIcon, PlusIcon, TrainIcon, UsersIcon } from './ui/icons';

const EmptyGroup = ({ type }) => (
  <div className="team-channel-list__message">
    {type === 'team' ? 'No platforms yet.' : 'No bay platforms yet.'}
  </div>
);

// Stream adds channels to a list on events such as `notification.added_to_channel`
// without re-applying the server filter, so a newly created team channel can
// surface in the direct-message list (and vice versa). Keep the families
// strictly separated at render time as well.
const teamOnly = (channels) => channels.filter((channel) => channel.type === 'team');
const messagingOnly = (channels) => channels.filter((channel) => channel.type === 'messaging');

const Rail = ({ onStartCreate, onSignOut, onOpenBoard, onBroadcast, boardActive }) => (
  <nav className="channel-list__sidebar" aria-label="Workspace actions">
    <div className="channel-list__sidebar__icon1" title="NRC Rail Hub" aria-hidden="true">
      <span className="icon1__inner">
        <TrainIcon size={22} />
      </span>
    </div>

    <button
      type="button"
      className={`rail-action${boardActive ? ' rail-action--active' : ''}`}
      onClick={onOpenBoard}
      title="Platform board"
      aria-label="Open the platform board"
      aria-current={boardActive ? 'page' : undefined}
    >
      <BoardIcon size={20} />
    </button>

    <button
      type="button"
      className="rail-action"
      onClick={() => onStartCreate('team')}
      title="New platform"
      aria-label="Create a new platform"
    >
      <PlusIcon size={20} />
    </button>

    <button
      type="button"
      className="rail-action"
      onClick={() => onStartCreate('messaging')}
      title="New direct line"
      aria-label="Start a direct line"
    >
      <UsersIcon size={19} />
    </button>

    <button
      type="button"
      className="rail-action"
      onClick={onBroadcast}
      title="All-stations broadcast"
      aria-label="Broadcast a message to every line"
    >
      <BroadcastIcon size={20} />
    </button>

    <div className="rail-spacer" />

    <ThemeToggle className="theme-switch--rail" />

    <button
      type="button"
      className="rail-action rail-action--danger"
      onClick={onSignOut}
      title="Sign out"
      aria-label="Sign out"
    >
      <LogoutIcon size={19} />
    </button>
  </nav>
);

const ChannelHeaderBar = ({ onStartCreate, onCloseDrawer, onOpenBoard }) => (
  <header className="channel-list__header">
    <button
      type="button"
      className="channel-list__header__logo"
      onClick={onOpenBoard}
      title="Open the platform board"
      aria-label="Open the platform board"
    >
      <TrainIcon size={18} />
    </button>

    <div style={{ minWidth: 0, flex: 1 }}>
      <p className="channel-list__header__text">Rail Hub</p>
      <span className="channel-list__header__sub">NRC Operations</span>
    </div>

    <button
      type="button"
      className="team-channel-list__add"
      onClick={() => onStartCreate('team')}
      title="New platform"
      aria-label="Create a new platform"
    >
      <PlusIcon size={16} />
    </button>

    {/* Only rendered as a control on phones; the drawer is closed by tapping
        outside on desktop-sized viewports where it is not a drawer at all. */}
    <button
      type="button"
      className="channel-list__close"
      onClick={onCloseDrawer}
      title="Close menu"
      aria-label="Close menu"
    >
      <CloseIcon size={18} />
    </button>
  </header>
);

const BoardLink = ({ active, onOpen }) => (
  <button
    type="button"
    className={`board-link${active ? ' board-link--active' : ''}`}
    onClick={onOpen}
    aria-current={active ? 'page' : undefined}
  >
    <span className="board-link__icon" aria-hidden="true">
      <BoardIcon size={15} />
    </span>
    <span className="board-link__text">
      <strong>Platform board</strong>
      <small>Live station overview</small>
    </span>
    <span className="board-link__lamp" aria-hidden="true" />
  </button>
);

const UserProfileBar = ({ user, onSignOut }) => {
  const displayName = user?.fullName || user?.username || 'Rail Officer';

  return (
    <div className="profile-bar">
      <div className="profile-bar__avatar">
        <Avatar name={displayName} image={user?.avatarURL} size={34} online />
      </div>

      <div className="profile-bar__identity">
        <p className="profile-bar__name truncate">{displayName}</p>
        <p className="profile-bar__handle truncate">@{user?.username || 'staff'}</p>
      </div>

      <button
        type="button"
        className="icon-button"
        onClick={onSignOut}
        title="Sign out"
        aria-label="Sign out"
      >
        <LogoutIcon size={16} />
      </button>
    </div>
  );
};

/**
 * Channel sidebar.
 *
 * Note there is exactly *one* instance of the list tree. The previous build
 * mounted a second copy behind a `display: none` breakpoint, which doubled the
 * number of live Stream subscriptions for every user.
 */
const ChannelListContainer = ({
  user,
  isCreating,
  setIsCreating,
  setCreateType,
  setIsEditing,
  onCloseDrawer,
  onStartCreate,
  onSignOut,
  onBroadcast,
}) => {
  const { client, channel: activeChannel, setActiveChannel } = useChatContext();
  const { confirm, dialog } = useConfirm();
  const { info } = useToast();
  const [collapsed, setCollapsed] = useState({ team: false, messaging: false });

  const boardActive = !activeChannel?.id;

  const handleOpenBoard = useCallback(() => {
    setActiveChannel?.(undefined);
    onCloseDrawer?.();
  }, [onCloseDrawer, setActiveChannel]);

  const teamFilters = useMemo(
    () => ({ type: 'team', members: { $in: [client?.userID] } }),
    [client?.userID],
  );
  const messagingFilters = useMemo(
    () => ({ type: 'messaging', members: { $in: [client?.userID] } }),
    [client?.userID],
  );

  const toggleGroup = useCallback((type) => {
    setCollapsed((current) => ({ ...current, [type]: !current[type] }));
  }, []);

  const handleSignOut = useCallback(async () => {
    const ok = await confirm({
      title: 'Sign out of Rail Hub?',
      description: 'You will need your station handle and password to sign back in.',
      confirmLabel: 'Sign out',
      tone: 'danger',
    });

    if (ok) {
      info('Signing out…');
      onSignOut?.();
    }
  }, [confirm, info, onSignOut]);

  if (!client || !client.userID) return null;

  const sharedListProps = {
    isCreating,
    setIsCreating,
    setCreateType,
    setIsEditing,
    onCloseDrawer,
    onToggleGroup: toggleGroup,
    collapsed,
  };

  return (
    <aside className="channel-list__container" aria-label="Platforms and bay platforms">
      <Rail
        onStartCreate={onStartCreate}
        onSignOut={handleSignOut}
        onOpenBoard={handleOpenBoard}
        onBroadcast={onBroadcast}
        boardActive={boardActive}
      />

      <div className="channel-list__list__wrapper">
        <ChannelHeaderBar
          onStartCreate={onStartCreate}
          onCloseDrawer={onCloseDrawer}
          onOpenBoard={handleOpenBoard}
        />

        <BoardLink active={boardActive} onOpen={handleOpenBoard} />

        <ChannelSearch onNavigate={onCloseDrawer} />

        <div className="channel-list__scroll">
          <ChannelList
            filters={teamFilters}
            channelRenderFilterFn={teamOnly}
            sort={{ last_message_at: -1 }}
            options={{ state: true, watch: true, presence: true, limit: 30 }}
            setActiveChannelOnMount={false}
            EmptyStateIndicator={() => <EmptyGroup type="team" />}
            LoadingIndicator={ChannelListSkeleton}
            List={(listProps) => (
              <TeamChannelList
                {...listProps}
                {...sharedListProps}
                collapsed={Boolean(collapsed.team)}
                type="team"
              />
            )}
            Preview={(previewProps) => (
              <TeamChannelPreview {...previewProps} type="team" onCloseDrawer={onCloseDrawer} />
            )}
          />

          <ChannelList
            filters={messagingFilters}
            channelRenderFilterFn={messagingOnly}
            sort={{ last_message_at: -1 }}
            options={{ state: true, watch: true, presence: true, limit: 30 }}
            setActiveChannelOnMount={false}
            EmptyStateIndicator={() => <EmptyGroup type="messaging" />}
            LoadingIndicator={ChannelListSkeleton}
            List={(listProps) => (
              <TeamChannelList
                {...listProps}
                {...sharedListProps}
                collapsed={Boolean(collapsed.messaging)}
                type="messaging"
              />
            )}
            Preview={(previewProps) => (
              <TeamChannelPreview
                {...previewProps}
                type="messaging"
                onCloseDrawer={onCloseDrawer}
              />
            )}
          />
        </div>

        <UserProfileBar user={user} onSignOut={handleSignOut} />
      </div>

      {dialog}
    </aside>
  );
};

export default ChannelListContainer;
