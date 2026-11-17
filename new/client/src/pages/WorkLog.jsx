import { useEffect, useState } from 'react';
import { api, download } from '../api';
import { useApp } from '../context';
import { useApi, Loading, Empty, Avatar, Stat, fileSize } from '../components/ui';

const localDay = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() - offset); return d.toLocaleDateString('en-CA'); };
const niceDay = (s) => new Date(s + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

function Field({ label, children }) { return <label className="f">{label}{children}</label>; }
function Reviewed({ log }) {
  if (!log.reviewedAt) return <span className="pill p-amber">Waiting for review</span>;
  return <span className="pill p-green">Reviewed by {log.reviewedBy ? log.reviewedBy.name : 'leader'}</span>;
}
function Files({ files, onRemove }) {
  const { toast } = useApp();
  return (
    <div className="toolbar" style={{ margin: '6px 0', gap: 6 }}>
      {files.map((f) => (
        <span key={f._id} className="pill p-grey" style={{ gap: 6, padding: '4px 10px' }}>
          <button type="button" className="small" style={{ color: 'var(--brand)', fontWeight: 600 }} title="Download"
            onClick={() => download('/documents/' + f._id + '/download', f.name).catch((e) => toast(e.message))}>{'\u{1F4CE}'} {f.name}</button>
          <span className="muted">{f.size ? fileSize(f.size) : ''}</span>
          {onRemove && <button type="button" title="Remove" onClick={() => onRemove(f._id)} style={{ fontWeight: 700 }}>&times;</button>}
        </span>))}
    </div>
  );
}
function LogBody({ log }) {
  return (<>
    <p style={{ whiteSpace: 'pre-wrap', margin: '6px 0' }}>{log.summary}</p>
    {log.tasks && log.tasks.length > 0 && <div className="small" style={{ margin: '6px 0' }}><b>Tasks:</b> {log.tasks.map((t) => t.title).join(', ')}</div>}
    {log.blockers && <div className="small" style={{ margin: '6px 0', color: 'var(--red)' }}><b>Blocked by:</b> {log.blockers}</div>}
    {log.tomorrow && <div className="small muted" style={{ margin: '6px 0' }}><b>Plan for tomorrow:</b> {log.tomorrow}</div>}
    {log.links && <div className="small" style={{ margin: '6px 0', wordBreak: 'break-all' }}><b>Links:</b> {log.links.split(/\s+/).filter(Boolean).map((l, i) => /^https?:\/\//.test(l) ? <a key={i} href={l} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>{l}</a> : <span key={i} style={{ marginRight: 8 }}>{l}</span>)}</div>}
    {log.attachments && log.attachments.length > 0 && <Files files={log.attachments} />}
    {log.feedback && <div className="small" style={{ margin: '8px 0 0', color: 'var(--green)' }}><b>Feedback:</b> {log.feedback}</div>}
  </>);
}

// ---------- Intern: write today's update + history ----------
function InternView() {
  const { user } = useApp();
  const { toast } = useApp();
  const [day, setDay] = useState(localDay(0));
  const [tasks] = useApi('/tasks');
  const [history, reloadHistory] = useApi('/worklogs?mine=1');
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setForm(null); setErr('');
    api('/worklogs/mine?date=' + day).then((log) => {
      setSaved(log);
      setForm(log ? { summary: log.summary, hours: log.hours, tasks: (log.tasks || []).map((t) => t._id), blockers: log.blockers, tomorrow: log.tomorrow, links: log.links, attachments: log.attachments || [] }
        : { summary: '', hours: 8, tasks: [], blockers: '', tomorrow: '', links: '', attachments: [] });
    });
  }, [day]);

  if (!form || !tasks || !history) return <Loading />;
  const set = (k, v) => setForm({ ...form, [k]: v });
  const toggleTask = (id) => set('tasks', form.tasks.includes(id) ? form.tasks.filter((x) => x !== id) : [...form.tasks, id]);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const log = await api('/worklogs', { method: 'POST', body: { ...form, attachments: form.attachments.map((a) => a._id), date: day } });
      setSaved(log); reloadHistory(); toast(saved ? 'Update saved' : 'Update submitted for review');
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const addFiles = async (e) => {
    const files = [...e.target.files]; e.target.value = '';
    if (!files.length) return;
    if (form.attachments.length + files.length > 10) return setErr('You can attach up to 10 files per update');
    setUploading(true); setErr('');
    try {
      const added = [];
      for (const f of files) {
        const fd = new FormData(); fd.append('file', f); fd.append('category', 'Submission');
        added.push(await api('/documents', { method: 'POST', form: fd }));
      }
      setForm((x) => ({ ...x, attachments: [...x.attachments, ...added] }));
      toast(added.length + ' file(s) attached. Remember to save the update.');
    } catch (x) { setErr(x.message); } finally { setUploading(false); }
  };
  const removeFile = (id) => set('attachments', form.attachments.filter((a) => a._id !== id));
  const openTasks = tasks.filter((t) => t.assignee && t.assignee._id === user._id && (t.status !== 'approved' || form.tasks.includes(t._id)));

  return (<>
    <form className="card" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h3>My work update
        <span className="spacer" />
        <select className="search" style={{ minWidth: 'auto' }} value={day} onChange={(e) => setDay(e.target.value)}>
          <option value={localDay(0)}>Today ({niceDay(localDay(0))})</option>
          <option value={localDay(1)}>Yesterday ({niceDay(localDay(1))})</option>
          <option value={localDay(2)}>{niceDay(localDay(2))}</option>
        </select>
      </h3>
      {saved && <div className="toolbar"><Reviewed log={saved} /><span className="small muted">You can still edit it; editing sends it for review again.</span></div>}
      <Field label="What did you work on? *"><textarea rows={4} value={form.summary} onChange={(e) => set('summary', e.target.value)} placeholder="e.g. Built the login API, fixed the date bug in attendance, read the MongoDB guide" required /></Field>
      <div className="row2">
        <Field label="Hours worked"><input type="number" min="0" max="24" step="0.5" value={form.hours} onChange={(e) => set('hours', e.target.value)} /></Field>
        <Field label="Links (GitHub, Figma, docs) - separate with spaces"><input value={form.links} onChange={(e) => set('links', e.target.value)} placeholder="https://github.com/..." /></Field>
      </div>
      {openTasks.length > 0 && <div>
        <div className="small" style={{ fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Which tasks did this cover?</div>
        <div className="toolbar">{openTasks.map((t) => (
          <button type="button" key={t._id} className={'btn sm ' + (form.tasks.includes(t._id) ? '' : 'ghost')} onClick={() => toggleTask(t._id)}>{form.tasks.includes(t._id) ? '\u{2713} ' : ''}{t.title}</button>))}</div>
      </div>}
      <div className="row2">
        <Field label="Anything blocking you?"><textarea rows={2} value={form.blockers} onChange={(e) => set('blockers', e.target.value)} placeholder="Leave empty if nothing" /></Field>
        <Field label="Plan for tomorrow"><textarea rows={2} value={form.tomorrow} onChange={(e) => set('tomorrow', e.target.value)} /></Field>
      </div>
      <div>
        <div className="small" style={{ fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>Attachments (screenshots, PDFs, code, docs - up to 10 files)</div>
        {form.attachments.length > 0 && <Files files={form.attachments} onRemove={removeFile} />}
        <label className="btn ghost sm" style={{ cursor: 'pointer' }}>{uploading ? 'Uploading...' : '+ Attach files'}<input type="file" multiple hidden disabled={uploading} onChange={addFiles} /></label>
      </div>
      {err && <div className="err">{err}</div>}
      <div><button className="btn" disabled={busy || uploading}>{busy ? 'Saving...' : saved ? 'Save changes' : 'Submit update'}</button></div>
    </form>

    <div className="card"><h3>My past updates<span className="spacer" /><span className="small muted">{history.length} update(s)</span></h3>
      {history.length ? <div className="list">{history.map((l) => (
        <div className="li" key={l._id} style={{ alignItems: 'flex-start' }}>
          <div className="date-chip"><b>{new Date(l.date + 'T00:00').getDate()}</b><span>{new Date(l.date + 'T00:00').toLocaleDateString('en', { month: 'short' })}</span></div>
          <div className="grow"><div className="toolbar"><b>{niceDay(l.date)}</b><span className="small muted">{l.hours} h</span><Reviewed log={l} /></div><LogBody log={l} /></div>
        </div>))}</div> : <Empty>No updates yet. Write your first one above.</Empty>}
    </div>
  </>);
}

// ---------- Leader / admin: review board ----------
function ReviewView() {
  const { user, isAdmin, toast } = useApp();
  const [day, setDay] = useState(localDay(0));
  const [who, setWho] = useState('');
  const [logs, reload] = useApi('/worklogs?' + (who ? 'user=' + who : 'date=' + day), [day, who]);
  const [missing, reloadMissing] = useApi('/worklogs/missing?date=' + day, [day]);
  const [people] = useApi('/users');
  const [fb, setFb] = useState({});
  if (!logs || !missing || !people) return <Loading />;

  const interns = people.filter((p) => ['intern', 'leader'].includes(p.role));
  const review = async (l) => {
    try { await api('/worklogs/' + l._id + '/review', { method: 'PATCH', body: { feedback: fb[l._id] || '' } }); setFb({ ...fb, [l._id]: '' }); reload(); toast('Marked as reviewed'); }
    catch (x) { toast(x.message); }
  };
  const remind = async () => { const r = await api('/worklogs/remind', { method: 'POST' }); toast('Reminder sent to ' + r.reminded + ' people'); };
  const canReview = (l) => isAdmin || (l.user && l.user._id !== user._id);
  const total = logs.length + (who ? 0 : missing.length);
  const hours = logs.reduce((s, l) => s + (l.hours || 0), 0);

  return (<>
    <div className="toolbar">
      <input type="date" className="search" style={{ minWidth: 'auto' }} value={day} disabled={!!who} onChange={(e) => setDay(e.target.value)} max={localDay(0)} />
      <select className="search" style={{ minWidth: 190 }} value={who} onChange={(e) => setWho(e.target.value)}>
        <option value="">Everyone (one day)</option>{interns.map((p) => <option key={p._id} value={p._id}>{p.name} (all days)</option>)}</select>
      <div className="spacer" />
      {day === localDay(0) && !who && missing.length > 0 && <button className="btn ghost" onClick={remind}>Remind {missing.length} who haven't written</button>}
      <button className="btn ghost" onClick={() => download('/worklogs/export.csv', 'work-updates.csv').catch((e) => toast(e.message))}>Download CSV</button>
    </div>
    {!who && <div className="grid g4">
      <Stat k="Submitted" v={logs.length + '/' + total} d={niceDay(day)} icon={'\u{1F4DD}'} bg="var(--brand-soft)" />
      <Stat k="Not yet" v={missing.length} d="no update" icon={'\u{23F3}'} bg="var(--amber-soft)" />
      <Stat k="Hours logged" v={hours} d="total" icon={'\u{1F552}'} bg="var(--blue-soft)" />
      <Stat k="Blocked" v={logs.filter((l) => l.blockers).length} d="need help" icon={'\u{26A0}'} bg="var(--red-soft)" />
    </div>}
    <div className={who ? '' : 'grid g21'}>
      <div className="card"><h3>{who ? 'All updates from ' + ((interns.find((p) => p._id === who) || {}).name || '') : 'Updates for ' + niceDay(day)}</h3>
        {logs.length ? <div className="list">{logs.map((l) => (
          <div className="li" key={l._id} style={{ alignItems: 'flex-start', borderLeft: l.blockers ? '3px solid var(--red)' : '3px solid transparent', paddingLeft: 10 }}>
            <Avatar sm name={l.user && l.user.name} />
            <div className="grow">
              <div className="toolbar"><b>{l.user && l.user.name}</b><span className="small muted">{l.team ? l.team.name : ''} - {who ? niceDay(l.date) + ' - ' : ''}{l.hours} h</span><span className="spacer" /><Reviewed log={l} /></div>
              <LogBody log={l} />
              {!l.reviewedAt && canReview(l) && <div className="toolbar" style={{ marginTop: 8 }}>
                <input className="search" style={{ flex: 1 }} placeholder="Feedback (optional)" value={fb[l._id] || ''} onChange={(e) => setFb({ ...fb, [l._id]: e.target.value })} />
                <button className="btn green sm" onClick={() => review(l)}>Mark reviewed</button></div>}
            </div>
          </div>))}</div> : <Empty>{who ? 'No updates from this person yet' : 'No updates for this day yet'}</Empty>}
      </div>
      {!who && <div className="card"><h3>Not submitted yet</h3>
        {missing.length ? <div className="list">{missing.map((p) => (
          <div className="li" key={p._id}><Avatar sm name={p.name} /><div className="grow"><div className="t">{p.name}</div><div className="s">{p.team ? p.team.name : 'No team'}</div></div>
            <button className="btn ghost sm" onClick={() => setWho(p._id)}>History</button></div>))}</div> : <Empty>Everyone has written their update</Empty>}
      </div>}
    </div>
  </>);
}

export default function WorkLog() {
  const { isIntern, isLeader } = useApp();
  const [tab, setTab] = useState('mine');
  if (isIntern) return <InternView />;
  if (!isLeader) return <ReviewView />;
  // Team leaders write their own update AND review their team
  return (<>
    <div className="toolbar">
      <button className={'btn ' + (tab === 'mine' ? '' : 'ghost')} onClick={() => setTab('mine')}>My update</button>
      <button className={'btn ' + (tab === 'team' ? '' : 'ghost')} onClick={() => setTab('team')}>Team updates</button>
    </div>
    {tab === 'mine' ? <InternView /> : <ReviewView />}
  </>);
}