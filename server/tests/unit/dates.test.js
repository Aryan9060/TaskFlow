import test from 'node:test'
import assert from 'node:assert/strict'
import {
  dayKey,
  daysAgo,
  daysFromNow,
  nextDueDate,
  buildDaySeries,
} from '../../utils/dates.js'

test('dayKey pads months and days to two digits', () => {
  assert.equal(dayKey(new Date(2026, 0, 5)), '2026-01-05')
  assert.equal(dayKey(new Date(2026, 11, 31)), '2026-12-31')
})

test('daysAgo and daysFromNow return midnight on the expected day', () => {
  const yesterday = daysAgo(1)
  const tomorrow = daysFromNow(1)
  const expectedYesterday = new Date()
  expectedYesterday.setDate(expectedYesterday.getDate() - 1)
  const expectedTomorrow = new Date()
  expectedTomorrow.setDate(expectedTomorrow.getDate() + 1)

  assert.equal(yesterday.getHours(), 0)
  assert.equal(yesterday.getMinutes(), 0)
  assert.equal(tomorrow.getHours(), 0)
  assert.equal(dayKey(yesterday), dayKey(expectedYesterday))
  assert.equal(dayKey(tomorrow), dayKey(expectedTomorrow))
})

test('daily and weekly recurrence advance by fixed intervals', () => {
  const start = new Date(2026, 9, 20)
  assert.equal(dayKey(nextDueDate(start, 'daily')), '2026-10-21')
  assert.equal(dayKey(nextDueDate(start, 'weekly')), '2026-10-27')
})

test('monthly recurrence clamps to the last day of a shorter month', () => {
  const january = new Date(2027, 0, 31)
  assert.equal(dayKey(nextDueDate(january, 'monthly')), '2027-02-28')

  const leapJanuary = new Date(2028, 0, 31)
  assert.equal(dayKey(nextDueDate(leapJanuary, 'monthly')), '2028-02-29')
})

test('monthly recurrence keeps ordinary dates unchanged', () => {
  const date = new Date(2026, 9, 15)
  assert.equal(dayKey(nextDueDate(date, 'monthly')), '2026-11-15')
})

test('buildDaySeries returns consecutive days ending today', () => {
  const series = buildDaySeries(7)

  assert.equal(series.length, 7)
  assert.equal(series.at(-1).date, dayKey(new Date()))
  assert.ok(series.every((entry) => entry.minutes === 0))
  assert.ok(series.every((entry) => typeof entry.day === 'string'))
})

test('nextDueDate leaves the original date untouched', () => {
  const original = new Date(2026, 9, 20)
  nextDueDate(original, 'daily')
  assert.equal(dayKey(original), '2026-10-20')
})
