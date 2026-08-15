import { Shield } from "lucide-react"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#07080d] text-white py-16 px-6">
      <div className="mx-auto max-w-4xl space-y-8 text-left">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-4 py-1 text-xs font-semibold text-indigo-300">
            <Shield className="h-3.5 w-3.5" /> Legal & Privacy Disclosure
          </span>
          <h1 className="text-3xl font-extrabold sm:text-4xl text-white">FriendZone Privacy Policy</h1>
          <p className="text-xs text-gray-400">Effective Date: August 13, 2026 • Version 1.0.0 (Production Candidate)</p>
        </div>

        <div className="space-y-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-xs text-gray-300 leading-relaxed backdrop-blur-md">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Important Legal Disclaimer & Identity</h2>
            <p>
              This Privacy Policy describes the actual technical practices, data flows, and security procedures for <strong>FriendZone</strong> (accessible via <a href="https://sandeepworks.in" className="text-indigo-400 underline">https://sandeepworks.in</a>). It is designed in alignment with international privacy principles including EU GDPR, UK GDPR, CCPA/CPRA, and the Indian Digital Personal Data Protection Act, 2023.
            </p>
            <p className="text-gray-400 italic">
              Platform Operator: Independent Digital Software Project • Website: <a href="https://sandeepworks.in" className="text-indigo-400 underline">https://sandeepworks.in</a> • Contact Email: friendzone_live@proton.me
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account Data:</strong> Email address, username, display name, native language choice, and password credentials (stored strictly as Argon2id/bcrypt hashes).</li>
              <li><strong>Messaging Data:</strong> Original text messages, sender ID, timestamp, and target language translated text outputs.</li>
              <li><strong>Technical Data:</strong> IP address, browser user-agent, session identifiers, and 30-day HttpOnly cookie authentication hashes.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">3. Message Processing & AI Translation Notice</h2>
            <p>
              To provide real-time translation, original message contents are sent over TLS 1.3 encrypted connections to our backend and processed via <strong>Microsoft Azure Cognitive Services Translator API</strong> and MyMemory Translation API.
            </p>
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
              <strong>Encryption Status Notice:</strong> FriendZone encrypts all data in transit using TLS 1.3 / HTTPS. <strong>FriendZone does not implement End-to-End Encryption (E2EE)</strong>, as server-side processing is required to perform real-time AI translation and database persistence.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">4. Cookies and Local Storage</h2>
            <p>
              We use essential HttpOnly cookies (<code>refreshToken</code>) for 30-day session auto-login and localStorage (<code>fz_access_token</code>, <code>fz_pinned_chats</code>). We do <strong>not</strong> use third-party advertising or tracking cookies.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">5. Third-Party Service Providers</h2>
            <p>
              We share minimal data with infrastructure providers: Microsoft Azure (Translation API), Supabase/PostgreSQL (Database hosting), and Upstash (Redis translation cache).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">6. Data Rights & Deletion</h2>
            <p>
              You have the right to access, correct, export, or delete your account. Account deletion requests can be initiated by contacting <a href="mailto:friendzone_live@proton.me" className="text-indigo-400 underline">friendzone_live@proton.me</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
