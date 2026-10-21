# TaskFlow — Project Structure Analysis

MERN student-productivity app: **React 19 + Vite** frontend, **Express 5 + Mongoose** backend, **MongoDB 7 in Docker**, JWT cookie auth, 4 UI themes, 30 passing tests. All 11 planned phases are complete and pushed to `origin/master`.

## 1. Folder & File Map

### Root

| Path | Purpose |
|---|---|
| `client/` | React SPA (Vite). Self-contained frontend package. |
| `server/` | Express API. Self-contained backend package. |
| `docs/screenshots/` | Six real PNG screenshots used by the README. |
| `README.md` | Full docs: setup, env table, testing, deployment (Atlas + Render + Vercel). |
| `.gitignore` | Ignores `node_modules/`, `dist/`, `.env`, logs. Keeps `TaskFlow_Project_Plan.md` local (line 19). |
| `TaskFlow_Project_Plan.md` | Original project plan — intentionally not committed. |

### Server (`server/`)

| Path | Purpose |
|---|---|
| `server.js` | Entry point. Loads `dotenv/config`, validates `JWT_SECRET` (exits if missing), calls `connectDB()`, starts the HTTP server, handles `SIGINT` graceful shutdown (server.js:10-34). |
| `app.js` | Express app assembly: helmet → CORS → JSON body (100 kB cap) → cookie-parser → sanitizer → 12 route mounts → 404 handler → centralized error handler (app.js:34-98). |
| `config/db.js` | `connectDB()` reads `MONGO_URI`, wires mongoose `connected`/`error`/`disconnected` logs, and `await mongoose.connect(uri)` (db.js:5-23). |
| `models/` | 5 Mongoose schemas: `User`, `Subject`, `Task`, `Exam`, `StudySession`. `User` shows the house pattern — `select: false` on `passwordHash`, plus `toSafeObject()` so hashes never serialize (User.js:31-53). |
| `routes/` | 12 route modules under `/api/*` (health, auth, users, dashboard, subjects, tasks, exams, sessions, analytics, reminders, achievements, export). |
| `controllers/` | 10 controllers holding request/response logic; routes stay thin. |
| `middleware/` | `auth.middleware.js` (`protect` — verifies JWT cookie, attaches `req.user`), `validate.middleware.js` (Zod `safeParse`), `sanitize.middleware.js` (Mongo-operator stripping, Express-5-safe). |
| `services/` | `subject.service.js` — shared business logic (e.g., guarding subject deletion). |
| `utils/` | `dates.js` (recurrence/day-series math), `csv.js` (RFC 4180 export). |
| `validators/` | Zod v4 schemas per resource. |
| `tests/` | `node:test` + Supertest: `api/` (auth, tasks, rate limit), `unit/` (dates, csv), `helpers/` (test DB + agent factory). Run with `npm test`. |
| `.env.example` | Documented placeholder env — no real secrets. |

### Client (`client/`)

| Path | Purpose |
|---|---|
| `vite.config.js` | Dev server on **5173**, proxies `/api` → `http://localhost:5001` so dev needs no CORS config (vite.config.js:8-16). |
| `src/main.jsx` | React root: `BrowserRouter` → `AuthProvider` → `App` (main.jsx:8-16). |
| `src/App.jsx` | Route table: `GuestRoute` wraps login/register, `ProtectedRoute` + `AppLayout` wrap 10 private pages, catch-all 404 (App.jsx:22-46). |
| `src/pages/` | 14 pages: Dashboard, Tasks, Assignments, Subjects, Exams, Calendar, Timer, Analytics, Profile, Settings, Login, Register, NotFound, TaskPage. |
| `src/components/` | `ProtectedRoute`, `GuestRoute`, `AppLayout` sidebar pieces, `ThemeSwitcher`, `TaskForm`, `TaskList`, hand-drawn `Icon` set. |
| `src/context/AuthContext.jsx` | Session state — fetches `/api/users/me`, exposes `user`, `login`, `register`, `logout`. |
| `src/services/api.js` | Single axios instance every page uses (see §3). |
| `src/hooks/useApiHealth.js` | Polls `/api/health` for the status pill. |
| `src/utils/themes.js` + `index.css` | 4 themes via CSS custom properties + `[data-theme]` (notebook default, midnight, campus, blueprint); `localStorage` persistence + inline pre-paint script. |
| `.env.example` | `VITE_API_URL` — empty in dev, full API URL in production builds. |

## 2. Technology Stack

**Frontend:** React 19.2, Vite 8.3, React Router 7.18, Axios 1.20, Recharts 3.10 (analytics charts); oxlint as linter. No Tailwind — hand-rolled CSS with custom properties.

