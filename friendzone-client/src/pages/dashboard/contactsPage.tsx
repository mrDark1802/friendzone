import { useState, useEffect } from "react"
import {
    Search,
    UserPlus,
    MessageSquare,
    Shield,
    Loader2,
    Users,
    UserCheck,
    Clock,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { usersApi, friendshipsApi, conversationsApi } from "../../services/api"
import { UserAvatar } from "../../components/common/UserAvatar"
import { COUNTRIES } from "../../constants/countries"
import { LANGUAGES } from "../../constants/languages"

interface ContactUser {
    id: string
    displayName: string
    username: string
    email: string
    avatar?: string
    profileMediaId?: string | null
    countryCode?: string
    nativeLanguage: string
    friendshipStatus?: "NONE" | "PENDING" | "ACCEPTED"
}

export default function ContactsPage() {
    const navigate = useNavigate()
    const [friends, setFriends] = useState<ContactUser[]>([])
    const [searchResults, setSearchResults] = useState<ContactUser[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState<"friends" | "search">("friends")
    const [isLoading, setIsLoading] = useState(true)
    const [actionMsg, setActionMsg] = useState<string | null>(null)

    const loadFriends = async () => {
        setIsLoading(true)
        try {
            const data = await friendshipsApi.getFriends()
            setFriends(data || [])
        } catch {
            setFriends([])
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadFriends()
    }, [])

    const handleSearch = async (query: string) => {
        setSearchQuery(query)
        if (!query.trim()) {
            setSearchResults([])
            return
        }
        try {
            const results = await usersApi.searchUsers(query)
            setSearchResults(results || [])
        } catch {
            setSearchResults([])
        }
    }

    const showToast = (msg: string) => {
        setActionMsg(msg)
        setTimeout(() => setActionMsg(null), 3000)
    }

    const handleSendRequest = async (targetUserId: string) => {
        try {
            setSearchResults((prev) =>
                prev.map((u) => (u.id === targetUserId ? { ...u, friendshipStatus: "PENDING" } : u))
            )
            await friendshipsApi.sendRequest(targetUserId)
            showToast("Friend request sent successfully!")
        } catch (err: any) {
            showToast(err.message || "Failed to send friend request.")
        }
    }

    const handleBlockUser = async (targetUserId: string) => {
        try {
            await friendshipsApi.blockUser(targetUserId)
            setFriends((prev) => prev.filter((f) => f.id !== targetUserId))
            showToast("User blocked.")
        } catch {
            // Ignore
        }
    }

    const getUsernameHandle = (u: { username?: string; email?: string; displayName?: string }) => {
        if (u.username && u.username.trim() && u.username !== "user") {
            return u.username.startsWith("@") ? u.username : `@${u.username}`
        }
        if (u.email && u.email.includes("@")) {
            const handle = u.email.split("@")[0]
            if (handle && handle !== "user") return `@${handle}`
        }
        if (u.displayName) {
            const handle = u.displayName.toLowerCase().replace(/[^a-z0-9_]/g, "")
            if (handle) return `@${handle}`
        }
        return "@user"
    }

    const getCountryDisplay = (code?: string) => {
        if (!code) return { flag: "🌐", name: "International" }
        const found = COUNTRIES.find((c) => c.code.toUpperCase() === code.toUpperCase())
        return found ? { flag: found.flag, name: found.name } : { flag: "🌍", name: code }
    }

    const getLanguageName = (code: string) => {
        const found = LANGUAGES.find((l) => l.code.toLowerCase() === code.toLowerCase())
        return found?.name || code?.toUpperCase() || "EN"
    }

    const handleStartChat = async (targetUserId: string) => {
        try {
            const conv = await conversationsApi.createDirect(targetUserId)
            if (conv?.id) {
                localStorage.setItem("fz_active_conv_id", conv.id)
                navigate(`/chats?id=${conv.id}`)
                return
            }
            navigate("/chats")
        } catch {
            navigate("/chats")
        }
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 text-left max-w-6xl mx-auto animate-fade-in">
            {/* Toast Banner */}
            {actionMsg && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-900 dark:text-white shadow-lg animate-fade-in">
                    {actionMsg}
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    People & Connections
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Discover language exchange partners and manage your friendships worldwide.
                </p>
            </div>

            {/* Search Bar & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab("friends")}
                        className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                            activeTab === "friends"
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                    >
                        <UserCheck className="h-4 w-4" /> My Friends ({friends.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("search")}
                        className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                            activeTab === "search"
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                    >
                        <Users className="h-4 w-4" /> Find People
                    </button>
                </div>

                <div className="relative w-full sm:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            if (activeTab !== "search") setActiveTab("search")
                            handleSearch(e.target.value)
                        }}
                        placeholder="Search by name, handle, or country..."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0e121d] py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-600"
                    />
                </div>
            </div>

            {/* Content Cards Grid */}
            {isLoading ? (
                <div className="flex h-48 w-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
            ) : activeTab === "friends" ? (
                friends.length === 0 ? (
                    <div className="flex h-48 w-full flex-col items-center justify-center text-center rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-8">
                        <Users className="h-8 w-8 text-slate-400 mb-2" />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No friends added yet</p>
                        <p className="text-xs text-slate-500 mt-1">Switch to "Find People" to meet new language partners across the globe.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                        {friends.map((friend) => {
                            const country = getCountryDisplay(friend.countryCode)
                            const nativeLang = getLanguageName(friend.nativeLanguage)

                            return (
                                <div
                                    key={friend.id}
                                    className="flex flex-col justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
                                >
                                    <div className="flex items-start gap-3">
                                        <UserAvatar
                                            displayName={friend.displayName}
                                            profileMediaId={friend.profileMediaId}
                                            avatarUrl={(friend as any)?.avatar || (friend as any)?.avatarUrl}
                                            size="md"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 truncate">
                                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                    {friend.displayName}
                                                </h3>
                                                <span className="text-xs" title={country.name}>
                                                    {country.flag}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                {getUsernameHandle(friend)}
                                            </p>
                                            <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                                                <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-medium text-slate-600 dark:text-slate-300">
                                                    Speaks: {nativeLang}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                                        <button
                                            type="button"
                                            onClick={() => handleStartChat(friend.id)}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 py-1.5 text-xs font-semibold text-white transition shadow-xs"
                                        >
                                            <MessageSquare className="h-3.5 w-3.5" /> Message
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleBlockUser(friend.id)}
                                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2 text-slate-400 hover:text-rose-600 transition"
                                            title="Block user"
                                        >
                                            <Shield className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )
            ) : searchResults.length === 0 ? (
                <div className="flex h-48 w-full flex-col items-center justify-center text-center rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-8">
                    <Search className="h-8 w-8 text-slate-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {searchQuery ? `No users matching "${searchQuery}"` : "Type a name or username to find members"}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                    {searchResults.map((user) => {
                        const country = getCountryDisplay(user.countryCode)
                        const nativeLang = getLanguageName(user.nativeLanguage)

                        return (
                            <div
                                key={user.id}
                                className="flex flex-col justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
                            >
                                <div className="flex items-start gap-3">
                                    <UserAvatar
                                        displayName={user.displayName}
                                        profileMediaId={user.profileMediaId}
                                        avatarUrl={(user as any)?.avatar || (user as any)?.avatarUrl}
                                        size="md"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 truncate">
                                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                {user.displayName}
                                            </h3>
                                            <span className="text-xs" title={country.name}>
                                                {country.flag}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                            {getUsernameHandle(user)}
                                        </p>
                                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                                            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-medium text-slate-600 dark:text-slate-300">
                                                Speaks: {nativeLang}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                                    {user.friendshipStatus === "ACCEPTED" ? (
                                        <button
                                            type="button"
                                            onClick={() => handleStartChat(user.id)}
                                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 py-1.5 text-xs font-semibold text-white transition shadow-xs"
                                        >
                                            <MessageSquare className="h-3.5 w-3.5" /> Start Chat
                                        </button>
                                    ) : user.friendshipStatus === "PENDING" ? (
                                        <button
                                            type="button"
                                            disabled
                                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 py-1.5 text-xs font-medium text-slate-500 cursor-not-allowed"
                                        >
                                            <Clock className="h-3.5 w-3.5" /> Request Pending
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleSendRequest(user.id)}
                                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 py-1.5 text-xs font-semibold text-white transition shadow-xs"
                                        >
                                            <UserPlus className="h-3.5 w-3.5" /> Add Friend
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
