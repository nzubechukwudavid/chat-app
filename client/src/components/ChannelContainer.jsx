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
      <div className='channel__container' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          className='channel-empty__container'
          style={{
            maxWidth: '520px',
            padding: '40px 24px',
            textAlign: 'center',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              backgroundColor: '#ecfdf5',
              border: '2px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '36px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
            }}
          >
            🚆
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', letterSpacing: '-0.3px' }}>
            NRC Rail Hub Operations
          </h2>

          <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#64748b', margin: '0 0 24px' }}>
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
