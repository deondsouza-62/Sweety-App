# Sweety – Blood Glucose Tracker

A full-stack glucose tracking application with role-based portals for **patients**, **doctors**, and **admins**. Built with React + Vite, Node.js + Express, and PostgreSQL.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Recharts, Lucide icons, Material Symbols |
| Backend | Node.js, Express, JWT auth, bcryptjs password hashing |
| Database | PostgreSQL 14+ |
| Infra | Docker Compose (local Postgres), npm workspaces-style `client/` + `server/` |

## Features

- **One login portal for all roles** — patients, doctors, and admins sign in at the same screen; the correct portal loads based on the account role
- **Patient portal** — add/edit/delete glucose readings across four daily slots, daily/month-to-date/previous-month reports, trend charts
- **Time-slot rules** — each slot unlocks at a set time of day (see below); locked slots are disabled in the UI and rejected by the API
- **Doctor portal** — view only patients assigned to that doctor, with per-patient reports and reading history
- **Admin panel** — create/edit/delete patients and doctors, assign or reassign doctors to patients, and browse the activity log
- **Activity log** — records logins, logouts, registrations, reading changes, doctor report views, slot reminders, and all admin actions
- **Email notifications** — newsletter-style emails via SMTP (Gmail): patients get a reminder when they miss a slot, and doctors get alerted when a patient's glucose leaves the healthy bandwidth
- **Validation** — whole-number mg/dL values (40–600), no future dates, one reading per slot/day, max four readings/day
- **Security** — bcrypt password hashing, JWT bearer tokens, helmet, CORS, rate-limited auth routes, role-based access control
- **Demo seed** — one command creates all demo accounts, doctor-patient assignments, and six days of sample readings

## Demo credentials

| Role | Email | Password |
|---|---|---|
| Patient | `demo@sweety.app` | `SweetyDemo123!` |
| Patient | `priya@sweety.app` | `PriyaDemo123!` |
| Doctor | `doctor@sweety.app` | `SweetyDoctor123!` |
| Admin | `admin@sweety.app` | `SweetyAdmin123!` |

The seeded doctor (Dr. Ananya Rao) has both demo patients assigned. Run `npm run seed` in `server/` to create or reset all demo accounts.

## Requirements

- Node.js 20+
- npm
- Docker Desktop **or** a local PostgreSQL 14+ instance

## Quick start

### 1. Configure environment

```powershell
Copy-Item server/.env.example server/.env
```

Edit `server/.env` — at minimum set `DATABASE_URL` and `JWT_SECRET` (`CLIENT_ORIGIN` only if the frontend port changes).

#### Email notifications (optional)

Notifications are sent from `sweetyglucotracker@gmail.com` via Gmail SMTP. Google requires an **App Password** (not the account password):

1. Enable 2-Step Verification on the Google account
2. Go to Google Account → Security → App passwords and generate one
3. Set in `server/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=sweetyglucotracker@gmail.com
SMTP_PASS=icdz zjhd vasd tkko
```

If `SMTP_PASS` is empty, emails are skipped gracefully (logged as `[mail:skipped]`) and the app works normally.

| Variable | Default | Purpose |
|---|---|---|
| `GLUCOSE_LOW` / `GLUCOSE_HIGH` | `70` / `180` | mg/dL bandwidth; outside it triggers a doctor alert |
| `REMINDER_GRACE_MINUTES` | `120` | minutes after a slot opens before a missed-slot reminder is sent |
| `REMINDER_INTERVAL_MINUTES` | `15` | how often the reminder job runs |

### 2. Start PostgreSQL

From the project root:

```powershell
docker compose up -d
```

This starts PostgreSQL on `localhost:5432` with database `sweety_db`. If using your own Postgres, create a `sweety_db` database and update `DATABASE_URL` in `server/.env`.

### 3. Install dependencies, init DB, seed

Terminal 1 — backend:

```powershell
cd server
npm install
npm run db:init   # creates tables/columns (idempotent)
npm run seed      # creates demo accounts + sample readings
npm run dev       # API on http://localhost:5000
```

Terminal 2 — frontend:

```powershell
cd client
npm install
npm run dev       # app on http://localhost:5173
```

Open http://localhost:5173 and sign in with any demo credential above.

## Time-slot rules

For readings dated **today**, each slot can only be logged after its opening time (server local time). Earlier slots stay open for backfilling once their time has passed; past dates are unrestricted.

| Slot | Opens at |
|---|---|
| Morning (fasting) | 4:00 AM |
| After breakfast | 6:00 AM |
| After lunch | 12:00 PM |
| After dinner | 6:00 PM |

Times are defined in `server/src/utils/validation.js` (`SLOT_OPENS`) and mirrored in `client/src/App.jsx` (`slotOpens`/`slotOpenMinutes`).

## Email notifications

Two automated emails, both in a branded newsletter layout (`server/src/templates/emails.js`):

- **Missed-slot reminder** — a background job (`server/src/index.js`, every `REMINDER_INTERVAL_MINUTES`) checks all patients. If a slot has been open for more than `REMINDER_GRACE_MINUTES` and the patient hasn't logged it, they get a reminder email. Each reminder is sent at most once per patient/slot/day (deduplicated via `activity_logs`).
- **Doctor glucose alert** — when a patient saves a reading below `GLUCOSE_LOW` or above `GLUCOSE_HIGH` mg/dL, their assigned doctor is emailed with the value, slot, date and bandwidth. At most one alert per patient per day per direction.

