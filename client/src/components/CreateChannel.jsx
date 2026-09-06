import React, { useState } from 'react';
import { useChatContext } from 'stream-chat-react';
import { UserList } from './';
import { CloseCreateChannel } from '../assets';

const ChannelNameInput = ({ channelName = '', setChannelName }) => {
  return (
    <div className="channel-name-input__wrapper">
      <p>Channel Name</p>
      <input
        value={channelName}
        onChange={(e) => setChannelName(e.target.value)}
        placeholder="e.g. operations-lagos, rolling-stock"
      />
      <p>Add Members</p>
    </div>
  );
};

const CreateChannel = ({ createType, setIsCreating }) => {
  const { client, setActiveChannel } = useChatContext();
  const [channelName, setChannelName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([client.userID]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const createChannel = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (createType === 'team' && !channelName.trim()) {
      setErrorMessage('Please enter a channel name.');
      return;
    }

    if (createType === 'messaging' && selectedUsers.length <= 1) {
      setErrorMessage('Please select at least one team member to message.');
      return;
    }

    setIsSubmitting(true);

    try {
      let newChannel;

      if (createType === 'team') {
        const cleanName = channelName.trim();
        // Generate a URL/stream-safe channel ID
        const channelId = cleanName.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 60) || `channel-${Date.now()}`;
        
        newChannel = client.channel('team', channelId, {
          name: cleanName,
          members: Array.from(new Set(selectedUsers)),
        });
      } else {
        newChannel = client.channel('messaging', {
          members: Array.from(new Set(selectedUsers)),
        });
      }

      await newChannel.watch();
      setChannelName('');
      setSelectedUsers([client.userID]);
      setIsCreating(false);
      setActiveChannel(newChannel);
      document.body.classList.remove('mobile-menu-open');
    } catch (error) {
      console.error('Failed to create channel:', error);
      setErrorMessage(error.message || 'Failed to create channel. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='create-channel__container'>
      <div className='create-channel__inner'>
        <div className='create-channel__header'>
          <p>{createType === 'team' ? 'Create Team Channel' : 'New Direct Message'}</p>
          <CloseCreateChannel setIsCreating={setIsCreating} />
        </div>

        {errorMessage && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            border: '1px solid #f87171',
            padding: '8px 16px',
            margin: '12px 24px 0',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {createType === 'team' && (
          <ChannelNameInput channelName={channelName} setChannelName={setChannelName} />
        )}

        <UserList setSelectedUsers={setSelectedUsers} selectedUsers={selectedUsers} />

        <div className='create-channel__button-wrapper'>
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            style={{
              background: '#e2e8f0',
              color: '#475569',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={createChannel}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Creating...'
              : createType === 'team'
              ? 'Create Channel'
              : 'Start Conversation'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateChannel;
