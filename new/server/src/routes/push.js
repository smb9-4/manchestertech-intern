const router = require('express').Router();
const { PushSub, sendPush, pushReady } = require('../services/push');

// Public key the browser needs to subscribe
router.get('/key', (req, res) => res.json({ key: pushReady() ? process.env.VAPID_PUBLIC_KEY : null }));

router.post('/subscribe', async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !/^https:\/\//.test(endpoint) || !keys || !keys.p256dh || !keys.auth) return res.status(400).json({ error: 'Invalid subscription' });
  await PushSub.findOneAndUpdate({ endpoint }, { user: req.user._id, endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } }, { upsert: true });
  res.json({ ok: true });
});

router.post('/unsubscribe', async (req, res) => {
  const { endpoint } = req.body || {};
  if (endpoint) await PushSub.deleteOne({ endpoint, user: req.user._id });
  res.json({ ok: true });
});

router.post('/test', async (req, res) => {
  if (!pushReady()) return res.status(400).json({ error: 'Push is not set up on the server (VAPID keys missing)' });
  await sendPush([req.user._id], { title: 'Notifications are on', body: 'You will get alerts for tasks, meetings and messages here.', link: '/' });
  res.json({ ok: true });
});

module.exports = router;