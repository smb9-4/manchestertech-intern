// All "today" logic uses the programme timezone (default Asia/Kolkata)
const TZ = () => process.env.TIMEZONE || 'Asia/Kolkata';
function today(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
function hhmm(d = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ(), hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}
// Mon–Fri days from programme start up to and including today
function workingDaysSoFar() {
  const start = new Date((process.env.PROGRAM_START || today()) + 'T00:00:00');
  const end = new Date(today() + 'T00:00:00');
  let n = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const w = d.getDay();
    if (w !== 0 && w !== 6) n++;
  }
  return Math.max(n, 1);
}
module.exports = { today, hhmm, workingDaysSoFar };
