import { Link } from "react-router-dom"
import { Users, Briefcase, Globe2, HeartHandshake, CheckCircle2, ArrowRight } from "lucide-react"

export default function SolutionsPage() {
  const solutions = [
    {
      icon: Briefcase,
      title: "Remote Work & Remote Teams",
      subtitle: "Seamless collaboration across international offices",
      description: "Enable engineers in Tokyo, designers in Paris, and product managers in San Francisco to chat in real-time in their native languages.",
      points: [
        "Instant multi-language group chat channels",
        "Preserved technical jargon & precise translation",
        "Cross-border team onboarding & messaging",
      ],
    },
    {
      icon: Globe2,
      title: "Global Customer Support",
      subtitle: "Serve customers worldwide without hiring bilingual agents",
      description: "Allow support teams to answer customer queries in 100+ languages instantly without delay or awkward machine translation errors.",
      points: [
        "Instant query translation in sub-100ms",
        "Native response auto-conversion for customers",
        "Higher CSAT and reduced support cost",
      ],
    },
    {
      icon: HeartHandshake,
      title: "International Communities & Socials",
      subtitle: "Unite gaming, hobby, and education groups globally",
      description: "Connect diverse communities around shared passions. Members converse in Spanish, Japanese, Hindi, German, and English in a single room.",
      points: [
        "Dynamic native language switcher on demand",
        "Automatic member language preferences",
        "Zero setup required for community members",
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-[#07080d] text-white py-16 px-6">
      <div className="mx-auto max-w-6xl space-y-16 text-left">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 border border-purple-500/30 px-4 py-1.5 text-xs font-semibold text-purple-300">
            <Users className="h-4 w-4" /> Tailored Solutions
          </span>
          <h1 className="text-4xl font-extrabold sm:text-5xl bg-gradient-to-r from-white via-gray-200 to-purple-300 bg-clip-text text-transparent">
            Solutions for Every Global Interaction
          </h1>
          <p className="text-base text-gray-400">
            Whether leading an international team, growing a global community, or scaling customer success, FriendZone breaks language barriers.
          </p>
        </div>

        {/* Solutions Cards */}
        <div className="space-y-8">
          {solutions.map((s, idx) => {
            const Icon = s.icon
            return (
              <div
                key={idx}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl border border-white/10 bg-white/[0.03] p-8 sm:p-10 backdrop-blur-md hover:border-purple-500/50 transition shadow-xl"
              >
                <div className="lg:col-span-8 space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-xl bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-400 border border-purple-500/20">
                    <Icon className="h-4 w-4" /> {s.subtitle}
                  </div>
                  <h2 className="text-2xl font-bold text-white sm:text-3xl">{s.title}</h2>
                  <p className="text-sm leading-relaxed text-gray-300">{s.description}</p>
                  <ul className="space-y-2 pt-2 text-xs text-gray-400">
                    {s.points.map((pt, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="lg:col-span-4 flex justify-center">
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3.5 text-xs font-bold text-white shadow-lg hover:scale-105 transition"
                  >
                    Deploy Solution <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
