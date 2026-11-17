import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';

const STYLE = {
  info: { background: 'var(--blue-soft)', color: 'var(--blue)', border: '1px solid #bfe3f5' },
  warning: { background: 'var(--amber-soft)', color: '#92400e', border: '1px solid #fcd9a6' },
  urgent: { background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid #f8c4c0' },
};
const ICON = { info: 'i', warning: '!', urgent: '!!' };
const getHidden = () => { try { return JSON.parse(localStorage.getItem('ih_hidden_notices') || '[]'); } catch { return []; } };

export default function Banner() {
  const loc = useLocation();
  const [list, setList] = useState([]);
  const [hidden, setHidden] = useState(getHidden);
  useEffect(() => { api('/announcements').then(setList).catch(() => {}); }, [loc.pathname]);

  const hide = (id) => {
    const h = [...hidden, id]; setHidden(h);
    try { localStorage.setItem('ih_hidden_notices', JSON.stringify(h.slice(-50))); } catch { /* ignore */ }
  };
  const shown = list.filter((a) => a.level === 'urgent' || !hidden.includes(a._id));
  if (!shown.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {shown.map((a) => (
        <div key={a._id} style={{ ...STYLE[a.level], borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <b style={{ minWidth: 22, height: 22, borderRadius: 11, background: 'currentColor', display: 'grid', placeItems: 'center' }}><span style={{ color: '#fff', fontSize: 11 }}>{ICON[a.level]}</span></b>
          <div style={{ flex: 1, fontWeight: 600 }}>{a.text}<span className="small" style={{ fontWeight: 400, opacity: 0.8 }}> - {a.createdBy ? a.createdBy.name : 'Admin'}</span></div>
          {a.level !== 'urgent' && <button className="small" style={{ fontWeight: 700 }} onClick={() => hide(a._id)} title="Hide">&times;</button>}
        </div>))}
    </div>
  );
}