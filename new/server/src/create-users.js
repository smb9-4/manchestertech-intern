// Temporary script to create/fix user accounts in MongoDB
// Run with: node src/create-users.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/internhub';

const users = [
  {
    name: 'ManTech Proprietor',
    email: 'proprietor@manchestertechnologies.in',
    password: 'tarunmallu@123',
    role: 'superadmin',
  },
  {
    name: 'Pallavi DS',
    email: 'pallavids359@gmail.com',
    password: '123456',
    role: 'intern',
  },
];

(async () => {
  console.log('Connecting to:', MONGO);
  await mongoose.connect(MONGO);
  const db = mongoose.connection.db;

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    const res = await db.collection('users').updateOne(
      { email: u.email },
      {
        $set: {
          name: u.name,
          email: u.email,
          password: hash,
          role: u.role,
          active: true,
          mustChangePassword: false,
          team: null,
          college: '',
          phone: '',
          rating: 0,
          feedback: '',
          profile: {},
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    console.log(`${u.email} -> ${res.upsertedCount ? 'CREATED' : 'UPDATED'} (role: ${u.role})`);
  }

  const all = await db.collection('users').find({}, { projection: { name: 1, email: 1, role: 1, active: 1 } }).toArray();
  console.log('\nAll users in DB:');
  all.forEach((u) => console.log(` - [${u.role}] ${u.email} | active: ${u.active}`));

  await mongoose.disconnect();
  console.log('\nDone.');
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });
