const router = require('express').Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { User } = require('../models');
const { auth } = require('../middleware/auth');

const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 });

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email: String(email || '').toLowerCase().trim() }).select('+password');
  if (!user || !(await user.checkPassword(String(password || '')))) return res.status(400).json({ error: 'Wrong email or password' });
  if (!user.active) return res.status(403).json({ error: 'This account has been disabled' });
  const u = await User.findById(user._id).populate('team');
  res.json({ token: sign(user), user: u });
});

router.get('/me', auth, async (req, res) => {
  res.json(await User.findById(req.user._id).populate('team'));
});

router.post('/change-password', auth, async (req, res) => {
  const { current, next } = req.body || {};
  if (!next || String(next).length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.checkPassword(String(current || '')))) return res.status(400).json({ error: 'Current password is wrong' });
  user.password = next;
  user.mustChangePassword = false;
  await user.save();
  res.json({ ok: true });
});

module.exports = router;
