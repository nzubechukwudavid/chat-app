import React from 'react';
import { Channel, MessageSimple, useChatContext } from 'stream-chat-react';

import ChannelInner, { CustomSendButton } from './ChannelInner';
import CreateChannel from './CreateChannel';
import EditChannel from './EditChannel';
import { MenuIcon, TrainIcon } from './ui/icons';

const EmptyChannel = ({ channelName }) => (
  <div className="empty-state">
    <div className="empty-state__icon" aria-hidden="true">
      <TrainIcon size={30} />
    </div>
    <h2 className="empty-state__title">Start of the conversation</h2>
    <p className="empty-state__text">
      You are the first to arrive in <strong>#{channelName}</strong>. Share an update, a
      location report or a heads-up to get operations rolling.
    </p>
  </div>
);

const SelectChannel = ({ onOpenDrawer, onStartCreate }) => (
  <div className="channel__container" style={{ display: 'flex', flexDirection: 'column' }}>
    <header className="mobile-header-only">
      <button
        type="button"
        className="mobile-menu-toggle"
        onClick={onOpenDrawer}
        title="Open channels"
        aria-label="Open channels and direct messages"
      >
        <MenuIcon size={18} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="channel-list__header__logo" style={{ width: 28, height: 28 }}>
          <TrainIcon size={16} />
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>Rail Hub</span>
      </div>

      <div style={{ width: 36 }} aria-hidden="true" />
    </header>

    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div className="empty-state">
        <div className="empty-state__icon" aria-hidden="true">
          <TrainIcon size={32} />
        </div>
        <h2 className="empty-state__title">NRC Rail Hub Operations</h2>
        <p className="empty-state__text">
          Pick a channel from the sidebar or start a direct message with a colleague to
          coordinate movements across the network.
        </p>
        <div className="empty-state__actions">
          <button type="button" className="btn btn--primary" onClick={() => onStartCreate?.('team')}>
            Create a channel
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => onStartCreate?.('messaging')}>
            New direct message
          </button>
        </div>
      </div>
    </div>
  </div>
);

const ChannelContainer = ({
  isCreating,
  setIsCreating,
  isEditing,
  setIsEditing,
  createType,
  onOpenDrawer,
  onStartCreate,
  onStartEdit,
}) => {
  const { channel } = useChatContext();

  if (isCreating) {
    return (
      <div className="channel__container">
        <CreateChannel createType={createType} onClose={() => setIsCreating(false)} />
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="channel__container">
        <EditChannel onClose={() => setIsEditing(false)} />
      </div>
    );
  }

  if (!channel?.id) {
    return <SelectChannel onOpenDrawer={onOpenDrawer} onStartCreate={onStartCreate} />;
  }

  return (
    <div className="channel__container">
      <Channel
        EmptyStateIndicator={() => <EmptyChannel channelName={channel?.data?.name || 'channel'} />}
        Message={(messageProps, index) => <MessageSimple key={messageProps.message?.id || index} {...messageProps} />}
        SendButton={CustomSendButton}
      >
        <ChannelInner onOpenDrawer={onOpenDrawer} onStartEdit={onStartEdit} />
      </Channel>
    </div>
  );
};

export default ChannelContainer;
