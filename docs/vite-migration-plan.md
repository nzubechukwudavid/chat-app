# CRA to Vite Migration Plan

Status: implemented and deployed to production (2026-11-05)
Branch: `chore/vite-migration` (merged)
Base: `main` at `036cdac` (2026-11-04)
Last updated: 2026-11-05

## 1. Summary

Replace Create React App (`react-scripts` 5.0.1) with Vite for the client build,
dev server and test runner. The application code, React version, styling and
deployment topology stay the same. This is a tooling migration, not a rewrite.

The migration is intentionally isolated on its own branch and verified through a
Vercel preview before `main` is touched.

## 2. Goals

- Remove the unmaintained `react-scripts` dependency and its webpack toolchain.
- Get fast cold starts, near-instant HMR and faster production builds.
- Keep the existing React 18.3 application behaviour, routes and styling.
- Preserve the quality gates currently provided by CRA: production build,
  tests and lint.
- Keep the hand-rolled PWA/service worker and all public assets working.
- Keep Vercel deployment working with the same `/api` rewrite and SPA fallback.
- Leave a documented rollback path.

## 3. Non-goals

- Upgrading React, `stream-chat-react` or any application dependency.
- Converting JavaScript to TypeScript.
- Replacing the service worker with `vite-plugin-pwa`.
- Redesigning the UI or changing runtime features.
- Adding a new CI provider (Vercel remains the build gate).
- Cleaning up unrelated dead code, except where it blocks the migration.

## 4. Current state (verified 2026-11-04)

| Item | Current value |
| :--- | :--- |
| Build tool | `react-scripts` 5.0.1 (CRA, webpack 5) |
| React | 18.3.1 |
| Stream SDK | `stream-chat` 8.36.0, `stream-chat-react` 11.20.1 |
| Node / npm | 22.17.1 / 10.9.2 |
| Entry point | `client/src/index.js` (contains JSX) |
| HTML shell | `client/public/index.html` |
| Env references | 4 total, all `REACT_APP_*` or `NODE_ENV` |
| Tests | 1 file: `src/features/railway/useTrainEvents.test.js` |
| Test APIs | Jest globals plus one `jest.fn` |
| Lint | CRA `eslintConfig` extending `react-app`; warnings fail CI builds |
| JSX in `.js` | `src/index.js` (the entry) and the unused `src/assets/*.js`; the entry must become `.jsx` |
| CSS entry | `src/styles/index.css` with an `@import` chain |
| SDK CSS | Imported in `App.jsx` before local styles |
| PWA | Hand-rolled `public/service-worker.js`, cache `nrc-rail-hub-v2` |
| Deploy | Vercel client + `/api` rewrite to Render + SPA fallback |
| Build output | `client/build` |
| Baseline JS | 6 files, 2,267.7 KB raw / 582.6 KB gzip |
| Baseline CSS | 1 file, 370.6 KB raw / 47.6 KB gzip |
| Largest chunk | 1,409.3 KB (`stream-chat` vendor chunk) |

The small CRA surface is why this migration is low risk: no eject, no custom
webpack or Babel config, no image imports, and one test file.

## 5. Decisions

| ID | Decision | Rationale |
| :--- | :--- | :--- |
| D1 | Use Vite 8.3.x with `@vitejs/plugin-react` 6.2.x | Current stable line; Node 22.17 satisfies the engine requirement |
| D2 | Use Vitest 5.1.x with jsdom 29.1.x | Closest replacement for CRA's Jest/jsdom setup. jsdom 30 requires Node `^22.22.2`, so 29.1.1 keeps the current Node 22.17 toolchain working |
| D3 | Keep React 18.3 and JavaScript/JSX | Avoid mixing a framework upgrade with a build migration |
| D4 | Emit to `dist` and declare it in `client/vercel.json` | Vite default; explicit config avoids relying on dashboard guesses |
| D5 | Keep the existing service worker | It already works; `vite-plugin-pwa` can be a later, separate change |
| D6 | Rename the entry to `src/main.jsx` | The entry contains JSX; Vite does not transform JSX in `.js` by default |
| D7 | Set `build.target` to `es2018` | Field devices may run older Android WebViews; revisit after device testing |
| D8 | Add ESLint 9.39 with a flat config and an explicit `lint` script | CRA no longer lints during build, so the gate must be recreated. ESLint 10 is not usable yet because `eslint-plugin-react` 7.37 declares a peer range ending at `^9.7` |
| D9 | Rename env vars to `VITE_*` | Vite only exposes the `VITE_` prefix to client code |
| D10 | Do not add `@vitejs/plugin-legacy` initially | Adds weight; only add if real devices fail |
| D11 | Set `cssMinify: 'esbuild'` | Vite 8's default Lightning CSS expands logical selectors and inflated the CSS from ~386 KB to ~665 KB. esbuild restores the CRA-sized output |
| D12 | Run lint from `prebuild` | Keeps local and Vercel builds consistent with CRA's "warnings are errors" gate |

