const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
let io = null;
const { User, Team, Message } = require('../models');
const { canUseChannel } = require('./channels');
const { notifyChat } = require('./notify');

function init(server, corsOrigin, ensureDatabase, useSharedAdapter = false) {
  const { Server } = require('socket.io');
  const { createAdapter } = require('@socket.io/mongo-adapter');
  io = new Server(server, { cors: { origin: corsOrigin } });
  let ready = Promise.resolve();

  if (useSharedAdapter) {
    ready = (async () => {
      await ensureDatabase();
      const collection = mongoose.connection.db.collection('socket.io-adapter-events');
      await collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 });
      io.adapter(createAdapter(collection, { addCreatedAtField: true }));
    })();
    ready.catch((error) => console.error('Socket.IO shared adapter initialization failed:', error.message));
  }

  io.use(async (socket, next) => {
    try {
      await ready;
      if (ensureDatabase) await ensureDatabase();
      const { id } = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET);
      const user = await User.findById(id);
      if (!user || !user.active) return next(new Error('unauthorized'));
      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication failed:', error.message);
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const u = socket.user;
    socket.join(`user:${u._id}`);
    socket.join('general');
    socket.join('announcements');
    if (['admin', 'superadmin'].includes(u.role)) {
      (await Team.find().select('_id')).forEach((t) => socket.join(`team:${t._id}`));
    } else if (u.team) socket.join(`team:${u.team}`);

    socket.on('message:send', async ({ channel, text }, ack) => {
      try {
        text = String(text || '').trim();
        if (!text) return ack?.({ error: 'Empty message' });
        const fresh = await User.findById(u._id);
        if (!canUseChannel(fresh, channel, true)) return ack?.({ error: 'Not allowed in this channel' });
        const msg = await Message.create({ channel, from: u._id, text });
        await msg.populate('from', 'name role');
        broadcastMessage(msg);
        await notifyChat(channel, fresh, text);
        ack?.({ ok: true });
      } catch (e) { ack?.({ error: e.message }); }
    });
  });
  return { io, ready };
}

function broadcastMessage(msg) {
  if (!io) return;
  const ch = msg.channel;
  if (ch.startsWith('dm:')) {
    const [, a, b] = ch.split(':');
    io.to(`user:${a}`).to(`user:${b}`).emit('message', msg);
  } else io.to(ch).emit('message', msg);
}

function emitToUser(userId, event, payload) { if (io) io.to(`user:${userId}`).emit(event, payload); }

module.exports = { init, emitToUser, broadcastMessage };
