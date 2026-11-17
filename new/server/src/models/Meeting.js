const mongoose = require('mongoose');
module.exports = mongoose.model('Meeting', new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  agenda: { type: String, default: '' },
  start: { type: Date, required: true },
  duration: { type: Number, default: 30 },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null }, // null = everyone
  link: { type: String, default: '' },
  googleEventId: { type: String, default: '' },
  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true }));
