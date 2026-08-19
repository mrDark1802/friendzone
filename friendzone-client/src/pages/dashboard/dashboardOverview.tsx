import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
    MessageSquare,
    Users,
    ChevronRight,
    Loader2,
    UserPlus,
    Compass,
    Check,
    Clock,
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { conversationsApi, friendshipsApi, usersApi } from "../../services/api"
import { onUserStatusChanged, requestUserStatus, onUserStatusResponse } from "../../services/socket"
import { COUNTRIES } from "../../constants/countries"
import { LANGUAGES } from "../../constants/languages"
import QuotaTrackerWidget from "../../components/QuotaTrackerWidget"
import { UserAvatar } from "../../components/common/UserAvatar"

interface RecentConvItem {
    id: string
    name: string
    avatar?: string
    profileMediaId?: string | null
    lastMessage: string
    time: string
    sourceLang: string
    targetLang: string
}

interface ActiveFriendItem {
    id: string
    name: string
    username?: string
    countryCode?: string
    lang: string
    profileMediaId?: string | null
    avatar?: string
    isOnline: boolean
}

interface DiscoverUserItem {
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

export default function DashboardOverview() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(true)
    const [conversations, setConversations] = useState<RecentConvItem[]>([])
    const [friends, setFriends] = useState<ActiveFriendItem[]>([])
    const [discoverUsers, setDiscoverUsers] = useState<DiscoverUserItem[]>([])
    const [userPresence, setUserPresence] = useState<Record<string, boolean>>({})
    const [actionMsg, setActionMsg] = useState<string | null>(null)

    const showToast = (msg: string) => {
        setActionMsg(msg)
        setTimeout(() => setActionMsg(null), 3000)
    }

