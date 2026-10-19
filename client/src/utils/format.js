// Formats minutes as "2h 30m"; returns "0m" for zero so charts stay readable.
export function formatMinutes(minutes) {
  const total = Math.round(minutes || 0)
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (hours === 0) return `${mins}m`
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`
}

// Whole days from now until the given date (negative = in the past).
export function daysUntil(dateInput) {
  const target = new Date(dateInput)
  const now = new Date()
  target.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.round((target - now) / 86400000)
}

// Short friendly date: "Oct 18" or "Today" / "Tomorrow" when applicable.
export function shortDate(dateInput) {
  const date = new Date(dateInput)
  const diff = daysUntil(date)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Date + time for exams: "Oct 24, 09:30".
export function formatDateTime(dateInput) {
  const date = new Date(dateInput)
  const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const timePart = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${datePart}, ${timePart}`
}

// Long label for calendar headings: "October 2026".
export function monthLabel(year, monthIndex) {
  return new Date(year, monthIndex, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// "2026-10-18" key used to place items on the calendar grid.
export function dayKeyOf(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
