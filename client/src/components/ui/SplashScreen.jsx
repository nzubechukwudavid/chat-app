import React from 'react';

import { TrainIcon } from './icons';

/**
 * Shown while the session cookie is being validated on first paint.
 * Deliberately lightweight: no SDK has loaded yet at this point.
 */
const SplashScreen = ({ message = 'Restoring your session' }) => (
  <div className="splash" role="status" aria-live="polite">
    <div className="splash__mark">
      <TrainIcon size={34} />
    </div>

    <div style={{ textAlign: 'center' }}>
      <p className="splash__title">Rail Hub</p>
      <p className="splash__subtitle">{message}…</p>
    </div>

    <div className="splash__bar" aria-hidden="true" />

    <p className="splash__subtitle" style={{ fontSize: 11, opacity: 0.5 }}>
      Nigerian Railway Corporation
    </p>
  </div>
);

export default SplashScreen;
