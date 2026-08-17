import { useState, useEffect } from "react"
import { Heart, Star, Loader2, Award } from "lucide-react"
import { reviewsApi, type PublicReview, type CommunityStats } from "../../services/api"
import SEO from "../../components/SEO"

export default function CommunityPage() {
  const [reviews, setReviews] = useState<PublicReview[]>([])
  const [stats, setStats] = useState<CommunityStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const res = await reviewsApi.getPublicReviews()
        setReviews(res.reviews || [])
        setStats(res.stats || null)
      } catch {
        // Fallback
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  return (
    <div className="min-h-screen bg-[#07080d] text-white py-16 px-6">
      <SEO
        title="Community - Global User Reviews & Ratings"
        description="Join thousands of members on FriendZone. Read authentic community reviews, member experiences, and ratings from global users."
        canonicalUrl="/community"
      />
      <div className="mx-auto max-w-6xl space-y-16 text-left">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 border border-rose-500/30 px-4 py-1.5 text-xs font-semibold text-rose-300">
            <Heart className="h-4 w-4" /> Global Community
          </span>
          <h1 className="text-4xl font-extrabold sm:text-5xl bg-gradient-to-r from-white via-gray-200 to-rose-300 bg-clip-text text-transparent">
            Connecting People Beyond Language Boundaries
          </h1>
          <p className="text-base text-gray-400">
            Real community members conversing effortlessly across 25+ Azure Neural AI languages.
          </p>
        </div>

        {/* Real Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center space-y-1 backdrop-blur-md">
            <span className="text-3xl font-black text-white">{stats ? stats.totalUsers : 0}</span>
            <p className="text-xs text-gray-400">Registered Users</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center space-y-1 backdrop-blur-md">
            <span className="text-3xl font-black text-white">{stats ? `${stats.languagesCount}+` : "25+"}</span>
            <p className="text-xs text-gray-400">Neural Languages Supported</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center space-y-1 backdrop-blur-md">
            <span className="text-3xl font-black text-white">{stats ? stats.totalTranslations : 0}</span>
            <p className="text-xs text-gray-400">Cached Translations</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center space-y-1 backdrop-blur-md">
            <span className="text-3xl font-black text-white">{stats ? stats.totalReviews : 0}</span>
            <p className="text-xs text-gray-400">Community Reviews</p>
          </div>
        </div>

        {/* Dynamic Reviews */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Verified Community Reviews</h2>
            <p className="text-xs text-gray-400">Genuine reviews submitted by registered FriendZone users.</p>
          </div>

          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-rose-400" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-12 text-center space-y-3">
              <Award className="h-8 w-8 text-gray-500 mx-auto" />
              <h3 className="text-base font-bold text-gray-300">No community reviews submitted yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Log in to your dashboard to submit the first review and share your feedback with our global community!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 space-y-4 backdrop-blur-md">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(r.rating)].map((_, idx) => (
                      <Star key={idx} className="h-4 w-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs leading-relaxed text-gray-300">"{r.comment}"</p>
                  <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">{r.user?.displayName || "Community Member"}</h4>
                      <p className="text-[11px] text-gray-400">Native: {(r.user?.nativeLanguage || "en").toUpperCase()}</p>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
