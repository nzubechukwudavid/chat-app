# Extended Robust Plan: Profile Management & UX Improvements

Last updated: 2026-10-28
Repo: nzubechukwudavid/chat-app (main at 83f4db1)
Production: https://nrc-chat.vercel.app (serves older bundles; latest commits not deployed due to prior build failure)

## 1) Current State (Verified)

### Client (React + CRA + Stream Chat)
- Auth flow via `useSession` (cookie-based httpOnly session, Stream token in memory). `App.jsx` splits workspace with lazy loading.
- Sidebar/rail: `ChannelListContainer.jsx` - unified rail with board icon dual-purpose (expand when collapsed, open station board when expanded), sign-out restored to rail, profile bar shows avatar/name/handle (read-only).
- UI primitives: `Avatar`, icons, theme toggle, toast.
- No profile/settings UI, no edit endpoints called.

### Server (Express + SQLite/Postgres)
- Routes: `routes/auth.js` (signup, login, session, logout) with rate limiting.
- Controllers: `controllers/auth.js` (bcrypt, Stream user upsert/token, timing-equalizer).
- DB schema (`db.js`): `users(id, username, full_name, phone_number, avatar_url, password_hash, created_at)`. Postgres/SQLite compatible.
- Session: httpOnly cookie via `services/session.js`. Auth middleware not present yet (we need one for protected routes).
- No user update/delete/upload endpoints.

### Deployment
- Vercel build failed at commit `0c43be2` due to `no-unused-vars` (`BoardLink`, `handleSignOut`) with `CI=true` treating warnings as errors. Fixed in `d2ed97e`, sign-out restored in `83f4db1`. Local client build passes. Production serves `main.2856680c.js` / `main.c4a2071a.css` (stale). Need to ensure clean build on main and trigger deployment.

## 2) Goals
- Add robust profile/account management (view/edit profile, avatar, password change, account deletion).
- Add settings UI accessible from rail/profile.
- Improve UX (empty states, validation, toasts, accessibility).
- Maintain security (httpOnly cookies, bcrypt, rate limiting, input validation, timing-safe patterns).
- Keep changes consistent with existing style/patterns.
- Ensure Vercel deployment succeeds.

## 3) Branch Strategy
Create feature branch from latest main before implementation:
- Branch name: `feature/profile-settings` (or `feat/user-profile-management`)
- Base: `main` @ `83f4db1`
- Work in this branch, open PR to main when ready. Ensure CI passes.

## 4) Server-Side Plan

### 4.1 Auth middleware
Create `server/middleware/auth.js`:
- Read session cookie via `readSessionCookie(req)`, verify with `verifyUserToken` (or existing session service). Attach `req.user = { id, username, ... }` or `req.userId`.
- Return 401 if invalid/missing.

### 4.2 DB helpers
Extend `server/db.js`:
- `getUserById(id)`, `getUserByUsername(username)` (may exist partially)
- `updateUser(id, updates)` - partial update, whitelist fields: `full_name`, `phone_number`, `avatar_url`. Build dynamic SET clause. Return updated user (exclude password_hash).
- `updatePassword(id, passwordHash)` 
- `deleteUser(id)` - remove user row. Consider cleanup (sessions if stored elsewhere - currently cookie-based only).
- Ensure transactions where needed.

### 4.3 Auth controller extensions
Extend `server/controllers/auth.js`:
- `getMe(req, res)` - require auth, return current user from DB (exclude hash). Also include Stream token if needed? Session already returns token; getMe can return user profile.
- `updateMe(req, res)` - require auth. Validate body: `full_name` (max 100), `phone_number` (E.164-ish or digits, max 20), `avatar_url` (valid http(s) URL, max 512). Sanitize. Update DB. Upsert to Stream Chat with updated `name`, `image`. Return updated user.
- `changePassword(req, res)` - require auth. Body: `currentPassword`, `newPassword`. Verify current with bcrypt.compare against stored hash. Enforce password policy (min 8 chars, basic complexity). Hash with bcrypt (existing cost). Update. Invalidate sessions? Cookie remains valid unless we track sessions; for now just update hash.
- `deleteMe(req, res)` - require auth. Body may require confirmation (e.g., `confirm: true` or password). Delete from DB. Optionally delete Stream user. Clear session cookie. Return 204.

Also need to export new functions.

### 4.4 Routes
Extend `server/routes/auth.js`:
- `GET /me` - auth required
- `PATCH /me` or `PUT /me` - auth required
- `PUT /password` or `POST /change-password` - auth required
- `DELETE /me` - auth required
Apply rate limiting where appropriate (password changes stricter).

