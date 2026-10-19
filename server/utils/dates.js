// Returns a Date set to midnight at the start of today (local time).
// All "due today / overdue" logic compares against this, never against now.
export function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

// Returns a Date n days before today, at midnight.
export function daysAgo(n) {
  const date = startOfToday()
  date.setDate(date.getDate() - n)
  return date
}

// Returns a Date n days after today, at midnight.
export function daysFromNow(n) {
  const date = startOfToday()
  date.setDate(date.getDate() + n)
  return date
}

// Whole-day calendar keys like "2026-10-18" used for grouping and labels.
export function dayKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