**Backend:** Node 24, Express 5.3, Mongoose 9.11, jsonwebtoken 9, bcryptjs 3, Zod 4.6 (validation), cookie-parser, cors, helmet 8 (security headers), express-rate-limit 8 (auth brute-force guard), express-mongo-sanitize 2.2 (invoked via a custom Express-5-compatible middleware), dotenv.

**Database:** MongoDB 7 in the Docker container `taskflow-mongo`, host port **27018** (deliberately not 27017, which the other local project's MongoDB uses).

**Testing:** Node built-in test runner (`node --test`) + Supertest — 30 tests across API and unit logic.

## 3. How Frontend Talks to Backend

One shared axios instance (`client/src/services/api.js:6-10`):

```js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  withCredentials: true,
})
```

- **Development:** `VITE_API_URL` is empty, so requests go to relative `/api/*`, and Vite's dev proxy forwards them to Express on port 5001 — the browser never crosses origins, so cookies and CORS just work.
- **Production:** `VITE_API_URL` is inlined **at build time** (Vite replaces `import.meta.env.*`), pointing the static build at the deployed API.
- **Auth transport:** login/register set a JWT in the httpOnly cookie `taskflow_token`; `withCredentials: true` makes the browser attach it to every subsequent request. No token in localStorage — safe from XSS exfiltration.
- **Server side:** `protect` middleware (`server/middleware/auth.middleware.js:6-26`) reads `req.cookies.taskflow_token`, verifies it with `JWT_SECRET`, loads the user, and attaches `req.user`; any failure short-circuits to 401 before route handlers run.
- **CORS:** allowlist from comma-separated `CLIENT_URL` with `credentials: true` (app.js:29-35).
- **Error contract:** every response is `{ success, message, data? }`; the centralized error handler (app.js:63-98) maps malformed JSON → 400, oversized body → 413, bad ObjectId → 404, Mongoose validation → 400, duplicate key → 409, and hides 5xx details in production.

## 4. How Backend Connects to MongoDB

`server/server.js` → `connectDB()` in `server/config/db.js:5-23`:

1. Reads `MONGO_URI` from `server/.env` (loaded first via `import 'dotenv/config'` — the comment at server.js:1 explains why order matters).
2. Local value: `mongodb://127.0.0.1:27018/taskflow` — the Docker container maps host 27018 → container 27017.
3. Logs `connected` / `error` / `disconnected` lifecycle events.
4. `await mongoose.connect(uri)` — if it rejects, `startServer()`'s catch logs and `process.exit(1)`, so the API never runs without a database.

Startup order: env → JWT_SECRET check → DB connect → `app.listen` → `SIGINT` handler closes the server and disconnects mongoose cleanly.

## 5. Missing, Misconfigured, or Worth Attention

**Operational (fix before next run):**
- The Mongo container may be stopped — check `docker ps` and run `docker start taskflow-mongo` if needed. The API cannot start without it.
- **No `docker-compose.yml`** — the container was created ad hoc with `docker run`, so a fresh clone has no reproducible way to stand up MongoDB. This is the one real gap in repo completeness; the README documents the `docker run` equivalent.

**Configuration (fine now, must be set for deployment):**
- `server/.env` may omit `COOKIE_SAME_SITE` — harmless locally (code defaults to `lax`), but a cross-site Vercel+Render deployment needs `COOKIE_SAME_SITE=none` over HTTPS or the cookie won't be sent.
- No `client/.env` — correct for dev, but production builds **must** set `VITE_API_URL`, and since it's build-time it must be configured in the Vercel project settings, not at runtime.
- Local Mongo has **no authentication** — acceptable only for development; production must use Atlas with a dedicated DB user and IP allowlist (README documents this).

**Minor / cosmetic:**
- `server/package.json` has `"main": "index.js"` but the entry is `server.js` — a leftover scaffold inaccuracy; `npm start`/`npm run dev` are unaffected.
- Production build emits a ~740 kB single-chunk warning (Recharts) — works fine; lazy-loading `Analytics.jsx` would split it.
- Demo account `demo@taskflow.app` has a known weak password — change or remove it before any public deployment.
- Rate limiting covers auth endpoints only (30 req / 15 min) — a deliberate scope choice, fine for a portfolio app.

**Verified healthy:** `.gitignore` properly excludes `.env`/`dist`/`node_modules`; secrets exist only in the git-ignored `server/.env`; all 12 route groups mounted; 30/30 tests green as of the last push (`9b7cadc`).

---

**Bottom line:** the architecture is clean and correctly wired — the only thing between a fresh checkout and a running app is `docker start taskflow-mongo`.
