import { useSearchParams } from 'react-router-dom';
import { download } from '../api';
import { useApp } from '../context';
import { useApi, Loading, Avatar, Bar, Empty, StatusPill, DueText } from '../components/ui';
import TaskTimeline from '../components/TaskTimeline';

const todayStr = () => new Date().toLocaleDateString('en-CA');
const idOf = (value) => String(value?._id || value || '');

export default function Reports() {
  const { user, isIntern, toast } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') === 'today' ? 'today' : 'overall';
  const teamId = searchParams.get('team');
  const userId = searchParams.get('user');
  const [rep] = useApi('/reports');
  const [tasks] = useApi('/tasks');
  const [logs] = useApi(!isIntern && view === 'today' ? '/worklogs?date=' + todayStr() : null);
  if (!rep || !tasks || (!isIntern && view === 'today' && !logs)) return <Loading />;

  if (isIntern) {
    const me = rep.rows[0];
    const rating = Math.round(((user.rating || 0) / 5) * 100);
    return (<>
      <div className="grid g3">
        <div className="card" style={{ textAlign: 'center' }}><h3 style={{ justifyContent: 'center' }}>Overall score</h3>
          <div className="ring" style={{ background: `conic-gradient(var(--green) ${me.score * 3.6}deg,#eef0f6 0)` }}><div>{me.score}</div></div>
          <div className="small muted" style={{ marginTop: 8 }}>60% approved tasks + 40% leader rating</div></div>
        <div className="card"><h3>Breakdown</h3>{[['Task delivery', me.delivery], ['Leader rating', rating]].map(([a, b]) =>
          <div key={a} style={{ marginBottom: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between' }} className="small"><span>{a}</span><b>{b}%</b></div><div style={{ marginTop: 5 }}><Bar pct={b} /></div></div>)}</div>
        <div className="card"><h3>Leader's feedback</h3><p>{user.feedback || 'No feedback yet.'}</p></div>
      </div>
      <div className="card"><h3>My tasks</h3>
        {tasks.length ? <div className="list">{tasks.map((task) => <div className="li" key={task._id}>
          <div className="grow"><div className="t">{task.title}</div><div className="s">{task.project?.name || 'No project'} · <DueText due={task.due} done={task.status === 'approved'} /></div></div>
          <StatusPill s={task.status} />
        </div>)}</div> : <Empty>No tasks assigned yet.</Empty>}
      </div>
    </>);
  }

  const teamRows = (rep.byTeam || []).map((row) => {
    const id = idOf(row.team);
    const teamTasks = tasks.filter((task) => idOf(task.team) === id);
    const taskDone = teamTasks.filter((task) => task.status === 'approved').length;
    const dailyDone = teamTasks.filter((task) => task.status === 'approved' && task.completedAt &&
      new Date(task.completedAt).toLocaleDateString('en-CA') === todayStr()).length;
    const teamLogs = (logs || []).filter((log) => idOf(log.team) === id);
    return {
      ...row,
      id,
      teamTasks,
      taskDone,
      progress: teamTasks.length ? Math.round((taskDone / teamTasks.length) * 100) : 0,
      dailyDone,
      dailyProgress: teamTasks.length ? Math.round((dailyDone / teamTasks.length) * 100) : 0,
      updates: new Set(teamLogs.map((log) => idOf(log.user))).size,
    };
  });
  const selectedTeam = teamRows.find((row) => row.id === teamId);
  const selectedUser = rep.rows.find((row) => idOf(row.user) === userId);
  const teamMembers = rep.rows.filter((row) => idOf(row.user.team) === teamId);
  const memberTasks = selectedUser ? tasks.filter((task) => idOf(task.assignee) === userId) : [];
  const memberTasksAssignedToday = memberTasks.filter((task) => task.createdAt &&
    new Date(task.createdAt).toLocaleDateString('en-CA') === todayStr());
  const memberDoneToday = memberTasks.filter((task) => task.status === 'approved' && task.completedAt &&
    new Date(task.completedAt).toLocaleDateString('en-CA') === todayStr()).length;

  const updateQuery = (next) => setSearchParams(next);
  const openTeam = (id) => updateQuery({ ...(view === 'today' ? { view: 'today' } : {}), team: id });
  const openUser = (id) => updateQuery({ ...(view === 'today' ? { view: 'today' } : {}), team: teamId, user: id });
  const showAll = () => updateQuery(view === 'today' ? { view: 'today' } : {});
  const deliveryRows = teamId ? rep.rows.filter((row) => idOf(row.user.team) === teamId) : rep.rows;

  if (userId && selectedUser) {
    return (<>
      <div className="toolbar"><button className="btn ghost" onClick={() => updateQuery({ ...(view === 'today' ? { view: 'today' } : {}), team: teamId })}>← Team progress</button>
        <button className="btn ghost" onClick={showAll}>All teams</button></div>
      <div className="card">
        <h3>{selectedUser.user.name} — task progress</h3>
        <div className="small muted">{memberTasksAssignedToday.length} task(s) assigned today · {memberDoneToday} task(s) completed today · {selectedUser.done}/{selectedUser.tasks} approved overall</div>
        <div style={{ margin: '8px 0 16px' }}><Bar pct={selectedUser.delivery} /></div>
      </div>
      <div className="card"><h3>Today’s assigned tasks</h3>
        {memberTasksAssignedToday.length ? <TaskTimeline tasks={memberTasksAssignedToday} /> : <Empty>No tasks were assigned today.</Empty>}
      </div>
      <div className="card"><h3>All assigned tasks</h3>
        {memberTasks.length ? <TaskTimeline tasks={memberTasks} /> : <Empty>No tasks assigned yet.</Empty>}
      </div>
    </>);
  }

  return (<>
    <div className="toolbar">
      <span className="muted small">{view === 'today' ? 'Task progress recorded today' : 'Task delivery progress across teams'}</span>
      <div className="spacer" />
      <button className="btn ghost" onClick={() => updateQuery(view === 'today' ? (teamId ? { team: teamId } : {}) : { ...(teamId ? { team: teamId } : {}), view: 'today' })}>
        {view === 'today' ? 'Overall progress' : 'Today’s progress'}
      </button>
      {!isIntern && <button className="btn ghost" onClick={() => download('/reports/export.csv', 'internhub-report.csv').catch((e) => toast(e.message))}>Download CSV (Excel)</button>}
    </div>

    {view === 'today' ? (
      <div className="card"><h3>Today’s task progress by team</h3>
        {teamRows.length ? <div className="list">{teamRows.map((row) => (
          <button type="button" className="li" key={row.id} onClick={() => openTeam(row.id)}
            style={{ width: '100%', textAlign: 'left', color: 'inherit', font: 'inherit', background: 'transparent', border: 0, cursor: 'pointer' }}>
            <div className="grow"><div className="t">{row.team.name}</div>
              <div className="s">{row.dailyDone} task(s) completed today · {row.updates} work update(s) submitted</div>
              <div style={{ marginTop: 8 }}><Bar pct={row.dailyProgress} /></div></div><b>{row.dailyProgress}%</b>
          </button>))}</div> : <Empty>No teams yet.</Empty>}
      </div>
    ) : (
      <div className="grid g2">
        <div className="card"><h3>Task completion by team</h3><div className="vbar">{rep.byTeam.map((t) => <div className="c" key={t.team._id}><b>{t.delivery}%</b><i style={{ height: Math.max(t.delivery, 3) + '%' }} /><span>{t.team.name.replace('Team ', '')}</span></div>)}</div></div>
        <div className="card"><h3>Average score by team</h3><div className="vbar">{rep.byTeam.map((t) => <div className="c" key={t.team._id}><b>{t.avgScore}</b><i style={{ height: Math.max(t.avgScore, 3) + '%', background: 'linear-gradient(180deg,#38bdf8,var(--blue))' }} /><span>{t.team.name.replace('Team ', '')}</span></div>)}</div></div>
      </div>
    )}

    {view === 'overall' && !teamId && <div className="card"><h3>Teams and task progress</h3>
      {teamRows.length ? <div className="list">{teamRows.map((row) => (
        <button type="button" className="li" key={row.id} onClick={() => openTeam(row.id)}
          style={{ width: '100%', textAlign: 'left', color: 'inherit', font: 'inherit', background: 'transparent', border: 0, cursor: 'pointer' }}>
          <div className="grow"><div className="t">{row.team.name}</div>
            <div className="s">{row.taskDone}/{row.teamTasks.length} tasks approved</div>
            <div style={{ marginTop: 8 }}><Bar pct={row.progress} /></div>
          </div><b>{row.progress}%</b>
        </button>))}</div> : <Empty>No teams yet.</Empty>}
    </div>}

    {teamId && selectedTeam && <div className="card">
      <h3>{selectedTeam.team.name} progress<span className="spacer" /><button className="btn ghost sm" onClick={showAll}>All teams</button></h3>
      <div className="small muted">{view === 'today' ? `${selectedTeam.dailyDone} task(s) completed today · ${selectedTeam.dailyProgress}% today` : `${selectedTeam.taskDone}/${selectedTeam.teamTasks.length} tasks approved · ${selectedTeam.progress}% overall`}</div>
      <div style={{ margin: '8px 0 14px' }}><Bar pct={view === 'today' ? selectedTeam.dailyProgress : selectedTeam.progress} /></div>
      {teamMembers.length ? <div className="list">{teamMembers.map((row) => {
        const personTasks = tasks.filter((task) => idOf(task.assignee) === idOf(row.user));
        const todayDone = personTasks.filter((task) => task.status === 'approved' && task.completedAt &&
          new Date(task.completedAt).toLocaleDateString('en-CA') === todayStr()).length;
        const assignedToday = personTasks.filter((task) => task.createdAt &&
          new Date(task.createdAt).toLocaleDateString('en-CA') === todayStr()).length;
        return <button type="button" className="li report-member-link" key={row.user._id} onClick={() => openUser(idOf(row.user))}>
          <Avatar sm name={row.user.name} /><div className="grow">
          <div className="t">{row.user.name}</div>
          <div className="s">{view === 'today' ? `${assignedToday} assigned today · ${todayDone} completed today · ` : ''}{row.done}/{row.tasks} approved · ${row.delivery}% overall</div>
          <div style={{ marginTop: 6 }}><Bar pct={row.delivery} /></div>
        </div><span className="btn ghost sm">View progress</span></button>;
      })}</div> : <Empty>No team members yet.</Empty>}
    </div>}

    {userId && !selectedUser && <div className="card"><Empty>That person is not in this report.</Empty></div>}

    {!userId && <div className="card" style={{ padding: '6px 8px', overflowX: 'auto' }}>
      <h3 style={{ padding: '10px 10px 0' }}>{teamId ? 'Team members' : 'Performance leaderboard'}</h3>
      {deliveryRows.length ? <table><thead><tr><th>#</th><th>Intern</th><th>Team</th><th>Delivery</th><th>Rating</th><th>Score</th><th /></tr></thead>
        <tbody>{deliveryRows.map((row, index) => <tr key={row.user._id}><td><b>{index + 1}</b></td><td><div className="who"><Avatar sm name={row.user.name} /><div className="n">{row.user.name}</div></div></td><td>{row.user.team?.name || '-'}</td>
          <td>{row.done}/{row.tasks} ({row.delivery}%)</td><td>{'\u2B50'} {row.user.rating || '-'}</td>
          <td><span className={'pill ' + (row.score >= 75 ? 'p-green' : row.score >= 60 ? 'p-amber' : 'p-red')}>{row.score}</span></td>
          <td><button className="btn ghost sm" onClick={() => openUser(idOf(row.user))}>View progress</button></td></tr>)}</tbody></table>
        : <Empty>No team members yet.</Empty>}
    </div>}
  </>);
}
