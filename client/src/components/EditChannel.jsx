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
        placeholder="Channel name"
      />
      <p>Add Team Members</p>
    </div>
  );
};

const EditChannel = ({ setIsEditing }) => {
  const { channel, client, setActiveChannel } = useChatContext();
  const [channelName, setChannelName] = useState(channel?.data?.name || '');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const updateChannel = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const nameChanged = channelName.trim() && channelName.trim() !== (channel.data.name || channel.data.id);

      if (nameChanged) {
        await channel.update(
          { name: channelName.trim() },
          { text: `Channel name changed to "${channelName.trim()}"` }
        );
      }

      if (selectedUsers.length > 0) {
        await channel.addMembers(selectedUsers, {
          text: `Added ${selectedUsers.length} new member${selectedUsers.length > 1 ? 's' : ''}`,
        });
      }

      setIsEditing(false);
    } catch (err) {
      console.error('Error updating channel:', err);
      setErrorMessage(err.message || 'Failed to update channel.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveChannel = async () => {
    const confirmLeave = window.confirm('Are you sure you want to leave this channel?');
    if (!confirmLeave) return;

    try {
      await channel.removeMembers([client.userID]);
      setIsEditing(false);
      setActiveChannel(null);
    } catch (err) {
      console.error('Error leaving channel:', err);
      setErrorMessage(err.message || 'Failed to leave channel.');
    }
  };

  const handleDeleteChannel = async () => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this channel? All messages will be permanently deleted.'
    );
    if (!confirmDelete) return;

    try {
      await channel.delete();
      setIsEditing(false);
      setActiveChannel(null);
    } catch (err) {
      console.error('Error deleting channel:', err);
      setErrorMessage(err.message || 'Failed to delete channel.');
    }
  };

  return (
    <div className='edit-channel__container'>
      <div className='edit-channel__inner'>
        <div className='edit-channel__header'>
          <p>Channel Settings & Members</p>
          <CloseCreateChannel setIsEditing={setIsEditing} />
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

        <ChannelNameInput channelName={channelName} setChannelName={setChannelName} />
        <UserList setSelectedUsers={setSelectedUsers} selectedUsers={selectedUsers} />

        <div className='edit-channel__button-wrapper' style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleLeaveChannel}
              style={{
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
              }}
            >
              Leave Channel
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={handleDeleteChannel}
            >
              Delete Channel
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
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
              onClick={updateChannel}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditChannel;
