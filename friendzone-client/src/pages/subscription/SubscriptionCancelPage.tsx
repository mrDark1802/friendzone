import { useNavigate } from "react-router-dom"
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react"
import SEO from "../../components/SEO"

export default function SubscriptionCancelPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#07080d] text-white flex items-center justify-center p-6">
      <SEO title="Subscription Cancelled — FriendZone" description="Stripe checkout was cancelled." />
      <div className="max-w-md w-full rounded-3xl border border-white/10 bg-[#0f111a] p-8 text-center shadow-2xl space-y-6 animate-fadeIn">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
          <XCircle className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white">Checkout Cancelled</h1>
          <p className="text-sm text-gray-400">
            You cancelled the checkout process. No charges were made to your account, and your current subscription plan remains unchanged.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => navigate("/pricing")}
            className="flex-1 rounded-xl bg-white/10 hover:bg-white/20 py-3 text-xs font-bold text-white transition flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Try Again
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3 text-xs font-bold text-white transition flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
