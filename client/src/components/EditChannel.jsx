import React, { useCallback, useMemo, useState } from 'react';
import { useChatContext } from 'stream-chat-react';

import UserList from './UserList';
import Avatar from './ui/Avatar';
import Modal from './ui/Modal';
import { useConfirm } from './ui/ConfirmDialog';
import { AlertIcon, CheckIcon, CloseIcon, TrashIcon } from './ui/icons';

const FORM_ID = 'edit-channel-form';

const EditChannel = ({ onClose }) => {
  const { channel, client, setActiveChannel } = useChatContext();
  const { confirm, dialog } = useConfirm();

  const isTeam = channel?.type === 'team';

  const [channelName, setChannelName] = useState(channel?.data?.name || '');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState('');

  const members = useMemo(() => {
    const raw = channel?.state?.members || {};
    return Object.values(raw)
      .map((member) => member.user)
      .filter(Boolean);
  }, [channel]);

  const memberIds = useMemo(() => members.map((member) => member.id), [members]);

  const otherMember = members.find((member) => member.id !== client.userID);
  const conversationName = isTeam
    ? channel?.data?.name || channel?.id || 'this channel'
    : otherMember?.fullName || otherMember?.name || 'this conversation';

  // A direct message needs both people; removing one would leave Stream with an
  // invalid 1:1 channel, so the option is only offered for group conversations.
  const canRemoveMembers = isTeam || members.length > 2;

  const close = useCallback(() => {
    if (isSubmitting) return;
    onClose?.();
  }, [isSubmitting, onClose]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    const name = channelName.trim();
    const nameChanged = isTeam && name && name !== (channel.data?.name || '');

    if (nameChanged && name.length < 2) {
      setError('Channel names need at least 2 characters.');
      return;
    }

    if (!nameChanged && selectedUsers.length === 0) {
      setError(
        isTeam
          ? 'Change the name or add at least one member first.'
          : 'Add at least one member first.',
      );
      return;
    }

    setIsSubmitting(true);

    try {
      if (nameChanged) {
        await channel.update({ name }, { text: `Channel renamed to “${name}”` });
      }

      if (selectedUsers.length > 0) {
        await channel.addMembers(selectedUsers, {
          text: `Added ${selectedUsers.length} member${selectedUsers.length > 1 ? 's' : ''}`,
        });
      }

      onClose?.();
    } catch (updateError) {
      console.error('[RailHub] could not update channel:', updateError);
      setError(
        updateError?.message?.includes('permission')
          ? 'You do not have permission to update this channel.'
          : 'Could not save your changes. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeMember = async (member) => {
    const name = member.fullName || member.name || member.id;

    const ok = await confirm({
      title: `Remove ${name}?`,
      description: `They will lose access to “${conversationName}” immediately.`,
      confirmLabel: 'Remove member',
      tone: 'danger',
    });

    if (!ok) return;

    setRemovingId(member.id);
    setError('');

    try {
      await channel.removeMembers([member.id], { text: `${name} was removed from the channel` });
    } catch (removeError) {
      console.error('[RailHub] could not remove member:', removeError);
      setError('Could not remove that member. Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  const deleteChannel = async () => {
    const ok = await confirm({
      title: `Delete “${conversationName}”?`,
      description: isTeam
        ? 'This removes the channel and every message in it for all members. This cannot be undone.'
        : 'This removes the conversation and every message in it for both of you. This cannot be undone.',
      confirmLabel: isTeam ? 'Delete channel' : 'Delete conversation',
      tone: 'danger',
    });

    if (!ok) return;

    setIsSubmitting(true);

    try {
      await channel.delete();
      setActiveChannel?.(undefined);
      onClose?.();
    } catch (deleteError) {
      console.error('[RailHub] could not delete channel:', deleteError);
      setError(
        deleteError?.message?.includes('permission')
          ? 'Only the channel owner can delete this channel.'
          : 'Could not delete the channel. Please try again.',
      );
      setIsSubmitting(false);
    }
  };

  if (!channel) return null;

  return (
    <>
      <Modal
        open
        onClose={close}
        title={isTeam ? 'Channel settings' : 'Conversation settings'}
        subtitle={isTeam ? 'Rename the channel or manage its members.' : 'Manage this conversation’s members.'}
        size="modal--lg"
        footer={
          <>
            <button
              type="button"
              className="btn btn--danger"
              onClick={deleteChannel}
              disabled={isSubmitting}
            >
              <TrashIcon size={15} />
              <span>{isTeam ? 'Delete channel' : 'Delete conversation'}</span>
            </button>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn--secondary" onClick={close} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" form={FORM_ID} className="btn btn--primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="btn__spinner" aria-hidden="true" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <>
                    <CheckIcon size={15} />
                    <span>Save changes</span>
                  </>
                )}
              </button>
            </div>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={submit} noValidate>
          {error && (
            <div className="alert alert--error" role="alert" style={{ marginBottom: 16 }}>
              <span className="alert__icon">
                <AlertIcon size={16} />
              </span>
              <span>{error}</span>
            </div>
          )}

          {isTeam && (
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field__label" htmlFor="edit-channel-name">
                Channel name
              </label>
              <input
                id="edit-channel-name"
                className="input"
                type="text"
                value={channelName}
                onChange={(event) => setChannelName(event.target.value)}
                maxLength={64}
              />
            </div>
          )}

          <div className="field" style={{ marginBottom: 16 }}>
            <span className="field__label">Current members ({members.length})</span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {members.map((member) => {
                const name = member.fullName || member.name || member.id;
                const isSelf = member.id === client.userID;

                return (
                  <div className="user-item__wrapper" key={member.id} style={{ cursor: 'default' }}>
                    <span className="user-item__name-wrapper">
                      <Avatar name={name} image={member.image} size={30} online={Boolean(member.online)} />
                      <span style={{ minWidth: 0 }}>
                        <span className="user-item__name truncate" style={{ display: 'block' }}>
                          {name}
                          {isSelf && <span className="badge badge--muted" style={{ marginLeft: 6 }}>You</span>}
                        </span>
                        {member.name && (
                          <span className="user-item__handle truncate" style={{ display: 'block' }}>
                            @{member.name}
                          </span>
                        )}
                      </span>
                    </span>

                    {!isSelf && canRemoveMembers && (
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => removeMember(member)}
                        disabled={removingId === member.id}
                        aria-label={`Remove ${name} from the channel`}
                        title={`Remove ${name}`}
                      >
                        <CloseIcon size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="divider" />

          <div className="field">
            <span className="field__label">Add members</span>
            <UserList
              selectedUsers={selectedUsers}
              setSelectedUsers={setSelectedUsers}
              excludeIds={memberIds}
            />
          </div>
        </form>
      </Modal>

      {dialog}
    </>
  );
};

export default EditChannel;
