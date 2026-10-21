import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import {
  createGroupSchema,
  updateGroupSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  transferOwnershipSchema,
} from '../validators/group.validators.js'
import {
  listGroups,
  listMyInvitations,
  createGroup,
  getGroup,
  updateGroup,
  deleteGroup,
  inviteMember,
  acceptInvitation,
  removeInvitation,
  updateMemberRole,
  removeMember,
  transferOwnership,
} from '../controllers/group.controller.js'

const router = Router()

// Every group route requires a session.
router.use(protect)

// The static '/invitations/mine' segment must precede '/:id' so Express does
// not read 'invitations' as a group id.
router.get('/', listGroups)
router.get('/invitations/mine', listMyInvitations)
router.post('/', validate(createGroupSchema), createGroup)
router.get('/:id', getGroup)
router.patch('/:id', validate(updateGroupSchema), updateGroup)
router.delete('/:id', deleteGroup)
router.post('/:id/invitations', validate(inviteMemberSchema), inviteMember)
router.post('/:id/invitations/accept', acceptInvitation)
router.delete('/:id/invitations/:userId', removeInvitation)
router.patch('/:id/members/:userId', validate(updateMemberRoleSchema), updateMemberRole)
router.delete('/:id/members/:userId', removeMember)
router.post('/:id/transfer', validate(transferOwnershipSchema), transferOwnership)

export default router
