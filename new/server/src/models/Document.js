const mongoose = require('mongoose');
module.exports = mongoose.model('Document', new mongoose.Schema({
  name: { type: String, required: true },
  storedName: { type: String, required: true },
  mime: String,
  size: Number,
  category: { type: String, enum: ['Learning', 'Project', 'Policy', 'Submission'], default: 'Project' },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null }, // null = everyone
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true }));