## 6. File-by-file change map

| File | Action | Notes |
| :--- | :--- | :--- |
| `client/package.json` | Change | Replace scripts and dependencies; add engines and dev dependencies |
| `client/package-lock.json` | Regenerate | `npm install` after the dependency changes |
| `client/vite.config.js` | Add | React plugin, dev port 3000, `dist` output, target, esbuild CSS minifier |
| `client/vitest.config.js` | Add | jsdom, setup file |
| `client/eslint.config.js` | Add | Flat config replacing the `eslintConfig` block |
| `client/index.html` | Move + edit | Move from `public/`, remove `%PUBLIC_URL%`, add module script |
| `client/public/index.html` | Delete | Must not remain or it will overwrite the built HTML |
| `client/src/config.js` | Edit | `import.meta.env.VITE_*`, `import.meta.env.PROD` |
| `client/src/index.js` | Move + edit | Rename to `main.jsx`; use `import.meta.env.PROD` for service-worker registration |
| `client/src/setupTests.js` | Add | Import `@testing-library/jest-dom/vitest` |
| `client/src/features/railway/useTrainEvents.test.js` | Move + edit | Rename to `.jsx`, `jest.fn` to `vi.fn`, explicit Vitest imports |
| `client/.env.example` | Edit | Rename keys to `VITE_*` |
| `client/vercel.json` | Edit | Declare Vite framework, build command and `dist` output |
| `client/public/service-worker.js` | Edit | Bump cache name to `nrc-rail-hub-v3` |
| `client/README.md` | Edit | Update commands, env names and output directory |
| `README.md` | Edit | Update local setup, test and build commands |
| `CHANGELOG.md` | Edit | Record the migration after verification |
| `client/src/assets/*` | Optional cleanup | Dead code; if kept, rename JSX-bearing `.js` files to `.jsx` |

## 7. Implementation phases

### Phase 0 - Baseline and safety

- [ ] Confirm `main` is clean and up to date.
- [ ] Create the branch: `git switch -c chore/vite-migration`.
- [ ] Run `npm ci` in `client/`.
- [ ] Run the baseline production build and record:
  - build duration
  - raw and gzip sizes for JS and CSS
  - number of emitted chunks
- [ ] Run the baseline test suite.
- [ ] Capture screenshots of the sign-in screen, chat workspace, station board,
  dark theme, light theme and mobile drawer.
- [ ] Record the current Vercel production deployment URL for rollback.

Exit criteria: baseline build and tests pass, and the screenshots and sizes are
recorded in the migration notes.

### Phase 1 - Install tooling and replace scripts

Remove CRA-only packages:

```bash
cd client
npm uninstall react-scripts web-vitals
```

Install the new toolchain:

```bash
npm install -D vite@^8.3.5 @vitejs/plugin-react@^6.2.1
npm install -D vitest@^5.1.0 jsdom@^29.1.1
npm install -D eslint@^9.39.5 @eslint/js globals
npm install -D eslint-plugin-react eslint-plugin-react-hooks
npm install -D esbuild
```

`esbuild` is installed explicitly because Vite 8 does not bundle it and
`cssMinify: 'esbuild'` needs it.

Move the testing libraries to `devDependencies` if they are currently in
`dependencies`.

Replace the scripts in `client/package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "start": "vite",
    "prebuild": "npm run lint",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint ."
  },
  "engines": {
    "node": ">=22.12.0"
  }
}
```

Keep `start` as an alias because existing docs and habits use it. Remove the
`eslintConfig` block; the flat config replaces it. The `browserslist` block is
unused by Vite and can be removed or kept only as documentation.

Add `client/vite.config.js`:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 4173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2018',
    cssMinify: 'esbuild',
  },
});
```

Do not add aliases or proxies yet. Local development already talks to the API
through `VITE_API_URL`, so no dev proxy is required. `host: true` preserves
CRA's LAN URL so phone testing still works.

Exit criteria: `npm run dev` starts on port 3000 and serves a page (the old HTML
may still be in `public/` until Phase 2).

### Phase 2 - Move the HTML shell and update env access

Move the shell to the Vite project root:

```bash
git mv client/public/index.html client/index.html
```

Edit `client/index.html`:

- Replace every `%PUBLIC_URL%/...` with `/...`.
- Add the module entry before `</body>`:

```html
<script type="module" src="/src/main.jsx"></script>
```

- Keep all meta tags, preconnects, font links, icon links and the manifest.
- Keep `<div id="root"></div>` and the `<noscript>` message.

Do not leave a copy at `client/public/index.html`; Vite would copy it into
`dist/` and overwrite the generated HTML.

Update `client/src/config.js`:

```js
const DEV_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API_URL = import.meta.env.PROD ? '/api' : DEV_API_URL;

