import { Cookie } from "lucide-react"

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-[#07080d] text-white py-16 px-6">
      <div className="mx-auto max-w-4xl space-y-8 text-left">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-4 py-1 text-xs font-semibold text-indigo-300">
            <Cookie className="h-3.5 w-3.5" /> Cookie Policy
          </span>
          <h1 className="text-3xl font-extrabold sm:text-4xl text-white">Cookie Policy</h1>
          <p className="text-xs text-gray-400">Last updated: August 13, 2026</p>
        </div>

        <div className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-xs text-gray-300 leading-relaxed backdrop-blur-md">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Strictly Necessary Cookies</h2>
            <p>
              FriendZone uses essential HttpOnly cookies (`refreshToken`) strictly to maintain your session authentication securely for up to 30 days.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. No Third-Party Tracking Cookies</h2>
            <p>
              We do not embed third-party advertising cookies or cross-site tracking scripts.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
