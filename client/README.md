# Rail Hub client

React 18 single-page app for Rail Hub, built with Create React App and
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
REACT_APP_API_URL=http://localhost:5000
REACT_APP_STREAM_API_KEY=your_stream_api_key
```

The Stream key must match the server's key. The app opens at
`http://localhost:3000`.

## Scripts

| Command | Purpose |
| :--- | :--- |
| `npm start` | Development server with hot reload |
| `npm run build` | Production build in `build/` |
| `npm test` | Jest test runner |
| `npm run eject` | Eject CRA configuration (irreversible) |

## Structure

- `src/components/` - auth, workspace, channel list, message pane, settings, UI
- `src/features/railway/` - station board scene and train event hooks
- `src/hooks/` - session, theme, online status and UI state
- `src/lib/` - API client, Stream helpers and the cached directory
- `src/styles/` - design tokens and per-surface stylesheets
- `public/` - HTML shell, icons, manifest and service worker

## Notes

- In production the client calls `/api`, which `vercel.json` rewrites to the
  Render API. `REACT_APP_API_URL` is only used for local development.
- The service worker is registered in production only (`src/index.js`).
- Icons and the manifest live in `public/`; bump the service-worker cache name
  when replacing them so installed clients pick up the change.
