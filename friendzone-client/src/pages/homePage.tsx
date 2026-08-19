import { useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import SEO from "../components/SEO"
import { useAuth } from "../context/AuthContext"
import {
    ArrowRight,
    Globe2,
    Lock,
    MessageSquare,
    ShieldCheck,
    Users,
    Languages,
    HelpCircle,
    ChevronDown,
    Send,
    Video,
    CheckCheck,
} from "lucide-react"
import { useInView } from "../layouts/useInView"

const CORE_FLOW_STEPS = [
    {
        icon: Users,
        step: "01",
        title: "Discover People",
        description: "Browse members from different countries, learn about their spoken languages, and send connection requests.",
    },
    {
        icon: ShieldCheck,
        step: "02",
        title: "Verified Community",
        description: "Every member is verified via email before activation to ensure authentic, bot-free conversations.",
    },
    {
        icon: MessageSquare,
        step: "03",
        title: "Direct & Group Chat",
        description: "Message friends directly or start group channels for shared hobbies, travel planning, or language practice.",
    },
    {
        icon: Languages,
        step: "04",
        title: "Live Translation",
        description: "Type naturally in your native language. FriendZone delivers translated messages to your friends in their language.",
    },
]

const KEY_BENEFITS = [
    {
        icon: Languages,
        title: "Automatic Message Translation",
        description: "Receive messages in Korean, Japanese, Spanish, or French automatically translated into your native language.",
    },
    {
        icon: Video,
        title: "Voice & Video Calling",
        description: "Enjoy clear 1-on-1 audio and video calls with peer-to-peer WebRTC connectivity directly in your browser.",
    },
    {
        icon: ShieldCheck,
        title: "Verified Email Accounts",
        description: "Email verification on signup keeps conversations authentic and eliminates spam accounts.",
    },
    {
        icon: Lock,
        title: "Private & Secure Messaging",
        description: "Protected backend authentication and in-memory JWT tokens ensure only your connected friends can reach you.",
    },
]

const FAQ_ITEMS = [
    {
        question: "What is FriendZone?",
        answer: "FriendZone is a global social platform designed to help you meet people worldwide and talk freely without language barriers. It features real-time messaging, automatic translation, voice and video calling, and verified profiles.",
    },
    {
        question: "How does message translation work?",
        answer: "When your friend sends a message in their native tongue (e.g. Japanese or Spanish), FriendZone translates the text and shows both the translated sentence and the original text in your chat thread.",
    },
    {
        question: "Is FriendZone free to use?",
        answer: "Yes! FriendZone offers a free plan with standard messaging, friend discovery, email verification, and monthly translation quota. An upgrade is available for high-volume translation needs.",
    },
    {
        question: "How does FriendZone protect my privacy?",
        answer: "Every account is verified by email. Messages and calls are transmitted over secure TLS and WebRTC channels, and only confirmed friends can send you direct messages.",
    },
]

const DEMO_PREVIEWS = [
    {
        lang: "Japanese",
        flag: "🇯🇵",
        senderName: "Kenji Sato",
        senderLocation: "Tokyo, Japan",
        originalText: "こんにちは！今週末、東京は天気がとてもいいですよ。そちらはどうですか？",
        translatedText: "Hello! The weather is great in Tokyo this weekend. How is it over there?",
        replyText: "That sounds wonderful! It's sunny here in Seattle too. Let's practice Japanese tomorrow!",
    },
    {
        lang: "Korean",
        flag: "🇰🇷",
        senderName: "Min-ji Park",
        senderLocation: "Seoul, South Korea",
        originalText: "오늘 하루 어땠어요? 주말에 한국어 공부 같이 할래요?",
        translatedText: "How was your day? Would you like to study Korean together this weekend?",
        replyText: "Sounds great! I just finished reviewing the vocabulary list you sent.",
    },
    {
        lang: "Spanish",
        flag: "🇪🇸",
        senderName: "Mateo Rodriguez",
        senderLocation: "Madrid, Spain",
        originalText: "¡Hola! ¿Has probado la comida española alguna vez? Te recomiendo las tapas.",
        translatedText: "Hello! Have you ever tried Spanish food? I recommend tapas.",
        replyText: "I love tapas! Especially patatas bravas and tortilla de patatas.",
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
    <section id={id} className={`px-4 sm:px-6 ${className}`}>
        <div className="mx-auto w-full max-w-6xl">{children}</div>
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
            className={`transition-all duration-500 ease-out ${
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            } ${className}`}
        >
            {children}
        </div>
    )
}

export default function HomePage() {
    const { isAuthenticated } = useAuth()
    const [openFaq, setOpenFaq] = useState<number | null>(0)
    const [selectedDemoIndex, setSelectedDemoIndex] = useState(0)

    const currentDemo = DEMO_PREVIEWS[selectedDemoIndex]

    const faqJsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": FAQ_ITEMS.map((item) => ({
            "@type": "Question",
            "name": item.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": item.answer,
            },
        })),
    }

    return (
        <div className="w-full text-left bg-slate-50 dark:bg-[#07090e] text-slate-900 dark:text-slate-100 min-h-screen">
            <SEO
                title="Make friends. No language barriers."
                description="FriendZone connects people worldwide with real-time messaging, quiet translation, voice & video calling, and verified profiles."
                canonicalUrl="/"
                jsonLd={faqJsonLd}
            />

            {/* Hero Section */}
            <Section className="py-12 sm:py-16 lg:py-20">
                <div className="grid items-center gap-10 lg:grid-cols-12">
                    {/* Left Copy */}
                    <div className="lg:col-span-6 space-y-6">
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 px-3.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
                            <Languages className="h-3.5 w-3.5" />
                            Live Cross-Language Messaging
                        </div>

                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
                            Make friends. <br />
                            <span className="text-blue-600 dark:text-blue-400">No language barriers.</span>
                        </h1>

                        <p className="max-w-lg text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
                            Chat naturally in your native language with friends worldwide. FriendZone quietly translates conversations in real time so you can focus on building genuine connections.
                        </p>

                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            {isAuthenticated ? (
                                <Link
                                    to="/dashboard"
                                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-3 text-xs font-semibold text-white transition shadow-xs"
                                >
                                    Open Dashboard
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        to="/signup"
                                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-3 text-xs font-semibold text-white transition shadow-xs"
                                    >
                                        Get Started Free
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                    <Link
                                        to="/signin"
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                                    >
                                        Sign In
                                    </Link>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-6 pt-4 text-xs text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1.5 font-medium">
                                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Verified Accounts
                            </span>
                            <span className="flex items-center gap-1.5 font-medium">
                                <Globe2 className="h-4 w-4 text-blue-600 dark:text-blue-400" /> 10+ Languages
                            </span>
                        </div>
                    </div>

                    {/* Right Interactive Chat Preview */}
                    <div className="lg:col-span-6">
                        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] shadow-lg overflow-hidden">
                            {/* Demo Header */}
                            <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-sm border border-blue-200 dark:border-blue-900">
                                        {currentDemo.senderName.slice(0, 1)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                                                {currentDemo.senderName}
                                            </h3>
                                            <span className="text-xs">{currentDemo.flag}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500">{currentDemo.senderLocation}</p>
                                    </div>
                                </div>

                                {/* Language Selector Tabs */}
                                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
                                    {DEMO_PREVIEWS.map((demo, idx) => (
                                        <button
                                            key={demo.lang}
                                            type="button"
                                            onClick={() => setSelectedDemoIndex(idx)}
                                            className={`px-2 py-1 text-[11px] font-semibold rounded-md transition ${
                                                selectedDemoIndex === idx
                                                    ? "bg-blue-600 text-white"
                                                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                                            }`}
                                        >
                                            {demo.flag} {demo.lang}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Chat Thread */}
                            <div className="p-4 sm:p-5 space-y-4 bg-slate-50/40 dark:bg-[#07090e]/40 min-h-[220px]">
                                {/* Incoming message with translation */}
                                <div className="flex flex-col items-start max-w-[88%] space-y-1">
                                    <div className="rounded-2xl rounded-tl-sm border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#121624] p-3.5 shadow-xs">
                                        {/* Translated primary display */}
                                        <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                            {currentDemo.translatedText}
                                        </p>

                                        {/* Original quiet display */}
                                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 block mb-0.5">
                                                Original ({currentDemo.lang}):
                                            </span>
                                            {currentDemo.originalText}
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400 px-1">10:42 AM</span>
                                </div>

                                {/* Outgoing reply */}
                                <div className="flex flex-col items-end max-w-[88%] ml-auto space-y-1">
                                    <div className="rounded-2xl rounded-tr-sm bg-blue-600 text-white p-3.5 shadow-xs">
                                        <p className="text-xs font-medium">
                                            {currentDemo.replyText}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 px-1">
                                        <span>10:43 AM</span>
                                        <CheckCheck className="h-3 w-3 text-blue-600" />
                                    </div>
                                </div>
                            </div>

                            {/* Demo Composer */}
                            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0e121d] flex items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value="Type in your language..."
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-400 outline-none cursor-default"
                                />
                                <button
                                    type="button"
                                    aria-label="Send message demo"
                                    className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0"
                                >
                                    <Send className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* Core Workflow Steps */}
            <Section className="py-14 border-t border-slate-200/80 dark:border-slate-800/80">
                <Reveal className="text-center max-w-2xl mx-auto">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        How FriendZone Works
                    </span>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                        A Simple, Friendly Way to Connect Globally
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Meet people who share your interests, practice languages, and chat without boundaries.
                    </p>
                </Reveal>

                <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {CORE_FLOW_STEPS.map(({ icon: Icon, step, title, description }, i) => (
                        <Reveal
                            key={title}
                            delay={i * 60}
                            className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-5 shadow-xs flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    <span className="text-xs font-bold text-slate-400">{step}</span>
                                </div>
                                <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
                                <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                    {description}
                                </p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </Section>

            {/* Features & Security */}
            <Section className="py-14 border-t border-slate-200/80 dark:border-slate-800/80">
                <Reveal className="text-center max-w-2xl mx-auto">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        Core Capabilities
                    </span>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                        Engineered for Real Social Interactions
                    </h2>
                </Reveal>

                <div className="mt-10 grid gap-5 sm:grid-cols-2 max-w-4xl mx-auto">
                    {KEY_BENEFITS.map(({ icon: Icon, title, description }, i) => (
                        <Reveal
                            key={title}
                            delay={i * 60}
                            className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-5 shadow-xs"
                        >
                            <div className="flex items-start gap-3.5">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                                    <Icon className="h-4 w-4" />
                                </span>
                                <div>
                                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">{title}</h3>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                        {description}
                                    </p>
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </Section>

            {/* FAQ Section */}
            <Section className="py-14 border-t border-slate-200/80 dark:border-slate-800/80">
                <Reveal className="text-center max-w-2xl mx-auto">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 inline-flex items-center gap-1.5">
                        <HelpCircle className="h-3.5 w-3.5" /> Frequently Asked Questions
                    </span>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                        Common Questions
                    </h2>
                </Reveal>

                <div className="mt-8 max-w-2xl mx-auto space-y-3">
                    {FAQ_ITEMS.map((faq, idx) => {
                        const isOpen = openFaq === idx
                        return (
                            <Reveal key={idx} delay={idx * 40}>
                                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] overflow-hidden shadow-xs">
                                    <button
                                        type="button"
                                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                                        className="flex w-full items-center justify-between p-4 text-left font-semibold text-slate-900 dark:text-white focus:outline-none"
                                    >
                                        <span className="text-xs sm:text-sm">{faq.question}</span>
                                        <ChevronDown
                                            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                                                isOpen ? "rotate-180 text-blue-600" : ""
                                            }`}
                                        />
                                    </button>
                                    {isOpen && (
                                        <div className="px-4 pb-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-3">
                                            {faq.answer}
                                        </div>
                                    )}
                                </div>
                            </Reveal>
                        )
                    })}
                </div>
            </Section>

            {/* Bottom CTA */}
            <Section className="py-14 text-center">
                <Reveal className="max-w-2xl mx-auto rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-8 shadow-xs">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Ready to meet friends without language barriers?
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Create your verified account in minutes and start chatting today.
                    </p>
                    <div className="mt-6 flex justify-center">
                        <Link
                            to="/signup"
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-xs font-semibold text-white transition shadow-xs"
                        >
                            Create Free Account
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </Reveal>
            </Section>
        </div>
    )
}
