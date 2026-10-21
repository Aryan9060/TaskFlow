// Assignment lifecycle rules. Controllers and tests share this one source of
// truth so a transition allowed anywhere is allowed everywhere.

// Transitions an assignee may perform on their own assignment. Reviewing a
// submission (submitted -> completed | needs_revision) is deliberately absent:
// that is the creator's job through the review endpoint.
const ASSIGNEE_TRANSITIONS = {
  pending: ['accepted', 'declined'],
  accepted: ['in_progress'],
  in_progress: ['submitted'],
  needs_revision: ['submitted'],
}

// States with no outgoing transitions; used by the cancel rule as well.
export const TERMINAL_ASSIGNMENT_STATUSES = ['completed', 'declined', 'cancelled']

export function isValidAssigneeTransition(from, to) {
  return (ASSIGNEE_TRANSITIONS[from] ?? []).includes(to)
}

// Only a submitted assignment may be completed or sent back for revision.
export function canReviewAssignment(assignment) {
  return assignment.status === 'submitted'
}

// The timestamp each lifecycle status stamps on first entry.
const STATUS_TIMESTAMP = {
  accepted: 'acceptedAt',
  declined: 'declinedAt',
  submitted: 'submittedAt',
  completed: 'completedAt',
  cancelled: 'cancelledAt',
}

// Applies an already-validated status change and stamps its timestamp.
export function applyAssignmentStatus(assignment, status) {
  assignment.status = status
  const timestampField = STATUS_TIMESTAMP[status]
  if (timestampField) assignment[timestampField] = new Date()
}
