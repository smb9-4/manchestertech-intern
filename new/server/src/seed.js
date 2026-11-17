const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
// Usage:
//   npm run seed            -> creates the admin account only (safe for real use)
//   npm run seed -- --demo  -> wipes the database and loads 4 teams, 20 interns and sample work
require('dotenv').config();
const mongoose = require('mongoose');
const M = require('./models');
const { today } = require('./services/time');

const NAMES = ['Arjun Mehta', 'Sneha Reddy', 'Rahul Verma', 'Ananya Iyer', 'Karthik Nair', 'Divya Rao', 'Vikram Singh', 'Meera Pillai', 'Rohan Gupta', 'Kavya Menon', 'Aditya Joshi', 'Pooja Desai', 'Nikhil Kumar', 'Isha Patel', 'Sai Teja', 'Lakshmi Prasad', 'Harsha Vardhan', 'Nandini Shah', 'Manoj Yadav', 'Ritika Bose'];
const TEAMS = [['Team Alpha', 'Web Development', '#4f46e5'], ['Team Beta', 'Mobile Apps', '#0284c7'], ['Team Gamma', 'Data & AI', '#16a34a'], ['Team Delta', 'UI / UX Design', '#d97706']];
const COLLEGES = ['JNTU Hyderabad', 'VIT Vellore', 'Osmania University', 'IIIT Bangalore', 'Anna University'];
const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const demo = process.argv.includes('--demo');
  if (demo) {
    for (const c of await mongoose.connection.db.collections()) await c.deleteMany({});
    console.log('Database cleared.');
  }
  const email = (process.env.ADMIN_EMAIL || 'admin@internhub.local').toLowerCase();
  let admin = await M.User.findOne({ email });
  if (!admin) {
    admin = await M.User.create({ name: process.env.ADMIN_NAME || 'Programme Admin', email, password: process.env.ADMIN_PASSWORD || 'Admin@12345', role: 'superadmin' });
    console.log(`Admin created: ${email}`);
  } else console.log(`Admin already exists: ${email}`);

  if (demo) {
    const teams = [];
    for (const [name, focus, color] of TEAMS) teams.push(await M.Team.create({ name, focus, color }));
    const interns = [];
    for (let i = 0; i < NAMES.length; i++) {
      const t = teams[Math.floor(i / 5)];
      interns.push(await M.User.create({
        name: NAMES[i], email: NAMES[i].toLowerCase().replace(' ', '.') + '@intern.local', password: 'Intern@123',
        role: i % 5 === 0 ? 'leader' : 'intern', team: t._id, college: COLLEGES[i % 5], rating: +(3.5 + ((i * 7) % 15) / 10).toFixed(1),
      }));
    }
    for (let k = 0; k < 4; k++) { teams[k].leader = interns[k * 5]._id; await teams[k].save(); }

    const projects = await M.Project.insertMany([
      { name: 'Internship Portal Website', description: 'Public site and intern login pages.', team: teams[0]._id, progress: 62, due: day(37) },
      { name: 'Attendance Mobile App', description: 'Android app for check-in / check-out.', team: teams[1]._id, progress: 41, status: 'At risk', due: day(45) },
      { name: 'Performance Analytics Model', description: 'Score interns on attendance, delivery and feedback.', team: teams[2]._id, progress: 55, due: day(53) },
      { name: 'Design System & Dashboards', description: 'Components and screen designs for the portal.', team: teams[3]._id, progress: 78, due: day(32) },
    ]);
    const statuses = ['todo', 'inprogress', 'submitted', 'approved', 'inprogress'];
    const titles = [['Login page with role redirect', 'REST API for interns', 'Landing page hero', 'MongoDB schema', 'README & setup guide'],
      ['Check-in screen UI', 'Geo-fence prototype', 'Push notifications', 'Offline mode', 'Play Store listing'],
      ['Clean attendance dataset', 'Baseline scoring model', 'Feature importance report', 'Model API', 'Dashboard charts'],
      ['Intern dashboard wireframes', 'Colour & type tokens', 'Chat screen designs', 'Icon set', 'Usability test plan']];
    const tasks = [];
    for (let k = 0; k < 4; k++) for (let j = 0; j < 5; j++) {
      tasks.push({ title: titles[k][j], project: projects[k]._id, team: teams[k]._id, assignee: interns[k * 5 + j]._id, createdBy: interns[k * 5]._id,
        due: day(j * 2 - 2), priority: ['High', 'Medium', 'Low'][j % 3], status: j === 0 ? 'approved' : statuses[(j + k) % 5] });
    }
    await M.Task.insertMany(tasks);

    // attendance for past working days
    const recs = [];
    for (let back = 10; back >= 1; back--) {
      const d = day(-back);
      if ([0, 6].includes(d.getDay())) continue;
      interns.forEach((u, i) => {
        const r = (i * 13 + back * 7) % 20;
        if (r === 0) return; // absent
        const ci = new Date(d); ci.setHours(r < 3 ? 10 : 9, (r * 3) % 60);
        const co = new Date(d); co.setHours(18, (r * 5) % 60);
        recs.push({ user: u._id, date: today(d), checkIn: ci, checkOut: co, status: r < 3 ? 'late' : 'present' });
      });
    }
    await M.Attendance.insertMany(recs);

    const at = (n, h, m) => { const d = day(n); d.setHours(h, m, 0, 0); return d; };
    await M.Meeting.insertMany([
      { title: 'Weekly All-Hands', agenda: 'Progress updates from each team.', start: at(1, 10, 0), duration: 45, team: null, createdBy: admin._id },
      { title: 'Team Alpha Stand-up', agenda: 'Blockers on the login flow.', start: at(1, 9, 30), duration: 15, team: teams[0]._id, createdBy: interns[0]._id },
      { title: 'Design Critique', agenda: 'Dashboard and chat screens.', start: at(3, 14, 0), duration: 60, team: teams[3]._id, createdBy: interns[15]._id },
    ]);
    await M.Message.insertMany([
      { channel: 'announcements', from: admin._id, text: 'Welcome to the internship programme! Please change your password after first login.' },
      { channel: 'general', from: interns[3]._id, text: 'Has anyone set up MongoDB Atlas yet?' },
      { channel: 'general', from: interns[12]._id, text: 'Yes, add your IP under Network Access.' },
      { channel: `team:${teams[0]._id}`, from: interns[0]._id, text: 'Stand-up tomorrow at 9:30, bring your blockers.' },
    ]);
    console.log('\nDemo data loaded. Logins:');
    console.log(`  Admin   ${email} / ${process.env.ADMIN_PASSWORD || 'Admin@12345'}`);
    console.log('  Leader  arjun.mehta@intern.local / Intern@123   (Team Alpha leader)');
    console.log('  Intern  sneha.reddy@intern.local / Intern@123');
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });

