import React from 'react';

import { MoonIcon, SunIcon } from './icons';
import { useToast } from './Toast';
import { useTheme } from '../../hooks/useTheme';

/**
 * Dark/light switch. The icon reflects the theme you will get, and the
 * current choice is announced to screen readers.
 */
const ThemeToggle = ({ showLabel = false, className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const { info } = useToast();

  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      className={`theme-switch ${className}`.trim()}
      onClick={() => {
        toggleTheme();
        info(`${next === 'light' ? 'Day' : 'Night'} operations mode enabled`);
      }}
      title={`Switch to ${next} mode`}
      aria-label={`Switch to ${next} mode`}
      aria-pressed={theme === 'light'}
    >
      {theme === 'dark' ? <SunIcon size={15} /> : <MoonIcon size={15} />}
      {showLabel && <span>{theme === 'dark' ? 'Day mode' : 'Night mode'}</span>}
    </button>
  );
};

export default ThemeToggle;
