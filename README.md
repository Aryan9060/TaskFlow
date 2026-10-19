# TaskFlow

A student productivity and study-management app built with the MERN stack. TaskFlow keeps
tasks, assignments, subjects, exams, study sessions, and progress analytics in one place,
wrapped in a hand-drawn "study, on purpose" interface with four switchable themes.

Built as an MCA portfolio project.

## Features

- **Accounts** — register, log in, log out, profile and study preferences.
- **Dashboard** — today's workload, upcoming exams, weekly study chart, reminders.
- **Tasks & assignments** — CRUD, filters, search, sorting, priorities, deadlines,
  completion tracking, and daily/weekly/monthly recurring tasks.
- **Subjects** — color-coded subjects with archive support and safe deletion rules.
- **Exams** — countdown badges, create/edit/delete, and a generated revision plan for
  upcoming exams.
- **Study timer** — Pomodoro-style focus/break timer that survives refreshes, saves one
  session per completed focus block, and uses the user's preferred durations.
- **Analytics & goals** — daily/weekly/30-day totals, 12-week heatmap, study distribution,
  task completion rates, achievements, and an editable weekly study goal.
- **Export** — download study sessions or tasks as RFC 4180-compliant CSV files.
- **Themes** — Notebook (default), Midnight, Campus, and Blueprint; the choice persists
  in `localStorage`.

## Tech stack

| Layer      | Tools                                                              |
| ---------- | ------------------------------------------------------------------ |
| Frontend   | React 19, Vite 8, React Router 7, Axios, Recharts, plain CSS       |
| Backend    | Node.js, Express 5, Mongoose 9, Zod 4, JWT, bcryptjs               |
| Database   | MongoDB 7 (Docker for local development; Atlas for production)     |
| Security   | helmet, express-rate-limit, express-mongo-sanitize, httpOnly cookie |
| Testing    | Node's built-in test runner (`node:test`), Supertest                |

## Project structure

```
TaskFlow/
├── client/                   # React + Vite frontend
│   └── src/
│       ├── components/       # forms, icons, navigation, reusable UI
│       ├── context/          # AuthContext (session + user)
│       ├── hooks/            # custom hooks
│       ├── layouts/          # AppLayout (sidebar + header shell)
│       ├── pages/            # one file per screen
│       ├── services/         # thin Axios wrappers for each API group
│       ├── utils/            # formatting, dates, themes
│       ├── App.jsx           # route table
│       └── index.css         # design system + four themes
├── server/                   # Express API
│   ├── config/               # database connection
│   ├── controllers/          # request handlers
│   ├── middleware/           # auth, validation, sanitization
│   ├── models/               # Mongoose schemas (User, Subject, Task, Exam, Session)
│   ├── routes/               # endpoint mapping
│   ├── services/             # shared business rules
│   ├── tests/                # unit + API integration tests
│   ├── utils/                # date series, recurrence, CSV helpers
│   ├── validators/           # Zod request schemas
│   ├── app.js                # Express app configuration
│   └── server.js             # startup + graceful shutdown
└── README.md
```

## Getting started

Prerequisites: Node.js 20+, npm, Git, and Docker (for local MongoDB).

### 1. Start MongoDB

The development database runs in Docker on **port 27018** so it never conflicts with a
local MongoDB on 27017.

```bash
docker run -d --name taskflow-mongo -p 27018:27017 -v taskflow-mongo-data:/data/db --restart unless-stopped mongo:7
```

Later sessions only need `docker start taskflow-mongo`.

### 2. Start the API

```bash
cd server
cp .env.example .env      # Windows: copy .env.example .env
npm install
npm run dev
```

Set a real `JWT_SECRET` in `.env`. The API listens on **http://localhost:5001** and
`GET /api/health` should return `{ "success": true }`.

### 3. Start the frontend

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to port 5001, so no CORS setup is
needed in development.

## Environment variables (`server/.env`)

| Variable     | Purpose                                                        |
| ------------ | -------------------------------------------------------------- |
| `PORT`       | Express port (defaults to `5000`; this project uses `5001`)     |
| `MONGO_URI`  | MongoDB connection string                                      |
| `NODE_ENV`   | `development` or `production`                                  |
| `CLIENT_URL` | Frontend origin allowed by CORS (e.g. `http://localhost:5173`) |
| `JWT_SECRET` | Long random string used to sign session tokens                 |

Never commit `.env`; a placeholder template lives in `server/.env.example`.

## Scripts

| Location | Command           | Purpose                                 |
| -------- | ----------------- | --------------------------------------- |
| server   | `npm run dev`     | Start API with file watching            |
| server   | `npm start`       | Start API without watching              |
| server   | `npm test`        | Run unit + API integration tests        |
| client   | `npm run dev`     | Start Vite dev server                   |
| client   | `npm run build`   | Production build into `client/dist`     |
| client   | `npm run lint`    | Lint the frontend with oxlint           |
| client   | `npm run preview` | Preview the production build locally    |

## Testing

```bash
cd server
npm test
```

The suite runs in a separate database (`mongodb://127.0.0.1:27018/taskflow_test`) that is
dropped before and after each run, so development data is untouched. It requires the
`taskflow-mongo` container to be running.

Covered automatically:

- date helpers and monthly recurrence clamping (Jan 31 → Feb 28)
- CSV quoting/escaping rules
- registration validation, duplicate email, login, logout, protected routes
- profile and weekly-goal validation
- task CRUD, invalid input, and ownership boundaries (another user gets 404)
- recurring task idempotency (one successor per completion)
- MongoDB operator stripping and malformed JSON handling
- rate limiting on authentication endpoints

