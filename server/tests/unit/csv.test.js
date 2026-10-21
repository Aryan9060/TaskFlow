import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCsv } from '../../utils/csv.js'

test('buildCsv joins headers and rows with CRLF', () => {
  const csv = buildCsv(['title', 'minutes'], [['Reading', 45]])

  assert.equal(csv, 'title,minutes\r\nReading,45')
})

test('buildCsv returns only the header row for empty data', () => {
  assert.equal(buildCsv(['subject', 'task'], []), 'subject,task')
})

test('cells containing commas, quotes, or newlines are escaped', () => {
  const csv = buildCsv(
    ['title', 'notes'],
    [
      ['Algorithms, part 2', 'He said "review"'],
      ['Multi\nline', 'a,b'],
    ]
  )

  assert.equal(
    csv,
    'title,notes\r\n' +
      '"Algorithms, part 2","He said ""review"""\r\n' +
      '"Multi\nline","a,b"'
  )
})

test('null and undefined cells become empty strings', () => {
  assert.equal(buildCsv(['a', 'b'], [[null, undefined]]), 'a,b\r\n,')
})

test('formula-like cells are neutralised with a leading apostrophe', () => {
  const csv = buildCsv(['title'], [['=HYPERLINK("http://evil")'], ['+1+cmd'], ['-2+3'], ['@SUM(A1)'], ['\tTAB']])

  assert.equal(
    csv,
    'title\r\n' +
      // The apostrophe makes the cell text, and its quotes still trigger
      // RFC 4180 wrapping on top.
      '"\'=HYPERLINK(""http://evil"")"\r\n' +
      "'+1+cmd\r\n" +
      "'-2+3\r\n" +
      "'@SUM(A1)\r\n" +
      "'\tTAB"
  )
})

test('ordinary values are never prefixed', () => {
  assert.equal(buildCsv(['a'], [['e=mc2'], ['x+y'], ['2026-10-21']]), 'a\r\ne=mc2\r\nx+y\r\n2026-10-21')
})
