# Password Reset — Implementation Plan

Status: **implemented locally** (server, client, admin fallback, tests). Remaining
work is deployment: configure Brevo on Render and run a real-inbox check.

## 0. What was built

- `users.email` (optional, lower-cased, unique) and the `password_resets` table
  on both Postgres and SQLite.
- `POST /auth/password/forgot` and `POST /auth/password/reset`, with identical
  responses for unknown accounts, hashed single-use tokens, a 30-minute TTL, and
  session revocation on success.
- Brevo mailer plus a memory transport for tests; `MAIL_PROVIDER=none` is valid
  and keeps the admin script usable.
- `server/scripts/issue-reset.js <username-or-email>` for manual recovery.
- Forgot/reset screens, an optional signup email field, and a recovery email
  field in Settings that requires the current password.
- Integration coverage in `server/test/auth-reset.test.js`.


## 1. Goal

Let a locked-out user set a new password without an administrator touching the
database, while keeping the existing security posture:

- No account enumeration.
- One-time, short-lived tokens stored only as hashes.
- Every existing session revoked after a reset.
- Works with the current stack (Express + Postgres/Neon + React/Vercel), with no
  new runtime dependency.

## 2. Delivery options

The token mechanics are the same in every option; only delivery differs.

| Option | Self-service | Extra setup | Effort |
|---|---|---|---|
| A. Email reset link | Yes | Email provider + `email` field | ~1 day |
| B. Admin-issued code | No | None | ~2–3 hours |
| C. Email + admin fallback | Yes, with a manual path | Email provider + `email` field | ~1 day |

**Recommendation: C.** Build the token core and the reset screen once. Deliver
by email when a provider is configured, and keep a small admin script for
accounts without an email or when mail is down. This also makes the feature
usable immediately, before every user has added an email address.

## 3. User experience

### 3.1 Forgot password

- "Forgot password?" link under the sign-in form.
- Form asks for **username or email**.
- On submit the API always returns the same message:
  > If an account matches, a reset link is on its way. Check your inbox.
- No indication whether the account exists, has no email, or is rate-limited.

### 3.2 Reset screen

- Email link points to `https://<frontend>/reset-password?token=<raw-token>`.
- Screen shows new password + confirm, reusing the existing strength meter and
  password rules.
- On success: "Password updated. Sign in with your new password." and a link
  back to sign-in.
- Invalid/expired/reused token: "This reset link is invalid or has expired."

### 3.3 Settings

- Add an **Email** field to the Profile tab, marked "Used only for password
  recovery".
- Changing or setting an email requires the **current password** (same rule as
  changing the password), so a stolen session cannot silently redirect recovery
  mail.
- Existing accounts see an inline prompt until an email is set.

## 4. API

### `POST /auth/password/forgot`

Body: `{ "identifier": "<username or email>" }`

- Normalise and look up by username or lower-cased email.
- If a user has an email: invalidate that user's unused tokens, create one new
  token, send the email.
- Always `200` with the generic message.
- Floor the response time at ~400 ms so a hit/miss difference is not observable.

### `POST /auth/password/reset`

Body: `{ "token": "<raw token>", "newPassword": "<password>" }`

- Validate the password with the existing `validatePassword`.
- Hash the supplied token with SHA-256, look it up, require:
  - row exists,
  - `used_at IS NULL`,
  - `expires_at > now()`.
- In one transaction: update `password_hash`, bump `token_version`, mark the
  token used, delete the user's other tokens, clear failed-login counters.
- Clear the session cookie and return `200`.
- Invalid token, expired token, reused token and missing user all return the
  same `400` message.

No `GET /reset/:token` validation endpoint: mail scanners prefetch links, and a
GET must never consume or validate a token. Validation happens on POST.

## 5. Data model

### `users`

Add `email TEXT NULL`, normalised to trimmed lower-case.

Postgres:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx
  ON users (LOWER(email)) WHERE email IS NOT NULL;
```

SQLite: probe `PRAGMA table_info(users)` like the existing `token_version`
migration, then create the same partial unique index.

`publicUser()` gains `email` (only returned to the authenticated owner and at
signup).

### `password_resets`

```sql
CREATE TABLE IF NOT EXISTS password_resets (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  requested_ip TEXT
);
CREATE INDEX IF NOT EXISTS password_resets_user_idx ON password_resets (user_id);
CREATE INDEX IF NOT EXISTS password_resets_expires_idx ON password_resets (expires_at);
```

SQLite equivalent with `TEXT` timestamps and `PRAGMA foreign_keys = ON`.

### Token rules

- 32 random bytes from `crypto.randomBytes`, encoded base64url.
- Store only `sha256(token)` hex. The raw token exists only in the email/script
  output and the user's browser.
- TTL 30 minutes (`PASSWORD_RESET_TTL_MINUTES`, default 30).
- One active token per user: creating a new one deletes older unused rows.
- Single use: set `used_at` in the same transaction as the password change.
- A periodic sweep (same place the rate-limit sweep runs) deletes expired rows.

## 6. Email delivery

`server/services/mailer.js` exposes `sendPasswordReset({ to, username, resetUrl })`
and returns `{ ok, error? }`. Uses built-in `fetch`, no SDK.

Configuration (Render):

```
PUBLIC_APP_URL=https://nrc-chat.vercel.app
MAIL_PROVIDER=brevo            # or resend, or none
MAIL_API_KEY=...
MAIL_FROM="Rail Hub <no-reply@your-domain>"
```

Provider notes:

- **Brevo** — verify a sender address in the dashboard; can send to arbitrary
  recipients without owning a domain. Free tier is sufficient.
- **Resend** — needs a verified domain for arbitrary recipients; the sandbox
  sender only delivers to the account owner.
- **Gmail SMTP** — possible but poor deliverability and needs `nodemailer`;
  not recommended.

The email contains a plain-text and a minimal HTML body:

```
A password reset was requested for your Rail Hub account (<username>).
This link expires in 30 minutes and can be used once:
<resetUrl>

