import { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { getExams } from '../services/exams.js'
import { getTasks } from '../services/tasks.js'
import { dayKeyOf, monthLabel } from '../utils/format.js'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

// Builds a 6x7 grid of dates covering the visible month, including the
// leading/trailing days needed to fill whole weeks.
function buildCalendar(year, monthIndex) {
  const firstOfMonth = new Date(year, monthIndex, 1)
  const gridStart = new Date(year, monthIndex, 1 - firstOfMonth.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index)
    return {
      date,
      key: dayKeyOf(date),
      inMonth: date.getMonth() === monthIndex,
    }
  })
}

// Calendar page: one month grid for exams, assignment deadlines, and tasks.
export default function Calendar() {
  const today = new Date()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selectedKey, setSelectedKey] = useState(dayKeyOf(today))

  // Loads exams and every task once; the grid groups them by local day.
  useEffect(() => {
    Promise.all([getExams(), getTasks()])
      .then(([examData, taskData]) => {
        setData({
          exams: examData.data.exams,
          tasks: taskData.data.tasks,
        })
      })
      .catch(() => setError('Could not load your calendar. Please try again.'))
  }, [])

  // Flattens exams and dated tasks into one sorted event list.
  const events = useMemo(() => {
    if (!data) return []

    const examEvents = data.exams.map((exam) => ({
      id: `exam-${exam._id}`,
      type: 'exam',
      title: exam.title,
      date: new Date(exam.examDate),
      subject: exam.subject,
    }))

    const taskEvents = data.tasks
      .filter((task) => task.dueDate)
      .map((task) => ({
        id: `task-${task._id}`,
        type: task.kind === 'assignment' ? 'assignment' : 'task',
        title: task.title,
        date: new Date(task.dueDate),
        subject: task.subject,
        status: task.status,
      }))

    return [...examEvents, ...taskEvents].sort((a, b) => a.date - b.date)
  }, [data])

  // Groups events by "YYYY-MM-DD" for O(1) lookups per cell.
  const eventsByDay = useMemo(() => {
    const map = new Map()
    for (const event of events) {
      const key = dayKeyOf(event.date)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(event)
    }
    return map
  }, [events])

  if (error) {
    return <div className="alert alert-error">{error}</div>
  }

  if (!data) {
    return <div className="page-loading">Unfolding the calendar...</div>
  }

  const cells = buildCalendar(cursor.year, cursor.month)
  const todayKey = dayKeyOf(today)
  const selectedDate = new Date(`${selectedKey}T00:00:00`)
  const selectedEvents = eventsByDay.get(selectedKey) || []

  // Moves the visible month by the given offset.
  const moveMonth = (offset) => {
    const next = new Date(cursor.year, cursor.month + offset, 1)
    setCursor({ year: next.getFullYear(), month: next.getMonth() })
  }

  // Jumps back to the current month and selects today.
  const goToday = () => {
    setCursor({ year: today.getFullYear(), month: today.getMonth() })
    setSelectedKey(todayKey)
  }

  return (
    <section>
      <div className="page-heading">
        <h2>Calendar</h2>
        <p>
          Exams, assignment deadlines, and task due dates in one place. Times are in {TIME_ZONE}.
        </p>
      </div>

      <div className="toolbar">
        <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => moveMonth(-1)}>
          <Icon name="chevronLeft" size={16} />
        </button>
        <h3 className="calendar-month">{monthLabel(cursor.year, cursor.month)}</h3>
        <button type="button" className="icon-btn" aria-label="Next month" onClick={() => moveMonth(1)}>
          <Icon name="chevronRight" size={16} />
        </button>
        <button type="button" className="btn-secondary" onClick={goToday}>
          Today
        </button>
        <span className="spacer" />
        <div className="legend">
          <span className="legend-item">
            <span className="legend-dot legend-exam" /> Exam
          </span>
          <span className="legend-item">
            <span className="legend-dot legend-assignment" /> Assignment
          </span>
          <span className="legend-item">
            <span className="legend-dot legend-task" /> Task
          </span>
        </div>
      </div>

      <div className="calendar-weekdays" aria-hidden="true">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="calendar-grid">
        {cells.map((cell) => {
          const dayEvents = eventsByDay.get(cell.key) || []
          const visible = dayEvents.slice(0, 2)
          const hidden = dayEvents.length - visible.length
          const classes = [
            'calendar-day',
            cell.inMonth ? '' : 'outside',
            cell.key === todayKey ? 'today' : '',
            cell.key === selectedKey ? 'selected' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              type="button"
              key={cell.key}
              className={classes}
              aria-label={`${cell.date.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
              })}, ${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}`}
              onClick={() => setSelectedKey(cell.key)}
            >
              <span className="calendar-day-number">{cell.date.getDate()}</span>
              {visible.map((event) => (
                <span className={`event-chip event-${event.type}`} key={event.id}>
                  <span className="event-dot" />
                  <span className="event-label">{event.title}</span>
                </span>
              ))}
              {hidden > 0 && <span className="event-more">+{hidden} more</span>}
            </button>
          )
        })}
      </div>

      <div className="card" style={{ marginTop: '1.25rem' }}>
        <h3>
          {selectedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </h3>

        {selectedEvents.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">Nothing on this day</p>
            <p>Pick another date, or enjoy the blank space.</p>
          </div>
        ) : (
          <div className="list">
            {selectedEvents.map((event) => (
              <div className="row-item" key={event.id}>
                <span className={`event-dot event-dot-${event.type}`} aria-hidden="true" />
                <div className="row-main">
                  <p className="row-title">{event.title}</p>
                  <p className="row-sub">
                    {event.type === 'exam'
                      ? `Exam · ${event.date.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : 'Due date'}{' '}
                    {event.subject && (
                      <>
                        · <span className="chip">
                          <span
                            className="color-dot"
                            style={{ backgroundColor: event.subject.color }}
                          />
                          {event.subject.name}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                {event.type === 'exam' ? (
                  <span className="badge badge-danger">Exam</span>
                ) : event.status === 'completed' ? (
                  <span className="badge badge-success">Completed</span>
                ) : (
                  <span className={`badge ${event.type === 'assignment' ? 'badge-info' : 'badge-warn'}`}>
                    {event.type === 'assignment' ? 'Assignment' : 'Task'}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