Both events are also written to the admin activity log (`slot_reminder`, `doctor_alert_sent`).

## Project structure

```
sweety-glucose-tracker/
├── client/                  # React + Vite frontend
│   └── src/
│       ├── App.jsx          # Auth screen + patient portal
│       ├── DoctorPortal.jsx # Doctor dashboard
│       ├── AdminPortal.jsx  # Admin panel (users + activity log)
│       ├── api.js           # Fetch wrapper with JWT header
│       └── styles.css       # Global styles
└── server/                  # Express API
    └── src/
        ├── app.js           # Express app + route mounting
        ├── routes/
        │   ├── auth.js      # register / login / logout
        │   ├── readings.js  # reading CRUD
        │   ├── reports.js   # patient report summaries
        │   ├── doctor.js    # doctor: assigned patients + reports
        │   └── admin.js     # admin: user CRUD, assignments, activity
        ├── middleware/auth.js   # requireAuth / requireDoctor / requireAdmin
        ├── services/
        │   ├── mailer.js        # nodemailer SMTP transport
        │   └── notifications.js # missed-slot reminders + doctor glucose alerts
        ├── templates/emails.js  # newsletter-style email HTML
        ├── utils/
        │   ├── validation.js    # reading + slot-time validation
        │   └── activity.js      # activity_logs writer
        └── db/
            ├── schema.sql   # users, readings, activity_logs
            ├── init.js      # applies schema.sql
            ├── seed.js      # demo data
            └── pool.js      # pg connection pool
```

## API overview

All protected endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create patient account |
| POST | `/api/auth/login` | Public | Login (returns role) |
| POST | `/api/auth/logout` | Auth | Logout (writes activity log) |
| GET | `/api/auth/me` | Auth | Current user profile |
| GET/POST | `/api/readings?page=&limit=` | Patient | List (paginated, returns `total`) / add readings |
| PUT/DELETE | `/api/readings/:id` | Patient | Update / delete reading |
| GET | `/api/reports?date=YYYY-MM-DD` | Patient | Daily, MTD, previous-month summaries |
| GET | `/api/doctor/patients` | Doctor | List assigned patients |
| GET | `/api/doctor/patients/:id` | Doctor | Patient profile + recent readings |
| GET | `/api/doctor/patients/:id/report?date=` | Doctor | Patient report summaries |
| GET | `/api/admin/users?role=patient\|doctor` | Admin | List patients/doctors |
| POST | `/api/admin/users` | Admin | Create patient/doctor |
| PUT | `/api/admin/users/:id` | Admin | Edit user / assign doctor |
| DELETE | `/api/admin/users/:id` | Admin | Delete patient/doctor |
| GET | `/api/admin/activity?limit=` | Admin | Activity log |

## Database

`server/src/db/schema.sql` creates:

- `users` — `role` (`patient`/`doctor`/`admin`), `doctor_id` (assigned doctor), `specialization`
- `readings` — unique `(user_id, reading_date, slot)`; cascade-deletes with the user
- `activity_logs` — actor, action, entity, details, timestamp; `user_id` set to null if the user is deleted

## Scripts

```powershell
cd server
npm run dev        # nodemon API server
npm run db:init    # apply schema
npm run seed       # seed demo data
npm test           # node:test unit tests

cd client
npm run dev        # Vite dev server
npm run build      # production build
```

## Notes

- This is an educational starter, not a medical device. It does not diagnose, recommend treatment, or replace clinical advice.
- JWTs are stateless: logout clears the client token and logs the event, but a copied token stays valid until expiry. For production, add refresh tokens or a token denylist.
- The four-readings-per-day limit is checked in a transaction; a per-user/day lock would be needed under heavy concurrency.
- Slot opening times use the server's local timezone; both client and server should run in the same timezone for consistent behavior.

## Possible improvements

### Clinical intelligence
- **Age-aware glucose ranges** — store date of birth on the patient profile and adjust healthy bandwidths/warnings by age group (e.g. tighter targets for older adults, pregnancy ranges for expecting mothers)
- **Color-coded glucose entry** — while typing a reading, instantly color the value field green/amber/red based on the bandwidth so patients see at a glance whether a reading is in range, borderline, or critical
- **Spike/drop detection** — flag readings that jump sharply versus the patient's own recent average and surface a gentle in-app warning ("this is much higher than your usual")
- **Time-in-range reporting** — percentage of readings inside the target bandwidth per day/week/month, a standard metric clinicians use
- **Doctor notes & follow-ups** — let doctors attach comments or recommendations to a patient's report and mark reviews as done
- **Medications & meal context** — optional fields for medication taken or meal type to correlate with spikes

### Notifications & engagement
- **Customizable reminder timing** — let patients/administrators choose when slot reminders are sent
- **Weekly digest email** — a newsletter-style summary of the patient's week (averages, trends, missed slots)
- **In-app notification center** — bell icon showing reminders and alerts without relying on email
- **Streaks & gentle nudges** — reward consistency (e.g. "7-day logging streak") to improve adherence

- **Refresh tokens & session management** — short-lived access tokens with rotating refresh tokens, plus server-side logout/revocation
- **Password reset & email verification** — forgot-password flow and verified-email registration

