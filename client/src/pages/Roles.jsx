import { useState } from 'react';
import { api } from '../api';
import { useApp } from '../context';
import { useApi, Avatar, Loading, Modal } from '../components/ui';

const PERMS = [
  ['View interns', 'All', 'Own team', 'Self'],
  ['Add / remove interns, reset passwords', '✅', '-', '-'],
  ['Create teams & choose leaders', '✅', '-', '-'],
  ['Create projects', '✅', '-', '-'],
  ['Update project progress', '✅', '✅ own team', '-'],
  ['Assign tasks', '✅', '✅ own team', '-'],
  ['Approve / reject submissions', '✅', '✅ own team', '-'],
  ['Submit work', '-', '✅', '✅'],
  ['Write daily work updates', '-', '✅', '✅'],
  ['Review work updates', 'Everyone', 'Own team', '-'],
  ['Schedule meetings', 'Everyone or any team', 'Own team', '-'],
  ['Post announcements', '✅', '-', '-'],
  ['Chat', 'All channels', 'General + own team + DMs', 'General + own team + DMs'],
  ['Rate interns & give feedback', '✅', '✅ own team', '-'],
  ['View audit log', '✅', '-', '-'],
];

const ROLE_LABEL = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  leader: 'Team Leader',
  intern: 'Intern',
};

const rolePillClass = (role) => {
  if (role === 'superadmin') return 'pill p-brand';
  if (role === 'admin') return 'pill p-blue';
  if (role === 'leader') return 'pill p-amber';
  return 'pill p-grey';
};

