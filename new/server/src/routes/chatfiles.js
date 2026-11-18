// Chat attachments (images, PDFs, any file) + last message per chat.
// A file can only be opened by people who can see that chat.
const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const mongoose = require('mongoose');
const { Message } = require('../models');
const { canUseChannel } = require('../services/channels');
const { broadcastMessage } = require('../services/socket');
const { notifyChat } = require('../services/notify');

const ChatFile = mongoose.models.ChatFile || mongoose.model('ChatFile', new mongoose.Schema({
  channel: { type: String, required: true, index: true },
  name: { type: String, required: true },
  storedName: { type: String, required: true },
  mime: { type: String, default: 'application/octet-stream' },
  size: { type: Number, default: 0 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true }));

const DIR = process.env.VERCEL ? path.join('/tmp', 'uploads', 'chat') : path.join(__dirname, '..', '..', 'uploads', 'chat');
try { fs.mkdirSync(DIR, { recursive: true }); } catch {}
const upload = multer({
  storage: multer.diskStorage({
    destination: DIR,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: (+process.env.MAX_UPLOAD_MB || 20) * 1024 * 1024 },
});

// Last message of each chat: GET /api/chat-files/last?ch=general,team:..,dm:..
router.get('/last', async (req, res) => {
  const list = String(req.query.ch || '').split(',').filter(Boolean).slice(0, 80).filter((c) => canUseChannel(req.user, c));
  const out = {};
  await Promise.all(list.map(async (c) => {
    const m = await Message.findOne({ channel: c }).sort('-createdAt').populate('from', 'name').populate('file', 'name mime').lean();
    if (m) out[c] = m;
  }));
  res.json(out);
});

// Open / download a chat file
router.get('/file/:id', async (req, res) => {
  const f = await ChatFile.findById(req.params.id).catch(() => null);
  if (!f) return res.status(404).json({ error: 'File not found' });
  if (!canUseChannel(req.user, f.channel)) return res.status(403).json({ error: 'Not allowed' });
  const full = path.join(DIR, f.storedName);
  if (!fs.existsSync(full)) return res.status(410).json({ error: 'This file is no longer available' });
  if (req.query.download === '1') return res.download(full, f.name);
  res.setHeader('Content-Type', f.mime);
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.sendFile(full);
});

// Send a file (with optional caption) into a chat
router.post('/:channel', (req, res, next) => {
  if (!canUseChannel(req.user, req.params.channel, true)) return res.status(403).json({ error: 'You cannot send messages here' });
  next();
}, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file received' });
  const f = await ChatFile.create({
    channel: req.params.channel, name: req.file.originalname, storedName: req.file.filename,
    mime: req.file.mimetype, size: req.file.size, uploadedBy: req.user._id,
  });
  const msg = await Message.create({ channel: req.params.channel, from: req.user._id, text: String((req.body && req.body.text) || '').slice(0, 4000), file: f._id });
  await msg.populate('from', 'name role');
  await msg.populate('file', 'name mime size');
  broadcastMessage(msg);
  await notifyChat(req.params.channel, req.user, req.body?.text || 'Shared an attachment');
  res.status(201).json(msg);
});

module.exports = { default: router };