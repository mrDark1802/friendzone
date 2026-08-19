import { useState, useEffect, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import SEO from "../components/SEO"
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    Globe,
    ShieldCheck,
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
    const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)

    useEffect(() => {
        if (isAuthenticated) {
            navigate("/dashboard", { replace: true })
        }
    }, [isAuthenticated, navigate])

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
        <div className="flex min-h-[calc(100vh-4rem-12rem)] w-full flex-1 items-center justify-center px-4 sm:px-6 py-8 sm:py-12 bg-slate-50 dark:bg-[#07090e] text-slate-900 dark:text-slate-100 animate-fade-in">
            <SEO
                title="Sign In"
                description="Sign in to your FriendZone account to access global real-time translated chat and friends list."
                canonicalUrl="/signin"
            />

            <div className="mx-auto grid w-full max-w-4xl items-center gap-8 lg:grid-cols-12">
                {/* Left Brand Showcase */}
                <div className="hidden lg:col-span-5 flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-8 shadow-xs lg:flex min-h-[460px]">
                    <div className="space-y-4 text-left">
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Verified Access
                        </div>

                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                            Welcome back to FriendZone.
                        </h1>

                        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                            Connect with verified friends and talk freely across languages with instant real-time translation.
                        </p>
                    </div>

                    <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800 text-left">
                        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold shrink-0">
                                <Globe className="h-4 w-4" />
                            </span>
                            <span>Automatic multi-language translation</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold shrink-0">
                                <ShieldCheck className="h-4 w-4" />
                            </span>
                            <span>Strict verified email accounts</span>
                        </div>
                    </div>
                </div>

                {/* Right Auth Form */}
                <div className="lg:col-span-7 mx-auto w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-6 sm:p-8 shadow-xs text-left">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sign In</h2>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Enter your email and password to access your account.
                        </p>
                    </div>

                    {/* Unverified Email Warning Banner */}
                    {unverifiedEmail ? (
                        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-3.5 text-xs text-amber-800 dark:text-amber-300">
                            <div className="flex items-center gap-2 font-semibold">
                                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                                <span>Verification Required</span>
                            </div>
                            <p className="text-[11px]">
                                Your FriendZone account requires email verification before activation.
                            </p>
                            <Link
                                to="/verify-email"
                                className="mt-1 text-xs font-semibold text-blue-600 hover:underline"
                            >
                                Go to Email Verification →
                            </Link>
                        </div>
                    ) : errorMessage ? (
                        <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300">
                            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                            <span>{errorMessage}</span>
                        </div>
                    ) : null}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                        <div>
                            <label
                                htmlFor="email"
                                className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                            >
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-2 pl-10 pr-4 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-600 transition"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="mb-1 flex items-center justify-between">
                                <label
                                    htmlFor="password"
                                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                                >
                                    Password
                                </label>
                                <Link to="/forgot-password" className="text-[11px] font-semibold text-blue-600 hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-2 pl-10 pr-10 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-600 transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400">
                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                Remember this device
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50"
                        >
                            {isLoading ? "Signing In..." : "Sign In"}
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    </form>

                    <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
                        Don&apos;t have an account yet?{" "}
                        <Link
                            to="/signup"
                            className="font-semibold text-blue-600 hover:underline"
                        >
                            Create an Account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}