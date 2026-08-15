import { useState, useEffect } from "react"
import { ArrowUpRight } from "lucide-react"
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
      <div className="rounded-2xl border border-white/10 bg-[#11131f] p-4 animate-pulse h-24" />
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
      <div className="rounded-2xl border border-white/10 bg-[#11131f] p-5 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Translation Usage</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  isPro
                    ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                    : isPlus
                    ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/30"
                    : "bg-gray-500/10 text-gray-300 border-gray-500/30"
                }`}>
                  {quota?.planName || "Free"} Plan ({quota?.price || "₹0"})
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {quota?.isDailyLimit ? "Resets daily at UTC midnight" : "Monthly billing limit"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition shadow-sm"
          >
            {isFree ? "Upgrade Plan" : "Manage Subscription"}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-gray-300">
              {used.toLocaleString()} / {limit.toLocaleString()} translations {quota?.isDailyLimit ? "today" : "this month"}
            </span>
            <span className={percentage >= 90 ? "text-rose-400 font-bold" : "text-indigo-400"}>
              {percentage}% Used
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                percentage >= 90
                  ? "bg-rose-500"
                  : percentage >= 75
                  ? "bg-amber-400"
                  : "bg-indigo-500"
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>
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
