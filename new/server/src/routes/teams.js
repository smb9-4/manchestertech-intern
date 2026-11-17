const router = require('express').Router();
const { Team, User } = require('../models');
const { allow, teamScope } = require('../middleware/auth');

router.get('/', async (req, res) => {
  const scope = teamScope(req.user);
  const teams = await Team.find(scope ? { _id: scope } : {}).populate('leader', 'name email').sort('name');
  res.json(teams);
});

router.post('/', allow('admin'), async (req, res) => {
  const { name, focus, color } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Team name is required' });
  res.status(201).json(await Team.create({ name, focus, color }));
});

router.patch('/:id', allow('admin'), async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  const { name, focus, color, leader } = req.body || {};
  if (name) team.name = name;
  if (focus !== undefined) team.focus = focus;
  if (color) team.color = color;
  if (leader !== undefined) {
    if (team.leader) await User.updateOne({ _id: team.leader, role: 'leader' }, { role: 'intern' });
    if (leader) {
      const u = await User.findById(leader);
      if (!u) return res.status(400).json({ error: 'Leader not found' });
      if (await Team.findOne({ leader: u._id, _id: { $ne: team._id } })) return res.status(400).json({ error: 'That person already leads another team' });
      u.team = team._id;
      if (u.role === 'intern') u.role = 'leader';
      await u.save();
    }
    team.leader = leader || null;
  }
  await team.save();
  res.json(await team.populate('leader', 'name email'));
});

router.delete('/:id', allow('admin'), async (req, res) => {
  if (await User.exists({ team: req.params.id, active: true })) return res.status(400).json({ error: 'Move the team members out first' });
  await Team.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
