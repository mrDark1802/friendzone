import { useState, useEffect, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    Globe,
    ShieldCheck,
    Sparkles,
    AlertCircle,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"

export default function SignIn() {
    const { login, isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [remember, setRemember] = useState(true)
    const [isLoading, setIsLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    useEffect(() => {
        if (isAuthenticated) {
            navigate("/dashboard", { replace: true })
        }
    }, [isAuthenticated, navigate])

    const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setErrorMessage(null)
        setUnverifiedEmail(null)
        setIsLoading(true)

        try {
            const res = await login(email, password)
            setIsLoading(false)
            if (res.success) {
                navigate("/dashboard")
            } else if (
                res.code === "EMAIL_VERIFICATION_REQUIRED" ||
                res.message?.toLowerCase().includes("not active yet") ||
                res.message?.toLowerCase().includes("verify your email")
            ) {
                const targetEmail = res.email || email.trim().toLowerCase()
                navigate(`/verify-email?email=${encodeURIComponent(targetEmail)}`, { replace: true })
                return
            } else {
                setErrorMessage(res.message || "Invalid email or password.")
            }
        } catch {
            setIsLoading(false)
            setErrorMessage("Could not connect to server.")
        }
    }

    return (
        <div className="relative flex min-h-[calc(100vh-4rem-16rem)] w-full flex-1 items-center justify-center overflow-hidden px-4 sm:px-6 py-8 md:py-16">
            {/* Ambient Background Glowing Orbs matching Homepage */}
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[450px] w-[500px] rounded-full bg-indigo-600/15 blur-[140px]" />
                <div className="absolute top-10 right-1/4 h-[300px] w-[300px] rounded-full bg-purple-600/10 blur-[120px]" />
            </div>

            <div className="relative z-10 mx-auto grid w-full max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
                {/* ---------------- Left Hero / Brand Showcase ---------------- */}
                <div className="relative hidden flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-indigo-950/30 via-white/[0.02] to-transparent p-10 backdrop-blur-xl lg:flex min-h-[520px]">
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#07080d]/60 via-[#07080d]/40 to-[#07080d]/90" />

                    <div className="relative z-10 flex h-full flex-col justify-between">
                        <div>
                            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[12px] font-semibold text-indigo-400">
                                <Sparkles className="h-3.5 w-3.5" />
                                Secure Authentication
                            </span>

                            <h1 className="mt-6 text-3xl font-bold leading-tight text-white xl:text-4xl">
                                Welcome back to
                                <br />
                                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                                    Global Connections.
                                </span>
                            </h1>

                            <p className="mt-4 text-[14px] leading-relaxed text-gray-400">
                                Access real-time AI translation, cross-cultural team channels, and end-to-end encrypted messaging.
                            </p>
                        </div>

                        {/* Interactive Feature Cards */}
                        <div className="mt-8 grid grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md transition-colors hover:border-white/20">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                                    <Globe className="h-4 w-4" />
                                </span>
                                <p className="mt-3 text-xs font-semibold text-white">100+ Languages</p>
                                <p className="mt-1 text-[11px] text-gray-400">
                                    Instant real-time translation with context intelligence.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md transition-colors hover:border-white/20">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                                    <ShieldCheck className="h-4 w-4" />
                                </span>
                                <p className="mt-3 text-xs font-semibold text-white">Enterprise Ready</p>
                                <p className="mt-1 text-[11px] text-gray-400">
                                    Encrypted dialogues with SOC2 privacy standards.
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-6">
                            <div className="flex -space-x-2">
                                <span className="h-7 w-7 rounded-full border-2 border-[#07080d] bg-gradient-to-br from-pink-400 to-purple-500" />
                                <span className="h-7 w-7 rounded-full border-2 border-[#07080d] bg-gradient-to-br from-indigo-400 to-blue-500" />
                                <span className="h-7 w-7 rounded-full border-2 border-[#07080d] bg-gradient-to-br from-emerald-400 to-teal-500" />
                            </div>
                            <p className="text-[12px] text-gray-400">
                                Joined by <span className="font-semibold text-white">50,000+</span> teams worldwide
                            </p>
                        </div>
                    </div>
                </div>

                {/* ---------------- Right Auth Form Card ---------------- */}
                <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] sm:p-10">
                    <div className="text-left">
                        <h2 className="text-2xl font-bold text-white sm:text-3xl">Welcome Back</h2>
                        <p className="mt-2 text-xs sm:text-sm text-gray-400">
                            Please enter your account details to access your workspace.
                        </p>
                    </div>

                    {/* Unverified Email Warning Banner */}
                    {unverifiedEmail ? (
                        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300 text-left animate-in fade-in">
                            <div className="flex items-center gap-2 font-semibold text-amber-400">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>Account Created — Verification Required</span>
                            </div>
                            <p className="text-[11px] text-amber-200/80 leading-relaxed">
                                Your FriendZone account has been created, but it is not active yet. Please check your inbox to activate your account.
                            </p>
                            <Link
                                to={`/verify-email`}
                                className="mt-1 inline-flex items-center justify-center rounded-lg bg-amber-500/20 py-2 px-3 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 transition"
                            >
                                Go to Email Verification Screen →
                            </Link>
                        </div>
                    ) : errorMessage ? (
                        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 text-left">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    ) : null}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div className="text-left">
                            <label
                                htmlFor="email"
                                className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-300 uppercase"
                            >
                                EMAIL ADDRESS
                            </label>
                            <div className="relative">
                                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition focus:border-indigo-500 focus:bg-white/[0.08]"
                                />
                            </div>
                        </div>

                        <div className="text-left">
                            <div className="mb-1.5 flex items-center justify-between">
                                <label
                                    htmlFor="password"
                                    className="block text-xs font-semibold tracking-wider text-gray-300 uppercase"
                                >
                                    PASSWORD
                                </label>
                                <Link to="/forgot-password" className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-500 outline-none transition focus:border-indigo-500 focus:bg-white/[0.08]"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                    className="h-4 w-4 rounded border-white/20 bg-transparent accent-indigo-500"
                                />
                                Remember this device for 30 days
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-[0_0_25px_rgba(99,102,241,0.4)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(99,102,241,0.6)] active:scale-[0.98] disabled:opacity-70"
                        >
                            {isLoading ? "Signing In..." : "Sign In"}
                            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </button>
                    </form>

                    <p className="mt-6 text-center text-xs sm:text-sm text-gray-400">
                        Don&apos;t have an account yet?{" "}
                        <Link
                            to="/signup"
                            className="font-semibold text-indigo-400 transition-colors hover:text-indigo-300 underline underline-offset-4"
                        >
                            Create an Account
                        </Link>
                    </p>

                    <p className="mt-4 text-center text-[11px] text-gray-500">
                        By signing in, you agree to our{" "}
                        <Link to="/terms" className="text-gray-400 hover:text-indigo-300 underline">
                            Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link to="/privacy" className="text-gray-400 hover:text-indigo-300 underline">
                            Privacy Policy
                        </Link>
                        .
                    </p>

                    <div className="my-6 h-px w-full bg-white/10" />

                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-medium tracking-wide text-gray-500">
                        <span className="flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" /> SECURE AUTHENTICATION
                        </span>
                        <span className="flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" /> JWT PROTECTED
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}