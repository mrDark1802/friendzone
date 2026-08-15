import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Sparkles, Check, Zap, ShieldCheck } from "lucide-react"
import { PLANS } from "../../components/SubscriptionModal"
import { useAuth } from "../../context/AuthContext"
import { usersApi } from "../../services/api"
import SEO from "../../components/SEO"

export default function PricingPage() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null)

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      navigate("/signin")
      return
    }

    setUpgradingPlan(planId)
    try {
      await usersApi.upgradePlan(planId)
      await refreshProfile()
      navigate("/dashboard")
    } catch (err: any) {
      alert(err.message || "Failed to update plan")
    } finally {
      setUpgradingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#07080d] text-white py-16 px-6">
      <SEO
        title="Pricing - Transparent Plans for Global Chat"
        description="Choose the right FriendZone plan for unlimited real-time AI translation, group channels, priority messaging, and global discovery."
        canonicalUrl="/pricing"
      />
      <div className="mx-auto max-w-6xl space-y-16 text-left">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-4 py-1.5 text-xs font-semibold text-indigo-300">
            <Sparkles className="h-4 w-4" /> Transparent & Simple Pricing
          </span>
          <h1 className="text-4xl font-extrabold sm:text-5xl bg-gradient-to-r from-white via-gray-200 to-indigo-300 bg-clip-text text-transparent">
            Choose the Perfect Translation Plan
          </h1>
          <p className="text-base text-gray-400">
            Start for free with 20 translations per day or upgrade for higher monthly limits and premium neural speed.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PLANS.map((plan) => {
            const isCurrent = user?.plan?.toUpperCase() === plan.id
            const isLoading = upgradingPlan === plan.id

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-3xl border p-8 backdrop-blur-md transition-all duration-300 ${plan.borderColor} ${
                  plan.isPopular ? "bg-indigo-950/30 ring-2 ring-indigo-500/50 shadow-2xl scale-105" : "bg-white/[0.03]"
                }`}
              >
                {plan.isPopular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                    MOST POPULAR
                  </span>
                )}

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-extrabold text-white">{plan.name}</h3>
                    <span className="text-xs font-bold text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                      {plan.badge}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    <span className="text-xs text-gray-400">/{plan.period}</span>
                  </div>

                  <div className="rounded-2xl bg-white/5 p-3 text-center text-xs font-semibold text-indigo-200 border border-white/10">
                    ⚡ {plan.limitText}
                  </div>

                  <ul className="space-y-3 pt-2 text-xs text-gray-300">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-8">
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isCurrent || isLoading}
                    className={`w-full rounded-2xl py-3.5 text-xs font-bold transition flex items-center justify-center gap-2 ${
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
                      "Updating..."
                    ) : (
                      <>
                        <Zap className="h-4 w-4" /> Get Started with {plan.name}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
