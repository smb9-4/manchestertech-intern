// Sends emails after certain actions succeed. Watches requests in one place,
// so the route files don't need changes. Never blocks or breaks the request.
const { User } = require('../models');
const { sendMail, sendMany, appUrl, esc } = require('../services/mailer');

const loginMail = (u, pw, reset) => ({
  to: u.email, name: u.name,
  subject: reset ? 'Your intern portal password was reset' : 'Your intern portal login',
  title: reset ? 'Your password was reset' : `Welcome, ${u.name}!`,
  html: `<p>${reset ? 'An admin reset your password.' : 'An account has been created for you on the intern portal.'}</p>
    <p><b>Email:</b> ${esc(u.email)}<br><b>Temporary password:</b> <code style="background:#f0f1f6;padding:2px 6px;border-radius:4px">${esc(pw)}</code></p>
    <p>Please log in and change your password from <b>My Profile</b>.</p>`,
  button: { label: 'Open the portal', url: appUrl() },
});

module.exports = function emailTrail(req, res, next) {
  const path = req.originalUrl.split('?')[0];
  const m = req.method;
  const watch = (m === 'POST' && /^\/api\/(users|bulk-users|tasks|meetings|announcements)$/.test(path))
    || (m === 'POST' && /^\/api\/users\/[^/]+\/reset-password$/.test(path));
  if (!watch) return next();

  const send = res.json.bind(res);
  res.json = (body) => { res.locals.mailBody = body; return send(body); };

  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    const out = res.locals.mailBody || {};
    const b = req.body || {};
    (async () => {
      if (path === '/api/users' && out.user) {
        await sendMail(loginMail(out.user, out.tempPassword));
      } else if (path === '/api/bulk-users') {
        await sendMany((out.created || []).map((c) => loginMail(c, c.tempPassword)));
      } else if (/reset-password$/.test(path)) {
        const u = await User.findById(path.split('/')[3]).lean();
        if (u) await sendMail(loginMail(u, out.tempPassword, true));
      } else if (path === '/api/tasks' && out.assignee) {
        const u = await User.findById(out.assignee._id).lean();
        if (u) await sendMail({
          to: u.email, name: u.name, subject: `New task: ${out.title}`, title: 'You have a new task',
          html: `<p><b>${esc(out.title)}</b></p>${out.description ? `<p>${esc(out.description)}</p>` : ''}
            <p>Project: ${esc(out.project && out.project.name)}<br>Priority: ${esc(out.priority)}<br>Due: ${out.due ? new Date(out.due).toDateString() : 'not set'}<br>Assigned by: ${esc(req.user && req.user.name)}</p>`,
          button: { label: 'View my tasks', url: appUrl() + '/tasks' },
        });
      } else if (path === '/api/meetings' && out.meeting) {
        const mt = out.meeting;
        const q = { active: true };
        if (mt.team) q.$or = [{ team: mt.team._id || mt.team }, { role: { $in: ['admin', 'superadmin'] } }];
        const people = await User.find(q).select('name email').lean();
        const when = new Date(mt.start).toLocaleString('en-IN', { timeZone: process.env.TIMEZONE || 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' });
        await sendMany(people.map((p) => ({
          to: p.email, name: p.name, subject: `Meeting: ${mt.title} (${when})`, title: mt.title,
          html: `<p><b>When:</b> ${esc(when)} (${mt.duration} min)<br><b>For:</b> ${mt.team ? esc(mt.team.name || 'your team') : 'Everyone'}</p>
            ${mt.agenda ? `<p><b>Agenda:</b> ${esc(mt.agenda)}</p>` : ''}${mt.link ? '' : '<p>The meeting link will be shared on the portal.</p>'}`,
          button: mt.link ? { label: 'Join Google Meet', url: mt.link } : { label: 'Open meetings', url: appUrl() + '/meetings' },
        })));
      } else if (path === '/api/announcements' && b.email && out._id) {
        const people = await User.find({ active: true }).select('name email').lean();
        await sendMany(people.map((p) => ({
          to: p.email, name: p.name, subject: `Announcement: ${String(out.text).slice(0, 60)}`, title: 'New announcement',
          html: `<p style="font-size:15px">${esc(out.text)}</p>`, button: { label: 'Open the portal', url: appUrl() },
        })));
      }
    })().catch((e) => console.error('Email step failed:', e.message));
  });
  next();
};