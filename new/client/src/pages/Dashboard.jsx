import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { api } from '../api';
import { useApi, Stat, StatusPill, PrioPill, DueText, Loading, Empty, Bar, fmtTime } from '../components/ui';

function useSoft(path) {
  const [data, setData] = useState(null);
  useEffect(() => { api(path).then(setData).catch(() => setData([])); }, [path]);
  return data;
}
const todayStr = () => new Date().toLocaleDateString('en-CA');
const idOf = (value) => String(value?._id || value || '');

export function MeetList({ list }) {
  if (!list.length) return <Empty>No upcoming meetings</Empty>;
  return <div className="list">{list.map((m) => { const d = new Date(m.start); return (
    <div className="li" key={m._id}><div className="date-chip"><b>{d.getDate()}</b><span>{d.toLocaleDateString('en', { month: 'short' })}</span></div>
      <div className="grow"><div className="t">{m.title}</div>
        <div className="s">{d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · {fmtTime(m.start)} · {m.duration} min · {m.team ? m.team.name : 'Everyone'}</div>
        <div className="s">Scheduled by {m.createdBy?.name || 'programme admin'}</div>
      </div>
      {m.link ? <a className="btn sm" href={m.link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>Join</a> : <span className="tag">Link pending</span>}</div>); })}</div>;
}
export function TaskList({ list }) {
  if (!list.length) return <Empty>No open tasks</Empty>;
  return <div className="list">{list.map((t) => (
    <div className="li" key={t._id}><div className="grow"><div className="t">{t.title}</div><div className="s">{t.project && t.project.name} - <DueText due={t.due} done={t.status === 'approved'} /></div></div><PrioPill p={t.priority} /> <StatusPill s={t.status} /></div>))}</div>;
}

export default function Dashboard() {
  const { user, isIntern, isAdmin } = useApp();
  const nav = useNavigate();
  const [tasks] = useApi('/tasks');
  const [projects] = useApi('/projects');
  const [meetings] = useApi('/meetings');
  const [report] = useApi('/reports');
  const [attendance, , attendanceError] = useApi(isIntern ? null : '/attendance/today');
  const myLogs = useSoft(isIntern ? '/worklogs?mine=1' : '/worklogs?date=' + todayStr());
  const prof = useSoft('/profile/me');

  if (!tasks || !projects || !meetings || !report || !myLogs || !prof || (!isIntern && !attendance)) {
    if (!isIntern && attendanceError) return <div className="card">Could not load today’s attendance: {attendanceError}</div>;
    return <Loading />;
  }
  const nudge = !isAdmin && prof.completeness < 100 && (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, borderLeft: '4px solid var(--amber)' }}>
      <div style={{ flex: 1 }}><b>Complete your profile ({prof.completeness}%)</b><div className="small muted">Add your address, date of birth, education and emergency contact.</div><div style={{ marginTop: 8, maxWidth: 360 }}><Bar pct={prof.completeness} /></div></div>
      <button className="btn" onClick={() => nav('/profile')}>Complete profile</button>
    </div>);
  const upcoming = meetings.filter((m) => new Date(m.start) > new Date()).slice(0, 4);
  const done = tasks.filter((t) => t.status === 'approved').length;
  const completion = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const teamRows = (report.byTeam || []).map((row) => {
    const teamId = idOf(row.team);
    const teamTasks = tasks.filter((task) => idOf(task.team) === teamId);
    const taskDone = teamTasks.filter((task) => task.status === 'approved').length;
    return {
      ...row,
      teamId,
      teamTasks,
      taskDone,
      taskProgress: teamTasks.length ? Math.round((taskDone / teamTasks.length) * 100) : 0,
    };
  });
  const presentRows = (attendance?.rows || []).filter(({ user: person, record }) =>
    person.role === 'intern' && record?.checkIn && ['present', 'late'].includes(record.status));
  const totalInterns = (attendance?.rows || []).filter(({ user: person }) => person.role === 'intern').length;
  const pending = tasks.filter((task) => task.status === 'submitted');
  const completedToday = tasks.filter((task) => task.status === 'approved' && task.completedAt &&
    new Date(task.completedAt).toLocaleDateString('en-CA') === attendance?.date).length;
  const dailyProgress = tasks.length ? Math.round((completedToday / tasks.length) * 100) : 0;

  if (isIntern) {
    const me = report.rows[0];
    const open = tasks.filter((t) => t.status !== 'approved');
    const wroteToday = myLogs.some((l) => l.date === todayStr());
    const weekAgo = new Date(Date.now() - 6 * 864e5).toLocaleDateString('en-CA');
    const weekHours = myLogs.filter((l) => l.date >= weekAgo).reduce((s, l) => s + (l.hours || 0), 0);
    return (<>
      <div className="banner"><div style={{ flex: 1 }}><h2>Hello, {user.name.split(' ')[0]}</h2>
        <p>You have {open.length} open tasks and {upcoming.length} upcoming meetings. {wroteToday ? 'Today\'s work update is done.' : 'You haven\'t written today\'s work update yet.'}</p></div>
        <button className="btn" onClick={() => nav('/worklog')}>{wroteToday ? 'View my updates' : 'Write today\'s update'}</button>
      </div>
      {nudge}
      <div className="grid g4">
        <Stat k="Open tasks" v={open.length} d={`across ${projects.length} project(s)`} icon={'\u{1F4CB}'} bg="var(--brand-soft)" />
        <Stat k="Completed" v={done} d="approved" icon={'\u2705'} bg="var(--green-soft)" />
        <Stat k="Hours this week" v={weekHours} d="from work updates" icon={'\u{1F552}'} bg="var(--blue-soft)" />
        <Stat k="Score" v={me ? me.score : 0} d={`rating ${user.rating || '-'} / 5`} icon={'\u2B50'} bg="var(--amber-soft)" />
      </div>
      <div className="grid g21">
        <div className="card"><h3>My open tasks<span className="spacer" /><button className="btn ghost sm" onClick={() => nav('/tasks')}>Open board</button></h3><TaskList list={open} /></div>
        <div className="card"><h3>Upcoming meetings</h3><MeetList list={upcoming} /></div>
      </div>
      {user.feedback && <div className="card"><h3>Feedback from your leader</h3><p>{user.feedback}</p></div>}
    </>);
  }

  const people = report.rows.length;

  return (<>
    <div className="banner"><div style={{ flex: 1 }}>
      <h2>{isAdmin ? 'Programme overview' : `${user.team ? user.team.name : ''} - ${user.team ? user.team.focus || '' : ''}`}</h2>
      <p>{isAdmin ? `${totalInterns} active interns` : `${people} team members`} - {projects.length} project(s) - {pending.length} submission(s) waiting</p></div>
      <button className="btn" onClick={() => nav(isAdmin ? '/chat' : '/tasks', { state: { ch: 'announcements' } })}>{isAdmin ? 'Post announcement' : '+ Assign task'}</button></div>
    {nudge}
    <div className="grid g4">
      <Stat k="Interns present" v={presentRows.length} d={`${totalInterns} active interns`} icon={'\u{1F393}'} bg="var(--brand-soft)" onClick={() => nav('/interns?present=today')} />
      <Stat k="Updates today" v={`${dailyProgress}%`} d={`${completedToday} tasks completed today`} icon={'\u{1F4DD}'} bg="var(--green-soft)" onClick={() => nav('/reports?view=today')} />
      <Stat k="Task completion" v={completion + '%'} d={`${done} of ${tasks.length} tasks approved`} icon={'\u2705'} bg="var(--blue-soft)" onClick={() => nav('/tasks')} />
      <Stat k="Awaiting review" v={pending.length} d="pending submissions" icon={'\u{1F4E5}'} bg="var(--amber-soft)" onClick={() => nav('/tasks?status=submitted')} />
    </div>
    <div className="grid g21">
      <div className="card"><h3>Project progress<span className="spacer" /><button className="btn ghost sm" onClick={() => nav('/projects')}>All projects</button></h3>
        {teamRows.length ? <div className="list">{teamRows.map((row) => (
          <div className="li" key={row.teamId}><div className="grow"><div className="t">{row.team.name}</div>
            <div className="s">{projects.filter((project) => idOf(project.team) === row.teamId).map((project) => project.name).join(', ') || 'No projects yet'} · {row.taskDone}/{row.teamTasks.length} tasks complete</div>
            <div style={{ marginTop: 8 }}><Bar pct={row.taskProgress} /></div></div>
            <div style={{ width: 90, textAlign: 'right' }}><b>{row.taskProgress}%</b><br /><button className="btn ghost sm" onClick={() => nav(`/tasks?team=${row.teamId}`)}>Team details</button></div>
          </div>))}</div> : <Empty>No teams yet</Empty>}</div>
      <div className="card"><h3>Upcoming meetings<span className="spacer" /><button className="btn ghost sm" onClick={() => nav('/meetings')}>+ Schedule</button></h3><MeetList list={upcoming} /></div>
    </div>
  </>);
}
