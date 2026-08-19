import { Link } from "react-router-dom"
import {
  Users,
  Globe2,
  HeartHandshake,
  Repeat2,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
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

// ─── Use-case data ────────────────────────────────────────────────────────────
const USE_CASES = [
  {
    icon: Users,
    eyebrow: "Meet people",
    title: "Find friends from anywhere",
    description:
      "Browse profiles from Japan, Brazil, Germany, India, and everywhere in between. Filter by language, country, or shared interests. Send a connection request and start talking.",
    points: [
      "Global people discovery with country & language filters",
      "Verified profiles — no bots, no spam",
      "Send and manage friend requests from your dashboard",
    ],
    chatPreview: {
      sender: "Yuki",
      flag: "🇯🇵",
      location: "Osaka, Japan",
      incoming: "はじめまして！私はOsakaに住んでいます。",
      incomingTranslated: "Nice to meet you! I live in Osaka.",
      incomingLabel: "Translated from Japanese",
      outgoing: "Nice to meet you too! I've always wanted to visit Osaka.",
    },
  },
  {
    icon: Repeat2,
    eyebrow: "Language exchange",
    title: "Practice together, naturally",
    description:
      "Chat with native speakers in their language while they chat with you in yours. Both sides see translations, so you learn by doing — not by drilling vocabulary.",
    points: [
      "See every message in your language automatically",
      "View the original alongside the translation",
      "Switch your native language anytime — history updates too",
    ],
    chatPreview: {
      sender: "Sofía",
      flag: "🇪🇸",
      location: "Barcelona, Spain",
      incoming: "¡Hola! ¿Estás aprendiendo español?",
      incomingTranslated: "Hi! Are you learning Spanish?",
      incomingLabel: "Translated from Spanish",
      outgoing: "Yes! And you're learning English — perfect match!",
    },
  },
  {
    icon: Globe2,
    eyebrow: "Cultural connection",
    title: "Discover the world through conversation",
    description:
      "Talk to someone in Seoul about K-pop, a friend in Paris about food, or a family in Lagos about traditions. Real conversation beats any travel guide.",
    points: [
      "Meet people with interests matching yours",
      "No language barrier between you and a new perspective",
      "Group channels for shared hobbies and topics",
    ],
    chatPreview: {
      sender: "Amara",
      flag: "🇳🇬",
      location: "Lagos, Nigeria",
      incoming: "Have you ever tried Nigerian jollof rice?",
      incomingTranslated: "Have you ever tried Nigerian jollof rice?",
      incomingLabel: "English",
      outgoing: "Not yet! But I'd love to hear your recipe 😄",
    },
  },
  {
    icon: HeartHandshake,
    eyebrow: "International friendships",
    title: "Build real, lasting connections",
    description:
      "FriendZone is about people. A pen-pal who becomes a close friend. A conversation that turns into collaboration. Real translation, real time, real friendship.",
    points: [
      "Voice and video calls built right into the app",
      "Message delivery across time zones",
      "Your conversation history is always there",
    ],
    chatPreview: {
      sender: "Lena",
      flag: "🇩🇪",
      location: "Berlin, Germany",
      incoming: "Wir kennen uns jetzt seit einem Jahr!",
      incomingTranslated: "We've known each other for a year now!",
      incomingLabel: "Translated from German",
      outgoing: "A whole year! Still feels like we just met.",
    },
  },
]

// ─── Mini chat card ───────────────────────────────────────────────────────────
function ChatCard({
  sender,
  flag,
  location,
  incoming,
  incomingTranslated,
  incomingLabel,
  outgoing,
}: {
  sender: string
  flag: string
  location: string
  incoming: string
  incomingTranslated: string
  incomingLabel: string
  outgoing: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] shadow-xs overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 dark:border-slate-800 px-4 py-2.5 bg-slate-50/80 dark:bg-slate-900/50 flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs border border-blue-200 dark:border-blue-900">
          {sender[0]}
        </div>
        <div>
          <p className="text-[11px] font-bold text-slate-900 dark:text-white">
            {sender} <span>{flag}</span>
          </p>
          <p className="text-[10px] text-slate-500">{location}</p>
        </div>
      </div>
      {/* Messages */}
      <div className="px-3 py-3 space-y-3 bg-slate-50/30 dark:bg-[#07090e]/30">
        {/* Incoming with translation */}
        <div className="flex flex-col items-start max-w-[88%]">
          <div className="rounded-2xl rounded-tl-sm border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#121624] px-3 py-2 shadow-xs">
            <p className="text-[11px] font-medium text-slate-900 dark:text-slate-100">{incomingTranslated}</p>
            {incomingLabel !== "English" && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[9px] font-medium text-slate-400 block">{incomingLabel}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{incoming}</span>
              </div>
            )}
          </div>
        </div>
        {/* Outgoing */}
        <div className="flex flex-col items-end max-w-[88%] ml-auto">
          <div className="rounded-2xl rounded-tr-sm bg-blue-600 text-white px-3 py-2 shadow-xs">
            <p className="text-[11px] font-medium">{outgoing}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SolutionsPage() {
  return (
    <div className="w-full bg-slate-50 dark:bg-[#07090e] text-slate-900 dark:text-slate-100 min-h-screen">
      <SEO
        title="Solutions — How FriendZone Brings People Together"
        description="FriendZone helps you meet people, practice languages, discover cultures, and build international friendships — all with real-time translation."
        canonicalUrl="/solutions"
      />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Who FriendZone is for
            </span>
            <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Every reason to connect globally.
            </h1>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
              Whether you're looking for new friends, language exchange partners, or meaningful cross-cultural connections — FriendZone gets out of the way and lets you talk.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Use-cases ────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 pb-16">
        <div className="mx-auto max-w-6xl space-y-10">
          {USE_CASES.map(({ icon: Icon, eyebrow, title, description, points, chatPreview }, idx) => {
            const isEven = idx % 2 === 0
            return (
              <Reveal
                key={title}
                delay={idx * 40}
                className={`grid grid-cols-1 gap-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-6 sm:p-8 shadow-xs lg:grid-cols-2 lg:items-center ${
                  !isEven ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                {/* Copy */}
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
                    <Icon className="h-3.5 w-3.5" />
                    {eyebrow}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
                  <ul className="space-y-2.5 pt-1">
                    {points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Chat preview */}
                <ChatCard {...chatPreview} />
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-14">
        <Reveal className="mx-auto max-w-2xl rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-8 text-center shadow-xs">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mx-auto">
            <MessageSquare className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Start your first conversation today
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Free to join. No credit card needed.
          </p>
          <div className="mt-6">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-xs font-semibold text-white transition shadow-xs"
            >
              Join FriendZone <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
