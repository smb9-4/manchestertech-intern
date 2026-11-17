const mongoose = require('mongoose');
module.exports = mongoose.model('Project', new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  status: { type: String, enum: ['On track', 'At risk', 'Completed'], default: 'On track' },
  due: { type: Date },
}, { timestamps: true }));
