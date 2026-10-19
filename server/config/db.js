import mongoose from 'mongoose'

// Connects Mongoose to MongoDB and logs the key lifecycle events.
// Called once at startup; a failed connection stops the server (see server.js).
export async function connectDB() {
  const uri = process.env.MONGO_URI

  if (!uri) {
    throw new Error('MONGO_URI is not defined. Check your server/.env file.')
  }

  mongoose.connection.on('connected', () => {
    console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`)
  })
  mongoose.connection.on('error', (err) => {
    console.error(`MongoDB error: ${err.message}`)
  })
  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected')
  })

  await mongoose.connect(uri)
}
