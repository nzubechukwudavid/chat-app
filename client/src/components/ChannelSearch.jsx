import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChatContext } from 'stream-chat-react';

import ResultsDropdown from './ResultsDropdown';
import { filterDirectory, loadDirectory } from '../lib/directory';
import { CloseIcon, SearchIcon } from './ui/icons';

const LIST_ID = 'channel-search-results';
const DEBOUNCE_MS = 220;

const RESULT_LIMIT = 8;

/** Finds an existing 1:1 channel or creates one, then opens it. */
const openDirectMessage = async (client, setActiveChannel, user) => {
  const existing = await client.queryChannels(
    { type: 'messaging', members: { $eq: [client.userID, user.id] } },
    { last_message_at: -1 },
    { limit: 1, watch: true, state: true },
  );

  if (existing[0]) {
    setActiveChannel(existing[0]);
    return;
  }

  const channel = client.channel('messaging', { members: [client.userID, user.id] });
  await channel.watch();
  setActiveChannel(channel);
};

const ChannelSearch = ({ onNavigate }) => {
  const { client, setActiveChannel } = useChatContext();

  const [query, setQuery] = useState('');
  const [directory, setDirectory] = useState([]);
  const [results, setResults] = useState({ channels: [], users: [] });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [focusedKey, setFocusedKey] = useState(null);

  const requestRef = useRef(0);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    setFocusedKey(null);
  }, []);

  // Dismiss results on any click outside the search widget.
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) close();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open, close]);

  useEffect(() => {
    let cancelled = false;

    loadDirectory(client)
      .then((users) => {
        if (!cancelled) setDirectory(users);
      })
      .catch((error) => {
        console.error('[RailHub] could not load the team directory:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [client]);

  useEffect(() => {
    const term = query.trim();

    if (!term) {
      requestRef.current += 1;
      setResults({ channels: [], users: [] });
      setLoading(false);
      setFocusedKey(null);
      return undefined;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    setLoading(true);
    setOpen(true);

    const timer = setTimeout(async () => {
      try {
        const channels = await client.queryChannels(
          {
            type: 'team',
            members: { $in: [client.userID] },
            name: { $autocomplete: term },
          },
          { last_message_at: -1 },
          { limit: RESULT_LIMIT, state: true, watch: true },
        );

        if (requestRef.current !== requestId) return;

        // People are matched locally against the cached directory, so display
        // names work even though Stream cannot autocomplete custom fields.
        setResults({
          channels,
          users: filterDirectory(directory, term).slice(0, RESULT_LIMIT),
        });
        setFocusedKey(null);
      } catch (error) {
        if (requestRef.current !== requestId) return;
        console.error('[RailHub] search failed:', error);
        setResults({ channels: [], users: [] });
      } finally {
        if (requestRef.current === requestId) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [client, directory, query]);

  const groups = useMemo(
    () => [
      {
        id: 'channels',
        label: 'Platforms',
        items: results.channels.map((channel) => ({
          key: `channel-${channel.id}`,
          kind: 'channel',
          channel,
          label: channel.data?.name || channel.id,
          sublabel: channel.state?.member_count
            ? `${channel.state.member_count} member${channel.state.member_count === 1 ? '' : 's'}`
            : '',
        })),
      },
      {
        id: 'people',
        label: 'People',
        items: results.users.map((user) => ({
          key: `user-${user.id}`,
          kind: 'user',
          user,
          label: user.fullName || user.name || user.id,
          sublabel: user.name ? `@${user.name}` : '',
          image: user.image,
          online: user.online,
        })),
      },
    ],
    [results],
  );

  const flatItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  const select = useCallback(
    async (item) => {
      if (!item) return;

      close();

      try {
        if (item.kind === 'channel') {
          setActiveChannel(item.channel);
        } else {
          await openDirectMessage(client, setActiveChannel, item.user);
        }

        setQuery('');
        onNavigate?.();
      } catch (error) {
        console.error('[RailHub] could not open conversation:', error);
      }
    },
    [client, close, onNavigate, setActiveChannel],
  );

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      inputRef.current?.blur();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!flatItems.length) return;

      event.preventDefault();
      setOpen(true);

      const currentIndex = flatItems.findIndex((item) => item.key === focusedKey);
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex =
        currentIndex === -1
          ? delta === 1
            ? 0
            : flatItems.length - 1
          : (currentIndex + delta + flatItems.length) % flatItems.length;

      setFocusedKey(flatItems[nextIndex].key);
      return;
    }

    if (event.key === 'Enter') {
      if (!open) return;
      event.preventDefault();

      const nextItem =
        flatItems.find((item) => item.key === focusedKey) || flatItems[0] || null;

      if (nextItem) select(nextItem);
    }
  };

  const showDropdown = open && query.trim().length > 0;

  return (
    <div className="channel-search__container" ref={containerRef}>
      <div className="channel-search__input__wrapper">
        <span className="channel-search__input__icon" aria-hidden="true">
          <SearchIcon size={15} />
        </span>

        <input
          ref={inputRef}
          type="text"
          className="channel-search__input__text"
          placeholder="Search platforms and people"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => query.trim() && setOpen(true)}
          role="combobox"
          aria-label="Search platforms and people"
          aria-expanded={showDropdown}
          aria-controls={LIST_ID}
          aria-autocomplete="list"
          aria-activedescendant={focusedKey ? `search-result-${focusedKey}` : undefined}
          autoComplete="off"
          spellCheck="false"
        />

        {query && (
          <button
            type="button"
            className="channel-search__input__clear"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <CloseIcon size={14} />
          </button>
        )}
      </div>

      {showDropdown && (
        <ResultsDropdown
          groups={groups}
          focusedId={focusedKey}
          loading={loading}
          onSelect={select}
          onHover={setFocusedKey}
          listId={LIST_ID}
        />
      )}
    </div>
  );
};

export default ChannelSearch;
