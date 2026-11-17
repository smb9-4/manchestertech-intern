import { Link } from 'react-router-dom';
import NetworkBg from '../components/NetworkBg';
import Icon from '../components/Icon';

const TRACKS = [
  ['code', 'Web Development', 'Build fast, modern web apps with real code reviews.'],
  ['phone', 'Mobile Apps', 'Ship Android and iOS features used by real people.'],
  ['layers', 'UI / UX Design', 'Design clean screens, flows and design systems.'],
  ['chart', 'Data & AI', 'Work with data, dashboards and machine learning.'],
];
const STEPS = [
  ['Join your team', 'Your admin adds you to a team with a team leader.'],
  ['Get real tasks', 'Your leader assigns work on live projects, with due dates.'],
  ['Submit & get reviewed', 'Upload your work, get approved or clear feedback to improve.'],
  ['Grow every day', 'Write daily updates and watch your progress and score rise.'],
];
const FEATURES = [
  ['check', 'Tasks & reviews', 'See what to do, submit work and get feedback in one place.'],
  ['pen', 'Daily work updates', 'A short note each day so your leader always knows your progress.'],
  ['video', 'Meetings', 'Stand-ups and reviews with Google Meet links, right in the portal.'],
  ['chat', 'Team chat', 'WhatsApp-style chat with photos and files for your team.'],
  ['user', 'Your profile', 'Your details, photo and skills, kept private and secure.'],
  ['bell', 'Phone notifications', 'Install the app on your phone and never miss a task.'],
];
const ROLES = [
  ['cap', 'Interns', ['See your tasks and deadlines', 'Submit work and read feedback', 'Write daily work updates', 'Chat and join meetings']],
  ['users', 'Team leaders', ['Assign tasks to your team', 'Approve or send back work', 'Read daily updates', 'Rate and guide interns']],
  ['shield', 'Admins', ['Add interns in bulk from Excel', 'Manage teams and projects', 'Post notices to everyone', 'Full audit log and reports']],
];
const FAQ = [
  ['How do I get an account?', 'Your programme admin creates your account with your email. You will receive your login details from them.'],
  ['I forgot my password. What do I do?', 'Click "Forgot password?" on the login page and follow the link sent to your email.'],
  ['Can I use it on my phone?', 'Yes. Open the portal in your phone browser and tap "Install app" to add it to your home screen, then turn on notifications.'],
  ['Who can see my personal details?', 'Only you and the admins can see your address, date of birth and emergency contact. Team leaders see your skills and education only.'],
];

export default function Home() {
  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  return (
    <div className="hp">
      <header className="hp-nav">
        <div className="hp-wrap hp-nav-in">
          <a className="hp-brand" href="/"><img src="/icon-192.png" alt="" /><span>Manchester<b>Tech</b></span></a>
          <nav className="hp-links">
            <button onClick={() => go('tracks')}>Programme</button>
            <button onClick={() => go('how')}>How it works</button>
            <button onClick={() => go('features')}>Portal</button>
            <button onClick={() => go('faq')}>FAQ</button>
          </nav>
          <Link to="/login" className="hp-btn">Log in</Link>
        </div>
      </header>

      <section className="hp-hero">
        <NetworkBg density={1.1} opacity={0.8} />
        <div className="hp-hero-glow" />
        <div className="hp-wrap hp-hero-in">
          <div className="hp-pill">Innovate. Develop. Dominate.</div>
          <h1>Build <em>Real Products</em><br />Launch Your Tech Career</h1>
          <p>The Manchester Technologies internship programme. Work on live projects with mentors who review your code, guide your design and help you grow.</p>
          <div className="hp-cta">
            <Link to="/login" className="hp-btn lg">Log in to the portal <Icon e="arrow" size={16} /></Link>
            <button className="hp-btn ghost lg" onClick={() => go('how')}>How it works</button>
          </div>
          <div className="hp-trust"><span><i />Live projects</span><span>Mentor reviews</span><span>Daily progress tracking</span></div>
        </div>
      </section>

      <section className="hp-sec" id="tracks">
        <div className="hp-wrap">
          <div className="hp-kick">The programme</div>
          <h2>Four tracks. <em>One team.</em></h2>
          <p className="hp-sub">Join the team that matches your skills and work alongside a team leader on a real project.</p>
          <div className="hp-grid4">
            {TRACKS.map(([ic, t, d]) => <div className="hp-card" key={t}><span className="hp-ic"><Icon e={ic} size={22} /></span><h3>{t}</h3><p>{d}</p></div>)}
          </div>
        </div>
      </section>

      <section className="hp-sec alt" id="how">
        <div className="hp-wrap">
          <div className="hp-kick">How it works</div>
          <h2>From day one to <em>done</em></h2>
          <div className="hp-steps">
            {STEPS.map(([t, d], i) => <div className="hp-step" key={t}><div className="hp-num">{String(i + 1).padStart(2, '0')}</div><h3>{t}</h3><p>{d}</p></div>)}
          </div>
        </div>
      </section>

      <section className="hp-sec" id="features">
        <div className="hp-wrap">
          <div className="hp-kick">The portal</div>
          <h2>Everything your internship needs, <em>in one place</em></h2>
          <div className="hp-grid3">
            {FEATURES.map(([ic, t, d]) => <div className="hp-feat" key={t}><span className="hp-ic sm"><Icon e={ic} size={18} /></span><div><h3>{t}</h3><p>{d}</p></div></div>)}
          </div>
        </div>
      </section>

      <section className="hp-sec alt">
        <div className="hp-wrap">
          <div className="hp-kick">Built for everyone</div>
          <h2>One portal, <em>three roles</em></h2>
          <div className="hp-grid3">
            {ROLES.map(([ic, t, list]) => <div className="hp-card role" key={t}><span className="hp-ic"><Icon e={ic} size={22} /></span><h3>{t}</h3><ul>{list.map((x) => <li key={x}><Icon e="check" size={15} />{x}</li>)}</ul></div>)}
          </div>
        </div>
      </section>

      <section className="hp-sec" id="faq">
        <div className="hp-wrap hp-narrow">
          <div className="hp-kick">FAQ</div>
          <h2>Questions? <em>Answers.</em></h2>
          <div className="hp-faq">
            {FAQ.map(([q, a]) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>

      <section className="hp-band">
        <div className="hp-wrap hp-band-in">
          <div><h2>Ready to get to work?</h2><p>Log in with the email your programme admin registered.</p></div>
          <Link to="/login" className="hp-btn lg">Log in to the portal <Icon e="arrow" size={16} /></Link>
        </div>
      </section>

      <footer className="hp-foot">
        <div className="hp-wrap hp-foot-in">
          <span className="hp-brand sm"><img src="/icon-192.png" alt="" /><span>Manchester<b>Tech</b></span></span>
          <span>&copy; {new Date().getFullYear()} Manchester Technologies &middot; Intern Portal</span>
        </div>
      </footer>
    </div>
  );
}