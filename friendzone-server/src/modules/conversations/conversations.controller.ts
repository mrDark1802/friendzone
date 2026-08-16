import { Response, NextFunction } from 'express';
import { ConversationsService } from './conversations.service.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { socketServer } from '../../infrastructure/websocket/socket.server.js';

const conversationsService = new ConversationsService();

export async function createDirectHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { targetUserId } = req.body;
    const conversation = await conversationsService.createDirectConversation(req.user!.userId, targetUserId);
    res.status(201).json({ success: true, data: { conversation } });
  } catch (error) {
    next(error);
  }
}

export async function createGroupHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { title, memberIds, description, avatarUrl } = req.body;
    const result = await conversationsService.createGroupConversation(
      req.user!.userId,
      title,
      memberIds || [],
      description,
      avatarUrl
    );

    // Socket Event: Notify all initial group members
    if (result.conversation) {
      const memberIds = result.conversation.members.map((m: any) => m.userId);
      socketServer?.emitGroupCreated(memberIds, {
        conversation: result.conversation,
        sysMessage: result.sysMessage,
      });
    }

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getConversationsHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const conversations = await conversationsService.getUserConversations(req.user!.userId);
    res.status(200).json({ success: true, data: { conversations } });
  } catch (error) {
    next(error);
  }
}

export async function getGroupDetailsHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await conversationsService.getGroupDetails(id, req.user!.userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function updateGroupInfoHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await conversationsService.updateGroupInfo(id, req.user!.userId, req.body);

    if (result.sysMessage) {
      socketServer?.emitGroupEvent(id, 'group:updated', {
        conversation: result.conversation,
        sysMessage: result.sysMessage,
      });
      socketServer?.emitGroupEvent(id, 'message_sent', { message: result.sysMessage });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getGroupMembersHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const search = req.query.search as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;

    const result = await conversationsService.getGroupMembers(id, req.user!.userId, { search, page, limit });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function addGroupMembersHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { memberIds } = req.body;
    const result = await conversationsService.addGroupMembers(id, req.user!.userId, memberIds || []);

    if (result.sysMessage) {
      socketServer?.emitGroupEvent(id, 'group:member_added', {
        conversation: result.conversation,
        sysMessage: result.sysMessage,
        addedUserIds: result.addedUserIds,
      }, result.addedUserIds);
      socketServer?.emitGroupEvent(id, 'message_sent', { message: result.sysMessage });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function removeGroupMemberHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id, targetUserId } = req.params;
    const result = await conversationsService.removeGroupMember(id, req.user!.userId, targetUserId);

    if (result.sysMessage) {
      socketServer?.emitGroupEvent(id, 'group:member_removed', {
        conversationId: id,
        sysMessage: result.sysMessage,
        removedUserId: targetUserId,
      }, [targetUserId]);
      socketServer?.emitGroupEvent(id, 'message_sent', { message: result.sysMessage });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function leaveGroupHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await conversationsService.leaveGroup(id, req.user!.userId);

    if (result.transferSysMessage) {
      socketServer?.emitGroupEvent(id, 'message_sent', { message: result.transferSysMessage });
    }
    if (result.sysMessage) {
      socketServer?.emitGroupEvent(id, 'group:member_left', {
        conversationId: id,
        sysMessage: result.sysMessage,
        leftUserId: result.leftUserId,
      });
      socketServer?.emitGroupEvent(id, 'message_sent', { message: result.sysMessage });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function updateMemberRoleHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id, targetUserId } = req.params;
    const { role } = req.body;
    const result = await conversationsService.updateMemberRole(id, req.user!.userId, targetUserId, role);

    if (result.sysMessage) {
      socketServer?.emitGroupEvent(id, 'group:role_updated', {
        conversationId: id,
        sysMessage: result.sysMessage,
        targetUserId,
        newRole: role,
      });
      socketServer?.emitGroupEvent(id, 'message_sent', { message: result.sysMessage });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function createInviteHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await conversationsService.createGroupInvite(id, req.user!.userId);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function revokeInviteHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await conversationsService.revokeGroupInvite(id, req.user!.userId);

    socketServer?.emitGroupEvent(id, 'group:invite_revoked', { conversationId: id });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function joinInviteHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { token } = req.params;
    const result = await conversationsService.joinViaInviteToken(token, req.user!.userId);

    if ('sysMessage' in result && result.sysMessage && result.conversation) {
      socketServer?.emitGroupEvent(result.conversation.id, 'group:member_added', {
        conversation: result.conversation,
        sysMessage: result.sysMessage,
        joinedUserId: req.user!.userId,
      });
      socketServer?.emitGroupEvent(result.conversation.id, 'message_sent', { message: result.sysMessage });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
