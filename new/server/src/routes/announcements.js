// Pinned announcements shown as a banner at the top of every page.
const router = require('express').Router();
const mongoose = require('mongoose');
const { User } = require('../models');
const { allow } = require('../middleware/auth');
const { notify } = require('../services/notify');

const Announcement = mongoose.models.Announcement || mongoose.model('Announcement', new mongoose.Schema({
  text: { type: String, required: true, maxlength: 500 },
  level: { type: String, enum: ['info', 'warning', 'urgent'], default: 'info' },
  active: { type: Boolean, default: true },
  expires: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true }));

// Everyone: currently showing banners
router.get('/', async (req, res) => {
  const now = new Date();
  const list = await Announcement.find({ active: true }).populate('createdBy', 'name').sort('-createdAt').lean();
  res.json(list.filter((a) => !a.expires || new Date(a.expires) > now));
});

// Admin: all of them
router.get('/all', allow('admin'), async (req, res) => {
  res.json(await Announcement.find().populate('createdBy', 'name').sort('-createdAt'));
});

router.post('/', allow('admin'), async (req, res) => {
  const { text, level = 'info', expires } = req.body || {};
  if (!text || !String(text).trim()) return res.status(400).json({ error: 'Write the announcement text' });
  const a = await Announcement.create({ text: String(text).trim(), level, expires: expires ? new Date(expires + 'T23:59:59') : null, createdBy: req.user._id });
  const everyone = (await User.find({ active: true, _id: { $ne: req.user._id } }).select('_id')).map((u) => u._id);
  await notify(everyone, { icon: '\u{1F4CC}', title: 'New pinned announcement', body: a.text.slice(0, 120), link: '/' });
  res.status(201).json(a);
});

router.patch('/:id', allow('admin'), async (req, res) => {
  const a = await Announcement.findById(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  if ('active' in (req.body || {})) a.active = !!req.body.active;
  await a.save();
  res.json(a);
});

router.delete('/:id', allow('admin'), async (req, res) => {
  await Announcement.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;