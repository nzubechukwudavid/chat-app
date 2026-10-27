import React from 'react';
import { Channel, useChatContext } from 'stream-chat-react';

import ChannelInner from './ChannelInner';
import CreateChannel from './CreateChannel';
import EditChannel from './EditChannel';
import RailwayBoard from '../features/railway/RailwayBoard';
import { TrainIcon } from './ui/icons';

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
      <RailwayBoard
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
      >
        <ChannelInner onOpenDrawer={onOpenDrawer} onStartEdit={onStartEdit} />
      </Channel>
    </div>
  );
};

export default ChannelContainer;
