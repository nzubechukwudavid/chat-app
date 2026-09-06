import React from 'react';
import { Channel, useChatContext, MessageSimple } from 'stream-chat-react';
import { ChannelInner, CreateChannel, EditChannel } from './';
import { CustomSendButton } from './ChannelInner';

const ChannelContainer = ({ isCreating, setIsCreating, isEditing, setIsEditing, createType }) => {
  const { channel } = useChatContext();

  if (isCreating) {
    return (
      <div className='channel__container'>
        <CreateChannel createType={createType} setIsCreating={setIsCreating} />
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className='channel__container'>
        <EditChannel createType={createType} setIsEditing={setIsEditing} />
      </div>
    );
  }

  if (!channel?.id) {
    return (
      <div className='channel__container' style={{ display: 'flex', flexDirection: 'column' }}>
        <div className='team-channel-header__container mobile-header-only'>
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
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>NRC Rail Hub</span>
          <div style={{ width: '28px' }} />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div
            className='channel-empty__container'
          style={{
            maxWidth: '520px',
            padding: '40px 24px',
            textAlign: 'center',
            background: 'var(--bg-surface)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '36px',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.2)',
            }}
          >
            🚆
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 10px', letterSpacing: '-0.3px' }}>
            NRC Rail Hub Operations
          </h2>

          <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-muted)', margin: '0 0 24px' }}>
            Select a station channel or start a direct message with a railway colleague from the sidebar to begin coordinating activities.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => setIsCreating(true)}
              style={{
                backgroundColor: 'var(--nrc-green-700)',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(0, 115, 62, 0.25)',
                transition: 'all 0.2s',
              }}
            >
              <span>➕</span>
              <span>New Channel</span>
            </button>
          </div>
        </div>
        </div>
      </div>
    );
  }

  const EmptyState = () => (
    <div className='channel-empty__container'>
      <p className='channel-empty__first'>This is the beginning of your chat history in #{channel?.data?.name || 'this channel'}.</p>
      <p className='channel-empty__second'>Send operational updates, files, announcements, or messages.</p>
    </div>
  );

  return (
    <div className='channel__container'>
      <Channel
        EmptyStateIndicator={EmptyState}
        Message={(messageProps, i) => <MessageSimple key={i} {...messageProps} />}
        SendButton={CustomSendButton}
      >
        <ChannelInner setIsEditing={setIsEditing} />
      </Channel>
    </div>
  );
};

export default ChannelContainer;
