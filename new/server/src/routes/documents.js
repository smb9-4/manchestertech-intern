const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { Document } = require('../models');
const { isAdmin, teamScope } = require('../middleware/auth');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: (+process.env.MAX_UPLOAD_MB || 20) * 1024 * 1024 },
});

const visible = (user) => {
  const scope = teamScope(user);
  const q = { category: { $ne: 'Submission' } };
  if (scope) q.$or = [{ team: null }, { team: scope }];
  return q;
};

router.get('/', async (req, res) => {
  const q = visible(req.user);
  if (req.query.category) q.category = req.query.category;
  res.json(await Document.find(q).populate('uploadedBy', 'name').populate('team', 'name').sort('-createdAt'));
});

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file received' });
  let { category = 'Project', team = null } = req.body;
  if (category === 'Policy' && !isAdmin(req.user)) category = 'Project';
  if (!isAdmin(req.user) && category !== 'Submission') team = req.user.team || null;
  const doc = await Document.create({
    name: req.file.originalname, storedName: req.file.filename, mime: req.file.mimetype, size: req.file.size,
    category, team: team || null, uploadedBy: req.user._id,
  });
  res.status(201).json(await doc.populate('uploadedBy', 'name'));
});

router.get('/:id/download', async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  const scope = teamScope(req.user);
  const allowed = !scope || !doc.team || String(doc.team) === String(scope) || String(doc.uploadedBy) === String(req.user._id);
  if (!allowed) return res.status(403).json({ error: 'Not allowed' });
  res.download(path.join(UPLOAD_DIR, doc.storedName), doc.name);
});

router.delete('/:id', async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  if (!isAdmin(req.user) && String(doc.uploadedBy) !== String(req.user._id)) return res.status(403).json({ error: 'Not allowed' });
  fs.rm(path.join(UPLOAD_DIR, doc.storedName), { force: true }, () => {});
  await doc.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
