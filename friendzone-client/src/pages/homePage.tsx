import { useEffect, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import {
    ArrowRight,
    CheckCircle2,
    Globe2,
    Lock,
    MessageSquareText,
    ShieldCheck,
    Sparkles,
    Star,
    Users,
    Zap,
} from "lucide-react"
import { useInView } from "../layouts/useInView"

const LOGOS = ["Microsoft", "Google", "Airbnb", "Spotify", "Slack", "Netflix"]

const FEATURE_BULLETS = ["Real-time processing", "99.9% accuracy", "Context-aware AI"]

const CORE_FEATURES = [
    {
        icon: Sparkles,
        title: "Real-Time Translation",
        description: "Instant AI translation with nuance, slang, and cultural context built in.",
    },
    {
        icon: Users,
        title: "Global Communities",
        description: "Build public spaces where language is never a barrier to connection.",
    },
    {
        icon: ShieldCheck,
        title: "Enterprise Security",
        description: "End-to-end encryption keeps every private conversation protected.",
    },
    {
        icon: Zap,
        title: "Ultra Low Latency",
        description: "Edge infrastructure delivers near-instant message delivery worldwide.",
    },
    {
        icon: Globe2,
        title: "Cultural Intelligence",
        description: "Understand idioms and intent so your message lands the way you mean it.",
    },
]

const ENTERPRISE_CARDS = [
    {
        icon: ShieldCheck,
        title: "Enterprise Security",
        description:
            "End-to-end encryption for every message. Your private conversations stay private, even through translation.",
    },
    {
        icon: Zap,
        title: "Ultra Low Latency",
        description:
            "Experience near-instant translation speeds. Our edge infrastructure ensures your messages are fast.",
    },
    {
        icon: Globe2,
        title: "Cultural Intelligence",
        description:
            "More than just words. Our AI understands idioms and cultural nuances to ensure your message's intent is clear.",
    },
]

const TESTIMONIALS = [
    {
        quote:
            "FriendZone has fundamentally changed how my distributed team communicates. We no longer struggle with language barriers during sync-ups. The translation is incredibly natural.",
        name: "Sarah Chen",
        role: "Global Product Lead at TechCorp",
    },
    {
        quote:
            "Traveling became 10x easier since I started using FriendZone to connect with locals before arriving. It's not just a chat app, it's a bridge between cultures.",
        name: "Marcus Thorne",
        role: "Independent Travel Blogger",
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

const Home = () => {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const id = requestAnimationFrame(() => setMounted(true))
        return () => cancelAnimationFrame(id)
    }, [])

    const heroMotion =
        `transition-all duration-700 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`

    return (
        <div className="w-full">
            {/* Hero */}
            <Section className="relative overflow-hidden pb-24 pt-16 md:pt-20">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                >
                    <div className="absolute -top-32 left-1/4 h-[420px] w-[420px] rounded-full bg-indigo-600/20 blur-[120px]" />
                    <div className="absolute top-24 right-0 h-[320px] w-[320px] rounded-full bg-purple-600/10 blur-[100px]" />
                </div>

                <div className="relative grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                    <div className="max-w-xl">
                        <span
                            style={{ transitionDelay: "0ms" }}
                            className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[12px] font-medium text-gray-300 backdrop-blur-md ${heroMotion}`}
                        >
                            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                            New: AI-powered translation
                        </span>

                        <h1
                            style={{ transitionDelay: "80ms" }}
                            className={`mt-6 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl ${heroMotion}`}
                        >
                            Connect Beyond
                            <br />
                            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                                Borders.
                            </span>
                        </h1>

                        <p
                            style={{ transitionDelay: "160ms" }}
                            className={`mt-6 max-w-md text-[15px] leading-relaxed text-gray-400 ${heroMotion}`}
                        >
                            FriendZone is the world's most advanced AI-powered messaging
                            platform, offering seamless real-time translation for teams and
                            individuals worldwide.
                        </p>

                        <div
                            style={{ transitionDelay: "240ms" }}
                            className={`mt-8 flex flex-wrap items-center gap-4 ${heroMotion}`}
                        >
                            <Link
                                to="/signup"
                                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 px-6 py-3 text-[14px] font-semibold text-white shadow-[0_0_25px_rgba(99,102,241,0.4)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_35px_rgba(99,102,241,0.6)]"
                            >
                                Get Started Free
                                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                            </Link>
                            <Link
                                to="/signin"
                                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-[14px] font-medium text-gray-300 backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
                            >
                                Sign In to App
                            </Link>
                        </div>

                        <div
                            style={{ transitionDelay: "320ms" }}
                            className={`mt-12 flex gap-10 sm:gap-12 ${heroMotion}`}
                        >
                            <div>
                                <div className="text-2xl font-semibold tabular-nums text-white">50k+</div>
                                <div className="mt-1 text-[12px] uppercase tracking-wide text-gray-500 font-medium">
                                    Active Users
                                </div>
                            </div>
                            <div>
                                <div className="text-2xl font-semibold tabular-nums text-white">100+</div>
                                <div className="mt-1 text-[12px] uppercase tracking-wide text-gray-500 font-medium">
                                    Languages
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        style={{ transitionDelay: "160ms" }}
                        className={`relative overflow-hidden flex aspect-[4/3] min-h-[280px] items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-b from-indigo-950/40 to-transparent lg:min-h-[360px] ${heroMotion}`}
                    >
                        <img
                            src="/images/translation_glob.jpeg"
                            alt="Real-time translation connecting people worldwide"
                            className="h-full w-full object-cover"
                        />
                        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.18),transparent_60%)] animate-[pulse-glow_4s_ease-in-out_infinite]" />
                    </div>
                </div>
            </Section>

            {/* Core features */}
            <Section className="py-16 md:py-20">
                <Reveal className="mx-auto max-w-2xl text-center">
                    <span className="text-[12px] font-medium uppercase tracking-widest text-indigo-400">
                        5 core features
                    </span>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                        Everything you need for global collaboration
                    </h2>
                    <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-gray-400">
                        From instant translation to enterprise-grade security, FriendZone
                        gives distributed teams everything they need to communicate clearly.
                    </p>
                </Reveal>

                <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {CORE_FEATURES.map(({ icon: Icon, title, description }, i) => (
                        <Reveal
                            key={title}
                            delay={i * 80}
                            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/30 hover:bg-white/[0.05]"
                        >
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
                                <Icon className="h-5 w-5 text-indigo-400" />
                            </span>
                            <h3 className="mt-5 text-[15px] font-semibold text-white">{title}</h3>
                            <p className="mt-2 text-[13px] leading-relaxed text-gray-400">
                                {description}
                            </p>
                        </Reveal>
                    ))}
                </div>
            </Section>

            {/* Feature deep-dive 1 */}
            <Section className="py-16 md:py-20">
                <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                    <Reveal>
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
                            <Sparkles className="h-5 w-5 text-indigo-400" />
                        </span>
                        <h3 className="mt-5 text-2xl font-semibold sm:text-3xl">
                            Real-Time Instant Translation
                        </h3>
                        <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-gray-400">
                            Message anyone, in any language, and watch the conversation flow
                            as if you both spoke the same tongue. Our AI handles nuance,
                            slang, and cultural context.
                        </p>
                        <ul className="mt-6 space-y-3">
                            {FEATURE_BULLETS.map((item) => (
                                <li
                                    key={item}
                                    className="flex items-center gap-2 text-[13px] text-gray-300"
                                >
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-400" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <Link
                            to="/features"
                            className="group mt-6 inline-flex items-center gap-1 text-[13px] font-medium text-indigo-400 transition-colors hover:text-indigo-300"
                        >
                            Learn more
                            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                    </Reveal>

                    <Reveal
                        delay={120}
                        className="flex aspect-[4/3] min-h-[240px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm transition-colors duration-300 hover:border-white/20 lg:min-h-[280px]"
                    >
                        <MessageSquareText className="h-16 w-16 text-indigo-400/60" strokeWidth={1.5} />
                    </Reveal>
                </div>
            </Section>

            {/* Feature deep-dive 2 */}
            <Section className="pb-16 md:pb-20">
                <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                    <Reveal
                        delay={120}
                        className="order-2 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm transition-colors duration-300 hover:border-white/20 lg:order-1"
                    >
                        <img
                            src="/images/global_community.jpeg"
                            alt="Global community connected across languages and cultures"
                            className="aspect-[4/3] h-full w-full object-cover"
                        />
                    </Reveal>

                    <Reveal className="order-1 lg:order-2">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
                            <Users className="h-5 w-5 text-indigo-400" />
                        </span>
                        <h3 className="mt-5 text-2xl font-semibold sm:text-3xl">
                            Global Community Building
                        </h3>
                        <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-gray-400">
                            Join or create public spaces where language isn't a barrier to
                            community. Connect with like-minded individuals from Tokyo to
                            Berlin instantly.
                        </p>
                        <ul className="mt-6 space-y-3">
                            {FEATURE_BULLETS.map((item) => (
                                <li
                                    key={item}
                                    className="flex items-center gap-2 text-[13px] text-gray-300"
                                >
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-400" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <Link
                            to="/community"
                            className="group mt-6 inline-flex items-center gap-1 text-[13px] font-medium text-indigo-400 transition-colors hover:text-indigo-300"
                        >
                            Learn more
                            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                    </Reveal>
                </div>
            </Section>

            {/* Logo strip */}
            <section className="relative overflow-hidden border-y border-white/10 py-12 bg-white/[0.01]">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#07080d] to-transparent sm:w-24" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#07080d] to-transparent sm:w-24" />
                <div className="group flex overflow-hidden">
                    <div className="flex w-max animate-[marquee_28s_linear_infinite] items-center gap-16 px-8 group-hover:[animation-play-state:paused]">
                        {[...LOGOS, ...LOGOS].map((logo, i) => (
                            <span
                                key={`${logo}-${i}`}
                                className="whitespace-nowrap text-[14px] font-medium text-gray-500 grayscale transition-all duration-300 hover:text-gray-300"
                            >
                                {logo}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* Enterprise cards */}
            <Section className="py-20 md:py-24">
                <Reveal className="mx-auto max-w-2xl text-center">
                    <span className="text-[12px] font-medium uppercase tracking-widest text-indigo-400">
                        Built for scale
                    </span>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                        Enterprise-ready from day one
                    </h2>
                </Reveal>

                <div className="mt-12 grid gap-6 md:grid-cols-3">
                    {ENTERPRISE_CARDS.map(({ icon: Icon, title, description }, i) => (
                        <Reveal
                            key={title}
                            delay={i * 100}
                            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400/30 hover:bg-white/[0.05]"
                        >
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
                                <Icon className="h-5 w-5 text-indigo-400" />
                            </span>
                            <h4 className="mt-5 text-[15px] font-semibold text-white">{title}</h4>
                            <p className="mt-2 text-[13px] leading-relaxed text-gray-400">
                                {description}
                            </p>
                        </Reveal>
                    ))}
                </div>
            </Section>

            {/* Testimonials */}
            <Section className="py-20 md:py-24">
                <Reveal className="mx-auto max-w-2xl text-center">
                    <span className="text-[12px] font-medium uppercase tracking-widest text-indigo-400">
                        Wall of love
                    </span>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                        Trusted by users worldwide
                    </h2>
                </Reveal>

                <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2">
                    {TESTIMONIALS.map((t, i) => (
                        <Reveal
                            key={t.name}
                            delay={i * 120}
                            className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400/30 hover:bg-white/[0.05]"
                        >
                            <div className="flex gap-0.5 text-indigo-400">
                                {Array.from({ length: 5 }).map((_, star) => (
                                    <Star key={star} className="h-4 w-4 fill-current" />
                                ))}
                            </div>
                            <p className="mt-4 text-[14px] leading-relaxed text-gray-300">
                                "{t.quote}"
                            </p>
                            <div className="mt-6 flex items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[12px] font-medium text-indigo-300">
                                    {t.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                </span>
                                <div>
                                    <div className="text-[13px] font-medium text-white">
                                        {t.name}
                                    </div>
                                    <div className="text-[12px] text-gray-500">{t.role}</div>
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </Section>

            {/* CTA */}
            <Section className="pb-24">
                <Reveal>
                    <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_200%] px-6 py-14 text-center sm:px-10 sm:py-16 shadow-[0_0_50px_rgba(99,102,241,0.25)] animate-[gradient-pan_10s_ease_infinite]">
                        <Lock className="h-6 w-6 text-white/90" />
                        <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                            Ready to break the language barrier?
                        </h2>
                        <p className="max-w-md text-[14px] leading-relaxed text-indigo-100">
                            Join thousands of global citizens and teams who are already
                            communicating seamlessly. Get started today for free.
                        </p>
                        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
                            <Link
                                to="/signup"
                                className="rounded-full bg-[#0d0e14] px-6 py-3 text-[14px] font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-black"
                            >
                                Sign Up Now
                            </Link>
                            <Link
                                to="/signin"
                                className="rounded-full border border-white/40 px-6 py-3 text-[14px] font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-white/10"
                            >
                                Sign In
                            </Link>
                        </div>
                    </div>
                </Reveal>
            </Section>
        </div>
    )
}

export default Home