    const loadDashboardData = async () => {
        setIsLoading(true)
        try {
            // 1. Fetch Conversations, Friends, and Discoverable Users in parallel
            const [rawConvs, rawFriends, rawDiscover] = await Promise.allSettled([
                conversationsApi.getConversations(),
                friendshipsApi.getFriends(),
                usersApi.searchUsers(""),
            ])

            if (rawConvs.status === "fulfilled" && Array.isArray(rawConvs.value)) {
                const mappedConvs: RecentConvItem[] = rawConvs.value.slice(0, 5).map((c: any) => {
                    const otherMember = c.members?.find((m: any) => m.userId !== user?.id)?.user
                    return {
                        id: c.id,
                        name: c.title || otherMember?.displayName || otherMember?.email?.split("@")?.[0] || "Chat",
                        profileMediaId: otherMember?.profileMediaId || null,
                        lastMessage: c.messages?.[0]?.contentOriginal || "No messages yet",
                        time: c.messages?.[0]?.createdAt
                            ? new Date(c.messages[0].createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : "New",
                        sourceLang: (otherMember?.nativeLanguage || "en").toUpperCase(),
                        targetLang: (user?.nativeLanguage || "en").toUpperCase(),
                    }
                })
                setConversations(mappedConvs)
            }

            let loadedFriendIds: string[] = []
            if (rawFriends.status === "fulfilled" && Array.isArray(rawFriends.value)) {
                const mappedFriends: ActiveFriendItem[] = rawFriends.value.map((f: any) => ({
                    id: f.id,
                    name: f.displayName || f.email?.split("@")?.[0] || "Friend",
                    username: f.username,
                    countryCode: f.countryCode,
                    profileMediaId: f.profileMediaId || null,
                    avatar: f.avatar,
                    lang: (f.nativeLanguage || "en").toUpperCase(),
                    isOnline: false,
                }))
                setFriends(mappedFriends)
                loadedFriendIds = mappedFriends.map((f) => f.id)
            }

            if (rawDiscover.status === "fulfilled" && Array.isArray(rawDiscover.value)) {
                // Filter out self and limit to top 6 discoverable profiles
                const filtered = rawDiscover.value
                    .filter((u: any) => u.id !== user?.id)
                    .slice(0, 6)
                    .map((u: any) => ({
                        id: u.id,
                        displayName: u.displayName || u.name || "Member",
                        username: u.username || u.email?.split("@")?.[0] || "user",
                        email: u.email,
                        avatar: u.avatar,
                        profileMediaId: u.profileMediaId || null,
                        countryCode: u.countryCode,
                        nativeLanguage: (u.nativeLanguage || "en").toLowerCase(),
                        friendshipStatus: u.friendshipStatus || "NONE",
                    }))
                setDiscoverUsers(filtered)
            }

            // Query online presence for friends
            if (loadedFriendIds.length > 0) {
                requestUserStatus(loadedFriendIds)
            }
        } catch {
            setConversations([])
            setFriends([])
            setDiscoverUsers([])
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadDashboardData()

        onUserStatusChanged(({ userId, status }) => {
            setUserPresence((prev) => ({ ...prev, [userId]: status === "ONLINE" }))
        })

        onUserStatusResponse((statusArray) => {
            const map: Record<string, boolean> = {}
            statusArray.forEach((item) => {
                map[item.userId] = item.isOnline
            })
            setUserPresence((prev) => ({ ...prev, ...map }))
        })
    }, [])

    const handleSendFriendRequest = async (targetUserId: string) => {
        try {
            setDiscoverUsers((prev) =>
                prev.map((u) => (u.id === targetUserId ? { ...u, friendshipStatus: "PENDING" } : u))
            )
            await friendshipsApi.sendRequest(targetUserId)
            showToast("Friend request sent!")
        } catch (err: any) {
            showToast(err.message || "Failed to send request.")
        }
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

    const getCountryDisplay = (code?: string) => {
        if (!code) return { flag: "🌐", name: "International" }
        const found = COUNTRIES.find((c) => c.code.toUpperCase() === code.toUpperCase())
        return found ? { flag: found.flag, name: found.name } : { flag: "🌍", name: code }
    }

    const getLanguageName = (code: string) => {
        const found = LANGUAGES.find((l) => l.code.toLowerCase() === code.toLowerCase())
        return found?.name || code.toUpperCase()
    }

    const userNativeLangName = getLanguageName(user?.nativeLanguage || "en")

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 text-left max-w-6xl mx-auto animate-fade-in">
            {/* Global Toast */}
            {actionMsg && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-900 dark:text-white shadow-lg animate-fade-in">
                    {actionMsg}
                </div>
            )}

            {/* 1. Welcoming Hero Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-5 sm:p-6 shadow-xs">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Welcome back, {user?.name || "Friend"} 👋
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Your messages are automatically translated to <strong className="text-slate-800 dark:text-slate-200">{userNativeLangName}</strong>. Connect with people worldwide without language barriers.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    <Link
                        to="/chats"
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white transition shadow-xs"
                    >
                        <MessageSquare className="h-4 w-4" />
                        Open Messages
                    </Link>
                    <Link
                        to="/contacts"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
                    >
                        <Users className="h-4 w-4" />
                        Directory
                    </Link>
                </div>
            </div>

            {/* 2. Friends Online Presence Bar */}
            {friends.length > 0 && (
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-4 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                Friends Online & Active ({friends.filter((f) => userPresence[f.id]).length})
                            </h2>
                        </div>
                        <Link
                            to="/contacts"
                            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            View all ({friends.length})
                        </Link>
                    </div>

                    <div className="flex items-center gap-3 overflow-x-auto pt-3 pb-1 no-scrollbar">
                        {friends.map((friend) => {
                            const isOnline = userPresence[friend.id] ?? false
                            return (
                                <button
                                    key={friend.id}
                                    type="button"
                                    onClick={() => handleStartChat(friend.id)}
                                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group shrink-0 min-w-[76px]"
                                    title={`Chat with ${friend.name}`}
                                >
                                    <UserAvatar
                                        displayName={friend.name}
                                        profileMediaId={friend.profileMediaId}
                                        avatarUrl={friend.avatar}
                                        size="md"
                                        isOnline={isOnline}
                                        showStatus={true}
                                    />
                                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate max-w-[70px] group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                        {friend.name.split(" ")[0]}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* 3. Discover People Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Compass className="h-4.5 w-4.5 text-blue-600" />
                            Discover People
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Meet people from different countries and cultures.
                        </p>
                    </div>

                    <Link
                        to="/contacts"
                        className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700"
                    >
                        Browse all people
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                </div>

                {isLoading ? (
                    <div className="flex h-36 items-center justify-center rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d]">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                ) : discoverUsers.length === 0 ? (
                    <div className="flex h-36 flex-col items-center justify-center text-center rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-6">
                        <Users className="h-8 w-8 text-slate-400 mb-2" />
                        <p className="text-xs text-slate-500">No new members to discover right now.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {discoverUsers.map((person) => {
                            const country = getCountryDisplay(person.countryCode)
                            const nativeLang = getLanguageName(person.nativeLanguage)

                            return (
                                <div
                                    key={person.id}
                                    className="flex flex-col justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
                                >
                                    <div className="flex items-start gap-3">
                                        <UserAvatar
                                            displayName={person.displayName}
                                            profileMediaId={person.profileMediaId}
                                            avatarUrl={person.avatar}
                                            size="md"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 truncate">
                                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                    {person.displayName}
                                                </h3>
                                                <span className="text-xs" title={country.name}>
                                                    {country.flag}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                @{person.username}
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
                                            onClick={() => handleStartChat(person.id)}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 py-1.5 text-xs font-semibold text-white transition shadow-xs"
                                        >
                                            <MessageSquare className="h-3.5 w-3.5" /> Message
                                        </button>

                                        {person.friendshipStatus === "PENDING" ? (
                                            <button
                                                type="button"
                                                disabled
                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-500 cursor-not-allowed"
                                            >
                                                <Clock className="h-3.5 w-3.5" /> Sent
                                            </button>
                                        ) : person.friendshipStatus === "ACCEPTED" ? (
                                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 px-2.5 py-1.5 text-xs font-medium">
                                                <Check className="h-3.5 w-3.5" /> Friends
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleSendFriendRequest(person.id)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 transition"
                                                title="Send friend request"
                                            >
                                                <UserPlus className="h-3.5 w-3.5 text-slate-500" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* 4. Recent Conversations */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Conversations</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Continue your active cross-language chats</p>
                    </div>
                    <Link
                        to="/chats"
                        className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700"
                    >
                        View all
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                </div>

                {isLoading ? (
                    <div className="flex h-32 w-full items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="flex h-32 flex-col items-center justify-center text-center">
                        <MessageSquare className="h-8 w-8 text-slate-400 mb-2" />
                        <p className="text-xs text-slate-500">No recent conversations.</p>
                        <Link to="/contacts" className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 font-semibold">
                            Find someone to message →
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-2 mt-3">
                        {conversations.map((conv) => (
                            <Link
                                key={conv.id}
                                to={`/chats?id=${conv.id}`}
                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/40 p-3.5 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <UserAvatar
                                        displayName={conv.name}
                                        profileMediaId={conv.profileMediaId}
                                        size="sm"
                                    />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                {conv.name}
                                            </span>
                                            <span className="text-[10px] text-slate-400">{conv.time}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm">
                                            {conv.lastMessage}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                                    <span className="rounded-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                                        {conv.sourceLang} ↔ {conv.targetLang}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* 5. Secondary Translation Allowance Tracker */}
            <QuotaTrackerWidget />
        </div>
    )
}
