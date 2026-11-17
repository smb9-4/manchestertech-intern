import { useEffect, useState } from 'react';
import { api, download } from '../api';
import { useApp } from '../context';
import { Avatar, Loading, Empty } from '../components/ui';

const ACTIONS = {
  'auth.login': ['Logged in', 'p-grey'], 'auth.login_failed': ['Failed login', 'p-red'], 'auth.login_blocked': ['Blocked login', 'p-red'],
  'auth.password_change': ['Changed password', 'p-grey'],
  'user.create': ['Added person', 'p-green'], 'user.bulk_create': ['Bulk added', 'p-green'], 'user.update': ['Updated person', 'p-blue'], 'user.remove': ['Removed access', 'p-red'], 'user.restore': ['Restored access', 'p-green'], 'user.password_reset': ['Reset password', 'p-amber'],
  'team.create': ['Created team', 'p-green'], 'team.update': ['Updated team', 'p-blue'], 'team.delete': ['Deleted team', 'p-red'],
  'project.create': ['Created project', 'p-green'], 'project.update': ['Updated project', 'p-blue'], 'project.delete': ['Deleted project', 'p-red'],
  'task.create': ['Assigned task', 'p-green'], 'task.start': ['Started task', 'p-grey'], 'task.submit': ['Submitted task', 'p-amber'],
  'task.approve': ['Approved task', 'p-green'], 'task.reject': ['Rejected task', 'p-red'], 'task.update': ['Edited task', 'p-blue'], 'task.delete': ['Deleted task', 'p-red'],
  'attendance.check_in': ['Checked in', 'p-grey'], 'attendance.check_out': ['Checked out', 'p-grey'], 'attendance.mark': ['Marked attendance', 'p-amber'], 'attendance.remind': ['Sent reminder', 'p-grey'],
  'meeting.create': ['Scheduled meeting', 'p-green'], 'meeting.update': ['Edited meeting', 'p-blue'], 'meeting.delete': ['Cancelled meeting', 'p-red'],
  'document.upload': ['Uploaded file', 'p-green'], 'document.delete': ['Deleted file', 'p-red'],
  'chat.announcement': ['Announcement', 'p-brand'], 'worklog.submit': ['Work update', 'p-blue'], 'worklog.review': ['Reviewed update', 'p-green'], 'chat.pin': ['Pinned notice', 'p-brand'], 'auth.password_reset_link': ['Reset via email', 'p-amber'],
};
const CATS = [['', 'All activity'], ['auth', 'Logins & passwords'], ['user', 'People'], ['team', 'Teams'], ['project', 'Projects'], ['task', 'Tasks'], ['attendance', 'Attendance'], ['meeting', 'Meetings'], ['document', 'Documents'], ['chat', 'Announcements']];

export default function Audit() {
  const { toast } = useApp();
  const [f, setF] = useState({ q: '', category: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const qs = (p) => '?' + new URLSearchParams(Object.fromEntries(Object.entries({ ...f, page: p }).filter(([, v]) => v))).toString();

  useEffect(() => {
    const t = setTimeout(() => api('/audit' + qs(page)).then(setData).catch((e) => toast(e.message)), 250);
    return () => clearTimeout(t);
  }, [f, page]); // eslint-disable-line
  const set = (k, v) => { setF({ ...f, [k]: v }); setPage(1); };

  return (<>
    <div className="toolbar">
      <input className="search" placeholder="Search person, task, file..." value={f.q} onChange={(e) => set('q', e.target.value)} />
      <select className="search" style={{ minWidth: 170 }} value={f.category} onChange={(e) => set('category', e.target.value)}>{CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      <label className="small muted">From <input type="date" className="search" style={{ minWidth: 'auto' }} value={f.from} onChange={(e) => set('from', e.target.value)} /></label>
      <label className="small muted">To <input type="date" className="search" style={{ minWidth: 'auto' }} value={f.to} onChange={(e) => set('to', e.target.value)} /></label>
      <div className="spacer" />
      <button className="btn ghost" onClick={() => download('/audit/export.csv' + qs(1), 'audit-log.csv').catch((e) => toast(e.message))}>Download CSV</button>
    </div>
    {!data ? <Loading /> : (
      <div className="card" style={{ padding: '6px 8px', overflowX: 'auto' }}>
        <h3 style={{ padding: '10px 10px 0' }}>Activity<span className="spacer" /><span className="small muted">{data.total} record(s)</span></h3>
        {data.items.length ? <table><thead><tr><th>When</th><th>Who</th><th>Action</th><th>On</th><th>Details</th><th>IP</th></tr></thead>
          <tbody>{data.items.map((i) => { const [label, cls] = ACTIONS[i.action] || [i.action, 'p-grey']; return (
            <tr key={i._id}>
              <td style={{ whiteSpace: 'nowrap' }}>{new Date(i.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
              <td><div className="who"><Avatar sm name={i.actorName} /><div><div className="n">{i.actorName}</div><div className="e">{i.role || '-'}</div></div></div></td>
              <td><span className={'pill ' + cls}>{label}</span></td>
              <td><b>{i.target}</b></td>
              <td className="muted" style={{ maxWidth: 320 }}>{i.details}</td>
              <td className="small muted">{i.ip}</td>
            </tr>); })}</tbody></table> : <Empty>No activity matches these filters</Empty>}
        {data.pages > 1 && <div className="toolbar" style={{ padding: 10 }}>
          <button className="btn ghost sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>&larr; Newer</button>
          <span className="small muted">Page {data.page} of {data.pages}</span>
          <button className="btn ghost sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Older &rarr;</button></div>}
      </div>)}
  </>);
}