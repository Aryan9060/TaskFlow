import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import ExcelJS from 'exceljs'
import { startTestDb, stopTestDb, app } from '../helpers/testDb.js'
import { createUserAgent } from '../helpers/auth.js'

// Every export format is exercised against the same fixture set: one shared
// task with a full assignment lifecycle, a private task, a formula-looking
// title, and a study session. The assertions pin down visibility (owner vs
// assignee vs stranger), CSV injection neutralisation, and workbook shape.
let creator
let collaborator
let stranger
let outsider
let essay
let solo

// Collects the raw response bytes so the XLSX binary can be re-parsed.
function binaryParser(res, callback) {
  const chunks = []
  res.on('data', (chunk) => chunks.push(chunk))
  res.on('end', () => callback(null, Buffer.concat(chunks)))
}

async function getWorkbook(agent) {
  return agent.get('/api/export/workbook.xlsx').buffer().parse(binaryParser)
}

before(async () => {
  await startTestDb()
  creator = await createUserAgent({ name: 'Export Creator' })
  collaborator = await createUserAgent({ name: 'Export Collaborator' })
  stranger = await createUserAgent({ name: 'Export Stranger' })
  outsider = await createUserAgent({ name: 'Export Outsider' })

  const created = await creator.agent.post('/api/tasks').send({ title: 'Export essay' })
  assert.equal(created.status, 201)
  essay = created.body.data.task

  const soloCreated = await creator.agent.post('/api/tasks').send({ title: 'Export solo' })
  assert.equal(soloCreated.status, 201)
  solo = soloCreated.body.data.task

  // Title crafted to trigger spreadsheet formulas if the export lacked the
  // CSV-injection guard.
  const formula = await creator.agent.post('/api/tasks').send({ title: '=SUM(A1)' })
  assert.equal(formula.status, 201)

  const invited = await creator.agent
    .post(`/api/tasks/${essay._id}/assignments`)
    .send({ email: collaborator.payload.email })
  assert.equal(invited.status, 201)

  const accepted = await collaborator.agent
    .patch(`/api/tasks/${essay._id}/assignments/${collaborator.user.id}`)
    .send({ status: 'accepted' })
  assert.equal(accepted.status, 200)

  const commented = await collaborator.agent
    .post(`/api/tasks/${essay._id}/comments`)
    .send({ body: 'Export fixture comment' })
  assert.equal(commented.status, 201)

  const session = await creator.agent.post('/api/sessions').send({
    durationMinutes: 25,
    startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    endedAt: new Date().toISOString(),
  })
  assert.equal(session.status, 201)
})

after(async () => {
  await stopTestDb()
})

test('exports require authentication in both formats', async () => {
  const csv = await request(app).get('/api/export/tasks.csv')
  assert.equal(csv.status, 401)

  const xlsx = await request(app).get('/api/export/workbook.xlsx')
  assert.equal(xlsx.status, 401)
})

test('tasks.csv follows task visibility and neutralises formula titles', async () => {
  const ownerCsv = await creator.agent.get('/api/export/tasks.csv')
  assert.equal(ownerCsv.status, 200)
  const ownerLines = ownerCsv.text.split('\r\n')
  // Header plus three visible tasks.
  assert.equal(ownerLines.length, 4)
  assert.ok(ownerCsv.text.includes('Export essay'))
  assert.ok(ownerCsv.text.includes('Export solo'))
  // The formula title must reach the file disarmed.
  assert.ok(ownerCsv.text.includes("'=SUM(A1)"))

  const assigneeCsv = await collaborator.agent.get('/api/export/tasks.csv')
  assert.equal(assigneeCsv.status, 200)
  assert.ok(assigneeCsv.text.includes('Export essay'))
  assert.ok(!assigneeCsv.text.includes('Export solo'))

  const strangerCsv = await stranger.agent.get('/api/export/tasks.csv')
  assert.equal(strangerCsv.status, 200)
  assert.equal(strangerCsv.text.split('\r\n').length, 1)
})

