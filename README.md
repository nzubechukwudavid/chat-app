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
- **Settings modal** with three tabs:
  - **Profile** — full name, phone and avatar (upload a JPG/PNG/GIF/WebP up to
    2 MB, or paste an image URL). Changes sync to Stream.
  - **Security** — change password (current password required, bcrypt 12 rounds).
  - **Account** — permanent account deletion with a typed `DELETE` confirmation.
- Avatar uploads are stored under `server/uploads` and served from `/uploads`.
- Friendly validation and conflict errors (duplicate handle, wrong password,
  expired session).

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
    ├── controllers/auth.js          # Auth, profile, password, delete, avatar
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
| `VERCEL_FRONTEND_URL` | — | Allowed CORS origin in production |
| `DATABASE_URL` | empty | PostgreSQL URL; empty → SQLite |
| `SESSION_TTL_HOURS` | `168` | Session cookie lifetime (7 days) |
| `SESSION_COOKIE_NAME` | `railhub_session` | Cookie name |
| `BCRYPT_ROUNDS` | `12` | Password hashing cost |
| `RATE_LIMIT_ENABLED` | `true` | Global/per-route throttling |
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
| `GET` | `/health` | — | Status: env, database, user count, Stream config |
| `POST` | `/auth/signup` | — | Create account, Stream user and session |
| `POST` | `/auth/login` | — | Verify credentials, issue session |
| `GET` | `/auth/session` | Cookie | Restore the current session |
| `GET` | `/auth/me` | Cookie | Current profile |
| `PATCH`/`PUT` | `/auth/me` | Cookie | Update full name, phone, avatar URL |
| `PUT` | `/auth/password` | Cookie | Change password (current password required) |
| `DELETE` | `/auth/me` | Cookie | Delete account (also removes Stream user) |
| `POST` | `/auth/upload/avatar` | Cookie | Multipart avatar upload (`avatar` field) |
| `POST` | `/auth/logout` | Cookie | Clear the session |

Sessions are stateless: a signed Stream JWT is stored in an `httpOnly` cookie.
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
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

SQLite uses the same shape (with `TEXT` affinity). Schema creation is
idempotent, so both fresh and existing databases work.

---

## 🧪 Testing

```bash
cd client
CI=true npm test -- --watchAll=false   # unit tests (railway event hooks)
CI=true npm run build                  # production build (warnings are errors)
```

The main flows were also exercised end to end in a real browser: signup, login,
wrong-password and duplicate-handle errors, session restore, line creation,
DMs, realtime delivery and unread badges, broadcast console, station board,
profile save, avatar upload, password change, account deletion, dark/light
themes, mobile drawer and the offline banner.

---

## 🚢 Deployment

1. **Client → Vercel.** Build `client/`, set `REACT_APP_STREAM_API_KEY`. The
   `/api` rewrite in `client/vercel.json` points at the API service.
2. **API → Render.** Set `NODE_ENV=production`, `STREAM_API_KEY`,
   `STREAM_API_SECRET`, `STREAM_APP_ID`, `VERCEL_FRONTEND_URL` and a durable
   `DATABASE_URL`.

Important production notes:
- **Always set `DATABASE_URL`.** Without it the API creates `server/users.db` on
  local disk; a free Render instance loses that file on redeploy, so users can
  no longer sign in even though their Stream accounts and messages survive.
- **Avatar files are local.** `server/uploads` is not backed by object storage,
  so uploaded images disappear on the same ephemeral hosts. Use a persistent
  disk or S3-style storage before relying on uploads in production.
- SMS/Twilio notifications were removed; there is no Stream webhook endpoint.
  Any webhook left in the Stream dashboard can be deleted.
- The avatar **URL** field accepts any `http(s)` URL, not only direct image
  links. A page URL (for example a Freepik detail page) saves successfully but
  renders as initials.

---

## 🔒 Security

- Passwords are hashed with bcrypt (12 rounds by default) and never returned by
  the API or written to cookies.
- Session cookies are `httpOnly`; in production they are `Secure` and
  `SameSite=None` so the same-origin proxy works.
- Login is limited per IP and per account (failed attempts only), with a
  short lockout after repeated failures.
- Request bodies are capped at 256 KB and avatars at 2 MB; uploads are limited
  to image MIME types and safe extensions.
- Security headers, CORS allow-listing, input trimming and length validation are
  applied on the server; channel names and handles are normalized before use.

---

## ⚠️ Known gaps

- **Uploaded avatars are not durable** on ephemeral hosting (see Deployment).
- **Avatar URL validation is permissive**; non-image URLs save but show initials.
- **Directory cleanup**: test accounts and duplicate people can appear in search
  and member pickers because the directory mirrors Stream users. Remove stray
  Stream users to clean this up.
- **Failed-login lockout and rate limits are in-memory**; they reset whenever
  the API restarts and are not shared across multiple instances.
- **No pagination UI** for very large channel histories beyond the SDK default.
- **No automated server test suite**; only the client railway hooks have tests.

---

## 📄 License

MIT.
