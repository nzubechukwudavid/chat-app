# Rail Hub

**Real-time operations and departmental communications for the Nigerian Railway Corporation.**

Rail Hub gives station masters, dispatchers, engineers and administrative staff one
workspace for corridor channels, direct messages, a live station board and
all-station broadcasts, wrapped in an executive dark-emerald design system.

![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-22+-green?logo=node)
![Express](https://img.shields.io/badge/Express-5-lightgrey?logo=express)
![Stream Chat](https://img.shields.io/badge/Stream%20Chat-SDK-006CFF?logo=stream)
![Database](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20SQLite-darkblue)

Production: [nrc-chat.vercel.app](https://nrc-chat.vercel.app)

---

## Features

### Messaging

- **Lines (team channels)** for corridors, train control, engineering and dispatch,
  with create, rename and member management.
- **Direct messages** (1:1 and small groups) with live online presence.
- **Search** across lines and people, backed by a cached in-memory directory so
  display names, handles and ids all match.
- **All-lines broadcast console**: send one operational message to several lines
  at once, with a recipient counter and a 1,200-character guard.
- **Realtime delivery**: inbound messages appear instantly with unread badges;
  outbound messages show a delivery tick.
- **Attachments**: images, files, links and media cards render with a custom,
  constrained bubble layout.

### Station board

- **Live station board** with a station clock, day watch, platform rows and a
  train-movement scene driven by real Stream events.
- **Railway hooks** (`client/src/features/railway`) turn chat activity into board
  state, with unit tests for the event reducer.
- **Subtle idle motion** (steam, headlights, signal lamps, stars) that respects
  `prefers-reduced-motion`.
- **Route-map chat backdrop**: a CSS-only survey grid, running lines and station
  beads that adapts to both themes without shipping an image.

### Accounts and security

- Signup, login, logout and persistent sessions.
- **Password recovery**: request a one-time link by station handle or email, set
  a new password, and have every older session revoked. Links expire after 30
  minutes and are stored only as hashes. Accounts without an email can use
  `server/scripts/issue-reset.js` as an admin fallback.
- **Settings modal** with two tabs:
  - **Profile**: full name, phone, recovery email and avatar (JPG/PNG/GIF/WebP up
    to 2 MB). Changing the email requires the current password. Changes sync to
    Stream.
  - **Security**: change password (current password required, bcrypt 12 rounds).
- Avatars are uploads only, stored on the Stream CDN. The server verifies file
  signatures rather than trusting the declared MIME type.
- Session cookies are `httpOnly`; in production they are `Secure` and
  `SameSite=None`.
- Login is limited per IP and per account (failed attempts only), with a short
  lockout after repeated failures.
- Request bodies are capped at 256 KB and avatars at 2 MB.
- Security headers, CORS allow-listing, input trimming and length validation are
  applied on the server.
- Session revocation: password changes sign out other devices; the session
  cookie carries a version that is checked against the database.
- Session TTL is 7 days (configurable); `/auth/session` returns a fresh Stream
  token on each request.

### Interface

- Dark and light themes, remembered across reloads.
- Responsive layout: desktop two-column workspace and a mobile off-canvas drawer
  dismissed via backdrop, `Esc` or breakpoint change.
- Connection banner for browser offline and Stream socket reconnects.
- Toast feedback for session, profile, password, broadcast and theme actions.
- Skeleton loaders and accessible dialogs (`role="dialog"`, labelled controls,
  keyboard dismissal).
- Installable PWA with a railway-themed icon set and a service worker.

---

## Tech stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18.3 (Create React App 5), `stream-chat-react` 11, vanilla CSS design system, Inter |
| **Backend** | Node.js 22+, Express 5, `stream-chat` server SDK 9, bcrypt, multer, jsonwebtoken |
| **Database** | PostgreSQL (`pg`) in production, `node:sqlite` locally when `DATABASE_URL` is unset |
| **Chat transport** | Stream Chat (websocket + REST), server-issued user tokens |
| **Deployment** | Vercel (client SPA) + Render (API), same-origin `/api` rewrite |

---

## Project layout

```text
chat-app/
|-- client/                          # React single-page app
|   |-- public/                      # HTML shell, icons, manifest, service worker
|   |-- src/
|   |   |-- App.jsx                  # Session lifecycle, theme, auth shell
|   |   |-- config.js                # API URL + Stream key from env
|   |   |-- components/              # Auth, workspace, channels, settings, UI
|   |   |-- features/railway/        # Station board and train event hooks
|   |   |-- hooks/                   # Session, theme, online status, UI
|   |   |-- lib/                     # API client, Stream helpers, directory
|   |   |-- styles/                  # Tokens and per-surface stylesheets
|-- server/                          # Express REST API
|   |-- controllers/auth.js          # Auth, profile, password, avatar
|   |-- routes/auth.js               # /auth routes and rate limiting
|   |-- middleware/                  # requireAuth, validation, upload, security
|   |-- services/session.js          # Session issuance helpers
|   |-- scripts/                     # Reset links, user audit and cleanup
|   |-- utils/                       # Cookie and JWT helpers
|   |-- db.js                        # PostgreSQL / SQLite abstraction
|   |-- config.js                    # Env parsing and fail-fast checks
|   |-- index.js                     # App wiring, health check, static uploads
|-- docs/                            # Implementation and verification notes
|-- CHANGELOG.md
```

---

## Getting started

### Prerequisites

- **Node.js 22 or newer** (`node:sqlite` is required for the local fallback)
- npm
- A Stream Chat application (API key, secret and app id)

### 1. Clone and install

```bash
git clone https://github.com/nzubechukwudavid/chat-app.git
cd chat-app

cd server && npm install
cd ../client && npm install
```

### 2. Configure the API

```bash
cd server
cp .env.example .env
```

Fill in at least:

```env
PORT=5000
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret
STREAM_APP_ID=your_stream_app_id
# DATABASE_URL=postgres://...   # optional; omit to use server/users.db
```

Start the API:

```bash
npm start        # or: npm run dev (nodemon)
```

The database table is created automatically and the API listens on
`http://localhost:5000` (`GET /health` reports database and Stream status).

### 3. Configure the client

```bash
cd ../client
cp .env.example .env
```

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_STREAM_API_KEY=your_stream_api_key
```

```bash
npm start
```

The app opens at `http://localhost:3000`.

> The client's Stream key must match the server's key. A mismatch shows up as
> `JWTAuth error: signature is not valid` or `api_key not found` in the console.

---

## Configuration

### Server (`server/.env`)

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `5000` | API port |
| `NODE_ENV` | `development` | `production` enables Secure cookies |
| `STREAM_API_KEY` | - | **Required.** Stream app key |
| `STREAM_API_SECRET` | - | **Required.** Signs user tokens |
| `STREAM_APP_ID` | - | Stream app id (dashboard) |
| `VERCEL_FRONTEND_URL` | - | Primary allowed CORS origin in production |
| `CORS_ORIGINS` | empty | Comma-separated extra origins (for example Vercel previews) |
| `TRUST_PROXY` | `1` | Reverse-proxy hops Express trusts when resolving `req.ip` |
| `DATABASE_URL` | empty | PostgreSQL URL; empty means SQLite |
| `SESSION_SECRET` | Stream secret | Signs session cookies; set a dedicated random value |
| `SESSION_TTL_HOURS` | `168` | Session cookie lifetime (7 days) |
| `SESSION_COOKIE_NAME` | `railhub_session` | Cookie name |
| `BCRYPT_ROUNDS` | `12` | Password hashing cost |
| `RATE_LIMIT_ENABLED` | `true` | Global and per-route throttling |
| `RATE_LIMIT_STORE` | auto | `postgres` when `DATABASE_URL` is set, otherwise `memory` |
| `RATE_LIMIT_MAX` | `300` | Requests per window per IP |
| `RATE_LIMIT_AUTH_MAX` | `30` | Auth requests per 10-minute window |
| `RATE_LIMIT_ACCOUNT_MAX_FAILURES` | `6` | Failed logins before a temporary account lock |
| `PUBLIC_APP_URL` | `VERCEL_FRONTEND_URL` | Base URL used in password reset links |
| `PASSWORD_RESET_TTL_MINUTES` | `30` | Recovery link lifetime |
| `PASSWORD_RESET_FORGOT_MAX` | `3` | Recovery requests per identifier per window |
| `PASSWORD_RESET_FORGOT_WINDOW_MS` | `900000` | Recovery request window (15 minutes) |
| `MAIL_PROVIDER` | `none` | `brevo` to send recovery email; `none` disables delivery |
| `MAIL_API_KEY` | - | Brevo API key (server-only) |
| `MAIL_FROM` | - | Verified sender, e.g. `Rail Hub <no-reply@example.com>` |

### Client (`client/.env`)

| Variable | Purpose |
| :--- | :--- |
| `REACT_APP_API_URL` | API base URL for local development (`http://localhost:5000`) |
| `REACT_APP_STREAM_API_KEY` | Stream app key (public) |

In production the client calls `/api` and `client/vercel.json` rewrites that to
the Render service, keeping cookies first-party. `REACT_APP_API_URL` is only
used locally.

---

## API

All routes are under `/auth` unless noted.

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | - | Status: env, database, user count, Stream config, rate-limit store |
| `POST` | `/auth/signup` | - | Create account, Stream user and session |
| `POST` | `/auth/login` | - | Verify credentials, issue session |
| `POST` | `/auth/password/forgot` | - | Request a reset link (always the same response) |
| `POST` | `/auth/password/reset` | - | Consume a token and set a new password |
| `GET` | `/auth/session` | Cookie | Restore the current session |
| `GET` | `/auth/me` | Cookie | Current profile |
| `PATCH`/`PUT` | `/auth/me` | Cookie | Update full name, phone and email (email changes need the current password) |
| `PUT` | `/auth/password` | Cookie | Change password (current password required) |
| `POST` | `/auth/upload/avatar` | Cookie | Multipart avatar upload (`avatar` field) |
| `POST` | `/auth/logout` | Cookie | Clear the session |

Sessions are stateless: a server-issued session JWT is stored in an `httpOnly`
cookie. The short-lived Stream token that the browser SDK needs is created
separately and handed to the client over `/auth/session`. Password changes bump
the `token_version` so existing cookies become invalid.

Database user ids are generated at signup and **equal the Stream user id**, so
restoring an account means reusing that id rather than creating a new random one.

### Database schema

```sql
CREATE TABLE users (
  id            VARCHAR(64) PRIMARY KEY,   -- equals the Stream user id
  username      VARCHAR(100) UNIQUE NOT NULL,
  full_name     VARCHAR(255),
  phone_number  VARCHAR(50),
  avatar_url    TEXT,
  email         TEXT,                       -- optional recovery address
  password_hash TEXT NOT NULL,
  token_version INTEGER NOT NULL DEFAULT 0, -- version of the session cookie
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Recovery tokens are kept separately. Only the SHA-256 hash is stored, so the
raw link exists solely in the email (or the admin script's output):

```sql
CREATE TABLE password_resets (
  id           TEXT PRIMARY KEY,
  user_id      VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  requested_ip TEXT
);
```

A unique index on `LOWER(email)` keeps one account per inbox. SQLite uses the
same shape (with `TEXT` timestamps). Schema creation is idempotent, so both
fresh and existing databases work.

In PostgreSQL a second table holds shared rate-limit counters:

```sql
CREATE TABLE rate_limits (
  key       TEXT PRIMARY KEY,
  count     INTEGER NOT NULL,
  reset_at  TIMESTAMPTZ NOT NULL
);
```

Counters are updated with one atomic upsert, so multiple API instances see the
same limit. Local development uses an in-memory store instead.

---

## Testing

```bash
cd server
npm test                              # unit + HTTP integration tests

cd ../client
CI=true npm test -- --watchAll=false   # unit tests (railway event hooks)
CI=true npm run build                  # production build (warnings are errors)
```

The server suite includes real HTTP integration tests. They boot the Express app
on a random port, point `SQLITE_FILE` at a throwaway database and stub the
Stream SDK, so they need no network access and never touch production data.
Covered flows include signup validation and duplicate handles, login and session
cookies, profile updates, avatar upload validation, password change with cookie
revocation, logout, per-IP throttling and per-account failed-login lockout.

The main flows were also exercised end to end in a real browser: signup, login,
wrong-password and duplicate-handle errors, session restore, line creation, DMs,
realtime delivery and unread badges, broadcast console, station board, profile
save, avatar upload, password change, dark and light themes, mobile drawer and
the offline banner. Password recovery was verified in production with a real
inbox, replay rejection and session revocation.

---

## Deployment

1. **Client to Vercel.** Build `client/`, set `REACT_APP_STREAM_API_KEY`. The
   `/api` rewrite in `client/vercel.json` points at the API service.
2. **API to Render.** Set `NODE_ENV=production`, `STREAM_API_KEY`,
   `STREAM_API_SECRET`, `STREAM_APP_ID`, `SESSION_SECRET`,
   `VERCEL_FRONTEND_URL` and a durable `DATABASE_URL`.

Important production notes:

- **Always set `DATABASE_URL`.** Without it the API creates `server/users.db` on
  local disk; a free Render instance loses that file on redeploy, so users can
  no longer sign in even though their Stream accounts and messages survive.
- **Avatar files are on the Stream CDN** and served through Stream's image
  upload endpoint. No local disk storage is required in production. Stream's
  signed URLs expire after about 14 days; `/auth/session` and `/auth/me` refresh
  the stored URL from Stream before returning the profile.
- SMS/Twilio notifications were removed; there is no Stream webhook endpoint.
  Any webhook left in the Stream dashboard can be deleted.
- **Avatars are uploads only.** There is no avatar-URL field; the server checks
  the uploaded file's signature (JPG, PNG, GIF, WebP) and stores it on the
  Stream CDN. A renamed non-image file is rejected.
- **Password reset email** needs `PUBLIC_APP_URL` plus a Brevo API key and a
  sender address verified in the Brevo dashboard. Without those,
  `/auth/password/forgot` still answers normally but sends nothing; issue a link
  manually with `server/scripts/issue-reset.js <username>`. Never commit
  `MAIL_API_KEY`.
- **Existing users must add an email** in Settings before they can self-serve a
  reset. Accounts without one can still be recovered through the admin script.

---

## Security

- Passwords are hashed with bcrypt (12 rounds by default) and never returned by
  the API or written to cookies.
- Session cookies are `httpOnly`; in production they are `Secure` and
  `SameSite=None` so the same-origin proxy works.
- Login is limited per IP and per account (failed attempts only), with a short
  lockout after repeated failures. In production those counters live in the
  shared Postgres/Neon table, so they survive restarts and are shared by every
  API instance.
- Request bodies are capped at 256 KB and avatars at 2 MB; uploads are checked
  against their file signature, not just the declared MIME type.
- Security headers, CORS allow-listing, input trimming and length validation are
  applied on the server; channel names and handles are normalized before use.
- Session revocation: password changes sign out other devices; session cookies
  carry a version that is checked against the database.
- Session TTL is 7 days (configurable); `/auth/session` returns a fresh Stream
  token on each request.
- Password reset tokens are 256-bit, stored only as SHA-256 hashes, expire in 30
  minutes, work once, and are consumed only when the new password is submitted.
  The reset endpoint revokes every existing session and clears the account's
  failed-login lockout. Forgot-password responses are identical and time-floored
  so they cannot be used to discover which accounts exist.

---

## QA notes

- **Session revocation:** password changes sign out other devices; old session
  cookies become invalid after a version bump.
- **Avatar storage:** avatars are uploads only. The server verifies the file
  signature (JPG, PNG, GIF or WebP), stores the image on the Stream CDN and
  saves the returned URL. There is no avatar-URL field on signup or in Settings.
- **Rate limits:** shared Postgres/Neon counters in production; in-memory
  locally.
- **Notifications:** in-app toasts for messages in non-active channels.
- **Directory cleanup:** `server/scripts/audit-users.js` is a read-only audit.
  Approved IDs can then be passed to `cleanup-users.js`; nothing is deleted
  automatically.
- **Accessibility:** Lighthouse scores 100 for accessibility and best practices
  on the sign-in screen, the workspace and the station board. The settings
  dialog traps focus, closes on Escape, restores focus to the trigger and labels
  its tabs.
- **Tests:** client railway-hook tests and server unit plus HTTP integration
  tests pass. The Postgres/Neon code path is covered in production but not in the
  local suite.

---

## Known gaps

- **Directory cleanup:** test accounts and duplicate people can appear in search
  and member pickers because the directory mirrors Stream users. Run the audit
  and remove only the IDs you explicitly approve.
- **Rate limiting fails open** if the shared database is unavailable; the outage
  is logged, but throttling is temporarily skipped rather than taking
  authentication down.
- **No pagination UI** for very large channel histories beyond the SDK default.
- **The Postgres/Neon path is not integration-tested locally**; server tests use
  SQLite plus a stubbed Stream client, and the Neon store is verified in
  production through `/health` and rate-limit headers.
- **Two-account live test:** a real inbound message exchange between two
  production accounts is still worth repeating after each release.

---

## Documentation

- [CHANGELOG.md](CHANGELOG.md) - release history
- [docs/README.md](docs/README.md) - documentation index
- [docs/model-railway-plan.md](docs/model-railway-plan.md) - station board design and phases
- [docs/password-reset-plan.md](docs/password-reset-plan.md) - reset flow and production verification
- [docs/vite-migration-plan.md](docs/vite-migration-plan.md) - planned CRA to Vite migration
- [docs/archive/profile-and-features-plan.md](docs/archive/profile-and-features-plan.md) - historical profile/settings plan

---

## License

MIT.
