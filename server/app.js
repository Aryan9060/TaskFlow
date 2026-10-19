import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import healthRoutes from './routes/health.routes.js'
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/user.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import subjectRoutes from './routes/subject.routes.js'
import taskRoutes from './routes/task.routes.js'
import examRoutes from './routes/exam.routes.js'
import sessionRoutes from './routes/session.routes.js'
import analyticsRoutes from './routes/analytics.routes.js'
import reminderRoutes from './routes/reminder.routes.js'
import achievementRoutes from './routes/achievement.routes.js'
import exportRoutes from './routes/export.routes.js'

const app = express()

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/subjects', subjectRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/exams', examRoutes)
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

// Centralized error handler (Express forwards any thrown error here)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  })
})

export default app
