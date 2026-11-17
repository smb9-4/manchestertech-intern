// Deletes EVERYTHING (teams, projects, interns, leaders, tasks, chats, updates...).
// Only the admin login is kept so you can still sign in.
// Usage (in the server folder):  node src/wipe-all.js
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');

const ADMIN = { role: { $in: ['admin', 'superadmin'] } };

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const users = db.collection('users');
  const cols = (await db.listCollections().toArray()).map((c) => c.name).filter((n) => !n.startsWith('system.'));

  const admins = await users.find(ADMIN).toArray();
  if (!admins.length) { console.log('No admin account found. Stopping so you are not locked out.'); return mongoose.disconnect(); }

  console.log('\nThis will DELETE:');
  console.log(`  ${'users (non-admin)'.padEnd(18)} ${await users.countDocuments({ role: { $nin: ['admin', 'superadmin'] } })}`);
  for (const n of cols) if (n !== 'users') console.log(`  ${n.padEnd(18)} ${await db.collection(n).countDocuments()}`);
  console.log('\nThis will KEEP only the admin login: ' + admins.map((u) => u.email).join(', '));

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((r) => rl.question('\nType DELETE (capital letters) to continue: ', r));
  rl.close();
  if (answer.trim() !== 'DELETE') { console.log('Cancelled. Nothing was deleted.'); return mongoose.disconnect(); }

  for (const n of cols) if (n !== 'users') await db.collection(n).deleteMany({});
  await users.deleteMany({ role: { $nin: ['admin', 'superadmin'] } });
  await users.updateMany(ADMIN, { $set: { team: null, profile: {} } });
  console.log('\nDone. Everything is deleted. Only the admin login is left.');
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });