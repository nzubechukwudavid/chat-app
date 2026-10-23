import React, { useCallback, useState } from 'react';
import { useChatContext } from 'stream-chat-react';

import UserList from './UserList';
import Modal from './ui/Modal';
import { slugify, shortId } from '../lib/format';
import { AlertIcon, PlusIcon } from './ui/icons';

const FORM_ID = 'create-channel-form';

/**
 * Create-channel dialog.
 *
 * Replaces the old full-pane wizard: the conversation list stays visible
 * behind a modal, so context is never lost while naming a channel or picking
 * members.
 */
const CreateChannel = ({ createType = 'team', onClose }) => {
  const { client, setActiveChannel } = useChatContext();

  const isTeam = createType === 'team';

  const [channelName, setChannelName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState(() =>
    client?.userID ? [client.userID] : [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const close = useCallback(() => {
    if (isSubmitting) return;
    onClose?.();
  }, [isSubmitting, onClose]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    const name = channelName.trim();

    if (isTeam && !name) {
      setError('Give the channel a name, for example “rolling-stock”.');
      return;
    }

    const others = selectedUsers.filter((id) => id !== client.userID);
    if (others.length === 0) {
      setError('Select at least one team member to include.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Give team channels an explicit, readable id. Stream otherwise derives
      // one from the member list (`!members-…`), which can collide with a 1:1
      // messaging channel created for the same people.
      const channel = isTeam
        ? client.channel('team', `${slugify(name)}-${shortId()}`, {
            name,
            members: selectedUsers,
          })
        : client.channel('messaging', { members: selectedUsers });

      await channel.watch();
      setActiveChannel(channel);
      onClose?.();
    } catch (createError) {
      console.error('[RailHub] could not create channel:', createError);
      setError(
        createError?.message?.includes('permission')
          ? 'You do not have permission to create this channel.'
          : 'Could not create the channel. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={close}
      title={isTeam ? 'Create a channel' : 'Start a direct message'}
      subtitle={
        isTeam
          ? 'Channels are shared spaces for a corridor, depot or crew.'
          : 'Pick the people you want in this private conversation.'
      }
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={close} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            type="submit"
            form={FORM_ID}
            className="btn btn--primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="btn__spinner" aria-hidden="true" />
                <span>Creating…</span>
              </>
            ) : (
              <>
                <PlusIcon size={15} />
                <span>{isTeam ? 'Create channel' : 'Start conversation'}</span>
              </>
            )}
          </button>
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
            <label className="field__label" htmlFor="channel-name">
              Channel name
            </label>
            <input
              id="channel-name"
              className="input"
              type="text"
              value={channelName}
              onChange={(event) => setChannelName(event.target.value)}
              placeholder="e.g. operations-lagos, rolling-stock"
              maxLength={64}
              autoFocus
              aria-describedby="channel-name-hint"
            />
            <span className="field__hint" id="channel-name-hint">
              Lowercase words joined by dashes keep channels easy to find.
            </span>
          </div>
        )}

        <div className="field">
          <span className="field__label">Members</span>
          <UserList selectedUsers={selectedUsers} setSelectedUsers={setSelectedUsers} />
        </div>
      </form>
    </Modal>
  );
};

export default CreateChannel;
