import { Link } from "react-router-dom"
import { Sparkles, Globe, Shield, Zap, RefreshCw, Cpu, MessageSquare, ArrowRight } from "lucide-react"
import SEO from "../../components/SEO"

export default function FeaturesPage() {
  const features = [
    {
      icon: Globe,
      title: "25+ Neural Languages",
      desc: "Instant real-time translation powered by Azure Cognitive Services & Deep Learning engines with high contextual accuracy.",
    },
    {
      icon: Zap,
      title: "Sub-100ms Hybrid Caching",
      desc: "3-tier hybrid caching (Redis, PostgreSQL, In-Memory) delivers translated text instantly without delay.",
    },
    {
      icon: RefreshCw,
      title: "Dynamic Language Shifting",
      desc: "Switch your native language at any time. Past chat histories auto-translate to your newly selected language on the fly.",
    },
    {
      icon: Shield,
      title: "Secure Transport & Session Protection",
      desc: "TLS 1.3 encrypted communication with 30-day HttpOnly session security.",
    },
    {
      icon: Cpu,
      title: "Smart Fallback Engine",
      desc: "High-availability multi-provider architecture ensures smooth translation even during upstream provider rate limits.",
    },
    {
      icon: MessageSquare,
      title: "Real-Time Chat Synchronization",
      desc: "Instant WebSocket message delivery with idempotency guarantees to prevent duplicated or lost messages.",
    },
  ]

  return (
    <div className="min-h-screen bg-[#07080d] text-white py-16 px-6">
      <SEO
        title="Features - Real-Time AI Translation & Instant Chat"
        description="Explore FriendZone features: 25+ neural languages, sub-100ms hybrid caching, dynamic language shifting, and secure real-time WebSocket sync."
        canonicalUrl="/features"
      />
      <div className="mx-auto max-w-6xl space-y-16 text-left">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-4 py-1.5 text-xs font-semibold text-indigo-300">
            <Sparkles className="h-4 w-4" /> Real-Time AI Translation Features
          </span>
          <h1 className="text-4xl font-extrabold sm:text-5xl bg-gradient-to-r from-white via-gray-200 to-indigo-300 bg-clip-text text-transparent">
            Built for Global Teams & Borderless Communication
          </h1>
          <p className="text-base text-gray-400">
            FriendZone combines high-speed neural AI translation, real-time WebSocket communication, and smart multi-language caching.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <div
                key={i}
                className="group rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-md transition-all duration-300 hover:border-indigo-500/50 hover:bg-white/[0.05] hover:-translate-y-1 shadow-xl"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-gray-400">{f.desc}</p>
              </div>
            )
          })}
        </div>

        {/* CTA Section */}
        <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/40 to-indigo-900/30 p-10 text-center space-y-6 shadow-2xl backdrop-blur-xl">
          <h2 className="text-3xl font-extrabold text-white">Experience Borderless Chat Today</h2>
          <p className="text-sm text-gray-300 max-w-xl mx-auto">
            Connect with friends, colleagues, and communities around the world without language barriers.
          </p>
          <div className="flex items-center justify-center gap-4 pt-2">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:scale-105 transition"
            >
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
