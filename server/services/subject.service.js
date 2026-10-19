import Subject from '../models/Subject.js'

// Ensures a linked subject exists and belongs to the same user.
// Returns an error message, or null when the subject is valid or empty.
export async function validateOwnedSubject(ownerId, subjectId) {
  if (!subjectId) return null

  const subject = await Subject.findOne({ _id: subjectId, owner: ownerId })
  if (!subject) return 'Subject not found.'
  return null
}