test('assignments.csv shows both roles and hides other people work', async () => {
  const ownerCsv = await creator.agent.get('/api/export/assignments.csv')
  assert.equal(ownerCsv.status, 200)
  assert.ok(ownerCsv.text.includes('Export essay'))
  assert.ok(ownerCsv.text.includes('Assigned by me'))
  assert.ok(ownerCsv.text.includes('Export Collaborator'))
  assert.ok(ownerCsv.text.includes('accepted'))

  const assigneeCsv = await collaborator.agent.get('/api/export/assignments.csv')
  assert.equal(assigneeCsv.status, 200)
  assert.ok(assigneeCsv.text.includes('Assigned to me'))
  assert.ok(assigneeCsv.text.includes('Export Creator'))

  const strangerCsv = await stranger.agent.get('/api/export/assignments.csv')
  assert.equal(strangerCsv.status, 200)
  assert.equal(strangerCsv.text.split('\r\n').length, 1)
})

test('activity.csv is access-gated per task', async () => {
  const ownerCsv = await creator.agent.get(`/api/export/activity.csv?taskId=${essay._id}`)
  assert.equal(ownerCsv.status, 200)
  assert.ok(ownerCsv.text.includes('task_created'))
  assert.ok(ownerCsv.text.includes('assignment_accepted'))
  assert.ok(ownerCsv.text.includes('comment_added'))

  const assigneeCsv = await collaborator.agent.get(`/api/export/activity.csv?taskId=${essay._id}`)
  assert.equal(assigneeCsv.status, 200)

  const outsiderCsv = await outsider.agent.get(`/api/export/activity.csv?taskId=${essay._id}`)
  assert.equal(outsiderCsv.status, 404)

  const malformed = await creator.agent.get('/api/export/activity.csv?taskId=not-an-id')
  assert.equal(malformed.status, 400)
})

test('workbook.xlsx carries one scoped sheet per dataset', async () => {
  const res = await getWorkbook(creator.agent)
  assert.equal(res.status, 200)
  assert.ok(res.headers['content-type'].includes('spreadsheetml'))
  // XLSX files are zip archives; the magic bytes prove a real workbook.
  assert.equal(res.body.subarray(0, 2).toString(), 'PK')

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(res.body)

  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), [
    'Tasks',
    'Assignments',
    'Sessions',
    'Activity',
  ])

  // Row counts include the header row. Activity spans all visible tasks:
  // the essay's lifecycle (4) plus one task_created each for the other two.
  assert.equal(workbook.getWorksheet('Tasks').rowCount, 4)
  assert.equal(workbook.getWorksheet('Assignments').rowCount, 2)
  assert.equal(workbook.getWorksheet('Sessions').rowCount, 2)
  assert.equal(workbook.getWorksheet('Activity').rowCount, 7)

  // Typed XLSX string cells are never parsed as formulas, so the raw title
  // lands unchanged (the apostrophe guard is CSV-only by design).
  const tasksSheet = workbook.getWorksheet('Tasks')
  const titleCells = []
  tasksSheet.eachRow((row) => titleCells.push(row.getCell(1).value))
  assert.ok(titleCells.includes('=SUM(A1)'))

  // A stranger's workbook has headers only everywhere.
  const strangerRes = await getWorkbook(stranger.agent)
  assert.equal(strangerRes.status, 200)
  const strangerBook = new ExcelJS.Workbook()
  await strangerBook.xlsx.load(strangerRes.body)
  assert.equal(strangerBook.getWorksheet('Tasks').rowCount, 1)
  assert.equal(strangerBook.getWorksheet('Activity').rowCount, 1)
})

test('sessions.csv keeps working with the shared sheet builders', async () => {
  const csv = await creator.agent.get('/api/export/sessions.csv')
  assert.equal(csv.status, 200)
  assert.ok(csv.text.includes('25'))
  assert.ok(csv.text.includes('stopwatch'))
})
