import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import SEO from "../../components/SEO"

export default function SubscriptionSuccessPage() {
  const { refreshProfile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Refresh user profile and quota state from backend
    refreshProfile().catch(() => {})
  }, [refreshProfile])

  return (
    <div className="min-h-screen bg-[#07080d] text-white flex items-center justify-center p-6">
      <SEO title="Subscription Success — FriendZone" description="Payment received and subscription being confirmed." />
      <div className="max-w-md w-full rounded-3xl border border-white/10 bg-[#0f111a] p-8 text-center shadow-2xl space-y-6 animate-fadeIn">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <CheckCircle2 className="h-10 w-10 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 text-xs font-semibold text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" /> Payment Received
          </span>
          <h1 className="text-2xl font-black text-white">Subscription Confirmed!</h1>
          <p className="text-sm text-gray-400">
            Thank you for subscribing! Your payment has been confirmed and your translation quota has been unlocked automatically via Razorpay.
          </p>
        </div>

        <div className="rounded-2xl bg-white/5 p-4 text-xs text-gray-300 border border-white/10">
          ⚡ Your daily/monthly translation counter has been reset to <span className="text-emerald-400 font-bold">0 used</span>.
        </div>

        <button
          onClick={() => navigate("/dashboard")}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3.5 text-xs font-bold text-white shadow-lg hover:scale-[1.02] transition flex items-center justify-center gap-2"
        >
          Return to Dashboard <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
