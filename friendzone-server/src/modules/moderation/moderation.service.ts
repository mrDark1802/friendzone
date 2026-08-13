import { prisma } from '../../config/database.js';
import { BadRequestError } from '../../utils/errors.utils.js';

export class ModerationService {
  async submitReport(reporterId: string, reportedUserId: string, messageId: string | undefined, reason: string) {
    if (reporterId === reportedUserId) {
      throw new BadRequestError('You cannot report yourself');
    }

    return await prisma.report.create({
      data: {
        reporterId,
        reportedUserId,
        messageId,
        reason,
        status: 'PENDING',
      },
    });
  }

  async getReports(status?: 'PENDING' | 'RESOLVED' | 'DISMISSED') {
    return await prisma.report.findMany({
      where: status ? { status } : {},
      include: {
        reporter: { select: { id: true, displayName: true, email: true } },
        reportedUser: { select: { id: true, displayName: true, email: true } },
        message: { select: { id: true, contentOriginal: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
