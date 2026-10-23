import React, { useEffect, useState } from 'react';

import { TrainIcon } from './icons';

/**
 * Shown while the session cookie is being validated on first paint.
 * Deliberately lightweight: no SDK has loaded yet at this point.
 *
 * When the API is asleep (free hosting tiers idle down) this screen can sit
 * for a while, so a second line explains the delay instead of looking hung.
 */
const SplashScreen = ({ message = 'Restoring your session' }) => {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 4000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="splash" role="status" aria-live="polite">
      <div className="splash__mark">
        <TrainIcon size={34} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <p className="splash__title">Rail Hub</p>
        <p className="splash__subtitle">{message}…</p>
        {slow && (
          <p className="splash__subtitle" style={{ marginTop: 6 }}>
            Waking the server — this can take a moment.
          </p>
        )}
      </div>

      <div className="splash__bar" aria-hidden="true" />

      <p className="splash__subtitle" style={{ fontSize: 11, opacity: 0.5 }}>
        Nigerian Railway Corporation
      </p>
    </div>
  );
};

export default SplashScreen;
