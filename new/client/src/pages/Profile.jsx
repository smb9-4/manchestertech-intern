import { useState } from 'react';
import { useApp } from '../context';
import { api } from '../api';
import { useApi, Loading } from '../components/ui';
import { ProfileForm, ProfileHeader } from '../components/ProfileForm';

export default function Profile() {
  const { user, isAdmin, refreshMe, toast } = useApp();
  const [data, , , setData] = useApi('/profile/me');
  const [pw, setPw] = useState({ current: '', next: '' });
  const [err, setErr] = useState('');
  if (!data) return <Loading />;

  const save = async (body) => {
    const d = await api('/profile/me', { method: 'PUT', body });
    setData(d); await refreshMe(); toast('Profile saved');
  };
  const change = async (e) => {
    e.preventDefault(); setErr('');
    try { await api('/auth/change-password', { method: 'POST', body: pw }); setPw({ current: '', next: '' }); await refreshMe(); toast('Password changed'); } catch (x) { setErr(x.message); }
  };

  return (<>
    <ProfileHeader data={data} onPhoto={async (photo) => { const d = await api('/profile/me', { method: 'PUT', body: { profile: { photo } } }); setData(d); await refreshMe(); toast(photo ? 'Photo updated' : 'Photo removed'); }} />
    {data.completeness < 100 && !isAdmin && <div className="demo-note">Please complete your profile. Fields marked <b style={{ color: 'var(--red)' }}>*</b> are required. Your address, date of birth and emergency contact are visible only to you and the admins.</div>}
    <ProfileForm data={data} editable adminMode={isAdmin} onSave={save} />
    <form className="card" onSubmit={change} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520 }}>
      <h3>Change password</h3>
      {user.mustChangePassword && <div className="demo-note">You're on a temporary password. Please set your own.</div>}
      <label className="f">Current password<input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /></label>
      <label className="f">New password (min 8 characters)<input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={8} /></label>
      {err && <div className="err">{err}</div>}
      <div><button className="btn">Change password</button></div>
    </form>
  </>);
}