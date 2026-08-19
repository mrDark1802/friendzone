import { useState, useEffect } from "react"
import { Star, Loader2, Globe2, MessageSquare, Languages } from "lucide-react"
import { reviewsApi, type PublicReview, type CommunityStats } from "../../services/api"
import SEO from "../../components/SEO"
import { Link } from "react-router-dom"
import { useInView } from "../../layouts/useInView"
import type { ReactNode } from "react"

// ─── Reveal helper ────────────────────────────────────────────────────────────
const Reveal = ({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode
  delay?: number
  className?: string
}) => {
  const { ref, inView } = useInView<HTMLDivElement>(0.12)
  return (
    <div
      ref={ref}
      style={{ transitionDelay: inView ? `${delay}ms` : "0ms" }}
      className={`transition-all duration-500 ease-out ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } ${className}`}
    >
      {children}
    </div>
  )
}

// ─── Language / country data (real facts, no fake numbers) ────────────────────
const LANGUAGE_TAGS = [
  "Japanese",
  "Korean",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Hindi",
  "Arabic",
  "Italian",
  "Russian",
  "Turkish",
  "Polish",
  "Dutch",
  "Chinese",
  "Swedish",
  "Greek",
  "Romanian",
  "Czech",
  "Hungarian",
  "Vietnamese",
]

const HIGHLIGHTS = [
  {
    icon: Languages,
    label: "25+ languages",
    description: "Translate messages into any of the supported languages, automatically.",
  },
  {
    icon: Globe2,
    label: "People from everywhere",
    description: "Members from Asia, Europe, the Americas, Africa, and Oceania.",
  },
  {
    icon: MessageSquare,
    label: "Real conversations",
    description: "Email-verified accounts. Genuine people, genuine connections.",
  },
]

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
        // Silently fallback
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  return (
    <div className="w-full bg-slate-50 dark:bg-[#07090e] text-slate-900 dark:text-slate-100 min-h-screen">
      <SEO
        title="Community — People From All Over the World"
        description="FriendZone connects people worldwide. Read real member reviews and discover the languages and countries that make up the FriendZone community."
        canonicalUrl="/community"
      />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Our Community
            </span>
            <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              The world is smaller <br />
              <span className="text-blue-600 dark:text-blue-400">when you speak the same language.</span>
            </h1>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300 max-w-xl">
              FriendZone brings together curious people from different countries who want to talk, share, and build genuine friendships — without language being an obstacle.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Highlights ───────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-10 border-t border-slate-200/80 dark:border-slate-800">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-5 sm:grid-cols-3">
            {HIGHLIGHTS.map(({ icon: Icon, label, description }, i) => (
              <Reveal
                key={label}
                delay={i * 60}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-5 shadow-xs"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">{label}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Language Tags ─────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Languages spoken here</h2>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_TAGS.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  {lang}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Real Stats from API ───────────────────────────────────────────── */}
      {stats && (
        <section className="px-4 sm:px-6 py-8 border-t border-slate-200/80 dark:border-slate-800">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Members", value: stats.totalUsers },
                { label: "Languages", value: `${stats.languagesCount}+` },
                { label: "Translations cached", value: stats.totalTranslations },
                { label: "Community reviews", value: stats.totalReviews },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] px-4 py-4 shadow-xs text-center"
                >
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-white block">{value}</span>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Member Reviews ────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-12 border-t border-slate-200/80 dark:border-slate-800">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">What members say</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Genuine reviews from registered FriendZone members.
            </p>
          </Reveal>

          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-10 text-center shadow-xs">
              <MessageSquare className="h-7 w-7 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                No reviews yet — be the first.
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Log in to your dashboard to share your experience with the community.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {reviews.map((r, i) => (
                <Reveal
                  key={r.id}
                  delay={i * 40}
                  className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    {/* Stars */}
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[...Array(r.rating)].map((_, idx) => (
                        <Star key={idx} className="h-3.5 w-3.5 fill-amber-400" />
                      ))}
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      &ldquo;{r.comment}&rdquo;
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {r.user?.displayName || "Community Member"}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {(r.user?.nativeLanguage || "en").toUpperCase()} speaker
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Join CTA ─────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-14">
        <Reveal className="mx-auto max-w-xl rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-8 text-center shadow-xs">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Join the community
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Create a free account and start meeting people from around the world today.
          </p>
          <div className="mt-6">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-xs font-semibold text-white transition shadow-xs"
            >
              Join FriendZone — it's free
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
