# Changelog

All notable changes to Rail Hub are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project aims to follow [Semantic Versioning](https://semver.org/).
Dates are in `YYYY-MM-DD` format.

## Unreleased

Nothing yet.

## 2026-11-03

### Added

- Route-map chat backdrop drawn entirely with CSS gradients: survey grid,
  diagonal running lines, station beads and green/gold glows, with separate dark
  and light theme values.
- Dashed "platform edge" rule above the composer.
- Railway-themed favicon and app icons: multi-size `favicon.ico`, vector
  `favicon.svg`, 180 px Apple touch icon and refreshed 192/512 px PWA icons.
- Subtle idle motion on the station board: steam drift, headlight breathing,
  star twinkle, lamp breathing and a clear-signal pulse, all disabled under
  `prefers-reduced-motion`.
- Password recovery with one-time email links (Brevo), an admin fallback script,
  hashed tokens, a 30-minute expiry and session revocation on reset.
- Production verification record for the reset flow.

### Changed

- The message transcript is transparent so the route-map canvas shows through.
- Manifest icon sizes and background colour now match the new icon set.
- Service-worker cache bumped to `nrc-rail-hub-v2`, with the new icons in the
  static asset list.
- Icon URLs carry a cache-busting version query.

### Fixed

- Reset mail configuration and test isolation hardening.

## 2026-11-02

### Changed

- Avatars are uploads only: the server verifies file signatures (JPG, PNG, GIF,
  WebP) and stores images on the Stream CDN. Avatar-URL fields were removed.
- Deployment notes updated for uploads-only avatars.

### Changed

- Local production data exports are ignored by git.

## 2026-10-31

### Added

- HTTP integration test suite covering signup, login, sessions, profile updates,
  avatar validation, password change, logout, throttling and account lockout.
- Shared Postgres/Neon rate-limit counters so limits survive restarts and apply
  across API instances.
- `/health` reports the effective rate-limit store.

### Fixed

- Session, avatar and rate-limit hardening.
- Accessibility issues found during the QA pass.
- User audit tooling.

## 2026-10-29

### Added

- Auth middleware for protected routes.

### Changed

- Unified the Stream client configuration.
- UI polish across the workspace.

### Fixed

- Corrected SQLite bindings.

## 2026-10-28

### Added

- Profile settings and account management, including profile edits, password
  change and avatar upload.
- Settings modal with Profile and Security tabs.

### Fixed

- Restored sign-out to the rail after the navigation refresh.
- Removed unused board-link and sign-out handlers that broke the production
  build.

## 2026-10-27

### Added

- Model railway station board driven by real channel and message state.
- Station-board phases 0-2: static station, live movement, then ambient motion.
- Refreshed lines sidebar with route marks, latest dispatch, relative time,
  unread counts and a desktop collapse control.

### Fixed

- Broadcast markers and broadcast target state in the message list.
- Station stats balance at tablet widths.

## 2026-10-26

### Added

- Railway operations identity across sign-in and the workspace shell: signal-box
  styling, station clock, service numbers and platform vocabulary.

### Fixed

- Mobile drawer stacking above its backdrop.
- Station clock legibility in the light theme.
- Splash rails and sign-in copy spacing on small screens.

## 2026-10-23

### Added

- Rebuilt client UI, UX and chat lifecycle.
- Hardened server auth, sessions, validation and security headers.
- Same-origin `/api` proxy so production session cookies survive.
- Dependency audit fixes.

### Changed

- Stopped mirroring credentials and phone numbers into Stream.

### Removed

- Abandoned Twilio SMS notification path.

### Fixed

- Cold-backend first-visit handling.
- Boot without Twilio configuration.

## 2026-09-06

### Added

- Progressive web app support: service worker, web manifest and installable app
  icon.
- Executive dark theme with an obsidian canvas, slate cards and emerald accents.
- Database persistence for accounts and messages.
- Channel search and improved DM behaviour.
- README overhaul for portfolio presentation.

### Fixed

- Mobile auth scrolling and container overflow.
- Message input pinned to the viewport bottom on phones.
- Mobile drawer dismissal and `viewport-fit=cover` handling.
- Attachment images made flush inside message bubbles.
- Login contrast and dark-mode styling, including autofill.

## 2025-10-24

### Changed

- Polished authentication payloads, login/logout experience and CORS options.
- Cleaned dependencies to fix production builds.
- Added channel selection handling and responsive toggles.
- Added channel search and (later removed) Twilio SMS notifications.

## 2025-09 to 2025-10

### Added

- Initial React application scaffold and backend.
- Signup, sign-in and logout flows.
- Channel list and channel container foundations.
- Rebrand to "Rail Hub" with the first NRC visual identity.
