import React from 'react';
import { Channel, MessageSimple, useChatContext } from 'stream-chat-react';

import ChannelInner, { CustomSendButton } from './ChannelInner';
import CreateChannel from './CreateChannel';
import EditChannel from './EditChannel';
import SignalBoard from './SignalBoard';
import { BroadcastIcon, TrainIcon } from './ui/icons';

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

/**
 * Broadcast dispatches get a network-wide marker above the normal bubble.
 * The wrapper is deliberately thin so the SDK keeps owning layout, timestamps
 * and delivery state.
 */
const DispatchMessage = (props) => {
  const broadcast = Boolean(props.message?.broadcast || props.message?.custom?.broadcast);

  if (!broadcast) return <MessageSimple {...props} />;

  return (
    <div className="dispatch-broadcast">
      <p className="dispatch-broadcast__tag">
        <BroadcastIcon size={11} strokeWidth={2.4} />
        All stations
      </p>
      <MessageSimple {...props} />
    </div>
  );
};

const ChannelContainer = ({
  isCreating,
  setIsCreating,
  isEditing,
  setIsEditing,
  createType,
  onOpenDrawer,
  onStartCreate,
  onStartEdit,
  onBroadcast,
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
    return (
      <SignalBoard
        onOpenDrawer={onOpenDrawer}
        onStartCreate={onStartCreate}
        onBroadcast={onBroadcast}
      />
    );
  }

  return (
    <div className="channel__container">
      <Channel
        EmptyStateIndicator={() => <EmptyChannel channelName={channel?.data?.name || 'channel'} />}
        Message={(messageProps, index) => (
          <DispatchMessage key={messageProps.message?.id || index} {...messageProps} />
        )}
        SendButton={CustomSendButton}
      >
        <ChannelInner onOpenDrawer={onOpenDrawer} onStartEdit={onStartEdit} />
      </Channel>
    </div>
  );
};

export default ChannelContainer;
