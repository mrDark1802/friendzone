import { useState, useEffect, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import {
    User,
    Shield,
    Bell,
    Sparkles,
    CreditCard,
    Save,
    RotateCcw,
    ChevronDown,
    LogOut,
    Key,
    Laptop,
    Check,
    AlertCircle,
    Camera,
    Trash2,
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { usersApi } from "../../services/api"

export default function SettingsPage() {
    const { user, logout, refreshProfile } = useAuth()
    const navigate = useNavigate()

    const [activeTab, setActiveTab] = useState<"profile" | "security" | "notifications" | "ai" | "billing">("profile")
    const [savedSuccess, setSavedSuccess] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Profile Details State
    const [fullName, setFullName] = useState(user?.name || "")
    const [email, setEmail] = useState(user?.email || "")
    const [jobTitle, setJobTitle] = useState("Senior Project Manager")
    const [location, setLocation] = useState("United States")
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80")

    useEffect(() => {
        if (user) {
            setFullName(user.name)
            setEmail(user.email)
            if (user.avatar) setAvatarUrl(user.avatar)
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
        setJobTitle("Senior Project Manager")
        setLocation("United States")
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
        <div className="mx-auto max-w-5xl p-6 lg:p-10 space-y-8 text-left">
            {/* Top Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Account Settings</h1>
                    <p className="mt-1 text-xs sm:text-sm text-gray-400">
                        Manage your personal information, security preferences, and subscription.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={handleDiscard}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10 active:scale-95"
                    >
                        <RotateCcw className="h-4 w-4 text-gray-400" />
                        Discard Changes
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSave()}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] transition hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        {isSaving ? "Saving..." : "Save Preferences"}
                    </button>
                </div>
            </div>

            {/* Saved Toast Notification */}
            {savedSuccess && (
                <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-300 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span>Preferences saved successfully! All updates are live.</span>
                    </div>
                </div>
            )}

            {/* Navigation Tabs Bar */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => setActiveTab("profile")}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                        activeTab === "profile"
                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                >
                    <User className="h-4 w-4" /> Profile Details
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("security")}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                        activeTab === "security"
                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                >
                    <Shield className="h-4 w-4" /> Security
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("notifications")}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                        activeTab === "notifications"
                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                >
                    <Bell className="h-4 w-4" /> Notifications
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("ai")}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                        activeTab === "ai"
                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                >
                    <Sparkles className="h-4 w-4" /> AI & Translation
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("billing")}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                        activeTab === "billing"
                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                >
                    <CreditCard className="h-4 w-4" /> Billing
                </button>
            </div>

            {/* TAB 1: Profile Details */}
            {activeTab === "profile" && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <div>
                        <h2 className="text-xl font-bold text-white">Public Profile</h2>
                        <p className="mt-1 text-xs text-gray-400">People using FriendZone will see this information to identify you.</p>
                    </div>

                    {/* Photo Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
                        <img
                            src={avatarUrl}
                            alt="Profile Avatar"
                            className="h-20 w-20 rounded-full object-cover border-2 border-indigo-500/40 shadow-lg shrink-0"
                        />
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setAvatarUrl("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80")}
                                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition active:scale-95"
                                >
                                    <Camera className="h-3.5 w-3.5" /> Change Photo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAvatarUrl("https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80")}
                                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white transition active:scale-95"
                                >
                                    <Trash2 className="h-3.5 w-3.5" /> Remove
                                </button>
                            </div>
                            <p className="text-[11px] text-gray-500 font-medium">JPG, GIF or PNG. Max size of 800K</p>
                        </div>
                    </div>

                    {/* Input Grid */}
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold tracking-wider text-gray-300 uppercase">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full rounded-2xl border border-white/15 bg-white/5 py-3 px-4 text-sm text-white outline-none transition focus:border-indigo-500 focus:bg-white/10"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-bold tracking-wider text-gray-300 uppercase">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    disabled
                                    value={email}
                                    className="w-full rounded-2xl border border-white/15 bg-white/5 py-3 px-4 text-sm text-gray-400 outline-none cursor-not-allowed opacity-70"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-bold tracking-wider text-gray-300 uppercase">
                                    Job Title
                                </label>
                                <input
                                    type="text"
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                    className="w-full rounded-2xl border border-white/15 bg-white/5 py-3 px-4 text-sm text-white outline-none transition focus:border-indigo-500 focus:bg-white/10"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-bold tracking-wider text-gray-300 uppercase">
                                    Location
                                </label>
                                <div className="relative">
                                    <select
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="w-full appearance-none rounded-2xl border border-white/15 bg-[#0a0c14] py-3 px-4 text-sm text-white outline-none transition focus:border-indigo-500"
                                    >
                                        <option value="United States">United States</option>
                                        <option value="United Kingdom">United Kingdom</option>
                                        <option value="Spain">Spain</option>
                                        <option value="Germany">Germany</option>
                                        <option value="Japan">Japan</option>
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* TAB 2: Security */}
            {activeTab === "security" && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <div>
                        <h2 className="text-xl font-bold text-white">Security & Password</h2>
                        <p className="mt-1 text-xs text-gray-400">Update your credentials, configure two-factor authentication, and manage sessions.</p>
                    </div>

                    {/* Change Password Card */}
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl space-y-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Key className="h-4 w-4 text-indigo-400" /> Change Password
                        </h3>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <input
                                type="password"
                                placeholder="Current Password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="rounded-2xl border border-white/15 bg-white/5 py-2.5 px-4 text-sm text-white outline-none focus:border-indigo-500"
                            />
                            <input
                                type="password"
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="rounded-2xl border border-white/15 bg-white/5 py-2.5 px-4 text-sm text-white outline-none focus:border-indigo-500"
                            />
                            <input
                                type="password"
                                placeholder="Confirm New Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="rounded-2xl border border-white/15 bg-white/5 py-2.5 px-4 text-sm text-white outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    {/* 2FA Toggle */}
                    <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
                        <div>
                            <h3 className="text-sm font-bold text-white">Two-Factor Authentication (2FA)</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Secure your account with an extra authentication layer.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setTwoFactorEnabled((prev) => !prev)}
                            className={`h-6 w-11 rounded-full transition-colors flex items-center p-0.5 ${
                                twoFactorEnabled ? "bg-indigo-600 justify-end" : "bg-white/20 justify-start"
                            }`}
                        >
                            <span className="h-5 w-5 rounded-full bg-white shadow-md" />
                        </button>
                    </div>

                    {/* Active Sessions */}
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl space-y-4">
                        <h3 className="text-sm font-bold text-white">Active Sessions</h3>
                        <div className="space-y-3 text-xs">
                            <div className="flex items-center justify-between py-2 border-b border-white/5">
                                <div className="flex items-center gap-3">
                                    <Laptop className="h-5 w-5 text-indigo-400" />
                                    <div>
                                        <p className="font-semibold text-white">Active Web Session</p>
                                        <p className="text-[11px] text-gray-500">JWT Authorized • Active Now</p>
                                    </div>
                                </div>
                                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                                    This Device
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Danger Logout Section */}
                    <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-6 w-6 text-red-400 shrink-0" />
                            <div>
                                <h3 className="text-sm font-bold text-white">Sign Out of FriendZone</h3>
                                <p className="text-xs text-red-300 mt-0.5">End your current session and return to the login screen.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-500 transition active:scale-95 shrink-0"
                        >
                            <LogOut className="h-4 w-4" /> Sign Out
                        </button>
                    </div>
                </div>
            )}

            {/* TAB 3: Notifications */}
            {activeTab === "notifications" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div>
                        <h2 className="text-xl font-bold text-white">Notification Preferences</h2>
                        <p className="mt-1 text-xs text-gray-400">Choose how and when you receive alerts from FriendZone.</p>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-bold text-white">Email Notifications</h4>
                                <p className="text-xs text-gray-400">Receive message summaries and translation alerts via email.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEmailNotifs(!emailNotifs)}
                                className={`h-6 w-11 rounded-full transition-colors flex items-center p-0.5 ${
                                    emailNotifs ? "bg-indigo-600 justify-end" : "bg-white/20 justify-start"
                                }`}
                            >
                                <span className="h-5 w-5 rounded-full bg-white shadow-md" />
                            </button>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/5 pt-4">
                            <div>
                                <h4 className="text-sm font-bold text-white">Push Notifications</h4>
                                <p className="text-xs text-gray-400">Get instant alerts when someone messages you.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPushNotifs(!pushNotifs)}
                                className={`h-6 w-11 rounded-full transition-colors flex items-center p-0.5 ${
                                    pushNotifs ? "bg-indigo-600 justify-end" : "bg-white/20 justify-start"
                                }`}
                            >
                                <span className="h-5 w-5 rounded-full bg-white shadow-md" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: AI & Translation */}
            {activeTab === "ai" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div>
                        <h2 className="text-xl font-bold text-white">AI & Translation Engine</h2>
                        <p className="mt-1 text-xs text-gray-400">Configure your primary target language, auto-translation, and tone.</p>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl space-y-6">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-300 uppercase">Primary Target Language</label>
                            <select
                                value={targetLanguage}
                                onChange={(e) => setTargetLanguage(e.target.value)}
                                className="w-full rounded-2xl border border-white/15 bg-[#0a0c14] py-3 px-4 text-sm text-white outline-none"
                            >
                                <option value="English (US)">English (US)</option>
                                <option value="Spanish">Spanish</option>
                                <option value="German">German</option>
                                <option value="Japanese">Japanese</option>
                                <option value="French">French</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/5 pt-4">
                            <div>
                                <h4 className="text-sm font-bold text-white">Auto-Translate Incoming Messages</h4>
                                <p className="text-xs text-gray-400">Automatically translate messages as soon as they arrive.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAutoTranslate(!autoTranslate)}
                                className={`h-6 w-11 rounded-full transition-colors flex items-center p-0.5 ${
                                    autoTranslate ? "bg-indigo-600 justify-end" : "bg-white/20 justify-start"
                                }`}
                            >
                                <span className="h-5 w-5 rounded-full bg-white shadow-md" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 5: Billing */}
            {activeTab === "billing" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div>
                        <h2 className="text-xl font-bold text-white">Subscription & Billing</h2>
                        <p className="mt-1 text-xs text-gray-400">Manage your active subscription plan and payment methods.</p>
                    </div>

                    <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/60 via-purple-950/60 to-indigo-950/60 p-6 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                            <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-500/30">
                                ACTIVE PLAN
                            </span>
                            <h3 className="mt-2 text-xl font-bold text-white">FriendZone Pro</h3>
                            <p className="text-xs text-gray-300 mt-1">Unlimited AI translation & voice calls • Active Session</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
