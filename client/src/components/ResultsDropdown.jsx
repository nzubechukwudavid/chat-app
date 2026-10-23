import React from 'react';

import Avatar from './ui/Avatar';
import { Skeleton } from './ui/Skeleton';
import { SearchIcon } from './ui/icons';

const ResultRow = ({ item, focused, onSelect, onHover }) => {
  const id = `search-result-${item.key}`;

  return (
    <div
      id={id}
      role="option"
      aria-selected={focused}
      className={`channel-search__result-container${
        focused ? ' channel-search__result-container__focused' : ''
      }`}
      onMouseEnter={() => onHover?.(item.key)}
      // `onMouseDown` rather than `onClick` so the input does not blur and
      // close the dropdown before the selection registers.
      onMouseDown={(event) => {
        event.preventDefault();
        onSelect?.(item);
      }}
    >
      {item.kind === 'channel' ? (
        <span className="result-hashtag" aria-hidden="true">
          #
        </span>
      ) : (
        <Avatar
          name={item.label}
          image={item.image}
          size={28}
          online={Boolean(item.online)}
          className="channel-search__result-avatar"
        />
      )}

      <span className="channel-search__result-user">
        <span className="channel-search__result-name truncate">{item.label}</span>
        {item.sublabel && (
          <span className="channel-search__result-handle truncate">{item.sublabel}</span>
        )}
      </span>
    </div>
  );
};

/**
 * Presentational search results.
 *
 * All keyboard handling lives in `ChannelSearch`; this component only renders
 * the groups and marks the focused row so `aria-activedescendant` can point at
 * it.
 */
const ResultsDropdown = ({ groups = [], focusedId, loading = false, onSelect, onHover, listId }) => {
  const hasResults = groups.some((group) => group.items.length > 0);

  return (
    <div className="channel-search__results" id={listId} role="listbox" aria-label="Search results">
      {loading && !hasResults && (
        <>
          <div className="channel-search__results-header">
            <span>Searching</span>
          </div>
          <div style={{ padding: '4px 10px 10px' }}>
            <Skeleton height={34} radius={8} style={{ marginBottom: 6 }} />
            <Skeleton height={34} radius={8} />
          </div>
        </>
      )}

      {!loading && !hasResults && (
        <p className="channel-search__empty">
          <SearchIcon size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} />
          No channels or people match that search.
        </p>
      )}

      {groups.map((group) =>
        group.items.length === 0 ? null : (
          <div key={group.id} role="group" aria-label={group.label}>
            <p className="channel-search__results-header">{group.label}</p>
            {group.items.map((item) => (
              <ResultRow
                key={item.key}
                item={item}
                focused={focusedId === item.key}
                onSelect={onSelect}
                onHover={onHover}
              />
            ))}
          </div>
        ),
      )}

      {hasResults && (
        <p className="channel-search__hint" aria-hidden="true">
          <span className="kbd">↑</span>
          <span className="kbd">↓</span>
          to move
          <span className="kbd">Enter</span>
          to open
          <span className="kbd">Esc</span>
          to close
        </p>
      )}
    </div>
  );
};

export default ResultsDropdown;
