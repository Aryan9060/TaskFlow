import mongoose from 'mongoose'
import app from '../../app.js'

// Tests run against a dedicated database so development data is never touched.
export const TEST_MONGO_URI =
  process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27018/taskflow_test'

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
