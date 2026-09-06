import React from 'react';
import { Avatar, useChatContext } from 'stream-chat-react';

const TeamChannelPreview = ({ setActiveChannel, setIsCreating, setIsEditing, setToggleContainer, channel, type }) => {
  const { channel: activeChannel, client } = useChatContext();

  const ChannelPreview = () => (
    <div className='channel-preview__item'>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '20px',
        height: '20px',
        borderRadius: '5px',
        background: 'rgba(255, 255, 255, 0.12)',
        fontSize: '11px',
        fontWeight: 700,
        marginRight: '4px',
        flexShrink: 0
      }}>
        #
      </span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {channel?.data?.name || channel?.data?.id}
      </span>
    </div>
  );

  const DirectPreview = () => {
    const members = channel.state?.members
      ? Object.values(channel.state.members).filter(({ user }) => user?.id !== client.userID)
      : [];
    const otherUser = members[0]?.user;

    return (
      <div className='channel-preview__item single'>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Avatar
            image={otherUser?.image}
            name={otherUser?.fullName || otherUser?.name || 'User'}
            size={24}
          />
          {otherUser?.online && (
            <span style={{
              position: 'absolute',
              bottom: '-1px',
              right: '-1px',
              width: '7px',
              height: '7px',
              backgroundColor: '#22c55e',
              borderRadius: '50%',
              border: '1.5px solid #071f15'
            }} />
          )}
        </div>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {otherUser?.fullName || otherUser?.name || 'Direct Message'}
        </span>
      </div>
    );
  };

  return (
    <div
      className={
        channel?.id === activeChannel?.id
          ? 'channel-preview__wrapper__selected'
          : 'channel-preview__wrapper'
      }
      onClick={() => {
        setIsCreating(false);
        setIsEditing(false);
        setActiveChannel(channel);
        if (setToggleContainer) {
          setToggleContainer((prevState) => !prevState);
        }
        document.body.classList.remove('mobile-menu-open');
      }}
    >
      {type === 'team' ? <ChannelPreview /> : <DirectPreview />}
    </div>
  );
};

export default TeamChannelPreview;
