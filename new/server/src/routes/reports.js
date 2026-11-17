const router = require('express').Router();
const { User, Task, Team } = require('../models');
const { teamScope } = require('../middleware/auth');

// Score = 60% approved tasks + 40% leader rating
async function buildRows(user) {
  const q = { active: true, role: { $in: ['intern', 'leader'] } };
  if (user.role === 'intern') q._id = user._id;
  else if (teamScope(user)) q.team = user.team;
  const people = await User.find(q).populate('team', 'name color').sort('name');
  const ids = people.map((p) => p._id);
  const tasks = await Task.find({ assignee: { $in: ids } }).select('assignee status').lean();
  return people.map((p) => {
    const t = tasks.filter((x) => String(x.assignee) === String(p._id));
    const done = t.filter((x) => x.status === 'approved').length;
    const delivery = t.length ? Math.round((done / t.length) * 100) : 0;
    const ratingPct = Math.round(((p.rating || 0) / 5) * 100);
    return {
      user: { _id: p._id, name: p.name, email: p.email, team: p.team, role: p.role, rating: p.rating, feedback: p.feedback },
      tasks: t.length, done, delivery, ratingPct,
      score: Math.round(delivery * 0.6 + ratingPct * 0.4),
    };
  }).sort((a, b) => b.score - a.score);
}

router.get('/', async (req, res) => {
  const rows = await buildRows(req.user);
  const scope = teamScope(req.user);
  const teams = req.user.role === 'intern' ? [] : await Team.find(scope ? { _id: scope } : {}).sort('name');
  const byTeam = teams.map((t) => {
    const r = rows.filter((x) => String(x.user.team && x.user.team._id) === String(t._id));
    const tasks = r.reduce((s, x) => s + x.tasks, 0), done = r.reduce((s, x) => s + x.done, 0);
    const avgScore = r.length ? Math.round(r.reduce((s, x) => s + x.score, 0) / r.length) : 0;
    return { team: t, members: r.length, delivery: tasks ? Math.round((done / tasks) * 100) : 0, avgScore };
  });
  res.json({ rows, byTeam });
});

router.get('/export.csv', async (req, res) => {
  const rows = await buildRows(req.user);
  const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const csv = [['Name', 'Email', 'Team', 'Tasks', 'Approved', 'Delivery %', 'Rating', 'Score']]
    .concat(rows.map((r) => [r.user.name, r.user.email, r.user.team && r.user.team.name, r.tasks, r.done, r.delivery, r.user.rating, r.score]))
    .map((r) => r.map(esc).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="internhub-report.csv"');
  res.send(csv);
});

module.exports = router;