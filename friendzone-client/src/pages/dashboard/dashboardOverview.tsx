import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import {
    MessageSquare,
    Globe,
    CheckCircle2,
    Users,
    ChevronRight,
    Loader2,
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { conversationsApi, friendshipsApi } from "../../services/api"
import { onUserStatusChanged, requestUserStatus, onUserStatusResponse } from "../../services/socket"
import QuotaTrackerWidget from "../../components/QuotaTrackerWidget"

interface MetricItem {
    title: string
    value: string
    subtitle?: string
    icon: any
}

interface RecentConvItem {
    id: string
    name: string
    avatar: string
    lastMessage: string
    time: string
    sourceLang: string
    targetLang: string
}

interface ActiveFriendItem {
    id: string
    name: string
    lang: string
    isOnline: boolean
}

export default function DashboardOverview() {
    const { user } = useAuth()
    const [isLoading, setIsLoading] = useState(true)
    const [conversations, setConversations] = useState<RecentConvItem[]>([])
    const [friends, setFriends] = useState<ActiveFriendItem[]>([])
    const [totalConvsCount, setTotalConvsCount] = useState(0)
    const [userPresence, setUserPresence] = useState<Record<string, boolean>>({})

    const loadDashboardData = async () => {
        setIsLoading(true)
        try {
            // 1. Fetch Conversations
            const rawConvs = await conversationsApi.getConversations()
            setTotalConvsCount(rawConvs?.length || 0)

            const mappedConvs: RecentConvItem[] = (rawConvs || []).slice(0, 5).map((c: any) => {
                const otherMember = c.members?.find((m: any) => m.userId !== user?.id)?.user
                return {
                    id: c.id,
                    name: c.title || otherMember?.displayName || otherMember?.email?.split("@")?.[0] || "Chat",
                    avatar: otherMember?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
                    lastMessage: c.messages?.[0]?.contentOriginal || "No messages yet",
                    time: c.messages?.[0]?.createdAt
                        ? new Date(c.messages[0].createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "New",
                    sourceLang: (otherMember?.nativeLanguage || "en").toUpperCase(),
                    targetLang: (user?.nativeLanguage || "en").toUpperCase(),
                }
            })
            setConversations(mappedConvs)

            // 2. Fetch Friends List
            const rawFriends = await friendshipsApi.getFriends()
            const mappedFriends: ActiveFriendItem[] = (rawFriends || []).map((f: any) => ({
                id: f.id,
                name: f.displayName || f.email?.split("@")?.[0] || "Friend",
                lang: (f.nativeLanguage || "en").toUpperCase(),
                isOnline: false,
            }))
            setFriends(mappedFriends)

            // Query online presence for friends
            const friendIds = mappedFriends.map((f) => f.id)
            if (friendIds.length > 0) {
                requestUserStatus(friendIds)
            }
        } catch {
            setConversations([])
            setFriends([])
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

    const onlineCount = friends.filter((f) => userPresence[f.id] ?? false).length

    const METRICS: MetricItem[] = [
        {
            title: "Active Conversations",
            value: totalConvsCount.toString(),
            subtitle: "Total open chats",
            icon: MessageSquare,
        },
        {
            title: "My Connections",
            value: friends.length.toString(),
            subtitle: "Connected friends",
            icon: Users,
        },
        {
            title: "Online Now",
            value: onlineCount.toString(),
            subtitle: "Active presence",
            icon: Globe,
        },
        {
            title: "Native Language",
            value: (user?.nativeLanguage || "EN").toUpperCase(),
            subtitle: "Translation preference",
            icon: CheckCircle2,
        },
    ]

    return (
        <div className="p-6 lg:p-8 space-y-8 text-left max-w-7xl mx-auto">
            {/* Top Overview Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white sm:text-3xl">
                        Welcome back, {user?.name || "User"}
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-gray-400">
                        Manage your cross-language conversations and social connections.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        to="/chats"
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                    >
                        <MessageSquare className="h-4 w-4" />
                        Open Messages
                    </Link>
                </div>
            </div>

            {/* Translation Quota & Subscription Tracker Widget */}
            <QuotaTrackerWidget />

            {/* Metrics Overview Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {METRICS.map((metric) => {
                    const Icon = metric.icon
                    return (
                        <div
                            key={metric.title}
                            className="rounded-2xl border border-white/10 bg-[#11131f] p-5 transition hover:border-white/20"
                        >
                            <div className="flex items-center justify-between">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                                    <Icon className="h-4.5 w-4.5" />
                                </span>
                            </div>

                            <div className="mt-4">
                                <p className="text-[11px] font-medium tracking-wider text-gray-400 uppercase">
                                    {metric.title}
                                </p>
                                <p className="mt-1 text-2xl font-bold text-white tracking-tight">
                                    {metric.value}
                                </p>
                                {metric.subtitle && (
                                    <p className="mt-0.5 text-xs text-gray-500">{metric.subtitle}</p>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Main Section Split Grid */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                {/* Left Main Column (8 cols) */}
                <div className="space-y-6 lg:col-span-8">
                    {/* Recent Conversations Card */}
                    <div className="rounded-2xl border border-white/10 bg-[#11131f] p-6">
                        <div className="flex items-center justify-between pb-4 border-b border-white/10">
                            <h2 className="text-base font-semibold text-white">Recent Conversations</h2>
                            <Link
                                to="/chats"
                                className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300"
                            >
                                View All
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>

                        {isLoading ? (
                            <div className="flex h-32 w-full items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                            </div>
                        ) : conversations.length === 0 ? (
                            <div className="flex h-32 flex-col items-center justify-center text-center">
                                <MessageSquare className="h-8 w-8 text-gray-600 mb-2" />
                                <p className="text-xs text-gray-400">No active conversations yet.</p>
                                <Link to="/contacts" className="text-xs text-indigo-400 hover:underline mt-1 font-semibold">
                                    Find people & start chatting →
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3 mt-4">
                                {conversations.map((msg) => (
                                    <Link
                                        key={msg.id}
                                        to="/chats"
                                        className="flex flex-col gap-2 rounded-xl border border-white/5 bg-[#171a2b] p-4 transition hover:border-white/15 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={msg.avatar}
                                                alt={msg.name}
                                                className="h-9 w-9 rounded-full object-cover border border-white/10"
                                            />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-white">{msg.name}</span>
                                                    <span className="text-[11px] text-gray-500">{msg.time}</span>
                                                </div>
                                                <p className="text-xs text-gray-300 line-clamp-1">{msg.lastMessage}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-start sm:self-center">
                                            <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                                                {msg.sourceLang} → {msg.targetLang}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column (4 cols) */}
                <div className="space-y-6 lg:col-span-4">
                    {/* Active Friends Card */}
                    <div className="rounded-2xl border border-white/10 bg-[#11131f] p-6">
                        <div className="flex items-center justify-between pb-4 border-b border-white/10">
                            <h3 className="text-base font-semibold text-white">Friends</h3>
                            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                                {onlineCount} Online
                            </span>
                        </div>

                        {isLoading ? (
                            <div className="flex h-32 items-center justify-center">
                                <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                            </div>
                        ) : friends.length === 0 ? (
                            <div className="flex h-32 flex-col items-center justify-center text-center">
                                <Users className="h-8 w-8 text-gray-600 mb-2" />
                                <p className="text-xs text-gray-400">No friends added yet.</p>
                            </div>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {friends.map((friend) => {
                                    const isOnline = userPresence[friend.id] ?? false
                                    return (
                                        <div key={friend.id} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0 pb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
                                                        {friend.name[0]}
                                                    </div>
                                                    <span
                                                        className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-[#11131f] ${
                                                            isOnline ? "bg-emerald-500" : "bg-gray-600"
                                                        }`}
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-white">{friend.name}</p>
                                                    <p className="text-[11px] text-gray-400">Native: {friend.lang}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
