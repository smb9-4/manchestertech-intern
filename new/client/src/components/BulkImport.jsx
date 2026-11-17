import { useState } from 'react';
import { api } from '../api';
import { useApp } from '../context';

const HEADERS = {
  name: ['name', 'full name', 'intern name', 'student name'],
  email: ['email', 'email id', 'email address', 'mail', 'e-mail'],
  college: ['college', 'university', 'institute', 'college name'],
  phone: ['phone', 'mobile', 'phone number', 'mobile number', 'contact'],
  team: ['team', 'team name', 'group'],
};
const TEMPLATE = 'Name,Email,College,Phone,Team\nAsha Rao,asha.rao@college.edu,JNTU Hyderabad,9876543210,Team Alpha\nRavi Kumar,ravi.kumar@college.edu,VIT Vellore,9123456780,Team Beta\n';

function parseCSV(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function toObjects(grid) {
  const head = (grid[0] || []).map((h) => String(h == null ? '' : h).trim().toLowerCase());
  const col = {};
  for (const [key, names] of Object.entries(HEADERS)) col[key] = head.findIndex((h) => names.includes(h));
  if (col.name < 0 || col.email < 0) throw new Error('The first row must have "Name" and "Email" columns. Download the template to see the format.');
  return grid.slice(1).map((r) => Object.fromEntries(Object.entries(col).map(([k, i]) => [k, i >= 0 && r[i] != null ? String(r[i]).trim() : ''])))
    .filter((o) => o.name || o.email);
}

function saveFile(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function BulkImport({ teams, onClose, onDone }) {
  const { toast } = useApp();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const teamNames = new Set(teams.map((t) => t.name.trim().toLowerCase()));

  const check = (r, i, all) => {
    if (!r.name) return 'Name missing';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) return 'Bad email';
    if (all.findIndex((x) => x.email.toLowerCase() === r.email.toLowerCase()) !== i) return 'Duplicate in file';
    if (r.team && !teamNames.has(r.team.toLowerCase())) return 'Unknown team';
    return '';
  };

  const onFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setErr(''); setRows(null); setResult(null);
    try {
      let grid;
      if (/\.xlsx$/i.test(file.name)) {
        const { readSheet } = await import('read-excel-file/browser');
        grid = await readSheet(file);
      } else if (/\.csv$/i.test(file.name)) {
        grid = parseCSV(await file.text());
      } else throw new Error('Please choose a .xlsx or .csv file (in Excel: File > Save As > Excel Workbook or CSV).');
      const objs = toObjects(grid);
      if (!objs.length) throw new Error('No interns found in the file.');
      setRows(objs);
    } catch (x) { setErr(x.message); }
    e.target.value = '';
  };

  const doImport = async () => {
    setBusy(true); setErr('');
    try {
      const r = await api('/bulk-users', { method: 'POST', body: { rows } });
      setResult(r); onDone();
      toast(`${r.created.length} intern(s) added`);
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  const loginsCSV = () => 'Name,Email,Team,Temporary password,Portal\n' + result.created.map((c) =>
    [c.name, c.email, c.team, c.tempPassword, window.location.origin].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

  const problems = rows ? rows.filter((r, i) => check(r, i, rows)).length : 0;

  return (
    <div className="overlay open" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 860 }}>
        <header>Bulk add interns<button type="button" onClick={onClose}>&times;</button></header>
        <div className="body">
          {!result && <>
            <div className="demo-note" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}>
              Columns: <b>Name</b>, <b>Email</b> (required), College, Phone, Team. Team must match an existing team name exactly, e.g. <b>{teams[0] ? teams[0].name : 'Team Alpha'}</b>, or be left empty.
            </div>
            <div className="toolbar">
              <button type="button" className="btn ghost" onClick={() => saveFile('interns-template.csv', TEMPLATE)}>Download template</button>
              <label className="btn" style={{ cursor: 'pointer' }}>Choose Excel / CSV file<input type="file" accept=".xlsx,.csv" hidden onChange={onFile} /></label>
            </div>
          </>}
          {err && <div className="err">{err}</div>}

          {rows && !result && <>
            <div className="small"><b>{rows.length}</b> row(s) found{problems ? <>, <b style={{ color: 'var(--red)' }}>{problems} with problems</b> (they will be skipped)</> : ', all look good'}.</div>
            <div style={{ maxHeight: 340, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 10 }}>
              <table><thead><tr><th>#</th><th>Name</th><th>Email</th><th>College</th><th>Phone</th><th>Team</th><th>Check</th></tr></thead>
                <tbody>{rows.map((r, i) => { const p = check(r, i, rows); return (
                  <tr key={i} style={{ background: p ? 'var(--red-soft)' : undefined }}>
                    <td>{i + 2}</td><td>{r.name}</td><td>{r.email}</td><td>{r.college}</td><td>{r.phone}</td><td>{r.team || '-'}</td>
                    <td>{p ? <span className="pill p-red">{p}</span> : <span className="pill p-green">OK</span>}</td></tr>); })}</tbody></table>
            </div>
            <div className="small muted">Emails that are already registered are also skipped; the server checks that during import.</div>
          </>}

          {result && <>
            <div className="grid g2">
              <div className="card stat"><div className="k">Added</div><div className="v" style={{ color: 'var(--green)' }}>{result.created.length}</div><div className="d">accounts created</div></div>
              <div className="card stat"><div className="k">Skipped</div><div className="v" style={{ color: result.skipped.length ? 'var(--red)' : 'inherit' }}>{result.skipped.length}</div><div className="d">rows not imported</div></div>
            </div>
            {result.created.length > 0 && <>
              <div className="demo-note">Download the logins now. Temporary passwords are shown only once. Interns will be asked to change their password after logging in.</div>
              <div className="toolbar">
                <button type="button" className="btn" onClick={() => saveFile('intern-logins.csv', loginsCSV())}>Download logins (Excel)</button>
                <button type="button" className="btn ghost" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(result.created.map((c) => `${c.name}\nPortal: ${window.location.origin}\nEmail: ${c.email}\nPassword: ${c.tempPassword}\n`).join('\n')); toast('Copied'); }}>Copy all logins</button>
              </div>
            </>}
            {result.skipped.length > 0 && <div style={{ maxHeight: 220, overflow: 'auto' }}><table><thead><tr><th>Row</th><th>Name</th><th>Email</th><th>Reason</th></tr></thead>
              <tbody>{result.skipped.map((s, i) => <tr key={i}><td>{s.row}</td><td>{s.name}</td><td>{s.email}</td><td><span className="pill p-red">{s.reason}</span></td></tr>)}</tbody></table></div>}
          </>}
        </div>
        <footer>
          <button type="button" className="btn ghost" onClick={onClose}>{result ? 'Close' : 'Cancel'}</button>
          {rows && !result && <button type="button" className="btn" disabled={busy || problems === rows.length} onClick={doImport}>{busy ? 'Importing...' : `Import ${rows.length - problems} intern(s)`}</button>}
        </footer>
      </div>
    </div>
  );
}