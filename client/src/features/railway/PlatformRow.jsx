import React from 'react';

import Avatar from '../../components/ui/Avatar';
import { formatRelative } from '../../lib/format';

export const directName = (line) => {
  const other = line.members[0];
  return other?.fullName || other?.name || line.name || 'DM';
};

export const directHandle = (line) => {
  const other = line.members[0];
  return other?.name && other.name !== other.fullName ? `@${other.name}` : 'DM';
};

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

/**
 * A parked train, built from real unread pressure.
 *
 * Idle platforms carry one coach. Waiting platforms grow to three, so the
 * length of the train is another readable representation of the unread count.
 */
const TrainMark = ({ unread, direct }) => {
  const coaches = direct ? 1 : unread > 0 ? 1 + Math.min(2, unread) : 1;
  const width = 40 + coaches * 36;

  return (
    <span
      className={`platform__train${unread ? ' platform__train--waiting' : ''}`}
      style={{ '--train-width': `${Math.min(100, width * 0.72)}px` }}
      aria-hidden="true"
    >
      <svg viewBox={`0 0 ${width} 30`} preserveAspectRatio="xMidYMid meet" focusable="false">
        <g className="train__loco">
          <rect x="2" y="8" width="33" height="15" rx="4" className="train__body" />
          <rect x="7" y="3" width="19" height="7" rx="2" className="train__roof" />
          <rect x="8" y="10" width="8" height="6" rx="1" className="train__window" />
          <rect x="19" y="10" width="7" height="6" rx="1" className="train__window" />
          <rect x="14" y="1" width="4" height="4" rx="1" className="train__chimney" />
          <circle cx="28" cy="17.5" r="1.6" className="train__lamp" />
          <circle cx="10" cy="25" r="4" className="train__wheel" />
          <circle cx="27" cy="25" r="4" className="train__wheel" />
        </g>

        {Array.from({ length: coaches }, (_, index) => {
          const x = 42 + index * 36;
          return (
            <g className="train__coach" key={`coach-${index}`}>
              <rect x={x} y="9" width="30" height="14" rx="3" className="train__body" />
              <rect x={x + 4} y="12" width="6" height="5" rx="1" className="train__window" />
              <rect x={x + 12} y="12" width="6" height="5" rx="1" className="train__window" />
              <rect x={x + 20} y="12" width="6" height="5" rx="1" className="train__window" />
              <circle cx={x + 7} cy="25" r="3.2" className="train__wheel" />
              <circle cx={x + 23} cy="25" r="3.2" className="train__wheel" />
            </g>
          );
        })}
      </svg>
    </span>
  );
};

const PlatformRow = ({ line, direct = false, number, typing, onOpen }) => {
  const title = direct ? directName(line) : line.name;
  const status = typing ? 'typing' : line.unread ? 'waiting' : line.online ? 'clear' : 'idle';
  const group = direct ? 'DM' : 'Line';
  const activity = typing
    ? `, ${typing.userName} is typing`
    : line.unread
      ? `, ${plural(line.unread, 'message', 'messages')} waiting`
      : '';

  return (
    <li>
      <button
        type="button"
        className={`platform platform--${status}${direct ? ' platform--bay' : ''}`}
        onClick={() => onOpen(line.channel)}
        aria-label={`${group} ${number}, ${title}${activity}`}
      >
        <span className="platform__number" aria-hidden="true">
          <small>{direct ? 'DM' : 'LINE'}</small>
          <strong>{number}</strong>
        </span>

        <span className="platform__signal" aria-hidden="true">
          <i className="platform__signal-clear" />
          <i className="platform__signal-wait" />
        </span>

        <span className="platform__body">
          <span className="platform__heading">
            {direct ? (
              <span className="platform__avatar">
                <Avatar
                  name={title}
                  image={line.members[0]?.image}
                  size={24}
                  online={Boolean(line.members[0]?.online)}
                />
              </span>
            ) : null}
            <span className="platform__name">{title}</span>
            <span className="platform__code">{direct ? 'DM' : line.code}</span>
          </span>
          <span className="platform__dispatch">
            {typing ? (
              <span className="platform__typing">{typing.userName} is typing…</span>
            ) : (
              <>
                {direct && line.members[0]?.online ? (
                  <span className="platform__online">Online · </span>
                ) : null}
                {line.lastText}
              </>
            )}
          </span>
        </span>

        <TrainMark unread={line.unread} direct={direct} />

        <span className="platform__meta">
          <span className="platform__time">{formatRelative(line.lastAt) || '—'}</span>
          {line.unread > 0 ? (
            <span className="platform__badge">{line.unread > 99 ? '99+' : line.unread}</span>
          ) : (
            <span className="platform__crew">
              {direct
                ? directHandle(line)
                : plural(line.memberCount + 1, 'member', 'members')}
            </span>
          )}
        </span>

        <span className="platform__arrow" aria-hidden="true">
          ›
        </span>
      </button>
    </li>
  );
};

export default PlatformRow;
