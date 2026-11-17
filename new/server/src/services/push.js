// Phone/desktop push notifications (Web Push). Works only when VAPID keys are set on the server.
const mongoose = require('mongoose');

const PushSub = mongoose.models.PushSub || mongoose.model('PushSub', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  endpoint: { type: String, unique: true },
  keys: { p256dh: String, auth: String },
}, { timestamps: true }));

let webpush = null;
function client() {
  if (webpush) return webpush;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return null;
  try {
    webpush = require('web-push');
    webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:admin@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    return webpush;
  } catch (e) { console.error('[push] web-push not available:', e.message); return null; }
}

// Send to every device of these users. Never throws.
async function sendPush(userIds, data) {
  const wp = client(); if (!wp || !userIds.length) return;
  const subs = await PushSub.find({ user: { $in: userIds } });
  const payload = JSON.stringify({ title: data.title || 'Intern Portal', body: data.body || '', link: data.link || '/' });
  await Promise.all(subs.map(async (s) => {
    try { await wp.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 86400 }); }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await PushSub.deleteOne({ _id: s._id }); }
  }));
}

module.exports = { PushSub, sendPush, pushReady: () => !!client() };