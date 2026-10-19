import Subject from '../models/Subject.js'
import Task from '../models/Task.js'

// GET /api/subjects?includeArchived=true — the signed-in user's subjects.
// Archived subjects are hidden unless the query flag asks for them.
export async function listSubjects(req, res) {
  const filter = { owner: req.user._id }
  if (req.query.includeArchived !== 'true') {
    filter.archived = false
  }

  const subjects = await Subject.find(filter).sort({ name: 1 })

  res.status(200).json({ success: true, data: { subjects } })
}

// POST /api/subjects — create a subject for the signed-in user.
export async function createSubject(req, res) {
  const subject = await Subject.create({ ...req.body, owner: req.user._id })

  res.status(201).json({ success: true, message: 'Subject created.', data: { subject } })
}

// PATCH /api/subjects/:id — edit fields or archive/unarchive.
// Ownership is enforced by the filter: another user's subject is a 404.
export async function updateSubject(req, res) {
  const subject = await Subject.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    req.body,
    { returnDocument: 'after', runValidators: true }
  )

  if (!subject) {
    return res.status(404).json({ success: false, message: 'Subject not found.' })
  }

  res.status(200).json({ success: true, message: 'Subject updated.', data: { subject } })
}

// DELETE /api/subjects/:id — only allowed when no tasks reference the
// subject, so history is never silently broken. Archive is the fallback.
export async function deleteSubject(req, res) {
  const subject = await Subject.findOne({ _id: req.params.id, owner: req.user._id })

  if (!subject) {
    return res.status(404).json({ success: false, message: 'Subject not found.' })
  }

  const linkedTasks = await Task.countDocuments({ owner: req.user._id, subject: subject._id })
  if (linkedTasks > 0) {
    return res.status(409).json({
      success: false,
      message: `This subject has ${linkedTasks} linked task(s). Archive it instead of deleting.`,
    })
  }

  await subject.deleteOne()

  res.status(200).json({ success: true, message: 'Subject deleted.' })
}
