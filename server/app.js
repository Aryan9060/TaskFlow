import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { sanitizeBody } from './middleware/sanitize.middleware.js'
import healthRoutes from './routes/health.routes.js'
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/user.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import subjectRoutes from './routes/subject.routes.js'
import taskRoutes from './routes/task.routes.js'
import examRoutes from './routes/exam.routes.js'
import groupRoutes from './routes/group.routes.js'
import assignmentRoutes from './routes/assignment.routes.js'
import sessionRoutes from './routes/session.routes.js'
import analyticsRoutes from './routes/analytics.routes.js'
import reminderRoutes from './routes/reminder.routes.js'
import achievementRoutes from './routes/achievement.routes.js'
import exportRoutes from './routes/export.routes.js'

const app = express()

// Behind a hosting proxy (Render, Railway, etc.) trust the first hop so
// rate limiting and secure cookies see the real client IP and protocol.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

// Allow one or more frontend origins (comma-separated CLIENT_URL), which
// covers production plus preview deployments. Credentials enable cookies.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(helmet())
app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())
app.use(sanitizeBody)

app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/subjects', subjectRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/exams', examRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/assignments', assignmentRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/reminders', reminderRoutes)
app.use('/api/achievements', achievementRoutes)
app.use('/api/export', exportRoutes)

// 404 handler for any unmatched route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  })
})

// Centralized error handler: every thrown/rejected error lands here.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  let status = err.status || err.statusCode || 500
  let message = err.message

  // Malformed or oversized JSON bodies rejected by express.json()
  if (err.type === 'entity.parse.failed') {
    status = 400
    message = 'Invalid JSON payload.'
  } else if (err.type === 'entity.too.large') {
    status = 413
    message = 'Request body is too large.'
  } else if (err.name === 'CastError') {
    // Invalid ObjectId in a URL parameter behaves like a missing record.
    status = 404
    message = 'Resource not found.'
  } else if (err.name === 'ValidationError') {
    status = 400
    message = Object.values(err.errors)
      .map((item) => item.message)
      .join(' ')
  } else if (err.code === 11000) {
    status = 409
    message = 'That record already exists.'
  }

  // Log only unexpected failures; 4xx errors are part of normal API traffic.
  if (status >= 500) console.error(err)

  res.status(status).json({
    success: false,
    message:
      status >= 500 && process.env.NODE_ENV === 'production'
        ? 'Internal server error.'
        : message || 'Internal server error.',
  })
})

export default app
