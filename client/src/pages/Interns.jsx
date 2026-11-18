import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useApp } from '../context';
import { useApi, Avatar, Loading, Modal, Bar, AttPill, Empty } from '../components/ui';
import BulkImport from '../components/BulkImport';
import { ProfileModal } from '../components/ProfileForm';
import { download } from '../api';

export default function Interns() {
  const { user, toast } = useApp();
  const [users, reload] = useApi('/users?all=1');
  const [teams] = useApi('/teams');
  const [report] = useApi('/reports');
  const [attendance] = useApi('/attendance/today');
  const [tasks] = useApi('/tasks');
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(''); const [tf, setTf] = useState(''); const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState(null);
  if (!users || !teams || !report || !attendance || !tasks) return <Loading />;
  const presentOnly = searchParams.get('present') === 'today';
  const presentIds = new Set(attendance.rows.filter(({ user: person, record }) =>
    person.role === 'intern' && record?.checkIn && ['present', 'late'].includes(record.status)).map(({ user: person }) => person._id));
  const attendanceByUser = new Map(attendance.rows.map(({ user: person, record }) => [person._id, record]));
  const stats = Object.fromEntries(report.rows.map((r) => [r.user._id, r]));
  const list = users.filter((u) => (showInactive || u.active) && (!presentOnly || presentIds.has(u._id)) && (!q || (u.name + u.email + u.college).toLowerCase().includes(q.toLowerCase())) && (!tf || u.team?._id === tf));
  const projectsFor = (userId) => [...new Set(tasks.filter((task) => task.assignee?._id === userId).map((task) => task.project?.name).filter(Boolean))];

  const add = async (fd) => {
    const r = await api('/users', { method: 'POST', body: Object.fromEntries(fd) });
    setModal({ kind: 'cred', name: r.user.name, email: r.user.email, pw: r.tempPassword }); reload();
  };
  const reset = async (u) => { const r = await api(`/users/${u._id}/reset-password`, { method: 'POST' }); setModal({ kind: 'cred', name: u.name, email: u.email, pw: r.tempPassword }); };
  const toggle = async (u) => { try { await api('/users/' + u._id, { method: 'PATCH', body: { active: !u.active } }); toast(u.active ? 'Access removed' : 'Access restored'); reload(); } catch (e) { toast(e.message); } };

  return (<>
    {presentOnly && <div className="card"><h3>Interns present today</h3><p className="muted">{presentIds.size} intern(s) checked in on {new Date(attendance.date + 'T00:00').toLocaleDateString('en-IN', { dateStyle: 'full' })}.</p></div>}
    <div className="toolbar">
      <input className="search" placeholder="Search name, email or college..." value={q} onChange={(e) => setQ(e.target.value)} />
      <select className="search" style={{ minWidth: 150 }} value={tf} onChange={(e) => setTf(e.target.value)}><option value="">All teams</option>{teams.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}</select>
      <label className="small muted"><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> show removed</label>
      <div className="spacer" />
      <button className="btn ghost" onClick={() => setSearchParams(presentOnly ? {} : { present: 'today' })}>{presentOnly ? 'Show all interns' : 'Present today'}</button>
      <button className="btn ghost" onClick={() => download('/profile/export.csv', 'intern-profiles.csv').catch((e) => toast(e.message))}>Download profiles</button> <button className="btn ghost" onClick={() => setModal({ kind: 'bulk' })}>Bulk add (Excel/CSV)</button> <button className="btn" onClick={() => setModal({ kind: 'add' })}>+ Add intern</button>
    </div>
    <div className="card" style={{ padding: '6px 8px', overflowX: 'auto' }}>
      <table><thead><tr><th>Person</th><th>Role</th><th>Team</th><th>Projects</th><th>Attendance</th><th>College</th><th>Tasks</th><th>Score</th><th /></tr></thead>
        <tbody>{list.map((u) => { const s = stats[u._id]; return (
          <tr key={u._id} style={{ opacity: u.active ? 1 : 0.5 }}>
            <td><div className="who"><Avatar sm name={u.name} photo={u.profile && u.profile.photo} /><div><div className="n">{u.name}</div><div className="e">{u.email}</div></div></div></td>
            <td><span className={'pill ' + (u.role === 'leader' ? 'p-brand' : u.role === 'intern' ? 'p-grey' : 'p-blue')}>{u.role}</span></td>
            <td>{u.team?.name || '-'}</td><td>{projectsFor(u._id).join(', ') || '-'}</td><td><AttPill s={attendanceByUser.get(u._id)?.status} /></td><td className="muted">{u.college || '-'}</td>
            <td>{s ? `${s.done}/${s.tasks}` : '-'}</td><td>{s ? s.score : '-'}</td>
            <td style={{ whiteSpace: 'nowrap' }}><button className="btn ghost sm" onClick={() => setModal({ kind: 'profile', id: u._id })}>Profile</button> {u._id !== user._id && <><button className="btn ghost sm" onClick={() => reset(u)}>Reset password</button> <button className="btn ghost sm" onClick={() => toggle(u)}>{u.active ? 'Remove' : 'Restore'}</button></>}</td>
          </tr>); })}
          {!list.length && <tr><td colSpan="9"><Empty>{presentOnly ? 'No interns have checked in today.' : 'No interns found.'}</Empty></td></tr>}
        </tbody></table>
    </div>
    {modal?.kind === 'add' && (
      <Modal title="Add intern" okLabel="Create account" onClose={() => setModal(null)} onSubmit={add}>
        <div className="row2"><label className="f">Full name<input name="name" required /></label><label className="f">Email<input name="email" type="email" required /></label></div>
        <div className="row2"><label className="f">College<input name="college" /></label><label className="f">Phone<input name="phone" /></label></div>
        <div className="row2"><label className="f">Team<select name="team"><option value="">No team yet</option>{teams.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}</select></label>
          <label className="f">Role<select name="role">
                  <option value="intern">Intern</option>
                  <option value="leader">Team Leader</option>
                  {user.role === 'superadmin' && <option value="admin">Admin</option>}
                </select></label></div>
      </Modal>)}
    {modal?.kind === 'profile' && <ProfileModal userId={modal.id} onClose={() => { setModal(null); reload(); }} />}
    {modal?.kind === 'bulk' && <BulkImport teams={teams} onClose={() => setModal(null)} onDone={reload} />}
    {modal?.kind === 'cred' && (
      <Modal title="Login details" onClose={() => setModal(null)}>
        <p>Share these with <b>{modal.name}</b>. They'll be asked to change the password after logging in.</p>
        <div className="card" style={{ fontFamily: 'monospace' }}>Email: {modal.email}<br />Password: {modal.pw}</div>
        <button type="button" className="btn" onClick={() => { navigator.clipboard?.writeText(`InternHub login\nURL: ${location.origin}\nEmail: ${modal.email}\nPassword: ${modal.pw}`); toast('Copied'); }}>Copy</button>
      </Modal>)}
  </>);
}