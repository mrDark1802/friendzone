import { ShieldCheck, Lock, EyeOff, Server, Key } from "lucide-react"

export default function SecurityPage() {
  const items = [
    {
      icon: Lock,
      title: "Encrypted WebSocket Communications",
      desc: "All real-time chat data, audio, and translation payloads are transmitted exclusively via TLS 1.3 encrypted WebSocket channels.",
    },
    {
      icon: Key,
      title: "JWT & HttpOnly Session Protection",
      desc: "Session security uses cryptographically signed JWT tokens with 30-day HttpOnly cookie verification, preventing XSS token theft.",
    },
    {
      icon: EyeOff,
      title: "Zero Plain-Text Storage",
      desc: "Message contents and translations are protected with row-level security and deleted permanently upon user request.",
    },
    {
      icon: Server,
      title: "Server-Side Quota & Rate Limiting",
      desc: "Strict server-side validation prevents API key abuse, rate-limit bypassing, and Denial of Service (DoS) attacks.",
    },
  ]

  return (
    <div className="min-h-screen bg-[#07080d] text-white py-16 px-6">
      <div className="mx-auto max-w-5xl space-y-16 text-left">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 text-xs font-semibold text-emerald-300">
            <ShieldCheck className="h-4 w-4" /> Enterprise Grade Security
          </span>
          <h1 className="text-4xl font-extrabold sm:text-5xl bg-gradient-to-r from-white via-gray-200 to-emerald-300 bg-clip-text text-transparent">
            Your Privacy & Security Are Hardcoded Into FriendZone
          </h1>
          <p className="text-base text-gray-400">
            We employ modern cryptographic protocols, strict token management, and secure multi-tier translation isolation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {items.map((item, i) => {
            const Icon = item.icon
            return (
              <div key={i} className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 space-y-4 backdrop-blur-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white">{item.title}</h3>
                <p className="text-xs leading-relaxed text-gray-400">{item.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
