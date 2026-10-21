import Exam from '../models/Exam.js'
import { validateOwnedSubject } from '../services/subject.service.js'
import { startOfToday } from '../utils/dates.js'

// GET /api/exams — all exams is ascending date order; ?upcoming=true
// limits the list to today onwards (dashboard and countdown use this).
export async function listExams(req, res) {
  const filter = { owner: req.user._id }
  if (req.query.upcoming === 'true') {
    filter.examDate = { $gte: startOfToday() }
  }

  const exams = await Exam.find(filter)
    .populate('subject', 'name code color')
    .sort({ examDate: 1 })

  res.status(200).json({ success: true, data: { exams } })
}

// POST /api/exams — schedule an exam for the signed-in user.
export async function createExam(req, res) {
  const subjectError = await validateOwnedSubject(req.user._id, req.body.subject)
  if (subjectError) {
    return res.status(400).json({ success: false, message: subjectError })
  }

  const exam = await Exam.create({ ...req.body, owner: req.user._id })
  await exam.populate('subject', 'name code color')

  res.status(201).json({ success: true, message: 'Exam scheduled.', data: { exam } })
}

// PATCH /api/exams/:id — edit any exam field, owner-scoped.
export async function updateExam(req, res) {
  const exam = await Exam.findOne({ _id: req.params.id, owner: req.user._id })
  if (!exam) {
    return res.status(404).json({ success: false, message: 'Exam not found.' })
  }

  if ('subject' in req.body) {
    const subjectError = await validateOwnedSubject(req.user._id, req.body.subject)
    if (subjectError) {
      return res.status(400).json({ success: false, message: subjectError })
    }
  }

  for (const field of ['title', 'examDate', 'subject', 'score', 'location', 'notes']) {
    if (field in req.body) exam[field] = req.body[field]
  }

  await exam.save()
  await exam.populate('subject', 'name code color')

  res.status(200).json({ success: true, message: 'Exam updated.', data: { exam } })
}

// DELETE /api/exams/:id — owner-scoped delete.
export async function deleteExam(req, res) {
  const exam = await Exam.findOneAndDelete({ _id: req.params.id, owner: req.user._id })
  if (!exam) {
    return res.status(404).json({ success: false, message: 'Exam not found.' })
  }

  res.status(200).json({ success: true, message: 'Exam deleted.' })
}
