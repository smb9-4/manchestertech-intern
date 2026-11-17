const jwt = require('jsonwebtoken');
const { User } = require('../models');

const isAdmin = (u) => ['admin', 'superadmin'].includes(u.role);

async function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id);
    if (!user || !user.active) return res.status(401).json({ error: 'Account disabled' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

// allow('admin','leader') — admin also matches superadmin
const allow = (...roles) => (req, res, next) => {
  const r = req.user.role;
  if (roles.includes(r) || (roles.includes('admin') && r === 'superadmin')) return next();
  res.status(403).json({ error: 'You do not have permission for this' });
};

// Which team a non-admin is limited to (null = no limit)
const teamScope = (user) => (isAdmin(user) ? null : user.team);

module.exports = { auth, allow, isAdmin, teamScope };
