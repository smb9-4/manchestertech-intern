const isAdmin = (u) => ['admin', 'superadmin'].includes(u.role);

// write=true for posting, false for reading
function canUseChannel(user, channel, write = false) {
  if (!channel) return false;
  if (channel === 'general') return true;
  if (channel === 'announcements') return write ? isAdmin(user) : true;
  if (channel.startsWith('team:')) return isAdmin(user) || String(user.team) === channel.slice(5);
  if (channel.startsWith('dm:')) {
    const ids = channel.split(':').slice(1);
    return ids.length === 2 && ids.includes(String(user._id));
  }
  return false;
}
const dmChannel = (a, b) => 'dm:' + [String(a), String(b)].sort().join(':');
module.exports = { canUseChannel, dmChannel };
