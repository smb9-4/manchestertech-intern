// Daily work updates: each intern writes what they did today.
// Interns see their own, leaders see their team, admins see everyone.
const router = require('express').Router();
const mongoose = require('mongoose');
const { User, Team, Task, Document } = require('../models');
const { allow, isAdmin, teamScope } = require('../middleware/auth');
const { notify, adminIds } = require('../services/notify');
const { today } = require('../services/time');

const WorkLog = mongoose.models.WorkLog || mongoose.model('WorkLog', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  date: { type: String, required: true }, // YYYY-MM-DD
  summary: { type: String, required: true, maxlength: 3000 },
  hours: { type: Number, min: 0, max: 24, default: 0 },
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  blockers: { type: String, default: '', maxlength: 1000 },
  tomorrow: { type: String, default: '', maxlength: 1000 },
  links: { type: String, default: '', maxlength: 1000 },
  attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  feedback: { type: String, default: '', maxlength: 1000 },
}, { timestamps: true }).index({ user: 1, date: 1 }, { unique: true }));

const pop = (q) => q.populate('user', 'name email role').populate('team', 'name color').populate('tasks', 'title status').populate('reviewedBy', 'name').populate('attachments', 'name size mime');
const dayStr = (offset) => { const d = new Date(); d.setDate(d.getDate() - offset); return today(d); };

function scopeQuery(u) {
  if (u.role === 'intern') return { user: u._id };
  const s = teamScope(u);
  return s ? { team: s } : {};
}
function canReview(me, log) {
  if (isAdmin(me)) return true;
  return me.role === 'leader' && String(log.team) === String(me.team) && String(log.user) !== String(me._id);
}

// List updates (filters: date, from, to, user)
router.get('/', async (req, res) => {
  const q = scopeQuery(req.user);
  const { date, from, to, user } = req.query;
  if (date) q.date = date;
  else if (from || to) { q.date = {}; if (from) q.date.$gte = from; if (to) q.date.$lte = to; }
  if (user && req.user.role !== 'intern') q.user = user;
  if (req.query.mine === '1') q.user = req.user._id; // only my own updates
  const logs = await pop(WorkLog.find(q).sort({ date: -1, createdAt: -1 }).limit(300));
  res.json(logs.filter((l) => l.user)); // skip updates of deleted accounts
});

// My update for a day (default today)
router.get('/mine', async (req, res) => {
  res.json(await pop(WorkLog.findOne({ user: req.user._id, date: req.query.date || today() })));
});

// Who has not submitted for a day
router.get('/missing', allow('admin', 'leader'), async (req, res) => {
  const date = req.query.date || today();
  const q = { active: true, role: { $in: ['intern', 'leader'] } };
  const s = teamScope(req.user); if (s) q.team = s;
  const people = await User.find(q).populate('team', 'name').sort('name').lean();
  const done = new Set((await WorkLog.find({ date, user: { $in: people.map((p) => p._id) } }).select('user').lean()).map((l) => String(l.user)));
  res.json(people.filter((p) => !done.has(String(p._id))).map((p) => ({ _id: p._id, name: p.name, email: p.email, team: p.team })));
});

