import GroupMembership from '../models/GroupMembership.js'

// Reusable group authorization helpers. Controllers load the caller's
// membership once and answer with these predicates, so permission rules live
// in exactly one place.

// The caller's membership in a group, whatever its status (invited or active).
export async function getMembership(groupId, userId) {
  return GroupMembership.findOne({ group: groupId, user: userId })
}

// Membership with an accepted invitation — the gate for seeing or acting in a group.
export async function getActiveMembership(groupId, userId) {
  return GroupMembership.findOne({ group: groupId, user: userId, status: 'active' })
}

// Only the owner may delete the group, change roles, or transfer ownership.
export function isGroupOwner(membership) {
  return membership?.status === 'active' && membership.role === 'owner'
}

// Managers (owner + admin) may invite, edit the group, and moderate members.
export function isGroupManager(membership) {
  return membership?.status === 'active' && (membership.role === 'owner' || membership.role === 'admin')
}

// The roster every active member may see; managers additionally see pending
// invitations so they can cancel them before listing.
export async function listGroupRoster(groupId, includePending) {
  const filter = { group: groupId }
  if (!includePending) filter.status = 'active'
  return GroupMembership.find(filter).populate('user', 'name email').sort({ createdAt: 1 })
}
