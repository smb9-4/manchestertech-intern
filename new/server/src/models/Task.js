const mongoose = require('mongoose');
module.exports = mongoose.model('Task', new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  due: { type: Date },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  status: { type: String, enum: ['todo', 'inprogress', 'submitted', 'approved', 'rejected'], default: 'todo' },
  completedAt: { type: Date, default: null },
  submission: {
    note: String,
    file: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    at: Date,
  },
  feedback: { type: String, default: '' },
}, { timestamps: true }));
