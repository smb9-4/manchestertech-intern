const router = require('express').Router();
const { AuditLog } = require('../models');
const { allow } = require('../middleware/auth');

const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function buildQuery(q) {
  const f = {};
  if (q.category) f.category = q.category;
  if (q.actor) f.actor = q.actor;
  if (q.from || q.to) {
    f.createdAt = {};
    if (q.from) f.createdAt.$gte = new Date(q.from + 'T00:00:00');
    if (q.to) f.createdAt.$lte = new Date(q.to + 'T23:59:59');
  }
  if (q.q) {
    const r = new RegExp(esc(q.q), 'i');
    f.$or = [{ actorName: r }, { target: r }, { details: r }, { action: r }];
  }
  return f;
}

router.get('/', allow('admin'), async (req, res) => {
  const page = Math.max(1, +req.query.page || 1);
  const limit = 50;
  const f = buildQuery(req.query);
  const [items, total] = await Promise.all([
    AuditLog.find(f).sort('-createdAt').skip((page - 1) * limit).limit(limit).lean(),
    AuditLog.countDocuments(f),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

router.get('/export.csv', allow('admin'), async (req, res) => {
  const items = await AuditLog.find(buildQuery(req.query)).sort('-createdAt').limit(5000).lean();
  const c = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const tz = process.env.TIMEZONE || 'Asia/Kolkata';
  const csv = [['Time', 'Who', 'Role', 'Action', 'Target', 'Details', 'IP']]
    .concat(items.map((i) => [new Date(i.createdAt).toLocaleString('en-IN', { timeZone: tz }), i.actorName, i.role, i.action, i.target, i.details, i.ip]))
    .map((r) => r.map(c).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="audit-log.csv"');
  res.send(csv);
});

module.exports = router;