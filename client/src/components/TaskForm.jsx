import { useEffect, useState } from 'react'

const EMPTY_FORM = {
  title: '',
  description: '',
  subject: '',
  dueDate: '',
  priority: 'medium',
  status: 'todo',
  estimatedMinutes: '',
  recurrence: 'none',
}

// Converts a stored task into the flat shape the form inputs expect.
function toFormValues(task) {
  return {
    title: task.title || '',
    description: task.description || '',
    subject: task.subject?._id || '',
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
    priority: task.priority || 'medium',
    status: task.status || 'todo',
    estimatedMinutes: task.estimatedMinutes ?? '',
    recurrence: task.recurrence || 'none',
  }
}

// Create/edit form shared by the Tasks and Assignments pages.
export default function TaskForm({ initial, subjects, saving, error, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial._id ? toFormValues(initial) : EMPTY_FORM)

  // Keeps inputs in sync when the user switches to editing another task.
  useEffect(() => {
    setForm(initial._id ? toFormValues(initial) : EMPTY_FORM)
  }, [initial])

  // Updates a single controlled field.
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Normalises empty strings to null before sending to the API.
  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...form,
      title: form.title.trim(),
      subject: form.subject || null,
      dueDate: form.dueDate || null,
      estimatedMinutes: form.estimatedMinutes === '' ? null : Number(form.estimatedMinutes),
    })
  }

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3>{initial._id ? 'Edit details' : 'New entry'}</h3>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="task-title">Title</label>
          <input
            id="task-title"
            name="title"
            type="text"
            required
            maxLength={120}
            placeholder="e.g. Finish DBMS assignment"
            value={form.title}
            onChange={handleChange}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="task-subject">Subject (optional)</label>
            <select id="task-subject" name="subject" value={form.subject} onChange={handleChange}>
              <option value="">No subject</option>
              {subjects.map((subject) => (
                <option key={subject._id} value={subject._id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="task-due">
              Due date {form.recurrence === 'none' ? '(optional)' : ''}
            </label>
            <input
              id="task-due"
              name="dueDate"
              type="date"
              required={form.recurrence !== 'none'}
              value={form.dueDate}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="task-priority">Priority</label>
            <select id="task-priority" name="priority" value={form.priority} onChange={handleChange}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="task-status">Status</label>
            <select id="task-status" name="status" value={form.status} onChange={handleChange}>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="task-recurrence">Repeat</label>
            <select
              id="task-recurrence"
              name="recurrence"
              value={form.recurrence}
              onChange={handleChange}
            >
              <option value="none">Does not repeat</option>
              <option value="daily">Every day</option>
              <option value="weekly">Every week</option>
              <option value="monthly">Every month</option>
            </select>
            {form.recurrence !== 'none' && (
              <p className="field-hint">
                Completing this entry schedules the next one automatically.
              </p>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="task-effort">Estimated effort (minutes, optional)</label>
            <input
              id="task-effort"
              name="estimatedMinutes"
              type="number"
              min="0"
              max="10080"
              step="5"
              placeholder="e.g. 45"
              value={form.estimatedMinutes}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="task-description">Description (optional)</label>
          <textarea
            id="task-description"
            name="description"
            maxLength={2000}
            placeholder="Notes, links, or what “done” looks like."
            value={form.description}
            onChange={handleChange}
          />
        </div>

        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}

        <div className="quick-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : initial._id ? 'Save changes' : 'Add to list'}
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
