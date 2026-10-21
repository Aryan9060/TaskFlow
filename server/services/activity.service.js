import ActivityLog from '../models/ActivityLog.js'

// Append-only recording: no API ever edits or deletes an entry. Errors
// propagate on purpose so a failed write rolls back together with the action
// it describes — a success response always implies a recorded event.
// Actions are always recorded server-side; nothing here trusts the client.
export async function recordActivity({ taskId, actorId, action, details = {}, session = null }) {
  const options = session ? { session } : {}
  await ActivityLog.create([{ task: taskId, actor: actorId, action, details }], options)
}