### Manual end-to-end checklist

Use a fresh account for the empty-state pass.

- [ ] Register with invalid data — readable validation messages appear.
- [ ] Register, log out, and log in again; refreshing keeps the session.
- [ ] Visiting a private URL while logged out redirects to `/login`, then returns there after login.
- [ ] A brand-new account shows empty states on Dashboard, Tasks, Assignments, Subjects,
      Exams, and Analytics (no NaN values or broken charts).
- [ ] Create, edit, archive, and delete a subject; deleting a subject with tasks is blocked.
- [ ] Create tasks and assignments; test search, filters, sorting, priority, and completion.
- [ ] Complete a recurring task — exactly one next copy appears with the right due date.
- [ ] Create/edit/delete an exam; open the revision plan on an upcoming exam.
- [ ] Start the timer, pause/resume, reset, and let one focus block finish; only one session
      is saved and the selected subject receives the minutes.
- [ ] Dashboard shows reminders, today's tasks, and the weekly chart correctly.
- [ ] Analytics charts, heatmap, achievements, and weekly goal update after sessions/tasks.
- [ ] Export sessions and tasks to CSV; files open correctly in a spreadsheet.
- [ ] Switch all four themes and reload — the selection persists.
- [ ] Keyboard pass: every input/button is reachable with Tab, focus is visible, and Escape
      closes menus/forms where expected.
- [ ] Responsive pass at ~375 px and ~768 px widths: no horizontal scrolling, sidebar and
      forms remain usable.
- [ ] Error state: stop the API and reload — the UI shows a friendly message, not a crash.

## API overview

All responses use `{ success, message?, data? }`. Routes below are protected except health
and the two credential endpoints. Authentication is carried by the `taskflow_token`
httpOnly cookie.

| Method | Endpoint                    | Purpose                              |
| ------ | --------------------------- | ------------------------------------ |
| GET    | `/api/health`               | Server + database health             |
| POST   | `/api/auth/register`        | Create account and start a session   |
| POST   | `/api/auth/login`           | Start a session                      |
| POST   | `/api/auth/logout`          | Clear the session cookie             |
| GET    | `/api/users/me`             | Current profile                      |
| PATCH  | `/api/users/me`             | Update name/preferences              |
| GET    | `/api/dashboard/summary`    | Dashboard aggregates                 |
| GET    | `/api/subjects`             | List active subjects                 |
| POST   | `/api/subjects`             | Create subject                       |
| PATCH  | `/api/subjects/:id`         | Edit/archive subject                 |
| DELETE | `/api/subjects/:id`         | Delete subject (only if unused)      |
| GET    | `/api/tasks`                | List/filter/search/sort tasks        |
| POST   | `/api/tasks`                | Create task or assignment            |
| PATCH  | `/api/tasks/:id`            | Edit/complete task                   |
| DELETE | `/api/tasks/:id`            | Delete task                          |
| GET    | `/api/exams`                | List exams (`?upcoming=true`)        |
| POST   | `/api/exams`                | Create exam                          |
| PATCH  | `/api/exams/:id`            | Edit exam                            |
| DELETE | `/api/exams/:id`            | Delete exam                          |
| GET    | `/api/sessions`             | List study sessions                  |
| GET    | `/api/sessions/stats`       | Session aggregates                   |
| POST   | `/api/sessions`             | Save a completed focus block         |
| GET    | `/api/analytics/summary`    | Charts, heatmap, completion, goal    |
| GET    | `/api/reminders`            | Due tasks and upcoming exams         |
| GET    | `/api/achievements`         | Milestones and progress              |
| GET    | `/api/export/sessions.csv`  | Download study sessions CSV          |
| GET    | `/api/export/tasks.csv`     | Download tasks CSV                   |

## Data model

- **User** — name, unique email, bcrypt password hash, preferences (Pomodoro durations,
  weekly goal).
- **Subject** — owner, name, code, semester, color, description, archived.
- **Task** — owner, optional subject, kind (`task`/`assignment`), title, status, priority,
  due date, estimate, recurrence, completion timestamp, successor link.
- **Exam** — owner, optional subject, title, date, location, notes.
- **StudySession** — owner, optional subject/task, duration in minutes, start/end times,
  mode.

Every resource is queried with the owner id; a record belonging to another user behaves
exactly like a missing record (404).

## Security notes

- Passwords are hashed with bcrypt (cost 10) and never returned by the API.
- Sessions use a signed JWT in an httpOnly, SameSite=Lax cookie; `secure` is enabled in
  production.
- Zod validates every write payload; failures return readable 400 messages.
- Request bodies are stripped of MongoDB operators (`$`, dots) before controllers run.
- `helmet` sets security headers, JSON bodies are capped at 100 kB, and auth endpoints are
  rate-limited to 30 attempts per 15 minutes per IP.
- Database and server errors pass through one centralized handler; unexpected 500 details
  are hidden in production.
- Cross-origin requests are restricted to `CLIENT_URL`.

## Production notes

- Set `NODE_ENV=production`, a strong `JWT_SECRET`, an Atlas `MONGO_URI`, and the deployed
  frontend URL as `CLIENT_URL`.
- Build the client with `npm run build` and serve `client/dist` from a static host, with
  `/api` proxied to the API server (or point `client/src/services/api.js` at the API origin).
- HTTPS is required for secure cookies; the API sets `trust proxy` in production so rate
  limiting sees the real client IP.
- Update `CLIENT_URL` if the frontend domain changes, otherwise CORS blocks the requests.