### 4.5 Validation
Extend `server/middleware/validate.js` or add validators for profile updates/password.

### 4.6 File upload (avatar)
If adding upload: `server/middleware/upload.js` with multer, disk storage to `uploads/` or cloud. Serve static files. Validate mime/types and size (e.g., 2MB). Add `POST /upload/avatar`. Alternatively start with URL-only (simpler, safer) and add upload later.

## 5) Client-Side Plan

### 5.1 API layer
Extend `client/src/lib/api.js`:
- `fetchMe()` -> GET /auth/me
- `updateMe(payload)` -> PATCH /auth/me
- `changePassword(payload)` -> PUT /auth/password
- `deleteMe(confirm)` -> DELETE /auth/me
- `uploadAvatar(file)` -> multipart POST if added

### 5.2 Session hook
Extend `client/src/hooks/useSession.js`:
- Add `refresh()` to re-fetch session/me
- Add `updateProfile(updates)` that calls API and updates state
- Add `changePassword()`, `deleteAccount()`
- Keep tokens in memory only.

### 5.3 UI Components
- `client/src/components/settings/SettingsModal.jsx` - modal with tabs: Profile, Security, Account. Accessible, keyboard navigable.
- `client/src/components/settings/ProfileForm.jsx` - edit full name, phone, avatar URL with preview.
- `client/src/components/settings/PasswordForm.jsx` - change password.
- `client/src/components/settings/DangerZone.jsx` - delete account with confirmation.
- Add gear/settings button to rail (or make profile bar clickable). Update `ChannelListContainer.jsx` and styles.

### 5.4 Styling
Update `client/src/styles/navigation.css` and add settings styles.

## 6) Implementation Phases (Detailed)

### Phase 0: Prep (immediate)
- [ ] Verify production status (done - up but stale). Confirm Vercel project connected.
- [ ] Ensure local builds pass (client passes). Test server starts.
- [ ] Create branch `feature/profile-settings` from main.
- [ ] Document current behavior.

### Phase 1: Server - Auth middleware & profile endpoints (core)
1. Create `server/middleware/auth.js` with session verification.
2. Extend `db.js` with user update/delete helpers.
3. Extend `controllers/auth.js` with `getMe`, `updateMe`, `changePassword`, `deleteMe`.
4. Update `routes/auth.js` to add protected routes.
5. Add validation.
6. Test with curl/Postman style requests.

### Phase 2: Client - API & session
1. Extend `lib/api.js` with new methods.
2. Extend `useSession.js` with profile/password/account actions.
3. Handle errors/toasts.

### Phase 3: Client - Settings UI
1. Create settings modal and forms.
2. Add entry point (rail gear icon + clickable profile bar).
3. Wire up to session actions.
4. Style consistently.

### Phase 4: Avatar upload (optional but nice)
1. Server upload endpoint + static serving.
2. Client file upload in profile form.

### Phase 5: Testing & QA
- Auth flows, profile edit, password change, delete account.
- Rail behavior (collapse/expand, board, sign-out).
- Responsive/mobile.
- Error cases, validation.
- Build passes.

### Phase 6: Deploy
- Commit to feature branch, push.
- Ensure client/server build clean.
- Create PR to main.
- Merge after CI passes; verify Vercel deployment.

## 7) Security Considerations
- All profile mutations require authenticated session.
- Whitelist updatable fields only.
- Validate URLs, lengths, phone formats.
- Password change requires current password.
- Rate limit sensitive endpoints.
- Never return password_hash.
- Use httpOnly cookies, secure in prod.
- Sanitize inputs.
- Timing-safe comparisons where relevant.
- Account deletion requires confirmation.

## 8) Acceptance Criteria
- [ ] User can view/edit profile (name, phone, avatar) from settings.
- [ ] Avatar updates reflected in UI and Stream.
- [ ] User can change password with validation.
- [ ] User can delete account with confirmation.
- [ ] Settings accessible from rail/profile.
- [ ] All endpoints authenticated and validated.
- [ ] No lint/build errors.
- [ ] Production deployment succeeds with latest changes.

## 9) Notes & Gotchas
- Stream user upsert needed on profile updates (`upsertToStream` pattern exists in signup).
- Local storage only for nav preference (ok).
- Vercel serves static client; server needs to be deployed separately if not using same repo setup - but this repo appears monorepo style; check vercel config.
- CI treats warnings as errors - always check lint.
- Focus management in rail already implemented.

## Immediate Next Steps
1. Create branch `feature/profile-settings`.
2. Implement Phase 1 server changes.
3. Test locally.
4. Implement Phase 2-3 client.
5. Build and verify.
6. Push and prepare for deployment.
7. Address any Vercel issues.