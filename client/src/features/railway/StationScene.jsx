import React, { useId } from 'react';

/**
 * The heart of the station.
 *
 * Everything here is decorative: the real line data lives in the accessible
 * rows below. Live journeys are finite and event-driven, and the departure card
 * is a small truthful sign layered over the scene.
 */
const StationScene = ({ nextLine, unreadTotal, journey, typing }) => {
  const rawId = useId();
  const uid = rawId.replace(/:/g, '');
  const sky = `${uid}-sky`;
  const roof = `${uid}-roof`;
  const glow = `${uid}-glow`;
  const sleepers = `${uid}-sleepers`;

  const departing = typing
    ? {
        label: 'Typing now',
        title: typing.lineName,
        detail: `${typing.userName} is typing…`,
      }
    : journey
      ? {
          label: journey.kind === 'broadcast' ? 'All lines' : 'Arriving now',
          title: journey.kind === 'broadcast' ? 'All lines' : journey.lineName,
          detail:
            journey.kind === 'broadcast'
              ? 'Broadcast running'
              : `Message from ${journey.userName}`,
        }
      : {
          label: 'Latest',
          title: nextLine ? nextLine.name : 'No lines yet',
          detail: unreadTotal ? `${unreadTotal} waiting` : 'All lines clear',
        };

  const trainClass = `scene__train${
    journey ? ` scene__train--${journey.kind}` : ''
  }`;

  return (
    <div className="station-scene" aria-hidden="true">
      <svg
        className="station-scene__svg"
        viewBox="0 0 640 300"
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
      >
        <defs>
          <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--railway-sky-top)" />
            <stop offset="100%" stopColor="var(--railway-sky-bottom)" />
          </linearGradient>
          <linearGradient id={roof} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--railway-roof-edge)" />
            <stop offset="100%" stopColor="var(--railway-roof)" />
          </linearGradient>
          <radialGradient id={glow} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--railway-haze)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--railway-haze)" stopOpacity="0" />
          </radialGradient>
          <pattern id={sleepers} width="22" height="18" patternUnits="userSpaceOnUse">
            <rect width="22" height="18" fill="transparent" />
            <rect x="3" width="7" height="18" rx="1" fill="var(--railway-sleeper)" />
          </pattern>
        </defs>

        <rect width="640" height="300" fill={`url(#${sky})`} />
        <circle cx="326" cy="45" r="82" fill={`url(#${glow})`} />
        <circle cx="326" cy="45" r="17" fill="var(--railway-window)" opacity="0.12" />

        <g className="scene__stars">
          <circle cx="238" cy="36" r="1.4" />
          <circle cx="282" cy="18" r="1" />
          <circle cx="390" cy="30" r="1.2" />
          <circle cx="438" cy="16" r="1" />
          <circle cx="486" cy="42" r="1.5" />
          <circle cx="574" cy="24" r="1" />
          <circle cx="608" cy="58" r="1.2" />
        </g>

        {/* Station building */}
        <g className="scene__building">
          <path d="M10 108 L95 47 L180 108 Z" fill={`url(#${roof})`} />
          <path d="M22 105 L95 57 L168 105" fill="none" className="scene__roof-line" />
          <rect x="30" y="104" width="130" height="134" rx="3" className="scene__wall" />
          <rect x="42" y="118" width="106" height="30" rx="3" className="scene__sign" />
          <text x="95" y="138" textAnchor="middle" className="scene__sign-text">
            NRC CENTRAL
          </text>

          <circle cx="95" cy="171" r="18" className="scene__clock-face" />
          <circle cx="95" cy="171" r="14" className="scene__clock-ring" />
          <path d="M95 161v10l7 5" className="scene__clock-hand" />
          <circle cx="95" cy="171" r="2" className="scene__clock-pin" />

          <rect x="45" y="202" width="31" height="24" rx="2" className="scene__window" />
          <rect x="82" y="202" width="30" height="24" rx="2" className="scene__window" />
          <rect x="119" y="202" width="23" height="24" rx="2" className="scene__window" />
          <path d="M95 204v20M66 202v24M97 202v24M130 202v24" className="scene__window-bar" />
          <rect x="68" y="226" width="54" height="12" rx="2" className="scene__door" />
        </g>

        {/* Canopy and lamps */}
        <g className="scene__shed">
          <path d="M168 104 Q320 26 608 104" fill={`url(#${roof})`} opacity="0.72" />
          <path d="M188 106 Q320 45 576 106" className="scene__roof-line" />
          <path d="M196 106v130M382 106v130M570 106v130" className="scene__support" />
          <path d="M236 84l22 22M318 58l18 26M416 62l-12 30" className="scene__truss" />
          <path d="M168 104h440" className="scene__canopy-edge" />

          <g className="scene__lamp">
            <path d="M254 95v19M366 68v30M478 84v20" />
            <circle cx="254" cy="116" r="5" />
            <circle cx="366" cy="100" r="5" />
            <circle cx="478" cy="106" r="5" />
            <circle cx="254" cy="116" r="16" className="scene__lamp-glow" />
            <circle cx="366" cy="100" r="16" className="scene__lamp-glow" />
            <circle cx="478" cy="106" r="16" className="scene__lamp-glow" />
          </g>

          <rect x="510" y="122" width="92" height="26" rx="4" className="scene__platform-sign" />
          <text x="556" y="139" textAnchor="middle" className="scene__platform-sign-text">
            LINE 01
          </text>
        </g>

        {/* Platform */}
        <rect x="0" y="234" width="640" height="34" className="scene__platform" />
        <path d="M0 236h640" className="scene__platform-edge" />
        <path d="M0 246h640" className="scene__platform-line" />

        {/* Train */}
        <g className={trainClass} key={journey?.id || 'parked'}>
          <g className="scene__carriage scene__carriage--two">
            <rect x="274" y="218" width="78" height="31" rx="5" className="scene__train-body" />
            <path d="M278 220h70" className="scene__train-roof" />
            <rect x="283" y="225" width="13" height="11" rx="1.5" className="scene__train-window" />
            <rect x="301" y="225" width="13" height="11" rx="1.5" className="scene__train-window" />
            <rect x="319" y="225" width="13" height="11" rx="1.5" className="scene__train-window" />
            <rect x="337" y="225" width="10" height="11" rx="1.5" className="scene__train-window" />
            <circle cx="290" cy="255" r="6" className="scene__wheel" />
            <circle cx="336" cy="255" r="6" className="scene__wheel" />
          </g>

          <g className="scene__carriage">
            <rect x="362" y="218" width="78" height="31" rx="5" className="scene__train-body" />
            <path d="M366 220h70" className="scene__train-roof" />
            <rect x="371" y="225" width="13" height="11" rx="1.5" className="scene__train-window" />
            <rect x="389" y="225" width="13" height="11" rx="1.5" className="scene__train-window" />
            <rect x="407" y="225" width="13" height="11" rx="1.5" className="scene__train-window" />
            <rect x="425" y="225" width="10" height="11" rx="1.5" className="scene__train-window" />
            <circle cx="378" cy="255" r="6" className="scene__wheel" />
            <circle cx="424" cy="255" r="6" className="scene__wheel" />
          </g>

          <path d="M352 232h10M440 232h10" className="scene__coupling" />

          <g className="scene__loco">
            <rect x="458" y="211" width="104" height="39" rx="9" className="scene__train-body" />
            <rect x="478" y="199" width="45" height="16" rx="5" className="scene__train-roof" />
            <rect x="493" y="204" width="17" height="12" rx="2" className="scene__train-window" />
            <rect x="515" y="204" width="10" height="12" rx="2" className="scene__train-window" />
            <rect x="543" y="199" width="9" height="16" rx="2" className="scene__train-dark" />
            <path d="M466 236h88" className="scene__train-stripe" />
            <circle cx="478" cy="255" r="7" className="scene__wheel" />
            <circle cx="514" cy="255" r="7" className="scene__wheel" />
            <circle cx="548" cy="255" r="7" className="scene__wheel" />
            <circle cx="556" cy="226" r="4" className="scene__headlight" />
            <circle cx="556" cy="226" r="12" className="scene__headlight-glow" />
            <rect x="462" y="226" width="26" height="4" rx="2" className="scene__train-number" />
          </g>

          <g className="scene__steam">
            <circle cx="548" cy="192" r="5" />
            <circle cx="554" cy="181" r="7" />
            <circle cx="563" cy="168" r="9" />
          </g>
        </g>

        {/* Track */}
        <rect x="0" y="268" width="640" height="24" fill={`url(#${sleepers})`} opacity="0.75" />
        <path d="M0 270h640M0 282h640" className="scene__rail" />
        <path d="M0 288h640" className="scene__ballast" />

        {/* Signal gantry */}
        <g className="scene__signal">
          <rect x="190" y="171" width="3" height="64" rx="1" />
          <rect x="184" y="163" width="15" height="35" rx="4" className="scene__signal-box" />
          <circle cx="191.5" cy="173" r="4" className="scene__signal-clear" />
          <circle cx="191.5" cy="186" r="4" className="scene__signal-wait" />
        </g>

        {/* Station cat, supervisor */}
        <g className="scene__cat">
          <ellipse cx="598" cy="228" rx="11" ry="6" />
          <circle cx="608" cy="221" r="5.5" />
          <path d="M603 216l-2-6 5 3M610 216l3-5 1 6" />
          <path d="M588 229q-10-8-4-17" />
          <circle cx="610" cy="221" r="1" className="scene__cat-eye" />
        </g>

        <g className="scene__passengers">
          <circle cx="222" cy="224" r="3" />
          <path d="M222 227v9m-4 0 4-3 4 3m-4-5-5 3m5-3 5 3" />
          <circle cx="237" cy="226" r="2.6" />
          <path d="M237 229v8m-3 0 3-3 3 3m-3-4-4 2m4-2 4 2" />
          <rect x="246" y="230" width="12" height="8" rx="2" />
          <path d="M249 230v-5m6 5v-5" />
        </g>
      </svg>

      <div className="station-scene__live">
        <span className="station-scene__pulse" />
        Live station
      </div>

      {unreadTotal > 0 ? <span className="station-scene__waiting" /> : null}
      {typing ? <span className="station-scene__beam" /> : null}

      <div className="station-scene__departure">
        <span>{departing.label}</span>
        <strong>{departing.title}</strong>
        <small>{departing.detail}</small>
      </div>
    </div>
  );
};

export default StationScene;
