const express = require('express');
const cors = require('cors');

const { config, assertUsable } = require('./config');
const authRoutes = require('./routes/auth.js');
const { securityHeaders } = require('./middleware/security.js');
const { createRateLimiter } = require('./middleware/rateLimit');
const { initDb, countUsers, closeDb } = require('./db.js');

const app = express();

const corsOptions = {
  origin(origin, callback) {
    // Allow same-origin / non-browser callers (health checks, uptime monitors).
    if (!origin) return callback(null, true);
    if (config.cors.origins.includes(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 600,
};

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

// Compact request log - enough to spot abuse, cheap enough to leave on.
app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
    if (req.path === '/health') return;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`);
  });
  next();
});

const apiLimiter = createRateLimiter({ name: 'api' });

app.get('/health', async (req, res) => {
  let users = null;
  try {
    users = await countUsers();
  } catch {
    users = null;
  }

  res.status(200).json({
    status: 'ok',
    env: config.env,
    database: config.databaseUrl ? 'postgres' : 'sqlite',
    users,
    stream: config.hasStreamCredentials ? 'configured' : 'missing',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Rail Hub API',
    version: '2.0.0',
    endpoints: ['/health', '/auth/signup', '/auth/login', '/auth/session', '/auth/logout'],
  });
});

// Per-route throttling for the auth endpoints lives in `routes/auth.js`.
app.use('/auth', authRoutes);

// 404 for unmatched API routes.
app.use((req, res) => {
  res.status(404).json({ message: `No route for ${req.method} ${req.originalUrl}` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err);
  if (err.message && err.message.includes('not allowed by CORS')) {
    return res.status(403).json({ message: 'Origin not allowed.' });
  }
  res.status(err.status || 500).json({ message: err.expose ? err.message : 'Internal server error.' });
});

const start = async () => {
  assertUsable();
  await initDb();

  const server = app.listen(config.port, () => {
    console.log(`[server] Rail Hub API listening on port ${config.port} (${config.env})`);
  });

  const shutdown = (signal) => async () => {
    console.log(`[server] ${signal} received, shutting down`);
    server.close(async () => {
      await closeDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', shutdown('SIGTERM'));
  process.on('SIGINT', shutdown('SIGINT'));

  return server;
};

if (require.main === module) {
  start().catch((err) => {
    console.error('[server] Failed to start:', err);
    process.exit(1);
  });
}

module.exports = { app, start };
