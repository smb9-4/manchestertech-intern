import { useState } from 'react';
import { api } from '../api';

function Shell({ children }) {
  return <div className="login-wrap"><div className="login">{children}<p className="small muted"><a href="/login">Back to log in</a></p></div></div>;
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { const r = await api('/password/forgot', { method: 'POST', body: { email } }); setMsg(r.message); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return <Shell>
    <div><h1>Forgot password</h1><p className="muted">Enter your email and we will send you a link to choose a new password.</p></div>
    {msg ? <div className="demo-note" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>{msg}</div> : (
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label className="f">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></label>
        {err && <div className="err">{err}</div>}
        <button className="btn" style={{ justifyContent: 'center', padding: 11 }} disabled={busy}>{busy ? 'Sending...' : 'Send reset link'}</button>
      </form>)}
  </Shell>;
}

export function ResetPassword() {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (pw !== pw2) return setErr('The two passwords do not match');
    setBusy(true);
    try { await api('/password/reset', { method: 'POST', body: { token, password: pw } }); setDone(true); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return <Shell>
    <div><h1>Choose a new password</h1><p className="muted">At least 8 characters.</p></div>
    {done ? <>
      <div className="demo-note" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>Password changed. You can log in now.</div>
      <a className="btn" href="/login" style={{ justifyContent: 'center', textDecoration: 'none' }}>Go to log in</a>
    </> : !token ? <div className="err">This reset link is incomplete. Please use the link from the email, or request a new one.</div> : (
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label className="f">New password<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} autoFocus /></label>
        <label className="f">Type it again<input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={8} /></label>
        {err && <div className="err">{err}</div>}
        <button className="btn" style={{ justifyContent: 'center', padding: 11 }} disabled={busy}>{busy ? 'Saving...' : 'Save new password'}</button>
      </form>)}
  </Shell>;
}