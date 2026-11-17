const router = require('express').Router();
const { Notification } = require('../models');

router.get('/', async (req, res) => {
  res.json(await Notification.find({ user: req.user._id }).sort('-createdAt').limit(40));
});
router.post('/read-all', async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ ok: true });
});
module.exports = router;
