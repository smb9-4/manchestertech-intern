const router = require('express').Router();
const { Meeting, User } = require('../models');
const { allow, isAdmin, teamScope } = require('../middleware/auth');
const google = require('../services/google');
const { notify } = require('../services/notify');

router.get('/', async (req, res) => {
  const scope = teamScope(req.user);
  const q = scope ? { $or: [{ team: null }, { team: scope }] } : {};
  res.json(await Meeting.find(q).populate('team', 'name color').populate('createdBy', 'name').sort('start'));
});

router.get('/google-status', (req, res) => res.json({ enabled: google.enabled() }));

router.post('/', allow('admin', 'leader'), async (req, res) => {
  let { title, agenda, start, duration = 30, team = null, link = '' } = req.body || {};
  if (!title || !start) return res.status(400).json({ error: 'Title and start time are required' });
  if (!isAdmin(req.user)) team = req.user.team; // leaders schedule only for their team
  const startDate = new Date(start);
  if (isNaN(startDate)) return res.status(400).json({ error: 'Invalid start time' });

  const q = { active: true };
  if (team) q.$or = [{ team }, { role: { $in: ['admin', 'superadmin'] } }];
  const people = await User.find(q).select('_id email');

  let googleEventId = '';
  let warning = '';
  if (google.enabled()) {
    try {
      const ev = await google.createMeetEvent({ title, agenda, start: startDate, duration: +duration, attendees: people.map((p) => p.email) });
      googleEventId = ev.id;
      link = ev.link || link;
    } catch (e) {
      warning = 'Saved, but Google Calendar failed: ' + e.message;
    }
  }
  const m = await Meeting.create({ title, agenda, start: startDate, duration: +duration, team: team || null, link, googleEventId, createdBy: req.user._id });
  await notify(people.map((p) => p._id), { icon: '📹', title: 'Meeting scheduled', body: `${title} · ${startDate.toLocaleString('en-IN', { timeZone: process.env.TIMEZONE || 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}`, link: '/meetings' });
  res.status(201).json({ meeting: await m.populate('team', 'name color'), warning });
});

router.patch('/:id', allow('admin', 'leader'), async (req, res) => {
  const m = await Meeting.findById(req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  if (!isAdmin(req.user) && String(m.team) !== String(req.user.team)) return res.status(403).json({ error: 'Not allowed' });
  for (const k of ['link', 'notes', 'agenda']) if (k in (req.body || {})) m[k] = req.body[k];
  await m.save();
  res.json(await m.populate('team', 'name color'));
});

router.delete('/:id', allow('admin', 'leader'), async (req, res) => {
  const m = await Meeting.findById(req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  if (!isAdmin(req.user) && String(m.team) !== String(req.user.team)) return res.status(403).json({ error: 'Not allowed' });
  await google.deleteEvent(m.googleEventId);
  await m.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
