import { Router } from 'express';
import {
  createDirectHandler,
  createGroupHandler,
  getConversationsHandler,
  getGroupDetailsHandler,
  updateGroupInfoHandler,
  getGroupMembersHandler,
  addGroupMembersHandler,
  removeGroupMemberHandler,
  leaveGroupHandler,
  updateMemberRoleHandler,
  createInviteHandler,
  revokeInviteHandler,
  joinInviteHandler,
} from './conversations.controller.js';
import { authenticateJWT, requireVerifiedEmail } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateJWT);
router.use(requireVerifiedEmail);

router.post('/direct', createDirectHandler);
router.post('/group', createGroupHandler);
router.get('/', getConversationsHandler);

// Group specific routes
router.get('/invite/:token/join', joinInviteHandler);
router.get('/:id', getGroupDetailsHandler);
router.patch('/:id', updateGroupInfoHandler);
router.get('/:id/members', getGroupMembersHandler);
router.post('/:id/members', addGroupMembersHandler);
router.delete('/:id/members/:targetUserId', removeGroupMemberHandler);
router.post('/:id/leave', leaveGroupHandler);
router.patch('/:id/roles/:targetUserId', updateMemberRoleHandler);
router.post('/:id/invite', createInviteHandler);
router.delete('/:id/invite', revokeInviteHandler);

export default router;
