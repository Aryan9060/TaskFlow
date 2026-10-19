import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { getExams, createExam, updateExam, deleteExam } from '../services/exams.js'
import { getSubjects } from '../services/subjects.js'
import { daysUntil, formatDateTime } from '../utils/format.js'

const EMPTY_FORM = { title: '', subject: '', date: '', time: '09:00', location: '', notes: '' }

const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

// Converts a stored exam timestamp into local date/time input values.
function toDraft(exam) {
  if (!exam?._id) return EMPTY_FORM
  const date = new Date(exam.examDate)
  const pad = (value) => String(value).padStart(2, '0')
  return {
    title: exam.title || '',
    subject: exam.subject?._id || '',
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
    location: exam.location || '',
    notes: exam.notes || '',
  }
}

// Countdown label and badge tone for an exam date.
function countdownMeta(examDate) {
  const diff = daysUntil(examDate)
  if (diff < 0) {
    return {
      label: diff === -1 ? 'Yesterday' : `${Math.abs(diff)} days ago`,
      className: 'badge-neutral',
    }
  }
  if (diff === 0) return { label: 'Today', className: 'badge-danger' }
  if (diff === 1) return { label: 'Tomorrow', className: 'badge-danger' }
  if (diff <= 3) return { label: `In ${diff} days`, className: 'badge-danger' }
  if (diff <= 7) return { label: `In ${diff} days`, className: 'badge-warn' }
  return { label: `In ${diff} days`, className: 'badge-info' }
}

