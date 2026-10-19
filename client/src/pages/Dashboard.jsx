import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../context/AuthContext.jsx'
import { getDashboard } from '../services/dashboard.js'
import { daysUntil, formatDateTime, formatMinutes, shortDate } from '../utils/format.js'
import Icon from '../components/Icon.jsx'

// One summary card: hand-drawn icon, big handwritten number, typewriter label.
function StatCard({ icon, value, label, tone = '' }) {
  return (
    <div className="card stat-card">
      <span className={`stat-icon ${tone}`}>
        <Icon name={icon} size={22} />
      </span>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}

// Main dashboard: summary cards, weekly study chart, upcoming exams,
// recent sessions, and quick actions. Handles loading/error/empty states.
export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  // Load the summary once when the page mounts.
  useEffect(() => {
    let cancelled = false
    getDashboard()
      .then((result) => {
        if (!cancelled) setData(result.data)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your dashboard. Is the server running?')
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return <div className="alert alert-error">{error}</div>
  }

  if (!data) {
    return <div className="page-loading">Sketching your dashboard...</div>
  }

  const { stats, weekly, upcomingExams, recentSessions } = data
  const studiedThisWeek = weekly.reduce((sum, day) => sum + day.minutes, 0)
  const hasChartData = studiedThisWeek > 0

  return (
    <section>
      <div className="page-heading">
        <h2>Welcome back, {user.name}</h2>
        <p>{stats.subjects} subject{stats.subjects === 1 ? '' : 's'} on the books — let's make today count.</p>
      </div>

      <div className="stat-grid">
        <StatCard icon="tasks" value={stats.dueToday} label="Due today" />
        <StatCard icon="alert" value={stats.overdue} label="Overdue" tone={stats.overdue > 0 ? 'stat-danger' : ''} />
        <StatCard icon="clock" value={stats.inProgress} label="In progress" />
        <StatCard icon="flame" value={formatMinutes(studiedThisWeek)} label="Studied this week" />
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>Study minutes — last 7 days</h3>
        {hasChartData ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekly} margin={{ top: 4, right: 8, bottom: 0, left: -22 }}>
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={{ stroke: 'var(--ink)' }}
                tick={{ fontSize: 13, fill: 'var(--ink-soft)' }}
              />
              <YAxis
                tickLine={false}
                axisLine={{ stroke: 'var(--ink)' }}
                tick={{ fontSize: 13, fill: 'var(--ink-soft)' }}
              />
              <Tooltip
                cursor={{ fill: 'var(--accent-soft)' }}
                formatter={(value) => [`${value} min`, 'Studied']}
              />
              <Bar dataKey="minutes" fill="var(--ink)" radius={[5, 5, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state">
            <p className="empty-title">A blank week so far</p>
            <p>Fire up the study timer and this chart will fill itself in.</p>
          </div>
        )}
      </div>

      <div className="two-col">
        <div className="card">
          <h3>Upcoming exams</h3>
          {upcomingExams.length === 0 ? (
            <div className="empty-state">
              <p className="empty-title">No exams scheduled</p>
              <p>Add one in the Exam Planner and count down in style.</p>
            </div>
          ) : (
            <div className="list">
              {upcomingExams.map((exam) => {
                const days = daysUntil(exam.examDate)
                return (
                  <div className="row-item" key={exam._id}>
                    <div className="row-main">
                      <p className="row-title">{exam.title}</p>
                      <p className="row-sub">
                        {exam.subject ? (
                          <span className="chip">
                            <span className="color-dot" style={{ backgroundColor: exam.subject.color }}></span>
                            {exam.subject.name}
                          </span>
                        ) : (
                          'General'
                        )}{' '}
                        · {formatDateTime(exam.examDate)}
                      </p>
                    </div>
                    <span className={`badge ${days <= 3 ? 'badge-danger' : days <= 7 ? 'badge-warn' : 'badge-info'}`}>
                      {days === 0 ? 'Today' : `${days}d left`}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card">
          <h3>Recent study sessions</h3>
          {recentSessions.length === 0 ? (
            <div className="empty-state">
              <p className="empty-title">No sessions yet</p>
              <p>Your finished focus blocks will appear here.</p>
            </div>
          ) : (
            <div className="list">
              {recentSessions.map((session) => (
                <div className="row-item" key={session._id}>
                  <span className="stat-icon">
                    <Icon name={session.mode === 'pomodoro' ? 'clock' : 'flame'} size={20} />
                  </span>
                  <div className="row-main">
                    <p className="row-title">
                      {session.subject ? session.subject.name : 'General study'}
                    </p>
                    <p className="row-sub">{shortDate(session.startedAt)}</p>
                  </div>
                  <span className="badge badge-neutral">{formatMinutes(session.durationMinutes)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="quick-actions">
        <Link className="btn-primary" to="/tasks">
          <Icon name="plus" size={16} /> New task
        </Link>
        <Link className="btn-secondary" to="/subjects">
          <Icon name="plus" size={16} /> New subject
        </Link>
        <Link className="btn-secondary" to="/exams">
          <Icon name="plus" size={16} /> New exam
        </Link>
        <Link className="btn-secondary" to="/timer">
          <Icon name="play" size={16} /> Start session
        </Link>
      </div>
    </section>
  )
}
