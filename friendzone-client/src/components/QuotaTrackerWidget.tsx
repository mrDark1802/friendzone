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
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-4 animate-pulse h-20" />
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
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">Translation Allowance</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                  isPro
                    ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                    : isPlus
                    ? "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}>
                  {quota?.planName || "Free"} Plan ({quota?.price || "₹0"})
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {quota?.isDailyLimit ? "Resets daily at UTC midnight" : "Monthly billing cycle"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white transition shadow-xs self-start sm:self-auto"
          >
            {isFree ? "Upgrade Plan" : "Manage Subscription"}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-slate-600 dark:text-slate-400 text-[11px]">
              {used.toLocaleString()} / {limit.toLocaleString()} translated {quota?.isDailyLimit ? "today" : "this month"}
            </span>
            <span className={`text-[11px] font-semibold ${percentage >= 90 ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"}`}>
              {percentage}% Used
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                percentage >= 90
                  ? "bg-rose-500"
                  : percentage >= 75
                  ? "bg-amber-500"
                  : "bg-blue-600"
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
