import { FileText } from "lucide-react"
import SEO from "../../components/SEO"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#07080d] text-white py-16 px-6">
      <SEO
        title="Terms of Service - User Terms & Conditions"
        description="FriendZone Terms of Service governing platform usage, acceptable conduct, real-time message translation services, and account rules."
        canonicalUrl="/terms"
      />
      <div className="mx-auto max-w-4xl space-y-8 text-left">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-4 py-1 text-xs font-semibold text-indigo-300">
            <FileText className="h-3.5 w-3.5" /> Legal Agreement
          </span>
          <h1 className="text-3xl font-extrabold sm:text-4xl text-white">FriendZone Terms of Service</h1>
          <p className="text-xs text-gray-400">Effective Date: August 13, 2026 • Version 1.0.0 (Production Candidate)</p>
        </div>

        <div className="space-y-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-xs text-gray-300 leading-relaxed backdrop-blur-md">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Acceptance & Eligibility</h2>
            <p>
              By creating an account or using FriendZone (https://sandeepworks.in), you agree to these Terms. You must be at least <strong>18 years of age</strong> (or legal majority in your country) to use FriendZone.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. AI Translation Disclaimer</h2>
            <p>
              FriendZone uses automated neural AI engines (including Azure Cognitive Services). Machine translation may contain errors or inaccuracies. <strong>Do not rely on FriendZone for emergency, legal, medical, or safety-critical communications.</strong>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">3. Subscription Quotas & Server Validation</h2>
            <p>
              Plan limits (Free: 20/day, Plus: 2,000/month, Pro: 10,000/month) are strictly enforced on our backend servers. Users cannot tamper with or bypass translation quotas.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">4. Prohibited Conduct</h2>
            <p>
              You agree not to engage in harassment, hate speech, spamming, financial scams, uploading CSAM/illegal content, reverse engineering, or attempting unauthorized access to our infrastructure.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">5. Moderation & Enforcement</h2>
            <p>
              FriendZone reserves the right to review reported content, issue warnings, or suspend/delete accounts that violate community guidelines.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">6. Contact Information & Governing Law</h2>
            <p>
              FriendZone is operated online at <a href="https://sandeepworks.in" className="text-indigo-400 underline">https://sandeepworks.in</a>. For inquiries regarding these Terms, contact us at <a href="mailto:friendzone_live@proton.me" className="text-indigo-400 underline">friendzone_live@proton.me</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
