// Escapes one CSV cell. Values containing a comma, quote, or newline are
// wrapped in quotes, and inner quotes are doubled (RFC 4180).
function escapeCell(value) {
  const text = value == null ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// Builds a CRLF-delimited CSV document from a header row and data rows.
export function buildCsv(headers, rows) {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n')
}
