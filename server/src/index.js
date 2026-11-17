const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const { auth } = require('./middleware/auth');

// Warn about missing env vars but don't exit — Vercel injects vars at request time
for (const k of ['MONGO_URI', 'JWT_SECRET']) {
  if (!process.env[k]) console.warn(`Warning: ${k} is not set`);
}

const app = express();
const server = http.createServer(app);
const clientOrigins = Array.from(new Set([
  process.env.CLIENT_URL,
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
  !process.env.VERCEL && 'http://localhost:5173',
].filter(Boolean).map((url) => { try { return new URL(url).origin; } catch { return null; } }).filter(Boolean)));
if (!clientOrigins.length) clientOrigins.push('http://localhost:5173');

let databaseConnection;
function connectDatabase() {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose.connection);
  if (!databaseConnection) {
    databaseConnection = mongoose.connect(process.env.MONGO_URI).catch((error) => {
      databaseConnection = null;
      throw error;
    });
  }
  return databaseConnection;
}

let realtimeReady = Promise.resolve();
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(cors({ origin: clientOrigins }));
app.use(express.json({ limit: '1mb' }));
app.set('trust proxy', 1);
app.use((req, res, next) => {
  Promise.all([connectDatabase(), realtimeReady]).then(() => next()).catch(next);
});
app.use(require('./middleware/auditTrail'));
app.use(require('./middleware/emailTrail'));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/password', require('./routes/password'));
app.use('/api/users', auth, require('./routes/users'));
app.use('/api/profile', auth, require('./routes/profile'));
app.use('/api/attendance', auth, require('./routes/attendance'));
app.use('/api/push', auth, require('./routes/push'));
app.use('/api/teams', auth, require('./routes/teams'));
app.use('/api/projects', auth, require('./routes/projects'));
app.use('/api/tasks', auth, require('./routes/tasks'));

app.use('/api/meetings', auth, require('./routes/meetings'));
app.use('/api/chat-files', auth, require('./routes/chatfiles'));
app.use('/api/messages', auth, require('./routes/messages'));
app.use('/api/documents', auth, require('./routes/documents'));
app.use('/api/notifications', auth, require('./routes/notifications'));
app.use('/api/reports', auth, require('./routes/reports'));
app.use('/api/worklogs', auth, require('./routes/worklogs'));
app.use('/api/task-comments', auth, require('./routes/comments'));
app.use('/api/announcements', auth, require('./routes/announcements'));
app.use('/api/bulk-users', auth, require('./routes/bulk'));
app.use('/api/audit', auth, require('./routes/audit'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

const dist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.get('/sw.js', (req, res, next) => { res.set('Cache-Control', 'no-cache'); next(); });
  app.use(express.static(dist));
  app.get(/^\/(?!api|socket\.io).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File is too large' });
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid id' });
  if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

const socketService = require('./services/socket').init(
  server,
  clientOrigins,
  connectDatabase,
  Boolean(process.env.VERCEL) && process.env.VERCEL_ENV !== 'development',
);
realtimeReady = socketService.ready;
app.server = server;

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  connectDatabase().then(() => {
    server.listen(PORT, () => console.log(`InternHub API running on http://localhost:${PORT}`));
  }).catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
}

module.exports = app;