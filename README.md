# Rail Hub 🚆
### Real-Time Operations & Departmental Communications Suite

![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-22-green?logo=node.js)
![Express](https://img.shields.io/badge/Express-4-lightgrey?logo=express)
![Stream Chat](https://img.shields.io/badge/Stream%20Chat-SDK-006CFF?logo=stream)
![Database](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20SQLite-darkblue)
![License](https://img.shields.io/badge/License-MIT-green)

**Rail Hub** is a full-stack real-time communications and operations management platform designed to coordinate station masters, dispatchers, engineers, and administrative staff across railway corridors for the **Nigerian Railway Corporation (NRC)**.

Built with an executive dark-emerald design system, custom message status tracking, and resilient dual-database persistence.

---

## ✨ Features

- **Corridor & Team Channels**: Dedicated discussion channels for railway corridors, train control, engineering, and station dispatch.
- **Direct Messaging & Online Presence**: 1-on-1 and group direct messaging with real-time online status indicators.
- **Debounced Directory Search**: Instant search across all registered personnel and stations with a 300ms debounce to prevent API flooding.
- **Modern Message Experience**: Custom message bubble layout with delivered status ticks (`✓`), contextual timestamps, and an integrated circular send action button.
- **Mobile-Responsive Off-Canvas Navigation**: Adaptive desktop two-column workspace with a sliding navigation drawer and header toggle on mobile devices.
- **Robust Security & Identity**:
  - Salted `bcrypt` password hashing (10 rounds).
  - Zero password hash exposure in client cookies, local storage, or chat metadata.
  - Conflict detection (`409 Conflict`) for unique station handles.
- **Dual Database Persistence**: Automatic SQLite persistence for local development with zero setup, with seamless cloud-switching to PostgreSQL in production environments.

---

## 🛠️ Architecture & Tech Stack

```
rail-hub/
├── client/                     # React 18 Single Page Application
│   ├── public/                 # Static assets, Inter web font & NRC metadata
│   └── src/
│       ├── components/         # Modals, channel previews, search, user directory
│       ├── assets/             # Vector icons and company badges
│       ├── App.css             # NRC design system, layout tokens, and media queries
│       └── App.jsx             # Stream Chat provider & session lifecycle management
└── server/                     # Node.js & Express REST API
    ├── controllers/            # Authentication & credential validation logic
    ├── routes/                 # Auth and webhook routes
    ├── db.js                   # Universal database abstraction (PostgreSQL / SQLite)
    └── index.js                # Express entry point & health check endpoints
```

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, Stream Chat React SDK, Vanilla CSS3 Design System, Inter Typography |
| **Backend** | Node.js 22, Express, Stream Chat Node SDK, bcrypt |
| **Database** | Node.js `node:sqlite` (local development) / PostgreSQL (production) |
| **Deployment** | Vercel (Client SPA) & Render (Backend Service) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn
- Stream Chat API credentials ([getstream.io](https://getstream.io))

### 1. Clone the Repository
```bash
git clone https://github.com/nzubechukwudavid/chat-app.git
cd chat-app
```

### 2. Configure & Run Backend Server
```bash
cd server
cp .env.example .env
```

Set your credentials in `server/.env`:
```env
PORT=5000
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret
STREAM_APP_ID=your_stream_app_id
# DATABASE_URL= (optional: defaults to local SQLite users.db)
```

Install dependencies and start the service:
```bash
npm install
npm start
```
The server will initialize the database and listen on `http://localhost:5000`.

### 3. Configure & Run Client Application
```bash
cd ../client
cp .env.example .env
```

Set your credentials in `client/.env`:
```env
REACT_APP_STREAM_API_KEY=your_stream_api_key
REACT_APP_API_URL=http://localhost:5000
```

Install dependencies and start the React development server:
```bash
npm install
npm start
```
The application will launch at `http://localhost:3000`.

---

## 🔒 Security

- **Credential Isolation**: User passwords are encrypted with bcrypt before saving and are stripped from all API responses, tokens, and browser cookies.
- **Scoped Tokens**: Client sessions use short-lived, user-scoped JWTs generated server-side by the Stream Chat Node SDK.
- **Input Sanitization**: Handles and channel names are validated and normalized against regex patterns before stream registration.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
