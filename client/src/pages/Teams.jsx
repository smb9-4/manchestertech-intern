import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useApp } from '../context';
import { ProfileModal } from '../components/ProfileForm';
import { useApi, Avatar, Loading, Modal, Bar, Empty } from '../components/ui';
import TaskTimeline from '../components/TaskTimeline';

/* ── tiny 3-dot dropdown ─────────────────────────────────────────── */
function TeamMenu({ team, onRename, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen((v) => !v); }}
        aria-label="Team options"
        style={{
          background: open ? 'rgba(212,178,106,.15)' : 'transparent',
          border: '1px solid ' + (open ? 'var(--brand)' : 'var(--line)'),
          cursor: 'pointer',
          color: 'var(--brand)',
          fontSize: 18,
          lineHeight: 1,
          padding: '2px 8px',
          borderRadius: 6,
          transition: 'all .15s'
        }}
      >⋮</button>
      {open && (
        <div style={{
          position: 'absolute', top: '120%', right: 0, zIndex: 60,
          background: '#161619', border: '1px solid #33302a',
          borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,.6)',
          minWidth: 150, overflow: 'hidden'
        }}>
          <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(false); onRename(team); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid #262420', fontSize: 13, cursor: 'pointer', color: 'var(--ink)' }}>
            ✏️ Change name
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(team); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', color: '#f87171' }}>
            🗑️ Delete
          </button>
        </div>
      )}
    </div>
  );
}

const taskTeamId = (task) => String(task.team?._id || task.team);

