import React, { useMemo } from 'react';
import { useChatContext } from 'stream-chat-react';

import Avatar from './ui/Avatar';
import { formatRelative } from '../lib/format';

const displayName = (user) => user?.fullName || user?.name || user?.id || 'Unknown';

/**
 * One row in the channel sidebar.
 *
 * Rendered from the SDK's `Preview` slot, so it receives the live `channel`
 * object and re-renders on every relevant event (new message, presence,
 * read state). A real `<button>` keeps keyboard and screen-reader behaviour
 * correct without extra ARIA plumbing.
 */
const TeamChannelPreview = ({ channel, active, type, onCloseDrawer }) => {
  const { client, setActiveChannel } = useChatContext();

  const isDirect = type === 'messaging';

  const { label, image, online, badge } = useMemo(() => {
    const members = Object.values(channel?.state?.members || {})
      .map((member) => member.user)
      .filter((user) => user && user.id !== client?.userID);

    const other = members[0];

    if (!isDirect) {
      return {
        label: channel?.data?.name || channel?.id || 'Channel',
        image: null,
        online: false,
        badge: members.length || channel?.state?.member_count || 0,
      };
    }

    return {
      label: displayName(other),
      image: other?.image,
      online: Boolean(other?.online),
      badge: members.length,
    };
  }, [channel, client?.userID, isDirect]);

  const unread = channel?.countUnread?.() || 0;
  const lastAt = channel?.state?.last_message_at || channel?.data?.last_message_at;
  const timestamp = formatRelative(lastAt);

  const select = () => {
    setActiveChannel(channel);
    onCloseDrawer?.();
  };

  return (
    <button
      type="button"
      className={`channel-preview__wrapper${
        active ? ' channel-preview__wrapper__selected' : ''
      }${unread ? ' channel-preview__wrapper--unread' : ''}`}
      onClick={select}
      aria-current={active ? 'true' : undefined}
      aria-label={`${isDirect ? 'Direct message with' : 'Channel'} ${label}${
        unread ? `, ${unread} unread` : ''
      }`}
    >
      <span className="channel-preview__item">
        {isDirect ? (
          <span className="channel-preview__identity">
            <Avatar name={label} image={image} size={26} online={online} />
          </span>
        ) : (
          <span className="channel-preview__hash" aria-hidden="true">
            #
          </span>
        )}

        <span className="channel-preview__label">{label}</span>

        <span className="channel-preview__meta">
          {timestamp && <span className="channel-preview__time">{timestamp}</span>}
          {unread > 0 ? (
            <span className="badge">{unread > 99 ? '99+' : unread}</span>
          ) : isDirect && badge > 1 ? (
            <span className="badge badge--muted">{badge}</span>
          ) : null}
        </span>
      </span>
    </button>
  );
};

export default TeamChannelPreview;
