import { useNavigate } from "react-router-dom"
import { Languages, Sparkles, ShieldCheck, ArrowRight } from "lucide-react"

export default function OnboardingPage() {
    const navigate = useNavigate()

    return (
        <div className="flex min-h-[calc(100vh-4rem)] flex-col justify-between p-6 lg:p-12">
            <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center text-center">
                {/* Steps Progress Indicator */}
                <div className="mb-10 w-full max-w-md">
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 font-bold text-white text-xs ring-4 ring-indigo-500/20">
                            1
                        </div>
                        <div className="h-0.5 flex-1 bg-white/10 mx-2" />
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/5 font-semibold text-gray-400 text-xs">
                            2
                        </div>
                        <div className="h-0.5 flex-1 bg-white/10 mx-2" />
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/5 font-semibold text-gray-400 text-xs">
                            3
                        </div>
                        <div className="h-0.5 flex-1 bg-white/10 mx-2" />
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/5 font-semibold text-gray-400 text-xs">
                            4
                        </div>
                    </div>
                    <div className="mt-3 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full w-1/4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                    </div>
                </div>

                {/* 3D AI Graphic Showcase Card */}
                <div className="relative mb-8 aspect-[16/9] w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-indigo-950/60 to-purple-950/20 p-2 shadow-[0_0_50px_rgba(99,102,241,0.2)]">
                    <img
                        src="/images/translation_glob.jpeg"
                        alt="AI Connection"
                        className="h-full w-full rounded-2xl object-cover"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07080d] via-transparent to-transparent" />
                </div>

                {/* Headline */}
                <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                    Welcome to the Future of{" "}
                    <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                        Connection
                    </span>
                </h1>

                <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-gray-400">
                    FriendZone breaks down language barriers using state-of-the-art AI. Connect with anyone, anywhere, in any language—instantly.
                </p>

                {/* Feature Badges Grid */}
                <div className="mt-8 grid w-full max-w-xl grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
                        <Languages className="h-6 w-6 text-indigo-400 mb-2" />
                        <span className="text-sm font-semibold text-white">80+ Languages</span>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
                        <Sparkles className="h-6 w-6 text-purple-400 mb-2" />
                        <span className="text-sm font-semibold text-white">AI Real-time</span>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
                        <ShieldCheck className="h-6 w-6 text-emerald-400 mb-2" />
                        <span className="text-sm font-semibold text-white">Secure & Private</span>
                    </div>
                </div>

                {/* CTA Button */}
                <button
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    className="group mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(99,102,241,0.6)]"
                >
                    Get Started
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>
            </div>

            {/* Bottom Footer */}
            <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-gray-500 sm:flex-row">
                <p>© 2026 FriendZone AI Messaging. All rights reserved.</p>
                <div className="flex items-center gap-6">
                    <a href="#" className="hover:text-gray-300">Privacy Policy</a>
                    <a href="#" className="hover:text-gray-300">Terms of Service</a>
                    <a href="#" className="hover:text-gray-300">Help Center</a>
                </div>
            </div>
        </div>
    )
}
