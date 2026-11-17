const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['superadmin', 'admin', 'leader', 'intern'], default: 'intern' },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  college: { type: String, default: '' },
  phone: { type: String, default: '' },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  feedback: { type: String, default: '' },
  active: { type: Boolean, default: true },
  mustChangePassword: { type: Boolean, default: false },
  profile: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 10);
});
userSchema.methods.checkPassword = function (pw) { return bcrypt.compare(pw, this.password); };
userSchema.virtual('isAdmin').get(function () { return ['admin', 'superadmin'].includes(this.role); });

module.exports = mongoose.model('User', userSchema);
