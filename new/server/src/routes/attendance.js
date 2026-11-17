const router = require('express').Router();
const { Attendance, User } = require('../models');
const { allow, isAdmin, teamScope } = require('../middleware/auth');
const { today, hhmm } = require('../services/time');
const { notify } = require('../services/notify');

const lateAfter = () => process.env.LATE_AFTER || '10:00';

router.post('/check-in', async (req, res) => {
  const date = today();
  const existing = await Attendance.findOne({ user: req.user._id, date });
  if (existing?.checkIn) return res.status(400).json({ error: 'Already checked in today' });
  const status = hhmm() > lateAfter() ? 'late' : 'present';
  const rec = await Attendance.findOneAndUpdate({ user: req.user._id, date }, { checkIn: new Date(), status }, { upsert: true, new: true });
  res.json(rec);
});

router.post('/check-out', async (req, res) => {
  const rec = await Attendance.findOne({ user: req.user._id, date: today() });
  if (!rec?.checkIn) return res.status(400).json({ error: 'Check in first' });
  if (rec.checkOut) return res.status(400).json({ error: 'Already checked out' });
  rec.checkOut = new Date();
  await rec.save();
  res.json(rec);
});

// Today's sheet (admin: everyone, leader: team, intern: self)
router.get('/today', async (req, res) => {
  const date = req.query.date || today();
  const q = { active: true, role: { $in: ['intern', 'leader'] } };
  if (req.user.role === 'intern') q._id = req.user._id;
  else if (teamScope(req.user)) q.team = req.user.team;
  const users = await User.find(q).populate('team', 'name color').sort('name');
  const recs = await Attendance.find({ date, user: { $in: users.map((u) => u._id) } });
  res.json({ date, rows: users.map((u) => ({ user: u, record: recs.find((r) => String(r.user) === String(u._id)) || null })) });
});

// History for one person
router.get('/history/:userId', async (req, res) => {
  const target = await User.findById(req.params.userId);
  if (!target) return res.status(404).json({ error: 'Not found' });
  const ok = String(target._id) === String(req.user._id) || isAdmin(req.user) || (req.user.role === 'leader' && String(target.team) === String(req.user.team));
  if (!ok) return res.status(403).json({ error: 'Not allowed' });
  res.json(await Attendance.find({ user: target._id }).sort('-date').limit(60));
});

// Leader/admin marks someone manually
router.post('/mark', allow('admin', 'leader'), async (req, res) => {
  const { userId, status, date = today() } = req.body || {};
  if (!['present', 'late', 'absent'].includes(status)) return res.status(400).json({ error: 'Bad status' });
  const target = await User.findById(userId);
  if (!target) return res.status(404).json({ error: 'Not found' });
  if (!isAdmin(req.user) && String(target.team) !== String(req.user.team)) return res.status(403).json({ error: 'Not your team' });
  const update = { status, markedBy: req.user._id };
  const existing = await Attendance.findOne({ user: userId, date });
  if (status === 'absent') { update.checkIn = null; update.checkOut = null; }
  else if (!existing?.checkIn) update.checkIn = new Date();
  res.json(await Attendance.findOneAndUpdate({ user: userId, date }, update, { upsert: true, new: true }));
});

router.post('/remind', allow('admin', 'leader'), async (req, res) => {
  const date = today();
  const q = { active: true, role: { $in: ['intern', 'leader'] } };
  if (teamScope(req.user)) q.team = req.user.team;
  const users = await User.find(q).select('_id');
  const done = (await Attendance.find({ date, checkIn: { $ne: null } }).select('user')).map((r) => String(r.user));
  const missing = users.filter((u) => !done.includes(String(u._id))).map((u) => u._id);
  await notify(missing, { icon: '⏰', title: 'Attendance reminder', body: 'Please check in for today.', link: '/attendance' });
  res.json({ reminded: missing.length });
});

module.exports = router;
