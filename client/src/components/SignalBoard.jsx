import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChatContext } from 'stream-chat-react';

import Avatar from './ui/Avatar';
import StationClock from './ui/StationClock';
import { BroadcastIcon, MenuIcon, PlusIcon, TrainIcon, UsersIcon } from './ui/icons';
import { formatRelative } from '../lib/format';
import {
  boardDate,
  byActivity,
  describeLine,
  watchLabel,
} from '../lib/lines';

const TEAM_FILTER = (userId) => ({ type: 'team', members: { $in: [userId] } });
const DIRECT_FILTER = (userId) => ({ type: 'messaging', members: { $in: [userId] } });
const QUERY_OPTIONS = { state: true, watch: true, presence: true, limit: 50 };

const directName = (line) => {
  const other = line.members[0];
  return other?.fullName || other?.name || line.name || 'Direct line';
};

const directHandle = (line) => {
  const other = line.members[0];
  return other?.name && other.name !== other.fullName ? `@${other.name}` : 'Direct line';
};

const Skeleton = () => (
  <div className="board__skeleton" aria-hidden="true">
    {[0, 1, 2].map((row) => (
      <span className="board__skeleton-row" key={row}>
        <i />
        <b />
        <em />
      </span>
    ))}
  </div>
);

const LineRow = ({ line, direct = false, onOpen }) => {
  const title = direct ? directName(line) : line.name;

  return (
    <li>
      <button
        type="button"
        className={`board-row${line.unread ? ' board-row--signal' : ''}`}
        onClick={() => onOpen(line.channel)}
        aria-label={`Open ${direct ? 'direct line with ' : 'line '}${title}${
          line.unread ? `, ${line.unread} unread` : ''
        }`}
      >
        {direct ? (
          <span className="board-row__avatar">
            <Avatar
              name={title}
              image={line.members[0]?.image}
              size={30}
              online={Boolean(line.members[0]?.online)}
            />
          </span>
        ) : (
          <span className="board-row__node" aria-hidden="true">
            <i />
          </span>
        )}

        <span className="board-row__body">
          <span className="board-row__top">
            <span className="board-row__name">{title}</span>
            <span className="board-row__code">{direct ? 'DIRECT' : line.code}</span>
          </span>
          <span className="board-row__dispatch">
            {direct && line.members[0]?.online ? (
              <span className="board-row__online">On watch · </span>
            ) : null}
            {line.lastText}
          </span>
        </span>

        <span className="board-row__meta">
          <span className="board-row__time">{formatRelative(line.lastAt) || '—'}</span>
          {line.unread > 0 ? (
            <span className="board-row__badge">{line.unread > 99 ? '99+' : line.unread}</span>
          ) : (
            <span className="board-row__crew">
              {direct ? directHandle(line) : `${line.memberCount + 1} crew`}
            </span>
          )}
        </span>

        <span className="board-row__chevron" aria-hidden="true">
          ›
        </span>
      </button>
    </li>
  );
};

/**
 * The operations board.
 *
 * This is the landing surface of the app: the workspace as a live network
 * rather than an empty chat pane. Every number on it is derived from Stream
 * state - unread counts, last dispatch, membership and presence - so the board
 * can never show invented operational data.
 */
