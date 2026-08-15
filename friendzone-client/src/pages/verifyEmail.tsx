import { useState, useEffect } from "react"
import { useSearchParams, Link, useNavigate } from "react-router-dom"
import { authApi } from "../services/api"
import { useAuth } from "../context/AuthContext"
import {
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Globe,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react"

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const urlEmail = searchParams.get("email") || ""
  const navigate = useNavigate()
  const { user } = useAuth()

  const [status, setStatus] = useState<"WAITING" | "LOADING" | "SUCCESS" | "EXPIRED" | "ALREADY_VERIFIED" | "INVALID">(
    token ? "LOADING" : "WAITING"
  )
  const [message, setMessage] = useState("")
  const [inputEmail, setInputEmail] = useState(urlEmail || user?.email || "")
  const [isResending, setIsResending] = useState(false)
  const [resendStatus, setResendStatus] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (urlEmail && !inputEmail) {
      setInputEmail(urlEmail)
    }
  }, [urlEmail])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  useEffect(() => {
    if (!token) {
      setStatus("WAITING")
      return
    }

    const processVerification = async () => {
      try {
        const res = await authApi.verifyEmail(token)
        const data = res?.data || res
        if (data.status === "SUCCESS") {
          setStatus("SUCCESS")
          setMessage(data.message || "Email verified successfully! 🎉")
        } else if (data.status === "ALREADY_VERIFIED") {
          setStatus("ALREADY_VERIFIED")
          setMessage("Your email address is already verified.")
        } else if (data.status === "EXPIRED") {
          setStatus("EXPIRED")
          setMessage(data.message || "This verification link has expired (30m limit).")
          if (data.email) setInputEmail(data.email)
        } else {
          setStatus("INVALID")
          setMessage(data.message || "This verification link is invalid or modified.")
        }
      } catch (err: any) {
        setStatus("INVALID")
        setMessage(err.message || "Failed to verify email token.")
      }
    }

    processVerification()
  }, [token])

  const handleResend = async () => {
    const emailToUse = inputEmail.trim()
    if (!emailToUse) {
      setResendStatus("Please enter your registered email address.")
      return
    }

    setIsResending(true)
    setResendStatus("")
    try {
      const res = await authApi.resendVerification(emailToUse)
      setResendStatus(res.message || "A new verification email has been sent!")
      setResendCooldown(60)
    } catch (err: any) {
      setResendStatus(err.message || "Failed to resend verification email.")
    } finally {
      setIsResending(false)
    }
  }

  const maskEmail = (email: string) => {
    if (!email || !email.includes("@")) return email
    const [name, domain] = email.split("@")
    const maskedName = name.length > 2 ? name[0] + "*".repeat(name.length - 2) + name[name.length - 1] : name[0] + "*"
    return `${maskedName}@${domain}`
  }

  return (
    <div className="min-h-screen bg-[#07080d] text-white flex flex-col justify-center items-center py-12 px-4 relative overflow-hidden">
      {/* Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-pink-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="rounded-3xl border border-white/10 bg-[#0c0e17]/90 p-8 backdrop-blur-2xl shadow-2xl text-center space-y-6">

          {/* Logo Branding */}
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/25">
              <div className="h-full w-full bg-[#07080d] rounded-[14px] flex items-center justify-center">
                <Globe className="h-4 w-4 text-indigo-400" />
              </div>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">FriendZone</span>
          </Link>

          {/* WAITING STATE (Gate after signup or unverified login) */}
          {status === "WAITING" && (
            <div className="space-y-5 py-4 animate-in fade-in zoom-in-95">
              <div className="mx-auto h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Mail className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-300">
                  <ShieldCheck className="h-3.5 w-3.5" /> Activation Required
                </span>
                <h2 className="text-2xl font-extrabold text-white">Verify Your Email</h2>
                <p className="text-xs text-gray-300 max-w-sm mx-auto leading-relaxed">
                  We've sent a 30-minute verification link to{" "}
                  <strong className="text-indigo-400">{inputEmail ? maskEmail(inputEmail) : "your email address"}</strong>.
                  Please click the link inside your email to activate your account.
                </p>
                <p className="text-[11px] text-gray-400 italic max-w-xs mx-auto pt-1">
                  Email verification helps us protect FriendZone from bots, spam, fake accounts, and abuse.
                </p>
              </div>

              {resendStatus && (
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-indigo-300">
                  {resendStatus}
                </div>
              )}

              <div className="space-y-4 pt-2">
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-semibold text-gray-300">Registered Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 px-4 text-xs text-white outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending || resendCooldown > 0}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-[0_0_25px_rgba(99,102,241,0.4)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(99,102,241,0.6)] active:scale-[0.98] disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isResending ? "animate-spin" : ""}`} />
                  {resendCooldown > 0 ? `Resend email in ${resendCooldown}s` : "Resend Verification Email"}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/signIn")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-semibold text-gray-300 hover:bg-white/10 transition"
                >
                  Back to Sign In
                </button>
              </div>

              <p className="text-[11px] text-gray-500 pt-1">
                Having issues? Contact support at{" "}
                <a href="mailto:friendzone_live@proton.me" className="text-indigo-400 underline">
                  friendzone_live@proton.me
                </a>
              </p>
            </div>
          )}

          {/* LOADING STATE */}
          {status === "LOADING" && (
            <div className="space-y-4 py-6">
              <Loader2 className="h-10 w-10 text-indigo-400 animate-spin mx-auto" />
              <p className="text-xs text-gray-300">Verifying your email token with FriendZone servers...</p>
            </div>
          )}

          {/* SUCCESS / VALID STATE */}
          {status === "SUCCESS" && (
            <div className="space-y-5 py-4 animate-in fade-in zoom-in-95">
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-white">Email Verified! 🎉</h2>
                <p className="text-xs text-gray-300">{message}</p>
                <p className="text-[11px] text-emerald-300/80 font-medium">Your FriendZone account is now fully active.</p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 py-3.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-90 transition"
              >
                Go to Workspace <Sparkles className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ALREADY VERIFIED STATE */}
          {status === "ALREADY_VERIFIED" && (
            <div className="space-y-5 py-4 animate-in fade-in zoom-in-95">
              <div className="mx-auto h-16 w-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">Already Verified</h2>
                <p className="text-xs text-gray-300">{message}</p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3.5 text-xs font-bold text-white shadow-lg hover:opacity-90 transition"
              >
                Go to Workspace <Sparkles className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* EXPIRED STATE */}
          {status === "EXPIRED" && (
            <div className="space-y-5 py-4 animate-in fade-in zoom-in-95">
              <div className="mx-auto h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Clock className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">Verification Link Expired</h2>
                <p className="text-xs text-gray-300">{message}</p>
                <p className="text-[11px] text-gray-400">Verification links expire after 30 minutes for security reasons.</p>
              </div>

              {resendStatus && (
                <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-indigo-300">
                  {resendStatus}
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-semibold text-gray-300">Registered Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 px-4 text-xs text-white outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending || resendCooldown > 0}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90 transition disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isResending ? "animate-spin" : ""}`} />
                  {resendCooldown > 0 ? `Resend email in ${resendCooldown}s` : "Send New Verification Email"}
                </button>
              </div>
            </div>
          )}

          {/* INVALID STATE */}
          {status === "INVALID" && (
            <div className="space-y-5 py-4 animate-in fade-in zoom-in-95">
              <div className="mx-auto h-16 w-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                <XCircle className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">Invalid Verification Link</h2>
                <p className="text-xs text-gray-300">{message}</p>
                <p className="text-[11px] text-gray-400">This link may have been modified or already used.</p>
              </div>

              {resendStatus && (
                <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-indigo-300">
                  {resendStatus}
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-semibold text-gray-300">Registered Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 px-4 text-xs text-white outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending || resendCooldown > 0}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90 transition disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isResending ? "animate-spin" : ""}`} />
                  {resendCooldown > 0 ? `Resend email in ${resendCooldown}s` : "Request New Verification Link"}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/signIn")}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 py-2.5 text-xs font-semibold text-gray-300 hover:bg-white/10 transition"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
