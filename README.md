# InternHub: Internship Management Portal

One website for running an internship programme of 15–50 people. It has three roles: **Admin**, **Team Leader** and **Intern**.

**Stack:** React (Vite) · Node.js + Express · MongoDB (Mongoose) · Socket.IO · Google Calendar API (for Meet links)

## What's included

| Module | What works |
|---|---|
| Login & roles | Email + password login (JWT). The server enforces Super Admin / Admin / Team Leader / Intern permissions. New users get a temporary password and are asked to change it. |
| Admin panel | Add/remove interns, reset passwords, create teams, choose leaders, move people between teams |
| Dashboards | A different dashboard for admin, leader and intern |
| Projects | Create projects per team, track progress and status (On track / At risk / Completed) |
| Tasks | Kanban board. Leader assigns → intern starts → submits a file/note → leader approves, or rejects with feedback |
| Attendance | Self check-in/out (late after 10:00, configurable). Leaders can mark people manually, see history, and remind people who haven't checked in |
| Meetings | Schedule for everyone or one team. Google Meet links are created automatically once Google is connected; until then, paste a link |
| Chat | Live chat (Socket.IO): announcements (admin only), #general, a channel per team, and direct messages |
| Notifications | Live bell for new tasks, submissions, approvals, meetings, announcements and reminders |
| Documents | Upload/download files (Learning, Project, Policy). Team-only files stay private to that team |
| Reports | Leaderboard and per-team charts. Score = 30% attendance + 40% approved tasks + 30% leader rating. Download as CSV (opens in Excel) |
| Performance | Leaders rate interns (0–5) and write feedback; interns see their own score |

---

## 1. Run it on your laptop (about 30 minutes)

**You need:** Node.js 18 or newer (`node -v`) and a MongoDB database.

**MongoDB (free):** create a free cluster on MongoDB Atlas.
1. Create a database user.
2. Under *Network Access*, add your IP (or `0.0.0.0/0` while developing).
3. Copy the connection string (`mongodb+srv://...`).

You can use a local MongoDB instead: `mongodb://127.0.0.1:27017/internhub`.

```bash
cd internhub
npm run install-all

cp server/.env.example server/.env
# edit server/.env → set MONGO_URI, JWT_SECRET (any long random text), ADMIN_EMAIL, ADMIN_PASSWORD

npm run seed:demo          # loads 4 teams + 20 sample interns (WIPES the database)

# terminal 1
cd server && npm run dev   # API on http://localhost:5000
# terminal 2
cd client && npm run dev   # open http://localhost:5173
```

**Demo logins** (after `seed:demo`):

| Role | Email | Password |
|---|---|---|
| Super Admin | value of `ADMIN_EMAIL` | value of `ADMIN_PASSWORD` |
| Team Leader (Team Alpha) | arjun.mehta@intern.local | Intern@123 |
| Intern (Team Alpha) | sneha.reddy@intern.local | Intern@123 |

To see live chat working, open two different browsers (or one normal and one private window), log in as two people, and send a message.

## 2. Start with your real interns

```bash
npm run seed      # creates ONLY your admin account; doesn't touch other data
```

Use `npm run seed` (not `seed:demo`) on your real database. Then log in as admin and:
1. **Teams** → *New team*. Create your teams.
2. **Interns** → *Add intern*. Each intern gets a temporary password. Click *Copy* and send it to them by WhatsApp or email.
3. **Teams** → *Make leader*. Pick a leader for each team.
4. **Projects** → *New project*. Create one per team. Leaders can then assign tasks.

Set `PROGRAM_START` in `.env` to your first internship day; attendance % is counted from that date (Mon–Fri).

## 3. Connect Google Meet (optional, about 20 minutes)

Without this, meetings still work: you paste a Meet link when scheduling. With it, the portal creates the Calendar event and Meet link itself, and emails invites to everyone.

1. Go to console.cloud.google.com and create a project.
2. In *APIs & Services → Library*, enable the **Google Calendar API**.
3. In *OAuth consent screen*, choose External, fill in the app name and your email, and add your Gmail as a test user.
4. In *Credentials → Create credentials → OAuth client ID*:
   - Type: **Web application**.
   - Authorised redirect URI: `https://developers.google.com/oauthplayground`
   - Copy the Client ID and Client Secret.
5. Open developers.google.com/oauthplayground.
   - Click ⚙ and tick *Use your own OAuth credentials*, then paste the ID and secret.
   - In the scope box type `https://www.googleapis.com/auth/calendar.events`, then click *Authorize APIs* and sign in with the Google account that will host the meetings.
   - Click *Exchange authorization code for tokens* and copy the **Refresh token**.
6. Put the three values in `server/.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`) and restart the server. The Meetings page will show "Google Calendar connected".

> **Important:** while the consent screen is in *Testing* mode, Google expires the refresh token after 7 days. Before going live, click **Publish app** on the consent screen. Google will show an "unverified app" warning; that's fine for your own account. Then get a fresh refresh token (step 5).

