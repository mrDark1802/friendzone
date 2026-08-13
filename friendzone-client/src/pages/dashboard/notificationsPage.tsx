import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
    CheckCircle,
    MessageSquare,
    Sparkles,
    UserPlus,
    Clock,
    Check,
    Loader2,
} from "lucide-react"
import { notificationsApi, friendshipsApi } from "../../services/api"
import { getSocket, onFriendRequestReceived } from "../../services/socket"
import { useAuth } from "../../context/AuthContext"

interface NotificationItem {
    id: string
    type: "FRIEND_REQUEST" | "MESSAGE" | "SYSTEM"
    title: string
    content: string
    senderId?: string
    senderName?: string
    isRead: boolean
    createdAt: string
}

export default function NotificationsPage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<"all" | "unread">("all")

    const loadNotifications = async () => {
        setIsLoading(true)
        try {
            const data = await notificationsApi.getNotifications()
            setNotifications(data || [])
        } catch {
            setNotifications([])
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadNotifications()
    }, [])

    // Listen for real-time notifications to append live without needing a page refresh
    useEffect(() => {
        onFriendRequestReceived((data: any) => {
            const senderName = data?.sender?.displayName || "Someone"
            const newNotif: NotificationItem = {
                id: `friend_req_${data?.sender?.id || Date.now()}`,
                type: "FRIEND_REQUEST",
                title: "New Connection Request",
                content: `${senderName} (@${data?.sender?.username || "user"}) sent you a friend request.`,
                senderId: data?.sender?.id,
                senderName,
                isRead: false,
                createdAt: new Date().toISOString(),
            }
            setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)])
        })

        const socket = getSocket()
        if (socket) {
            const handleMessageSent = ({ message }: { message: any }) => {
                if (message && message.senderId !== user?.id) {
                    const newNotif: NotificationItem = {
                        id: `msg_${message.id}`,
                        type: "MESSAGE",
                        title: `New Message from ${message.senderName || "Friend"}`,
                        content: message.contentOriginal?.length > 60 ? `${message.contentOriginal.substring(0, 60)}...` : message.contentOriginal,
                        senderId: message.senderId,
                        senderName: message.senderName,
                        isRead: false,
                        createdAt: new Date().toISOString(),
                    }
                    setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)])
                }
            }

            socket.on("message_sent", handleMessageSent)
            return () => {
                socket.off("message_sent", handleMessageSent)
            }
        }
    }, [user?.id])

    const handleMarkAllRead = async () => {
        try {
            await notificationsApi.markRead()
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        } catch {
            // Ignore
        }
    }

    const handleNotificationClick = async (notif: NotificationItem) => {
        try {
            if (!notif.isRead) {
                await notificationsApi.markRead(notif.id)
                setNotifications((prev) =>
                    prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
                )
            }
        } catch {
            // Ignore
        }

        if (notif.type === "FRIEND_REQUEST") {
            navigate("/requests")
        } else if (notif.type === "MESSAGE") {
            navigate("/chats")
        }
    }

    const handleAcceptRequest = async (e: React.MouseEvent, notif: NotificationItem) => {
        e.stopPropagation()
        try {
            const requesterId = notif.senderId || notif.id.replace("friend_req_", "")
            await friendshipsApi.acceptRequest(requesterId)
            setNotifications((prev) => prev.filter((n) => n.id !== notif.id))
        } catch {
            // Ignore
        }
    }

    const filtered = notifications.filter((n) => {
        if (activeTab === "unread") return !n.isRead
        return true
    })

    return (
        <div className="p-6 lg:p-8 space-y-8 text-left max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white sm:text-3xl">Activity Feed</h1>
                    <p className="mt-1 text-xs sm:text-sm text-gray-400">
                        Manage your real-time alerts, friend requests, and direct message updates.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10"
                    >
                        <CheckCircle className="h-4 w-4 text-indigo-400" />
                        Mark all read
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-3 gap-4">
                <div className="flex items-center gap-6 text-xs font-semibold">
                    <button
                        type="button"
                        onClick={() => setActiveTab("all")}
                        className={`pb-2 flex items-center gap-1.5 transition ${
                            activeTab === "all" ? "border-b-2 border-indigo-500 text-white font-bold" : "text-gray-400 hover:text-white"
                        }`}
                    >
                        All Notifications
                        <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] text-white">
                            {notifications.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("unread")}
                        className={`pb-2 flex items-center gap-1.5 transition ${
                            activeTab === "unread" ? "border-b-2 border-indigo-500 text-white font-bold" : "text-gray-400 hover:text-white"
                        }`}
                    >
                        Unread
                        <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-300">
                            {notifications.filter((n) => !n.isRead).length}
                        </span>
                    </button>
                </div>

                <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-indigo-400" /> Real-time Socket Live Sync
                </span>
            </div>

            {/* Notifications Timeline Feed */}
            {isLoading ? (
                <div className="flex h-48 w-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex h-48 w-full flex-col items-center justify-center text-center">
                    <CheckCircle className="h-10 w-10 text-gray-600 mb-2" />
                    <p className="text-sm font-semibold text-gray-300">All caught up!</p>
                    <p className="text-xs text-gray-500">No notifications found in your feed.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => handleNotificationClick(item)}
                            className={`flex items-start justify-between rounded-2xl border p-4 backdrop-blur-md cursor-pointer transition-all duration-200 hover:scale-[1.01] ${
                                !item.isRead
                                    ? "border-indigo-500/40 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
                                    : "border-white/10 bg-white/[0.03] opacity-80 hover:opacity-100 hover:border-white/20"
                            }`}
                        >
                            <div className="flex items-start gap-3.5">
                                <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                                    {item.type === "FRIEND_REQUEST" ? (
                                        <UserPlus className="h-5 w-5" />
                                    ) : item.type === "MESSAGE" ? (
                                        <MessageSquare className="h-5 w-5" />
                                    ) : (
                                        <Sparkles className="h-5 w-5" />
                                    )}
                                    {!item.isRead && (
                                        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-indigo-500 ring-2 ring-[#07080d]" />
                                    )}
                                </span>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-bold text-white">{item.title}</h4>
                                        {!item.isRead && (
                                            <span className="rounded-full bg-indigo-500/20 px-2 py-0.2 text-[9px] font-bold text-indigo-300 border border-indigo-500/30">
                                                UNREAD
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-300">{item.content}</p>

                                    {item.type === "FRIEND_REQUEST" && (
                                        <div className="flex items-center gap-2 pt-2">
                                            <button
                                                type="button"
                                                onClick={(e) => handleAcceptRequest(e, item)}
                                                className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md"
                                            >
                                                <Check className="h-3.5 w-3.5" /> Accept Request
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <span className="text-[11px] text-gray-500 shrink-0">
                                {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
