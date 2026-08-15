import { Globe, Rocket, Target } from "lucide-react"
import SEO from "../../components/SEO"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#07080d] text-white py-16 px-6">
      <SEO
        title="About Us - Connecting the World Without Language Barriers"
        description="FriendZone was founded to allow people anywhere on Earth to converse seamlessly in real time, regardless of the language they speak."
        canonicalUrl="/about"
      />
      <div className="mx-auto max-w-5xl space-y-16 text-left">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-4 py-1.5 text-xs font-semibold text-indigo-300">
            <Globe className="h-4 w-4" /> Our Mission
          </span>
          <h1 className="text-4xl font-extrabold sm:text-5xl bg-gradient-to-r from-white via-gray-200 to-indigo-300 bg-clip-text text-transparent">
            Connecting the World Without Language Barriers
          </h1>
          <p className="text-base text-gray-400">
            FriendZone was founded with a singular vision: to allow people anywhere on Earth to converse seamlessly in real time, regardless of the language they speak.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 space-y-4 backdrop-blur-md">
            <Target className="h-8 w-8 text-indigo-400" />
            <h3 className="text-xl font-bold text-white">The Problem We Solve</h3>
            <p className="text-xs leading-relaxed text-gray-300">
              Language remains the single biggest barrier to global connection. Traditional translation tools require manual copy-pasting or cause awkward delays in messaging.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 space-y-4 backdrop-blur-md">
            <Rocket className="h-8 w-8 text-purple-400" />
            <h3 className="text-xl font-bold text-white">The FriendZone Solution</h3>
            <p className="text-xs leading-relaxed text-gray-300">
              FriendZone translates messages automatically in sub-100ms. Senders type naturally in their language, and receivers read natively in theirs.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
