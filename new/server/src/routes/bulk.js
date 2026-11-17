// POST /api/bulk-users  { rows: [{ name, email, college, phone, team }] }
const router = require('express').Router();
const crypto = require('crypto');
const { User, Team } = require('../models');
const { allow } = require('../middleware/auth');
const { notify } = require('../services/notify');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (v) => String(v == null ? '' : v).trim();

router.post('/', allow('admin'), async (req, res) => {
  const rows = Array.isArray(req.body && req.body.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ error: 'No rows received' });
  if (rows.length > 300) return res.status(400).json({ error: 'Maximum 300 rows at a time' });

  const teams = await Team.find().lean();
  const teamByName = Object.fromEntries(teams.map((t) => [t.name.trim().toLowerCase(), t]));
  const emails = rows.map((r) => clean(r.email).toLowerCase()).filter(Boolean);
  const existing = new Set((await User.find({ email: { $in: emails } }).select('email').lean()).map((u) => u.email));

  const seen = new Set();
  const created = [];
  const skipped = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || {};
    const name = clean(r.name);
    const email = clean(r.email).toLowerCase();
    const teamName = clean(r.team);
    const rowNo = i + 2;
    const skip = (reason) => skipped.push({ row: rowNo, name, email, reason });

    if (!name && !email) continue;
    if (!name) { skip('Name is missing'); continue; }
    if (!EMAIL.test(email)) { skip('Email is missing or invalid'); continue; }
    if (existing.has(email)) { skip('Already registered'); continue; }
    if (seen.has(email)) { skip('Duplicate email in this file'); continue; }
    let team = null;
    if (teamName) {
      team = teamByName[teamName.toLowerCase()];
      if (!team) { skip(`Team "${teamName}" not found`); continue; }
    }
    seen.add(email);

    try {
      const tempPassword = crypto.randomBytes(5).toString('hex');
      const u = await User.create({
        name, email, college: clean(r.college), phone: clean(r.phone),
        team: team ? team._id : null, role: 'intern', password: tempPassword, mustChangePassword: true,
      });
      created.push({ name, email, team: team ? team.name : '', tempPassword, _id: u._id });
    } catch (e) {
      skip(e.message);
    }
  }

  if (created.length) {
    await notify(created.map((c) => c._id), { icon: '\u{1F44B}', title: 'Welcome to the Intern Portal', body: 'Please change your password from My Profile.' });
  }
  res.json({ created: created.map(({ _id, ...c }) => c), skipped });
});

module.exports = router;