import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import TaskForm from '../components/TaskForm.jsx'
import TaskList from '../components/TaskList.jsx'
import { getTasks, createTask, updateTask, deleteTask } from '../services/tasks.js'
import { getSubjects } from '../services/subjects.js'
import { shortDate } from '../utils/format.js'

// Page copy and behaviour differences between the two list types.
const PAGE_META = {
  task: {
    title: 'My Tasks',
    subtitle: 'Everything you need to do, one honest list.',
    newLabel: 'New task',
    loading: 'Sharpening pencils...',
    emptyTitle: 'Nothing on the list',
    emptyText: 'Add your first task and give it a due date.',
  },
  assignment: {
    title: 'Assignments',
    subtitle: 'Submissions, deadlines, and the work behind them.',
    newLabel: 'New assignment',
    loading: 'Flipping through assignments...',
    emptyTitle: 'No assignments yet',
    emptyText: 'Add the next submission so it stops living in your head.',
  },
}

const SORT_OPTIONS = [
  { value: 'dueDate:asc', label: 'Due date · soonest' },
  { value: 'priority:asc', label: 'Priority · high first' },
  { value: 'createdAt:desc', label: 'Recently added' },
  { value: 'title:asc', label: 'Title · A–Z' },
]

const EMPTY_TASK = { title: '', description: '' }

// Shared page for tasks and assignments: server-side search, filters,
// sorting, inline create/edit, complete toggles, and safe deletes.
export default function TaskPage({ kind }) {
  const meta = PAGE_META[kind]

  const [tasks, setTasks] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [sort, setSort] = useState('dueDate:asc')

  const [formState, setFormState] = useState({ open: false, editing: null })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  // Loads subjects once so the form and filter can offer them.
  useEffect(() => {
    getSubjects()
      .then((data) => setSubjects(data.data.subjects))
      .catch(() => setSubjects([]))
  }, [])

  // Fetches filtered tasks whenever a query parameter changes. Search is
  // debounced briefly so fast typing does not spam the API.
  useEffect(() => {
    let cancelled = false
    const [sortBy, order] = sort.split(':')

    const timer = setTimeout(async () => {
      try {
        const data = await getTasks({
          kind,
          search: search.trim() || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
          priority: priorityFilter === 'all' ? undefined : priorityFilter,
          subject: subjectFilter === 'all' ? undefined : subjectFilter,
          sort: sortBy,
          order,
        })
        if (!cancelled) {
          setTasks(data.data.tasks)
          setError('')
        }
      } catch {
        if (!cancelled) setError(`Could not load your ${kind}s. Please try again.`)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [kind, search, statusFilter, priorityFilter, subjectFilter, sort])

  // Reloads the current view after a write without losing filters.
  const loadTasks = async () => {
    const [sortBy, order] = sort.split(':')
    try {
      const data = await getTasks({
        kind,
        search: search.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        priority: priorityFilter === 'all' ? undefined : priorityFilter,
        subject: subjectFilter === 'all' ? undefined : subjectFilter,
        sort: sortBy,
        order,
      })
      setTasks(data.data.tasks)
      setError('')
    } catch {
      setError(`Could not load your ${kind}s. Please try again.`)
    }
  }

  // Opens a blank form.
  const openCreate = () => {
    setFormError('')
    setFormState({ open: true, editing: { ...EMPTY_TASK } })
  }

  // Opens the form pre-filled from a list row.
  const openEdit = (task) => {
    setFormError('')
    setFormState({ open: true, editing: task })
  }

  // Creates or updates depending on whether the edit target has an id.
  const handleSubmit = async (payload) => {
    setFormError('')
    setNotice('')
    setSaving(true)
    try {
      if (formState.editing?._id) {
        await updateTask(formState.editing._id, payload)
      } else {
        await createTask({ ...payload, kind })
      }
      setFormState({ open: false, editing: null })
      await loadTasks()
    } catch (err) {
      setFormError(err.response?.data?.message || `Could not save the ${kind}.`)
    } finally {
      setSaving(false)
    }
  }

  // Toggles between completed and to-do straight from the list.
  const handleToggle = async (task) => {
    setActionError('')
    setNotice('')
    setTogglingId(task._id)
    try {
      const data = await updateTask(task._id, {
        status: task.status === 'completed' ? 'todo' : 'completed',
      })
      setTasks((prev) => prev.map((item) => (item._id === task._id ? data.data.task : item)))
      if (data.data.nextOccurrence) {
        setNotice(
          `Completed — the next ${kind} is scheduled for ${shortDate(data.data.nextOccurrence.dueDate)}.`
        )
      }
    } catch (err) {
      setActionError(err.response?.data?.message || `Could not update the ${kind}.`)
    } finally {
      setTogglingId(null)
    }
  }

  // Deletes after the inline confirmation.
  const handleDelete = async (task) => {
    setActionError('')
    setNotice('')
    try {
      await deleteTask(task._id)
      setConfirmDeleteId(null)
      await loadTasks()
    } catch (err) {
      setConfirmDeleteId(null)
      setActionError(err.response?.data?.message || `Could not delete the ${kind}.`)
    }
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>
  }

  if (!tasks) {
    return <div className="page-loading">{meta.loading}</div>
  }

  const hasFilters =
    search.trim() !== '' ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    subjectFilter !== 'all'

  return (
    <section>
      <div className="page-heading">
        <h2>{meta.title}</h2>
        <p>{meta.subtitle}</p>
      </div>

      {actionError && (
        <div className="alert alert-error" role="alert">
          {actionError}
        </div>
      )}

      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}

      <div className="toolbar">
        <input
          type="search"
          className="toolbar-search"
          placeholder={`Search ${kind}s...`}
          aria-label={`Search ${kind}s`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="toolbar-select"
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="todo">To do</option>
          <option value="in-progress">In progress</option>
          <option value="completed">Completed</option>
        </select>
        <select
          className="toolbar-select"
          aria-label="Filter by priority"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          className="toolbar-select"
          aria-label="Filter by subject"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
        >
          <option value="all">All subjects</option>
          {subjects.map((subject) => (
            <option key={subject._id} value={subject._id}>
              {subject.name}
            </option>
          ))}
        </select>
        <select
          className="toolbar-select"
          aria-label="Sort order"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="spacer" />
        <button type="button" className="btn-primary" onClick={openCreate}>
          <Icon name="plus" size={16} /> {meta.newLabel}
        </button>
      </div>

      {formState.open && (
        <TaskForm
          initial={formState.editing}
          subjects={subjects}
          saving={saving}
          error={formError}
          onSubmit={handleSubmit}
          onCancel={() => setFormState({ open: false, editing: null })}
        />
      )}

      {tasks.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">{hasFilters ? 'No matches' : meta.emptyTitle}</p>
          <p>
            {hasFilters
              ? 'Try clearing a filter or searching for something else.'
              : meta.emptyText}
          </p>
        </div>
      ) : (
        <TaskList
          tasks={tasks}
          togglingId={togglingId}
          confirmDeleteId={confirmDeleteId}
          onToggle={handleToggle}
          onEdit={openEdit}
          onDelete={handleDelete}
          onAskDelete={setConfirmDeleteId}
          onCancelDelete={() => setConfirmDeleteId(null)}
        />
      )}
    </section>
  )
}
