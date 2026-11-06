# Rail Hub client

React 18 single-page app for Rail Hub, built with Vite 8 and
`stream-chat-react`. See the [root README](../README.md) for the full project
overview, server setup and deployment notes.

## Run locally

From this directory:

```bash
npm install
cp .env.example .env
npm start
```

`client/.env` needs:

```env
VITE_API_URL=http://localhost:5000
VITE_STREAM_API_KEY=your_stream_api_key
```

Vite exposes only variables prefixed with `VITE_`. The Stream key must match the
server's key. The app opens at `http://localhost:3000`.

## Scripts

| Command | Purpose |
| :--- | :--- |
| `npm start` / `npm run dev` | Vite development server with hot reload |
| `npm run build` | Production build in `dist/` (runs lint first) |
| `npm run preview` | Serve the production build locally on port 4173 |
| `npm test` | Vitest unit test run |
| `npm run test:watch` | Vitest in watch mode |
| `npm run lint` | ESLint flat config |

## Structure

- `index.html` - Vite HTML shell (module entry at `/src/main.jsx`)
- `src/main.jsx` - React entry and production service-worker registration
- `src/components/` - auth, workspace, channel list, message pane, settings, UI
- `src/features/railway/` - station board scene and train event hooks
- `src/hooks/` - session, theme, online status and UI state
- `src/lib/` - API client, Stream helpers and the cached directory
- `src/styles/` - design tokens and per-surface stylesheets
- `public/` - icons, manifest and service worker

## Notes

- In production the client calls `/api`, which `vercel.json` rewrites to the
  Render API. `VITE_API_URL` is only used for local development.
- The service worker is registered in production only (`src/main.jsx`).
- Icons and the manifest live in `public/`. `icon-192.png`/`icon-512.png` are
  the regular icons; `icon-maskable-*.png` keep the artwork inside Android's
  install-mask safe zone. Bump the service-worker cache name and the `?v=` query
  in `index.html` when replacing them so installed clients pick up the change.
- `vercel.json` declares the Vite framework and the `dist` output directory, so
  the deployment does not depend on dashboard autodetection.
