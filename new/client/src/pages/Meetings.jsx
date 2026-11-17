import { useState } from 'react';
import { api } from '../api';
import { useApp } from '../context';
import { useApi, Loading, Modal, Empty, fmtTime } from '../components/ui';

export default function Meetings() {
  const { isAdmin, isIntern, toast } = useApp();
  const [meetings, reload] = useApi('/meetings');
  const [teams] = useApi('/teams');
  const [gs] = useApi('/meetings/google-status');
  const [modal, setModal] = useState(null);
  if (!meetings || !teams || !gs) return <Loading />;
  const cutoff = Date.now() - 2 * 3600e3;
  const up = meetings.filter((m) => new Date(m.start) >= cutoff);
  const past = meetings.filter((m) => new Date(m.start) < cutoff).reverse();

  const create = async (fd) => {
    const b = Object.fromEntries(fd);
    b.start = new Date(`${b.date}T${b.time}`).toISOString();
    const r = await api('/meetings', { method: 'POST', body: b });
    setModal(null); reload(); toast(r.warning || 'Meeting scheduled; everyone notified');
  };
  const saveLink = async (fd) => { await api('/meetings/' + modal.m._id, { method: 'PATCH', body: Object.fromEntries(fd) }); setModal(null); reload(); toast('Saved'); };
  const remove = async (m) => { await api('/meetings/' + m._id, { method: 'DELETE' }); reload(); toast('Meeting cancelled'); };

  return (<>
    <div className="toolbar">
      {!isIntern && !gs.enabled && <div className="demo-note">Google Calendar isn’t connected yet, so paste a Meet link when scheduling. Connect it (see README) and links are created automatically.</div>}
      {!isIntern && gs.enabled && <div className="demo-note" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>Google Calendar connected: Meet links and invites are created automatically.</div>}
      <div className="spacer" />{!isIntern && <button className="btn" onClick={() => setModal({ kind: 'new' })}>+ Schedule meeting</button>}
    </div>
    {!up.length && <div className="card"><Empty>No upcoming meetings</Empty></div>}
    <div className="grid g2">{up.map((m) => { const d = new Date(m.start); return (
      <div className="card" key={m._id}><div style={{ display: 'flex', gap: 14 }}>
        <div className="date-chip" style={{ width: 56 }}><b style={{ fontSize: 22 }}>{d.getDate()}</b><span>{d.toLocaleDateString('en', { month: 'short' })}</span></div>
        <div style={{ flex: 1, minWidth: 0 }}><h3 style={{ marginBottom: 4 }}>{m.title}</h3>
          <div className="small muted">{d.toLocaleDateString('en-IN', { weekday: 'long' })} · {fmtTime(m.start)} · {m.duration} min · {m.team ? m.team.name : 'Everyone'}</div>
          {m.agenda && <p style={{ margin: '10px 0' }}>{m.agenda}</p>}
          <div className="small" style={{ margin: '8px 0 12px', wordBreak: 'break-all' }}>🔗 {m.link ? <a href={m.link} target="_blank" rel="noreferrer">{m.link}</a> : <span className="muted">No link yet</span>}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {m.link && <a className="btn sm" href={m.link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>📹 Join</a>}
            {!isIntern && <button className="btn ghost sm" onClick={() => setModal({ kind: 'edit', m })}>{m.link ? 'Edit' : 'Add link'}</button>}
            {!isIntern && <button className="btn ghost sm" onClick={() => remove(m)}>Cancel meeting</button>}
          </div></div></div></div>); })}</div>
    {past.length > 0 && <div className="card"><h3>Past meetings</h3><div className="list">{past.map((m) => (
      <div className="li" key={m._id}><div className="grow"><div className="t">{m.title}</div><div className="s">{new Date(m.start).toLocaleDateString('en-IN', { dateStyle: 'medium' })} · {m.notes ? m.notes : 'No notes'}</div></div>
        {!isIntern && <button className="btn ghost sm" onClick={() => setModal({ kind: 'edit', m })}>Notes</button>}</div>))}</div></div>}

    {modal?.kind === 'new' && <Modal title="Schedule meeting" okLabel="Schedule" onClose={() => setModal(null)} onSubmit={create}>
      <label className="f">Title<input name="title" required placeholder="Sprint planning" /></label>
      <div className="row2"><label className="f">Date<input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label><label className="f">Time<input name="time" type="time" required defaultValue="11:00" /></label></div>
      <div className="row2">
        <label className="f">Participants<select name="team">{isAdmin && <option value="">Everyone</option>}{teams.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}</select></label>
        <label className="f">Duration (min)<select name="duration" defaultValue="30"><option>15</option><option>30</option><option>45</option><option>60</option><option>90</option></select></label></div>
      <label className="f">Agenda<textarea name="agenda" rows="2" /></label>
      {!gs.enabled && <label className="f">Google Meet link<input name="link" placeholder="https://meet.google.com/abc-defg-hij" /></label>}
    </Modal>}
    {modal?.kind === 'edit' && <Modal title={modal.m.title} okLabel="Save" onClose={() => setModal(null)} onSubmit={saveLink}>
      <label className="f">Meet link<input name="link" defaultValue={modal.m.link} /></label>
      <label className="f">Meeting notes<textarea name="notes" rows="4" defaultValue={modal.m.notes} /></label></Modal>}
  </>);
}
