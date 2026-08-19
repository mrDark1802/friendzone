import { useState, useEffect, useMemo, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import SEO from "../components/SEO"
import { authApi } from "../services/api"
import { LANGUAGES } from "../constants/languages"
import { COUNTRIES } from "../constants/countries"
import {
  Globe,
  ArrowRight,
  Mail,
  User,
  AtSign,
  Lock,
  Calendar,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
} from "lucide-react"

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
  const [countryCode, setCountryCode] = useState("US")

  // Step 3 Resend Timer State
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendMessage, setResendMessage] = useState("")

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
        countryCode,
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
    <div className="flex min-h-[calc(100vh-4rem-12rem)] w-full flex-1 items-center justify-center px-4 sm:px-6 py-8 sm:py-12 bg-slate-50 dark:bg-[#07090e] text-slate-900 dark:text-slate-100 animate-fade-in">
      <SEO
        title="Create Free Account"
        description="Join FriendZone today to experience real-time translated chat, global friend discovery, and multi-language communication."
        canonicalUrl="/signup"
      />

      <div className="mx-auto grid w-full max-w-4xl items-center gap-8 lg:grid-cols-12">
        {/* Left Brand Showcase */}
        <div className="hidden lg:col-span-5 flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-8 shadow-xs lg:flex min-h-[480px]">
          <div className="space-y-4 text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified Community
            </div>

            <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
              Make friends without borders.
            </h1>

            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Join FriendZone to connect with real people worldwide with real-time translation and voice/video calling.
            </p>
          </div>

          <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800 text-left">
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold shrink-0">
                <Globe className="h-4 w-4" />
              </span>
              <span>10+ supported languages with quiet translation</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span>Mandatory email verification for authenticity</span>
            </div>
          </div>
        </div>

        {/* Right Auth Form */}
        <div className="lg:col-span-7 mx-auto w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-6 sm:p-8 shadow-xs text-left">
          
          {/* Header Step Indicator */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              {step === 1 ? "Step 1: Account Details" : step === 2 ? "Step 2: Languages" : "Step 3: Verification"}
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 rounded-full transition-all duration-300 ${step === 1 ? "w-5 bg-blue-600" : "w-1.5 bg-slate-200 dark:bg-slate-700"}`} />
              <span className={`h-1.5 rounded-full transition-all duration-300 ${step === 2 ? "w-5 bg-blue-600" : "w-1.5 bg-slate-200 dark:bg-slate-700"}`} />
              <span className={`h-1.5 rounded-full transition-all duration-300 ${step === 3 ? "w-5 bg-emerald-600" : "w-1.5 bg-slate-200 dark:bg-slate-700"}`} />
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: CREATE ACCOUNT */}
          {step === 1 && (
            <div>
              <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Your Account</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Enter your details to start connecting across cultures.
                </p>
              </div>

              <form onSubmit={handleStep1Submit} className="space-y-3 text-left">
                {/* Full Name */}
                <div>
                  <label htmlFor="displayName" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="displayName"
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Alex Morgan"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-600 transition"
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label htmlFor="username" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Username
                  </label>
                  <div className="relative">
                    <AtSign className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="alex_m"
                      className={`w-full rounded-xl border py-2 pl-9 pr-9 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none transition ${
                        usernameStatus === "AVAILABLE"
                          ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                          : usernameStatus === "TAKEN" || usernameStatus === "INVALID"
                          ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20"
                          : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:border-blue-600"
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                      {usernameStatus === "CHECKING" && <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin" />}
                      {usernameStatus === "AVAILABLE" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                      {(usernameStatus === "TAKEN" || usernameStatus === "INVALID") && <X className="h-3.5 w-3.5 text-rose-600" />}
                    </div>
                  </div>
                  {usernameMessage && (
                    <p className={`mt-0.5 text-[11px] font-medium ${
                      usernameStatus === "AVAILABLE"
                        ? "text-emerald-600"
                        : usernameStatus === "TAKEN" || usernameStatus === "INVALID"
                        ? "text-rose-600"
                        : "text-blue-600"
                    }`}>
                      {usernameMessage}
                    </p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label htmlFor="email" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-600 transition"
                    />
                  </div>
                </div>

                {/* Password & Confirm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="password" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-2 pl-9 pr-7 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-600 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Confirm
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-600 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Date of Birth */}
                <div>
                  <label htmlFor="dateOfBirth" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Date of Birth <span className="text-slate-400 font-normal">(18+ required)</span>
                  </label>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="dateOfBirth"
                      type="date"
                      required
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 transition"
                    />
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-1.5 pt-1 text-xs">
                  <label className="flex items-start gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      I agree to the <Link to="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={agreePrivacy}
                      onChange={(e) => setAgreePrivacy(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      I agree to the <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50 mt-3"
                >
                  {isLoading ? "Creating Account..." : <>Create Account <ArrowRight className="h-3.5 w-3.5" /></>}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: PERSONALIZE */}
          {step === 2 && (
            <div>
              <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Language Preferences</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Select your primary language for automatic translation.
                </p>
              </div>

              <form onSubmit={handleStep2Submit} className="space-y-3 text-left">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Native Language
                  </label>
                  <select
                    value={nativeLanguage}
                    onChange={(e) => setNativeLanguage(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-2 px-3 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name} ({lang.nativeName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Country / Region
                  </label>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-2 px-3 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50 mt-3"
                >
                  {isLoading ? "Saving..." : <>Save & Finish <ArrowRight className="h-3.5 w-3.5" /></>}
                </button>
              </form>
            </div>
          )}

          {/* STEP 3: EMAIL VERIFICATION */}
          {step === 3 && (
            <div className="text-center space-y-4 py-2 animate-fade-in">
              <div className="mx-auto h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-600">
                <Mail className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Verify Your Email</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  We sent a verification link to <strong className="text-slate-900 dark:text-white">{maskedEmail}</strong>. Please check your inbox and click the link to activate your account.
                </p>
              </div>

              {resendMessage && (
                <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 p-2.5 text-xs text-blue-700 dark:text-blue-300">
                  {resendMessage}
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={isLoading || resendCooldown > 0}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Verification Email"}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/signin")}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* Footer Link to Sign In */}
          {step === 1 && (
            <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
              Already have an account?{" "}
              <Link
                to="/signin"
                className="font-semibold text-blue-600 hover:underline"
              >
                Sign In
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}