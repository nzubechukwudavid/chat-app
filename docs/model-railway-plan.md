# Model Railway — Build Plan

Status: Phase 1 implemented in the working tree; production visual check pending.

## 1. The Shift

The current app is a credible operations tool. The next version should feel like a
living model railway you want to poke at, not a dashboard with train words.

The core metaphor:

- The workspace is one grand station.
- Every team channel is a **platform** on the main line.
- Every direct message is a **bay platform** on the side spur.
- A dispatch is a **train**.
- Unread messages are trains waiting beyond the tunnel.
- Typing is a headlight in the tunnel and a signal dropping to caution.
- Presence is a platform lamp.
- Broadcast is a **golden train** that runs the whole station.
- Voice is a steam engine with a visible plume.
- Reactions are cargo loaded onto the last train.
- The station cat is the station cat.

This is not a game pasted onto chat. The chat remains the source of truth. The
railway is a living visualization of real channel and message state.

## 2. Experience Principles

1. **Real state, playful surface.** Every platform, train, badge and light maps
   to a real channel, message, presence or unread count. No invented activity.
2. **Toy first, dashboard second.** The board should be fun to watch before it is
   useful to read.
3. **One obvious verb.** Click a platform to go there. Everything else is
   secondary.
4. **Motion with meaning.** A train moves because something happened. Ambient
   motion stays quiet and optional.
5. **The chat stays readable.** The scene carries the personality; the message
   list carries the work. Do not turn every bubble into a carriage.
6. **Small screens get a quieter version.** Fewer trains, shorter journeys, no
   decorative clutter, same information.

## 3. The Scene

A single responsive top-down/cutaway station:

- canopy roof, clock, departure board and tunnel mouth;
- a main line with numbered platforms for team channels;
- a bay spur for direct messages;
- a traverser / golden loop for all-stations broadcasts;
- platform signs, signal lamps, sleepers, buffers and tiny passengers;
- a station cat that wanders between platforms;
- a sky strip that follows WAT time of day.

The scene is SVG plus HTML labels, not a canvas or a game engine.

### Platform states

| State | Visual |
| --- | --- |
| Idle | train parked at platform, lamp steady |
| Unread | one or more trains waiting in the tunnel, headlights on, count badge |
| Typing | headlight approaches, signal amber, "approaching" label |
| Active | platform sign lit, track highlighted |
| Offline members | platform lamp off |
| Broadcast | gold train crosses the station, "ALL STATIONS" board |
| No lines | empty station, cat asleep, invitation to open the first line |

### Controls

- Click/tap a platform or train: open that channel.
- Hover/focus a platform: show last dispatch and unread count in the departure board.
- "Whistle": local sound only, no message sent.
- Sound toggle: off by default, persisted locally.
- "All lines": expand the full list when the station has more platforms than fit.
- Reduced motion: no travel; state changes are instant with badges and light.

## 4. Data Model

Derived from Stream; no new backend tables.

```js
Platform = {
  cid, id, name, kind: 'line' | 'bay',
  serviceCode, platformNumber,
  unread, onlineCount, memberCount,
  lastMessage, lastActivity,
  active, typing,
}
TrainEvent = {
  id, platformId, kind: 'dispatch' | 'arrival' | 'broadcast' | 'voice' | 'reaction',
  direction: 'in' | 'out',
  payload, createdAt,
}
```

### Sources

- `client.queryChannels` with `watch: true, state: true, presence: true`.
- `channel.state.messages`, `channel.state.members`, `channel.countUnread()`.
- `client.on('message.new', ...)`, `message.updated`, `message.deleted`.
- `notification.added_to_channel`, `notification.removed_from_channel`.
- `channel.deleted`, `user.presence.changed`.
- `typing.start`, `typing.stop`.
- `message.read` for clearing unread state.

### Event rules

- Initial load: show parked trains. Do **not** replay old messages as journeys.
- Only animate a message created after the board's mount watermark, or a live
  event; use a `seenMessageIds` set to prevent duplicates.
- One event can update two things: platform state and a train. Keep them separate.
- Cap the animation queue at 3 visible journeys; coalesce rapid events per platform.
- Broadcast gets one golden run, not one train per target line.
- If the network query fails, render the station in a safe "signals offline" state
  with the existing channel list still usable.

## 5. Frontend Structure

New feature folder, with the old board retired gradually:

```text
client/src/features/railway/
  RailwayBoard.jsx        full-screen board surface
  RailwayScene.jsx        SVG station, tracks, platforms
  Platform.jsx            accessible platform hit area + label
  TrainLayer.jsx          imperative train movement, queue, cleanup
  DepartureBoard.jsx      latest dispatch / hover / unread detail
  StationCat.jsx          decorative cat + tiny interaction
  useRailwayNetwork.js    query, refresh, event subscriptions
  useTrainEvents.js       real message events -> TrainEvent queue
  layout.js               deterministic platform/track geometry
  audio.js                optional synthesized station sounds
  railway.css             feature styles, imported after signal.css
```

Integration points:

- `ChannelContainer.jsx`: render `RailwayBoard` instead of `SignalBoard` when no
  active channel.