If you did not request this, ignore this message.
```

Mail failure is logged but never changes the API response, so the endpoint
cannot be used to probe whether an address exists.

## 7. Admin fallback

`server/scripts/issue-reset.js <username>`

- Creates the same token and prints the reset URL. Does not send email.
- Prints the expiry and a warning that it is a bearer link.
- Used for accounts with no email, or if the mail provider is unavailable.
- Requires `DATABASE_URL` when run against production.

## 8. Security checklist

- Generic responses and a minimum response time on forgot.
- Token hashed at rest; 256-bit entropy; 30-minute expiry; single use.
- Reset link consumed only on POST, never on GET (stops link scanners).
- `password_resets` cascades on user deletion.
- Reset reuses `db.updatePassword`, so `token_version` increments and every
  older cookie is rejected.
- Clear the session cookie in the reset response.
- Rate limits:
  - `POST /password/forgot`: existing per-IP auth limiter plus 3 requests per
    account per 15 minutes, keyed through the shared rate-limit store.
  - `POST /password/reset`: per-IP limiter plus the sensitive limiter.
  - Failed-lockout counters for the account are cleared on success.
- Strip the token from the address bar after load (`history.replaceState`) and
  keep the page on `Referrer-Policy: strict-origin-when-cross-origin`.
- Email changes require the current password.
- Do not log raw tokens.

## 9. Files

### Server

| File | Change |
|---|---|
| `server/config.js` | reset TTL, public app URL, mail settings, feature flags |
| `server/db.js` | `email` column/index, `password_resets` table, user lookups by email, token create/consume/delete helpers |
| `server/controllers/auth.js` | `forgotPassword`, `resetPassword`, email in `publicUser`/signup/updateMe, current-password check for email changes |
| `server/routes/auth.js` | two routes with the existing limiters and a per-account forgot limiter |
| `server/middleware/validate.js` | email validation/normalisation |
| `server/services/mailer.js` | new provider-agnostic sender |
| `server/scripts/issue-reset.js` | new admin fallback |
| `server/index.js` | sweep expired reset rows alongside rate-limit cleanup |
| `server/support/harness.js` | in-memory mail transport + outbox for tests |
| `server/test/auth-reset.test.js` | new integration tests |
| `server/test/auth-flows.test.js` | email in signup/profile flows |

### Client

| File | Change |
|---|---|
| `client/src/components/Auth.jsx` | "Forgot password?" link and request form |
| `client/src/components/ResetPassword.jsx` | new token screen |
| `client/src/App.jsx` | render the reset screen for `/reset-password` before auth |
| `client/src/components/settings/SettingsModal.jsx` | email field + current-password field when changing it |
| `client/src/lib/api.js` | `requestPasswordReset`, `resetPassword` |
| `client/src/hooks/useSession.js` | expose the two calls (or import directly from `api`) |
| `client/src/styles/auth.css` | reset form styles |
| `client/vercel.json` | no change — the SPA fallback already serves `/reset-password` |

## 10. Tests

Integration (SQLite + stubbed Stream + memory mail transport):

1. Forgot with an unknown identifier returns `200` and sends nothing.
2. Forgot with a known user returns `200`, sends one email, and the raw token is
   not present in the database (only its hash).
3. Reset with a valid token changes the password; the old password fails and the
   new one works.
4. Token reuse fails.
5. Expired token fails (inject an expiry in the past).
6. A second forgot request invalidates the first token.
7. Reset revokes older session cookies.
8. Password policy is enforced.
9. Per-account forgot throttling returns `429` after the configured number.
10. Email change requires the current password and rejects duplicates
    case-insensitively.
11. Email is never returned in another user's payload.

Client: password confirmation and invalid-token error state.

## 11. Rollout

1. Deploy server with the schema changes and mailer disabled (`MAIL_PROVIDER=none`).
2. Add provider credentials and `PUBLIC_APP_URL` on Render; redeploy.
3. Deploy the client.
4. Each existing user sets an email in Settings (2 users today).
5. End-to-end check with a real inbox: request, receive, reset, confirm old
   password and old sessions fail.
6. Re-run Lighthouse on the forgot and reset screens.
7. Confirm no raw tokens appear in logs.

## 12. Effort

| Part | Estimate |
|---|---|
| Schema + token helpers + endpoints | 3–4 h |
| Mailer + provider setup | 1 h |
| Admin script | 30 min |
| Client screens + a11y | 3–4 h |
| Tests + docs | 2 h |
| **Total** | **~1 day** |

Admin-only delivery (option B) is roughly 2–3 hours and needs no email column,
provider, or new screens beyond a reset form.

## 13. Out of scope

- Email verification on signup (recommended later; this plan treats email as a
  recovery address, not an identity).
- SMS reset; Twilio was removed and phone numbers are unverified.
- Security questions.
- Forced password rotation.