const SignalBoard = ({ onOpenDrawer, onStartCreate, onBroadcast }) => {
  const { client, setActiveChannel } = useChatContext();
  const [teamLines, setTeamLines] = useState([]);
  const [directLines, setDirectLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadedRef = useRef(false);
  const requestRef = useRef(0);
  const timerRef = useRef(null);

  // Re-render every half minute so relative times, the watch label and the
  // date stay truthful without a per-second timer on a data-heavy screen.
  const [, setMinute] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setMinute((value) => value + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    if (!client?.userID) return;

    const request = requestRef.current + 1;
    requestRef.current = request;

    try {
      const [team, direct] = await Promise.all([
        client.queryChannels(TEAM_FILTER(client.userID), { last_message_at: -1 }, QUERY_OPTIONS),
        client.queryChannels(DIRECT_FILTER(client.userID), { last_message_at: -1 }, QUERY_OPTIONS),
      ]);

      if (request !== requestRef.current) return;

      setTeamLines(team.map((channel) => describeLine(channel, client.userID)).sort(byActivity));
      setDirectLines(direct.map((channel) => describeLine(channel, client.userID)).sort(byActivity));
      setError('');
    } catch (loadError) {
      if (request !== requestRef.current) return;
      console.error('[RailHub] board refresh failed:', loadError);
      setError('The live board could not refresh. Check your connection.');
    } finally {
      if (request === requestRef.current) {
        loadedRef.current = true;
        setLoading(false);
      }
    }
  }, [client]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the board live. Events are coalesced for a moment so a burst of
  // dispatches (or read receipts) costs one refresh instead of ten.
  useEffect(() => {
    if (!client) return undefined;

    const schedule = () => {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(load, 350);
    };

    const events = [
      'message.new',
      'message.read',
      'notification.message_new',
      'notification.added_to_channel',
      'notification.removed_from_channel',
      'channel.deleted',
      'channel.updated',
    ];

    events.forEach((event) => client.on(event, schedule));

    return () => {
      window.clearTimeout(timerRef.current);
      events.forEach((event) => client.off(event, schedule));
    };
  }, [client, load]);

  const openLine = useCallback(
    (channel) => {
      setActiveChannel?.(channel);
    },
    [setActiveChannel],
  );

  const onWatch = useMemo(() => {
    const crew = new Map();
    [...teamLines, ...directLines].forEach((line) => {
      line.members.forEach((member) => {
        if (member?.id && member.online) crew.set(member.id, member);
      });
    });
    return crew.size;
  }, [teamLines, directLines]);

  const unreadTotal = useMemo(
    () => [...teamLines, ...directLines].reduce((total, line) => total + line.unread, 0),
    [teamLines, directLines],
  );

  const watch = watchLabel();
  const date = boardDate();

  return (
    <div className="channel__container board-shell">
      <div className="board">
        <header className="board__header">
          <button
            type="button"
            className="mobile-menu-toggle board__menu"
            onClick={onOpenDrawer}
            title="Open lines"
            aria-label="Open lines and direct messages"
          >
            <MenuIcon size={18} />
          </button>

          <div className="board__identity">
            <span className="board__mark" aria-hidden="true">
              <TrainIcon size={22} />
            </span>
            <div>
              <p className="board__eyebrow">NRC Rail Hub · Signal Box</p>
              <h1 className="board__title">Operations board</h1>
            </div>
          </div>

          <div className="board__clock-block">
            <StationClock className="board__clock" />
            <p className="board__watch">
              <span className="board__watch-led" aria-hidden="true" />
              {watch}
              <span className="board__watch-sep" aria-hidden="true">
                /
              </span>
              {date}
            </p>
          </div>
        </header>

        <p className="board__status">
          <span>
            <strong>{teamLines.length}</strong> {teamLines.length === 1 ? 'line' : 'lines'} in
            service
          </span>
          <span className="board__status-sep" aria-hidden="true">
            ·
          </span>
          <span>
            <strong>{onWatch}</strong> crew on watch
          </span>
          <span className="board__status-sep" aria-hidden="true">
            ·
          </span>
          <span className={unreadTotal ? 'board__status-signal' : undefined}>
            {unreadTotal ? `${unreadTotal} signal${unreadTotal === 1 ? '' : 's'} waiting` : 'All quiet'}
          </span>
        </p>

        {error ? (
          <div className="board__notice" role="alert">
            <span>{error}</span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={load}>
              Retry
            </button>
          </div>
        ) : null}

        {teamLines.length > 0 ? (
          <section className="board__network" aria-label="Lines in service">
            <div className="board__network-head">
              <span>Network</span>
              <span className="board__network-hint">Tap a stop to enter the line</span>
            </div>

            <ol className="board__schematic">
              {teamLines.map((line) => (
                <li key={line.cid}>
                  <button
                    type="button"
                    className={`board__stop${line.unread ? ' board__stop--signal' : ''}`}
                    onClick={() => openLine(line.channel)}
                    aria-label={`Open ${line.name}${line.unread ? `, ${line.unread} unread` : ''}`}
                  >
                    <span className="board__stop-node" aria-hidden="true" />
                    <span className="board__stop-code">{line.code.replace('SVC ', '')}</span>
                    <span className="board__stop-name">{line.name}</span>
                    {line.unread > 0 ? (
                      <span className="board__stop-badge">{line.unread > 99 ? '99+' : line.unread}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <div className="board__grid">
          <section className="board__panel board__panel--lines" aria-labelledby="board-lines">
            <div className="board__panel-head">
              <h2 id="board-lines">In service</h2>
              <span>{teamLines.length} lines</span>
            </div>

            {loading ? (
              <Skeleton />
            ) : teamLines.length ? (
              <ul className="board__rows">
                {teamLines.map((line) => (
                  <LineRow key={line.cid} line={line} onOpen={openLine} />
                ))}
              </ul>
            ) : (
              <div className="board__empty">
                <p className="board__empty-title">No lines in service yet</p>
                <p className="board__empty-text">
                  Open a channel to give the network its first route. Everyone you add can
                  coordinate there.
                </p>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => onStartCreate?.('team')}
                >
                  <PlusIcon size={14} /> Create the first line
                </button>
              </div>
            )}
          </section>

          <aside className="board__side">
            <button type="button" className="board__broadcast" onClick={onBroadcast}>
              <span className="board__broadcast-icon" aria-hidden="true">
                <BroadcastIcon size={22} />
              </span>
              <span className="board__broadcast-copy">
                <strong>All-stations broadcast</strong>
                <small>One dispatch, every line on the network</small>
              </span>
              <span className="board__broadcast-arrow" aria-hidden="true">
                →
              </span>
            </button>

            <section className="board__panel board__panel--direct" aria-labelledby="board-direct">
              <div className="board__panel-head">
                <h2 id="board-direct">Direct lines</h2>
                <span>{directLines.length}</span>
              </div>

              {loading ? (
                <Skeleton />
              ) : directLines.length ? (
                <ul className="board__rows board__rows--direct">
                  {directLines.map((line) => (
                    <LineRow key={line.cid} line={line} direct onOpen={openLine} />
                  ))}
                </ul>
              ) : (
                <div className="board__empty board__empty--compact">
                  <p className="board__empty-title">No direct lines</p>
                  <p className="board__empty-text">Start a private line with a colleague.</p>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => onStartCreate?.('messaging')}
                  >
                    <UsersIcon size={14} /> Open a direct line
                  </button>
                </div>
              )}
            </section>

            <div className="board__create">
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => onStartCreate?.('team')}
              >
                <PlusIcon size={14} /> New line
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => onStartCreate?.('messaging')}
              >
                <UsersIcon size={14} /> Direct line
              </button>
            </div>

            <p className="board__foot">
              Signal Box is live. Every figure comes from the network — last dispatch, crew and
              unread signals update as messages arrive.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default SignalBoard;
