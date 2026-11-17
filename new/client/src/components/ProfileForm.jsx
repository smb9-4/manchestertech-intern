import { useEffect, useState } from 'react';
import { api } from '../api';
import { useApp } from '../context';
import { Avatar, Bar, Loading } from './ui';

// [key, label, type, options]  - 'name' | 'phone' | 'college' live on the user, the rest in profile
export const SECTIONS = [
  ['Personal details', [['name', 'Full name *', 'text'], ['dob', 'Date of birth *', 'date'], ['gender', 'Gender *', 'select', ['Female', 'Male', 'Other', 'Prefer not to say']]]],
  ['Contact', [['phone', 'Phone *', 'tel'], ['altPhone', 'Alternate phone', 'tel'], ['personalEmail', 'Personal email', 'email'],
    ['addressLine', 'Address (house, street, area) *', 'textarea'], ['city', 'City *', 'text'], ['state', 'State *', 'text'], ['pincode', 'PIN code *', 'text']]],
  ['Education', [['college', 'College / University *', 'text'], ['degree', 'Degree * (e.g. B.Tech)', 'text'], ['branch', 'Branch * (e.g. CSE)', 'text'],
    ['yearOfStudy', 'Year of study *', 'select', ['1st year', '2nd year', '3rd year', '4th year', '5th year', 'Graduated']], ['rollNo', 'Roll / registration number', 'text'], ['gradYear', 'Graduation year', 'text']]],
  ['Emergency contact', [['emergencyName', 'Name *', 'text'], ['emergencyRelation', 'Relation (e.g. Father)', 'text'], ['emergencyPhone', 'Phone *', 'tel']]],
  ['Online & skills', [['linkedin', 'LinkedIn', 'url'], ['github', 'GitHub', 'url'], ['portfolio', 'Portfolio / website', 'url'],
    ['skills', 'Skills (comma separated)', 'textarea'], ['bio', 'About me', 'textarea']]],
  ['Internship', [['startDate', 'Start date', 'date'], ['endDate', 'End date', 'date']]],
];
const TOP = ['name', 'phone', 'college'];
const PRIVATE = ['Personal details', 'Contact', 'Emergency contact'];

const niceDate = (v) => (v ? new Date(v + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const ageOf = (v) => { if (!v) return ''; const d = new Date(v + 'T00:00'); const n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--; return a >= 0 ? ` (${a} yrs)` : ''; };

function valueOf(data, key) { return TOP.includes(key) ? (data.user[key] || '') : (data.profile[key] || ''); }

function Show({ k, type, v }) {
  if (!v) return <span className="muted">-</span>;
  if (type === 'date') return <span>{niceDate(v)}{k === 'dob' ? ageOf(v) : ''}</span>;
  if (type === 'url') return <a href={v} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>{v.replace(/^https?:\/\/(www\.)?/, '')}</a>;
  if (k === 'skills') return <span className="toolbar" style={{ gap: 6 }}>{v.split(',').map((s) => s.trim()).filter(Boolean).map((s) => <span key={s} className="pill p-brand">{s}</span>)}</span>;
  return <span style={{ whiteSpace: 'pre-wrap' }}>{v}</span>;
}

// data = response of /api/profile/...; editable = show inputs; adminMode = can edit internship dates
export function ProfileForm({ data, editable, adminMode, onSave, saveLabel = 'Save profile' }) {
  const init = () => { const f = {}; SECTIONS.forEach(([, fields]) => fields.forEach(([k]) => { f[k] = valueOf(data, k); })); return f; };
  const [form, setForm] = useState(init);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => setForm(init()), [data]); // eslint-disable-line

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    const body = { profile: {} };
    Object.entries(form).forEach(([k, v]) => { if (TOP.includes(k)) body[k] = v; else body.profile[k] = v; });
    try { await onSave(body); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const sections = SECTIONS.filter(([title, fields]) => !data.limited || !PRIVATE.includes(title) && fields.some(([k]) => k in data.profile || TOP.includes(k)));

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {sections.map(([title, fields]) => {
        const lockedSection = title === 'Internship' && !adminMode;
        return (
          <div className="card" key={title}>
            <h3>{title}{lockedSection && editable && <span className="small muted" style={{ fontWeight: 500 }}> - set by the admin</span>}</h3>
            <div className="pf-grid">
              {fields.filter(([k]) => !data.limited || k in data.profile || k === 'name' || k === 'college').map(([k, label, type, opts]) => {
                const canEdit = editable && !(lockedSection) && !(k === 'name' && false);
                const wide = type === 'textarea';
                return (
                  <label key={k} className={'f' + (wide ? ' pf-wide' : '')}><span>{label.replace(' *', '')}{label.includes('*') && editable && <b style={{ color: 'var(--red)' }}> *</b>}</span>
                    {canEdit ? (
                      type === 'select' ? <select value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}><option value="">Select...</option>{opts.map((o) => <option key={o}>{o}</option>)}</select>
                        : type === 'textarea' ? <textarea rows={k === 'addressLine' ? 2 : 3} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                          : <input type={type} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={type === 'url' ? 'https://' : ''} max={k === 'dob' ? new Date().toISOString().slice(0, 10) : undefined} />
                    ) : <div className="pf-val"><Show k={k} type={type} v={form[k]} /></div>}
                  </label>);
              })}
            </div>
          </div>);
      })}
      {editable && <div className="toolbar" style={{ position: 'sticky', bottom: 0, background: 'var(--bg)', padding: '10px 0' }}>
        {err && <div className="err" style={{ flex: 1 }}>{err}</div>}
        <span className="spacer" /><button className="btn" disabled={busy}>{busy ? 'Saving...' : saveLabel}</button></div>}
    </form>
  );
}

