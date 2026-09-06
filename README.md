# NRC Rail Hub 🚆

**NRC Rail Hub** is a real-time, departmental communications and operations management platform designed for the **Nigerian Railway Corporation (NRC)**. Built with React and Node.js/Express, powered by Stream Chat Cloud and SQLite / PostgreSQL.

---

## 🚀 Features

- **Departmental Channels**: Organize communications across railway departments (Operations, Engineering, Station Masters, Ticketing, Administration).
- **Direct Messaging**: 1-on-1 private messaging and group discussions between railway personnel.
- **Persistent User Directory**: Instant search across all registered personnel with department filters.
- **Enterprise-Grade Security**: Passwords securely hashed with bcrypt (salt rounds: 10), zero password leakage in cookies or chat metadata, duplicate username prevention.
- **Zero-Cost Deployment**: Built specifically to run 100% free on **Vercel** (Frontend) and **Render** (Backend), with local SQLite or free serverless PostgreSQL (Neon / Supabase).
- **Graceful SMS Integration**: Optional Twilio SMS webhook integration that works seamlessly without billing if Twilio is not configured.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Stream Chat React SDK, CSS3 Design System (NRC Emerald Green & Gold).
- **Backend**: Node.js, Express, Stream Chat Node SDK, bcrypt, node:sqlite / pg (PostgreSQL).
- **Hosting**:
  - Client: [Vercel](https://vercel.com) (Hobby Free Tier)
  - Server: [Render](https://render.com) (Free Web Service Tier)
  - Database: Local SQLite for dev / Neon or Supabase free PostgreSQL for production.

---

## 💻 Local Development Setup

### 1. Prerequisites
- Node.js (v18 or higher recommended, Node v22 LTS tested)
- npm (comes with Node)
- A free [GetStream.io](https://getstream.io) account (Maker/Free tier)

### 2. Configure Backend (`server`)

```bash
cd server
cp .env.example .env
```

Fill in your Stream Chat credentials in `server/.env`:
```env
PORT=5000
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret
STREAM_APP_ID=your_stream_app_id
VERCEL_FRONTEND_URL=http://localhost:3000
# DATABASE_URL= (optional: defaults to local users.db SQLite)
```

Install dependencies and start the backend:
```bash
npm install
npm run dev # or npm start
```
The server will initialize the SQLite database (`users.db`) and start on `http://localhost:5000`.

### 3. Configure Frontend (`client`)

```bash
cd client
cp .env.example .env
```

Configure `client/.env`:
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_STREAM_API_KEY=your_stream_api_key
```

Install dependencies and start the frontend:
```bash
npm install
npm start
```
The app will open on `http://localhost:3000`.

---

## 🌐 100% Free Production Deployment

### 1. Backend on Render (Free Web Service)
1. Fork or push your code to GitHub.
2. Log into [Render.com](https://render.com) and click **New > Web Service**.
3. Connect your repository.
4. Set the following settings:
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Instance Type**: `Free`
5. In **Environment Variables**, add:
   - `STREAM_API_KEY`: Your Stream Chat API key
   - `STREAM_API_SECRET`: Your Stream Chat Secret
   - `STREAM_APP_ID`: Your Stream App ID
   - `VERCEL_FRONTEND_URL`: `https://nrc-chat.vercel.app` (or your Vercel URL)
   - *(Optional for persistent cloud DB)*: `DATABASE_URL` from a free [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com) Postgres database.
6. Click **Create Web Service**. Note down your Render backend URL (e.g. `https://nrc-chat-api.onrender.com`).

### 2. Frontend on Vercel (Free Hobby Tier)
1. Log into [Vercel.com](https://vercel.com) and click **Add New > Project**.
2. Select your repository.
3. In **Project Settings**:
   - Set **Root Directory** to `client`.
   - Framework Preset: `Create React App`.
4. In **Environment Variables**, add:
   - `REACT_APP_API_URL`: Your Render backend URL (e.g. `https://nrc-chat-api.onrender.com`)
   - `REACT_APP_STREAM_API_KEY`: Your Stream Chat API key
5. Click **Deploy**.

---

## 🔒 Security & Data Privacy

- **Password Protection**: Passwords are encrypted before storage and never returned in API payloads or cookies.
- **Session Tokens**: JWT authentication tokens issued directly by Stream Chat with user-specific permissions.
- **CORS Restricted**: Server only accepts requests from localhost and authorized frontend domains.

---

## 📄 License
This project is licensed under the MIT License.
