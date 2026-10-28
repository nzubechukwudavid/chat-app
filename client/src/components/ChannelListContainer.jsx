import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChannelList, useChatContext } from 'stream-chat-react';

import ChannelSearch from './ChannelSearch';
import TeamChannelList from './TeamChannelList';
import TeamChannelPreview from './TeamChannelPreview';
import Avatar from './ui/Avatar';
import { ChannelListSkeleton } from './ui/Skeleton';
import ThemeToggle from './ui/ThemeToggle';
import SettingsModal from './settings/SettingsModal';
import {
  BoardIcon,
  BroadcastIcon,
  CloseIcon,
  LogoutIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PlusIcon,
  SettingsIcon,
  TrainIcon,
  UsersIcon,
} from './ui/icons';

const NAV_COLLAPSED_KEY = 'railhub.navigation.collapsed';

const readNavPreference = () => {
  try {
    return window.localStorage.getItem(NAV_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
};

const EmptyGroup = ({ type }) => (
  <div className="team-channel-list__message">
    {type === 'team' ? 'No lines yet.' : 'No DMs yet.'}
  </div>
);

// Stream adds channels to a list on events such as `notification.added_to_channel`
// without re-applying the server filter, so a newly created team channel can
// surface in the direct-message list (and vice versa). Keep the families
// strictly separated at render time as well.
const teamOnly = (channels) => channels.filter((channel) => channel.type === 'team');
const messagingOnly = (channels) => channels.filter((channel) => channel.type === 'messaging');

const Rail = ({
  onStartCreate,
  onOpenBoard,
  onSignOut,
  onBroadcast,
  onToggleCollapsed,
  collapsed,
  boardActive,
  expandButtonRef,
  onOpenSettings,
}) => (
  <nav className="channel-list__sidebar" aria-label="Workspace actions">
    <div className="channel-list__sidebar__icon1" title="NRC Rail Hub" aria-hidden="true">
      <span className="icon1__inner">
        <TrainIcon size={22} />
      </span>
    </div>

    <button
      type="button"
      ref={expandButtonRef}
      className={`rail-action${boardActive && !collapsed ? ' rail-action--active' : ''}${
        collapsed ? ' rail-toggle' : ''
      }`}
      onClick={collapsed ? onToggleCollapsed : onOpenBoard}
      title={collapsed ? 'Expand navigation' : 'Station board'}
      aria-label={collapsed ? 'Expand navigation' : 'Open the station board'}
      aria-controls={collapsed ? 'channel-navigation' : undefined}
      aria-expanded={collapsed ? false : undefined}
      aria-current={boardActive && !collapsed ? 'page' : undefined}
    >
      {collapsed ? <PanelLeftOpenIcon size={19} /> : <BoardIcon size={20} />}
    </button>

    <button
      type="button"
      className="rail-action"
      onClick={() => onStartCreate('team')}
      title="New line"
      aria-label="Create a new line"
    >
      <PlusIcon size={20} />
    </button>

    <button
      type="button"
      className="rail-action"
      onClick={() => onStartCreate('messaging')}
      title="New DM"
      aria-label="Start a new DM"
    >
      <UsersIcon size={19} />
    </button>

    <button
      type="button"
      className="rail-action"
      onClick={onBroadcast}
      title="Message all lines"
      aria-label="Message every line"
    >
      <BroadcastIcon size={20} />
    </button>

    <div className="rail-spacer" />

    <button
      type="button"
      className="rail-action"
      onClick={onOpenSettings}
      title="Settings"
      aria-label="Open settings"
    >
      <SettingsIcon size={19} />
    </button>

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

const ChannelHeaderBar = ({ onCloseDrawer, onToggleCollapsed, collapseButtonRef }) => (
  <header className="channel-list__header">
    <div className="channel-list__brand">
      <p className="channel-list__header__text">Rail Hub</p>
      <span className="channel-list__header__sub">
        <span className="channel-list__live-dot" aria-hidden="true" />
        NRC Operations
      </span>
    </div>

    <div className="channel-list__header__actions">
      <button
        type="button"
        ref={collapseButtonRef}
        className="channel-list__collapse"
        onClick={onToggleCollapsed}
        title="Collapse navigation"
        aria-label="Collapse navigation"
        aria-controls="channel-navigation"
        aria-expanded="true"
      >
        <PanelLeftCloseIcon size={17} />
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
    </div>
  </header>
);

const UserProfileBar = ({ user, onOpenSettings }) => {
  const displayName = user?.fullName || user?.username || 'Rail Officer';

  return (
    <button type="button" className="profile-bar profile-bar--button" onClick={onOpenSettings} title="Open settings">
      <div className="profile-bar__avatar">
        <Avatar name={displayName} image={user?.avatarURL} size={34} online />
      </div>

      <div className="profile-bar__identity">
        <p className="profile-bar__name truncate">{displayName}</p>
        <p className="profile-bar__handle truncate">@{user?.username || 'staff'}</p>
      </div>
    </button>
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
  onUpdateProfile,
  onChangePassword,
  onDeleteAccount,
  onUploadAvatar,
  notify,
}) => {
  const { client, channel: activeChannel, setActiveChannel } = useChatContext();
  const [collapsed, setCollapsed] = useState({ team: false, messaging: false });
  const [navCollapsed, setNavCollapsed] = useState(readNavPreference);
  const collapseButtonRef = useRef(null);
  const expandButtonRef = useRef(null);
  const restoreToggleFocus = useRef(false);
  const focusRequestRef = useRef(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const boardActive = !activeChannel?.id;

  useEffect(() => {
    try {
      window.localStorage.setItem(NAV_COLLAPSED_KEY, navCollapsed ? '1' : '0');
    } catch {
      // A blocked storage area should never make the navigation unusable.
    }
  }, [navCollapsed]);

  // The button that was just pressed disappears in the opposite state, so
  // hand focus to the matching control instead of dropping it on <body>.
  useEffect(() => {
    if (!restoreToggleFocus.current) return;

    restoreToggleFocus.current = false;
    const target = navCollapsed ? expandButtonRef.current : collapseButtonRef.current;
    if (!target) return;

    const request = focusRequestRef.current + 1;
    focusRequestRef.current = request;

    // Retry briefly: the panel may still be resolving its visible state when
    // the first frame after the toggle runs.
    let attempts = 0;
    const moveFocus = () => {
      if (focusRequestRef.current !== request) return;

      target.focus({ preventScroll: true });
      attempts += 1;

      if (document.activeElement !== target && attempts < 5) {
        window.setTimeout(moveFocus, 40);
      }
    };

    window.setTimeout(moveFocus, 0);
  }, [navCollapsed]);

  const toggleNav = useCallback(() => {
    restoreToggleFocus.current = true;
    setNavCollapsed((current) => !current);
  }, []);

  const handleOpenBoard = useCallback(() => {
    setActiveChannel?.(undefined);
    onCloseDrawer?.();
  }, [onCloseDrawer, setActiveChannel]);

  const openSettings = useCallback(() => {
    setSettingsOpen(true);
    onCloseDrawer?.();
  }, [onCloseDrawer]);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

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
    <aside
      className={`channel-list__container${
        navCollapsed ? ' channel-list__container--collapsed' : ''
      }`}
      aria-label="Lines and DMs"
    >
      <Rail
        onStartCreate={onStartCreate}
        onOpenBoard={handleOpenBoard}
        onSignOut={onSignOut}
        onBroadcast={onBroadcast}
        onToggleCollapsed={toggleNav}
        collapsed={navCollapsed}
        boardActive={boardActive}
        expandButtonRef={expandButtonRef}
        onOpenSettings={openSettings}
      />

      <div className="channel-list__list__wrapper" id="channel-navigation">
        <ChannelHeaderBar
          onCloseDrawer={onCloseDrawer}
          onToggleCollapsed={toggleNav}
          collapseButtonRef={collapseButtonRef}
        />

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

        <UserProfileBar user={user} onOpenSettings={openSettings} />
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={closeSettings}
        user={user}
        onUpdateProfile={onUpdateProfile}
        onChangePassword={onChangePassword}
        onDeleteAccount={onDeleteAccount}
        onUploadAvatar={onUploadAvatar}
        notify={notify}
      />
    </aside>
  );
};

export default ChannelListContainer;
