import { useState } from "react"
import { Check, Zap, ShieldCheck, X } from "lucide-react"
import { subscriptionApi, type QuotaInfo } from "../services/api"
import { useAuth } from "../context/AuthContext"
import { CENTRALIZED_PLANS, getDisplayPrice } from "../config/pricingConfig"
import { loadRazorpayScript } from "../utils/loadRazorpay"

export { CENTRALIZED_PLANS as PLANS }

interface SubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  currentQuota?: QuotaInfo | null
  onSuccess?: () => void
}

export default function SubscriptionModal({ isOpen, onClose, currentQuota, onSuccess }: SubscriptionModalProps) {
  const { user, refreshProfile } = useAuth()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const currentPlan = (user?.plan || currentQuota?.plan || "FREE").toUpperCase()

  const handleUpgrade = async (planId: string) => {
    const cleanPlan = planId.toUpperCase()
    setLoadingPlan(cleanPlan)
    setSuccessMsg(null)

    try {
      if (cleanPlan === "FREE") {
        await subscriptionApi.changePlan("FREE")
        await refreshProfile()
        setSuccessMsg("Switched to Free Plan (20 translations/day).")
        if (onSuccess) onSuccess()
        setTimeout(() => {
          setSuccessMsg(null)
          onClose()
        }, 1500)
      } else {
        const isLoaded = await loadRazorpayScript()
        if (!isLoaded) {
          alert("Failed to load Razorpay SDK. Please check your internet connection.")
          return
        }

        const res = await subscriptionApi.createCheckoutSession(cleanPlan)
        if (!res?.subscriptionId) {
          alert("Failed to create Razorpay subscription session.")
          return
        }

        const options = {
          key: res.keyId,
          subscription_id: res.subscriptionId,
          name: "FriendZone",
          description: `${cleanPlan} Translation Subscription`,
          image: "/friendzone_logo.png",
          handler: async function (response: any) {
            try {
              setLoadingPlan(cleanPlan)
              await subscriptionApi.verifyPayment({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
                plan: cleanPlan,
              })
              await refreshProfile()
              setSuccessMsg(`Subscribed to ${cleanPlan} Plan!`)
              if (onSuccess) onSuccess()
              setTimeout(() => {
                setSuccessMsg(null)
                onClose()
              }, 1500)
            } catch (verifyErr: any) {
              alert(verifyErr?.message || "Payment verification failed.")
            } finally {
              setLoadingPlan(null)
            }
          },
          prefill: {
            name: (user as any)?.displayName || (user as any)?.name || res.user?.displayName || "",
            email: user?.email || res.user?.email || "",
          },
          theme: {
            color: "#2563eb",
          },
        }

        const rzp = new (window as any).Razorpay(options)
        rzp.on("payment.failed", function (response: any) {
          alert(`Payment Failed: ${response.error?.description || "Payment was rejected."}`)
        })
        rzp.open()
      }
    } catch (err: any) {
      alert(err.message || "Failed to update subscription")
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-6 sm:p-8 text-slate-900 dark:text-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1.5 mb-8">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
            Translation Plans
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Choose Your Translation Plan</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Break language barriers. Upgrade anytime for higher translation allowances.
          </p>
        </div>

        {successMsg && (
          <div className="mb-6 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            {successMsg}
          </div>
        )}

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {CENTRALIZED_PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id
            const isLoading = loadingPlan === plan.id
            const displayPrice = getDisplayPrice(plan, (user as any)?.countryCode)

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all duration-150 ${
                  plan.isPopular
                    ? "border-blue-600 bg-blue-50/30 dark:bg-blue-950/20 ring-1 ring-blue-600 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40"
                }`}
              >
                {plan.isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
                    Popular
                  </span>
                )}

                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                    <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800/60">
                      {plan.badge}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{displayPrice}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">/{plan.period}</span>
                  </div>

                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800/70 p-2.5 text-center text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60">
                    {plan.limitText}
                  </div>

                  <ul className="space-y-2 pt-1 text-xs text-slate-600 dark:text-slate-300">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-5">
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isCurrent || isLoading}
                    className={`w-full rounded-lg py-2.5 text-xs font-semibold transition flex items-center justify-center gap-2 ${
                      isCurrent
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 cursor-default"
                        : plan.isPopular
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                        : "bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white"
                    }`}
                  >
                    {isCurrent ? (
                      <>
                        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Current Plan
                      </>
                    ) : isLoading ? (
                      "Opening Checkout..."
                    ) : (
                      <>
                        <Zap className="h-3.5 w-3.5" /> Select {plan.name}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-[11px] text-slate-500 dark:text-slate-400">
          Secure payment powered by Razorpay • Instant access upon confirmation
        </div>
      </div>
    </div>
  )
}
