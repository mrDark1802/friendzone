import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Check, ShieldCheck } from "lucide-react"
import { CENTRALIZED_PLANS, getDisplayPrice } from "../../config/pricingConfig"
import { useAuth } from "../../context/AuthContext"
import { subscriptionApi } from "../../services/api"
import { loadRazorpayScript } from "../../utils/loadRazorpay"
import SEO from "../../components/SEO"
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

export default function PricingPage() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null)

  // ── Razorpay checkout logic (unchanged) ────────────────────────────────────
  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      navigate("/signin")
      return
    }

    const cleanPlan = planId.toUpperCase()
    setUpgradingPlan(cleanPlan)
    try {
      if (cleanPlan === "FREE") {
        await subscriptionApi.changePlan("FREE")
        await refreshProfile()
        navigate("/dashboard")
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
          name: "FriendZone Social",
          description: `${cleanPlan} Plan — Translation Subscription`,
          image: "/friendzone_logo.png",
          handler: async function (response: any) {
            try {
              setUpgradingPlan(cleanPlan)
              await subscriptionApi.verifyPayment({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
                plan: cleanPlan,
              })
              await refreshProfile()
              navigate("/subscription/success")
            } catch (verifyErr: any) {
              alert(verifyErr?.message || "Payment verification failed.")
            } finally {
              setUpgradingPlan(null)
            }
          },
          prefill: {
            name: (user as any)?.displayName || (user as any)?.name || res.user?.displayName || "",
            email: user?.email || res.user?.email || "",
          },
          theme: {
            color: "#2563EB",
          },
        }

        const rzp = new (window as any).Razorpay(options)
        rzp.on("payment.failed", function (response: any) {
          alert(`Payment Failed: ${response.error?.description || "Payment was rejected."}`)
        })
        rzp.open()
      }
    } catch (err: any) {
      alert(err.message || "Failed to update plan")
    } finally {
      setUpgradingPlan(null)
    }
  }

  return (
    <div className="w-full bg-slate-50 dark:bg-[#07090e] text-slate-900 dark:text-slate-100 min-h-screen">
      <SEO
        title="Pricing — Simple, Transparent Plans"
        description="FriendZone is free to join. Upgrade for higher monthly translation limits. No hidden fees, no surprises."
        canonicalUrl="/pricing"
      />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-14 sm:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Pricing
            </span>
            <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Start free. Upgrade when you need more.
            </h1>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
              FriendZone is free to use. The only thing you pay for is higher translation limits — everything else is included in every plan.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Pricing cards ─────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 pb-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:items-start">
            {CENTRALIZED_PLANS.map((plan, i) => {
              const isCurrent = user?.plan?.toUpperCase() === plan.id
              const isLoading = upgradingPlan === plan.id
              const displayPrice = getDisplayPrice(plan, (user as any)?.countryCode)

              return (
                <Reveal
                  key={plan.id}
                  delay={i * 60}
                  className={`relative flex flex-col rounded-2xl border bg-white dark:bg-[#0e121d] shadow-xs overflow-hidden ${
                    plan.isPopular
                      ? "border-blue-600 dark:border-blue-500 ring-1 ring-blue-600 dark:ring-blue-500"
                      : "border-slate-200/80 dark:border-slate-800"
                  }`}
                >
                  {/* Popular ribbon */}
                  {plan.isPopular && (
                    <div className="bg-blue-600 px-4 py-1.5 text-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">
                        Most popular
                      </span>
                    </div>
                  )}

                  <div className="p-6 flex flex-col flex-1">
                    {/* Plan name + badge */}
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">{plan.name}</h2>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {plan.period === "forever" ? "Free forever" : plan.period}
                      </span>
                    </div>

                    {/* Price */}
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{displayPrice}</span>
                      {plan.period !== "forever" && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">/ month</span>
                      )}
                    </div>

                    {/* Translation limit callout */}
                    <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 text-center">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {plan.limitText}
                      </span>
                    </div>

                    {/* Features */}
                    <ul className="mt-5 space-y-2.5 flex-1">
                      {plan.features.map((feat, fi) => (
                        <li key={fi} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <div className="mt-6">
                      <button
                        onClick={() => handleSelectPlan(plan.id)}
                        disabled={isCurrent || isLoading}
                        className={`w-full rounded-xl py-3 text-xs font-semibold transition flex items-center justify-center gap-2 ${
                          isCurrent
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 cursor-default"
                            : plan.isPopular
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                            : "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                        }`}
                      >
                        {isCurrent ? (
                          <>
                            <ShieldCheck className="h-4 w-4" />
                            Current plan
                          </>
                        ) : isLoading ? (
                          "Opening checkout…"
                        ) : plan.id === "FREE" ? (
                          "Get started free"
                        ) : (
                          `Upgrade to ${plan.name}`
                        )}
                      </button>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ-style clarifications ───────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-12 border-t border-slate-200/80 dark:border-slate-800">
        <div className="mx-auto max-w-2xl space-y-5">
          {[
            {
              q: "What counts as a translation?",
              a: "Each message that gets translated from one language to another uses one translation from your daily or monthly quota. Messages in the same language as yours are not counted.",
            },
            {
              q: "Does the free plan expire?",
              a: "No. The free plan is free forever. Your daily quota resets every 24 hours at UTC midnight.",
            },
            {
              q: "Can I cancel my subscription anytime?",
              a: "Yes. You can switch back to the free plan at any time from your dashboard settings. No penalty.",
            },
            {
              q: "What happens if I reach my limit?",
              a: "You can still send and receive messages — they just won't be translated until your quota resets or you upgrade.",
            },
          ].map(({ q, a }) => (
            <Reveal key={q} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] px-5 py-4 shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">{q}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{a}</p>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  )
}
