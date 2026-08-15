import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { authApi } from "../services/api"
import { Globe, Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("")
    try {
      const res = await authApi.forgotPassword(email.trim().toLowerCase())
      setMessage(res.message || "Password reset link sent!")
      setIsSubmitted(true)
    } catch (err: any) {
      setMessage(err.message || "Failed to process forgot password request.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#07080d] text-white flex flex-col justify-center items-center py-12 px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-pink-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="rounded-3xl border border-white/10 bg-[#0c0e17]/90 p-8 backdrop-blur-2xl shadow-2xl space-y-6">

          <div className="text-center space-y-2">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/25">
                <div className="h-full w-full bg-[#07080d] rounded-[14px] flex items-center justify-center">
                  <Globe className="h-4 w-4 text-indigo-400" />
                </div>
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">FriendZone</span>
            </Link>
            <h1 className="text-xl font-bold text-white pt-2">Forgot Password</h1>
            <p className="text-xs text-gray-400">Enter your email and we'll send you password reset instructions.</p>
          </div>

          {isSubmitted ? (
            <div className="text-center space-y-4 py-4 animate-in fade-in zoom-in-95">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">{message}</p>
              <Link
                to="/signIn"
                className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:underline pt-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {message && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                  {message}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 py-3.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-90 transition disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Password Reset Link"}
              </button>

              <div className="text-center pt-2">
                <Link to="/signIn" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
                </Link>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
