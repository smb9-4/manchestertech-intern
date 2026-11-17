// Creates Google Calendar events with a Google Meet link.
// Needs GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN (see README).
// If they are not set, meetings are still saved and the admin can paste a Meet link by hand.
const { google } = require('googleapis');

function enabled() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);
}
function calendar() {
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.calendar({ version: 'v3', auth });
}

async function createMeetEvent({ title, agenda, start, duration, attendees }) {
  const end = new Date(start.getTime() + duration * 60000);
  const res = await calendar().events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    conferenceDataVersion: 1,
    sendUpdates: 'all',
    requestBody: {
      summary: title,
      description: agenda,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      attendees: attendees.map((email) => ({ email })),
      conferenceData: { createRequest: { requestId: 'ih-' + Date.now(), conferenceSolutionKey: { type: 'hangoutsMeet' } } },
    },
  });
  return { id: res.data.id, link: res.data.hangoutLink || '' };
}

async function deleteEvent(id) {
  if (!enabled() || !id) return;
  await calendar().events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary', eventId: id, sendUpdates: 'all' }).catch(() => {});
}

module.exports = { enabled, createMeetEvent, deleteEvent };