// Shrink a picked photo to a 320px square JPEG (small enough to store in the database)
function toSquareJpeg(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\//.test(file.type)) return reject(new Error('Please choose an image (JPG or PNG)'));
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.width, img.height); const c = document.createElement('canvas'); c.width = 320; c.height = 320;
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 320, 320);
      URL.revokeObjectURL(img.src); resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => reject(new Error('Could not read that image'));
    img.src = URL.createObjectURL(file);
  });
}

export function ProfileHeader({ data, onPhoto }) {
  const u = data.user;
  const { toast } = useApp();
  const photo = data.profile && data.profile.photo;
  const pick = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { await onPhoto(await toSquareJpeg(f)); } catch (x) { toast(x.message); }
  };
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <div className="pf-photo">
        {photo ? <img src={photo} alt={u.name} /> : <div style={{ transform: 'scale(2)' }}><Avatar name={u.name} /></div>}
        {onPhoto && <label className="pf-photo-btn">{photo ? 'Change' : 'Add photo'}<input type="file" accept="image/*" hidden onChange={pick} /></label>}
      </div>
      {onPhoto && photo && <button type="button" className="small muted" style={{ alignSelf: 'flex-end' }} onClick={() => onPhoto('')}>Remove photo</button>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{u.name}</div>
        <div className="small muted">{u.email} - {u.role === 'leader' ? 'Team Leader' : u.role === 'intern' ? 'Intern' : 'Admin'}{u.team ? ' - ' + u.team.name : ''}{u.college ? ' - ' + u.college : ''}</div>
      </div>
      {!data.limited && <div style={{ width: 200 }}>
        <div className="small" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Profile complete</span><b>{data.completeness}%</b></div>
        <div style={{ marginTop: 6 }}><Bar pct={data.completeness} /></div>
      </div>}
    </div>
  );
}

// Admin / leader: view someone else's profile (admin can edit)
export function ProfileModal({ userId, onClose }) {
  const { isAdmin, toast } = useApp();
  const [data, setData] = useState(null);
  const [edit, setEdit] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { api('/profile/' + userId).then(setData).catch((e) => setErr(e.message)); }, [userId]);
  const save = async (body) => { const d = await api('/profile/' + userId, { method: 'PUT', body }); setData(d); setEdit(false); toast('Profile saved'); };
  return (
    <div className="overlay open" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 860, background: 'var(--bg)' }}>
        <header style={{ background: 'var(--panel)' }}>Intern profile
          {isAdmin && data && <button type="button" className="btn ghost sm" style={{ marginLeft: 'auto', marginRight: 10, fontSize: 12, color: 'var(--ink)' }} onClick={() => setEdit(!edit)}>{edit ? 'Cancel edit' : 'Edit'}</button>}
          <button type="button" onClick={onClose} style={isAdmin && data ? { marginLeft: 0 } : undefined}>&times;</button></header>
        <div className="body">
          {err ? <div className="err">{err}</div> : !data ? <Loading /> : <>
            <ProfileHeader data={data} onPhoto={edit ? async (photo) => { const d = await api('/profile/' + userId, { method: 'PUT', body: { profile: { photo } } }); setData(d); toast('Photo saved'); } : undefined} />
            {data.limited && <div className="demo-note">You can see education, skills and links. Personal details are visible only to the intern and admins.</div>}
            <ProfileForm data={data} editable={edit} adminMode={isAdmin} onSave={save} saveLabel="Save changes" />
          </>}
        </div>
      </div>
    </div>
  );
}