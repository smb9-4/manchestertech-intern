// Records every important action in the AuditLog collection, in one place.
const { AuditLog, User, Team, Project, Task, Meeting, Document } = require('../models');

const RULES = [
  ['POST', /^\/api\/auth\/login$/, 'auth.login'],
  ['POST', /^\/api\/auth\/change-password$/, 'auth.password_change'],
  ['POST', /^\/api\/users$/, 'user.create'],
  ['POST', /^\/api\/bulk-users/, 'user.bulk_create'],
  ['PATCH', /^\/api\/users\/([^/]+)$/, 'user.update'],
  ['POST', /^\/api\/users\/([^/]+)\/reset-password$/, 'user.password_reset', User],
  ['POST', /^\/api\/teams$/, 'team.create'],
  ['PATCH', /^\/api\/teams\/([^/]+)$/, 'team.update'],
  ['DELETE', /^\/api\/teams\/([^/]+)$/, 'team.delete', Team],
  ['POST', /^\/api\/projects$/, 'project.create'],
  ['PATCH', /^\/api\/projects\/([^/]+)$/, 'project.update'],
  ['DELETE', /^\/api\/projects\/([^/]+)$/, 'project.delete', Project],
  ['POST', /^\/api\/tasks$/, 'task.create'],
  ['PATCH', /^\/api\/tasks\/([^/]+)$/, 'task.update'],
  ['DELETE', /^\/api\/tasks\/([^/]+)$/, 'task.delete', Task],
  ['POST', /^\/api\/attendance\/check-in$/, 'attendance.check_in'],
  ['POST', /^\/api\/attendance\/check-out$/, 'attendance.check_out'],
  ['POST', /^\/api\/attendance\/mark$/, 'attendance.mark'],
  ['POST', /^\/api\/attendance\/remind$/, 'attendance.remind'],
  ['POST', /^\/api\/meetings$/, 'meeting.create'],
  ['PATCH', /^\/api\/meetings\/([^/]+)$/, 'meeting.update'],
  ['DELETE', /^\/api\/meetings\/([^/]+)$/, 'meeting.delete', Meeting],
  ['POST', /^\/api\/documents$/, 'document.upload'],
  ['DELETE', /^\/api\/documents\/([^/]+)$/, 'document.delete', Document],
  ['POST', /^\/api\/messages\/announcements$/, 'chat.announcement'],
  ['POST', /^\/api\/worklogs$/, 'worklog.submit'],
  ['PATCH', /^\/api\/worklogs\/([^/]+)\/review$/, 'worklog.review'],
  ['POST', /^\/api\/announcements$/, 'chat.pin'],
  ['POST', /^\/api\/password\/reset$/, 'auth.password_reset_link'],
];

const nameOf = (d) => (d && (d.name || d.title)) || '';

module.exports = async function auditTrail(req, res, next) {
  const path = req.originalUrl.split('?')[0];
  const rule = RULES.find(([m, re]) => m === req.method && re.test(path));
  if (!rule) return next();
  const [, re, baseAction, lookupModel] = rule;
  const id = (path.match(re) || [])[1];

  let before = '';
  if (lookupModel && id) {
    try { before = nameOf(await lookupModel.findById(id).lean()); } catch { /* bad id */ }
  }

  const send = res.json.bind(res);
  res.json = (body) => { res.locals.auditBody = body; return send(body); };

  res.on('finish', async () => {
    try {
      const ok = res.statusCode < 400;
      const b = req.body || {};
      const out = res.locals.auditBody || {};
      let action = baseAction;
      let target = before;
      let details = '';
      let actor = req.user;

      if (baseAction === 'auth.login') {
        if (res.statusCode === 400) { action = 'auth.login_failed'; actor = { name: b.email || 'unknown' }; target = b.email; details = 'Wrong email or password'; }
        else if (res.statusCode === 403) { action = 'auth.login_blocked'; actor = { name: b.email }; target = b.email; details = 'Disabled account'; }
        else if (ok) { actor = out.user; target = out.user && out.user.email; }
        else return;
      } else if (!ok) return;

      switch (baseAction) {
        case 'user.create': target = out.user && out.user.name; details = `${b.email} (${b.role || 'intern'})`; break;
        case 'user.update':
          target = out.name;
          if (b.active === false) action = 'user.remove';
          else if (b.active === true) action = 'user.restore';
          details = Object.keys(b).map((k) => (k === 'feedback' ? 'feedback updated' : `${k}: ${b[k]}`)).join(', ');
          break;
        case 'user.bulk_create': target = (out.created || []).length + ' intern(s)'; details = (out.skipped || []).length + ' skipped'; break;
        case 'chat.pin': target = 'Everyone'; details = String(b.text || '').slice(0, 200); break;
        case 'worklog.submit': target = out.date || ''; details = (out.hours || 0) + ' h: ' + String(out.summary || '').slice(0, 150); break;
        case 'worklog.review': target = (out.user && out.user.name) || ''; details = (out.date || '') + (out.feedback ? ' - ' + out.feedback : ''); break;
        case 'team.create': target = b.name; details = b.focus || ''; break;
        case 'team.update': target = out.name; details = 'leader' in b ? `leader: ${(out.leader && out.leader.name) || 'none'}` : Object.keys(b).join(', '); break;
        case 'project.create': target = b.name; break;
        case 'project.update': target = out.name; details = Object.keys(b).map((k) => `${k}: ${b[k]}`).join(', '); break;
        case 'task.create': target = b.title; details = `assigned to ${(out.assignee && out.assignee.name) || ''}`; break;
        case 'task.update':
          target = out.title;
          action = { inprogress: 'task.start', submitted: 'task.submit', approved: 'task.approve', rejected: 'task.reject' }[b.status] || 'task.update';
          details = b.feedback || b.note || '';
          break;
        case 'attendance.check_in': target = req.user && req.user.name; details = out.status || ''; break;
        case 'attendance.check_out': target = req.user && req.user.name; break;
        case 'attendance.mark': { const u = await User.findById(b.userId).lean().catch(() => null); target = nameOf(u); details = `${b.date || 'today'}: ${b.status}`; break; }
        case 'attendance.remind': target = `${out.reminded || 0} people`; break;
        case 'meeting.create': target = b.title; details = `${b.start ? new Date(b.start).toLocaleString('en-IN', { timeZone: process.env.TIMEZONE || 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) : ''} ${b.team ? '(one team)' : '(everyone)'}`; break;
        case 'meeting.update': target = out.title; details = Object.keys(b).join(', '); break;
        case 'document.upload': target = out.name; details = `${out.category || ''}, ${Math.round((out.size || 0) / 1024)} KB`; break;
        case 'chat.announcement': target = 'Everyone'; details = String(b.text || '').slice(0, 200); break;
        default: break;
      }

      const u = actor || {};
      await AuditLog.create({
        actor: u._id || null, actorName: u.name || u.email || 'Unknown', role: u.role || '',
        action, category: action.split('.')[0], target: String(target || '').slice(0, 200), details: String(details || '').slice(0, 500),
        ip: String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim(),
      });
    } catch (e) { console.error('Audit log failed:', e.message); }
  });
  next();
};