export default function Teams() {
  const { isAdmin, isLeader, user, toast } = useApp();
  const [teams, reloadTeams, teamsError] = useApi('/teams');
  const [users, reloadUsers, usersError] = useApi('/users');
  const [projects, , projectsError] = useApi('/projects');
  const [tasks, , tasksError] = useApi('/tasks');
  const [searchParams, setSearchParams] = useSearchParams();
  const [modal, setModal] = useState(null);
  const loadError = teamsError || usersError || projectsError || tasksError;
  if (loadError) return <div className="card" role="alert">Unable to load team progress: {loadError}</div>;
  if (!teams || !users || !projects || !tasks) return <Loading />;

  const reload = () => { reloadTeams(); reloadUsers(); };
  const run = async (fn, msg) => { try { await fn(); toast(msg); reload(); } catch (e) { toast(e.message); } };
  const members = (team) => users.filter((u) => u.team?._id === team._id && ['intern', 'leader'].includes(u.role));
  const unassigned = users.filter((u) => !u.team && ['intern', 'leader'].includes(u.role));
  const teamProjects = (team) => projects.filter((project) => project.team?._id === team._id);
  const teamTasks = (team) => tasks.filter((task) => taskTeamId(task) === team._id);
  const completedTasks = (items) => items.filter((task) => task.status === 'approved').length;
  const progress = (items) => items.length ? Math.round((completedTasks(items) / items.length) * 100) : 0;

  const teamId = searchParams.get('team');
  const memberId = searchParams.get('member');
  const selectedTeam = teams.find((team) => team._id === teamId);
  const selectedMember = selectedTeam && members(selectedTeam).find((person) => person._id === memberId);
  const memberTasks = selectedMember
    ? tasks.filter((task) => task.assignee?._id === selectedMember._id && taskTeamId(task) === selectedTeam._id)
    : [];
  const memberProgress = progress(memberTasks);

  const showTeam = (id) => setSearchParams({ team: id });
  const showMember = (id) => setSearchParams({ team: teamId, member: id });
  const showTeams = () => setSearchParams({});
  const showTeamMembers = () => setSearchParams({ team: teamId });

  const create = async (fd) => {
    await api('/teams', { method: 'POST', body: Object.fromEntries(fd) });
    setModal(null); reload(); toast('Team created');
  };
  const renameTeam = async (fd) => {
    await api('/teams/' + modal.team._id, { method: 'PATCH', body: { name: fd.get('name'), focus: fd.get('focus'), description: fd.get('description') } });
    setModal(null); reload(); toast('Team updated');
  };
  const deleteTeam = async () => {
    if (!modal?.team) return;
    await api('/teams/' + modal.team._id, { method: 'DELETE' });
    setModal(null); showTeams(); reload(); toast('Team deleted');
  };
  const rate = async (fd) => {
    await api('/users/' + modal.user._id, { method: 'PATCH', body: { rating: +fd.get('rating'), feedback: fd.get('feedback') } });
    setModal(null); reload(); toast('Feedback saved');
  };

  return (<>
    {!selectedTeam && <>
      {isAdmin && <div className="toolbar">
        <span className="muted">Team project summaries and overall task completion.</span>
        <div className="spacer" />
        <button className="btn" onClick={() => setModal({ kind: 'team' })}>+ New team</button>
      </div>}
      {!teams.length && <div className="card"><Empty>No teams created yet.</Empty></div>}
      <div className="grid g2">
        {teams.map((team) => {
          const teamProjectList = teamProjects(team);
          const teamTaskList = teamTasks(team);
          const teamDone = completedTasks(teamTaskList);
          const teamProgress = progress(teamTaskList);
          return <div className="card team-summary-card" key={team._id} style={{ position: 'relative' }}
            onClick={() => showTeam(team._id)}>
            <div className="team-summary-heading">
              <span className="team-color-dot" style={{ background: team.color }} />
              <h3>{team.name}</h3>
              <span className="team-summary-percent">{teamProgress}%</span>
              {isAdmin && (
                <TeamMenu team={team}
                  onRename={(t) => setModal({ kind: 'rename', team: t })}
                  onDelete={(t) => setModal({ kind: 'confirmDelete', team: t })}
                />
              )}
            </div>
            {team.description ? (
              <div style={{ marginTop: 6, marginBottom: 8 }}>
                <div className="small muted" style={{ color: 'var(--brand)', fontWeight: 600 }}>Project Description</div>
                <p className="small" style={{ color: 'var(--ink)', margin: '2px 0 0 0' }}>{team.description}</p>
              </div>
            ) : null}
            <div className="small muted">Project{teamProjectList.length === 1 ? '' : 's'}</div>
            {teamProjectList.length
              ? teamProjectList.map((project) => <div className="team-project-summary" key={project._id}>
                <b>{project.name}</b>
                <p className="small muted">{project.description || 'No project description yet.'}</p>
              </div>)
              : !team.description && <div className="team-project-summary"><b>No project assigned</b><p className="small muted">Project description unavailable.</p></div>}
            <div className="team-summary-progress">
              <div className="small muted">{teamDone}/{teamTaskList.length} tasks completed</div>
              <Bar pct={teamProgress} />
            </div>
          </div>;
        })}
      </div>
      {isAdmin && unassigned.length > 0 && <details className="card team-unassigned">
        <summary>Unassigned members ({unassigned.length})</summary>
        <div className="list">{unassigned.map((person) => (
          <div className="li" key={person._id}>
            <Avatar sm name={person.name} photo={person.profile?.photo} />
            <div className="grow"><div className="t">{person.name}</div><div className="s">{person.email}</div></div>
            <select className="search" style={{ minWidth: 'auto', padding: '5px 8px', fontSize: 12 }} defaultValue=""
              onChange={(e) => run(() => api('/users/' + person._id, { method: 'PATCH', body: { team: e.target.value } }), 'Added to team')}>
              <option value="" disabled>Add to team...</option>
              {teams.map((team) => <option key={team._id} value={team._id}>{team.name}</option>)}
            </select>
          </div>))}
        </div>
      </details>}
    </>}

    {selectedTeam && <>
      <div className="toolbar">
        <button className="btn ghost" onClick={selectedMember ? showTeamMembers : showTeams}>
          {selectedMember ? '← Back to team' : '← All teams'}
        </button>
        <div className="spacer" />
        {(isAdmin || isLeader) && <button className="btn" onClick={() => setModal({ kind: 'addMember', teamId: selectedTeam._id })}>+ Add member</button>}
        {isAdmin && <button className="btn ghost" onClick={() => setModal({ kind: 'team' })}>+ New team</button>}
      </div>

      <section className="card team-detail">
        <div className="team-summary-heading">
          <span className="team-color-dot" style={{ background: selectedTeam.color }} />
          <h2>{selectedTeam.name}</h2>
          <span className="team-summary-percent">{progress(teamTasks(selectedTeam))}%</span>
          {isAdmin && (
            <TeamMenu team={selectedTeam}
              onRename={(t) => setModal({ kind: 'rename', team: t })}
              onDelete={(t) => setModal({ kind: 'confirmDelete', team: t })}
            />
          )}
        </div>
        {selectedTeam.description && (
          <div style={{ marginTop: 8, marginBottom: 12, padding: '10px 14px', background: 'rgba(212,178,106,.06)', borderLeft: '3px solid var(--brand)', borderRadius: 6 }}>
            <div className="small" style={{ color: 'var(--brand)', fontWeight: 600 }}>Project Description</div>
            <p className="small" style={{ color: 'var(--ink)', margin: '4px 0 0 0' }}>{selectedTeam.description}</p>
          </div>
        )}
        {selectedTeam.focus && <p className="small muted">{selectedTeam.focus}</p>}
        <div className="team-summary-progress">
          <div className="small muted">
            {completedTasks(teamTasks(selectedTeam))}/{teamTasks(selectedTeam).length} tasks completed · team progress
          </div>
          <Bar pct={progress(teamTasks(selectedTeam))} />
        </div>
        <div className="team-project-details">
          <h3>Project{teamProjects(selectedTeam).length === 1 ? '' : 's'}</h3>
          {teamProjects(selectedTeam).length ? teamProjects(selectedTeam).map((project) => (
            <article className="team-project-detail" key={project._id}>
              <h4>{project.name}</h4>
              <p className="muted">{project.description || 'No project description yet.'}</p>
            </article>
          )) : selectedTeam.description ? (
            <article className="team-project-detail">
              <h4>Project Details</h4>
              <p className="muted">{selectedTeam.description}</p>
            </article>
          ) : <p className="muted">No project has been assigned to this team yet.</p>}
        </div>
        {!selectedMember && <div className="team-project-details">
          <h3>Task progress by date</h3>
          {teamTasks(selectedTeam).length
            ? <TaskTimeline tasks={teamTasks(selectedTeam)} showAssignee />
            : <Empty>No tasks have been assigned to this team yet.</Empty>}
        </div>}
      </section>

      {!selectedMember && <section className="card">
        <h3>Team members</h3>
        {members(selectedTeam).length ? <div className="list">{members(selectedTeam).map((person) => {
          const personTasks = tasks.filter((task) => task.assignee?._id === person._id && taskTeamId(task) === selectedTeam._id);
          const personDone = completedTasks(personTasks);
          const personProgress = progress(personTasks);
          return <div className="team-member-row" key={person._id}>
            <button type="button" className="team-member-select" onClick={() => showMember(person._id)}
              aria-label={`View ${person.name}'s tasks`}>
              <Avatar sm name={person.name} photo={person.profile?.photo} />
              <span className="grow">
                <span className="t">{person.name} {selectedTeam.leader?._id === person._id && <span className="pill p-brand">Leader</span>}</span>
                <span className="s">{personDone}/{personTasks.length} tasks completed · {personProgress}%</span>
                <span className="team-member-bar"><Bar pct={personProgress} /></span>
              </span>
              <span className="pill p-grey">View tasks →</span>
            </button>
            {isAdmin && <select aria-label={`Move ${person.name} to a team`} className="search team-member-action"
              value={selectedTeam._id} onChange={(e) => run(() => api('/users/' + person._id, { method: 'PATCH', body: { team: e.target.value } }), 'Moved')}>
              {teams.map((team) => <option key={team._id} value={team._id}>{team.name}</option>)}
            </select>}
            {isAdmin && selectedTeam.leader?._id !== person._id && <button className="btn ghost sm team-member-action"
              onClick={() => run(() => api('/teams/' + selectedTeam._id, { method: 'PATCH', body: { leader: person._id } }), `${person.name} is now leader`)}>Make leader</button>}
            {(isAdmin || isLeader) && <button className="btn ghost sm team-member-action" onClick={() => setModal({ kind: 'profile', id: person._id })}>Profile</button>}
            {(isAdmin || (isLeader && person._id !== user._id)) && <button className="btn ghost sm team-member-action" onClick={() => setModal({ kind: 'rate', user: person })}>Rate</button>}
          </div>;
        })}</div> : <Empty>No members in this team yet.</Empty>}
      </section>}

      {selectedMember && <section className="card team-member-tasks">
        <div className="team-member-task-header">
          <Avatar name={selectedMember.name} photo={selectedMember.profile?.photo} />
          <div className="grow">
            <h3>{selectedMember.name} — Task progress</h3>
            <div className="small muted">{completedTasks(memberTasks)}/{memberTasks.length} tasks completed · {memberProgress}%</div>
          </div>
          {(isAdmin || isLeader) && <button className="btn ghost sm" onClick={() => setModal({ kind: 'profile', id: selectedMember._id })}>Profile</button>}
          {(isAdmin || (isLeader && selectedMember._id !== user._id)) && <button className="btn ghost sm" onClick={() => setModal({ kind: 'rate', user: selectedMember })}>Rate</button>}
        </div>
        <div style={{ marginTop: 12 }}><Bar pct={memberProgress} /></div>
        {memberTasks.length
          ? <TaskTimeline tasks={memberTasks} />
          : <Empty>No tasks have been assigned to this member yet.</Empty>}
      </section>}
    </>}

    {modal?.kind === 'addMember' && (
      <Modal title="Add member to team" okLabel="Add" onClose={() => setModal(null)} onSubmit={async (fd) => {
        const uid = fd.get('userId');
        if (!uid) throw new Error('Select a member');
        await api('/users/' + uid, { method: 'PATCH', body: { team: modal.teamId } });
        setModal(null); reload(); toast('Member added to team');
      }}>
        <label className="f">
          Select member
          <select name="userId" required>
            <option value="">Choose...</option>
            {unassigned.map((u) => (
              <option key={u._id} value={u._id}>{u.name} ({u.role === 'leader' ? 'Team Leader' : 'Intern'})</option>
            ))}
          </select>
        </label>
        {!unassigned.length && <p className="muted" style={{ marginTop: 8 }}>No unassigned members available. Add interns from the Interns page first.</p>}
      </Modal>
    )}
    {modal?.kind === 'profile' && <ProfileModal userId={modal.id} onClose={() => setModal(null)} />}
    {modal?.kind === 'team' && <Modal title="New team" okLabel="Create" onClose={() => setModal(null)} onSubmit={create}>
      <label className="f">Team name<input name="name" required placeholder="Team Epsilon" /></label>
      <div className="row2"><label className="f">Focus area<input name="focus" placeholder="Cloud & DevOps" /></label><label className="f">Colour<input name="color" type="color" defaultValue="#d4b26a" /></label></div>
      <label className="f">Project Description<textarea name="description" rows="3" placeholder="Brief description of this team's project or goals..." /></label>
    </Modal>}
    {modal?.kind === 'rename' && <Modal title="Change team name & details" okLabel="Save" onClose={() => setModal(null)} onSubmit={renameTeam}>
      <label className="f">Team name<input name="name" required defaultValue={modal.team.name} /></label>
      <div className="row2"><label className="f">Focus area<input name="focus" defaultValue={modal.team.focus} /></label><label className="f">Colour<input name="color" type="color" defaultValue={modal.team.color || '#d4b26a'} /></label></div>
      <label className="f">Project Description<textarea name="description" rows="3" defaultValue={modal.team.description} placeholder="Brief description of this team's project or goals..." /></label>
    </Modal>}
    {modal?.kind === 'confirmDelete' && (
      <Modal title="Delete team" okLabel="Delete" onClose={() => setModal(null)} onSubmit={deleteTeam}>
        <p>Are you sure you want to delete <b>{modal.team.name}</b>? Members will become unassigned. This cannot be undone.</p>
      </Modal>
    )}
    {modal?.kind === 'rate' && <Modal title={'Rate ' + modal.user.name} okLabel="Save" onClose={() => setModal(null)} onSubmit={rate}>
      <label className="f">Rating (0-5)<input name="rating" type="number" min="0" max="5" step="0.1" defaultValue={modal.user.rating || 4} required /></label>
      <label className="f">Feedback (the intern sees this)<textarea name="feedback" rows="4" defaultValue={modal.user.feedback} /></label>
    </Modal>}
  </>);
}
