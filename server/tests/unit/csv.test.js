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
