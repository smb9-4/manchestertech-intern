import { api } from '../api';
import { useApp } from '../context';
import { useApi, Loading, Avatar, AttPill, Stat, fmtTime } from '../components/ui';

export default function Attendance() {
  const { user, isIntern, toast } = useApp();
  const [att, reload] = useApi('/attendance/today');
  const [hist, reloadHist] = useApi(isIntern ? '/attendance/history/' + user._id : null);
  const [report] = useApi('/reports');
  if (!att || !report || (isIntern && !hist)) return <Loading />;

  if (isIntern) {
    const rec = att.rows[0]?.record;
    const me = report.rows[0];
    const act = async (p) => { try { await api('/attendance/' + p, { method: 'POST' }); reload(); reloadHist(); toast('Done ✓'); } catch (e) { toast(e.message); } };
    return (<>
      <div className="grid g3">
        <div className="card" style={{ textAlign: 'center' }}><h3 style={{ justifyContent: 'center' }}>Today</h3>
          <div style={{ fontSize: 30, fontWeight: 800, margin: '6px 0' }}>{rec?.checkIn ? fmtTime(rec.checkIn) : '--:--'}</div>
          <div className="muted small" style={{ marginBottom: 14 }}>{rec?.checkIn ? 'Checked in' + (rec.checkOut ? ' · out ' + fmtTime(rec.checkOut) : '') : 'Not checked in yet'}</div>
          {!rec?.checkIn ? <button className="btn" onClick={() => act('check-in')}>Check in</button> : !rec.checkOut ? <button className="btn ghost" onClick={() => act('check-out')}>Check out</button> : <AttPill s={rec.status} />}</div>
        <div className="card" style={{ textAlign: 'center' }}><h3 style={{ justifyContent: 'center' }}>Attendance rate</h3>
          <div className="ring" style={{ background: `conic-gradient(var(--brand) ${me.attendance * 3.6}deg,#eef0f6 0)` }}><div>{me.attendance}%</div></div>
          <div className="small muted" style={{ marginTop: 8 }}>{me.attended} of {me.workingDays} working days</div></div>
        <div className="card"><h3>Summary</h3>{[['Present', 'present', 'p-green'], ['Late', 'late', 'p-amber'], ['Absent (marked)', 'absent', 'p-red']].map(([a, k, c]) =>
          <div className="li" key={k}><span className={'pill ' + c}>{a}</span><span className="grow" /><b>{hist.filter((h) => h.status === k).length} days</b></div>)}</div>
      </div>
      <div className="card"><h3>History</h3><table><thead><tr><th>Date</th><th>Status</th><th>Check in</th><th>Check out</th></tr></thead>
        <tbody>{hist.map((h) => <tr key={h._id}><td>{new Date(h.date + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</td><td><AttPill s={h.status} /></td><td>{fmtTime(h.checkIn)}</td><td>{fmtTime(h.checkOut)}</td></tr>)}</tbody></table></div>
    </>);
  }

  const rows = att.rows;
  const mark = async (u, status) => { try { await api('/attendance/mark', { method: 'POST', body: { userId: u._id, status } }); reload(); toast(`${u.name}: ${status}`); } catch (e) { toast(e.message); } };
  const remind = async () => { const r = await api('/attendance/remind', { method: 'POST' }); toast(`Reminder sent to ${r.reminded} people`); };
  const avg = report.rows.length ? Math.round(report.rows.reduce((s, r) => s + r.attendance, 0) / report.rows.length) : 0;
  return (<>
    <div className="grid g4">
      <Stat k="Present" v={rows.filter((r) => r.record?.status === 'present').length} d="on time" icon="✅" bg="var(--green-soft)" />
      <Stat k="Late" v={rows.filter((r) => r.record?.status === 'late').length} d="after cut-off" icon="⏰" bg="var(--amber-soft)" />
      <Stat k="Not in" v={rows.filter((r) => !r.record?.checkIn).length} d="absent or not checked in" icon="❌" bg="var(--red-soft)" />
      <Stat k="Average rate" v={avg + '%'} d="since programme start" icon="📈" bg="var(--brand-soft)" />
    </div>
    <div className="card" style={{ padding: '6px 8px', overflowX: 'auto' }}>
      <h3 style={{ padding: '10px 10px 0' }}>{new Date(att.date + 'T00:00').toLocaleDateString('en-IN', { dateStyle: 'full' })}<span className="spacer" /><button className="btn ghost sm" onClick={remind}>🔔 Remind people not checked in</button></h3>
      <table><thead><tr><th>Intern</th><th>Team</th><th>Check in</th><th>Check out</th><th>Status</th><th>Mark</th></tr></thead>
        <tbody>{rows.map(({ user: u, record: r }) => (
          <tr key={u._id}><td><div className="who"><Avatar sm name={u.name} /><div className="n">{u.name}</div></div></td><td>{u.team?.name}</td>
            <td>{fmtTime(r?.checkIn)}</td><td>{fmtTime(r?.checkOut)}</td><td><AttPill s={r?.status} /></td>
            <td><select className="search" style={{ minWidth: 'auto', padding: '5px 8px', fontSize: 12 }} value={r?.status || ''} onChange={(e) => mark(u, e.target.value)}>
              <option value="" disabled>—</option><option value="present">present</option><option value="late">late</option><option value="absent">absent</option></select></td></tr>))}</tbody></table>
    </div>
  </>);
}