export const STREAM_API_KEY =
  import.meta.env.VITE_STREAM_API_KEY || 'ye78kwjpxmh2';
```

Rename the entry and update its env check:

```bash
git mv client/src/index.js client/src/main.jsx
```

```js
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // unchanged registration body
}
```

Update `client/.env.example`:

```env
VITE_API_URL=http://localhost:5000
VITE_STREAM_API_KEY=your_stream_api_key
```

Update the local `client/.env` the same way. This file is gitignored, but the
dev server will not expose the old names.

Critical deployment step: rename the Vercel environment variable
`REACT_APP_STREAM_API_KEY` to `VITE_STREAM_API_KEY`. Missing this produces a
running app with a broken Stream connection.

Check for leftovers:

```bash
grep -rn "REACT_APP_\|process\.env\|%PUBLIC_URL%" client/src client/index.html
```

The only acceptable result is no matches, except documentation that intentionally
mentions the old names during migration.

Exit criteria: `npm run dev` loads the real app from `/src/main.jsx`, and login
works against the local API.

### Phase 3 - Replace Jest with Vitest

Add `client/vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: false,
  },
});
```

Add `client/src/setupTests.js`:

```js
import '@testing-library/jest-dom/vitest';
```

Rename the one test file so Vite transforms JSX, and use explicit imports:

```bash
git mv src/features/railway/useTrainEvents.test.js \
  src/features/railway/useTrainEvents.test.jsx
