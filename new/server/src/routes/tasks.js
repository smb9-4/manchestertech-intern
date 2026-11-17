const router = require('express').Router();
const { Task, Project, User, Team } = require('../models');
const { allow, isAdmin } = require('../middleware/auth');
const { notify, adminIds } = require('../services/notify');

const pop = (q) => q.populate('assignee', 'name team').populate('project', 'name').populate('submission.file', 'name size');

router.get('/', async (req, res) => {
  const u = req.user;
  const q = {};
  if (u.role === 'intern') q.assignee = u._id;
  else if (u.role === 'leader') q.team = u.team;
  if (req.query.project) q.project = req.query.project;
  res.json(await pop(Task.find(q).sort('due')));
});

router.post('/', allow('admin', 'leader'), async (req, res) => {
  const { title, description, project, assignee, due, priority } = req.body || {};
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle || !project || !assignee) return res.status(400).json({ error: 'Title, project and assignee are required' });
  const dueDate = due ? new Date(due) : undefined;
  if (due && Number.isNaN(dueDate.getTime())) return res.status(400).json({ error: 'Enter a valid due date' });
  const p = await Project.findById(project);
  const a = await User.findOne({ _id: assignee, active: true, role: { $in: ['intern', 'leader'] } });
  if (!p) return res.status(400).json({ error: 'Project not found' });
  if (!a) return res.status(400).json({ error: 'Assignee must be an active intern or team leader' });
  if (!isAdmin(req.user) && String(p.team) !== String(req.user.team)) return res.status(403).json({ error: 'You can only assign tasks in your team' });
  if (String(a.team) !== String(p.team)) return res.status(400).json({ error: `${a.name} is not in this project’s team` });
  const t = await Task.create({ title: cleanTitle, description, project, team: p.team, assignee, due: dueDate, priority, createdBy: req.user._id });
  await notify([assignee], { icon: '📋', title: 'New task assigned', body: `${cleanTitle}${dueDate ? ' · due ' + dueDate.toDateString() : ''}`, link: '/tasks' });
  res.status(201).json(await pop(Task.findById(t._id)));
});

// Status changes: interns move their own tasks; leaders/admins review
router.patch('/:id', async (req, res) => {
  const t = await Task.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Task not found' });
  const u = req.user;
  const b = req.body || {};
  const mine = String(t.assignee) === String(u._id);
  const reviewer = isAdmin(u) || (u.role === 'leader' && String(t.team) === String(u.team));

  if (b.status === 'inprogress' && (mine || reviewer)) t.status = 'inprogress';
  else if (b.status === 'submitted' && mine) {
    t.status = 'submitted';
    t.submission = { note: b.note || '', file: b.file || null, at: new Date() };
    const team = await Team.findById(t.team);
    await notify([team?.leader, ...(await adminIds())], { icon: '📥', title: 'Submission to review', body: `${u.name} submitted “${t.title}”`, link: '/tasks' });
  } else if (['approved', 'rejected'].includes(b.status) && reviewer && !mine) {
    if (b.status === 'rejected' && !b.feedback) return res.status(400).json({ error: 'Add feedback so the intern knows what to fix' });
    t.status = b.status;
    t.completedAt = b.status === 'approved' ? new Date() : null;
    t.feedback = b.feedback || '';
    await notify([t.assignee], b.status === 'approved'
      ? { icon: '✅', title: 'Submission approved', body: `“${t.title}”${b.feedback ? ': ' + b.feedback : ''}`, link: '/tasks' }
      : { icon: '↩️', title: 'Needs rework', body: `“${t.title}”: ${b.feedback}`, link: '/tasks' });
  } else if (reviewer && !b.status) {
    for (const k of ['title', 'description', 'due', 'priority']) if (k in b) t[k] = b[k];
  } else return res.status(403).json({ error: 'Not allowed' });

  await t.save();
  res.json(await pop(Task.findById(t._id)));
});

router.delete('/:id', allow('admin', 'leader'), async (req, res) => {
  const t = await Task.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Task not found' });
  if (!isAdmin(req.user) && String(t.team) !== String(req.user.team)) return res.status(403).json({ error: 'Not allowed' });
  await t.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
