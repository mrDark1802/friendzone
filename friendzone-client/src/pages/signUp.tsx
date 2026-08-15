import { useState, useEffect, useMemo, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import SEO from "../components/SEO"
import { authApi } from "../services/api"
import { LANGUAGES } from "../constants/languages"
import { COUNTRIES } from "../constants/countries"
import {
  Globe,
  Sparkles,
  ArrowRight,
  Mail,
  User,
  AtSign,
  Lock,
  Calendar,
  RefreshCw,
  Search,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
} from "lucide-react"

const USAGE_PURPOSES = [
  { id: "make_friends", label: "Make new friends", emoji: "🤝" },
  { id: "practice_languages", label: "Practice languages", emoji: "🗣️" },
  { id: "cultural_exchange", label: "Meet people from other cultures", emoji: "🌎" },
  { id: "global_chat", label: "Talk to people from different countries", emoji: "💬" },
]

export default function SignUp() {
  const navigate = useNavigate()
  // Wizard Step State (1: Account Details, 2: Personalization, 3: Verification Banner)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Step 1 Form Fields
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [usernameStatus, setUsernameStatus] = useState<'IDLE' | 'CHECKING' | 'AVAILABLE' | 'TAKEN' | 'INVALID'>('IDLE')
  const [usernameMessage, setUsernameMessage] = useState<string>('')
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)

  // Real-time debounced username availability validation
  useEffect(() => {
    const clean = username.trim()
    if (!clean) {
      setUsernameStatus('IDLE')
      setUsernameMessage('')
      return
    }

    if (clean.length < 3 || clean.length > 30) {
      setUsernameStatus('INVALID')
      setUsernameMessage('Username must be 3-30 characters long.')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      setUsernameStatus('INVALID')
      setUsernameMessage('Letters, numbers, and underscores only.')
      return
    }

    setUsernameStatus('CHECKING')
    setUsernameMessage('Checking availability...')

    const timer = setTimeout(async () => {
      try {
        const res = await authApi.checkUsername(clean)
        const data = res?.data || res
        if (data.available) {
          setUsernameStatus('AVAILABLE')
          setUsernameMessage(data.message || 'Username is available!')
        } else {
          setUsernameStatus(data.reason === 'INVALID_FORMAT' ? 'INVALID' : 'TAKEN')
          setUsernameMessage(data.message || 'This username is unavailable.')
        }
      } catch {
        setUsernameStatus('IDLE')
        setUsernameMessage('')
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [username])

  // Step 2 Personalization Fields
  const [nativeLanguage, setNativeLanguage] = useState("en")
  const [nativeSearch, setNativeSearch] = useState("")
  const [fluentLanguages, setFluentLanguages] = useState<string[]>(["en"])
  const [learningLanguages, setLearningLanguages] = useState<string[]>([])
  const [countryCode, setCountryCode] = useState("IN")
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>([
    "make_friends",
    "practice_languages",
  ])

  // Step 3 Resend Timer State
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendMessage, setResendMessage] = useState("")

  // Filtered Languages for searchable dropdown
  const filteredLanguages = useMemo(() => {
    const q = nativeSearch.toLowerCase().trim()
    if (!q) return LANGUAGES
    return LANGUAGES.filter(
      (l) => l.name.toLowerCase().includes(q) || l.nativeName.toLowerCase().includes(q) || l.code.toLowerCase().includes(q)
    )
  }, [nativeSearch])

  // Handle Step 1 Submit (Account Creation)
  const handleStep1Submit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (usernameStatus === 'TAKEN' || usernameStatus === 'INVALID') {
      setErrorMessage(usernameMessage || 'Please choose a valid and available username.')
      return
    }

    if (!agreeTerms || !agreePrivacy) {
      setErrorMessage("You must agree to both the Terms of Service and Privacy Policy to continue.")
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please check and try again.")
      return
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.")
      return
    }

    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth)
      const cutoff = new Date()
      cutoff.setFullYear(cutoff.getFullYear() - 18)
      if (birthDate > cutoff) {
        setErrorMessage("You must be at least 18 years old to register an account on FriendZone.")
        return
      }
    }

    setIsLoading(true)
    try {
      await authApi.register({
        displayName: displayName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        dateOfBirth: dateOfBirth || undefined,
      })

      // Account created — transition directly to Step 3 (Email Verification Gate)
      setStep(3)
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create account. Email or username may be taken.")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Step 2 Submit (Personalization)
  const handleStep2Submit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsLoading(true)

    try {
      await authApi.completeOnboarding({
        nativeLanguage,
        fluentLanguages,
        learningLanguages,
        countryCode,
        usagePurposes: selectedPurposes,
      })
      setStep(3)
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save personalization details.")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Resend Verification Email
  const handleResendEmail = async () => {
    if (resendCooldown > 0) return
    setResendMessage("")
    setIsLoading(true)
    try {
      const res = await authApi.resendVerification(email)
      setResendMessage(res.message || "Verification email sent!")
      setResendCooldown(60)
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err: any) {
      setResendMessage(err.message || "Failed to resend email.")
    } finally {
      setIsLoading(false)
    }
  }

  const maskedEmail = useMemo(() => {
    if (!email) return "your email"
    const parts = email.split("@")
    if (parts.length < 2) return email
    const name = parts[0]
    const masked = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}*`
    return `${masked}@${parts[1]}`
  }, [email])

  return (
    <div className="relative flex min-h-[calc(100vh-4rem-16rem)] w-full flex-1 items-center justify-center overflow-hidden px-4 sm:px-6 py-8 md:py-16">
      <SEO
        title="Create Free Account"
        description="Join FriendZone today to experience real-time translated chat, global friend discovery, and multi-language communication."
        canonicalUrl="/signup"
      />
      {/* Ambient Background Glowing Orbs matching Homepage & Sign In */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[450px] w-[500px] rounded-full bg-indigo-600/15 blur-[140px]" />
        <div className="absolute top-10 right-1/4 h-[300px] w-[300px] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* ---------------- Left Hero / Brand Showcase (Matching Sign In) ---------------- */}
        <div className="relative hidden flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-indigo-950/30 via-white/[0.02] to-transparent p-10 backdrop-blur-xl lg:flex min-h-[520px]">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#07080d]/60 via-[#07080d]/40 to-[#07080d]/90" />

          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[12px] font-semibold text-indigo-400">
                <Sparkles className="h-3.5 w-3.5" />
                Global Community Signup
              </span>

              <h1 className="mt-6 text-3xl font-bold leading-tight text-white xl:text-4xl">
                Join millions on
                <br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                  FriendZone Today.
                </span>
              </h1>

              <p className="mt-4 text-[14px] leading-relaxed text-gray-400">
                Connect instantly across 100+ languages without communication barriers or split channels.
              </p>
            </div>

            {/* Interactive Feature Cards */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md transition-colors hover:border-white/20">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Globe className="h-4 w-4" />
                </span>
                <p className="mt-3 text-xs font-semibold text-white">100+ Languages</p>
                <p className="mt-1 text-[11px] text-gray-400">
                  Instant real-time translation with context intelligence.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md transition-colors hover:border-white/20">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <p className="mt-3 text-xs font-semibold text-white">Enterprise Security</p>
                <p className="mt-1 text-[11px] text-gray-400">
                  Zero plain-text storage & encrypted transport session security.
                </p>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-6">
              <div className="flex -space-x-2">
                <span className="h-7 w-7 rounded-full border-2 border-[#07080d] bg-gradient-to-br from-pink-400 to-purple-500" />
                <span className="h-7 w-7 rounded-full border-2 border-[#07080d] bg-gradient-to-br from-indigo-400 to-blue-500" />
                <span className="h-7 w-7 rounded-full border-2 border-[#07080d] bg-gradient-to-br from-emerald-400 to-teal-500" />
              </div>
              <p className="text-[12px] text-gray-400">
                Joined by <span className="font-semibold text-white">250,000+</span> active global users
              </p>
            </div>
          </div>
        </div>

        {/* ---------------- Right Auth Form Card (Matching Sign In) ---------------- */}
        <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] sm:p-10">
          
          {/* Header Step Indicator */}
          <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-4">
            <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">
              {step === 1 ? "Step 1 of 3: Account" : step === 2 ? "Step 2 of 3: Personalize" : "Step 3 of 3: Verification"}
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 rounded-full transition-all duration-300 ${step === 1 ? "w-6 bg-indigo-500" : "w-2 bg-white/20"}`} />
              <span className={`h-1.5 rounded-full transition-all duration-300 ${step === 2 ? "w-6 bg-indigo-500" : "w-2 bg-white/20"}`} />
              <span className={`h-1.5 rounded-full transition-all duration-300 ${step === 3 ? "w-6 bg-emerald-500" : "w-2 bg-white/20"}`} />
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mt-2 mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: CREATE ACCOUNT */}
          {step === 1 && (
            <div>
              <div className="text-left mb-6">
                <h2 className="text-2xl font-bold text-white sm:text-3xl">Create Account</h2>
                <p className="mt-1.5 text-xs sm:text-sm text-gray-400">
                  Enter your details to start communicating across languages.
                </p>
              </div>

              <form onSubmit={handleStep1Submit} className="space-y-4 text-left">
                {/* Full Name */}
                <div>
                  <label htmlFor="displayName" className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-300 uppercase">
                    FULL NAME
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input
                      id="displayName"
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Alex Morgan"
                      className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition focus:border-indigo-500 focus:bg-white/[0.08]"
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label htmlFor="username" className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-300 uppercase">
                    USERNAME
                  </label>
                  <div className="relative">
                    <AtSign className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input
                      id="username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="alex_m"
                      className={`w-full rounded-xl border py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-500 outline-none transition focus:bg-white/[0.08] ${
                        usernameStatus === "AVAILABLE"
                          ? "border-emerald-500/50 bg-emerald-500/5"
                          : usernameStatus === "TAKEN" || usernameStatus === "INVALID"
                          ? "border-red-500/50 bg-red-500/10"
                          : "border-white/15 bg-white/5 focus:border-indigo-500"
                      }`}
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                      {usernameStatus === "CHECKING" && <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />}
                      {usernameStatus === "AVAILABLE" && <Check className="h-4 w-4 text-emerald-400" />}
                      {(usernameStatus === "TAKEN" || usernameStatus === "INVALID") && <X className="h-4 w-4 text-red-400" />}
                    </div>
                  </div>
                  {usernameMessage && (
                    <p className={`mt-1 text-[11px] font-medium flex items-center gap-1 ${
                      usernameStatus === "AVAILABLE"
                        ? "text-emerald-400"
                        : usernameStatus === "TAKEN" || usernameStatus === "INVALID"
                        ? "text-red-400"
                        : "text-indigo-400"
                    }`}>
                      {usernameMessage}
                    </p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-300 uppercase">
                    EMAIL ADDRESS
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition focus:border-indigo-500 focus:bg-white/[0.08]"
                    />
                  </div>
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="password" className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-300 uppercase">
                      PASSWORD
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-10 pr-8 text-sm text-white placeholder-gray-500 outline-none transition focus:border-indigo-500 focus:bg-white/[0.08]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-300 uppercase">
                      CONFIRM
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                      <input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition focus:border-indigo-500 focus:bg-white/[0.08]"
                      />
                    </div>
                  </div>
                </div>

                {/* Date of Birth */}
                <div>
                  <label htmlFor="dateOfBirth" className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-300 uppercase">
                    DATE OF BIRTH <span className="text-gray-500 lowercase">(18+ required)</span>
                  </label>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input
                      id="dateOfBirth"
                      type="date"
                      required
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition focus:border-indigo-500 focus:bg-white/[0.08] [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                  <label className="flex items-start gap-2.5 cursor-pointer text-gray-300">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent accent-indigo-500"
                    />
                    <span>
                      I agree to the <Link to="/terms" className="text-indigo-400 hover:text-indigo-300 underline">Terms of Service</Link>
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer text-gray-300">
                    <input
                      type="checkbox"
                      checked={agreePrivacy}
                      onChange={(e) => setAgreePrivacy(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent accent-indigo-500"
                    />
                    <span>
                      I agree to the <Link to="/privacy" className="text-indigo-400 hover:text-indigo-300 underline">Privacy Policy</Link>
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-[0_0_25px_rgba(99,102,241,0.4)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(99,102,241,0.6)] active:scale-[0.98] disabled:opacity-70 mt-4"
                >
                  {isLoading ? (
                    "Creating Account..."
                  ) : (
                    <>
                      Continue to Personalization <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: PERSONALIZE FRIENDZONE */}
          {step === 2 && (
            <div>
              <div className="text-left mb-5">
                <h2 className="text-2xl font-bold text-white sm:text-3xl">Personalize Profile 🌎</h2>
                <p className="mt-1 text-xs sm:text-sm text-gray-400">
                  Tell us your language preferences to optimize AI translation.
                </p>
              </div>

              <form onSubmit={handleStep2Submit} className="space-y-4 text-left">
                {/* Native Language (Searchable) */}
                <div>
                  <label className="mb-1 block text-xs font-semibold tracking-wider text-gray-300 uppercase">
                    NATIVE LANGUAGE
                  </label>
                  <div className="relative mb-2">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={nativeSearch}
                      onChange={(e) => setNativeSearch(e.target.value)}
                      placeholder="Search languages..."
                      className="w-full rounded-lg border border-white/15 bg-white/5 py-1.5 pl-8 pr-3 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <select
                    value={nativeLanguage}
                    onChange={(e) => setNativeLanguage(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-[#0d0e17] py-2.5 px-3 text-xs text-white outline-none focus:border-indigo-500"
                  >
                    {filteredLanguages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name} ({lang.nativeName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fluent Languages Multi-select */}
                <div>
                  <label className="mb-1 block text-xs font-semibold tracking-wider text-gray-300 uppercase">
                    FLUENT LANGUAGES
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-xl border border-white/15 bg-white/5 custom-scrollbar">
                    {LANGUAGES.slice(0, 25).map((lang) => {
                      const isSelected = fluentLanguages.includes(lang.code)
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setFluentLanguages(fluentLanguages.filter((c) => c !== lang.code))
                            } else {
                              setFluentLanguages([...fluentLanguages, lang.code])
                            }
                          }}
                          className={`rounded-lg px-2 py-0.5 text-[11px] font-medium transition ${
                            isSelected
                              ? "bg-indigo-500 text-white font-semibold shadow-md"
                              : "bg-white/10 text-gray-300 hover:bg-white/20"
                          }`}
                        >
                          {lang.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Learning Languages Multi-select */}
                <div>
                  <label className="mb-1 block text-xs font-semibold tracking-wider text-gray-300 uppercase">
                    LEARNING LANGUAGES (OPTIONAL)
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-2 rounded-xl border border-white/15 bg-white/5 custom-scrollbar">
                    {LANGUAGES.slice(0, 20).map((lang) => {
                      const isSelected = learningLanguages.includes(lang.code)
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setLearningLanguages(learningLanguages.filter((c) => c !== lang.code))
                            } else {
                              setLearningLanguages([...learningLanguages, lang.code])
                            }
                          }}
                          className={`rounded-lg px-2 py-0.5 text-[11px] font-medium transition ${
                            isSelected
                              ? "bg-purple-500 text-white font-semibold shadow-md"
                              : "bg-white/10 text-gray-300 hover:bg-white/20"
                          }`}
                        >
                          {lang.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Country Selector */}
                <div>
                  <label className="mb-1 block text-xs font-semibold tracking-wider text-gray-300 uppercase">
                    COUNTRY / REGION
                  </label>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-[#0d0e17] py-2.5 px-3 text-xs text-white outline-none focus:border-indigo-500"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Purpose Selection */}
                <div>
                  <label className="mb-1 block text-xs font-semibold tracking-wider text-gray-300 uppercase">
                    PRIMARY GOAL ON FRIENDZONE
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {USAGE_PURPOSES.map((item) => {
                      const isSelected = selectedPurposes.includes(item.id)
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedPurposes(selectedPurposes.filter((p) => p !== item.id))
                            } else {
                              setSelectedPurposes([...selectedPurposes, item.id])
                            }
                          }}
                          className={`flex items-center gap-1.5 rounded-xl p-2.5 text-[11px] text-left transition border ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-500/15 text-white font-semibold"
                              : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                          }`}
                        >
                          <span>{item.emoji}</span>
                          <span className="flex-1 leading-tight">{item.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Submit Personalization */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-[0_0_25px_rgba(99,102,241,0.4)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(99,102,241,0.6)] active:scale-[0.98] disabled:opacity-70 mt-4"
                >
                  {isLoading ? "Saving Profile..." : <>Save & Complete Onboarding <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" /></>}
                </button>
              </form>
            </div>
          )}

          {/* STEP 3: EMAIL VERIFICATION BANNER */}
          {step === 3 && (
            <div className="text-center space-y-5 py-4 animate-in fade-in zoom-in-95">
              <div className="mx-auto h-14 w-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Mail className="h-7 w-7" />
              </div>

              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-300">
                  <ShieldCheck className="h-3.5 w-3.5" /> Activation Required
                </span>
                <h2 className="text-2xl font-extrabold text-white">Account Created</h2>
                <p className="text-xs text-gray-300 max-w-sm mx-auto leading-relaxed">
                  Your FriendZone account has been created, but it is <strong>not active yet</strong>. We've sent a verification link to <strong className="text-indigo-400">{maskedEmail}</strong>.
                </p>
                <p className="text-[11px] text-gray-400 italic max-w-xs mx-auto pt-1">
                  Email verification helps us protect FriendZone from bots, spam, fake accounts, and abuse.
                </p>
              </div>

              {resendMessage && (
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-indigo-300">
                  {resendMessage}
                </div>
              )}

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={isLoading || resendCooldown > 0}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-[0_0_25px_rgba(99,102,241,0.4)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(99,102,241,0.6)] active:scale-[0.98] disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  {resendCooldown > 0 ? `Resend email in ${resendCooldown}s` : "Resend Verification Email"}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/signIn")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-semibold text-gray-200 hover:bg-white/10 transition"
                >
                  Back to Sign In
                </button>
              </div>

              <p className="text-[11px] text-gray-500 pt-1">
                Didn't receive the email? Check your spam folder or contact <a href="mailto:friendzone_live@proton.me" className="text-indigo-400 underline">friendzone_live@proton.me</a>.
              </p>
            </div>
          )}

          {/* Footer Link to Sign In */}
          {step === 1 && (
            <p className="mt-6 text-center text-xs sm:text-sm text-gray-400 border-t border-white/10 pt-4">
              Already have an account?{" "}
              <Link
                to="/signin"
                className="font-semibold text-indigo-400 transition-colors hover:text-indigo-300 underline underline-offset-4"
              >
                Sign In
              </Link>
            </p>
          )}

          <div className="my-6 h-px w-full bg-white/10" />

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-medium tracking-wide text-gray-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" /> SECURE AUTHENTICATION
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" /> JWT PROTECTED
            </span>
          </div>

        </div>
      </div>
    </div>
  )
}