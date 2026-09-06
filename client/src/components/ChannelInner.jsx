import React, { useState } from 'react';
import { MessageList, MessageInput, Thread, Window, useChannelActionContext, Avatar, useChannelStateContext, useChatContext } from 'stream-chat-react';

import { ChannelInfo } from '../assets';

export const GiphyContext = React.createContext({});

export const CustomSendButton = ({ sendMessage, disabled }) => (
  <button
    type="button"
    onClick={sendMessage}
    disabled={disabled}
    className="nrc-send-btn"
    title="Send message"
    aria-label="Send message"
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M22 2L11 13"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 2L15 22L11 13L2 9L22 2Z"
        fill="rgba(255, 255, 255, 0.25)"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </button>
);

const ChannelInner = ({ setIsEditing }) => {
  const [giphyState, setGiphyState] = useState(false);
  const { sendMessage } = useChannelActionContext();
  
  const overrideSubmitHandler = (message) => {
    let updatedMessage = { ...message };
  
    if (giphyState) {
      updatedMessage.text = `/giphy ${message.text}`;
      updatedMessage.attachments = []; // Giphy command should not have attachments
    }
    
    if (sendMessage) {
      sendMessage(updatedMessage);
      setGiphyState(false);
    }
  };

  return (
    <GiphyContext.Provider value={{ giphyState, setGiphyState }}>
      <div className="channel-inner__wrapper">
        <Window>
          <TeamChannelHeader setIsEditing={setIsEditing} />
          <MessageList />
          <MessageInput
            overrideSubmitHandler={overrideSubmitHandler}
            SendButton={CustomSendButton}
          />
        </Window>
        <Thread />
      </div>
    </GiphyContext.Provider>
  );
};

const TeamChannelHeader = ({ setIsEditing }) => {
  const { channel, watcher_count } = useChannelStateContext();
  const { client } = useChatContext();

  const MessagingHeader = () => {
    const members = Object.values(channel.state.members).filter(({ user }) => user?.id !== client.userID);
    const otherUser = members[0]?.user;
    const additionalMembers = members.length - 1;

    if (channel.type === 'messaging') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Avatar image={otherUser?.image} name={otherUser?.fullName || otherUser?.name || 'User'} size={38} />
            {otherUser?.online && (
              <span style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '10px',
                height: '10px',
                backgroundColor: '#22c55e',
                borderRadius: '50%',
                border: '2px solid #ffffff'
              }} />
            )}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
              {otherUser?.fullName || otherUser?.name || 'Direct Message'}
              {additionalMembers > 0 && ` +${additionalMembers} more`}
            </h3>
            {otherUser?.name && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{otherUser.name}</span>
            )}
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'rgba(16, 185, 129, 0.15)',
          color: '#34d399',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '15px'
        }}>
          #
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
            {channel?.data?.name || channel?.data?.id}
          </h3>
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>NRC Team Corridor</span>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          title="Channel Settings"
          style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            cursor: 'pointer',
            padding: '6px 8px',
            borderRadius: '6px',
            marginLeft: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            transition: 'background 0.15s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#334155')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-surface-elevated)')}
        >
          <ChannelInfo />
        </button>
      </div>
    );
  };

  const getWatcherText = (watchers) => {
    if (!watchers) return 'Offline';
    if (watchers === 1) return '1 staff online';
    return `${watchers} staff online`;
  };

  return (
    <div className='team-channel-header__container'>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => document.body.classList.toggle('mobile-menu-open')}
          title="Toggle Navigation Menu"
          aria-label="Toggle Navigation Menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <MessagingHeader />
      </div>
      <div className='team-channel-header__right'>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 12px',
          borderRadius: '9999px',
          background: 'rgba(16, 185, 129, 0.14)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          fontSize: '12px',
          fontWeight: 600,
          color: '#34d399'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
          {getWatcherText(watcher_count)}
        </span>
      </div>
    </div>
  );
};

export default ChannelInner;
