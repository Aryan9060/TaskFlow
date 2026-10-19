import { useEffect, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../context/AuthContext.jsx'
import { getAnalyticsSummary } from '../services/analytics.js'
import { getAchievements } from '../services/achievements.js'
import { updateMe } from '../services/auth.js'
import { formatMinutes } from '../utils/format.js'
import Icon from '../components/Icon.jsx'

// Compact summary card shared by the four headline metrics.
function StatCard({ icon, value, label }) {
  return (
    <div className="card stat-card">
      <span className="stat-icon">
        <Icon name={icon} size={22} />
      </span>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}

// Completed-vs-pending card with a rate bar; shows a friendly empty state
// until there is at least one task or assignment to measure.
function CompletionCard({ title, icon, stats, emptyText }) {
  return (
    <div className="card">
      <h3 className="card-title-with-icon">
        <Icon name={icon} size={18} /> {title}
      </h3>

      {stats.total === 0 ? (
        <div className="empty-state">
          <p className="empty-title">Nothing to measure yet</p>
          <p>{emptyText}</p>
        </div>
      ) : (
        <>
          <div className="completion-numbers">
            <span>
              <strong>{stats.completed}</strong> completed
            </span>
            <span>
              <strong>{stats.pending}</strong> pending
            </span>
            <span className="badge badge-info">{stats.rate}% done</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${stats.rate}%` }} />
          </div>
          <p className="row-sub completion-footnote">{stats.total} in total</p>
        </>
      )}
    </div>
  )
}

// Analytics page: study totals, weekly goal progress (editable), a 7-day
// chart, lifetime subject split, and task/assignment completion rates.
export default function Analytics() {
  const { updateUser } = useAuth()

  const [data, setData] = useState(null)
  const [badges, setBadges] = useState(null)
  const [error, setError] = useState('')
  const [goalEditing, setGoalEditing] = useState(false)
  const [goalHours, setGoalHours] = useState('')
  const [goalError, setGoalError] = useState('')
  const [goalNotice, setGoalNotice] = useState('')
  const [savingGoal, setSavingGoal] = useState(false)

  // Fetches the summary and badge board together so the page renders once.
  const fetchAnalytics = () =>
    Promise.all([getAnalyticsSummary(), getAchievements()]).then(([summary, badgeData]) => ({
      summary: summary.data,
      badges: badgeData.data,
    }))

  // Reused after a goal change so progress and badges stay in sync.
  const loadAnalytics = () =>
    fetchAnalytics()
      .then((result) => {
        setData(result.summary)
        setBadges(result.badges)
        setError('')
      })
      .catch(() => setError('Could not load analytics. Is the server running?'))

  useEffect(() => {
    let cancelled = false
    fetchAnalytics()
      .then((result) => {
        if (cancelled) return
        setData(result.summary)
        setBadges(result.badges)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load analytics. Is the server running?')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Prefills the inline editor with the current target converted to hours.
  const openGoalEditor = () => {
    setGoalHours(String(Math.round((data.goal.weeklyGoalMinutes / 60) * 10) / 10))
    setGoalError('')
    setGoalNotice('')
    setGoalEditing(true)
  }

  // Saves the weekly target in minutes, updates the auth context, and
  // reloads derived numbers from the server.
  const handleGoalSubmit = async (e) => {
    e.preventDefault()
    const hours = Number(goalHours)

    if (!Number.isFinite(hours) || hours < 1 || hours > 168) {
      setGoalError('Choose a goal between 1 and 168 hours per week.')
      return
    }

    setSavingGoal(true)
    setGoalError('')

    try {
      const result = await updateMe({ preferences: { weeklyGoalMinutes: Math.round(hours * 60) } })
      updateUser(result.data.user)
      setGoalEditing(false)
      setGoalNotice('Weekly goal updated.')
      await loadAnalytics()
    } catch (err) {
      setGoalError(err.response?.data?.message || 'Could not save your goal. Please try again.')
    } finally {
      setSavingGoal(false)
    }
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>
  }

  if (!data || !badges) {
    return <div className="page-loading">Adding up your study hours...</div>
  }

  const { totals, weekly, heatmap, distribution, completion, goal } = data
  const { achievements, stats: badgeStats } = badges

  // Lay the 84-day series out as Sunday-first columns of seven days.
  const firstWeekday = heatmap.length ? new Date(`${heatmap[0].date}T00:00:00`).getDay() : 0
  const paddedHeatmap = [...Array(firstWeekday).fill(null), ...heatmap]
  const heatmapWeeks = []
  for (let index = 0; index < paddedHeatmap.length; index += 7) {
    heatmapWeeks.push(paddedHeatmap.slice(index, index + 7))
  }
  const heatmapMax = Math.max(1, ...heatmap.map((cell) => cell.minutes))
  const heatmapMinutes = heatmap.reduce((sum, cell) => sum + cell.minutes, 0)
  const activeDays = heatmap.filter((cell) => cell.minutes > 0).length
  const earnedCount = achievements.filter((badge) => badge.earned).length

  // Maps a day's minutes onto one of four ink/accent intensity levels.
  const heatLevel = (minutes) => {
    if (!minutes) return 0
    const ratio = minutes / heatmapMax
    if (ratio < 0.25) return 1
    if (ratio < 0.5) return 2
    if (ratio < 0.8) return 3
    return 4
  }

  // Formats milestone values differently for minute-based and count badges.
  const badgeValue = (badge, value) =>
    badge.unit === 'minutes' ? formatMinutes(value) : String(value)

  return (
    <section>
      <div className="page-heading">
        <h2>Analytics &amp; Goals</h2>
        <p>Study patterns, completion rates, and a weekly target you set yourself.</p>
      </div>

      <div className="stat-grid">
        <StatCard icon="clock" value={formatMinutes(totals.todayMinutes)} label="Studied today" />
        <StatCard icon="flame" value={formatMinutes(totals.weekMinutes)} label="This week" />
        <StatCard icon="calendar" value={formatMinutes(totals.monthMinutes)} label="Last 30 days" />
        <StatCard
          icon="assignment"
          value={completion.assignment.rate === null ? '—' : `${completion.assignment.rate}%`}
          label="Assignment completion"
        />
      </div>

      <div className="card goal-card">
        <div className="goal-heading">
          <div>
            <h3>Weekly study goal</h3>
            <p className="row-sub">
              {goal.met
                ? `Goal met — ${formatMinutes(goal.weekMinutes)} logged this week.`
                : `${formatMinutes(goal.remainingMinutes)} to go — ${formatMinutes(goal.weekMinutes)} of ${formatMinutes(goal.weeklyGoalMinutes)}.`}
            </p>
          </div>
          {!goalEditing && (
            <button type="button" className="btn-secondary btn-small" onClick={openGoalEditor}>
              <Icon name="edit" size={15} /> Edit goal
            </button>
          )}
        </div>

        <div className="progress-track goal-track">
          <div className={`progress-fill${goal.met ? ' goal-met' : ''}`} style={{ width: `${goal.percent}%` }} />
        </div>
        <div className="goal-meta">
          <span>{goal.percent}% of goal</span>
          <span>{formatMinutes(goal.weeklyGoalMinutes)} target</span>
        </div>

        {goalNotice && (
          <p className="alert alert-success goal-notice" role="status">
            {goalNotice}
          </p>
        )}

        {goalEditing && (
          <form className="goal-form" onSubmit={handleGoalSubmit}>
            <div className="form-group">
              <label htmlFor="goalHours">Weekly goal (hours)</label>
              <input
                id="goalHours"
                type="number"
                min="1"
                max="168"
                step="0.5"
                required
                value={goalHours}
                onChange={(e) => setGoalHours(e.target.value)}
              />
            </div>
            <div className="quick-actions">
              <button type="submit" className="btn-primary" disabled={savingGoal}>
                {savingGoal ? 'Saving...' : 'Save goal'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setGoalEditing(false)}>
                Cancel
              </button>
            </div>
            {goalError && (
              <p className="alert alert-error" role="alert">
                {goalError}
              </p>
            )}
          </form>
        )}
      </div>

      <div className="two-col analytics-charts">
        <div className="card">
          <h3>This week, day by day</h3>
          {totals.weekMinutes > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={weekly} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
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
              <p className="empty-title">No study time logged this week</p>
              <p>Finish a timer session and the bars will appear here.</p>
            </div>
          )}
        </div>

        <div className="card">
          <h3>Where your study time goes</h3>
          <p className="row-sub">All-time minutes by subject</p>
          {distribution.length === 0 ? (
            <div className="empty-state">
              <p className="empty-title">Not enough data yet</p>
              <p>Link study sessions to subjects and their split will show up here.</p>
            </div>
          ) : (
            <div className="distribution-list">
              {distribution.map((item, index) => (
                <div className="distribution-row" key={`${item.name}-${index}`}>
                  <div className="distribution-head">
                    <span className="chip">
                      <span
                        className="color-dot"
                        style={{ backgroundColor: item.color || 'var(--ink-soft)' }}
                      ></span>
                      {item.name}
                    </span>
                    <span className="distribution-minutes">
                      {formatMinutes(item.minutes)} · {item.percent}%
                    </span>
                  </div>
                  <div className="progress-track distribution-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${item.percent}%`, backgroundColor: item.color || 'var(--ink-soft)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="two-col">
        <CompletionCard
          title="Tasks"
          icon="tasks"
          stats={completion.task}
          emptyText="Add tasks in My Tasks and their completion rate appears here."
        />
        <CompletionCard
          title="Assignments"
          icon="assignment"
          stats={completion.assignment}
          emptyText="Add assignments and their completion rate appears here."
        />
      </div>

      <div className="card heatmap-card">
        <div className="section-heading-row">
          <div>
            <h3>Consistency</h3>
            <p className="row-sub">
              {activeDays} active day{activeDays === 1 ? '' : 's'} in the last 12 weeks ·{' '}
              {formatMinutes(heatmapMinutes)} studied
            </p>
          </div>
          <span className="badge badge-info">{badgeStats.streakDays}-day streak</span>
        </div>

        <div
          className="heatmap"
          role="img"
          aria-label={`Study heatmap for the last twelve weeks: ${activeDays} active days`}
        >
          {heatmapWeeks.map((week, weekIndex) => (
            <div className="heatmap-week" key={weekIndex}>
              {Array.from({ length: 7 }).map((_, dayIndex) => {
                const cell = week[dayIndex]
                if (!cell) {
                  return <span className="heatmap-cell is-empty" key={`blank-${dayIndex}`} />
                }
                return (
                  <span
                    key={cell.date}
                    className={`heatmap-cell heat-level-${heatLevel(cell.minutes)}`}
                    title={`${cell.date} · ${formatMinutes(cell.minutes)}`}
                  />
                )
              })}
            </div>
          ))}
        </div>

        <div className="heatmap-legend">
          <span>Less</span>
          <span className="heatmap-cell heat-level-0" />
          <span className="heatmap-cell heat-level-1" />
          <span className="heatmap-cell heat-level-2" />
          <span className="heatmap-cell heat-level-3" />
          <span className="heatmap-cell heat-level-4" />
          <span>More</span>
        </div>
      </div>

      <div className="card achievements-card">
        <div className="section-heading-row">
          <div>
            <h3>Milestones</h3>
            <p className="row-sub">Small rules, earned by actual work.</p>
          </div>
          <span className="badge badge-neutral">
            {earnedCount} of {achievements.length} earned
          </span>
        </div>

        <div className="achievement-grid">
          {achievements.map((badge) => (
            <div className={`achievement ${badge.earned ? 'earned' : ''}`} key={badge.id}>
              <span className="achievement-icon">
                <Icon name={badge.icon} size={21} />
              </span>
              <div className="achievement-main">
                <p className="achievement-title">{badge.title}</p>
                <p className="achievement-desc">{badge.description}</p>
                <div className="progress-track achievement-track">
                  <div className="progress-fill" style={{ width: `${badge.progress}%` }} />
                </div>
                <p className="achievement-progress">
                  {badge.earned
                    ? 'Earned'
                    : `${badgeValue(badge, badge.value)} / ${badgeValue(badge, badge.target)}`}
                </p>
              </div>
              {badge.earned && (
                <span className="achievement-check" aria-label="Earned">
                  <Icon name="check" size={16} />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