- `ChannelListContainer.jsx`: keep rail navigation; rename the section to
  "Platforms" and "Bay platforms" while preserving behavior.
- `Workspace.jsx`: keep the broadcast console and drawer; pass broadcast events
  into the railway.
- `lines.js`: keep service codes and last-dispatch helpers; move board-only
  geometry into `features/railway/layout.js`.
- `signal.css`: keep existing chat/board variables; add railway styles in
  `railway.css` rather than growing one huge file.

No new runtime dependency is required for phase 1. Use SVG + Web Animations API.
If orchestration becomes painful, evaluate `motion` later, not upfront.

## 6. Motion Architecture

- Geometry lives in `layout.js` as normalized coordinates (0–1000 viewBox).
- The scene renders tracks once; labels and hit areas are HTML for accessibility.
- A train journey is a single absolutely positioned SVG group moved with
  `element.animate()` along a generated path, using transforms/opacity only.
- Do not animate `stroke-dashoffset`; it causes paint storms on Safari.
- Each journey has a finite lifetime; remove it in `animation.finished.finally()`.
- Pause all animation when `prefers-reduced-motion: reduce`.
- Pause decorative loops when the tab is hidden.
- Sound is opt-in and synthesized with Web Audio; no audio files to download.
- Performance budget: under 8 simultaneous moving trains, under 1200 SVG nodes,
  no full scene re-render for a single message.

## 7. Restructure Plan

### Phase 0 — Safety rails

- Add a feature flag/branch? No: ship behind a single `RailwayBoard` component so
  reverting is one import change.
- Extract network query/event subscription into a hook.
- Add a small event fixture set for local visual testing only, never shipped as
  user-visible data.
- Confirm current 0/1/many channel states and auth behavior.

### Phase 1 — The station exists

- Build the static station scene from real platforms.
- Platform labels, line/bay separation, empty state, loading and offline states.
- Click to open channel; active platform state.
- Responsive layout: desktop scene, compact scene under 768 px.
- Deploy and verify real NRC channels, not test channels.

Phase 1 implementation notes:

- `RailwayBoard`, `StationScene`, `PlatformRow` and `useRailwayNetwork` now live
  under `client/src/features/railway/`.
- The old `SignalBoard` file remains in the tree as a one-import rollback, but it
  is no longer rendered.
- The board still uses its own hook query loop; the shared provider is deferred
  until Phase 2 needs the same snapshot in the sidebar and train layer.

### Phase 2 — The station breathes

- Live train arrivals for real messages.
- Unread trains waiting in the tunnel; opening a platform clears them.
- Typing headlights and presence lamps.
- Broadcast golden train.
- Reaction cargo and voice plume.
- Reduced-motion and sound-off fallbacks.
- Deploy and verify with two accounts, including a received message.

### Phase 3 — The station has personality

- Station cat with a tiny pet interaction.
- Optional ambient sound and whistle.
- Time-of-day sky and station lights.
- Departure-board copy that reacts to real events.
- Micro-delights: buffers clunk, signal blink, ticket punch on unread zero.
- Deploy and test on a real phone.

### Phase 4 — Play, if it still feels good

Choose one, not all:

- conductor stamps/achievements for daily activity;
- a small shunting puzzle in the sidings;
- collectible locomotives unlocked by real usage;
- a nightly "last train" recap.

Do not add a game layer until the station itself is fun to watch.

## 8. Testing

- Empty workspace: no fake platforms, cat asleep, clear first action.
- One team line, one DM, five team lines, twenty lines.
- Unread count 1 and 10; open platform clears state.
- Own message animates out; received message animates in.
- Broadcast shows one gold run and a marker in chat.
- Typing appears and disappears; offline lamps are distinct from online.
- Reload does not replay history as a train stampede.
- Reduced motion keeps every state legible.
- Sound is off by default and survives reload.
- 390×844 and 1000×700: no horizontal overflow, readable labels, usable hit areas.
- Console clean; no duplicate queries from StrictMode.
- Mobile Safari/Chrome: WAAPI/offset-path fallback works.

## 9. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Stream events arrive late or duplicate | `seenMessageIds`, one refresh per event, queue coalescing |
| Board re-render kills animation | imperative TrainLayer with stable keys |
| Too many platforms | show 6–8 in scene, full list in drawer |
| Chat becomes novelty and loses usability | keep message list unchanged in phase 1 |
| Mobile performance | fewer trains, CSS transforms only, reduce-motion mode |
| Sound annoys users | off by default, local-only toggle |
| New UI hides real state | every platform derived from a real channel; no fake data |
| Feature becomes hard to revert | one board component swap + isolated feature folder |

## 10. Decisions to Lock

1. One station with platform tracks (recommended) vs. a network of stations.
2. Keep the current sidebar as platform list, or replace it with a miniature
   track diagram.
3. How playful phase 1 should be: static diorama first, motion second.
4. Whether "fun" should later include a game layer or stay a living toy.

Recommended: **one grand station, real platforms, motion driven by real events**.
It is the strongest metaphor, scales without inventing geography, and can ship
in layers without betting the chat experience.
