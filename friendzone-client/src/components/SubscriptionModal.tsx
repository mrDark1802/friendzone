import { useState } from "react"
import { Sparkles, Check, Zap, Crown, ShieldCheck, X } from "lucide-react"
import { usersApi, type QuotaInfo } from "../services/api"
import { useAuth } from "../context/AuthContext"

interface SubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  currentQuota?: QuotaInfo | null
  onSuccess?: () => void
}

export const PLANS = [
  {
    id: "FREE",
    name: "Free",
    price: "₹0",
    period: "forever",
    badge: "🆓 Standard",
    limitText: "20 translations / day",
    features: [
      "20 Translations per day",
      "Auto-Language Detection",
      "Real-time Chat Translation",
      "Basic Support",
    ],
    color: "from-gray-700 to-gray-900",
    borderColor: "border-gray-700",
    buttonClass: "bg-white/10 hover:bg-white/20 text-white",
  },
  {
    id: "PLUS",
    name: "Plus",
    price: "₹199",
    period: "per month",
    badge: "💎 Popular",
    isPopular: true,
    limitText: "2,000 translations / month",
    features: [
      "2,000 Translations per month",
      "Higher Processing Priority",
      "Multi-Language Shifting",
      "Azure Neural AI Engine",
      "Priority 24/7 Support",
    ],
    color: "from-indigo-600 to-purple-700",
    borderColor: "border-indigo-500/50",
    buttonClass: "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:scale-105 shadow-lg shadow-indigo-500/25",
  },
  {
    id: "PRO",
    name: "Pro",
    price: "₹499",
    period: "per month",
    badge: "🚀 Unlimited Power",
    limitText: "10,000 translations / month",
    features: [
      "10,000 Translations per month",
      "Ultra-Fast Dedicated Engine",
      "Unlimited Multi-Group Translation",
      "Custom Language Dialects",
      "VIP Dedicated Support",
    ],
    color: "from-amber-500 to-rose-600",
    borderColor: "border-amber-500/50",
    buttonClass: "bg-gradient-to-r from-amber-500 to-rose-600 text-white hover:scale-105 shadow-lg shadow-amber-500/25",
  },
]

export default function SubscriptionModal({ isOpen, onClose, currentQuota, onSuccess }: SubscriptionModalProps) {
  const { user, refreshProfile } = useAuth()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const currentPlan = (user?.plan || currentQuota?.plan || "FREE").toUpperCase()

  const handleUpgrade = async (planId: string) => {
    setLoadingPlan(planId)
    setSuccessMsg(null)

    try {
      await usersApi.upgradePlan(planId)
      await refreshProfile()
      setSuccessMsg(`🎉 Successfully subscribed to ${planId} Plan!`)
      if (onSuccess) onSuccess()
      setTimeout(() => {
        setSuccessMsg(null)
        onClose()
      }, 1500)
    } catch (err: any) {
      alert(err.message || "Failed to update subscription")
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/15 bg-[#0b0f19] p-6 sm:p-8 text-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 mb-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 text-xs font-semibold text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" /> FriendZone AI Subscriptions
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Choose Your Translation Power</h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-lg mx-auto">
            Break language barriers across the globe. Upgrade anytime to get higher translation quotas.
          </p>
        </div>

        {successMsg && (
          <div className="mb-6 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 p-4 text-center text-xs font-bold text-emerald-300 animate-bounce">
            {successMsg}
          </div>
        )}

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id
            const isLoading = loadingPlan === plan.id

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-2xl border p-6 backdrop-blur-md transition-all duration-200 ${plan.borderColor} ${
                  plan.isPopular ? "bg-indigo-950/30 ring-2 ring-indigo-500/50 shadow-xl" : "bg-white/[0.03]"
                }`}
              >
                {plan.isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md">
                    MOST POPULAR
                  </span>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    <span className="text-[11px] font-bold text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                      {plan.badge}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{plan.price}</span>
                    <span className="text-xs text-gray-400">/{plan.period}</span>
                  </div>

                  <div className="rounded-xl bg-white/5 p-2.5 text-center text-xs font-semibold text-indigo-200 border border-white/10">
                    ⚡ {plan.limitText}
                  </div>

                  <ul className="space-y-2.5 pt-2 text-xs text-gray-300">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isCurrent || isLoading}
                    className={`w-full rounded-xl py-3 text-xs font-bold transition flex items-center justify-center gap-2 ${
                      isCurrent
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default"
                        : plan.buttonClass
                    }`}
                  >
                    {isCurrent ? (
                      <>
                        <ShieldCheck className="h-4 w-4 text-emerald-400" /> Current Plan
                      </>
                    ) : isLoading ? (
                      "Updating Plan..."
                    ) : (
                      <>
                        <Zap className="h-4 w-4" /> Select {plan.name} Plan
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer Note */}
        <div className="mt-8 pt-4 border-t border-white/10 text-center text-[11px] text-gray-500 flex items-center justify-center gap-2">
          <Crown className="h-3.5 w-3.5 text-amber-400" /> Secure 256-bit Encrypted Subscription Billing • Instant Activation
        </div>
      </div>
    </div>
  )
}
