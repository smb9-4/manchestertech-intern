// Sends email through Brevo's HTTPS API (works on Render's free plan, which blocks SMTP).
// Needs BREVO_API_KEY and MAIL_FROM (a sender address verified in Brevo).
// If they are missing, emails are skipped and only logged, so the app keeps working.
const API = process.env.MAIL_API_URL || 'https://api.brevo.com/v3/smtp/email';

const enabled = () => !!(process.env.BREVO_API_KEY && process.env.MAIL_FROM);
const appUrl = () => (
  process.env.APP_URL ||
  process.env.CLIENT_URL ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  'http://localhost:5173'
).replace(/\/+$/, '');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function layout(title, bodyHtml, button) {
  const brand = esc(process.env.MAIL_FROM_NAME || 'Manchester Technologies');
  return `<div style="background:#f4f5fb;padding:24px;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e6e8f2">
    <div style="background:#14162b;color:#fff;padding:18px 24px;font-weight:bold;font-size:16px">${brand} <span style="color:#c9a24d;font-size:12px;letter-spacing:2px">INTERN PORTAL</span></div>
    <div style="padding:24px;color:#14162b;font-size:14px;line-height:1.6">
      <h2 style="margin:0 0 12px;font-size:18px">${esc(title)}</h2>
      ${bodyHtml}
      ${button ? `<p style="margin:22px 0 6px"><a href="${esc(button.url)}" style="background:#4f46e5;color:#fff;padding:11px 18px;border-radius:8px;text-decoration:none;font-weight:bold">${esc(button.label)}</a></p>` : ''}
    </div>
    <div style="padding:14px 24px;color:#6b6f8a;font-size:12px;border-top:1px solid #e6e8f2">This is an automatic message from the intern portal.</div>
  </div></div>`;
}

async function sendMail({ to, name, subject, title, html, button }) {
  if (!to) return { skipped: 'no address' };
  if (!enabled()) { console.log(`[mail skipped: email not set up] to=${to} subject="${subject}"`); return { skipped: 'disabled' }; }
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: process.env.MAIL_FROM, name: process.env.MAIL_FROM_NAME || 'Manchester Technologies' },
        to: [{ email: to, name: name || to }],
        subject,
        htmlContent: layout(title || subject, html, button),
      }),
    });
    if (!res.ok) { console.error('Mail failed:', res.status, (await res.text()).slice(0, 200)); return { error: res.status }; }
    return { ok: true };
  } catch (e) { console.error('Mail failed:', e.message); return { error: e.message }; }
}

// Send to many people, a few at a time
async function sendMany(list) {
  for (let i = 0; i < list.length; i += 5) await Promise.all(list.slice(i, i + 5).map(sendMail));
}

module.exports = { sendMail, sendMany, enabled, appUrl, esc };