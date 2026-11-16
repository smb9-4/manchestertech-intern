const router = require('express').Router();
const { Message, Team, User } = require('../models');
const { isAdmin } = require('../middleware/auth');
const { canUseChannel, dmChannel } = require('../services/channels');
const { broadcastMessage } = require('../services/socket');
const { notify, notifyChat } = require('../services/notify');

// Channels this user can see
router.get('/channels', async (req, res) => {
  const u = req.user;
  const list = [{ id: 'announcements', name: 'announcements', kind: 'announce' }, { id: 'general', name: 'general', kind: 'public' }];
  const teams = isAdmin(u) ? await Team.find().sort('name') : u.team ? await Team.find({ _id: u.team }) : [];
  teams.forEach((t) => list.push({ id: `team:${t._id}`, name: t.name.toLowerCase().replace(/\s+/g, '-'), kind: 'team' }));
  // DMs: admins can DM anyone; others can DM admins + own team
  const q = { active: true, _id: { $ne: u._id } };
  if (!isAdmin(u)) q.$or = [{ role: { $in: ['admin', 'superadmin'] } }, { team: u.team }];
  const people = await User.find(q).select('name role').sort('name');
  people.forEach((p) => list.push({ id: dmChannel(u._id, p._id), name: p.name, kind: 'dm', userId: p._id }));
  res.json(list);
});

router.get('/:channel', async (req, res) => {
  const ch = req.params.channel;
  if (!canUseChannel(req.user, ch)) return res.status(403).json({ error: 'Not allowed' });
  const msgs = await Message.find({ channel: ch }).populate('from', 'name role').populate('file', 'name mime size').sort('-createdAt').limit(100);
  res.json(msgs.reverse());
});

// REST fallback for sending (Socket.IO is used normally)
router.post('/:channel', async (req, res) => {
  const ch = req.params.channel;
  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Empty message' });
  if (!canUseChannel(req.user, ch, true)) return res.status(403).json({ error: 'Not allowed in this channel' });
  const msg = await Message.create({ channel: ch, from: req.user._id, text });
  await msg.populate('from', 'name role');
  broadcastMessage(msg);
  await notifyChat(ch, req.user, text);
  if (ch === 'announcements') {
    const all = await User.find({ active: true, _id: { $ne: req.user._id } }).select('_id');
    await notify(all.map((x) => x._id), { icon: '📣', title: 'New announcement', body: text.slice(0, 120), link: '/chat' });
  }
  res.status(201).json(msg);
});

module.exports = router;