// Inline create/edit form for exams.
function ExamForm({ initial, subjects, saving, error, onSubmit, onCancel }) {
  const [form, setForm] = useState(toDraft(initial))
  const isPast = form.date && daysUntil(`${form.date}T${form.time || '09:00'}`) < 0

  // Keeps the form in sync when switching between exams.
  useEffect(() => {
    setForm(toDraft(initial))
  }, [initial])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Combines the separate date and time inputs into one ISO timestamp.
  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      title: form.title.trim(),
      subject: form.subject || null,
      examDate: new Date(`${form.date}T${form.time || '09:00'}`).toISOString(),
      location: form.location,
      notes: form.notes,
    })
  }

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3>{initial._id ? 'Edit exam' : 'Schedule an exam'}</h3>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="exam-title">Exam title</label>
          <input
            id="exam-title"
            name="title"
            type="text"
            required
            maxLength={120}
            placeholder="e.g. Data Structures — Mid Sem"
            value={form.title}
            onChange={handleChange}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="exam-subject">Subject (optional)</label>
            <select id="exam-subject" name="subject" value={form.subject} onChange={handleChange}>
              <option value="">No subject</option>
              {subjects.map((subject) => (
                <option key={subject._id} value={subject._id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="exam-location">Room / location (optional)</label>
            <input
              id="exam-location"
              name="location"
              type="text"
              maxLength={120}
              placeholder="e.g. Lab 204"
              value={form.location}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="exam-date">Date</label>
            <input
              id="exam-date"
              name="date"
              type="date"
              required
              value={form.date}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="exam-time">Start time</label>
            <input
              id="exam-time"
              name="time"
              type="time"
              required
              value={form.time}
              onChange={handleChange}
            />
          </div>
        </div>

        <p className="field-hint">Times are in {TIME_ZONE}.</p>
        {isPast && (
          <p className="field-hint" role="status">
            That date is in the past — it will be saved as a past exam.
          </p>
        )}

        <div className="form-group">
          <label htmlFor="exam-notes">Notes (optional)</label>
          <textarea
            id="exam-notes"
            name="notes"
            maxLength={2000}
            placeholder="Syllabus, seating, things to carry..."
            value={form.notes}
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
            {saving ? 'Saving...' : initial._id ? 'Save changes' : 'Add exam'}
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

// Exam planner: schedule, edit, count down to, and clear past exams.
export default function Exams() {
  const [exams, setExams] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [formState, setFormState] = useState({ open: false, editing: null })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  // Loads exams and subjects in parallel.
  const loadExams = async () => {
    try {
      const data = await getExams()
      setExams(data.data.exams)
      setError('')
    } catch {
      setError('Could not load exams. Please try again.')
    }
  }

  useEffect(() => {
    loadExams()
    getSubjects()
      .then((data) => setSubjects(data.data.subjects))
      .catch(() => setSubjects([]))
  }, [])

  const openCreate = () => {
    setFormError('')
    setFormState({ open: true, editing: { ...EMPTY_FORM } })
  }

  const openEdit = (exam) => {
    setFormError('')
    setFormState({ open: true, editing: exam })
  }

  // Creates or updates, then refreshes the planner.
  const handleSubmit = async (payload) => {
    setFormError('')
    setSaving(true)
    try {
      if (formState.editing?._id) {
        await updateExam(formState.editing._id, payload)
      } else {
        await createExam(payload)
      }
      setFormState({ open: false, editing: null })
      await loadExams()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not save the exam.')
    } finally {
      setSaving(false)
    }
  }

  // Deletes after the inline confirmation.
  const handleDelete = async (exam) => {
    setActionError('')
    try {
      await deleteExam(exam._id)
      setConfirmDeleteId(null)
      await loadExams()
    } catch (err) {
      setConfirmDeleteId(null)
      setActionError(err.response?.data?.message || 'Could not delete the exam.')
    }
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>
  }

  if (!exams) {
    return <div className="page-loading">Saving your seat...</div>
  }

  const upcoming = exams.filter((exam) => daysUntil(exam.examDate) >= 0)
  const past = exams
    .filter((exam) => daysUntil(exam.examDate) < 0)
    .sort((a, b) => new Date(b.examDate) - new Date(a.examDate))

  // One exam row with date block, details, countdown, and actions.
  const renderExam = (exam) => {
    const date = new Date(exam.examDate)
    const countdown = countdownMeta(exam.examDate)

    return (
      <div className="row-item exam-row" key={exam._id}>
        <div className="exam-date" aria-hidden="true">
          <span className="exam-day">{date.getDate()}</span>
          <span className="exam-month">
            {date.toLocaleDateString('en-US', { month: 'short' })}
          </span>
        </div>

        <div className="row-main">
          <p className="row-title">{exam.title}</p>
          <p className="row-sub">
            {exam.subject && (
              <span className="chip">
                <span className="color-dot" style={{ backgroundColor: exam.subject.color }} />
                {exam.subject.name}
              </span>
            )}{' '}
            {formatDateTime(exam.examDate)}
            {exam.location && <> · {exam.location}</>}
            {exam.notes && <> · {exam.notes}</>}
          </p>
        </div>

        <span className={`badge ${countdown.className}`}>{countdown.label}</span>

        <div className="row-actions">
          <button
            type="button"
            className="icon-btn"
            aria-label={`Edit ${exam.title}`}
            onClick={() => openEdit(exam)}
          >
            <Icon name="edit" size={16} />
          </button>
          {confirmDeleteId === exam._id ? (
            <>
              <button type="button" className="btn-danger" onClick={() => handleDelete(exam)}>
                Sure?
              </button>
              <button type="button" className="btn-ghost" onClick={() => setConfirmDeleteId(null)}>
                Keep
              </button>
            </>
          ) : (
            <button
              type="button"
              className="icon-btn danger"
              aria-label={`Delete ${exam.title}`}
              onClick={() => setConfirmDeleteId(exam._id)}
            >
              <Icon name="trash" size={16} />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <section>
      <div className="page-heading">
        <h2>Exam Planner</h2>
        <p>Dates, rooms, and how many sleeps are left. Times are in {TIME_ZONE}.</p>
      </div>

      {actionError && (
        <div className="alert alert-error" role="alert">
          {actionError}
        </div>
      )}

      <div className="toolbar">
        <span className="spacer" />
        <button type="button" className="btn-primary" onClick={openCreate}>
          <Icon name="plus" size={16} /> New exam
        </button>
      </div>

      {formState.open && (
        <ExamForm
          initial={formState.editing}
          subjects={subjects}
          saving={saving}
          error={formError}
          onSubmit={handleSubmit}
          onCancel={() => setFormState({ open: false, editing: null })}
        />
      )}

      <h3 className="section-label">Upcoming</h3>
      {upcoming.length === 0 ? (
        <div className="empty-state" style={{ marginBottom: '1.25rem' }}>
          <p className="empty-title">No exams scheduled</p>
          <p>Add your next exam and the countdown starts here.</p>
        </div>
      ) : (
        <div className="list" style={{ marginBottom: '1.25rem' }}>
          {upcoming.map(renderExam)}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h3 className="section-label">Past</h3>
          <div className="list">{past.map(renderExam)}</div>
        </>
      )}
    </section>
  )
}