```

```js
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
```

Replace `jest.fn` with `vi.fn`. Explicit imports keep ESLint's `no-undef`
happy without a separate test globals block.

Run:

```bash
npm test
```

Exit criteria: the railway hook suite passes with the same number of tests as
the baseline.

### Phase 4 - Restore the lint gate

Add `client/eslint.config.js` using ESLint's flat config. A starting point:

```js
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist', 'build', 'coverage', 'node_modules'] },
  js.configs.recommended,
  react.configs.flat.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^React$' },
      ],
    },
  },
];
```

Adjust the exact plugin preset names to the installed major versions. The intent
is to keep the rules that matter for this codebase: React hooks correctness and
unused variables. Do not enable stylistic rules that would create a large,
unrelated diff.

Run:

```bash
npm run lint
```

Fix real findings rather than adding blanket disables. If the unused
`src/assets/*` files cause noise, either remove them in a separate commit or
rename the JSX-bearing files to `.jsx`.

Once lint is clean, restore the build gate. Either add a `prebuild` script:

```json
"prebuild": "npm run lint"
```

or set the Vercel build command to `npm run lint && npm run build`. The former
keeps local and hosted builds consistent.

Exit criteria: `npm run lint` and `npm run build` both pass.

### Phase 5 - PWA and deployment configuration

Bump the service-worker cache:

```js
const CACHE_NAME = 'nrc-rail-hub-v3';
```

Keep `public/service-worker.js`, the manifest, icons and robots file in
`public/`. Vite copies `public/` to the build root unchanged.

Update `client/vercel.json`:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://nrc-chat.onrender.com/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

If the Vercel project is pinned to the Create React App preset, either update the
project's Framework Preset to Vite and Output Directory to `dist`, or temporarily
set `build.outDir` to `build` in `vite.config.js`. Do not rely on autodetection
for this migration.

Verify the Vercel project settings:

- Root Directory: `client`
- Framework Preset: Vite
- Build Command: `npm run build` (or the lint-and-build variant)
- Output Directory: `dist`
- Node.js Version: 22.x
- Environment: `VITE_STREAM_API_KEY` present for Production and Preview

Exit criteria: a Vercel **preview** deployment succeeds.

### Phase 6 - Verification and merge

Run the local checks:

```bash
cd client
npm run lint
npm test
npm run build
npm run preview
```

Then verify the preview deployment against the matrix in section 8. Only after
the preview passes:

- [ ] Update `README.md`, `client/README.md` and `CHANGELOG.md`.
- [ ] Commit the migration in logical commits (tooling, entry/env, tests/lint,
  deploy/docs) rather than one large commit.
- [ ] Open a pull request into `main`.
- [ ] Merge after review.
- [ ] Watch the production deployment.
- [ ] Repeat the smoke checks on production.
- [ ] Bump the service-worker cache if any asset changed during verification.

## 7. Implementation results (2026-11-05)

Local migration is complete and the quality gates pass:

| Gate | Result |
| :--- | :--- |
| `npm run lint` | Passes (ESLint 9.39.5 flat config) |
| `npm test` | 1 file, 4 tests pass (Vitest 5.1.0 + jsdom 29.1.1) |
| `npm run build` | Passes; lint runs first via `prebuild` |
| `npm run dev` | Serves the app on port 3000 with HMR |
| `npm run preview` | Serves `dist/` on port 4173 |

Build output compared with the CRA baseline:

| Metric | CRA baseline | Vite build |
| :--- | :--- | :--- |
| JS raw / gzip | 2,267.7 KB / 582.6 KB | 2,546.3 KB / 629.6 KB |
| CSS raw / gzip | 370.6 KB / 47.6 KB | 385.9 KB / 50.5 KB |
| JS files | 6 | 7 |
| CSS files | 1 | 1 |
| Largest chunk | 1,409.3 KB | 1,422.4 KB (`Workspace`) |

The small size increase comes from Vite emitting modern ESM chunks and a
separate runtime; gzip growth is about 8% for JS and 6% for CSS. Keeping the
default Lightning CSS minifier inflated CSS to ~665 KB, which is why
`cssMinify: 'esbuild'` is set.

Local browser verification covered sign-in, session restore, opening the
`design-preview` line, sending a message, the live station board updating from
that message, dark/light theme switching and persistence across reload, and a
clean console/network log. The dev server does not register the service worker
(production only); that path is checked in `npm run preview` and on the Vercel
preview.

The Vercel preview built successfully and served the app, its static assets,
manifest, service worker (`nrc-rail-hub-v3`) and the SPA fallback. Its `/api`
rewrite reached the Render API, but sign-in was blocked by the API's exact-origin
CORS allow-list (`Origin not allowed.`), because the preview hostname is not in
`VERCEL_FRONTEND_URL` or `CORS_ORIGINS`. The exact production bundle was
therefore also exercised against the production API through a temporary local
proxy that sent the allowed origin.

Production (`https://nrc-chat.vercel.app`) was verified after the merge:

- The served HTML references `/assets/index-*.js` (Vite build).
- Login and session restore work, and the station board renders.
- Dark/light themes and the settings dialog render correctly.
- `/api/health` returns `200` with `database: postgres` and `env: production`.
- A non-root URL (`/station-board`) serves the SPA.
- `/manifest.json`, `/service-worker.js`, `/favicon.svg` and the touch icon all
  return `200`; the v3 service worker is activated and controlling the page.
- The console shows no errors beyond the expected `401` from the initial
  `/auth/session` probe before login.

A test message created during local verification was removed from the shared
Stream app.

## 8. Verification matrix

### Functional

| Area | Check |
| :--- | :--- |
| Boot | App loads at `/` with no console errors or failed asset requests |
| Auth | Signup, login, logout, session restore |
| Recovery | Forgot-password screen renders; production reset link still works |
| Lines | Create, rename, open, member management |
| DMs | Start a DM, send and receive |
| Messaging | Send, receive, unread badges, delivery tick, attachments |
| Broadcast | Send to multiple lines, recipient counter, 1,200-character guard |
| Station board | Rows match real channels; train movement and idle motion work |
| Motion | `prefers-reduced-motion` disables idle animation |
| Themes | Dark and light themes, persistence across reload |
| Responsive | Desktop, tablet and phone widths; mobile drawer and backdrop |
| Settings | Profile save, avatar upload, password change |
| Connection | Offline banner and Stream reconnect |
| PWA | Manifest loads, install prompt works, service worker activates |
| Deep links | Refreshing a non-root route serves the SPA |

### Technical

| Area | Check |
| :--- | :--- |
| Build | `dist/` contains `index.html`, hashed assets, icons, manifest and SW |
| Sizes | JS/CSS gzip sizes recorded and compared with the baseline |
| Tests | `npm test` passes |
| Lint | `npm run lint` passes |
| Source maps | Production build does not expose unintended source maps |
| API rewrite | `/api/health` reaches the Render service through Vercel |
| Static files | `/service-worker.js`, `/favicon.svg`, `/manifest.json` return the file, not `index.html` |
| Cache | New service worker replaces `nrc-rail-hub-v2` and removes the old cache |
| Headers | Hashed assets are cacheable; `index.html` and SW are revalidated |
| Analytics | `@vercel/analytics` still records page views |

### Device checks

- Desktop Chrome and Firefox.
- Safari on macOS or iOS if available.
- At least one mid-range Android device or emulated older Chrome profile.
- Phone viewport with the installed PWA if possible.

## 9. Rollback

1. **Fast path:** use Vercel's deployment history to promote the last known-good
   production deployment. This does not require a git revert.
2. **Code path:** revert the migration merge commit on `main` and let Vercel
   rebuild. The CRA configuration remains in git history.
3. **Service worker:** if clients already installed `nrc-rail-hub-v3`, a rollback
   serves `nrc-rail-hub-v2`; the old worker will update on the next visit and
   delete the v3 cache. Users may need one extra reload.
4. **Branch:** keep `chore/vite-migration` until production has been stable for a
   few days.

Do not delete the old `build/` output or the old Vercel deployment until the
preview and production checks pass.

## 10. Risks and mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| `VITE_STREAM_API_KEY` missing in Vercel | App loads but chat fails | Rename the variable in Production and Preview before deploying; smoke-test login and socket connection |
| Vercel still uses the CRA preset | Build succeeds but serves the wrong directory | Declare `framework`, `buildCommand` and `outputDirectory` in `vercel.json`; verify project settings |
| CSS cascade changes | Visual regressions in chat or station board | Keep import order; screenshot dark/light and all major surfaces |
| `stream-chat-react` CJS/ESM interop | Dev server or build failure | Test both; if needed add the package to `optimizeDeps.include`; do not change SDK versions |
| Lint findings flood the diff | Migration becomes hard to review | Run lint early; fix or remove dead files separately; keep rules focused |
| Old service worker serves stale assets | Users see an old bundle | Bump to `nrc-rail-hub-v3`; verify the update path twice |
| Older Android WebView unsupported | Blank screen on field devices | `build.target: 'es2018'`; device test; add `@vitejs/plugin-legacy` only if required |
| Deep links break | Refresh returns a 404 | Keep the SPA rewrite; verify a non-root path on the preview |
| Source maps exposed | Source disclosure | Keep `sourcemap: false` unless a private error tracker needs them |
| Rollback confusion with SW caches | Users stuck on a broken bundle | Document the two-reload recovery and use Vercel instant rollback |

## 11. Acceptance criteria

- [ ] `react-scripts` and `web-vitals` are removed from `client/package.json`.
- [ ] `npm run dev`, `npm run build`, `npm run preview`, `npm test` and
  `npm run lint` all pass.
- [ ] No `REACT_APP_*`, `process.env` or `%PUBLIC_URL%` references remain in
  client source or HTML.
- [ ] No JSX-bearing `.js` file remains in the runtime entry path; the entry is
  `src/main.jsx`.
- [ ] `dist/` contains the HTML shell, hashed assets, icons, manifest and service
  worker.
- [ ] Vercel preview deployment passes the functional and technical matrix.
- [ ] Production deployment passes the same smoke checks.
- [ ] The service worker updates from v2 to v3 without manual cache clearing.
- [ ] Documentation and changelog describe the new commands and env names.
- [ ] Rollback has been tested or is documented and understood.

## 12. Estimate

| Phase | Estimate |
| :--- | :--- |
| 0 - Baseline | 30 minutes |
| 1 - Tooling | 45 minutes |
| 2 - HTML and env | 45 minutes |
| 3 - Tests | 30 minutes |
| 4 - Lint | 45-90 minutes |
| 5 - PWA and Vercel preview | 45 minutes |
| 6 - Verification and merge | 1-2 hours |
| **Total** | **Half a day to one day** |

The lint phase is the most variable because it may surface pre-existing unused
code that CRA tolerated.

## 13. Open questions

1. **Output directory:** `dist` is the Vite default and the recommendation. If
   changing the Vercel project setting is undesirable, set `build.outDir` to
   `build` instead and keep the dashboard untouched.
2. **Legacy browsers:** do any field devices run a WebView older than the
   `es2018` target? Test on a representative device before deciding whether
   `@vitejs/plugin-legacy` is needed.
3. **Dead assets:** `src/assets/` appears unused. Remove it in a separate cleanup
   commit, or rename the JSX files to `.jsx` if they are being kept for future
   use.
4. **CI:** there is no repository CI today. Vercel is the only automated gate.
   A small GitHub Actions workflow running lint, tests and build would make the
   migration safer and is a reasonable follow-up.
5. **React 19:** out of scope. Keep the migration focused; upgrade separately.
