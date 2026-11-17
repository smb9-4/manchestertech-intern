import { useEffect, useState } from 'react';
import Icon from './Icon';

const COLORS = ['#3a3122', '#2a3530', '#2c3140', '#3a2c33', '#33302a', '#24343a', '#3a3428', '#302b3a', '#3b2f26', '#283a32'];
const hash = (s = '') => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
export const initials = (n = '?') => n.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();

export const Avatar = ({ name, sm, photo }) => photo ? <img className={'av' + (sm ? ' sm' : '')} src={photo} alt={name} style={{ objectFit: 'cover' }} /> : (
  <div className={'av' + (sm ? ' sm' : '')} style={{ background: COLORS[hash(name) % COLORS.length] }}>{initials(name)}</div>
);

export const STATUS = { todo: ['To do', 'p-grey'], inprogress: ['In progress', 'p-blue'], submitted: ['Submitted', 'p-amber'], approved: ['Approved', 'p-green'], rejected: ['Needs rework', 'p-red'] };
export const StatusPill = ({ s }) => <span className={'pill ' + STATUS[s][1]}>{STATUS[s][0]}</span>;
export const PrioPill = ({ p }) => <span className={'pill ' + (p === 'High' ? 'p-red' : p === 'Medium' ? 'p-amber' : 'p-grey')}>{p}</span>;
export const AttPill = ({ s }) => {
  if (!s) return <span className="pill p-grey">● Not in</span>;
  return { present: <span className="pill p-green">● Present</span>, late: <span className="pill p-amber">● Late</span>, absent: <span className="pill p-red">● Absent</span> }[s];
};
export const Stat = ({ k, v, d, icon, bg, onClick }) => (
  <div className={'card stat' + (onClick ? ' stat-clickable' : '')} onClick={onClick}
    role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}>
    <div className="icon"><Icon e={icon} size={20} /></div><div className="k">{k}</div><div className="v">{v}</div><div className="d">{d}</div>
  </div>
);
export const Bar = ({ pct }) => <div className="bar"><i style={{ width: Math.max(0, Math.min(100, pct)) + '%' }} /></div>;
export const Empty = ({ children }) => <div className="empty">{children}</div>;
export const Loading = ({ full, text }) => (
  <div className={full ? 'mt-loader full' : 'mt-loader'} role="status" aria-label="Loading">
    <div className="mt-spin"><i /><img src="/icon-192.png" alt="" /></div>
    {full ? <div className="mt-load-word">Manchester<b>Tech</b></div> : null}
    <div className="mt-load-text">{text || (full ? 'Getting your portal ready' : 'Loading')}<span className="mt-dots"><b>.</b><b>.</b><b>.</b></span></div>
  </div>
);

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—');
export const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—');
export const daysLeft = (d) => { if (!d) return null; const a = new Date(); a.setHours(0, 0, 0, 0); const b = new Date(d); b.setHours(0, 0, 0, 0); return Math.round((b - a) / 864e5); };
export const DueText = ({ due, done }) => {
  const dl = daysLeft(due);
  if (dl === null) return <span>No due date</span>;
  if (done) return <span>📅 {fmtDate(due)}</span>;
  if (dl < 0) return <b style={{ color: 'var(--red)' }}>overdue {-dl}d</b>;
  if (dl === 0) return <b style={{ color: 'var(--amber)' }}>due today</b>;
  return <span>due in {dl}d</span>;
};
export const fileSize = (b) => (b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB');

export function Modal({ title, onClose, onSubmit, okLabel = 'Save', danger, children }) {
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { const h = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await onSubmit(new FormData(e.target)); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="overlay open" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <header>{title}<button type="button" onClick={onClose}>✕</button></header>
        <form onSubmit={submit}>
          <div className="body">{children}{err && <div className="err">{err}</div>}</div>
          {onSubmit && <footer><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className={'btn' + (danger ? ' red' : '')} disabled={busy}>{busy ? 'Saving…' : okLabel}</button></footer>}
        </form>
      </div>
    </div>
  );
}

// Small hook: load data from the API and reload on demand
import { api } from '../api';
export function useApi(path, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = () => { if (!path) return; api(path).then(setData).catch((e) => setError(e.message)); };
  useEffect(load, [path, ...deps]);
  return [data, load, error, setData];
}
