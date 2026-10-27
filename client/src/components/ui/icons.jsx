import React from 'react';

/**
 * Inline SVG icon set.
 *
 * Bundling the handful of glyphs the app needs avoids a network round trip
 * per icon (the previous build shipped PNGs for these) and lets every icon
 * inherit `currentColor` from its button.
 */
const base = ({ size = 18, strokeWidth = 2, className, style, ...rest }) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className,
  style,
  'aria-hidden': rest['aria-hidden'] ?? true,
  focusable: 'false',
});

export const MenuIcon = (props) => (
  <svg {...base(props)}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

export const CloseIcon = (props) => (
  <svg {...base(props)}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const SearchIcon = (props) => (
  <svg {...base(props)}>
    <circle cx="11" cy="11" r="7" />
    <line x1="20" y1="20" x2="16.65" y2="16.65" />
  </svg>
);

export const PlusIcon = (props) => (
  <svg {...base(props)}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const LogoutIcon = (props) => (
  <svg {...base(props)}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export const SettingsIcon = (props) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10.09 3V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09A1.65 1.65 0 0 0 21 10.09h.09a2 2 0 1 1 0 4H21a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const SunIcon = (props) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

export const MoonIcon = (props) => (
  <svg {...base(props)}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export const EyeIcon = (props) => (
  <svg {...base(props)}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon = (props) => (
  <svg {...base(props)}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export const CheckIcon = (props) => (
  <svg {...base(props)}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const CheckDoubleIcon = (props) => (
  <svg {...base(props)}>
    <polyline points="18 7 8 17 4 13" />
    <polyline points="22 7 12 17" />
  </svg>
);

export const AlertIcon = (props) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="8" x2="12" y2="12.5" />
    <circle cx="12" cy="16" r="0.6" fill="currentColor" />
  </svg>
);

export const InfoIcon = (props) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="11" x2="12" y2="16" />
    <circle cx="12" cy="8" r="0.6" fill="currentColor" />
  </svg>
);

export const ChevronDownIcon = (props) => (
  <svg {...base(props)}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/** Panel with the content edge highlighted; used to collapse the sidebar. */
export const PanelLeftCloseIcon = (props) => (
  <svg {...base(props)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="9" y1="4" x2="9" y2="20" />
    <polyline points="17 9 14 12 17 15" />
  </svg>
);

/** The same panel with its edge opening; used to expand the sidebar. */
export const PanelLeftOpenIcon = (props) => (
  <svg {...base(props)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="9" y1="4" x2="9" y2="20" />
    <polyline points="14 9 17 12 14 15" />
  </svg>
);

export const SendIcon = (props) => (
  <svg {...base(props)}>
    <path d="M22 2L11 13" />
    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
  </svg>
);

export const TrainIcon = (props) => (
  <svg {...base(props)}>
    <rect x="4" y="3" width="16" height="13" rx="3" />
    <path d="M4 10h16" />
    <circle cx="8.5" cy="13.5" r="0.7" fill="currentColor" />
    <circle cx="15.5" cy="13.5" r="0.7" fill="currentColor" />
    <path d="M7 21l2-4M17 21l-2-4" />
  </svg>
);

export const UsersIcon = (props) => (
  <svg {...base(props)}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const ArrowDownIcon = (props) => (
  <svg {...base(props)}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
);

export const TrashIcon = (props) => (
  <svg {...base(props)}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

export const ExitIcon = (props) => (
  <svg {...base(props)}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export const ShieldIcon = (props) => (
  <svg {...base(props)}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11.5 14.5 15.5 10" />
  </svg>
);

export const BoltIcon = (props) => (
  <svg {...base(props)}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

/** Board: a grid of live readouts. */
export const BoardIcon = (props) => (
  <svg {...base(props)}>
    <rect x="3" y="4" width="7" height="6" rx="1.2" />
    <rect x="14" y="4" width="7" height="6" rx="1.2" />
    <rect x="3" y="14" width="7" height="6" rx="1.2" />
    <path d="M14 15h7M14 19h4" />
  </svg>
);

/** Broadcast: a mast sending in every direction. */
export const BroadcastIcon = (props) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="1.8" />
    <path d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6" />
    <path d="M5.4 5.4a9.4 9.4 0 0 0 0 13.2M18.6 5.4a9.4 9.4 0 0 1 0 13.2" />
  </svg>
);

const iconSet = {
  MenuIcon,
  CloseIcon,
  SearchIcon,
  PlusIcon,
  LogoutIcon,
  SettingsIcon,
  SunIcon,
  MoonIcon,
  EyeIcon,
  EyeOffIcon,
  CheckIcon,
  CheckDoubleIcon,
  AlertIcon,
  InfoIcon,
  ChevronDownIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SendIcon,
  TrainIcon,
  UsersIcon,
  ArrowDownIcon,
  TrashIcon,
  ExitIcon,
  ShieldIcon,
  BoltIcon,
  BoardIcon,
  BroadcastIcon,
};

export default iconSet;
