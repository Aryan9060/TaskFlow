import StudySession from '../models/StudySession.js'
import Task from '../models/Task.js'
import { buildCsv } from '../utils/csv.js'
import { dayKey } from '../utils/dates.js'

// Sends a CSV as a browser download with a dated filename.
function sendCsv(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(csv)
}

// GET /api/export/sessions.csv — every study session for the signed-in user.
export async function exportSessionsCsv(req, res) {
  const sessions = await StudySession.find({ owner: req.user._id })
    .populate('subject', 'name')
    .populate('task', 'title')
    .sort({ startedAt: -1 })

  const headers = ['Started at', 'Mode', 'Subject', 'Task', 'Minutes', 'Note']
  const rows = sessions.map((session) => [
    session.startedAt.toISOString(),
    session.mode,
    session.subject?.name || '',
    session.task?.title || '',
    session.durationMinutes,
    session.note || '',
  ])

  sendCsv(res, `taskflow-sessions-${dayKey(new Date())}.csv`, buildCsv(headers, rows))
}

// GET /api/export/tasks.csv — tasks and assignments, newest due date last.
export async function exportTasksCsv(req, res) {
  const tasks = await Task.find({ owner: req.user._id })
    .populate('subject', 'name')
    .sort({ dueDate: 1 })

  const headers = [
    'Title',
    'Kind',
    'Status',
    'Priority',
    'Subject',
    'Due date',
    'Estimated minutes',
    'Recurrence',
    'Completed at',
    'Created at',
  ]
  const rows = tasks.map((task) => [
    task.title,
    task.kind,
    task.status,
    task.priority,
    task.subject?.name || '',
    task.dueDate ? task.dueDate.toISOString().slice(0, 10) : '',
    task.estimatedMinutes ?? '',
    task.recurrence,
    task.completedAt ? task.completedAt.toISOString() : '',
    task.createdAt ? task.createdAt.toISOString() : '',
  ])

  sendCsv(res, `taskflow-tasks-${dayKey(new Date())}.csv`, buildCsv(headers, rows))
}