## 4. Put it online (one service)

The server also serves the built React app, so you deploy **one** web service. On Render.com (other hosts work the same way):

1. Push this folder to a GitHub repo. `.env` is git-ignored; don't commit it.
2. In Render, choose **New → Web Service** and pick the repo.
   - Build command: `npm run build`
   - Start command: `npm start`
3. Under **Environment**, add every variable from `server/.env`. Set `CLIENT_URL` to your Render URL (e.g. `https://internhub.onrender.com`).
4. In MongoDB Atlas *Network Access*, allow `0.0.0.0/0`, or your host's outbound IPs.
5. Open the URL and log in.

**Two things to know about free hosting:**
- **Uploaded files disappear on redeploy**, because free instances have no permanent disk. Before relying on uploads, either add a persistent disk to the service or move storage to Cloudinary/S3. Only `server/src/routes/documents.js` needs to change.
- **Free instances sleep** after inactivity, so the first visit takes about 30–60 seconds. A paid instance avoids this.

## Deploy to Vercel (two services)

The root `vercel.json` defines a Vite client and an Express server. Import the repository root as the Vercel project root; the client is public on all non-API paths, while the server is routed only for `/api/*` and `/socket.io/*`. No service bindings are needed because the browser calls the server through same-origin public routes.

Add `MONGO_URI` and `JWT_SECRET` to the server service's environment variables, plus any optional integrations from `server/.env`. Set `CLIENT_URL` to the site's production origin when using a custom domain; Vercel deployment URLs are also allowed automatically. Run `vercel dev` from the repository root to test both services together.

Vercel's function filesystem is temporary, so document and chat uploads need external storage (such as Cloudinary or S3) for production. Socket.IO uses WebSockets and a MongoDB adapter on Vercel to share chat events across function instances; the configured MongoDB deployment must be a replica set or sharded cluster (MongoDB Atlas supports this).

---

## Your 2-day plan

| When | Do this |
|---|---|
| **Day 1 morning** | Run it locally (section 1). Click through all three roles with the demo data. |
| **Day 1 afternoon** | Change what you want: the colours in `client/src/styles.css`, the name/logo in `Layout.jsx` and `Login.jsx`, the late-arrival time in `.env`. |
| **Day 1 evening** | Set up Google Meet (section 3). Schedule a test meeting and check the invite email arrives. |
| **Day 2 morning** | Deploy (section 4) with an empty Atlas database → `npm run seed` → create real teams and interns. |
| **Day 2 afternoon** | Test with 2–3 real interns on their phones: login, check-in, chat, submit a task. Fix anything confusing. |
| **Day 2 evening** | Send everyone their login details. Post a welcome announcement. |

## Not included yet (good next steps)

- **Emails:** login details and password resets are shown to the admin to share by hand. Add Nodemailer or Resend to email them automatically.
- **"Forgot password" self-service:** right now the admin resets it.
- **Cloud file storage:** Cloudinary or S3 (see the deploy note above).
- **Meeting recordings:** these depend on your Google Workspace plan. Paste recording links into the meeting notes.
- **AI assistant:** a later phase.

## Project structure

```
internhub/
├─ server/
│  ├─ src/index.js            Express app, routes, serves client/dist in production
│  ├─ src/seed.js             npm run seed  |  npm run seed -- --demo
│  ├─ src/models/             User, Team, Project, Task, Attendance, Meeting, Message, Document, Notification
│  ├─ src/routes/             auth, users, teams, projects, tasks, attendance, meetings, messages, documents, notifications, reports
│  ├─ src/middleware/auth.js  JWT check + role permissions
│  └─ src/services/           socket (live chat/notifications), google (Meet), notify, channels, time
└─ client/
   └─ src/
      ├─ pages/               one file per module
      ├─ components/          Layout (sidebar, bell), ui (shared pieces, modal)
      ├─ api.js  socket.js  context.jsx
      └─ styles.css
```

## API summary

All routes are under `/api` and need `Authorization: Bearer <token>`, except login.

```
POST /auth/login            GET /auth/me              POST /auth/change-password
GET|POST /users             PATCH /users/:id          POST /users/:id/reset-password
GET|POST /teams             PATCH|DELETE /teams/:id
GET|POST /projects          PATCH|DELETE /projects/:id
GET|POST /tasks             PATCH|DELETE /tasks/:id   (status: inprogress|submitted|approved|rejected)
POST /attendance/check-in   POST /attendance/check-out
GET /attendance/today       GET /attendance/history/:userId
POST /attendance/mark       POST /attendance/remind
GET|POST /meetings          PATCH|DELETE /meetings/:id   GET /meetings/google-status
GET /messages/channels      GET|POST /messages/:channel
GET|POST /documents         GET /documents/:id/download  DELETE /documents/:id
GET /notifications          POST /notifications/read-all
GET /reports                GET /reports/export.csv
```
