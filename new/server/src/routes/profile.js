// Intern profiles: personal, contact, education, emergency contact, links.
// Privacy: interns see/edit their own; leaders see only education/skills/links of teammates; admins see/edit everything.
const router = require('express').Router();
const { User } = require('../models');
const { allow, isAdmin } = require('../middleware/auth');

// type: text | long | date | phone | email | url | pin | year | choice
const FIELDS = {
  dob: 'date', gender: 'choice', altPhone: 'phone', personalEmail: 'email',
  addressLine: 'long', city: 'text', state: 'text', pincode: 'pin',
  degree: 'text', branch: 'text', yearOfStudy: 'text', rollNo: 'text', gradYear: 'year',
  emergencyName: 'text', emergencyRelation: 'text', emergencyPhone: 'phone',
  linkedin: 'url', github: 'url', portfolio: 'url', skills: 'long', bio: 'long',
  startDate: 'date', endDate: 'date', photo: 'photo',
};
const GENDERS = ['Female', 'Male', 'Other', 'Prefer not to say'];
const ADMIN_ONLY = ['startDate', 'endDate'];
const LEADER_CAN_SEE = ['photo', 'degree', 'branch', 'yearOfStudy', 'gradYear', 'linkedin', 'github', 'portfolio', 'skills', 'bio', 'startDate', 'endDate'];
const REQUIRED = ['photo', 'dob', 'gender', 'addressLine', 'city', 'state', 'pincode', 'degree', 'branch', 'yearOfStudy', 'emergencyName', 'emergencyPhone'];
const LABEL = {
  dob: 'Date of birth', gender: 'Gender', altPhone: 'Alternate phone', personalEmail: 'Personal email', addressLine: 'Address', city: 'City', state: 'State',
  pincode: 'PIN code', degree: 'Degree', branch: 'Branch', yearOfStudy: 'Year of study', rollNo: 'Roll number', gradYear: 'Graduation year',
  emergencyName: 'Emergency contact name', emergencyRelation: 'Relation', emergencyPhone: 'Emergency phone', linkedin: 'LinkedIn', github: 'GitHub',
  portfolio: 'Portfolio', skills: 'Skills', bio: 'About me', startDate: 'Internship start', endDate: 'Internship end', photo: 'Photo',
};

function clean(key, raw) {
  const v = String(raw == null ? '' : raw).trim();
  if (!v) return '';
  const t = FIELDS[key];
  const bad = (msg) => { const e = new Error(`${LABEL[key]}: ${msg}`); e.status = 400; throw e; };
  if (t === 'date') { if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(new Date(v))) bad('use a valid date'); if (key === 'dob' && (new Date(v) > new Date() || new Date(v) < new Date('1950-01-01'))) bad('check the date'); return v; }
  if (t === 'phone') { const d = v.replace(/[\s-]/g, ''); if (!/^\+?\d{7,15}$/.test(d)) bad('enter a valid phone number'); return d; }
  if (t === 'email') { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) bad('enter a valid email'); return v.toLowerCase().slice(0, 120); }
  if (t === 'url') { const u = /^https?:\/\//i.test(v) ? v : 'https://' + v; try { new URL(u); } catch { bad('enter a valid link'); } return u.slice(0, 300); }
  if (t === 'pin') { if (!/^\d{4,10}$/.test(v)) bad('digits only'); return v; }
  if (t === 'year') { if (!/^(19|20)\d{2}$/.test(v)) bad('enter a year like 2027'); return v; }
  if (t === 'photo') { if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v)) bad('upload a JPG or PNG image'); if (v.length > 400000) bad('image is too large'); return v; }
  if (t === 'choice') { if (!GENDERS.includes(v)) bad('pick an option'); return v; }
  return v.slice(0, t === 'long' ? 1000 : 120);
}

function completeness(u) {
  const p = u.profile || {};
  const have = REQUIRED.filter((k) => p[k]).length + (u.phone ? 1 : 0) + (u.college ? 1 : 0) + (u.name ? 1 : 0);
  return Math.round((have / (REQUIRED.length + 3)) * 100);
}

function shape(u, viewer) {
  const full = isAdmin(viewer) || String(viewer._id) === String(u._id);
  const p = u.profile || {};
  const profile = {};
  for (const k of Object.keys(FIELDS)) if (full || LEADER_CAN_SEE.includes(k)) profile[k] = p[k] || '';
  return {
    user: { _id: u._id, name: u.name, email: u.email, role: u.role, team: u.team, college: u.college, phone: full ? u.phone : undefined, active: u.active },
    profile, limited: !full, completeness: completeness(u), updatedAt: u.updatedAt,
  };
}

async function canView(viewer, target) {
  if (!target) return false;
  if (isAdmin(viewer) || String(viewer._id) === String(target._id)) return true;
  return viewer.role === 'leader' && viewer.team && String(target.team && (target.team._id || target.team)) === String(viewer.team);
}

async function save(target, body, byAdmin) {
  const b = body || {};
  if ('name' in b) { const n = String(b.name || '').trim(); if (n.length < 2) { const e = new Error('Full name is required'); e.status = 400; throw e; } target.name = n.slice(0, 80); }
  if ('phone' in b) target.phone = b.phone ? clean('altPhone', b.phone) : '';
  if ('college' in b) target.college = String(b.college || '').trim().slice(0, 120);
  const next = { ...(target.profile || {}) };
  for (const [k, v] of Object.entries(b.profile || {})) {
    if (!(k in FIELDS)) continue;
    if (ADMIN_ONLY.includes(k) && !byAdmin) continue;
    next[k] = clean(k, v);
  }
  target.profile = next;
  target.markModified('profile');
  await target.save();
}

router.get('/me', async (req, res) => {
  const u = await User.findById(req.user._id).populate('team', 'name');
  res.json(shape(u, req.user));
});

router.put('/me', async (req, res) => {
  const u = await User.findById(req.user._id);
  try { await save(u, req.body, isAdmin(req.user)); } catch (e) { return res.status(e.status || 500).json({ error: e.message }); }
  res.json(shape(await User.findById(u._id).populate('team', 'name'), req.user));
});

// Admin: everyone's profiles as CSV (Excel)
router.get('/export.csv', allow('admin'), async (req, res) => {
  const people = await User.find({ role: { $in: ['intern', 'leader'] } }).populate('team', 'name').sort('name').lean();
  const keys = Object.keys(FIELDS).filter((k) => k !== 'photo');
  const c = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const csv = [['Name', 'Login email', 'Role', 'Team', 'Phone', 'College', 'Active', 'Profile %', ...keys.map((k) => LABEL[k])]]
    .concat(people.map((u) => [u.name, u.email, u.role, u.team && u.team.name, u.phone, u.college, u.active ? 'Yes' : 'No', completeness(u) + '%', ...keys.map((k) => (u.profile || {})[k] || '')]))
    .map((r) => r.map(c).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="intern-profiles.csv"');
  res.send('\uFEFF' + csv);
});

router.get('/:id', async (req, res) => {
  const u = await User.findById(req.params.id).populate('team', 'name').catch(() => null);
  if (!(await canView(req.user, u))) return res.status(404).json({ error: 'Profile not found' });
  res.json(shape(u, req.user));
});

router.put('/:id', allow('admin'), async (req, res) => {
  const u = await User.findById(req.params.id).catch(() => null);
  if (!u) return res.status(404).json({ error: 'Profile not found' });
  try { await save(u, req.body, true); } catch (e) { return res.status(e.status || 500).json({ error: e.message }); }
  res.json(shape(await User.findById(u._id).populate('team', 'name'), req.user));
});

module.exports = router;