import React, { useState } from 'react';

import { initials } from '../../lib/format';

/**
 * Avatar with an initials fallback. `img` errors degrade gracefully so a
 * dead image URL never leaves an empty circle.
 */
const Avatar = ({ name, image, size = 34, online = false, className = '', title }) => {
  const [broken, setBroken] = useState(false);
  const label = name || 'User';
  const showImage = Boolean(image) && !broken;

  return (
    <span
      className={`avatar ${className}`.trim()}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) }}
      title={title || label}
    >
      {showImage ? (
        <img src={image} alt="" onError={() => setBroken(true)} loading="lazy" decoding="async" />
      ) : (
        <span aria-hidden="true">{initials(label)}</span>
      )}

      {online && <span className="avatar__presence" aria-label="Online" />}
    </span>
  );
};

export default Avatar;
