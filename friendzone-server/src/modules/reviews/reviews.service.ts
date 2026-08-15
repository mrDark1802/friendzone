import { prisma } from "../../config/database.js"

export class ReviewsService {
  async createOrUpdateReview(userId: string, rating: number, comment: string) {
    const existing = await prisma.review.findFirst({
      where: { userId },
    })

    if (existing) {
      return prisma.review.update({
        where: { id: existing.id },
        data: {
          rating: Math.min(5, Math.max(1, rating)),
          comment: comment.trim(),
        },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              nativeLanguage: true,
            },
          },
        },
      })
    }

    return prisma.review.create({
      data: {
        userId,
        rating: Math.min(5, Math.max(1, rating)),
        comment: comment.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            nativeLanguage: true,
          },
        },
      },
    })
  }

  async getPublicReviews() {
    return prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            nativeLanguage: true,
          },
        },
      },
    })
  }

  async getCommunityStats() {
    const totalUsers = await prisma.user.count({ where: { deletedAt: null } })
    const totalTranslations = await prisma.translationCache.count()
    const totalReviews = await prisma.review.count()
    const languagesCount = 100 // Azure Neural AI Languages

    return {
      totalUsers,
      totalTranslations,
      totalReviews,
      languagesCount,
    }
  }
}

export const reviewsService = new ReviewsService()
