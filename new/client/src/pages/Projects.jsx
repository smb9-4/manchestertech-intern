import { useState } from 'react';
import { api } from '../api';
import { useApp } from '../context';
import { useApi, Loading, Modal, Bar, Empty, fmtDate } from '../components/ui';

export default function Projects() {
  const { isAdmin, isIntern, toast } = useApp();
  const [projects, reload] = useApi('/projects');
  const [teams] = useApi('/teams');
  const [modal, setModal] = useState(false);
  if (!projects || !teams) return <Loading />;
  const patch = async (p, body) => { try { await api('/projects/' + p._id, { method: 'PATCH', body }); reload(); } catch (e) { toast(e.message); } };
  const create = async (fd) => {
    const body = Object.fromEntries(fd);
    if (!body.due) delete body.due;
    await api('/projects', { method: 'POST', body });
    setModal(false); reload(); toast('Project created');
  };
  return (<>
    {isAdmin && <div className="toolbar"><div className="spacer" /><button className="btn" onClick={() => setModal(true)}>+ New project</button></div>}
    {!projects.length && <div className="card"><Empty>No projects yet{isAdmin ? '. Create one and assign it to a team.' : '.'}</Empty></div>}
    <div className="grid g2">{projects.map((p) => (
      <div className="card" key={p._id}>
        <h3>{p.name}<span className="spacer" />
          {isIntern ? <span className={'pill ' + (p.status === 'At risk' ? 'p-red' : 'p-green')}>{p.status}</span> :
            <select className="search" style={{ minWidth: 'auto', padding: '4px 8px', fontSize: 12 }} value={p.status} onChange={(e) => patch(p, { status: e.target.value })}>
              {['On track', 'At risk', 'Completed'].map((s) => <option key={s}>{s}</option>)}</select>}</h3>
        <p className="muted" style={{ marginBottom: 12 }}>{p.description || 'No description'}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between' }} className="small"><span>Progress</span><b>{p.progress}%</b></div>
        <div style={{ margin: '6px 0 14px' }}><Bar pct={p.progress} /></div>
        <div className="grid g3" style={{ gap: 10, marginBottom: 12 }}>
          <div><div className="small muted">Team</div><b>{p.team?.name}</b></div>
          <div><div className="small muted">Deadline</div><b>{fmtDate(p.due)}</b></div>
          <div><div className="small muted">Tasks</div><b>{p.doneCount}/{p.taskCount} done</b></div></div>
        {!isIntern && <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span className="small muted">Update progress:</span>
          <input type="range" min="0" max="100" step="5" defaultValue={p.progress} onMouseUp={(e) => patch(p, { progress: +e.target.value })} onTouchEnd={(e) => patch(p, { progress: +e.target.value })} style={{ flex: 1 }} /></div>}
      </div>))}</div>
    {modal && <Modal title="New project" okLabel="Create" onClose={() => setModal(false)} onSubmit={create}>
      <label className="f">Project name<input name="name" required /></label>
      <label className="f">Description<textarea name="description" rows="3" /></label>
      <div className="row2"><label className="f">Team<select name="team" required>{teams.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}</select></label>
        <label className="f">Deadline<input name="due" type="date" /></label></div></Modal>}
  </>);
}
