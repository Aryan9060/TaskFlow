import { useEffect, useState } from 'react'
import { getSubjects, createSubject, updateSubject, deleteSubject } from '../services/subjects.js'
import Icon from '../components/Icon.jsx'

// Marker-pen palette offered in the subject form.
const COLOR_CHOICES = ['#FFE14D', '#F6B8B8', '#BFE3C0', '#BCD7F5', '#E3C8F0', '#F5D9A8', '#D8D8D2']

const EMPTY_FORM = { name: '', code: '', semester: '', description: '', color: COLOR_CHOICES[0] }

// Create/edit form rendered inline above the subject list.
function SubjectForm({ initial, saving, error, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial)

  // Keeps controlled inputs in sync when switching between subjects to edit.
  useEffect(() => {
    setForm(initial)
  }, [initial])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3>{initial._id ? 'Edit subject' : 'New subject'}</h3>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="subject-name">Name</label>
            <input
              id="subject-name"
              name="name"
              type="text"
              required
              maxLength={80}
              placeholder="e.g. Data Structures"
              value={form.name}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="subject-code">Code (optional)</label>
            <input
              id="subject-code"
              name="code"
              type="text"
              maxLength={20}
              placeholder="e.g. MCA-201"
              value={form.code}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="subject-semester">Semester (optional)</label>
            <input
              id="subject-semester"
              name="semester"
              type="text"
              maxLength={20}
              placeholder="e.g. Sem 3"
              value={form.semester}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Color</label>
            <div className="swatch-row">
              {COLOR_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  className={`swatch ${form.color === choice ? 'selected' : ''}`}
                  style={{ backgroundColor: choice }}
                  aria-label={`Choose color ${choice}`}
                  onClick={() => setForm({ ...form, color: choice })}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="subject-description">Description (optional)</label>
          <textarea
            id="subject-description"
            name="description"
            maxLength={500}
            placeholder="What is this subject about?"
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
            {saving ? 'Saving...' : initial._id ? 'Save changes' : 'Add subject'}
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

// Subjects page: list, search, create, edit, archive, and safe delete.
export default function Subjects() {
  const [subjects, setSubjects] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [formState, setFormState] = useState({ open: false, editing: null })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [actionError, setActionError] = useState('')

  // Loads (or reloads) the subject list from the API.
  const loadSubjects = async () => {
    try {
      const data = await getSubjects(showArchived)
      setSubjects(data.data.subjects)
      setError('')
    } catch {
      setError('Could not load subjects. Please try again.')
    }
  }

  // Reload whenever the archived toggle changes.
  useEffect(() => {
    loadSubjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived])

  // Opens the form for a new subject.
  const openCreate = () => {
    setFormError('')
    setFormState({ open: true, editing: { ...EMPTY_FORM } })
  }

  // Opens the form pre-filled for editing.
  const openEdit = (subject) => {
    setFormError('')
    setFormState({ open: true, editing: { ...subject } })
  }

  // Creates or updates depending on whether the form holds an _id.
  const handleSubmit = async (form) => {
    setFormError('')
    setSaving(true)
    try {
      if (form._id) {
        await updateSubject(form._id, {
          name: form.name,
          code: form.code,
          semester: form.semester,
          description: form.description,
          color: form.color,
        })
      } else {
        await createSubject(form)
      }
      setFormState({ open: false, editing: null })
      await loadSubjects()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not save the subject.')
    } finally {
      setSaving(false)
    }
  }

  // Archives or unarchives a subject in place.
  const toggleArchive = async (subject) => {
    setActionError('')
    try {
      await updateSubject(subject._id, { archived: !subject.archived })
      await loadSubjects()
    } catch (err) {
      setActionError(err.response?.data?.message || 'Could not update the subject.')
    }
  }

  // Deletes after the inline confirmation; the server blocks deletes that
  // would orphan tasks (409), which we surface here.
  const handleDelete = async (subject) => {
    setActionError('')
    try {
      await deleteSubject(subject._id)
      setConfirmDeleteId(null)
      await loadSubjects()
    } catch (err) {
      setConfirmDeleteId(null)
      setActionError(err.response?.data?.message || 'Could not delete the subject.')
    }
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>
  }

  if (!subjects) {
    return <div className="page-loading">Opening the notebook...</div>
  }

  // Client-side name search across the loaded list.
  const visible = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(search.trim().toLowerCase())
  )

  return (
    <section>
      <div className="page-heading">
        <h2>Subjects</h2>
        <p>The courses behind your tasks, exams, and study sessions.</p>
      </div>

      {actionError && (
        <div className="alert alert-error" role="alert">
          {actionError}
        </div>
      )}

      <div className="toolbar">
        <input
          type="search"
          className="toolbar-search"
          placeholder="Search subjects..."
          aria-label="Search subjects"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="toolbar-check">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>
        <span className="spacer" />
        <button type="button" className="btn-primary" onClick={openCreate}>
          <Icon name="plus" size={16} /> New subject
        </button>
      </div>

      {formState.open && (
        <SubjectForm
          initial={formState.editing}
          saving={saving}
          error={formError}
          onSubmit={handleSubmit}
          onCancel={() => setFormState({ open: false, editing: null })}
        />
      )}

      {visible.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">{search ? 'No matches' : 'No subjects yet'}</p>
          <p>{search ? 'Try a different search.' : 'Add your first subject to start organising.'}</p>
        </div>
      ) : (
        <div className="list">
          {visible.map((subject) => (
            <div className={`row-item ${subject.archived ? 'row-archived' : ''}`} key={subject._id}>
              <span className="color-dot" style={{ backgroundColor: subject.color }} />
              <div className="row-main">
                <p className="row-title">{subject.name}</p>
                <p className="row-sub">
                  {subject.code && <span className="chip">{subject.code}</span>}{' '}
                  {subject.semester && <span className="chip">{subject.semester}</span>}{' '}
                  {subject.archived && <span className="badge badge-neutral">Archived</span>}
                  {subject.description && <span> {subject.description}</span>}
                </p>
              </div>
              <div className="row-actions">
                <button type="button" className="icon-btn" aria-label={`Edit ${subject.name}`} onClick={() => openEdit(subject)}>
                  <Icon name="edit" size={16} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={subject.archived ? `Unarchive ${subject.name}` : `Archive ${subject.name}`}
                  onClick={() => toggleArchive(subject)}
                >
                  <Icon name="archive" size={16} />
                </button>
                {confirmDeleteId === subject._id ? (
                  <>
                    <button type="button" className="btn-danger" onClick={() => handleDelete(subject)}>
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
                    aria-label={`Delete ${subject.name}`}
                    onClick={() => setConfirmDeleteId(subject._id)}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
