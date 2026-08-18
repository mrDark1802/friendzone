import { useState, useEffect, type FormEvent } from "react"
import {
    Share2,
    User,
    Sparkles,
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
        <div className="relative p-6 lg:p-8 space-y-8 text-left max-w-6xl mx-auto">
            {/* Toast Banners */}
            {toastMessage && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl border border-emerald-500/40 bg-[#07080d]/95 px-5 py-2.5 text-xs font-semibold text-emerald-300 backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> {toastMessage}
                </div>
            )}

            {errorMessage && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl border border-rose-500/40 bg-[#07080d]/95 px-5 py-2.5 text-xs font-semibold text-rose-300 backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-top-2">
                    ⚠️ {errorMessage}
                </div>
            )}

            {/* Top Cover Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-indigo-950 via-purple-950 to-indigo-950 p-6 md:p-8">
                <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end justify-between">
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
                        <UserAvatar
                            displayName={displayName || user?.name || "User"}
                            profileMediaId={(user as any)?.profileMediaId || (user as any)?.profileMedia?.id}
                            avatarUrl={(user as any)?.avatar || (user as any)?.avatarUrl}
                            size="xl"
                            className="!h-24 !w-24 border-4 border-[#07080d] shadow-xl rounded-3xl"
                        />
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold text-white">{displayName || user?.name}</h1>
                                <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-[11px] font-bold text-indigo-300 border border-indigo-500/30">
                                    @{username || user?.username}
                                </span>
                            </div>
                            <p className="text-xs text-gray-300">{email}</p>
                            <div className="flex items-center gap-4 text-[11px] text-gray-400 font-medium pt-1">
                                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-indigo-400" /> Active Member</span>
                                <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5 text-indigo-400" /> Native ({nativeLanguage.toUpperCase()})</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsReviewModalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg transition hover:scale-105"
                        >
                            <Sparkles className="h-4 w-4" /> Leave a Review
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(`@${username}`)
                                showToast("Copied username to clipboard!")
                            }}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10"
                        >
                            <Share2 className="h-4 w-4" /> Share Tag
                        </button>
                    </div>
                </div>
            </div>

            {/* Profile Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => setActiveTab("general")}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition shrink-0 ${
                        activeTab === "general" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white bg-white/5"
                    }`}
                >
                    <User className="h-4 w-4" /> General Identity
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("preferences")}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition shrink-0 ${
                        activeTab === "preferences" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white bg-white/5"
                    }`}
                >
                    <Languages className="h-4 w-4" /> Translation Settings
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("security")}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition shrink-0 ${
                        activeTab === "security" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white bg-white/5"
                    }`}
                >
                    <ShieldCheck className="h-4 w-4" /> Account Security
                </button>
            </div>

            {/* Content Container */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                {/* Main Content Area (8 cols) */}
                <div className="space-y-6 lg:col-span-8">
                    {/* 1. GENERAL IDENTITY TAB */}
                    {activeTab === "general" && (
                        <div className="rounded-2xl border border-white/10 bg-[#11131f] p-6 space-y-6">
                            <div>
                                <h2 className="text-lg font-bold text-white">General Account Details</h2>
                                <p className="mt-0.5 text-xs text-gray-400">Update how your profile appears across FriendZone.</p>
                            </div>

                            <form onSubmit={handleSaveProfile} className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-gray-300 uppercase">Display Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 px-4 text-sm text-white outline-none focus:border-indigo-500 transition"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-gray-300 uppercase">Unique Username</label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-gray-500">@</span>
                                        <input
                                            type="text"
                                            required
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                                            className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-8 pr-4 text-sm text-white outline-none focus:border-indigo-500 transition"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-gray-300 uppercase">Email Address (Read-Only)</label>
                                    <input
                                        type="email"
                                        disabled
                                        value={email}
                                        className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 px-4 text-sm text-gray-400 outline-none cursor-not-allowed opacity-70"
                                    />
                                    <p className="mt-1 text-[11px] text-gray-500">Email is fixed for security identification.</p>
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 text-xs font-semibold text-white transition disabled:opacity-50 shadow-sm"
                                    >
                                        {isSaving ? "Saving..." : "Save Changes"}
                                        <Check className="h-4 w-4" />
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* 2. LANGUAGE & AI PREFERENCES TAB */}
                    {activeTab === "preferences" && (
                        <div className="space-y-6">
                            <QuotaTrackerWidget />

                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md space-y-6">
                                <div>
                                    <h2 className="text-lg font-bold text-white">Translation & Language Configuration</h2>
                                    <p className="mt-0.5 text-xs text-gray-400">Configure how FriendZone automatically translates incoming messages.</p>
                                </div>

                            <form onSubmit={handleSaveProfile} className="space-y-6">
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-gray-300 uppercase">Primary Native Language</label>
                                    <div className="relative">
                                        <Languages className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                                        <select
                                            value={nativeLanguage}
                                            onChange={(e) => setNativeLanguage(e.target.value)}
                                            className="w-full rounded-xl border border-white/15 bg-[#0a0c14] py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-indigo-500 transition"
                                        >
                                            {SUPPORTED_LANGUAGES.map((lang) => (
                                                <option key={lang.code} value={lang.code}>
                                                    {lang.nativeName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <p className="mt-1.5 text-[11px] text-gray-400">Incoming messages in other languages will be translated into this language.</p>
                                </div>

                                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                                    <div className="space-y-0.5">
                                        <label className="text-xs font-bold text-white flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-indigo-400" /> Enable Real-Time AI Auto-Translation
                                        </label>
                                        <p className="text-[11px] text-gray-400">Automatically deliver translated versions of incoming chat messages.</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={translationEnabled}
                                        onChange={(e) => setTranslationEnabled(e.target.checked)}
                                        className="h-5 w-5 rounded border-white/20 bg-white/10 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-2.5 text-xs font-semibold text-white hover:scale-105 transition disabled:opacity-50 shadow-md"
                                    >
                                        {isSaving ? "Saving..." : "Save Preferences"}
                                        <Check className="h-4 w-4" />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                    {/* 3. ACCOUNT SECURITY TAB */}
                    {activeTab === "security" && (
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md space-y-6">
                            <div>
                                <h2 className="text-lg font-bold text-white">Change Account Password</h2>
                                <p className="mt-0.5 text-xs text-gray-400">Ensure your account stays secure by using a strong password.</p>
                            </div>

                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-gray-300 uppercase">Current Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 px-4 text-sm text-white outline-none focus:border-indigo-500 transition"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-gray-300 uppercase">New Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="At least 6 characters"
                                        className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 px-4 text-sm text-white outline-none focus:border-indigo-500 transition"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-gray-300 uppercase">Confirm New Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Re-enter new password"
                                        className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 px-4 text-sm text-white outline-none focus:border-indigo-500 transition"
                                    />
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-2.5 text-xs font-semibold text-white hover:scale-105 transition disabled:opacity-50 shadow-md"
                                    >
                                        {isSaving ? "Updating Password..." : "Update Password"}
                                        <KeyRound className="h-4 w-4" />
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {/* Right Summary Sidebar (4 cols) */}
                <div className="space-y-6 lg:col-span-4">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md space-y-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <h3 className="text-base font-bold text-white">System Security</h3>
                            <span className="text-xs text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                Verified
                            </span>
                        </div>

                        <div className="space-y-3 text-xs font-medium">
                            <div className="flex items-center gap-2 text-emerald-400">
                                <CheckCircle2 className="h-4 w-4 shrink-0" /> PostgreSQL Persistent Sync
                            </div>
                            <div className="flex items-center gap-2 text-emerald-400">
                                <CheckCircle2 className="h-4 w-4 shrink-0" /> In-Memory JWT Authentication
                            </div>
                            <div className="flex items-center gap-2 text-emerald-400">
                                <CheckCircle2 className="h-4 w-4 shrink-0" /> HttpOnly Cookie Refresh
                            </div>
                            <div className="flex items-center gap-2 text-indigo-400 pt-1">
                                <Sparkles className="h-4 w-4 shrink-0 text-indigo-400" />
                                <span>Translation: {translationEnabled ? "Active" : "Disabled"}</span>
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
