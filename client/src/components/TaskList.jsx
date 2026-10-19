import Icon from './Icon.jsx'
import { deadlineRisk, formatMinutes, shortDate, daysUntil } from '../utils/format.js'

const STATUS_META = {
  todo: { label: 'To do', className: 'badge-neutral' },
  'in-progress': { label: 'In progress', className: 'badge-info' },
  completed: { label: 'Completed', className: 'badge-success' },
}

const PRIORITY_META = {
  high: { label: 'High', className: 'badge-danger' },
  medium: { label: 'Medium', className: 'badge-warn' },
  low: { label: 'Low', className: 'badge-neutral' },
}

const RECURRENCE_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }

// Shared list for tasks and assignments: overdue flags, subject chips,
// progress badges, complete toggle, and confirmed delete.
export default function TaskList({
  tasks,
  togglingId,
  confirmDeleteId,
  onToggle,
  onEdit,
  onDelete,
  onAskDelete,
  onCancelDelete,
}) {
  return (
    <div className="list">
      {tasks.map((task) => {
        const isDone = task.status === 'completed'
        const isOverdue = task.dueDate && !isDone && daysUntil(task.dueDate) < 0
        const status = STATUS_META[task.status] || STATUS_META.todo
        const priority = PRIORITY_META[task.priority] || PRIORITY_META.medium
        const risk = deadlineRisk(task)

        return (
          <div className={`row-item ${isDone ? 'task-done' : ''}`} key={task._id}>
            <button
              type="button"
              className={`task-check ${isDone ? 'checked' : ''}`}
              aria-label={isDone ? `Mark ${task.title} as to do` : `Complete ${task.title}`}
              aria-pressed={isDone}
              disabled={togglingId === task._id}
              onClick={() => onToggle(task)}
            >
              {isDone && <Icon name="check" size={14} />}
            </button>

            <div className="row-main">
              <p className="row-title">{task.title}</p>
              <p className="row-sub">
                {task.subject && (
                  <span className="chip">
                    <span
                      className="color-dot"
                      style={{ backgroundColor: task.subject.color }}
                    />
                    {task.subject.name}
                  </span>
                )}{' '}
                {task.dueDate && (
                  <span className={isOverdue ? 'overdue-flag' : ''}>
                    {isOverdue ? 'Overdue · ' : ''}
                    {shortDate(task.dueDate)}
                  </span>
                )}
                {task.estimatedMinutes != null && (
                  <> · {formatMinutes(task.estimatedMinutes)}</>
                )}
                {task.description && <> · {task.description}</>}
              </p>
              <p className="row-badges">
                <span className={`badge ${status.className}`}>{status.label}</span>{' '}
                <span className={`badge ${priority.className}`}>{priority.label}</span>
                {RECURRENCE_LABELS[task.recurrence] && (
                  <span className="badge badge-info badge-inline">
                    <Icon name="refresh" size={12} /> {RECURRENCE_LABELS[task.recurrence]}
                  </span>
                )}
                {risk && (
                  <span className={`badge ${risk.className}`} title={risk.detail}>
                    {risk.label}
                  </span>
                )}
              </p>
            </div>

            <div className="row-actions">
              <button
                type="button"
                className="icon-btn"
                aria-label={`Edit ${task.title}`}
                onClick={() => onEdit(task)}
              >
                <Icon name="edit" size={16} />
              </button>
              {confirmDeleteId === task._id ? (
                <>
                  <button type="button" className="btn-danger" onClick={() => onDelete(task)}>
                    Sure?
                  </button>
                  <button type="button" className="btn-ghost" onClick={onCancelDelete}>
                    Keep
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="icon-btn danger"
                  aria-label={`Delete ${task.title}`}
                  onClick={() => onAskDelete(task._id)}
                >
                  <Icon name="trash" size={16} />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
