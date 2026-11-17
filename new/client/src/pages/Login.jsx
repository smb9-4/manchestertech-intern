import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import NetworkBg from '../components/NetworkBg';
import Icon from '../components/Icon';

export default function Login() {
  const { login } = useApp();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await login(email, password); nav('/'); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="lg-wrap">
      <section className="lg-brand">
        <NetworkBg opacity={0.9} />
        <div className="lg-glow" />
        <div className="lg-inner">
          <div className="lg-emblem"><img src="/icon-512.png" alt="Manchester Technologies" /></div>
          <div className="lg-word">Manchester<span>Tech</span></div>
          <div className="lg-pill">Innovate. Develop. Dominate.</div>
          <h2 className="lg-head">Your internship, <em>all in one place</em></h2>
          <ul className="lg-feats">
            <li><span className="lg-fi"><Icon e="check" /></span><div><b>Tasks & reviews</b><small>Get work assigned, submit it and get feedback.</small></div></li>
            <li><span className="lg-fi"><Icon e="pen" /></span><div><b>Daily work updates</b><small>Share what you did today with your leader.</small></div></li>
            <li><span className="lg-fi"><Icon e="chat" /></span><div><b>Meetings & team chat</b><small>Stay in touch with your team, on any device.</small></div></li>
          </ul>
          <div className="lg-foot">Intern Portal &middot; Manchester Technologies</div>
        </div>
      </section>
      <section className="lg-form-side">
        <form className="lg-form" onSubmit={submit}>
          <div>
            <div className="lg-kicker">Manchester Technologies</div>
            <h1>Welcome back</h1>
            <p className="muted">Log in with the email your programme admin registered.</p>
          </div>
          <label className="f">Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
          </label>
          <label className="f">
            <span style={{ display: 'flex', justifyContent: 'space-between' }}>Password<a href="/forgot-password" className="lg-link">Forgot password?</a></span>
            <span className="lg-pw">
              <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required />
              <button type="button" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
            </span>
          </label>
          {err && <div className="err">{err}</div>}
          <button className="lg-btn" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
          <p className="small muted" style={{ textAlign: 'center' }}>Trouble logging in? Contact your programme admin.</p>
        </form>
      </section>
    </div>
  );
}