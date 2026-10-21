import mongoose from 'mongoose'

// A named team of users (study group, project group). A group owns no data of
// its own; access control lives in GroupMembership and, from Phase 3, in the
// tasks explicitly shared with the group by their creator.
const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      minlength: [2, 'Group name must be at least 2 characters'],
      maxlength: [80, 'Group name must be at most 80 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must be at most 500 characters'],
      default: '',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
)

export default mongoose.model('Group', groupSchema)
