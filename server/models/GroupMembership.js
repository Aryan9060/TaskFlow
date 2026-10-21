import mongoose from 'mongoose'

// Join table between users and groups carrying a role and an invitation
// state. A user appears at most once per group (unique index): either as an
// active member or as a pending invitee.
const groupMembershipSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    status: { type: String, enum: ['invited', 'active'], default: 'invited', index: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

// One row per (group, user): re-inviting a declined/removed user works
// because declines and removals delete the membership document.
groupMembershipSchema.index({ group: 1, user: 1 }, { unique: true })
groupMembershipSchema.index({ user: 1, status: 1 })

export default mongoose.model('GroupMembership', groupMembershipSchema)
