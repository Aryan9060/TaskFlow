# TaskFlow

Student productivity and study management application (MERN stack).
Built as an MCA portfolio project.

## Tech stack

- **Frontend:** React (Vite), React Router, Axios, plain CSS
- **Backend:** Node.js, Express, Mongoose
- **Database:** MongoDB (local Docker container for development; swap `MONGO_URI` for Atlas anytime)

## Project structure

```
TaskFlow/
├── client/          # React + Vite frontend
│   └── src/
│       ├── components/   # reusable UI pieces
│       ├── layouts/      # AppLayout (sidebar + header shell)
│       ├── pages/        # one file per screen
│       ├── hooks/        # custom hooks
│       ├── services/     # Axios API calls
│       ├── App.jsx       # route definitions
│       └── main.jsx      # entry point
├── server/          # Express backend
│   ├── config/      # database connection
│   ├── controllers/ # request handlers (Phase 2+)
│   ├── middleware/  # auth, error handling (Phase 2+)
│   ├── models/      # Mongoose schemas (Phase 2+)
│   ├── routes/      # endpoint mapping
│   ├── services/    # business logic (later phases)
│   ├── validators/  # input validation (later phases)
│   ├── app.js       # Express app configuration
│   └── server.js    # entry point: connect DB, start listening
└── .gitignore
```

## Setup

Prerequisites: Node.js 20+, Git, Docker (for the dev MongoDB container).

1. Start MongoDB (first time creates the container; later sessions only need `docker start taskflow-mongo`):

   ```bash
   docker run -d --name taskflow-mongo -p 27017:27017 -v taskflow-mongo-data:/data/db --restart unless-stopped mongo:7
   ```

2. Backend:

   ```bash
   cd server
   cp .env.example .env   # on Windows: copy .env.example .env
   npm install
   npm run dev
   ```

3. Frontend (new terminal):

   ```bash
   cd client
   npm install
   npm run dev
   ```

4. Verify:

   - API health: http://localhost:5000/api/health → `success: true`
   - App: http://localhost:5173

## Environment variables (server/.env)

| Variable      | Purpose                                              |
| ------------- | ---------------------------------------------------- |
| `PORT`        | Port the Express server listens on                   |
| `MONGO_URI`   | MongoDB connection string                            |
| `NODE_ENV`    | `development` or `production`                        |
| `CLIENT_URL`  | Frontend origin, used by the CORS middleware         |
| `JWT_SECRET`  | Secret key used to sign session tokens               |

Never commit `.env`. A safe template lives in `.env.example`.

## Development status

- [x] Phase 1 — Project setup and foundation
- [x] Phase 2 — Authentication and profile
