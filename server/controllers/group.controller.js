import Group from '../models/Group.js'
import GroupMembership from '../models/GroupMembership.js'
import User from '../models/User.js'
import {
  getMembership,
  getActiveMembership,
  isGroupOwner,
  isGroupManager,
  listGroupRoster,
} from '../services/group.service.js'

// GET /api/groups — every group the signed-in user is an active member of,
// annotated with their role and the active member count.
export async function listGroups(req, res) {
  const memberships = await GroupMembership.find({ user: req.user._id, status: 'active' })
    .populate('group')
    .sort({ createdAt: -1 })

  const groups = []
  for (const membership of memberships) {
    if (!membership.group) continue // membership outlived its group
    const memberCount = await GroupMembership.countDocuments({
      group: membership.group._id,
      status: 'active',
    })
    groups.push({ ...membership.group.toObject(), myRole: membership.role, memberCount })
  }

  res.status(200).json({ success: true, data: { groups } })
}

// GET /api/groups/invitations/mine — the signed-in user's pending invitations.
export async function listMyInvitations(req, res) {
  const invitations = await GroupMembership.find({ user: req.user._id, status: 'invited' })
    .populate('group', 'name description')
    .sort({ createdAt: -1 })

  res.status(200).json({ success: true, data: { invitations } })
}

// POST /api/groups — creates a group and makes the creator its owner.
export async function createGroup(req, res) {
  const group = await Group.create({ ...req.body, createdBy: req.user._id })

  try {
    await GroupMembership.create({
      group: group._id,
      user: req.user._id,
      role: 'owner',
      status: 'active',
    })
  } catch (err) {
    // Compensating cleanup: a group without its owner membership is invalid,
    // so roll the group back instead of leaving an orphan.
    await Group.findByIdAndDelete(group._id)
    throw err
  }

  res.status(201).json({ success: true, message: 'Group created.', data: { group } })
}

// GET /api/groups/:id — group detail plus roster. Active members only; the
// roster includes pending invitations for managers so they can cancel them.
export async function getGroup(req, res) {
  const group = await Group.findById(req.params.id)
  if (!group) {
    return res.status(404).json({ success: false, message: 'Group not found.' })
  }

  const membership = await getActiveMembership(group._id, req.user._id)
  if (!membership) {
    return res.status(404).json({ success: false, message: 'Group not found.' })
  }

  const members = await listGroupRoster(group._id, isGroupManager(membership))
  res.status(200).json({ success: true, data: { group, members, myRole: membership.role } })
}

// PATCH /api/groups/:id — rename or redescribe the group; managers only.
export async function updateGroup(req, res) {
  const group = await Group.findById(req.params.id)
  if (!group) {
    return res.status(404).json({ success: false, message: 'Group not found.' })
  }

  const membership = await getActiveMembership(group._id, req.user._id)
  if (!membership) {
    return res.status(404).json({ success: false, message: 'Group not found.' })
  }
  if (!isGroupManager(membership)) {
    return res.status(403).json({ success: false, message: 'Only group managers can edit this group.' })
  }

  if ('name' in req.body) group.name = req.body.name
  if ('description' in req.body) group.description = req.body.description
  await group.save()

  res.status(200).json({ success: true, message: 'Group updated.', data: { group } })
}

// DELETE /api/groups/:id — owner only. Removes the group and every membership.
export async function deleteGroup(req, res) {
  const group = await Group.findById(req.params.id)
  if (!group) {
    return res.status(404).json({ success: false, message: 'Group not found.' })
  }

  const membership = await getActiveMembership(group._id, req.user._id)
  if (!membership) {
    return res.status(404).json({ success: false, message: 'Group not found.' })
  }
  if (!isGroupOwner(membership)) {
    return res.status(403).json({ success: false, message: 'Only the group owner can delete the group.' })
  }

  await GroupMembership.deleteMany({ group: group._id })
  await group.deleteOne()

  res.status(200).json({ success: true, message: 'Group deleted.' })
}

// POST /api/groups/:id/invitations — managers invite a registered user by email.
export async function inviteMember(req, res) {
  const group = await Group.findById(req.params.id)
  if (!group) {
    return res.status(404).json({ success: false, message: 'Group not found.' })
  }

  const membership = await getActiveMembership(group._id, req.user._id)
  if (!membership) {
    return res.status(404).json({ success: false, message: 'Group not found.' })
  }
  if (!isGroupManager(membership)) {
    return res.status(403).json({ success: false, message: 'Only group managers can invite.' })
  }

  const invitee = await User.findOne({ email: req.body.email })
  if (!invitee) {
    return res.status(404).json({ success: false, message: 'No registered user with that email.' })
  }

  const existing = await getMembership(group._id, invitee._id)
  if (existing) {
    return res
      .status(409)
      .json({ success: false, message: 'That user is already a member or has a pending invitation.' })
  }

  const invitation = await GroupMembership.create({
    group: group._id,
    user: invitee._id,
    role: 'member',
    status: 'invited',
    invitedBy: req.user._id,
  })
  await invitation.populate('user', 'name email')

  res.status(201).json({ success: true, message: 'Invitation sent.', data: { invitation } })
}

