import React from 'react';

import { useOnlineStatus } from '../../hooks/useOnlineStatus';

/**
 * Non-blocking connectivity banner. Only rendered when something is wrong,
 * so it never steals attention during normal operation.
 */
const ConnectionBanner = ({ reconnecting = false }) => {
  const online = useOnlineStatus();

  if (online && !reconnecting) return null;

  const offline = !online;

  return (
    <div
      className={`connection-banner ${offline ? 'connection-banner--offline' : 'connection-banner--connecting'}`}
      role="status"
      aria-live="polite"
    >
      <span className="connection-banner__dot" aria-hidden="true" />
      {offline ? 'You are offline - messages will send when you reconnect' : 'Reconnecting to Rail Hub'}
    </div>
  );
};

export default ConnectionBanner;
