import React, { useCallback, useMemo } from 'react';
import { useChatContext } from 'stream-chat-react';

import StationClock from '../../components/ui/StationClock';
import {
  BroadcastIcon,
  MenuIcon,
  PlusIcon,
  TrainIcon,
  UsersIcon,
} from '../../components/ui/icons';
import { boardDate, watchLabel } from '../../lib/lines';
import PlatformRow from './PlatformRow';
import StationScene from './StationScene';
import { useRailwayNetwork } from './useRailwayNetwork';
import { useTrainEvents } from './useTrainEvents';

const Skeleton = ({ rows = 4 }) => (
  <div className="railway__skeleton" aria-hidden="true">
    {Array.from({ length: rows }, (_, index) => (
      <span className="railway__skeleton-row" key={`platform-skeleton-${index}`}>
        <i />
        <b />
        <em />
      </span>
    ))}
  </div>
);

const EmptyLines = ({ onCreate }) => (
  <div className="railway__empty">
    <span className="railway__empty-icon" aria-hidden="true">
      <TrainIcon size={26} />
    </span>
    <div className="railway__empty-copy">
      <p className="railway__empty-title">No lines yet</p>
      <p className="railway__empty-text">
        Create the first line and give the station somewhere to go.
      </p>
    </div>
    <button type="button" className="btn btn--primary btn--sm" onClick={() => onCreate?.('team')}>
      <PlusIcon size={14} /> Create a line
    </button>
  </div>
);

const EmptyDirect = ({ onCreate }) => (
  <div className="railway__empty railway__empty--compact">
    <span className="railway__empty-icon" aria-hidden="true">
      <UsersIcon size={22} />
    </span>
    <div className="railway__empty-copy">
      <p className="railway__empty-title">No DMs yet</p>
      <p className="railway__empty-text">Start a private chat with a colleague.</p>
    </div>
    <button
      type="button"
      className="btn btn--secondary btn--sm"
      onClick={() => onCreate?.('messaging')}
    >
      Start a DM
    </button>
  </div>
);

/**
 * The station landing surface.
 *
 * The board is built from real lines, messages, unread pressure and presence.
 * Live journeys are driven by incoming events, never by ambient animation.
 */
