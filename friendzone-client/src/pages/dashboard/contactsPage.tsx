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

interface ContactUser {
    id: string
    displayName: string
    username: string
    email: string
    avatar?: string
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
            // Optimistically update status to PENDING
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
            showToast("User blocked successfully.")
        } catch {
            // Ignore
        }
    }

    const handleStartChat = async (targetUserId: string) => {
        try {
            await conversationsApi.createDirect(targetUserId)
            navigate("/chats")
        } catch {
            navigate("/chats")
        }
    }

    return (
        <div className="relative p-6 lg:p-8 space-y-8 text-left max-w-7xl mx-auto">
            {/* Toast Banner */}
            {actionMsg && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl border border-indigo-500/40 bg-[#07080d]/95 px-5 py-2.5 text-xs font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-top-2">
                    {actionMsg}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white sm:text-3xl">Contacts & Connections</h1>
                    <p className="mt-1 text-xs sm:text-sm text-gray-400">
                        Manage your connected friends and discover new contacts.
                    </p>
                </div>
            </div>

            {/* Search Bar & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => setActiveTab("friends")}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                            activeTab === "friends" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white bg-white/5"
                        }`}
                    >
                        <UserCheck className="h-4 w-4" /> My Friends ({friends.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("search")}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                            activeTab === "search" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white bg-white/5"
                        }`}
                    >
                        <Users className="h-4 w-4" /> Find People
                    </button>
                </div>

                <div className="relative w-full sm:w-72">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            if (activeTab !== "search") setActiveTab("search")
                            handleSearch(e.target.value)
                        }}
                        placeholder="Search by name or @username..."
                        className="w-full rounded-xl border border-white/15 bg-[#11131f] py-2 pl-10 pr-4 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-500"
                    />
                </div>
            </div>

            {/* Content List */}
            {isLoading ? (
                <div className="flex h-48 w-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                </div>
            ) : activeTab === "friends" ? (
                friends.length === 0 ? (
                    <div className="flex h-48 w-full flex-col items-center justify-center text-center rounded-2xl border border-white/10 bg-[#11131f] p-8">
                        <Users className="h-10 w-10 text-gray-600 mb-2" />
                        <p className="text-sm font-semibold text-gray-300">No friends added yet</p>
                        <p className="text-xs text-gray-500 mt-1">Use the search bar above to find people by name or username.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {friends.map((friend) => (
                            <div
                                key={friend.id}
                                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#11131f] p-5 transition hover:border-white/20"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={friend.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                                            alt={friend.displayName}
                                            className="h-12 w-12 rounded-full object-cover border border-white/10"
                                        />
                                        <div>
                                            <h3 className="text-sm font-bold text-white">{friend.displayName}</h3>
                                            <p className="text-xs text-indigo-400">@{friend.username || friend.email?.split("@")?.[0] || "user"}</p>
                                            <span className="text-[10px] text-gray-400 font-mono">
                                                Language: {friend.nativeLanguage?.toUpperCase() || "EN"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 flex items-center gap-2 pt-3 border-t border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => handleStartChat(friend.id)}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                                    >
                                        <MessageSquare className="h-3.5 w-3.5" /> Message
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleBlockUser(friend.id)}
                                        className="rounded-xl border border-white/10 bg-white/5 p-2 text-gray-400 hover:text-rose-400 transition"
                                        title="Block user"
                                    >
                                        <Shield className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : searchResults.length === 0 ? (
                <div className="flex h-48 w-full flex-col items-center justify-center text-center rounded-2xl border border-white/10 bg-[#11131f] p-8">
                    <Search className="h-10 w-10 text-gray-600 mb-2" />
                    <p className="text-sm font-semibold text-gray-300">
                        {searchQuery ? `No users matching "${searchQuery}"` : "Type a name or username to search"}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {searchResults.map((user) => (
                        <div
                            key={user.id}
                            className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#11131f] p-5 transition hover:border-white/20"
                        >
                            <div className="flex items-center gap-3">
                                <img
                                    src={user.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                                    alt={user.displayName}
                                    className="h-12 w-12 rounded-full object-cover border border-white/10"
                                />
                                <div>
                                    <h3 className="text-sm font-bold text-white">{user.displayName}</h3>
                                    <p className="text-xs text-indigo-400">@{user.username || user.email?.split("@")?.[0] || "user"}</p>
                                    <span className="text-[10px] text-gray-400 font-mono">
                                        Language: {user.nativeLanguage?.toUpperCase() || "EN"}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-5 flex items-center gap-2 pt-3 border-t border-white/5">
                                {user.friendshipStatus === "ACCEPTED" ? (
                                    <button
                                        type="button"
                                        onClick={() => handleStartChat(user.id)}
                                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                                    >
                                        <MessageSquare className="h-3.5 w-3.5" /> Start Chat
                                    </button>
                                ) : user.friendshipStatus === "PENDING" ? (
                                    <button
                                        type="button"
                                        disabled
                                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 py-2 text-xs font-semibold text-indigo-300 opacity-80 cursor-not-allowed"
                                    >
                                        <Clock className="h-3.5 w-3.5" /> Request Pending
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleSendRequest(user.id)}
                                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                                    >
                                        <UserPlus className="h-3.5 w-3.5" /> Add Friend
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
