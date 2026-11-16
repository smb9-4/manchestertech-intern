import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { api } from '../api';
import { getSocket } from '../socket';
import { Avatar } from './ui';
import NetworkBg from './NetworkBg';
import Icon from './Icon';
import PwaControls, { pushLogout } from './PwaControls';
import Banner from './Banner';

const NAV = {
  admin: [['Overview', [['/', '🏠', 'Dashboard'], ['/interns', '🎓', 'Interns'], ['/teams', '👥', 'Teams']]],
    ['Work', [['/projects', '📁', 'Projects'], ['/tasks', '✅', 'Tasks'], ['/worklog', '\u{1F4DD}', 'Work Updates']]],
    ['Collaborate', [['/meetings', '📹', 'Meetings'], ['/chat', '💬', 'Chat']]],
    ['Insights', [['/reports', 'chart', 'Task Progress'], ['/notices', '\u{1F4CC}', 'Notice Board'], ['/audit', '\u{1F9FE}', 'Audit Log'], ['/roles', '🔐', 'Roles & Access']]]],
  leader: [['Overview', [['/', '🏠', 'Dashboard'], ['/teams', '👥', 'My Team']]],
    ['Work', [['/projects', '📁', 'Projects'], ['/tasks', '✅', 'Tasks'], ['/worklog', '\u{1F4DD}', 'Work Updates']]],
    ['Insights', [['/reports', 'chart', 'Task Progress']]],
    ['Collaborate', [['/meetings', '📹', 'Meetings'], ['/chat', '💬', 'Chat']]]],
  intern: [['Overview', [['/', '🏠', 'My Dashboard']]],
    ['Work', [['/projects', '📁', 'My Projects'], ['/tasks', '✅', 'My Tasks'], ['/worklog', '\u{1F4DD}', 'Work Updates']]],
    ['Insights', [['/reports', 'chart', 'My Progress']]],
    ['Collaborate', [['/meetings', '📹', 'Meetings'], ['/chat', '💬', 'Chat']]]],
};
const roleKey = (r) => (r === 'superadmin' ? 'admin' : r);
const ROLE_LABEL = { superadmin: 'Super Admin', admin: 'Admin', leader: 'Team Leader', intern: 'Intern' };

export default function Layout() {
  const { user, logout, toast } = useApp();
  const nav = NAV[roleKey(user.role)];
  const loc = useLocation();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api('/notifications').then(setNotifs).catch(() => {});
    const s = getSocket();
    const onN = (n) => { setNotifs((x) => [n, ...x]); toast(n.icon + ' ' + n.title); };
    s?.on('notification', onN);
    return () => s?.off('notification', onN);
  }, [toast]);
  useEffect(() => setOpen(false), [loc.pathname]);

  const current = nav.flatMap((g) => g[1]).find(([p]) => p === loc.pathname) || ['', '', loc.pathname === '/profile' ? 'My Profile' : ''];
  const unread = notifs.filter((n) => !n.read).length;
  const markRead = async () => { await api('/notifications/read-all', { method: 'POST' }); setNotifs((x) => x.map((n) => ({ ...n, read: true }))); };

  return (
    <div className="app">
      <div className="mt-bg"><NetworkBg density={0.6} opacity={0.35} /></div>
      <aside className="side">
        <div className="logo"><div className="logo-img" role="img" aria-label="Manchester Technologies"></div><span className="logo-text">Manchester<small>Team</small></span></div>
        {nav.map(([g, items]) => (
          <div key={g}>
            <div className="nav-label">{g}</div>
            {items.map(([p, ic, label]) => (
              <NavLink key={p} to={p} end className={({ isActive }) => 'nav-btn' + (isActive ? ' active' : '')} style={{ textDecoration: 'none' }}>
                <span className="ic"><Icon e={ic} /></span>{label}
              </NavLink>
            ))}
          </div>
        ))}
        <div className="side-foot">
          <div className="side-app"><PwaControls /></div>
          <div className="side-user">
            <NavLink to="/profile" className={({ isActive }) => 'nav-btn side-me' + (isActive ? ' active' : '')} style={{ textDecoration: 'none' }} title="My Profile"><span className="ic"><Avatar sm name={user.name} photo={user.profile && user.profile.photo} /></span><span className="side-me-t"><b>{user.name}</b><small>{ROLE_LABEL[user.role]}</small></span></NavLink>
            <button className="nav-btn logout side-out" title="Log out" onClick={async () => { await pushLogout(); logout(); navigate('/login'); }}><span className="ic"><Icon e="logout" /></span><span className="side-out-t">Log out</span></button>
          </div>
        </div>
      </aside>
      <div className="main">
        <header className="top">
          <div><h1>{current[2]}</h1><div className="sub">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
          <div className="spacer" />
          <button className="bell" onClick={(e) => { e.stopPropagation(); setOpen(!open); }} aria-label="Notifications"><Icon e="bell" />{unread > 0 && <span className="dot" />}</button>
          <div className="me"><Avatar name={user.name} photo={user.profile && user.profile.photo} /><div><div className="n">{user.name}</div><div className="r">{ROLE_LABEL[user.role]}{user.team ? ' · ' + user.team.name : ''}</div></div></div>
        </header>
        {open && (
          <div className="dropdown open">
            <div className="hd">Notifications<span className="spacer" /><button className="small" style={{ color: 'var(--brand)' }} onClick={markRead}>Mark all read</button></div>
            {notifs.length ? notifs.map((n) => (
              <div key={n._id} className={'nt' + (n.read ? '' : ' unread')} style={{ cursor: n.link ? 'pointer' : 'default' }} onClick={() => n.link && navigate(n.link)}>
                <div className="ico">{n.icon}</div><div><div className="t">{n.title}</div><div className="s">{n.body}</div><div className="s">{new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div></div>
              </div>
            )) : <div className="empty">Nothing new</div>}
          </div>
        )}
        {user.mustChangePassword && loc.pathname !== '/profile' && (
          <div style={{ padding: '14px 28px 0' }}><div className="demo-note">You are using a temporary password. <NavLink to="/profile">Change it now</NavLink>.</div></div>
        )}
        <main className="content" onClick={() => setOpen(false)}><Banner /><Outlet /></main>
      </div>
    </div>
  );
}
