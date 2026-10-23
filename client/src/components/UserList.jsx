import React, { useEffect, useMemo, useState } from 'react';
import { useChatContext } from 'stream-chat-react';

import Avatar from './ui/Avatar';
import { UserListSkeleton } from './ui/Skeleton';
import { filterDirectory, loadDirectory } from '../lib/directory';
import { CheckIcon, SearchIcon } from './ui/icons';

const UserItem = ({ user, selected, onToggle }) => {
  const name = user.fullName || user.name || user.id;

  return (
    <button
      type="button"
      className="user-item__wrapper"
      aria-pressed={selected}
      onClick={() => onToggle(user.id)}
    >
      <span className="user-item__name-wrapper">
        <Avatar name={name} image={user.image} size={34} online={Boolean(user.online)} />
        <span style={{ minWidth: 0 }}>
          <span className="user-item__name truncate" style={{ display: 'block' }}>
            {name}
          </span>
          {user.name && user.name !== user.fullName && (
            <span className="user-item__handle truncate" style={{ display: 'block' }}>
              @{user.name}
            </span>
          )}
        </span>
      </span>

      <span
        className={`user-item__checkbox${selected ? ' selected' : ''}`}
        aria-hidden="true"
      >
        {selected && <CheckIcon size={12} strokeWidth={3} />}
      </span>
    </button>
  );
};

/**
 * Member picker used by the create/edit channel dialogs.
 *
 * The workspace directory is loaded once and filtered in memory, which makes
 * typing instant and matches display names as well as handles.
 */
const UserList = ({ selectedUsers = [], setSelectedUsers, excludeIds = [] }) => {
  const { client } = useChatContext();

  const [directory, setDirectory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!client?.userID) return undefined;

    let cancelled = false;

    setLoading(true);
    setError('');

    loadDirectory(client)
      .then((users) => {
        if (!cancelled) setDirectory(users);
      })
      .catch((queryError) => {
        if (cancelled) return;
        console.error('[RailHub] could not load directory:', queryError);
        setError('Could not load team members. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [client]);

  const visibleUsers = useMemo(() => {
    const excluded = new Set(excludeIds);
    return filterDirectory(directory, searchTerm).filter((user) => !excluded.has(user.id));
  }, [directory, excludeIds, searchTerm]);

  const toggleUser = (userId) => {
    if (!setSelectedUsers) return;

    setSelectedUsers((current) => {
      const list = current || [];
      return list.includes(userId)
        ? list.filter((id) => id !== userId)
        : [...list, userId];
    });
  };

  return (
    <div className="user-list__container">
      <div className="user-list__search">
        <div className="input-group">
          <span className="input-group__icon" aria-hidden="true">
            <SearchIcon size={15} />
          </span>
          <input
            type="search"
            className="input"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search team members"
            aria-label="Search team members"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="user-list__header">
        <span>Team member</span>
        <span>{selectedUsers.length} selected</span>
      </div>

      <div className="user-list__scroll">
        {loading ? (
          <UserListSkeleton rows={5} />
        ) : error ? (
          <p className="user-list__message" role="alert">
            {error}
          </p>
        ) : visibleUsers.length === 0 ? (
          <p className="user-list__message">
            {searchTerm.trim() ? `No one matches “${searchTerm.trim()}”.` : 'No other team members yet.'}
          </p>
        ) : (
          visibleUsers.map((user) => (
            <UserItem
              key={user.id}
              user={user}
              selected={selectedUsers.includes(user.id)}
              onToggle={toggleUser}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default UserList;
