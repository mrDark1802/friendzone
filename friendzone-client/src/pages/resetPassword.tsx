import { useState, type FormEvent } from "react"
import { useSearchParams, useNavigate, Link } from "react-router-dom"
import { authApi } from "../services/api"
import { Globe, Lock, Loader2, CheckCircle2, ArrowRight } from "lucide-react"

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage("")

    if (!token) {
      setErrorMessage("Missing password reset token in URL.")
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.")
      return
    }

    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.")
      return
    }

    setIsLoading(true)
    try {
      await authApi.resetPassword(token, newPassword)
      setIsSuccess(true)
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reset password. Token may be expired.")
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
            <h1 className="text-xl font-bold text-white pt-2">Set New Password</h1>
            <p className="text-xs text-gray-400">Choose a new secure password for your account.</p>
          </div>

          {isSuccess ? (
            <div className="text-center space-y-5 py-4 animate-in fade-in zoom-in-95">
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white">Password Reset Complete! 🎉</h2>
                <p className="text-xs text-gray-300">Your password has been updated and active sessions were secured.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/signIn")}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3.5 text-xs font-bold text-white hover:opacity-90 transition"
              >
                Sign In with New Password <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 py-3.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-90 transition disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
