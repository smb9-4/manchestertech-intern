// Forgot password: POST /api/password/forgot {email}  ->  emails a reset link (valid 1 hour)
//                  POST /api/password/reset  {token, password}
const router = require('express').Router();
const crypto = require('crypto');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const { User } = require('../models');
const { sendMail, appUrl, enabled } = require('../services/mailer');

const PasswordReset = mongoose.models.PasswordReset || mongoose.model('PasswordReset', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tokenHash: { type: String, required: true, index: true },
  expires: { type: Date, required: true },
  used: { type: Boolean, default: false },
}, { timestamps: true }));

const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 });

router.post('/forgot', limiter, async (req, res) => {
  const email = String((req.body && req.body.email) || '').toLowerCase().trim();
  const generic = { ok: true, message: 'If that email is registered, a reset link has been sent. Check your inbox and spam folder.' };
  if (!enabled()) return res.status(503).json({ error: 'Email is not set up on this portal yet. Please ask your admin to reset your password.' });
  const user = email && await User.findOne({ email, active: true });
  if (!user) return res.json(generic); // don't reveal who is registered
  const token = crypto.randomBytes(32).toString('hex');
  await PasswordReset.create({ user: user._id, tokenHash: hash(token), expires: new Date(Date.now() + 60 * 60 * 1000) });
  await sendMail({
    to: user.email, name: user.name, subject: 'Reset your intern portal password', title: 'Reset your password',
    html: '<p>Someone (hopefully you) asked to reset your password. Click the button below to choose a new one. The link works for <b>1 hour</b>.</p><p>If you did not ask for this, ignore this email; your password stays the same.</p>',
    button: { label: 'Choose a new password', url: `${appUrl()}/reset-password?token=${token}` },
  });
  res.json(generic);
});

router.post('/reset', limiter, async (req, res) => {
  const { token, password } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Reset link is invalid' });
  if (!password || String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const rec = await PasswordReset.findOne({ tokenHash: hash(String(token)), used: false });
  if (!rec || rec.expires < new Date()) return res.status(400).json({ error: 'This reset link has expired or was already used. Please request a new one.' });
  const user = await User.findById(rec.user);
  if (!user || !user.active) return res.status(400).json({ error: 'Account not found' });
  user.password = String(password);
  user.mustChangePassword = false;
  await user.save();
  rec.used = true;
  await rec.save();
  res.json({ ok: true });
});

module.exports = router;