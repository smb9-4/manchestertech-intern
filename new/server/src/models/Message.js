const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  channel: { type: String, required: true }, // announcements | general | team:<id> | dm:<idA>:<idB>
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '', maxlength: 4000 },
  file: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatFile', default: null },
}, { timestamps: true });
schema.index({ channel: 1, createdAt: -1 });
module.exports = mongoose.model('Message', schema);
