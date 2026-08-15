import { useEffect, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import {
    ArrowRight,
    Globe2,
    Lock,
    MessageSquareText,
    ShieldCheck,
    Users,
    UserPlus,
    Languages,
} from "lucide-react"
import { useInView } from "../layouts/useInView"

const CORE_FLOW_STEPS = [
    {
        icon: UserPlus,
        step: "01",
        title: "Discover & Connect",
        description: "Find members across the world, check mutual connections, and send friend requests.",
    },
    {
        icon: Users,
        step: "02",
        title: "Build Your Circle",
        description: "Accept requests to establish verified friendships with authentic users.",
    },
    {
        icon: MessageSquareText,
        step: "03",
        title: "1-on-1 & Group Chat",
        description: "Communicate directly or create group conversations for shared interests.",
    },
    {
        icon: Languages,
        step: "04",
        title: "Instant Translation",
        description: "Messages translate dynamically to your preferred native language in real time.",
    },
]

const KEY_BENEFITS = [
    {
        icon: ShieldCheck,
        title: "Mandatory Email Verification",
        description: "Every account is verified by email before activation to prevent bots, spam, and fake profiles.",
    },
    {
        icon: Languages,
        title: "Multi-Language Support",
        description: "Supports automatic on-demand translation across English, Spanish, French, German, Japanese, and more.",
    },
    {
        icon: Lock,
        title: "Private & Protected",
        description: "Strict backend authorization boundaries ensure only authorized friends can view messages and profiles.",
    },
    {
        icon: Globe2,
        title: "Real-Time WebSocket Sync",
        description: "Powered by Socket.IO for instant message delivery and real-time online status tracking.",
    },
]

const Section = ({
    children,
    className = "",
    id,
}: {
    children: ReactNode
    className?: string
    id?: string
}) => (
    <section id={id} className={`px-6 ${className}`}>
        <div className="mx-auto w-full max-w-7xl">{children}</div>
    </section>
)

const Reveal = ({
    children,
    delay = 0,
    className = "",
}: {
    children: ReactNode
    delay?: number
    className?: string
}) => {
    const { ref, inView } = useInView<HTMLDivElement>(0.15)
    return (
        <div
            ref={ref}
            style={{ transitionDelay: inView ? `${delay}ms` : "0ms" }}
            className={`transition-all duration-700 ease-out ${
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            } ${className}`}
        >
            {children}
        </div>
    )
}

export default function HomePage() {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const id = requestAnimationFrame(() => setMounted(true))
        return () => cancelAnimationFrame(id)
    }, [])

    const heroMotion = `transition-all duration-700 ease-out ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
    }`

    return (
        <div className="w-full text-left">
            {/* Hero */}
            <Section className="relative overflow-hidden pb-20 pt-14 md:pt-18">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                >
                    <div className="absolute -top-32 left-1/4 h-[420px] w-[420px] rounded-full bg-indigo-600/15 blur-[120px]" />
                    <div className="absolute top-24 right-0 h-[320px] w-[320px] rounded-full bg-purple-600/10 blur-[100px]" />
                </div>

                <div className="relative grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                    <div className="max-w-xl">
                        <span
                            style={{ transitionDelay: "0ms" }}
                            className={`inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-semibold text-indigo-300 ${heroMotion}`}
                        >
                            <Languages className="h-3.5 w-3.5 text-indigo-400" />
                            Live Real-Time Message Translation
                        </span>

                        <h1
                            style={{ transitionDelay: "80ms" }}
                            className={`mt-5 text-3xl font-bold leading-[1.15] tracking-tight sm:text-4xl md:text-5xl text-white ${heroMotion}`}
                        >
                            Connect Across Cultures.
                            <br />
                            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200 bg-clip-text text-transparent">
                                Chat Without Boundaries.
                            </span>
                        </h1>

                        <p
                            style={{ transitionDelay: "160ms" }}
                            className={`mt-5 max-w-md text-sm leading-relaxed text-gray-300 ${heroMotion}`}
                        >
                            FriendZone is a real-time social platform designed for discovering friends worldwide and communicating effortlessly with instant automatic translation.
                        </p>

                        <div
                            style={{ transitionDelay: "240ms" }}
                            className={`mt-8 flex flex-wrap items-center gap-4 ${heroMotion}`}
                        >
                            <Link
                                to="/signup"
                                className="group inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white hover:bg-indigo-500 transition"
                            >
                                Create Free Account
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                            <Link
                                to="/signin"
                                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-xs font-semibold text-gray-300 hover:bg-white/10 hover:text-white transition"
                            >
                                Sign In
                            </Link>
                        </div>
                    </div>

                    <div
                        style={{ transitionDelay: "160ms" }}
                        className={`relative overflow-hidden flex aspect-[4/3] min-h-[260px] items-center justify-center rounded-3xl border border-white/10 bg-[#11131f] lg:min-h-[340px] ${heroMotion}`}
                    >
                        <img
                            src="/images/translation_glob.jpeg"
                            alt="Real-time message translation connecting people worldwide"
                            className="h-full w-full object-cover"
                        />
                    </div>
                </div>
            </Section>

            {/* Core Workflow */}
            <Section className="py-16 md:py-20 border-t border-white/5">
                <Reveal className="mx-auto max-w-2xl text-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                        How FriendZone Works
                    </span>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                        From Discovery to Meaningful Connections
                    </h2>
                    <p className="mx-auto mt-3 max-w-xl text-xs sm:text-sm leading-relaxed text-gray-400">
                        Connect with real people worldwide using a straightforward, secure social platform.
                    </p>
                </Reveal>

                <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {CORE_FLOW_STEPS.map(({ icon: Icon, step, title, description }, i) => (
                        <Reveal
                            key={title}
                            delay={i * 80}
                            className="rounded-2xl border border-white/10 bg-[#11131f] p-6 transition hover:border-white/20 flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                                        <Icon className="h-5 w-5" />
                                    </span>
                                    <span className="text-xs font-bold text-gray-500">{step}</span>
                                </div>
                                <h3 className="mt-5 text-sm font-bold text-white">{title}</h3>
                                <p className="mt-2 text-xs leading-relaxed text-gray-400">
                                    {description}
                                </p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </Section>

            {/* Key Benefits / Security */}
            <Section className="py-16 md:py-20 border-t border-white/5">
                <Reveal className="mx-auto max-w-2xl text-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                        Built for Authenticity
                    </span>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                        Verified Users & Hardened Security Boundaries
                    </h2>
                </Reveal>

                <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-2 max-w-4xl mx-auto">
                    {KEY_BENEFITS.map(({ icon: Icon, title, description }, i) => (
                        <Reveal
                            key={title}
                            delay={i * 80}
                            className="rounded-2xl border border-white/10 bg-[#11131f] p-6 transition hover:border-white/20"
                        >
                            <div className="flex items-start gap-4">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                                    <Icon className="h-5 w-5" />
                                </span>
                                <div>
                                    <h3 className="text-sm font-bold text-white">{title}</h3>
                                    <p className="mt-1 text-xs leading-relaxed text-gray-400">
                                        {description}
                                    </p>
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </Section>

            {/* CTA */}
            <Section className="py-16 text-center">
                <Reveal className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[#11131f] p-8 sm:p-12">
                    <h2 className="text-2xl font-bold text-white sm:text-3xl">
                        Ready to connect across language barriers?
                    </h2>
                    <p className="mt-3 text-xs sm:text-sm text-gray-400">
                        Join FriendZone today with mandatory email verification.
                    </p>
                    <div className="mt-8 flex justify-center gap-4">
                        <Link
                            to="/signup"
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white hover:bg-indigo-500 transition"
                        >
                            Get Started Free
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </Reveal>
            </Section>
        </div>
    )
}
