import { useState, useEffect } from "react"
import { Sparkles, Zap, ArrowUpRight } from "lucide-react"
import { usersApi, type QuotaInfo } from "../services/api"
import SubscriptionModal from "./SubscriptionModal"

export default function QuotaTrackerWidget() {
  const [quota, setQuota] = useState<QuotaInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchQuota = async () => {
    try {
      const q = await usersApi.getQuota()
      setQuota(q)
    } catch {
      // Non-blocking fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuota()
  }, [])

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 animate-pulse h-24" />
    )
  }

  const isFree = quota?.plan === "FREE"
  const isPlus = quota?.plan === "PLUS"
  const isPro = quota?.plan === "PRO"

  const used = quota?.used ?? 0
  const limit = quota?.limit ?? 20
  const percentage = quota?.percentage ?? Math.round((used / limit) * 100)

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950/20 via-white/[0.03] to-purple-950/20 p-5 backdrop-blur-md space-y-3.5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Translation Quota</span>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                  isPro
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : isPlus
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                    : "bg-gray-500/20 text-gray-300 border-gray-500/40"
                }`}>
                  {quota?.planName || "Free"} ({quota?.price || "₹0"})
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                {quota?.isDailyLimit ? "Resets daily at UTC midnight" : "Monthly billing quota"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:text-white transition shadow-sm"
          >
            {isFree ? "Upgrade Plan" : "Manage Subscription"}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-gray-300">
              {used.toLocaleString()} / {limit.toLocaleString()} {quota?.isDailyLimit ? "today" : "this month"}
            </span>
            <span className={percentage >= 90 ? "text-rose-400 font-bold" : "text-indigo-300"}>
              {percentage}% Used
            </span>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10 p-0.5 border border-white/5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentage >= 90
                  ? "bg-gradient-to-r from-rose-500 to-red-600"
                  : percentage >= 75
                  ? "bg-gradient-to-r from-amber-400 to-orange-500"
                  : "bg-gradient-to-r from-indigo-500 to-purple-500"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {isFree && (
          <div className="flex items-center justify-between pt-1 text-[11px] text-gray-400 border-t border-white/5">
            <span className="flex items-center gap-1 text-amber-300 font-medium">
              <Zap className="h-3 w-3" /> Upgrade to Plus (2,000/mo) for ₹199
            </span>
            <button
              onClick={() => setIsModalOpen(true)}
              className="font-bold text-indigo-400 hover:underline"
            >
              View Plans →
            </button>
          </div>
        )}
      </div>

      <SubscriptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentQuota={quota}
        onSuccess={fetchQuota}
      />
    </>
  )
}
