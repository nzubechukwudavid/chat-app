# Rail Hub 🚆

**Real-time operations and departmental communications for the Nigerian Railway Corporation.**

Rail Hub gives station masters, dispatchers, engineers and administrative staff one
workspace for corridor channels, direct messages, a live station board and
all-station broadcasts — wrapped in an executive dark‑emerald design system.

![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-22+-green?logo=node.js)
![Express](https://img.shields.io/badge/Express-5-lightgrey?logo=express)
![Stream Chat](https://img.shields.io/badge/Stream%20Chat-SDK-006CFF?logo=stream)
![Database](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20SQLite-darkblue)

---

## ✨ Features

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

### Operations
- **Station Board** with a live station clock, day watch, platform rows and a
  train-movement scene driven by Stream events.
- **Railway network hooks** (`features/railway`) turn chat activity into board
  state, with unit tests for the event reducer.

### Account & profile
- Signup, login, logout and persistent sessions.
- **Settings modal** with two tabs:
  - **Profile** — full name, phone and avatar (upload a JPG/PNG/GIF/WebP up to
    2 MB, or paste an image URL). Changes sync to Stream.
  - **Security** — change password (current password required, bcrypt 12 rounds).
- Avatar uploads are stored on Stream CDN and served via Stream's image URL.
- Friendly validation and conflict errors (duplicate handle, wrong password,
  expired session).
- Session cookies are `httpOnly`; in production they are `Secure` and `SameSite=None`.
- Login is limited per IP and per account (failed attempts only), with a short lockout after repeated failures.
- Request bodies are capped at 256 KB and avatars at 2 MB; uploads are limited to image MIME types.
- Security headers, CORS allow-listing, input trimming and length validation applied on the server.
- Session revocation: password changes sign out other devices; session cookie carries `sv` version that is checked against DB.
- Session TTL is 7 days (configurable); `/auth/session` returns a fresh Stream token on each request.

### UX
- Dark and light themes, remembered across reloads.
- Responsive layout: desktop two-column workspace, mobile off-canvas drawer,
  and dismissal via backdrop, `Esc` or breakpoint change.
- Connection banner for browser offline **and** Stream socket reconnects.
- Toast feedback for session, profile, password, broadcast and theme actions.
- Skeleton loaders and accessible dialogs (`role="dialog"`, labelled controls,
  keyboard dismissal).

---

## 🛠️ Tech stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18.3 (Create React App 5), `stream-chat-react` 11, vanilla CSS design system, Inter |
| **Backend** | Node.js 22+, Express 5, `stream-chat` server SDK 9, bcrypt, multer, jsonwebtoken |
| **Database** | PostgreSQL (`pg`) in production, `node:sqlite` locally when `DATABASE_URL` is unset |
| **Chat transport** | Stream Chat (websocket + REST), server-issued user tokens |
| **Deployment** | Vercel (client SPA) + Render (API), same-origin `/api` rewrite |

---

## 📁 Project layout

```
chat-app/
├── client/                          # React single-page app
│   ├── public/                      # HTML shell, fonts, NRC metadata
│   └── src/
│       ├── App.jsx                  # Session lifecycle, theme, auth shell
│       ├── config.js                # API URL + Stream key from env
│       ├── components/
│       │   ├── Auth.jsx             # Sign in / create account
│       │   ├── Workspace.jsx        # Stream connection + app frame
│       │   ├── Channel*.jsx         # List, header, message pane
│       │   ├── CreateChannel.jsx    # Create-line dialog
│       │   ├── BroadcastConsole.jsx # All-lines composer
│       │   ├── settings/            # Profile / Security / Account modal
│       │   └── ui/                  # Modal, Toast, Avatar, icons, banner
│       ├── features/railway/        # Station board + train event hooks
│       ├── hooks/                   # Session, theme, online status, UI
│       ├── lib/                     # API client, Stream helpers, directory
│       └── styles/                  # Tokens + per-surface stylesheets
└── server/                          # Express REST API
    ├── controllers/auth.js          # Auth, profile, password, avatar
    ├── routes/auth.js               # /auth routes + rate limiting
    ├── middleware/                  # requireAuth, validation, upload, security
    ├── services/session.js          # Session issuance helpers
    ├── utils/                       # Cookie + JWT helpers
    ├── db.js                        # PostgreSQL / SQLite abstraction
    ├── config.js                    # Env parsing + fail-fast checks
    └── index.js                     # App wiring, health check, static uploads
```

---

## 🚀 Getting started

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

## ⚙️ Configuration

### Server (`server/.env`)

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `5000` | API port |
| `NODE_ENV` | `development` | `production` enables Secure cookies |
| `STREAM_API_KEY` | — | **Required.** Stream app key |
| `STREAM_API_SECRET` | — | **Required.** Signs user tokens |
| `STREAM_APP_ID` | — | Stream app id (dashboard) |
| `VERCEL_FRONTEND_URL` | — | Primary allowed CORS origin in production |
| `CORS_ORIGINS` | empty | Comma-separated extra origins (for example Vercel previews) |
| `TRUST_PROXY` | `1` | Reverse-proxy hops Express trusts when resolving `req.ip` |
| `DATABASE_URL` | empty | PostgreSQL URL; empty → SQLite |
| `SESSION_SECRET` | Stream secret | Signs session cookies; set a dedicated random value |
| `SESSION_TTL_HOURS` | `168` | Session cookie lifetime (7 days) |
| `SESSION_COOKIE_NAME` | `railhub_session` | Cookie name |
| `BCRYPT_ROUNDS` | `12` | Password hashing cost |
| `RATE_LIMIT_ENABLED` | `true` | Global/per-route throttling |
| `RATE_LIMIT_STORE` | auto | `postgres` when `DATABASE_URL` is set, otherwise `memory` |
| `RATE_LIMIT_MAX` | `300` | Requests per window per IP |
| `RATE_LIMIT_AUTH_MAX` | `30` | Auth requests per 10-minute window |
| `RATE_LIMIT_ACCOUNT_MAX_FAILURES` | `6` | Failed logins before a temporary account lock |

### Client (`client/.env`)

| Variable | Purpose |
| :--- | :--- |
| `REACT_APP_API_URL` | API base URL for local development (`http://localhost:5000`) |
| `REACT_APP_STREAM_API_KEY` | Stream app key (public) |

In production the client calls `/api` and `client/vercel.json` rewrites that to
the Render service, keeping cookies first-party. `REACT_APP_API_URL` is only
used locally.

---

## 🔌 API

All routes are under `/auth` unless noted.

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | — | Status: env, database, user count, Stream config, rate-limit store |
| `POST` | `/auth/signup` | — | Create account, Stream user and session |
| `POST` | `/auth/login` | — | Verify credentials, issue session |
| `GET` | `/auth/session` | Cookie | Restore the current session |
| `GET` | `/auth/me` | Cookie | Current profile |
| `PATCH`/`PUT` | `/auth/me` | Cookie | Update full name, phone, avatar URL |
| `PUT` | `/auth/password` | Cookie | Change password (current password required) |
| `POST` | `/auth/upload/avatar` | Cookie | Multipart avatar upload (`avatar` field) |
| `POST` | `/auth/logout` | Cookie | Clear the session |

Sessions are stateless: a server-issued session JWT is stored in an `httpOnly`
cookie. The short-lived Stream token that the browser SDK needs is created
separately and handed to the client over `/auth/session`. Password changes
bump the `token_version` so existing cookies become invalid.

Database user ids are generated at signup and **equal the Stream user id**,
so restoring an account means reusing that id rather than creating a new random one.

### Database schema

```sql
CREATE TABLE users (
  id            VARCHAR(64) PRIMARY KEY,   -- equals the Stream user id
  username      VARCHAR(100) UNIQUE NOT NULL,
  full_name     VARCHAR(255),
  phone_number  VARCHAR(50),
  avatar_url    TEXT,
  password_hash TEXT NOT NULL,
  token_version INTEGER NOT NULL DEFAULT 0,  -- version of the session cookie
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

SQLite uses the same shape (with `TEXT` affinity). Schema creation is
idempotent, so both fresh and existing databases work.

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

## 🧪 Testing

```bash
cd server
npm test                              # unit + HTTP integration tests

cd ../client
CI=true npm test -- --watchAll=false   # unit tests (railway event hooks)
CI=true npm run build                  # production build (warnings are errors)
```

The server suite now includes real HTTP integration tests. They boot the
Express app on a random port, point `SQLITE_FILE` at a throwaway database and
stub the Stream SDK, so they need no network access and never touch production
data. Covered flows: signup validation and duplicate handles, login/session
cookies, profile updates, avatar upload validation, password change with cookie
revocation, logout, per-IP throttling and per-account failed-login lockout.

The main flows were also exercised end to end in a real browser: signup, login,
wrong-password and duplicate-handle errors, session restore, line creation,
DMs, realtime delivery and unread badges, broadcast console, station board,
profile save, avatar upload, password change, dark/light themes, mobile drawer
and the offline banner. Phase 5 re-checked login, settings validation, theme
switching, sign-out and the settings dialog keyboard behaviour in the in-app
browser; that harness cannot emulate a phone viewport, so the responsive
breakpoints were reviewed in CSS instead.

## 🚢 Deployment

1. **Client → Vercel.** Build `client/`, set `REACT_APP_STREAM_API_KEY`. The
   `/api` rewrite in `client/vercel.json` points at the API service.
2. **API → Render.** Set `NODE_ENV=production`, `STREAM_API_KEY`,
   `STREAM_API_SECRET`, `STREAM_APP_ID`, `SESSION_SECRET`,
   `VERCEL_FRONTEND_URL` and a durable `DATABASE_URL`.

Important production notes:
- **Always set `DATABASE_URL`.** Without it the API creates `server/users.db` on
  local disk; a free Render instance loses that file on redeploy, so users can
  no longer sign in even though their Stream accounts and messages survive.
- **Avatar files are on Stream CDN** and served through Stream's image upload
  endpoint. No local disk storage is required in production. Stream's signed
  URLs expire after about 14 days; `/auth/session` and `/auth/me` refresh the
  stored URL from Stream before returning the profile.
- SMS/Twilio notifications were removed; there is no Stream webhook endpoint.
  Any webhook left in the Stream dashboard can be deleted.
- The avatar **URL** field only accepts an `https://` link. It does not verify
  that the link is a direct image, so a page URL can save but render as initials.

---

## 🔒 Security

- Passwords are hashed with bcrypt (12 rounds by default) and never returned by
  the API or written to cookies.
- Session cookies are `httpOnly`; in production they are `Secure` and
  `SameSite=None` so the same-origin proxy works.
- Login is limited per IP and per account (failed attempts only), with a
  short lockout after repeated failures. In production those counters live in
  the shared Postgres/Neon table, so they survive restarts and are shared by
  every API instance.
- Request bodies are capped at 256 KB and avatars at 2 MB; uploads are limited
  to image MIME types and safe extensions.
- Security headers, CORS allow-listing, input trimming and length validation are
  applied on the server; channel names and handles are normalized before use.
- Session revocation: password changes sign out other devices; session cookies carry `sv` version that is checked against DB.
- Session TTL is 7 days (configurable); `/auth/session` returns a fresh Stream token on each request.

---

## 📝 Notable QA outcomes (Phase 0/1 complete, Phase 5 automated)

- **Session revocation:** Password changes sign out other devices; old session cookies become invalid after a version bump.
- **Avatar storage:** Uploaded images are stored on Stream CDN and served via Stream's image URL. Avatar URL validation requires an `https://` link.
- **Account deletion:** Removed from the UI and API as per user request.
- **Rate limits:** Shared Postgres/Neon counters in production; in-memory locally.
- **Notifications:** In-app toasts for messages in non-active channels are implemented (Phase 4).
- **Directory cleanup:** `server/scripts/audit-users.js` is a read-only audit. Approved IDs can then be passed to `cleanup-users.js`; nothing is deleted automatically.
- **Tests:** Client railway-hook tests and server unit + HTTP integration tests pass. The Postgres/Neon code path is covered in production but not in the local suite.
- **Accessibility:** Lighthouse scores 100 for accessibility and best practices on both the sign-in screen and the workspace. The settings dialog now traps focus, closes on Escape, restores focus to the trigger, and labels its tabs; channel rows expose their visible text to screen readers.

---

## ⚠️ Known gaps

- **Avatar URL validation is shallow**; it checks `https://` but not that the
  link is a direct image, so a page URL can save but show initials.
- **Directory cleanup**: test accounts and duplicate people can appear in search
  and member pickers because the directory mirrors Stream users. Run the audit
  and remove only the IDs you explicitly approve.
- **Rate limiting fails open** if the shared database is unavailable; the
  outage is logged, but throttling is temporarily skipped rather than taking
  authentication down.
- **No pagination UI** for very large channel histories beyond the SDK default.
- **The Postgres/Neon path is not integration-tested locally**; server tests use
  SQLite plus a stubbed Stream client, and the Neon store is verified in
  production through `/health` and rate-limit headers.

---

## 📄 License

MIT.
