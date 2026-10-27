import React from 'react';

import { ChannelListSkeleton } from './ui/Skeleton';
import { ChevronDownIcon, PlusIcon } from './ui/icons';

/**
 * Group header for one channel family ("Channels" or "Direct messages").
 *
 * The group can be collapsed, which keeps long lists manageable on a phone.
 * `children` is the preview list handed over by the Stream SDK, so it already
 * contains the paginator - we must render it untouched.
 */
const TeamChannelList = ({
  children,
  error = false,
  loading = false,
  type = 'team',
  collapsed = false,
  onToggleGroup,
  setIsCreating,
  setCreateType,
  setIsEditing,
}) => {
  const isTeam = type === 'team';
  const title = isTeam ? 'Platforms' : 'Bay platforms';
  const groupId = `channel-group-${type}`;

  const addChannel = () => {
    setCreateType?.(isTeam ? 'team' : 'messaging');
    setIsEditing?.(false);
    setIsCreating?.(true);
  };

  return (
    <section className="team-channel-list" aria-labelledby={groupId}>
      <div className="team-channel-list__header">
        <button
          type="button"
          className="team-channel-list__header__title"
          onClick={() => onToggleGroup?.(type)}
          aria-expanded={!collapsed}
          aria-controls={groupId}
          title={collapsed ? `Show ${title.toLowerCase()}` : `Hide ${title.toLowerCase()}`}
        >
          <ChevronDownIcon
            size={13}
            style={{
              transform: collapsed ? 'rotate(-90deg)' : 'none',
              transition: 'transform 150ms ease',
            }}
          />
          {title}
        </button>

        <button
          type="button"
          className="team-channel-list__add"
          onClick={addChannel}
          title={isTeam ? 'New channel' : 'New direct message'}
          aria-label={isTeam ? 'Create a new channel' : 'Start a new direct message'}
        >
          <PlusIcon size={14} />
        </button>
      </div>

      <div id={groupId} hidden={collapsed}>
        {error ? (
          <p className="team-channel-list__message" role="alert">
            Could not load {isTeam ? 'channels' : 'direct messages'}. Check your connection.
          </p>
        ) : loading ? (
          <ChannelListSkeleton rows={4} />
        ) : (
          children
        )}
      </div>
    </section>
  );
};

export default TeamChannelList;