// Submit or update my work update (today, or up to 2 days back)
router.post('/', async (req, res) => {
  const b = req.body || {};
  const date = b.date || today();
  const allowed = [dayStr(0), dayStr(1), dayStr(2)];
  if (!allowed.includes(date)) return res.status(400).json({ error: 'You can only write updates for today or the last 2 days' });
  const summary = String(b.summary || '').trim();
  if (summary.length < 10) return res.status(400).json({ error: 'Please describe what you worked on (at least 10 characters)' });
  const hours = Math.max(0, Math.min(24, Number(b.hours) || 0));
  const myTasks = (await Task.find({ _id: { $in: (b.tasks || []).filter((id) => mongoose.isValidObjectId(id)) }, assignee: req.user._id }).select('_id').lean()).map((t) => t._id);
  // Only files this intern uploaded themselves (max 10)
  const attIds = (b.attachments || []).filter((id) => mongoose.isValidObjectId(id)).slice(0, 10);
  const myFiles = (await Document.find({ _id: { $in: attIds }, uploadedBy: req.user._id }).select('_id').lean()).map((d) => d._id);
  const existing = await WorkLog.findOne({ user: req.user._id, date });
  const data = { team: req.user.team || null, summary, hours, tasks: myTasks, blockers: String(b.blockers || '').trim(), tomorrow: String(b.tomorrow || '').trim(), links: String(b.links || '').trim(), attachments: myFiles };
  let log;
  if (existing) {
    Object.assign(existing, data);
    if (existing.reviewedAt) { existing.reviewedAt = null; existing.reviewedBy = null; } // edited after review: needs a fresh look
    log = await existing.save();
  } else {
    log = await WorkLog.create({ user: req.user._id, date, ...data });
    const team = req.user.team ? await Team.findById(req.user.team).lean() : null;
    const who = [team && team.leader, ...(await adminIds())].filter((id) => id && String(id) !== String(req.user._id));
    await notify(who, { icon: '\u{1F4DD}', title: 'New work update', body: `${req.user.name}: ${summary.slice(0, 100)}`, link: '/worklog' });
  }
  if (data.blockers && (!existing || existing.blockers !== data.blockers)) {
    const team = req.user.team ? await Team.findById(req.user.team).lean() : null;
    const who = [team && team.leader].filter((id) => id && String(id) !== String(req.user._id));
    await notify(who, { icon: '\u{26A0}', title: `${req.user.name} is blocked`, body: data.blockers.slice(0, 120), link: '/worklog' });
  }
  res.status(existing ? 200 : 201).json(await pop(WorkLog.findById(log._id)));
});

// Leader/admin: mark as reviewed with optional feedback
router.patch('/:id/review', allow('admin', 'leader'), async (req, res) => {
  const log = await WorkLog.findById(req.params.id).catch(() => null);
  if (!log) return res.status(404).json({ error: 'Update not found' });
  if (!canReview(req.user, log)) return res.status(403).json({ error: 'You can only review your own team' });
  log.reviewedBy = req.user._id;
  log.reviewedAt = new Date();
  log.feedback = String((req.body && req.body.feedback) || '').trim();
  await log.save();
  await notify([log.user], { icon: '\u{2705}', title: 'Your work update was reviewed', body: log.feedback ? `${req.user.name}: ${log.feedback.slice(0, 100)}` : `${req.user.name} reviewed your update for ${log.date}`, link: '/worklog' });
  res.json(await pop(WorkLog.findById(log._id)));
});

// Leader/admin: remind everyone who has not written today's update
router.post('/remind', allow('admin', 'leader'), async (req, res) => {
  const date = today();
  const q = { active: true, role: { $in: ['intern', 'leader'] }, _id: { $ne: req.user._id } };
  const s = teamScope(req.user); if (s) q.team = s;
  const people = await User.find(q).select('_id').lean();
  const done = new Set((await WorkLog.find({ date }).select('user').lean()).map((l) => String(l.user)));
  const missing = people.filter((p) => !done.has(String(p._id))).map((p) => p._id);
  await notify(missing, { icon: '\u{1F4DD}', title: 'Please write your work update', body: 'Tell your team what you worked on today.', link: '/worklog' });
  res.json({ reminded: missing.length });
});

router.get('/export.csv', allow('admin', 'leader'), async (req, res) => {
  const q = scopeQuery(req.user);
  if (req.query.from || req.query.to) { q.date = {}; if (req.query.from) q.date.$gte = req.query.from; if (req.query.to) q.date.$lte = req.query.to; }
  const logs = await pop(WorkLog.find(q).sort({ date: -1 }).limit(5000));
  const c = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const csv = [['Date', 'Intern', 'Team', 'Hours', 'What I did', 'Tasks', 'Blockers', 'Plan for tomorrow', 'Links', 'Attachments', 'Reviewed by', 'Feedback']]
    .concat(logs.map((l) => [l.date, l.user && l.user.name, l.team && l.team.name, l.hours, l.summary, (l.tasks || []).map((t) => t.title).join('; '), l.blockers, l.tomorrow, l.links, (l.attachments || []).map((a) => a.name).join('; '), l.reviewedBy ? l.reviewedBy.name : '', l.feedback]))
    .map((r) => r.map(c).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="work-updates.csv"');
  res.send(csv);
});

module.exports = router;