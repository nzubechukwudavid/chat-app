import React, { useEffect, useState } from 'react';

/**
 * Live West Africa Time clock for the channel header.
 *
 * The app is used by railway staff working to a timetable, so an always-visible
 * clock earns its place; it also gives the shell the feel of an operations
 * board rather than a generic chat window. The tick is a plain interval — one
 * text node updating per second is cheaper than it looks.
 *
 * Deliberately *not* an aria-live region: a screen reader announcing the time
 * every second would be hostile. It stays readable on demand.
 */
const formatTime = (date) =>
  date.toLocaleTimeString('en-GB', {
    timeZone: 'Africa/Lagos',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const StationClock = ({ className = '' }) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span className={`station-clock ${className}`.trim()} title="West Africa Time">
      <span className="station-clock__led" aria-hidden="true" />
      <span className="station-clock__time">{formatTime(now)}</span>
      <span className="station-clock__zone">WAT</span>
    </span>
  );
};

export default StationClock;
