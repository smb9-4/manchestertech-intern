import { useState } from 'react';
import { api } from '../api';
import { useApp } from '../context';
import { useApi, Loading, Empty, fmtDate } from '../components/ui';

const LEVELS = [['info', 'Info (blue)'], ['warning', 'Important (orange)'], ['urgent', 'Urgent (red, cannot be hidden)']];

export default function Notices() {
  const { toast } = useApp();
  const [list, reload] = useApi('/announcements/all');
  const [form, setForm] = useState({ text: '', level: 'info', expires: '', email: false });
  const [busy, setBusy] = useState(false);
  if (!list) return <Loading />;

  const post = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api('/announcements', { method: 'POST', body: form }); setForm({ text: '', level: 'info', expires: '', email: false }); reload(); toast(form.email ? 'Pinned and emailed to everyone' : 'Pinned for everyone'); }
    catch (x) { toast(x.message); } finally { setBusy(false); }
  };
  const toggle = async (a) => { await api('/announcements/' + a._id, { method: 'PATCH', body: { active: !a.active } }); reload(); };
  const remove = async (a) => { await api('/announcements/' + a._id, { method: 'DELETE' }); reload(); toast('Deleted'); };
  const expired = (a) => a.expires && new Date(a.expires) < new Date();

  return (<>
    <form className="card" onSubmit={post} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3>Pin a new announcement</h3>
      <label className="f">Message (shown at the top of every page for everyone)<textarea rows={2} maxLength={500} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} required placeholder="e.g. Office closed on Monday for Diwali" /></label>
      <div className="row2">
        <label className="f">Type<select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>{LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className="f">Show until (optional)<input type="date" value={form.expires} onChange={(e) => setForm({ ...form, expires: e.target.value })} /></label>
      </div>
      <label className="small"><input type="checkbox" checked={form.email} onChange={(e) => setForm({ ...form, email: e.target.checked })} /> Also email it to everyone</label>
      <div><button className="btn" disabled={busy}>{busy ? 'Pinning...' : 'Pin announcement'}</button></div>
    </form>
    <div className="card"><h3>All announcements</h3>
      {list.length ? <div className="list">{list.map((a) => (
        <div className="li" key={a._id} style={{ opacity: a.active && !expired(a) ? 1 : 0.55 }}>
          <span className={'pill ' + (a.level === 'urgent' ? 'p-red' : a.level === 'warning' ? 'p-amber' : 'p-blue')}>{a.level}</span>
          <div className="grow"><div className="t">{a.text}</div><div className="s">{a.createdBy ? a.createdBy.name : ''} - {fmtDate(a.createdAt)}{a.expires ? ' - until ' + fmtDate(a.expires) : ''}{!a.active ? ' - hidden' : expired(a) ? ' - expired' : ' - showing'}</div></div>
          <button className="btn ghost sm" onClick={() => toggle(a)}>{a.active ? 'Hide' : 'Show again'}</button>
          <button className="btn ghost sm" onClick={() => remove(a)}>Delete</button>
        </div>))}</div> : <Empty>No announcements yet</Empty>}
    </div>
  </>);
}