const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD in programme timezone
  checkIn: Date,
  checkOut: Date,
  status: { type: String, enum: ['present', 'late', 'absent'], default: 'present' },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
schema.index({ user: 1, date: 1 }, { unique: true });
module.exports = mongoose.model('Attendance', schema);
