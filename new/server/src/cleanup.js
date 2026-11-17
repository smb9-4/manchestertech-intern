// Removes the demo people and all activity, keeps admins, teams and projects.
// Usage (in the server folder):  node src/cleanup.js
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');

const ACTIVITY = ['tasks', 'worklogs', 'taskcomments', 'messages', 'chatfiles', 'meetings', 'announcements',
  'notifications', 'auditlogs', 'attendances', 'documents', 'passwordresets'];
const DEMO = { email: /@intern\.local$/i };

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const users = db.collection('users');
  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));

  console.log('\nThis will DELETE:');
  console.log(`  Demo people (@intern.local): ${await users.countDocuments(DEMO)}`);
  for (const name of ACTIVITY) if (existing.has(name)) console.log(`  ${name.padEnd(14)} ${await db.collection(name).countDocuments()}`);
  console.log('\nThis will KEEP:');
  console.log(`  Admins:        ${(await users.find({ role: { $in: ['admin', 'superadmin'] } }).toArray()).map((u) => u.email).join(', ') || 'none!'}`);
  console.log(`  Teams:         ${await db.collection('teams').countDocuments()} (leaders cleared)`);
  console.log(`  Projects:      ${await db.collection('projects').countDocuments()} (progress reset to 0%)`);
  const others = await users.find({ role: { $in: ['intern', 'leader'] }, email: { $not: /@intern\.local$/i } }).toArray();
  console.log(`  Other interns: ${others.length}${others.length ? ' (' + others.map((u) => u.email).join(', ') + ')' : ''}`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((r) => rl.question('\nType DELETE to continue (anything else cancels): ', r));
  rl.close();
  if (answer.trim() !== 'DELETE') { console.log('Cancelled. Nothing was deleted.'); return mongoose.disconnect(); }

  const removed = await users.deleteMany(DEMO);
  for (const name of ACTIVITY) if (existing.has(name)) await db.collection(name).deleteMany({});
  await db.collection('teams').updateMany({}, { $set: { leader: null } });
  await db.collection('projects').updateMany({}, { $set: { progress: 0, status: 'On track' } });
  // Remaining interns lose ratings/feedback from the demo period
  await users.updateMany({ role: { $in: ['intern', 'leader'] } }, { $set: { rating: 0, feedback: '', role: 'intern' } });
  console.log(`\nDone. Removed ${removed.deletedCount} demo people and all activity. Teams and projects are kept.`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });