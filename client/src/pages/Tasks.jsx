import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, download } from '../api';
import { useApp } from '../context';
import { useApi, Loading, Modal, Avatar, PrioPill, STATUS, DueText, Bar } from '../components/ui';
import TaskComments from '../components/TaskComments';
import TaskTimeline from '../components/TaskTimeline';

const COLS = ['todo', 'inprogress', 'submitted', 'rejected', 'approved'];

export default function Tasks() {
  const { isIntern, user, toast } = useApp();
  const { isLeader } = useApp();
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, reload] = useApi('/tasks');
  const [counts, reloadCounts] = useApi('/task-comments/counts');
  const [projects] = useApi('/projects');
  const [users] = useApi(isIntern ? null : '/users');
  const [teams] = useApi(isIntern ? null : '/teams');
  const [report] = useApi(isIntern ? null : '/reports');
  const [modal, setModal] = useState(null);
  // Leaders jump straight to their team view
  const leaderTeamId = isLeader && user.team ? (user.team._id || user.team) : null;
  const rawTeamId = searchParams.get('team');
  const teamId = isLeader && !rawTeamId && leaderTeamId ? String(leaderTeamId) : rawTeamId;
  const submittedOnly = searchParams.get('status') === 'submitted';
  if (!tasks || !projects || (!isIntern && (!users || !teams || !report))) return <Loading />;

  const set = async (t, body, msg) => { try { await api('/tasks/' + t._id, { method: 'PATCH', body }); reload(); toast(msg); } catch (e) { toast(e.message); } };
  const create = async (fd) => {
    const body = Object.fromEntries(fd);
    if (!body.due) delete body.due;
    await api('/tasks', { method: 'POST', body });
    setModal(null); reload(); toast('Task assigned');
  };
  const submit = async (fd) => {
    let file = null;
    const f = fd.get('file');
    if (f && f.size) {
      const up = new FormData(); up.append('file', f); up.append('category', 'Submission');
      file = (await api('/documents', { method: 'POST', form: up }))._id;
    }
    await api('/tasks/' + modal.task._id, { method: 'PATCH', body: { status: 'submitted', note: fd.get('note'), file } });
    setModal(null); reload(); toast('Submitted for review');
  };
  const review = async (fd) => { await api('/tasks/' + modal.task._id, { method: 'PATCH', body: { status: modal.kind, feedback: fd.get('feedback') } }); setModal(null); reload(); toast(modal.kind === 'approved' ? 'Approved ✓' : 'Sent back'); };
  const teamRows = isIntern ? [] : teams.map((team) => {
    const teamTasks = tasks.filter((task) => String(task.team) === team._id);
    const done = teamTasks.filter((task) => task.status === 'approved').length;
    const members = report.rows.filter((row) => row.user.team?._id === team._id);
    const teamProjects = projects.filter((project) => project.team?._id === team._id);
    return { team, teamTasks, done, members, projects: teamProjects, progress: teamTasks.length ? Math.round((done / teamTasks.length) * 100) : 0 };
  });
  const selectedTeam = teamRows.find((row) => row.team._id === teamId);
  const chooseTeam = (id) => setSearchParams({ team: id });
  const clearTeam = () => setSearchParams(submittedOnly ? { status: 'submitted' } : {});
  const shownTasks = selectedTeam ? selectedTeam.teamTasks : tasks;
  const shown = submittedOnly ? shownTasks.filter((task) => task.status === 'submitted') : shownTasks;
  const teamProjects = selectedTeam ? selectedTeam.projects : projects;
  const showTeamOverview = !isIntern && !submittedOnly && !selectedTeam && !isLeader;
  const showBoard = isIntern || submittedOnly || Boolean(selectedTeam);

  return (<>
    {showTeamOverview && <>
      <div className="toolbar"><span className="muted">Choose a team to see its project progress and dated task updates.</span></div>
      {teamRows.length ? <div className="grid g2" id="team-task-progress">{teamRows.map((row) => (
        <button type="button" className="card team-summary-card" key={row.team._id} onClick={() => chooseTeam(row.team._id)}
          aria-label={`View ${row.team.name} tasks`}>
          <div className="team-summary-heading">
            <span className="team-color-dot" style={{ background: row.team.color }} />
            <h3>{row.team.name}</h3>
            <span className="team-summary-percent">{row.progress}%</span>
          </div>
          {row.projects.length ? row.projects.map((project) => <div className="team-project-summary" key={project._id}>
            <b>{project.name}</b>
            <p className="small muted">{project.description || 'No project description yet.'}</p>
          </div>) : <div className="team-project-summary"><b>No project assigned</b><p className="small muted">Project description unavailable.</p></div>}
          <div className="team-summary-progress">
            <div className="small muted">{row.done}/{row.teamTasks.length} tasks completed · {row.members.length} members</div>
            <Bar pct={row.progress} />
          </div>
        </button>
      ))}</div> : <div className="card"><div className="empty">No teams created yet.</div></div>}
    </>}
    {selectedTeam && <>
      <div className="toolbar">
        {!isLeader && <button className="btn ghost" onClick={clearTeam}>← All teams</button>}
        <div className="spacer" />
        <button className="btn" onClick={() => setModal({ kind: 'new' })}>+ Assign task</button>
      </div>
      <section className="card">
        <div className="team-summary-heading">
          <span className="team-color-dot" style={{ background: selectedTeam.team.color }} />
          <h2>{selectedTeam.team.name}</h2>
          <span className="team-summary-percent">{selectedTeam.progress}%</span>
        </div>
        <div className="team-summary-progress">
          <div className="small muted">{selectedTeam.done}/{selectedTeam.teamTasks.length} tasks completed · overall team progress</div>
          <Bar pct={selectedTeam.progress} />
        </div>
        <div className="team-project-details">
          <h3>Project{selectedTeam.projects.length === 1 ? '' : 's'}</h3>
          {selectedTeam.projects.length ? selectedTeam.projects.map((project) => <article className="team-project-detail" key={project._id}>
            <h4>{project.name}</h4>
            <p className="muted">{project.description || 'No project description yet.'}</p>
          </article>) : <p className="muted">No project has been assigned to this team yet.</p>}
        </div>
        <div className="team-project-details">
          <h3>Task progress by date</h3>
          {selectedTeam.teamTasks.length
            ? <TaskTimeline tasks={selectedTeam.teamTasks} showAssignee />
            : <div className="empty">No tasks have been assigned to this team yet.</div>}
        </div>
      </section>
    </>}
    {submittedOnly && !selectedTeam && <div className="toolbar">
      <span className="muted">Submissions waiting for review.</span><div className="spacer" />
      <button className="btn ghost" onClick={() => nav('/tasks')}>All tasks</button>
    </div>}
    {isIntern && <div className="toolbar"><span className="muted">Start a task, then submit your work for review.</span></div>}
    {showBoard && <details className={selectedTeam ? 'card task-board-disclosure' : undefined} open={!selectedTeam}>
      {selectedTeam && <summary>Manage task submissions</summary>}
      <div className="kanban">{(submittedOnly ? ['submitted'] : COLS).map((c) => { const l = shown.filter((t) => t.status === c); return (
      <div className="col" key={c}><h4>{STATUS[c][0]}<span>{l.length}</span></h4>
        {l.map((t) => { const mine = t.assignee?._id === user._id; return (
          <div className="tcard" key={t._id}>
            <div className="t">{t.title}</div>
            <div className="meta"><PrioPill p={t.priority} /><DueText due={t.due} done={c === 'approved'} /></div>
            {!isIntern && <div className="meta" style={{ marginTop: 8 }}><Avatar sm name={t.assignee?.name} /><span>{t.assignee?.name}</span></div>}
            <div className="small muted" style={{ marginTop: 6 }}>{t.project?.name}</div>
            {t.description && <div className="small" style={{ marginTop: 6 }}>{t.description}</div>}
            {t.submission?.note && c !== 'todo' && <div className="small" style={{ marginTop: 6 }}>📝 {t.submission.note}</div>}
            {t.submission?.file && <button className="small" style={{ marginTop: 6, color: 'var(--brand)' }} onClick={() => download(`/documents/${t.submission.file._id}/download`, t.submission.file.name).catch((e) => toast(e.message))}>📎 {t.submission.file.name}</button>}
            {t.feedback && <div className="small" style={{ marginTop: 6, color: c === 'rejected' ? 'var(--red)' : 'var(--green)' }}>💬 {t.feedback}</div>}
            <div className="acts">
              <button className="btn ghost sm" onClick={() => setModal({ kind: 'comments', task: t })}>Comments{(counts || {})[t._id] ? ' (' + counts[t._id] + ')' : ''}</button>
              {mine && c === 'todo' && <button className="btn sm" onClick={() => set(t, { status: 'inprogress' }, 'Started')}>Start</button>}
              {mine && (c === 'inprogress' || c === 'rejected') && <button className="btn sm" onClick={() => setModal({ kind: 'submit', task: t })}>Submit work</button>}
              {!isIntern && !mine && c === 'submitted' && <><button className="btn green sm" onClick={() => setModal({ kind: 'approved', task: t })}>Approve</button><button className="btn ghost sm" onClick={() => setModal({ kind: 'rejected', task: t })}>Reject</button></>}
              {!isIntern && c !== 'approved' && <button className="btn ghost sm" onClick={async () => { await api('/tasks/' + t._id, { method: 'DELETE' }); reload(); }}>Delete</button>}
            </div>
          </div>); })}
        {!l.length && <div className="empty small">Nothing here</div>}
      </div>); })}</div>
    </details>}

    {modal?.kind === 'comments' && <TaskComments task={modal.task} onClose={() => { setModal(null); reloadCounts(); }} />}
    {modal?.kind === 'new' && <NewTask projects={teamProjects} users={users} onClose={() => setModal(null)} onSubmit={create} />}
    {modal?.kind === 'submit' && <Modal title={'Submit: ' + modal.task.title} okLabel="Submit for review" onClose={() => setModal(null)} onSubmit={submit}>
      <label className="f">Attach file (optional)<input name="file" type="file" /></label>
      <label className="f">Note to reviewer<textarea name="note" rows="3" placeholder="What did you do? Link to your repo?" /></label></Modal>}
    {(modal?.kind === 'approved' || modal?.kind === 'rejected') && <Modal title={(modal.kind === 'approved' ? 'Approve: ' : 'Send back: ') + modal.task.title} okLabel={modal.kind === 'approved' ? 'Approve' : 'Send feedback'} onClose={() => setModal(null)} onSubmit={review}>
      <label className="f">{modal.kind === 'approved' ? 'Comment (optional)' : 'What needs to change?'}<textarea name="feedback" rows="3" required={modal.kind === 'rejected'} /></label></Modal>}
  </>);
}

function NewTask({ projects, users, onClose, onSubmit }) {
  const nav = useNavigate();
  const [project, setProject] = useState(projects[0]?._id);
  const team = projects.find((p) => p._id === project)?.team?._id;
  const people = users.filter((u) => u.team?._id === team && ['intern', 'leader'].includes(u.role));
  const proj = projects.find((p) => p._id === project);
  if (!projects.length) return <Modal title="Assign task" okLabel="Go to Projects" onClose={onClose} onSubmit={async () => nav('/projects')}><p>There are no projects yet.</p><p className="muted">Every task belongs to a project. Create a team, add people to it, then create a project for that team. After that you can assign tasks here.</p></Modal>;
  const check = async (fd) => { if (!people.length) throw new Error('Nobody is in ' + (proj?.team?.name || 'this team') + ' yet. Add interns or a leader to that team on the Interns page first.'); return onSubmit(fd); };
  return <Modal title="Assign task" okLabel="Assign" onClose={onClose} onSubmit={check}>
    <label className="f">Task title<input name="title" required /></label>
    <label className="f">Details<textarea name="description" rows="2" /></label>
    <div className="row2"><label className="f">Project<select name="project" value={project} onChange={(e) => setProject(e.target.value)}>{projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select></label>
      <label className="f">Assign to<select name="assignee">{people.length ? people.map((u) => <option key={u._id} value={u._id}>{u.name}{u.role === 'leader' ? ' (Leader)' : ''}</option>) : <option value="">Nobody in this team yet</option>}</select></label></div>
    <div className="row2"><label className="f">Due date<input name="due" type="date" /></label>
      <label className="f">Priority<select name="priority" defaultValue="Medium"><option>High</option><option>Medium</option><option>Low</option></select></label></div>
  </Modal>;
}
