import mongoose from 'mongoose'
import app from '../../app.js'

// Tests run against a dedicated database so development data is never touched.
// directConnection pins the driver to this exact server: the replica set
// advertises an address that is only correct inside its container, and the
// flag also stops discovery from wandering onto other local MongoDB instances.
export const TEST_MONGO_URI =
  process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27018/taskflow_test?directConnection=true'

// Connects to the test database and starts every file from a clean slate.
export async function startTestDb() {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'taskflow-integration-test-secret'
  await mongoose.connect(TEST_MONGO_URI)
  await mongoose.connection.dropDatabase()
}

// Removes test data and closes the connection so the test process exits cleanly.
export async function stopTestDb() {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
}

export { app }
