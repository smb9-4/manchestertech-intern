const router = require('express').Router();
const crypto = require('crypto');
const mongoose = require('mongoose');
const { User, Team } = require('../models');
const { allow, isAdmin, teamScope } = require('../middleware/auth');
const { notify } = require('../services/notify');

// Never send private profile details in people lists; only the photo
const safe = (u) => { const o = u.toObject ? u.toObject() : { ...u }; o.profile = o.profile && o.profile.photo ? { photo: o.profile.photo } : {}; return o; };

// List people the current user may see
router.get('/', async (req, res) => {
  const q = {};
  if (req.query.all !== '1' || !isAdmin(req.user)) q.active = true;
  const scope = teamScope(req.user);
  if (scope) q.team = scope;
  if (req.query.team && isAdmin(req.user)) q.team = req.query.team;
  // Everyone may see admins (for chat); interns see their team
  const users = await User.find(q).populate('team', 'name color').sort('name');
  if (scope) {
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] }, active: true }).sort('name');
    return res.json([...admins, ...users].map(safe));
  }
  res.json(users.map(safe));
});

// Admin: register an intern (returns a temporary password to share)
router.post('/', allow('admin'), async (req, res) => {
  const { name, email, college, phone, team, role } = req.body || {};
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanName || !cleanEmail) return res.status(400).json({ error: 'Name and email are required' });
  if (!cleanEmail.includes('@')) return res.status(400).json({ error: 'Enter a valid email address' });
  if (team && (!mongoose.isValidObjectId(team) || !await Team.exists({ _id: team }))) return res.status(400).json({ error: 'Selected team was not found' });
  if (await User.findOne({ email: cleanEmail })) return res.status(400).json({ error: 'That email is already registered' });
  let newRole = ['intern', 'admin'].includes(role) ? role : 'intern';
  if (newRole === 'admin' && req.user.role !== 'superadmin') newRole = 'intern';
  const tempPassword = crypto.randomBytes(5).toString('hex');
  const user = await User.create({ name: cleanName, email: cleanEmail, college, phone, team: team || null, role: newRole, password: tempPassword, mustChangePassword: true });
  await notify([user._id], { icon: '👋', title: 'Welcome to InternHub', body: 'Please change your password from your profile.' });
  res.status(201).json({ user: await user.populate('team', 'name color'), tempPassword });
});

router.patch('/:id', async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  const me = req.user;
  const b = req.body || {};

  if (isAdmin(me)) {
    for (const k of ['name', 'college', 'phone', 'rating', 'feedback']) if (k in b) target[k] = b[k];
    if ('active' in b) target.active = !!b.active;
    if ('team' in b) {
      const led = await Team.findOne({ leader: target._id });
      if (led && String(led._id) !== String(b.team)) return res.status(400).json({ error: 'This person leads a team. Pick a new leader first.' });
      target.team = b.team || null;
    }
  } else if (me.role === 'leader' && String(target.team) === String(me.team) && String(target._id) !== String(me._id)) {
    for (const k of ['rating', 'feedback']) if (k in b) target[k] = b[k];
  } else if (String(target._id) === String(me._id)) {
    for (const k of ['name', 'college', 'phone']) if (k in b) target[k] = b[k];
  } else return res.status(403).json({ error: 'Not allowed' });

  await target.save();
  if ('feedback' in b && b.feedback) await notify([target._id], { icon: '⭐', title: 'New feedback from your leader', body: b.feedback.slice(0, 120), link: '/' });
  res.json(safe(await target.populate('team', 'name color')));
});

router.post('/:id/reset-password', allow('admin'), async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const tempPassword = crypto.randomBytes(5).toString('hex');
  user.password = tempPassword;
  user.mustChangePassword = true;
  await user.save();
  res.json({ tempPassword });
});

module.exports = router;
