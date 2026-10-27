import React, { useCallback } from 'react';
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

const EmptyPlatforms = ({ onCreate }) => (
  <div className="railway__empty">
    <span className="railway__empty-icon" aria-hidden="true">
      <TrainIcon size={26} />
    </span>
    <div className="railway__empty-copy">
      <p className="railway__empty-title">The station is quiet</p>
      <p className="railway__empty-text">
        Create the first platform and give the timetable somewhere to go.
      </p>
    </div>
    <button type="button" className="btn btn--primary btn--sm" onClick={() => onCreate?.('team')}>
      <PlusIcon size={14} /> Create a platform
    </button>
  </div>
);

const EmptyDirect = ({ onCreate }) => (
  <div className="railway__empty railway__empty--compact">
    <span className="railway__empty-icon" aria-hidden="true">
      <UsersIcon size={22} />
    </span>
    <div className="railway__empty-copy">
      <p className="railway__empty-title">No bay platforms yet</p>
      <p className="railway__empty-text">Open a private line with a colleague.</p>
    </div>
    <button
      type="button"
      className="btn btn--secondary btn--sm"
      onClick={() => onCreate?.('messaging')}
    >
      Open a direct line
    </button>
  </div>
);

/**
 * The station landing surface.
 *
 * Phase one is deliberately static: real platforms, real dispatch text, real
 * unread pressure and real presence, presented as a model railway. Live train
 * movement arrives in the next layer.
 */
const RailwayBoard = ({ onOpenDrawer, onStartCreate, onBroadcast }) => {
  const { setActiveChannel } = useChatContext();
  const { teamLines, directLines, loading, error, reload, onWatch, unreadTotal } =
    useRailwayNetwork();

  const openLine = useCallback(
    (channel) => {
      setActiveChannel?.(channel);
    },
    [setActiveChannel],
  );

  const watch = watchLabel();
  const date = boardDate();
  const nextLine = teamLines[0] || null;
  const signalCopy = unreadTotal
    ? `${unreadTotal} signal${unreadTotal === 1 ? '' : 's'} waiting`
    : 'All platforms clear';

  return (
    <div className="channel__container railway-shell">
      <div className="railway" aria-busy={loading}>
        <header className="railway__header">
          <button
            type="button"
            className="mobile-menu-toggle railway__menu"
            onClick={onOpenDrawer}
            title="Open platforms"
            aria-label="Open platforms and bay platforms"
          >
            <MenuIcon size={18} />
          </button>

          <div className="railway__identity">
            <span className="railway__mark" aria-hidden="true">
              <TrainIcon size={22} />
            </span>
            <div>
              <p className="railway__eyebrow">Platform board · live station</p>
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
            <h2 className="railway__hero-title">Every line has a platform.</h2>
            <p className="railway__lede">
              Real conversations, one station. Pick a platform, board a line, and see where the
              day takes you.
            </p>

            <div className="railway__stats" aria-label="Station status">
              <span className="railway__stat">
                <strong>{teamLines.length}</strong>
                <small>platform{teamLines.length === 1 ? '' : 's'}</small>
              </span>
              <span className="railway__stat">
                <strong>{directLines.length}</strong>
                <small>bay{directLines.length === 1 ? '' : 's'}</small>
              </span>
              <span className="railway__stat">
                <strong>{onWatch}</strong>
                <small>crew on watch</small>
              </span>
              <span className={`railway__stat${unreadTotal ? ' railway__stat--signal' : ''}`}>
                <strong>{unreadTotal || '—'}</strong>
                <small>{unreadTotal ? 'waiting' : 'all quiet'}</small>
              </span>
            </div>
          </div>

          <StationScene nextLine={nextLine} unreadTotal={unreadTotal} />
        </section>

        <div className="railway__grid">
          <section className="railway__panel railway__panel--main" aria-labelledby="main-platforms">
            <header className="railway__panel-head">
              <div>
                <p className="railway__panel-kicker">Main line</p>
                <h2 id="main-platforms">Platforms</h2>
              </div>
              <span className="railway__panel-count">
                {teamLines.length} in service
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
                    onOpen={openLine}
                  />
                ))}
              </ul>
            ) : (
              <EmptyPlatforms onCreate={onStartCreate} />
            )}
          </section>

          <aside className="railway__side">
            <button type="button" className="railway__broadcast" onClick={onBroadcast}>
              <span className="railway__broadcast-icon" aria-hidden="true">
                <BroadcastIcon size={22} />
              </span>
              <span className="railway__broadcast-copy">
                <strong>All-stations broadcast</strong>
                <small>One dispatch, every platform on the station</small>
              </span>
              <span className="railway__broadcast-arrow" aria-hidden="true">
                →
              </span>
            </button>

            <section
              className="railway__panel railway__panel--bay"
              aria-labelledby="bay-platforms"
            >
              <header className="railway__panel-head">
                <div>
                  <p className="railway__panel-kicker">Side spur</p>
                  <h2 id="bay-platforms">Bay platforms</h2>
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
                <PlusIcon size={14} /> New platform
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => onStartCreate?.('messaging')}
              >
                <UsersIcon size={14} /> Direct line
              </button>
            </div>

            <p className="railway__foot">
              <span className="railway__foot-dot" aria-hidden="true" />
              {signalCopy}. Every platform is a live channel; every dispatch is a real message.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default RailwayBoard;
