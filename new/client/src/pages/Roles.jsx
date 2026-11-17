const PERMS = [
  ['View interns', 'All', 'Own team', 'Self'], ['Add / remove interns, reset passwords', '\u2705', '-', '-'],
  ['Create teams & choose leaders', '\u2705', '-', '-'], ['Create projects', '\u2705', '-', '-'],
  ['Update project progress', '\u2705', '\u2705 own team', '-'], ['Assign tasks', '\u2705', '\u2705 own team', '-'],
  ['Approve / reject submissions', '\u2705', '\u2705 own team', '-'], ['Submit work', '-', '\u2705', '\u2705'],
  ['Write daily work updates', '-', '\u2705', '\u2705'], ['Review work updates', 'Everyone', 'Own team', '-'],
  ['Schedule meetings', 'Everyone or any team', 'Own team', '-'], ['Post announcements', '\u2705', '-', '-'],
  ['Chat', 'All channels', 'General + own team + DMs', 'General + own team + DMs'],
  
  ['Rate interns & give feedback', '\u2705', '\u2705 own team', '-'], ['View audit log', '\u2705', '-', '-'],
];
export default function Roles() {
  return (
    <>
      <div className="card" style={{ overflowX: 'auto' }}>
        <h3>Permission matrix</h3>
        <table><thead><tr><th>Permission</th><th>Admin</th><th>Team Leader</th><th>Intern</th></tr></thead>
          <tbody>{PERMS.map((p) => <tr key={p[0]}><td><b>{p[0]}</b></td>{p.slice(1).map((x, i) => <td key={i}>{x}</td>)}</tr>)}</tbody></table>
      </div>
      <div className="demo-note">These rules are enforced by the server, not just hidden in the UI. A Super Admin can also create other admins (Interns page, Add intern, Role).</div>
    </>
  );
}