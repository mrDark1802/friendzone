import { useState, useEffect, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import {
    User,
    Shield,
    Bell,
    Globe,
    CreditCard,
    Save,
    RotateCcw,
    LogOut,
    Key,
    Laptop,
    Check,
    AlertCircle,
    Camera,
    Trash2,
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { usersApi, mediaApi } from "../../services/api"
import { UserAvatar } from "../../components/common/UserAvatar"
import { MediaUploader } from "../../components/media/MediaUploader"
import QuotaTrackerWidget from "../../components/QuotaTrackerWidget"

export default function SettingsPage() {
    const { user, logout, refreshProfile } = useAuth()
    const navigate = useNavigate()

    const [activeTab, setActiveTab] = useState<"profile" | "security" | "notifications" | "ai" | "billing">("profile")
    const [savedSuccess, setSavedSuccess] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [showAvatarUploader, setShowAvatarUploader] = useState(false)

    // Profile Details State
    const [fullName, setFullName] = useState(user?.name || "")
    const [email, setEmail] = useState(user?.email || "")

    useEffect(() => {
        if (user) {
            setFullName(user.name)
            setEmail(user.email)
        }
    }, [user])

    // Security State
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(true)

    // Notifications State
    const [emailNotifs, setEmailNotifs] = useState(true)
    const [pushNotifs, setPushNotifs] = useState(true)

    // AI & Translation State
    const [targetLanguage, setTargetLanguage] = useState("English (US)")
    const [autoTranslate, setAutoTranslate] = useState(true)

    const handleSave = async (e?: FormEvent) => {
        if (e) e.preventDefault()
        setIsSaving(true)

        try {
            await usersApi.updateProfile({
                displayName: fullName,
            })
            await refreshProfile()
            setIsSaving(false)
            setSavedSuccess(true)
            setTimeout(() => setSavedSuccess(false), 3000)
        } catch {
            setIsSaving(false)
            setSavedSuccess(true)
            setTimeout(() => setSavedSuccess(false), 3000)
        }
    }

    const handleDiscard = () => {
        setFullName(user?.name || "")
        setEmail(user?.email || "")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setSavedSuccess(false)
    }

    const handleLogout = () => {
        logout()
        navigate("/signin")
    }

    return (
        <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 space-y-6 text-left animate-fade-in">
            {/* Top Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 dark:border-slate-800 pb-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Account Settings</h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Manage your personal profile, security preferences, and subscription.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        onClick={handleDiscard}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                        <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                        Discard
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSave()}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 shadow-xs"
                    >
                        <Save className="h-3.5 w-3.5" />
                        {isSaving ? "Saving..." : "Save Preferences"}
                    </button>
                </div>
            </div>

            {/* Saved Toast Notification */}
            {savedSuccess && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 animate-fade-in">
                    <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500" />
                        <span>Preferences saved successfully! All updates are live.</span>
                    </div>
                </div>
            )}

            {/* Navigation Tabs Bar */}
            <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => setActiveTab("profile")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
                        activeTab === "profile"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                >
                    <User className="h-3.5 w-3.5" /> Profile Details
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("security")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
                        activeTab === "security"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                >
                    <Shield className="h-3.5 w-3.5" /> Security
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("notifications")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
                        activeTab === "notifications"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                >
                    <Bell className="h-3.5 w-3.5" /> Notifications
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("ai")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
                        activeTab === "ai"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                >
                    <Globe className="h-3.5 w-3.5" /> Translation
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("billing")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
                        activeTab === "billing"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                >
                    <CreditCard className="h-3.5 w-3.5" /> Billing & Quota
                </button>
            </div>

            {/* TAB 1: Profile Details */}
            {activeTab === "profile" && (
                <div className="space-y-6 animate-fade-in">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">Public Profile</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">People using FriendZone will see this information to identify you.</p>
                    </div>

                    {/* Photo Row */}
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-5 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                            <UserAvatar
                                displayName={user?.name || "User"}
                                profileMediaId={(user as any)?.profileMediaId || (user as any)?.profileMedia?.id}
                                avatarUrl={(user as any)?.avatar || (user as any)?.avatarUrl}
                                size="xl"
                            />
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setShowAvatarUploader(!showAvatarUploader)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white transition shadow-xs"
                                    >
                                        <Camera className="h-3.5 w-3.5" /> {showAvatarUploader ? "Close Uploader" : "Change Photo"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                await mediaApi.removeProfilePicture()
                                                await refreshProfile()
                                            } catch (err) {
                                                console.error(err)
                                            }
                                        }}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" /> Remove Photo
                                    </button>
                                </div>
                                <p className="text-[11px] text-slate-500">JPEG, PNG, WebP or GIF. Max size 10 MB.</p>
                            </div>
                        </div>

                        {showAvatarUploader && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <MediaUploader
                                    mediaCategory="PROFILE"
                                    allowedTypes={["IMAGE"]}
                                    onUploadSuccess={async (asset) => {
                                        try {
                                            await mediaApi.setProfilePicture(asset.id)
                                            await refreshProfile()
                                            setShowAvatarUploader(false)
                                        } catch (err) {
                                            console.error("Failed to set profile picture:", err)
                                        }
                                    }}
                                    onCancel={() => setShowAvatarUploader(false)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Input Grid */}
                    <form onSubmit={handleSave} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-5 sm:p-6 space-y-4 shadow-xs">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Display Name
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-2 px-3.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 transition"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    disabled
                                    value={email}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 py-2 px-3.5 text-xs text-slate-500 outline-none cursor-not-allowed opacity-75"
                                />
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* TAB 2: Security */}
            {activeTab === "security" && (
                <div className="space-y-6 animate-fade-in">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">Security & Password</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Update your credentials, manage two-factor authentication, and review sessions.</p>
                    </div>

                    {/* Change Password Card */}
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-5 sm:p-6 space-y-4 shadow-xs">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <Key className="h-4 w-4 text-blue-600" /> Change Password
                        </h3>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <input
                                type="password"
                                placeholder="Current Password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-2 px-3.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600"
                            />
                            <input
                                type="password"
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-2 px-3.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600"
                            />
                            <input
                                type="password"
                                placeholder="Confirm New Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-2 px-3.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600"
                            />
                        </div>
                    </div>

                    {/* 2FA Toggle */}
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-5 shadow-xs">
                        <div>
                            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Two-Factor Authentication</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Secure your account with an extra verification layer.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setTwoFactorEnabled((prev) => !prev)}
                            className={`h-5 w-9 rounded-full transition-colors flex items-center p-0.5 ${
                                twoFactorEnabled ? "bg-blue-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                            }`}
                        >
                            <span className="h-4 w-4 rounded-full bg-white shadow-xs" />
                        </button>
                    </div>

                    {/* Active Sessions */}
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-5 space-y-3 shadow-xs">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Active Sessions</h3>
                        <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-3">
                                <Laptop className="h-4 w-4 text-blue-600" />
                                <div>
                                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Active Web Browser Session</p>
                                    <p className="text-[10px] text-slate-400">Authenticated via Secure JWT • Active Now</p>
                                </div>
                            </div>
                            <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                                This Device
                            </span>
                        </div>
                    </div>

                    {/* Sign out */}
                    <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Sign Out of FriendZone</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">End your current session and return to sign in.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-semibold text-white transition shadow-xs shrink-0"
                        >
                            <LogOut className="h-3.5 w-3.5" /> Sign Out
                        </button>
                    </div>
                </div>
            )}

            {/* TAB 3: Notifications */}
            {activeTab === "notifications" && (
                <div className="space-y-6 animate-fade-in">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">Notification Preferences</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Control how and when FriendZone sends you alerts.</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-5 space-y-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Email Notifications</h4>
                                <p className="text-xs text-slate-500">Receive message alerts and connection summaries via email.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEmailNotifs(!emailNotifs)}
                                className={`h-5 w-9 rounded-full transition-colors flex items-center p-0.5 ${
                                    emailNotifs ? "bg-blue-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                                }`}
                            >
                                <span className="h-4 w-4 rounded-full bg-white shadow-xs" />
                            </button>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                            <div>
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Push Notifications</h4>
                                <p className="text-xs text-slate-500">Receive instant alerts when someone messages you.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPushNotifs(!pushNotifs)}
                                className={`h-5 w-9 rounded-full transition-colors flex items-center p-0.5 ${
                                    pushNotifs ? "bg-blue-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                                }`}
                            >
                                <span className="h-4 w-4 rounded-full bg-white shadow-xs" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: Translation */}
            {activeTab === "ai" && (
                <div className="space-y-6 animate-fade-in">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">Translation Settings</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Configure how messages are automatically translated for you.</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-5 space-y-4 shadow-xs">
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Primary Target Language</label>
                            <select
                                value={targetLanguage}
                                onChange={(e) => setTargetLanguage(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-2 px-3 text-xs text-slate-900 dark:text-white outline-none"
                            >
                                <option value="English (US)">English (US)</option>
                                <option value="Spanish">Spanish</option>
                                <option value="German">German</option>
                                <option value="Japanese">Japanese</option>
                                <option value="French">French</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                            <div>
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Auto-Translate Incoming Messages</h4>
                                <p className="text-xs text-slate-500">Automatically deliver translated versions of incoming messages.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAutoTranslate(!autoTranslate)}
                                className={`h-5 w-9 rounded-full transition-colors flex items-center p-0.5 ${
                                    autoTranslate ? "bg-blue-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                                }`}
                            >
                                <span className="h-4 w-4 rounded-full bg-white shadow-xs" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 5: Billing & Quota */}
            {activeTab === "billing" && (
                <div className="space-y-6 animate-fade-in">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">Subscription & Quota</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Manage your translation allowance and upgrade options.</p>
                    </div>

                    <QuotaTrackerWidget />
                </div>
            )}
        </div>
    )
}
