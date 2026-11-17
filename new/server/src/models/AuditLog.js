const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  actorName: { type: String, default: '' },
  role: { type: String, default: '' },
  action: { type: String, required: true },
  category: { type: String, default: '' },
  target: { type: String, default: '' },
  details: { type: String, default: '' },
  ip: { type: String, default: '' },
}, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ createdAt: -1 });
module.exports = mongoose.model('AuditLog', schema);