import React, { useState, useCallback } from 'react';
import { ChannelList, useChatContext } from 'stream-chat-react';
import Cookies from 'universal-cookie';

import { ChannelSearch, TeamChannelList, TeamChannelPreview } from './';
import RailwayIcon from '../assets/railway.png';
import LogoutIcon from '../assets/logout.png';

const cookies = new Cookies();

const SideBar = ({ logout }) => (
  <div className="channel-list__sidebar">
    <div className="channel-list__sidebar__icon1" title="NRC Rail Hub">
      <div className='icon1__inner'>
        <img src={RailwayIcon} alt="Rail Hub" width="30" />
      </div>
    </div>
    <div className="channel-list__sidebar__icon2" onClick={logout} title="Sign Out">
      <div className='icon1__inner'>
        <img src={LogoutIcon} alt="Logout" width="30" />
      </div>
    </div>
  </div>
);

const CompanyHeader = () => (
  <div className="channel-list__header" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px' }}>
    <div style={{
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px'
    }}>
      🚆
    </div>
    <div>
      <p className="channel-list__header__text" style={{ margin: 0, fontWeight: 800, letterSpacing: '0.5px' }}>
        Rail Hub
      </p>
      <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.8)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', fontWeight: 600 }}>
        NRC Operations
      </span>
    </div>
  </div>
);

const customChannelTeamFilter = (channels) => {
  return channels.filter((channel) => channel.type === 'team');
};

const customChannelMessagingFilter = (channels) => {
  return channels.filter((channel) => channel.type === 'messaging');
};

const EmptyState = ({ type }) => (
  <div className="team-channel-list__message">
    No {type === 'team' ? 'channels' : 'messages'} found.
  </div>
);

const UserProfileBar = ({ logout }) => {
  const fullName = cookies.get('fullName');
  const username = cookies.get('username');
  const avatarURL = cookies.get('avatarURL');

  return (
    <div
      style={{
        marginTop: 'auto',
        padding: '12px 14px',
        borderTop: '1px solid rgba(255, 255, 255, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: '14px',
            overflow: 'hidden',
          }}
        >
          {avatarURL ? (
            <img src={avatarURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            (fullName || username || 'U')[0].toUpperCase()
          )}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '9px',
            height: '9px',
            backgroundColor: '#22c55e',
            borderRadius: '50%',
            border: '2px solid #00733E',
          }}
          title="Online"
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 600,
            color: '#fff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {fullName || username}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.75)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          @{username || 'staff'}
        </p>
      </div>

      <button
        onClick={logout}
        title="Sign Out"
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255, 255, 255, 0.75)',
          cursor: 'pointer',
          padding: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>
  );
};

const ChannelListContent = ({ isCreating, setIsCreating, setCreateType, setIsEditing, setToggleContainer, setAuthToken, client }) => {
  const logout = useCallback(() => {
    const cookiesToRemove = ['token', 'username', 'userID', 'fullName', 'phoneNumber', 'avatarURL', 'hashedPassword'];
    cookiesToRemove.forEach((cookie) => cookies.remove(cookie, { path: '/' }));

    if (client) {
      client.disconnectUser();
    }

    setAuthToken(null);
  }, [client, setAuthToken]);

  const filters = { members: { $in: [client.userID] } };

  return (
    <>
      <SideBar logout={logout} />
      <div className="channel-list__list__wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <CompanyHeader />
        <ChannelSearch setToggleContainer={setToggleContainer} />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <ChannelList
            filters={filters}
            channelRenderFilterFn={customChannelTeamFilter}
            EmptyStateIndicator={() => <EmptyState type="team" />}
            List={(listProps) => (
              <TeamChannelList
                {...listProps}
                type='team'
                isCreating={isCreating}
                setIsCreating={setIsCreating}
                setCreateType={setCreateType}
                setIsEditing={setIsEditing}
                setToggleContainer={setToggleContainer}
              />
            )}
            Preview={(previewProps) => (
              <TeamChannelPreview
                {...previewProps}
                setIsCreating={setIsCreating}
                setIsEditing={setIsEditing}
                setToggleContainer={setToggleContainer}
                type='team'
              />
            )}
          />
          <ChannelList
            filters={filters}
            channelRenderFilterFn={customChannelMessagingFilter}
            EmptyStateIndicator={() => <EmptyState type="messaging" />}
            List={(listProps) => (
              <TeamChannelList
                {...listProps}
                type='messaging'
                isCreating={isCreating}
                setIsCreating={setIsCreating}
                setCreateType={setCreateType}
                setIsEditing={setIsEditing}
                setToggleContainer={setToggleContainer}
              />
            )}
            Preview={(previewProps) => (
              <TeamChannelPreview
                {...previewProps}
                setIsCreating={setIsCreating}
                setIsEditing={setIsEditing}
                setToggleContainer={setToggleContainer}
                type='messaging'
              />
            )}
          />
        </div>
        <UserProfileBar logout={logout} />
      </div>
    </>
  );
};

const ChannelListContainer = ({ isCreating, setIsCreating, setCreateType, setIsEditing, setAuthToken }) => {
  const [toggleContainer, setToggleContainer] = useState(false);
  const { client } = useChatContext();

  if (!client || !client.userID) return null;

  return (
    <>
      <div className="channel-list__container">
        <ChannelListContent
          client={client}
          setIsCreating={setIsCreating}
          setCreateType={setCreateType}
          setIsEditing={setIsEditing}
          setAuthToken={setAuthToken}
        />
      </div>

      <div
        className='channel-list__container-responsive'
        style={{ left: toggleContainer ? '0%' : '-89%', backgroundColor: '#00733E' }}
      >
        <div
          className="channel-list__container-toggle"
          onClick={() => setToggleContainer((prevToggleContainer) => !prevToggleContainer)}
        />
        <ChannelListContent
          setIsCreating={setIsCreating}
          client={client}
          setCreateType={setCreateType}
          setIsEditing={setIsEditing}
          setToggleContainer={setToggleContainer}
          setAuthToken={setAuthToken}
        />
      </div>
    </>
  );
};

export default ChannelListContainer;