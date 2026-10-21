import mongoose from 'mongoose'

let supportsTransactions = null

// MongoDB only offers multi-document transactions on replica-set deployments,
// so ask the server once: the setName field exists only on replica-set members.
async function detectTransactionSupport() {
  if (supportsTransactions !== null) return supportsTransactions
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 })
    supportsTransactions = Boolean(hello.setName)
  } catch {
    supportsTransactions = false
  }
  return supportsTransactions
}

// Runs work inside a transaction when the topology supports one, otherwise
// sequentially so a plain standalone mongod still works for quick local runs.
// The work callback receives a session (or null) and must pass it to every
// write it performs.
export async function runInTransaction(work) {
  if (await detectTransactionSupport()) {
    return mongoose.connection.transaction(async (session) => work(session))
  }
  return work(null)
}
