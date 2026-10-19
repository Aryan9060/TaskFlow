import { useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getSubjects } from '../services/subjects.js'
import { getTasks } from '../services/tasks.js'
import { getSessions, getSessionStats, createSession } from '../services/sessions.js'
import { formatMinutes } from '../utils/format.js'

const STORAGE_KEY = 'taskflow-timer'

const EMPTY_TIMER = {
  mode: 'stopwatch',
  running: false,
  startedAt: null,
  runningSince: null,
  accumulatedMs: 0,
  phase: 'focus',
  subject: '',
  task: '',
}

// Restores a saved timer only for the same user, and discards stale runs
// longer than the 24-hour session limit.
function loadSavedTimer(userId) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!saved || saved.userId !== userId) return EMPTY_TIMER

    const staleMs =
      saved.accumulatedMs + (saved.running && saved.runningSince ? Date.now() - saved.runningSince : 0)
    if (staleMs > 24 * 60 * 60 * 1000) return EMPTY_TIMER

    const { userId: _userId, ...timer } = saved
    return { ...EMPTY_TIMER, ...timer }
  } catch {
    return EMPTY_TIMER
  }
}

// Formats milliseconds as HH:MM:SS for the big timer display.
function clockText(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

// Plays a short two-note chime when a Pomodoro phase ends.
function playChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    const context = new AudioContextClass()
    const gain = context.createGain()
    gain.connect(context.destination)
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.6)

    const oscillator = context.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(660, context.currentTime)
    oscillator.frequency.setValueAtTime(880, context.currentTime + 0.22)
    oscillator.connect(gain)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.6)
  } catch {
    // Audio can be blocked by the browser; the timer still works.
  }
}

