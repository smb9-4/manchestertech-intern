const mongoose = require('mongoose');
module.exports = mongoose.model('Team', new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  focus: { type: String, default: '' },
  description: { type: String, default: '' },
  color: { type: String, default: '#4f46e5' },
  leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true }));
