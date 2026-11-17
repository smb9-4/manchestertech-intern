const { Notification, User, Team } = require('../models');
const { sendPush } = require('./push');

// notify([userIds], {icon,title,body,link})
async function notify(userIds, data) {
  const ids = [...new Set(userIds.filter(Boolean).map(String))];
  const docs = await Notification.insertMany(ids.map((user) => ({ user, ...data })));
  const { emitToUser } = require('./socket');
  docs.forEach((n) => emitToUser(n.user, 'notification', n));
  sendPush(ids, data).catch(() => {});
  return docs;
}
async function adminIds() { return (await User.find({ role: { $in: ['admin', 'superadmin'] }, active: true }).select('_id')).map((u) => u._id); }
async function teamIds(teamId) {
  const q = { active: true };
  if (teamId) q.team = teamId;
  return (await User.find(q).select('_id')).map((u) => u._id);
}

async function notifyChat(channel, sender, text) {
  const senderId = String(sender._id);
  let recipients = [];
  let roomName = 'Everyone';

  if (channel === 'general') {
    recipients = (await User.find({ active: true }).select('_id')).map((user) => user._id);
  } else if (channel.startsWith('team:')) {
    const teamId = channel.slice(5);
    const [members, admins, team] = await Promise.all([
      teamIds(teamId),
      adminIds(),
      Team.findById(teamId).select('name'),
    ]);
    recipients = [...members, ...admins];
    roomName = team?.name || 'team';
  } else if (channel.startsWith('dm:')) {
    recipients = channel.split(':').slice(1).filter((id) => id !== senderId);
    roomName = '';
  } else return [];

  recipients = recipients.filter((id) => String(id) !== senderId);
  const message = String(text || '').trim().slice(0, 120) || 'Shared an attachment';
  const senderName = sender.name || 'A team member';
  return notify(recipients, {
    icon: '💬',
    title: roomName ? `New message in ${roomName}` : `Message from ${senderName}`,
    body: roomName ? `${senderName}: ${message}` : message,
    link: `/chat?channel=${encodeURIComponent(channel)}`,
  });
}

module.exports = { notify, notifyChat, adminIds, teamIds };