// Study timer page: stopwatch and Pomodoro modes with saved sessions.
export default function Timer() {
  const { user } = useAuth()
  const focusMinutes = user?.preferences?.pomodoroFocusMinutes ?? 25
  const breakMinutes = user?.preferences?.pomodoroBreakMinutes ?? 5

  const [timer, setTimer] = useState(() => loadSavedTimer(user.id))
  const [now, setNow] = useState(Date.now())
  const [subjects, setSubjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [stats, setStats] = useState(null)
  const [sessions, setSessions] = useState(null)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  // Guards against saving one phase twice (React re-runs effects on mount
  // in development, and fast ticks can overlap).
  const phaseGuardRef = useRef(false)

  // A single ticking clock; accuracy always comes from timestamps below.
  useEffect(() => {
    if (!timer.running) return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [timer.running])

  // Warns before a refresh/close while the timer is running. The saved
  // timestamp means the elapsed time survives either way.
  useEffect(() => {
    if (!timer.running) return
    const handler = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [timer.running])

  // Persists timer state so navigation/refresh never loses the clock.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId: user.id, ...timer }))
    } catch {
      // Storage can be unavailable in private mode.
    }
  }, [timer, user.id])

  // Loads reference data (subjects, open tasks) and totals.
  const refreshData = async () => {
    try {
      const [statsData, sessionsData] = await Promise.all([getSessionStats(), getSessions()])
      setStats(statsData.data.stats)
      setSessions(sessionsData.data.sessions)
    } catch {
      setActionError('Could not load study history.')
    }
  }

  useEffect(() => {
    getSubjects()
      .then((data) => setSubjects(data.data.subjects))
      .catch(() => setSubjects([]))
    getTasks()
      .then((data) => setTasks(data.data.tasks.filter((task) => task.status !== 'completed')))
      .catch(() => setTasks([]))
    refreshData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const phaseMinutes = timer.phase === 'focus' ? focusMinutes : breakMinutes
  const phaseMs = phaseMinutes * 60000
  const elapsedMs =
    timer.accumulatedMs + (timer.running && timer.runningSince ? now - timer.runningSince : 0)
  const remainingMs = Math.max(0, phaseMs - elapsedMs)
  const progress = timer.mode === 'pomodoro' ? Math.min(1, elapsedMs / phaseMs) : 0
  const hasTime = elapsedMs >= 1000

  // Applies a partial state update in one place.
  const updateTimer = (patch) => setTimer((prev) => ({ ...prev, ...patch }))

  // Starts a fresh timer or resumes a paused one.
  const handleStart = () => {
    setNotice('')
    setActionError('')
    if (timer.running) {
      updateTimer({
        running: false,
        runningSince: null,
        accumulatedMs: timer.accumulatedMs + (Date.now() - timer.runningSince),
      })
      return
    }
    updateTimer({
      running: true,
      runningSince: Date.now(),
      startedAt: timer.startedAt || new Date().toISOString(),
    })
  }

  // Clears the clock while keeping the chosen mode and links.
  const resetTimer = () => {
    setConfirmReset(false)
    setTimer((prev) => ({
      ...EMPTY_TIMER,
      mode: prev.mode,
      subject: prev.subject,
      task: prev.task,
      phase: 'focus',
    }))
  }

  // Saves the current block if it lasted at least one minute.
  const handleFinish = async () => {
    setNotice('')
    setActionError('')

    if (timer.mode === 'pomodoro' && timer.phase === 'break') {
      resetTimer()
      setNotice('Break ended.')
      return
    }

    if (elapsedMs < 60000) {
      resetTimer()
      setNotice('Less than a minute — nothing saved.')
      return
    }

    const minutes = Math.max(1, Math.round(elapsedMs / 60000))
    try {
      await createSession({
        subject: timer.subject || null,
        task: timer.task || null,
        mode: timer.mode,
        startedAt: timer.startedAt || new Date(Date.now() - elapsedMs).toISOString(),
        endedAt: new Date().toISOString(),
        durationMinutes: minutes,
      })
      resetTimer()
      setNotice(`Saved ${formatMinutes(minutes)} of study. Nice work.`)
      await refreshData()
    } catch (err) {
      setActionError(err.response?.data?.message || 'Could not save the study session.')
    }
  }

  // Pomodoro phase completion: auto-save finished focus blocks, then pause
  // and hand over to the break (or back to focus). Pausing avoids runaway
  // sessions if the tab is left open.
  useEffect(() => {
    if (timer.mode !== 'pomodoro' || !timer.running || elapsedMs < phaseMs) {
      phaseGuardRef.current = false
      return
    }
    if (phaseGuardRef.current) return
    phaseGuardRef.current = true

    const finishedPhase = timer.phase
    if (finishedPhase === 'focus') {
      createSession({
        subject: timer.subject || null,
        task: timer.task || null,
        mode: 'pomodoro',
        startedAt: new Date(Date.now() - phaseMs).toISOString(),
        endedAt: new Date().toISOString(),
        durationMinutes: focusMinutes,
        note: 'Pomodoro focus block',
      })
        .then(() => refreshData())
        .catch(() => setActionError('Focus block ended but could not be saved.'))

      updateTimer({ running: false, runningSince: null, accumulatedMs: 0, phase: 'break' })
      setNotice(`Focus block complete — take ${breakMinutes} minute(s).`)
    } else {
      updateTimer({ running: false, runningSince: null, accumulatedMs: 0, phase: 'focus' })
      setNotice('Break complete — ready for another focus block?')
    }
    playChime()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedMs, phaseMs, timer.mode, timer.running, timer.phase])

  const selectableTasks = tasks

  return (
    <section>
      <div className="page-heading">
        <h2>Study Timer</h2>
        <p>One block at a time. The clock uses real timestamps, so switching tabs is safe.</p>
      </div>

      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}
      {actionError && (
        <div className="alert alert-error" role="alert">
          {actionError}
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-icon">
            <Icon name="clock" size={18} />
          </span>
          <p className="stat-value">{stats ? formatMinutes(stats.todayMinutes) : '—'}</p>
          <p className="stat-label">Today</p>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <Icon name="flame" size={18} />
          </span>
          <p className="stat-value">{stats ? formatMinutes(stats.weekMinutes) : '—'}</p>
          <p className="stat-label">This week</p>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <Icon name="check" size={18} />
          </span>
          <p className="stat-value">{stats ? stats.sessionsToday : '—'}</p>
          <p className="stat-label">Sessions today</p>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <Icon name="trophy" size={18} />
          </span>
          <p className="stat-value">{stats ? stats.pomodoroSessions : '—'}</p>
          <p className="stat-label">Pomodoro blocks</p>
        </div>
      </div>

      <div className="card timer-card">
        <div className="mode-tabs" role="tablist" aria-label="Timer mode">
          <button
            type="button"
            role="tab"
            aria-selected={timer.mode === 'stopwatch'}
            className={`mode-tab ${timer.mode === 'stopwatch' ? 'active' : ''}`}
            disabled={hasTime || timer.running}
            onClick={() => updateTimer({ mode: 'stopwatch', phase: 'focus' })}
          >
            Stopwatch
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={timer.mode === 'pomodoro'}
            className={`mode-tab ${timer.mode === 'pomodoro' ? 'active' : ''}`}
            disabled={hasTime || timer.running}
            onClick={() => updateTimer({ mode: 'pomodoro', phase: 'focus' })}
          >
            Pomodoro
          </button>
        </div>

        {timer.mode === 'pomodoro' && (
          <p className="timer-phase">
            <span className={`badge ${timer.phase === 'focus' ? 'badge-danger' : 'badge-info'}`}>
              {timer.phase === 'focus' ? 'Focus' : 'Break'}
            </span>{' '}
            {timer.phase === 'focus'
              ? `${focusMinutes} min focus`
              : `${breakMinutes} min break`}
          </p>
        )}

        <p className="timer-display" role="timer" aria-live="off">
          {timer.mode === 'pomodoro' ? clockText(remainingMs) : clockText(elapsedMs)}
        </p>

        {timer.mode === 'pomodoro' && (
          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}

        <div className="form-row timer-links">
          <div className="form-group">
            <label htmlFor="timer-subject">Subject (optional)</label>
            <select
              id="timer-subject"
              value={timer.subject}
              disabled={hasTime || timer.running}
              onChange={(e) => updateTimer({ subject: e.target.value })}
            >
              <option value="">General study</option>
              {subjects.map((subject) => (
                <option key={subject._id} value={subject._id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="timer-task">Task (optional)</label>
            <select
              id="timer-task"
              value={timer.task}
              disabled={hasTime || timer.running}
              onChange={(e) => updateTimer({ task: e.target.value })}
            >
              <option value="">No linked task</option>
              {selectableTasks.map((task) => (
                <option key={task._id} value={task._id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="timer-actions">
          <button type="button" className="btn-primary" onClick={handleStart}>
            <Icon name={timer.running ? 'pause' : 'play'} size={16} />
            {timer.running ? 'Pause' : hasTime ? 'Resume' : 'Start'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={!hasTime && !timer.running}
            onClick={handleFinish}
          >
            <Icon name="check" size={16} /> Finish & save
          </button>
          {confirmReset ? (
            <>
              <button type="button" className="btn-danger" onClick={resetTimer}>
                Discard it
              </button>
              <button type="button" className="btn-ghost" onClick={() => setConfirmReset(false)}>
                Keep
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-ghost"
              disabled={!hasTime && !timer.running}
              onClick={() => setConfirmReset(true)}
            >
              <Icon name="refresh" size={16} /> Reset
            </button>
          )}
        </div>

        <p className="field-hint">
          A running timer keeps time even if you switch pages or refresh — this browser holds
          the start timestamp until you finish or reset.
        </p>
      </div>

      <div className="card">
        <h3>Recent sessions</h3>
        {!sessions ? (
          <p className="row-sub">Loading history...</p>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">No sessions yet</p>
            <p>Finish your first block and it will appear here.</p>
          </div>
        ) : (
          <div className="list">
            {sessions.map((session) => (
              <div className="row-item" key={session._id}>
                <span
                  className={`badge ${session.mode === 'pomodoro' ? 'badge-info' : 'badge-neutral'}`}
                >
                  {session.mode === 'pomodoro' ? 'Pomodoro' : 'Stopwatch'}
                </span>
                <div className="row-main">
                  <p className="row-title">
                    {session.subject?.name || 'General study'}
                    {session.task?.title && <> · {session.task.title}</>}
                  </p>
                  <p className="row-sub">
                    {new Date(session.endedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    ·{' '}
                    {new Date(session.startedAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {' – '}
                    {new Date(session.endedAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className="row-duration">{formatMinutes(session.durationMinutes)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
