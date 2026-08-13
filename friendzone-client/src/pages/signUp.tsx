import { useState, type FormEvent, type ReactNode } from "react"
import { Link } from "react-router-dom"
import {
    Globe,
    User,
    Mail,
    Lock,
    ArrowRight,
    Sparkles,
    ShieldCheck,
    Zap,
    AtSign,
} from "lucide-react"

import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"

interface SignUpPageProps {
    backgroundImageUrl?: string
    onSubmit?: (data: {
        fullName: string
        username: string
        email: string
        password: string
        agreed: boolean
    }) => void
}

export default function SignUp({ backgroundImageUrl, onSubmit }: SignUpPageProps) {
    const { register } = useAuth()
    const navigate = useNavigate()

    const [fullName, setFullName] = useState("")
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [agreed, setAgreed] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setErrorMessage(null)
        setIsLoading(true)

        if (onSubmit) {
            onSubmit({ fullName, username, email, password, agreed })
            setIsLoading(false)
            return
        }

        try {
            const res = await register({ fullName, username, email, password })
            setIsLoading(false)
            if (res.success) {
                navigate("/dashboard/onboarding")
            } else {
                setErrorMessage(res.message || "Registration failed. Please try again.")
            }
        } catch {
            setIsLoading(false)
            setErrorMessage("Could not connect to backend server.")
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
                {/* ---------------- Left Hero / Feature Showcase ---------------- */}
                <div
                    className="relative hidden flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-indigo-950/30 via-white/[0.02] to-transparent p-10 backdrop-blur-xl lg:flex min-h-[580px]"
                    style={backgroundImageUrl ? { backgroundImage: `url(${backgroundImageUrl})`, backgroundSize: 'cover' } : undefined}
                >
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#07080d]/60 via-[#07080d]/40 to-[#07080d]/90" />

                    <div className="relative z-10 flex h-full flex-col justify-between">
                        <div>
                            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[12px] font-semibold text-indigo-400">
                                <Sparkles className="h-3.5 w-3.5" />
                                Instant Access
                            </span>

                            <h1 className="mt-6 text-3xl font-bold leading-tight text-white xl:text-4xl">
                                Connect
                                <br />
                                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                                    Without Limits.
                                </span>
                            </h1>

                            <p className="mt-4 text-[14px] leading-relaxed text-gray-400">
                                Join the world&apos;s most advanced AI messaging platform. Break language barriers instantly and build global connections.
                            </p>
                        </div>

                        {/* Feature list */}
                        <div className="mt-6 space-y-4">
                            <FeatureRow
                                icon={<Sparkles className="h-4 w-4 text-indigo-400" />}
                                title="Real-Time Translation"
                                description="Messages translate instantly into your native language."
                            />
                            <FeatureRow
                                icon={<ShieldCheck className="h-4 w-4 text-indigo-400" />}
                                title="Enterprise Security"
                                description="Protected with end-to-end encryption & privacy."
                            />
                            <FeatureRow
                                icon={<Zap className="h-4 w-4 text-indigo-400" />}
                                title="Lightning Fast Setup"
                                description="Get started in seconds and connect with anyone globally."
                            />
                        </div>

                        {/* Social proof */}
                        <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-6">
                            <div className="flex -space-x-2">
                                <span className="h-7 w-7 rounded-full border-2 border-[#07080d] bg-gradient-to-br from-pink-400 to-orange-300" />
                                <span className="h-7 w-7 rounded-full border-2 border-[#07080d] bg-gradient-to-br from-indigo-400 to-purple-500" />
                                <span className="h-7 w-7 rounded-full border-2 border-[#07080d] bg-gradient-to-br from-emerald-400 to-teal-500" />
                            </div>
                            <p className="text-[12px] text-gray-400">
                                Joined by <span className="font-semibold text-white">10,000+</span> professionals worldwide
                            </p>
                        </div>
                    </div>
                </div>

                {/* ---------------- Right Auth Form Card ---------------- */}
                <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] sm:p-10">
                    {/* Progress Step */}
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex h-1.5 w-32 gap-1.5">
                            <span className="h-full flex-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                            <span className="h-full flex-1 rounded-full bg-white/10" />
                        </div>
                        <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-indigo-400 uppercase">
                            STEP 1 OF 2
                        </span>
                    </div>

                    <div className="text-left">
                        <h2 className="text-2xl font-bold text-white sm:text-3xl">Create Account</h2>
                        <p className="mt-2 text-xs sm:text-sm text-gray-400">
                            Enter your details to get started with FriendZone.
                        </p>
                    </div>

                    {/* Error Banner */}
                    {errorMessage && (
                        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-left text-xs font-semibold text-red-400">
                            ⚠️ {errorMessage}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div className="text-left">
                            <label
                                htmlFor="fullName"
                                className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-300 uppercase"
                            >
                                Full Name
                            </label>
                            <div className="relative">
                                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                <input
                                    id="fullName"
                                    type="text"
                                    required
                                    autoComplete="name"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="John Doe"
                                    className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition focus:border-indigo-500 focus:bg-white/[0.08]"
                                />
                            </div>
                        </div>

                        {/* NEW Username Field */}
                        <div className="text-left">
                            <label
                                htmlFor="username"
                                className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-300 uppercase"
                            >
                                Username
                            </label>
                            <div className="relative">
                                <AtSign className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" />
                                <input
                                    id="username"
                                    type="text"
                                    required
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                                    placeholder="john_doe"
                                    className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition focus:border-indigo-500 focus:bg-white/[0.08]"
                                />
                            </div>
                            <p className="mt-1 text-[11px] text-gray-500">
                                Used to search and connect with friends on FriendZone later.
                            </p>
                        </div>

                        <div className="text-left">
                            <label
                                htmlFor="email"
                                className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-300 uppercase"
                            >
                                Email Address
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
                            <label
                                htmlFor="password"
                                className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-300 uppercase"
                            >
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition focus:border-indigo-500 focus:bg-white/[0.08]"
                                />
                            </div>
                        </div>

                        <label className="flex items-start gap-2.5 cursor-pointer text-left text-xs sm:text-sm text-gray-300 pt-1">
                            <input
                                type="checkbox"
                                required
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent accent-indigo-500 shrink-0"
                            />
                            <span className="leading-snug text-xs text-gray-400">
                                I agree to the{" "}
                                <a href="#" className="font-medium text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                                    Terms of Service
                                </a>{" "}
                                and{" "}
                                <a href="#" className="font-medium text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                                    Privacy Policy
                                </a>
                                .
                            </span>
                        </label>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-[0_0_25px_rgba(99,102,241,0.4)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(99,102,241,0.6)] active:scale-[0.98] disabled:opacity-70"
                        >
                            {isLoading ? "Creating Account..." : "Next Step"}
                            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </button>
                    </form>

                    <p className="mt-6 text-center text-xs sm:text-sm text-gray-400">
                        Already have an account?{" "}
                        <Link
                            to="/signin"
                            className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                            Log in
                        </Link>
                    </p>

                    <div className="my-6 h-px w-full bg-white/10" />

                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-medium tracking-wide text-gray-500">
                        <span className="flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-indigo-400" /> GLOBAL
                        </span>
                        <span className="flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" /> SECURE
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-indigo-400" /> INSTANT
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

function FeatureRow({
    icon,
    title,
    description,
}: {
    icon: ReactNode
    title: string
    description: string
}) {
    return (
        <div className="flex gap-3 text-left">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
                {icon}
            </span>
            <div>
                <p className="text-xs font-semibold text-white">{title}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">{description}</p>
            </div>
        </div>
    )
}