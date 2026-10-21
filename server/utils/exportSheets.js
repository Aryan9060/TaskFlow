// Shared sheet definitions for the export endpoints. Both the CSV routes and
// the XLSX workbook render from these same builders, so the two formats can
// never drift apart in columns or in which fields are considered safe to
// export. Only collaborator names are included — never emails, passwords, or
// tokens — and every caller must pre-filter the input by visibility.

// Tasks the user owns or is assigned to, with schedule and lifecycle fields.
export function taskSheet(tasks) {
  return {
    title: 'Tasks',
    headers: [
      'Title',
      'Kind',
      'Status',
      'Priority',
      'Subject',
      'Group',
      'Due date',
      'Estimated minutes',
      'Recurrence',
      'Completed at',
      'Created at',
    ],
    rows: tasks.map((task) => [
      task.title,
      task.kind,
      task.status,
      task.priority,
      task.subject?.name || '',
      task.group?.name || '',
      task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
      task.estimatedMinutes ?? '',
      task.recurrence,
      task.completedAt ? new Date(task.completedAt).toISOString() : '',
      task.createdAt ? new Date(task.createdAt).toISOString() : '',
    ]),
  }
}

// One row per assignment touching the user, from both sides of the table.
// The counterparty's name is the only person field: it is already visible to
// task participants in the UI, so the export leaks nothing new.
export function assignmentSheet(assignments, userId) {
  const userIdString = String(userId)
  return {
    title: 'Assignments',
    headers: [
      'Task',
      'Role',
      'Counterparty',
      'Status',
      'Note',
      'Created at',
      'Accepted at',
      'Submitted at',
      'Completed at',
      'Declined at',
      'Cancelled at',
    ],
    rows: assignments.map((assignment) => {
      const isAssignee = String(assignment.assignee?._id ?? assignment.assignee) === userIdString
      const counterparty = isAssignee ? assignment.assignedBy : assignment.assignee
      return [
        assignment.task?.title || '',
        isAssignee ? 'Assigned to me' : 'Assigned by me',
        counterparty?.name || '',
        assignment.status,
        assignment.note || '',
        assignment.createdAt ? new Date(assignment.createdAt).toISOString() : '',
        assignment.acceptedAt ? new Date(assignment.acceptedAt).toISOString() : '',
        assignment.submittedAt ? new Date(assignment.submittedAt).toISOString() : '',
        assignment.completedAt ? new Date(assignment.completedAt).toISOString() : '',
        assignment.declinedAt ? new Date(assignment.declinedAt).toISOString() : '',
        assignment.cancelledAt ? new Date(assignment.cancelledAt).toISOString() : '',
      ]
    }),
  }
}

// Study sessions with their subject and linked task names.
export function sessionSheet(sessions) {
  return {
    title: 'Sessions',
    headers: ['Started at', 'Mode', 'Subject', 'Task', 'Minutes', 'Note'],
    rows: sessions.map((session) => [
      session.startedAt ? new Date(session.startedAt).toISOString() : '',
      session.mode,
      session.subject?.name || '',
      session.task?.title || '',
      session.durationMinutes,
      session.note || '',
    ]),
  }
}

// Append-only history for tasks the user can access. Details are already
// safe summaries recorded server-side; they are stringified so multi-value
// entries survive the round trip in one cell.
export function activitySheet(entries) {
  return {
    title: 'Activity',
    headers: ['Date', 'Task', 'Actor', 'Action', 'Details'],
    rows: entries.map((entry) => [
      entry.createdAt ? new Date(entry.createdAt).toISOString() : '',
      entry.task?.title || '',
      entry.actor?.name || '',
      entry.action,
      entry.details && Object.keys(entry.details).length > 0 ? JSON.stringify(entry.details) : '',
    ]),
  }
}