// POST /api/groups/:id/invitations/accept — the invitee accepts their own invitation.
export async function acceptInvitation(req, res) {
  const invitation = await GroupMembership.findOne({
    group: req.params.id,
    user: req.user._id,
    status: 'invited',
  })
  if (!invitation) {
    return res.status(404).json({ success: false, message: 'No pending invitation for this group.' })
  }

  invitation.status = 'active'
  await invitation.save()
  await invitation.populate('user', 'name email')

  res.status(200).json({ success: true, message: 'Invitation accepted.', data: { membership: invitation } })
}

// DELETE /api/groups/:id/invitations/:userId — the invitee declines their own
// invitation; a manager cancels it. Anyone else gets 404 so pending invites stay private.
export async function removeInvitation(req, res) {
  const invitation = await GroupMembership.findOne({
    group: req.params.id,
    user: req.params.userId,
    status: 'invited',
  }).populate('user', 'name email')
  if (!invitation) {
    return res.status(404).json({ success: false, message: 'Invitation not found.' })
  }

  if (String(invitation.user._id) === String(req.user._id)) {
    await invitation.deleteOne()
    return res.status(200).json({ success: true, message: 'Invitation declined.' })
  }

  const membership = await getActiveMembership(req.params.id, req.user._id)
  if (!membership) {
    return res.status(404).json({ success: false, message: 'Group not found.' })
  }
  if (!isGroupManager(membership)) {
    return res
      .status(403)
      .json({ success: false, message: 'Only the invitee or a group manager can remove this invitation.' })
  }

  await invitation.deleteOne()
  res.status(200).json({ success: true, message: 'Invitation cancelled.' })
}

// PATCH /api/groups/:id/members/:userId — owner-only role change between admin
// and member. Nobody may change their own role, which blocks self-escalation.
export async function updateMemberRole(req, res) {
  const group = await Group.findById(req.params.id)
  if (!group) {
    return res.status(404).json({ success: false, message: 'Group not found.' })
  }

  const actor = await getActiveMembership(group._id, req.user._id)
  if (!actor) {
    return res.status(404).json({ success: false, message: 'Group not found.' })
  }
  if (!isGroupOwner(actor)) {
    return res.status(403).json({ success: false, message: 'Only the group owner can change member roles.' })
  }
  if (String(req.params.userId) === String(req.user._id)) {
    return res.status(400).json({ success: false, message: 'Use transfer to change group ownership.' })
  }

  const target = await getActiveMembership(group._id, req.params.userId)
  if (!target) {
    return res.status(404).json({ success: false, message: 'Member not found.' })
  }

  target.role = req.body.role
  await target.save()
  await target.populate('user', 'name email')

  res.status(200).json({ success: true, message: 'Member role updated.', data: { membership: target } })
}

// DELETE /api/groups/:id/members/:userId — removes a member. The owner cannot
// be removed, only the owner may remove an admin, and self-removal for a
// non-owner behaves as leaving the group.
export async function removeMember(req, res) {
  const group = await Group.findById(req.params.id)
  if (!group) {
    return res.status(404).json({ success: false, message: 'Group not found.' })
  }

  const actor = await getActiveMembership(group._id, req.user._id)
  if (!actor) {
    return res.status(404).json({ success: false, message: 'Group not found.' })
  }

  const target = await getActiveMembership(group._id, req.params.userId)
  if (!target) {
    return res.status(404).json({ success: false, message: 'Member not found.' })
  }

  const removingSelf = String(target.user) === String(req.user._id)

  if (removingSelf) {
    if (target.role === 'owner') {
      return res
        .status(400)
        .json({ success: false, message: 'Transfer ownership or delete the group instead of leaving.' })
    }
    await target.deleteOne()
    return res.status(200).json({ success: true, message: 'You have left the group.' })
  }

  if (target.role === 'owner') {
    return res.status(403).json({ success: false, message: 'The group owner cannot be removed.' })
  }
  if (!isGroupManager(actor)) {
    return res.status(403).json({ success: false, message: 'Only group managers can remove members.' })
  }
  if (target.role === 'admin' && !isGroupOwner(actor)) {
    return res.status(403).json({ success: false, message: 'Only the group owner can remove an admin.' })
  }

  await target.deleteOne()
  res.status(200).json({ success: true, message: 'Member removed.' })
}

// POST /api/groups/:id/transfer — owner only. The target becomes owner; the
// previous owner stays on as an admin so the group is never left ownerless.
export async function transferOwnership(req, res) {
  const group = await Group.findById(req.params.id)
  if (!group) {
    return res.status(404).json({ success: false, message: 'Group not found.' })
  }

  const actor = await getActiveMembership(group._id, req.user._id)
  if (!actor) {
    return res.status(404).json({ success: false, message: 'Group not found.' })
  }
  if (!isGroupOwner(actor)) {
    return res.status(403).json({ success: false, message: 'Only the group owner can transfer ownership.' })
  }

  const target = await getActiveMembership(group._id, req.body.userId)
  if (!target) {
    return res.status(404).json({ success: false, message: 'Member not found.' })
  }

  target.role = 'owner'
  actor.role = 'admin'
  await target.save()
  await actor.save()

  res.status(200).json({
    success: true,
    message: 'Ownership transferred.',
    data: { owner: target, previousOwner: actor },
  })
}
