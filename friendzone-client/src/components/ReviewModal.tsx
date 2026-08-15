import { useState, type FormEvent } from "react"
import { Star, X, MessageSquare, Loader2 } from "lucide-react"
import { reviewsApi } from "../services/api"

interface ReviewModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function ReviewModal({ isOpen, onClose, onSuccess }: ReviewModalProps) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) {
      setErrorMsg("Please write your review feedback.")
      return
    }

    setIsSubmitting(true)
    setErrorMsg("")
    setSuccessMsg("")

    try {
      await reviewsApi.submitReview(rating, comment.trim())
      setSuccessMsg("Thank you! Your review has been submitted.")
      setComment("")
      if (onSuccess) onSuccess()
      setTimeout(() => {
        setSuccessMsg("")
        onClose()
      }, 1500)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit review.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#0a0b10] p-6 shadow-2xl space-y-5 text-left">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Leave a Review</h3>
            <p className="text-xs text-gray-400">Share your experience with our community</p>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-300">Rating</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 transition hover:scale-110"
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= rating ? "fill-amber-400 text-amber-400" : "text-gray-600"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-300">Your Review</label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How has FriendZone helped you communicate across languages?"
              className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-gray-500 outline-none focus:border-rose-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-gradient-to-r from-rose-500 to-indigo-600 py-3 text-xs font-bold text-white shadow-lg transition hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
              </span>
            ) : (
              "Submit Review"
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
