import { Link } from "react-router-dom"
import {
  Globe,
  Shield,
  RefreshCw,
  MessageSquare,
  Video,
  Languages,
  CheckCheck,
  ArrowRight,
  Send,
} from "lucide-react"
import SEO from "../../components/SEO"
import { useInView } from "../../layouts/useInView"
import type { ReactNode } from "react"

// ─── Reveal helper ────────────────────────────────────────────────────────────
const Reveal = ({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode
  delay?: number
  className?: string
}) => {
  const { ref, inView } = useInView<HTMLDivElement>(0.12)
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

// ─── Data ─────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Languages,
    title: "Real-Time Message Translation",
    description:
      "Type in your language, read in yours. FriendZone quietly delivers every message in the reader's native tongue without interrupting the flow of conversation.",
  },
  {
    icon: RefreshCw,
    title: "Language Switching, Anytime",
    description:
      "Change your native language at any time. Your entire chat history — past and present — is re-rendered in the new language automatically.",
  },
  {
    icon: Globe,
    title: "25+ Supported Languages",
    description:
      "Japanese, Korean, Spanish, French, German, Hindi, Arabic and more — powered by Azure Neural and MyMemory translation engines for natural, contextual results.",
  },
  {
    icon: MessageSquare,
    title: "Direct & Group Messaging",
    description:
      "Send messages one-on-one or in group channels. Every conversation is synchronized in real time across all participants, regardless of their language.",
  },
  {
    icon: Video,
    title: "Voice & Video Calling",
    description:
      "Clear audio and video calls directly in your browser using peer-to-peer WebRTC. No plugins, no apps — just click to call.",
  },
  {
    icon: Shield,
    title: "Verified Accounts Only",
    description:
      "Every FriendZone account is activated via email verification. This keeps the community genuine, safe, and free from bots.",
  },
]

// ─── Simulated translated conversation ────────────────────────────────────────
const DEMO_MESSAGES = [
  {
    side: "incoming",
    sender: "Min-ji",
    flag: "🇰🇷",
    original: "오늘 하루 어땠어요?",
    label: "Translated from Korean",
    translated: "How was your day today?",
    time: "2:41 PM",
  },
  {
    side: "outgoing",
    text: "Really good! I just got back from the market.",
    time: "2:42 PM",
    delivered: true,
  },
  {
    side: "incoming",
    sender: "Min-ji",
    flag: "🇰🇷",
    original: "좋겠다! 저도 나중에 나가려고요.",
    label: "Translated from Korean",
    translated: "Nice! I'm planning to go out later too.",
    time: "2:43 PM",
  },
]

export default function FeaturesPage() {
  return (
    <div className="w-full bg-slate-50 dark:bg-[#07090e] text-slate-900 dark:text-slate-100 min-h-screen">
      <SEO
        title="Features — Real-Time Translation & Global Messaging"
        description="Explore FriendZone features: real-time message translation in 25+ languages, language switching, group chat, voice & video calls, and verified accounts."
        canonicalUrl="/features"
      />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Copy */}
            <div className="space-y-5">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                How It Works
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                Talk freely. <br />
                <span className="text-blue-600 dark:text-blue-400">Every language understood.</span>
              </h1>
              <p className="text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300 max-w-lg">
                FriendZone handles translation quietly in the background so conversations feel natural — not mechanical. You focus on the person, not the language.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-3 text-xs font-semibold text-white transition shadow-xs"
                >
                  Start for free <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
                >
                  See plans
                </Link>
              </div>
            </div>

            {/* Live translation demo card */}
            <div>
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] shadow-lg overflow-hidden">
                {/* Header */}
                <div className="border-b border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50/80 dark:bg-slate-900/50 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-sm border border-blue-200 dark:border-blue-900">
                    M
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      Min-ji Park <span>🇰🇷</span>
                    </p>
                    <p className="text-[11px] text-slate-500">Seoul, South Korea · online</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="px-4 py-5 space-y-4 bg-slate-50/40 dark:bg-[#07090e]/40">
                  {DEMO_MESSAGES.map((msg, i) => {
                    if (msg.side === "incoming") {
                      return (
                        <div key={i} className="flex flex-col items-start max-w-[85%] space-y-1">
                          <div className="rounded-2xl rounded-tl-sm border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#121624] p-3.5 shadow-xs">
                            <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                              {msg.translated}
                            </p>
                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-0.5">
                              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 block">
                                {msg.label}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                                {msg.original}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 px-1">{msg.time}</span>
                        </div>
                      )
                    }
                    return (
                      <div key={i} className="flex flex-col items-end max-w-[85%] ml-auto space-y-1">
                        <div className="rounded-2xl rounded-tr-sm bg-blue-600 text-white p-3.5 shadow-xs">
                          <p className="text-xs font-medium">{msg.text}</p>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 px-1">
                          <span>{msg.time}</span>
                          <CheckCheck className="h-3 w-3 text-blue-600" />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Composer */}
                <div className="px-3 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0e121d] flex items-center gap-2">
                  <input
                    readOnly
                    value="Type in your language…"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-400 outline-none cursor-default"
                  />
                  <button
                    type="button"
                    aria-label="Send"
                    className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature grid ─────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-14 border-t border-slate-200/80 dark:border-slate-800">
        <div className="mx-auto max-w-6xl">
          <Reveal className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Everything you need
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Built for genuine global connections
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Every feature is designed around people, not technology dashboards.
            </p>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }, i) => (
              <Reveal
                key={title}
                delay={i * 50}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-5 shadow-xs"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-14">
        <Reveal className="mx-auto max-w-2xl rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-8 text-center shadow-xs">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Ready to meet someone new?
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Create your free account and start chatting across languages today.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-xs font-semibold text-white transition shadow-xs"
            >
              Get started free <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
