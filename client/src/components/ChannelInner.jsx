import React from 'react';
import {
  MessageInput,
  MessageList,
  Thread,
  Window,
  useChannelStateContext,
  useChatContext,
} from 'stream-chat-react';

import Avatar from './ui/Avatar';
import DispatchMessage from './DispatchMessage';
import StationClock from './ui/StationClock';
import { MenuIcon, SendIcon, SettingsIcon } from './ui/icons';
import { serviceCode } from '../lib/lines';

/**
 * Circular send button matching the composer.
 *
 * The SDK's default icon is a small triangle; this version is deliberately
 * larger and inherits the brand gradient from `.nrc-send-btn`.
 */
export const CustomSendButton = ({ sendMessage, disabled }) => (
  <button
    type="button"
    onClick={sendMessage}
    disabled={disabled}
    className="nrc-send-btn"
    title="Send message (Enter)"
    aria-label="Send message"
  >
    <SendIcon size={18} strokeWidth={2.2} />
  </button>
);

const initialsName = (user) => user?.fullName || user?.name || user?.id || 'Rail staff';

const TeamChannelHeader = ({ onOpenDrawer, onStartEdit }) => {
  const { channel, watcher_count: watcherCount } = useChannelStateContext();
  const { client } = useChatContext();

  const isDirect = channel?.type === 'messaging';

  const others = Object.values(channel?.state?.members || {})
    .map((member) => member.user)
    .filter((user) => user && user.id !== client.userID);

  const other = others[0];
  const additional = Math.max(0, others.length - 1);

  const onlineCount = watcherCount || 0;

  const title = isDirect
    ? initialsName(other)
    : channel?.data?.name || channel?.data?.id || 'Channel';

  const subtitle = isDirect
    ? other?.online
      ? 'Online now'
      : 'Direct message'
    : `${channel?.state?.member_count || 0} member${
        (channel?.state?.member_count || 0) === 1 ? '' : 's'
      }`;

  return (
    <header className="team-channel-header__container">
      <div className="team-channel-header__left">
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={onOpenDrawer}
          title="Open channels"
          aria-label="Open channels and direct messages"
        >
          <MenuIcon size={18} />
        </button>

        {isDirect ? (
          <span className="team-channel-header__icon" style={{ background: 'transparent', padding: 0 }}>
            <Avatar
              name={initialsName(other)}
              image={other?.image}
              size={36}
              online={Boolean(other?.online)}
            />
          </span>
        ) : (
          <span className="team-channel-header__icon" aria-hidden="true">
            #
          </span>
        )}

        <span style={{ minWidth: 0 }}>
          <h1
            key={channel?.cid}
            className="team-channel-header__name truncate station-flap"
          >
            {title}
            {isDirect && additional > 0 && (
              <span className="team-channel-header__subtitle"> +{additional}</span>
            )}
          </h1>
          <span className="team-channel-header__meta">
            <span className="team-channel-header__subtitle">
              {other?.name && isDirect ? `@${other.name}` : subtitle}
            </span>
            <span className="team-channel-header__code" title="Service number">
              {serviceCode(channel)}
            </span>
          </span>
        </span>
      </div>

      <div className="team-channel-header__right">
        <StationClock className="team-channel-header__clock" />

        {onlineCount > 0 && (
          <span className="pill" title={`${onlineCount} watching this channel`}>
            <span className="pill__dot" aria-hidden="true" />
            {onlineCount} online
          </span>
        )}

        <button
          type="button"
          className="team-channel-header__settings"
          onClick={onStartEdit}
          title="Channel settings"
          aria-label="Open channel settings"
        >
          <SettingsIcon size={16} />
        </button>
      </div>
    </header>
  );
};

const ChannelInner = ({ onOpenDrawer, onStartEdit }) => (
  <div className="channel-inner__wrapper">
    <Window>
      <TeamChannelHeader onOpenDrawer={onOpenDrawer} onStartEdit={onStartEdit} />
      <MessageList Message={DispatchMessage} />
      <MessageInput audioRecordingEnabled SendButton={CustomSendButton} focus />
    </Window>
    <Thread />
  </div>
);

export default ChannelInner;
