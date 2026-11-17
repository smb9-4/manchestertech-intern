const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  icon: { type: String, default: '🔔' },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  link: { type: String, default: '' },
  read: { type: Boolean, default: false },
}, { timestamps: true });
schema.index({ user: 1, createdAt: -1 });
module.exports = mongoose.model('Notification', schema);
