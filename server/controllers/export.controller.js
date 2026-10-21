import ActivityLog from '../models/ActivityLog.js'
import StudySession from '../models/StudySession.js'
import Task from '../models/Task.js'
import TaskAssignment from '../models/TaskAssignment.js'
import { buildCsv } from '../utils/csv.js'
import { taskSheet, assignmentSheet, sessionSheet, activitySheet } from '../utils/exportSheets.js'
import { buildWorkbookBuffer } from '../services/xlsx.service.js'
import { visibleTaskFilter, canAccessTask } from '../services/taskAccess.service.js'
import { dayKey } from '../utils/dates.js'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// Sends a CSV as a browser download with a dated filename.
function sendCsv(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(csv)
}

// Sends a generated XLSX buffer as a browser download.
function sendXlsx(res, filename, buffer) {
  res.setHeader('Content-Type', XLSX_MIME)
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(Buffer.from(buffer))
}

// Loads every study session for the signed-in user with display names.
async function loadOwnedSessions(ownerId) {
  return StudySession.find({ owner: ownerId })
    .populate('subject', 'name')
    .populate('task', 'title')
    .sort({ startedAt: -1 })
}

// GET /api/export/sessions.csv — every study session for the signed-in user.
export async function exportSessionsCsv(req, res) {
  const sessions = await loadOwnedSessions(req.user._id)
  const sheet = sessionSheet(sessions)
  sendCsv(res, `taskflow-sessions-${dayKey(new Date())}.csv`, buildCsv(sheet.headers, sheet.rows))
}

// GET /api/export/tasks.csv — tasks and assignments the user owns or is
// assigned to, newest due date last. The visibility filter matches the task
// list endpoint exactly, so exports never widen what the UI shows.
export async function exportTasksCsv(req, res) {
  const tasks = await Task.find(await visibleTaskFilter(req.user._id))
    .populate('subject', 'name')
    .populate('group', 'name')
    .sort({ dueDate: 1 })

  const sheet = taskSheet(tasks)
  sendCsv(res, `taskflow-tasks-${dayKey(new Date())}.csv`, buildCsv(sheet.headers, sheet.rows))
}

// GET /api/export/assignments.csv — the user's assignment lifecycle from
// both sides: work assigned to them and work they assigned to others.
export async function exportAssignmentsCsv(req, res) {
  const assignments = await TaskAssignment.find({
    $or: [{ assignee: req.user._id }, { assignedBy: req.user._id }],
  })
    .populate('task', 'title')
    .populate('assignee', 'name')
    .populate('assignedBy', 'name')
    .sort({ createdAt: -1 })

  const sheet = assignmentSheet(assignments, req.user._id)
  sendCsv(res, `taskflow-assignments-${dayKey(new Date())}.csv`, buildCsv(sheet.headers, sheet.rows))
}

// GET /api/export/activity.csv?taskId= — the append-only history of one
// task. Access is identical to the activity endpoint: creator and assignees
// only, 404 for everyone else so the task's existence is not revealed.
export async function exportActivityCsv(req, res) {
  const { task, hasAccess } = await canAccessTask(req.validatedQuery.taskId, req.user._id)
  if (!task || !hasAccess) {
    return res.status(404).json({ success: false, message: 'Task not found.' })
  }

  const entries = await ActivityLog.find({ task: task._id })
    .populate('actor', 'name')
    .sort({ createdAt: -1 })
    .limit(1000)

  const sheet = activitySheet(entries)
  sendCsv(res, `taskflow-activity-${dayKey(new Date())}.csv`, buildCsv(sheet.headers, sheet.rows))
}

// GET /api/export/workbook.xlsx — one multi-sheet workbook of everything the
// signed-in user may see. Each sheet runs the exact same scoped queries as
// its CSV counterpart, so the formats cannot diverge in authorization.
export async function exportWorkbookXlsx(req, res) {
  const ownerId = req.user._id

  const visibleTasks = await Task.find(await visibleTaskFilter(ownerId))
    .populate('subject', 'name')
    .populate('group', 'name')
    .sort({ dueDate: 1 })

  const [assignments, sessions] = await Promise.all([
    TaskAssignment.find({ $or: [{ assignee: ownerId }, { assignedBy: ownerId }] })
      .populate('task', 'title')
      .populate('assignee', 'name')
      .populate('assignedBy', 'name')
      .sort({ createdAt: -1 }),
    loadOwnedSessions(ownerId),
  ])

  // History is scoped to visible task ids, so activity from tasks the user
  // lost access to (for example after assignment removal) stays hidden.
  const visibleTaskIds = visibleTasks.map((task) => task._id)
  const activity = visibleTaskIds.length
    ? await ActivityLog.find({ task: { $in: visibleTaskIds } })
        .populate('task', 'title')
        .populate('actor', 'name')
        .sort({ createdAt: -1 })
        .limit(1000)
    : []

  const buffer = await buildWorkbookBuffer([
    taskSheet(visibleTasks),
    assignmentSheet(assignments, ownerId),
    sessionSheet(sessions),
    activitySheet(activity),
  ])

  sendXlsx(res, `taskflow-workbook-${dayKey(new Date())}.xlsx`, buffer)
}
