import { useState, useEffect, type FormEvent } from "react"
import {
    Share2,
    User,
    ShieldCheck,
    CheckCircle2,
    MapPin,
    Globe,
    Check,
    KeyRound,
    Languages,
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { usersApi } from "../../services/api"
import { SUPPORTED_LANGUAGES } from "../../config/languagesConfig"
import QuotaTrackerWidget from "../../components/QuotaTrackerWidget"
import ReviewModal from "../../components/ReviewModal"
import { UserAvatar } from "../../components/common/UserAvatar"

export default function ProfilePage() {
    const { user, refreshProfile } = useAuth()

    const [displayName, setDisplayName] = useState(user?.name || "")
    const [username, setUsername] = useState(user?.username || "")
    const [email, setEmail] = useState(user?.email || "")
    const [nativeLanguage, setNativeLanguage] = useState(user?.nativeLanguage || "en")
    const [translationEnabled, setTranslationEnabled] = useState(user?.translationEnabled ?? true)

    // Security tab state
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    const [activeTab, setActiveTab] = useState<"general" | "preferences" | "security">("general")
    const [isSaving, setIsSaving] = useState(false)
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
    const [toastMessage, setToastMessage] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    useEffect(() => {
        if (user) {
            setDisplayName(user.name)
            setUsername(user.username)
            setEmail(user.email)
            setNativeLanguage(user.nativeLanguage || "en")
            setTranslationEnabled(user.translationEnabled ?? true)
        }
    }, [user])

    const showToast = (msg: string) => {
        setToastMessage(msg)
        setErrorMessage(null)
        setTimeout(() => setToastMessage(null), 3000)
    }

    const showError = (msg: string) => {
        setErrorMessage(msg)
        setToastMessage(null)
        setTimeout(() => setErrorMessage(null), 4000)
    }

    // Save General / Preferences Profile Data
    const handleSaveProfile = async (e: FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        setErrorMessage(null)

        try {
            await usersApi.updateProfile({
                displayName,
                username,
                nativeLanguage,
                translationEnabled,
            })
            await refreshProfile()
            setIsSaving(false)
            showToast("Profile settings saved successfully!")
        } catch (err: any) {
            setIsSaving(false)
            showError(err.message || "Failed to update profile.")
        }
    }

    // Save Password Change
    const handleChangePassword = async (e: FormEvent) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            showError("New password and confirmation password do not match.")
            return
        }

        if (newPassword.length < 6) {
            showError("New password must be at least 6 characters long.")
            return
        }

        setIsSaving(true)
        setErrorMessage(null)

        try {
            await usersApi.changePassword({
                currentPassword,
                newPassword,
            })
            setIsSaving(false)
            setCurrentPassword("")
            setNewPassword("")
            setConfirmPassword("")
            showToast("Password updated successfully!")
        } catch (err: any) {
            setIsSaving(false)
            showError(err.message || "Failed to change password.")
        }
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 text-left max-w-5xl mx-auto animate-fade-in">
            {/* Toast Banners */}
            {toastMessage && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 shadow-lg animate-fade-in flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {toastMessage}
                </div>
            )}

            {errorMessage && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 shadow-lg animate-fade-in">
                    ⚠️ {errorMessage}
                </div>
            )}

            {/* Top Cover Banner */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                        <UserAvatar
                            displayName={displayName || user?.name || "User"}
                            profileMediaId={(user as any)?.profileMediaId || (user as any)?.profileMedia?.id}
                            avatarUrl={(user as any)?.avatar || (user as any)?.avatarUrl}
                            size="lg"
                            className="!h-16 !w-16"
                        />
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    {displayName || user?.name}
                                </h1>
                                <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                                    @{username || user?.username}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{email}</p>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-blue-600" /> Member</span>
                                <span className="flex items-center gap-1"><Globe className="h-3 w-3 text-blue-600" /> Native: {nativeLanguage.toUpperCase()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(`@${username}`)
                                showToast("Copied handle to clipboard!")
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
                        >
                            <Share2 className="h-3.5 w-3.5" /> Share Tag
                        </button>
                    </div>
                </div>
            </div>

            {/* Profile Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => setActiveTab("general")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition shrink-0 ${
                        activeTab === "general"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                >
                    <User className="h-3.5 w-3.5" /> Profile Details
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("preferences")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition shrink-0 ${
                        activeTab === "preferences"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                >
                    <Languages className="h-3.5 w-3.5" /> Languages & Translation
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("security")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition shrink-0 ${
                        activeTab === "security"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                >
                    <ShieldCheck className="h-3.5 w-3.5" /> Security & Password
                </button>
            </div>

            {/* Content Section */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="space-y-6 lg:col-span-8">
                    {/* 1. GENERAL TAB */}
                    {activeTab === "general" && (
                        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-5 sm:p-6 space-y-5 shadow-xs">
                            <div>
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">Profile Details</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Manage how you appear to others on FriendZone.</p>
                            </div>

                            <form onSubmit={handleSaveProfile} className="space-y-4">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Display Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-2 px-3.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 transition"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Username Handle</label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">@</span>
                                        <input
                                            type="text"
                                            required
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-2 pl-7 pr-3.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 transition"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                                    <input
                                        type="email"
                                        disabled
                                        value={email}
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 py-2 px-3.5 text-xs text-slate-500 outline-none cursor-not-allowed opacity-75"
                                    />
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-semibold text-white transition disabled:opacity-50 shadow-xs"
                                    >
                                        {isSaving ? "Saving..." : "Save Profile"}
                                        <Check className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* 2. PREFERENCES TAB */}
                    {activeTab === "preferences" && (
                        <div className="space-y-6">
                            <QuotaTrackerWidget />

                            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-5 sm:p-6 space-y-5 shadow-xs">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Language & Translation Settings</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Configure how FriendZone translates incoming messages for you.</p>
                                </div>

                                <form onSubmit={handleSaveProfile} className="space-y-4">
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Native Translation Language</label>
                                        <select
                                            value={nativeLanguage}
                                            onChange={(e) => setNativeLanguage(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-2 px-3 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 transition"
                                        >
                                            {SUPPORTED_LANGUAGES.map((lang) => (
                                                <option key={lang.code} value={lang.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                                                    {lang.nativeName} ({lang.name})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3.5">
                                        <div className="space-y-0.5">
                                            <label className="text-xs font-semibold text-slate-900 dark:text-white">
                                                Automatic Message Translation
                                            </label>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                Automatically translate received messages into your native language.
                                            </p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={translationEnabled}
                                            onChange={(e) => setTranslationEnabled(e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={isSaving}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-semibold text-white transition disabled:opacity-50 shadow-xs"
                                        >
                                            {isSaving ? "Saving..." : "Save Preferences"}
                                            <Check className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* 3. SECURITY TAB */}
                    {activeTab === "security" && (
                        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-5 sm:p-6 space-y-5 shadow-xs">
                            <div>
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">Change Password</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Keep your account secure by using a strong password.</p>
                            </div>

                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Current Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-2 px-3.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 transition"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">New Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="At least 6 characters"
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-2 px-3.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 transition"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Confirm New Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Re-enter new password"
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-2 px-3.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 transition"
                                    />
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-semibold text-white transition disabled:opacity-50 shadow-xs"
                                    >
                                        {isSaving ? "Updating Password..." : "Update Password"}
                                        <KeyRound className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {/* Right Side Summary */}
                <div className="space-y-6 lg:col-span-4">
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-5 space-y-3.5 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Account Status</h3>
                            <span className="text-[10px] text-emerald-600 font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40">
                                Active
                            </span>
                        </div>

                        <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                <span>Verified Member Account</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                <span>Secure In-Memory JWT Session</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                <span>Real-time Socket.IO Sync</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ReviewModal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                onSuccess={() => showToast("Review submitted successfully!")}
            />
        </div>
    )
}
