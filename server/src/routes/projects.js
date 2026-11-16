const router = require('express').Router();
const { Project, Task, Team } = require('../models');
const { allow, isAdmin, teamScope } = require('../middleware/auth');
const { notify, teamIds } = require('../services/notify');

router.get('/', async (req, res) => {
  const scope = teamScope(req.user);
  const projects = await Project.find(scope ? { team: scope } : {}).populate('team', 'name color').sort('due').lean();
  const tasks = await Task.find({ project: { $in: projects.map((p) => p._id) } }).select('project status assignee').lean();
  projects.forEach((p) => {
    const t = tasks.filter((x) => String(x.project) === String(p._id));
    p.taskCount = t.length;
    p.doneCount = t.filter((x) => x.status === 'approved').length;
    p.members = [...new Set(t.map((x) => String(x.assignee)))];
  });
  res.json(projects);
});

router.post('/', allow('admin'), async (req, res) => {
  const { name, description, team, due } = req.body || {};
  const cleanName = String(name || '').trim();
  if (!cleanName || !team) return res.status(400).json({ error: 'Name and team are required' });
  const dueDate = due ? new Date(due) : undefined;
  if (due && Number.isNaN(dueDate.getTime())) return res.status(400).json({ error: 'Enter a valid due date' });
  if (!await Team.exists({ _id: team })) return res.status(400).json({ error: 'Selected team was not found' });
  const p = await Project.create({ name: cleanName, description, team, due: dueDate });
  await notify(await teamIds(team), { icon: '📁', title: 'New project', body: name, link: '/projects' });
  res.status(201).json(await p.populate('team', 'name color'));
});

router.patch('/:id', allow('admin', 'leader'), async (req, res) => {
  const p = await Project.findById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  if (!isAdmin(req.user) && String(p.team) !== String(req.user.team)) return res.status(403).json({ error: 'Not your team’s project' });
  for (const k of ['progress', 'status', 'description', 'due', 'name']) if (k in (req.body || {})) p[k] = req.body[k];
  await p.save();
  res.json(await p.populate('team', 'name color'));
});

router.delete('/:id', allow('admin'), async (req, res) => {
  await Task.deleteMany({ project: req.params.id });
  await Project.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