const RailwayBoard = ({ onOpenDrawer, onStartCreate, onBroadcast }) => {
  const { client, setActiveChannel } = useChatContext();
  const { teamLines, directLines, loading, error, reload, onWatch, unreadTotal } =
    useRailwayNetwork();
  const { journey, typingByLine } = useTrainEvents(client);

  const openLine = useCallback(
    (channel) => {
      setActiveChannel?.(channel);
    },
    [setActiveChannel],
  );

  const typing = useMemo(() => Object.values(typingByLine)[0] || null, [typingByLine]);

  const watch = watchLabel();
  const date = boardDate();
  const nextLine = teamLines[0] || directLines[0] || null;
  const signalCopy = unreadTotal
    ? `${unreadTotal} message${unreadTotal === 1 ? '' : 's'} waiting`
    : 'All lines clear';

  return (
    <div className="channel__container railway-shell">
      <div className="railway" aria-busy={loading}>
        <header className="railway__header">
          <button
            type="button"
            className="mobile-menu-toggle railway__menu"
            onClick={onOpenDrawer}
            title="Open lines and DMs"
            aria-label="Open lines and DMs"
          >
            <MenuIcon size={18} />
          </button>

          <div className="railway__identity">
            <span className="railway__mark" aria-hidden="true">
              <TrainIcon size={22} />
            </span>
            <div>
              <p className="railway__eyebrow">Station board · live</p>
              <h1 className="railway__title">NRC Central</h1>
            </div>
          </div>

          <div className="railway__clock-block">
            <StationClock className="railway__clock" />
            <p className="railway__watch">
              <span className="railway__watch-led" aria-hidden="true" />
              {watch}
              <span className="railway__watch-sep" aria-hidden="true">
                /
              </span>
              {date}
            </p>
          </div>
        </header>

        {error ? (
          <div className="railway__notice" role="alert">
            <span>{error}</span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={reload}>
              Retry
            </button>
          </div>
        ) : null}

        <section className="railway__hero">
          <div className="railway__hero-copy">
            <p className="railway__kicker">
              <span className="railway__live-dot" aria-hidden="true" />
              Live from the station
            </p>
            <h2 className="railway__hero-title">Every line is live.</h2>
            <p className="railway__lede">
              Real conversations, one station. Pick a line and see where the day is going.
            </p>

            <div className="railway__stats" aria-label="Station status">
              <span className="railway__stat">
                <strong>{teamLines.length}</strong>
                <small>line{teamLines.length === 1 ? '' : 's'}</small>
              </span>
              <span className="railway__stat">
                <strong>{directLines.length}</strong>
                <small>DM{directLines.length === 1 ? '' : 's'}</small>
              </span>
              <span className="railway__stat">
                <strong>{onWatch}</strong>
                <small>online</small>
              </span>
              <span className={`railway__stat${unreadTotal ? ' railway__stat--signal' : ''}`}>
                <strong>{unreadTotal || '—'}</strong>
                <small>{unreadTotal ? 'waiting' : 'all quiet'}</small>
              </span>
            </div>
          </div>

          <StationScene
            nextLine={nextLine}
            unreadTotal={unreadTotal}
            journey={journey}
            typing={typing}
          />
        </section>

        <div className="railway__grid">
          <section className="railway__panel railway__panel--main" aria-labelledby="main-lines">
            <header className="railway__panel-head">
              <div>
                <p className="railway__panel-kicker">Live lines</p>
                <h2 id="main-lines">Lines</h2>
              </div>
              <span className="railway__panel-count">
                {teamLines.length} live
              </span>
            </header>

            {loading ? (
              <Skeleton rows={4} />
            ) : teamLines.length ? (
              <ul className="railway__platforms">
                {teamLines.map((line, index) => (
                  <PlatformRow
                    key={line.cid}
                    line={line}
                    number={String(index + 1).padStart(2, '0')}
                    typing={typingByLine[line.cid]}
                    onOpen={openLine}
                  />
                ))}
              </ul>
            ) : (
              <EmptyLines onCreate={onStartCreate} />
            )}
          </section>

          <aside className="railway__side">
            <button type="button" className="railway__broadcast" onClick={onBroadcast}>
              <span className="railway__broadcast-icon" aria-hidden="true">
                <BroadcastIcon size={22} />
              </span>
              <span className="railway__broadcast-copy">
                <strong>All lines</strong>
                <small>One message to every line</small>
              </span>
              <span className="railway__broadcast-arrow" aria-hidden="true">
                →
              </span>
            </button>

            <section
              className="railway__panel railway__panel--bay"
              aria-labelledby="direct-messages"
            >
              <header className="railway__panel-head">
                <div>
                  <p className="railway__panel-kicker">Direct</p>
                  <h2 id="direct-messages">DMs</h2>
                </div>
                <span className="railway__panel-count">{directLines.length}</span>
              </header>

              {loading ? (
                <Skeleton rows={3} />
              ) : directLines.length ? (
                <ul className="railway__platforms railway__platforms--bay">
                  {directLines.map((line, index) => (
                    <PlatformRow
                      key={line.cid}
                      line={line}
                      direct
                      number={String(index + 1).padStart(2, '0')}
                      typing={typingByLine[line.cid]}
                      onOpen={openLine}
                    />
                  ))}
                </ul>
              ) : (
                <EmptyDirect onCreate={onStartCreate} />
              )}
            </section>

            <div className="railway__actions">
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
                <UsersIcon size={14} /> New DM
              </button>
            </div>

            <p className="railway__foot">
              <span className="railway__foot-dot" aria-hidden="true" />
              {signalCopy}. Every message on this board is real.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default RailwayBoard;
