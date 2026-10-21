// Escapes one CSV cell. Values containing a comma, quote, or newline are
// wrapped in quotes, and inner quotes are doubled (RFC 4180).
//
// Cells beginning with = + - @ tab or CR are additionally prefixed with an
// apostrophe (the OWASP mitigation for CSV formula injection): without it,
// a title like "=HYPERLINK(...)" would execute inside Excel the moment a
// user opens the export. The apostrophe costs nothing in SheetJS-free
// readers and neutralises every spreadsheet formula parser.
const DANGEROUS_PREFIX = /^[=+\-@\t\r]/

function escapeCell(value) {
  const text = value == null ? '' : String(value)
  const safe = DANGEROUS_PREFIX.test(text) ? `'${text}` : text
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

// Builds a CRLF-delimited CSV document from a header row and data rows.
export function buildCsv(headers, rows) {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n')
}