function ChangeRoleModal({ member, teams, onClose, onSave }) {
  const { user: me } = useApp();
  const [role, setRole] = useState(member.role);
  const [team, setTeam] = useState(member.team?._id || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    setBusy(true); setErr('');
    try {
      await onSave(member._id, { role, team: team || null });
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="overlay open" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <header>
          Edit {member.name}
          <button type="button" onClick={onClose}>✕</button>
        </header>
        <div className="body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <Avatar name={member.name} photo={member.profile?.photo} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{member.name}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{member.email}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{member.college || 'No college listed'}</div>
            </div>
          </div>

          <label className="f">
            Role
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="intern">Intern</option>
              <option value="leader">Team Leader</option>
              {me.role === 'superadmin' && <option value="admin">Admin</option>}
            </select>
          </label>

          <label className="f" style={{ marginTop: 14 }}>
            Team
            <select value={team} onChange={(e) => setTeam(e.target.value)}>
              <option value="">No team</option>
              {teams.map((t) => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </label>

          {err && <div className="err" style={{ marginTop: 12 }}>{err}</div>}
        </div>
        <footer>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn" onClick={handleSave} disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </footer>
      </div>
    </div>
  );
}

function BanConfirmModal({ member, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const isBanned = !member.active;

  const handleConfirm = async () => {
    setBusy(true);
    try { await onConfirm(); onClose(); }
    finally { setBusy(false); }
  };

  return (
    <div className="overlay open" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <header>
          {isBanned ? 'Restore Access' : 'Ban Member'}
          <button type="button" onClick={onClose}>✕</button>
        </header>
        <div className="body">
          {isBanned ? (
            <p>Restore access for <b>{member.name}</b>? They will be able to log in again.</p>
          ) : (
            <p>Ban <b>{member.name}</b> from the portal? They will not be able to log in until restored.</p>
          )}
        </div>
        <footer>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className={'btn' + (isBanned ? '' : ' red')} onClick={handleConfirm} disabled={busy}>
            {busy ? 'Working…' : isBanned ? 'Restore' : 'Ban member'}
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function Roles() {
  const { user: me, toast } = useApp();
  const [users, reload] = useApi('/users?all=1');
  const [teams] = useApi('/teams');
  const [tab, setTab] = useState('members');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null);

  const handleSaveRole = async (userId, changes) => {
    await api('/users/' + userId, { method: 'PATCH', body: changes });
    toast('Updated successfully');
    reload();
  };

  const handleBanToggle = async (member) => {
    await api('/users/' + member._id, { method: 'PATCH', body: { active: !member.active } });
    toast(member.active ? `${member.name} has been banned` : `${member.name}'s access restored`);
    reload();
  };

  if (!users || !teams) return <Loading />;

  const members = users.filter((u) => {
    if (String(u._id) === String(me._id)) return false; // don't show yourself
    if (u.role === 'superadmin') return false; // never show superadmin
    if (!q) return true;
    return (u.name + u.email + (u.role || '') + (u.team?.name || '')).toLowerCase().includes(q.toLowerCase());
  });

  return (
    <>
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <button
          className={'btn' + (tab === 'members' ? '' : ' ghost')}
          onClick={() => setTab('members')}
        >
          👥 Manage Members
        </button>
        <button
          className={'btn' + (tab === 'matrix' ? '' : ' ghost')}
          onClick={() => setTab('matrix')}
        >
          🔐 Permission Matrix
        </button>
      </div>

      {tab === 'members' && (
        <>
          <div className="toolbar" style={{ marginBottom: 16 }}>
            <input
              className="search"
              placeholder="Search by name, email, role or team…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {members.length === 0 ? (
            <div className="card">
              <div className="empty">{q ? 'No members match your search.' : 'No other members yet. Add interns from the Interns page.'}</div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 16,
              }}
            >
              {members.map((u) => (
                <div
                  key={u._id}
                  className="card"
                  style={{
                    padding: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    opacity: u.active ? 1 : 0.6,
                    borderLeft: u.active ? '3px solid var(--brand)' : '3px solid var(--red)',
                    position: 'relative',
                  }}
                >
                  {/* Banned badge */}
                  {!u.active && (
                    <div style={{
                      position: 'absolute', top: 10, right: 10,
                      background: 'var(--red)', color: '#fff',
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>
                      Banned
                    </div>
                  )}

                  {/* Avatar + name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar name={u.name} photo={u.profile?.photo} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                    </div>
                  </div>

                  {/* Role + Team badges */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className={rolePillClass(u.role)}>{ROLE_LABEL[u.role] || u.role}</span>
                    {u.team ? (
                      <span className="pill p-grey">🏢 {u.team.name}</span>
                    ) : (
                      <span className="pill p-grey" style={{ opacity: 0.5 }}>No team</span>
                    )}
                  </div>

                  {/* College */}
                  {u.college && (
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>🎓 {u.college}</div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
                    <button
                      className="btn ghost sm"
                      style={{ flex: 1 }}
                      onClick={() => setModal({ kind: 'edit', member: u })}
                    >
                      ✏️ Change role
                    </button>
                    <button
                      className={'btn sm' + (u.active ? ' red' : '')}
                      style={{ flex: 1 }}
                      onClick={() => setModal({ kind: 'ban', member: u })}
                    >
                      {u.active ? '🚫 Ban' : '✅ Restore'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'matrix' && (
        <>
          <div className="card" style={{ overflowX: 'auto' }}>
            <h3>Permission matrix</h3>
            <table>
              <thead>
                <tr>
                  <th>Permission</th>
                  <th>Admin</th>
                  <th>Team Leader</th>
                  <th>Intern</th>
                </tr>
              </thead>
              <tbody>
                {PERMS.map((p) => (
                  <tr key={p[0]}>
                    <td><b>{p[0]}</b></td>
                    {p.slice(1).map((x, i) => <td key={i}>{x}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="demo-note">
            These rules are enforced by the server, not just hidden in the UI. A Super Admin can also create other admins (Interns page → Add intern → Role).
          </div>
        </>
      )}

      {/* Change Role/Team Modal */}
      {modal?.kind === 'edit' && (
        <ChangeRoleModal
          member={modal.member}
          teams={teams}
          onClose={() => setModal(null)}
          onSave={handleSaveRole}
        />
      )}

      {/* Ban/Restore Confirm */}
      {modal?.kind === 'ban' && (
        <BanConfirmModal
          member={modal.member}
          onClose={() => setModal(null)}
          onConfirm={() => handleBanToggle(modal.member)}
        />
      )}
    </>
  );
}
