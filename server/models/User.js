import mongoose from 'mongoose'

const preferenceSchema = new mongoose.Schema(
  {
    pomodoroFocusMinutes: { type: Number, default: 25, min: 5, max: 120 },
    pomodoroBreakMinutes: { type: Number, default: 5, min: 1, max: 60 },
  },
  { _id: false }
)

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name must be at most 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    // select: false keeps the hash out of query results unless explicitly requested
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    preferences: {
      type: preferenceSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
)

// Never send the password hash to clients — always serialize through this
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    preferences: this.preferences,
    createdAt: this.createdAt,
  }
}

export default mongoose.model('User', userSchema)
