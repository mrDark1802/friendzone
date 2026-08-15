import type { Response } from "express"
import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js"
import { reviewsService } from "./reviews.service.js"

export async function submitReviewHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }

  const { rating, comment } = req.body
  if (!comment || typeof comment !== "string" || comment.trim().length === 0) {
    res.status(400).json({ error: "Comment is required" })
    return
  }

  const numericRating = Number(rating) || 5
  try {
    const review = await reviewsService.createOrUpdateReview(userId, numericRating, comment)
    res.status(200).json({ success: true, review })
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to submit review" })
  }
}

export async function getPublicReviewsHandler(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const reviews = await reviewsService.getPublicReviews()
    const stats = await reviewsService.getCommunityStats()
    res.status(200).json({ reviews, stats })
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch reviews" })
  }
}
