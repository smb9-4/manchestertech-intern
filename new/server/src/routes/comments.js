// Task comments: GET/POST /api/task-comments/:taskId, GET /api/task-comments/counts
const router = require('express').Router();
const mongoose = require('mongoose');
const { Task, Team } = require('../models');
const { isAdmin } = require('../middleware/auth');
const { notify, adminIds } = require('../services/notify');

const TaskComment = mongoose.models.TaskComment || mongoose.model('TaskComment', new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 2000 },
}, { timestamps: true }));

// Same visibility as the task board
function visibleTaskQuery(u) {
  if (isAdmin(u)) return {};
  if (u.role === 'leader') return { team: u.team };
  return { assignee: u._id };
}
async function loadTask(req, res) {
  const t = await Task.findOne({ _id: req.params.taskId, ...visibleTaskQuery(req.user) }).catch(() => null);
  if (!t) { res.status(404).json({ error: 'Task not found' }); return null; }
  return t;
}

router.get('/counts', async (req, res) => {
  const ids = (await Task.find(visibleTaskQuery(req.user)).select('_id').lean()).map((t) => t._id);
  const rows = await TaskComment.find({ task: { $in: ids } }).select('task').lean();
  const counts = {};
  rows.forEach((r) => { counts[r.task] = (counts[r.task] || 0) + 1; });
  res.json(counts);
});

router.get('/:taskId', async (req, res) => {
  const t = await loadTask(req, res); if (!t) return;
  res.json(await TaskComment.find({ task: t._id }).populate('user', 'name role').sort('createdAt'));
});

router.post('/:taskId', async (req, res) => {
  const t = await loadTask(req, res); if (!t) return;
  const text = String((req.body && req.body.text) || '').trim();
  if (!text) return res.status(400).json({ error: 'Write something first' });
  const c = await TaskComment.create({ task: t._id, user: req.user._id, text });
  await c.populate('user', 'name role');
  // Tell the other side: assignee, team leader and admins (not the writer)
  const team = await Team.findById(t.team).lean();
  const who = [t.assignee, team && team.leader, ...(await adminIds())].filter((id) => id && String(id) !== String(req.user._id));
  await notify(who, { icon: '\u{1F4AC}', title: `Comment on "${t.title}"`, body: `${req.user.name}: ${text.slice(0, 100)}`, link: '/tasks' });
  res.status(201).json(c);
});

module.exports = router;