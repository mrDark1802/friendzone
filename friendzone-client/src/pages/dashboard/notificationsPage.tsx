import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
    CheckCircle,
    MessageSquare,
    UserPlus,
    Clock,
    Check,
    X,
    Loader2,
    Bell,
} from "lucide-react"
import { notificationsApi, friendshipsApi } from "../../services/api"

interface NotificationItem {
    id: string
    userId: string
    type: "FRIEND_REQUEST" | "MESSAGE" | "SYSTEM" | string
    title: string
    content: string
    isRead: boolean
    senderId?: string
    createdAt: string
}

export default function NotificationsPage() {
    const navigate = useNavigate()
    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [activeTab, setActiveTab] = useState<"all" | "unread">("all")
    const [isLoading, setIsLoading] = useState(true)

    const fetchNotifications = async () => {
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
        fetchNotifications()
    }, [])

    const handleMarkAllRead = async () => {
        try {
            await notificationsApi.markRead()
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        } catch {
            // Ignore
        }
    }

    const handleNotificationClick = async (notif: NotificationItem) => {
        if (!notif.isRead) {
            try {
                await notificationsApi.markRead(notif.id)
                setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)))
            } catch {
                // Ignore
            }
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

    const handleRejectRequest = async (e: React.MouseEvent, notif: NotificationItem) => {
        e.stopPropagation()
        try {
            const requesterId = notif.senderId || notif.id.replace("friend_req_", "")
            await friendshipsApi.rejectRequest(requesterId)
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
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 text-left max-w-4xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Notifications
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Stay updated with friend requests, messages, and system alerts.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                    >
                        <CheckCircle className="h-3.5 w-3.5" /> Mark all read
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 text-xs font-semibold pb-1">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => setActiveTab("all")}
                        className={`pb-2.5 flex items-center gap-1.5 transition ${
                            activeTab === "all"
                                ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 font-bold"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                        }`}
                    >
                        All
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                            {notifications.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("unread")}
                        className={`pb-2.5 flex items-center gap-1.5 transition ${
                            activeTab === "unread"
                                ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 font-bold"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                        }`}
                    >
                        Unread
                        <span className="rounded-full bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                            {notifications.filter((n) => !n.isRead).length}
                        </span>
                    </button>
                </div>

                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-blue-600" /> Real-time Sync
                </span>
            </div>

            {/* Notifications Timeline Feed */}
            {isLoading ? (
                <div className="flex h-48 w-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex h-48 w-full flex-col items-center justify-center text-center rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-8">
                    <CheckCircle className="h-8 w-8 text-slate-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">All caught up!</p>
                    <p className="text-xs text-slate-500 mt-1">No notifications found in this view.</p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {filtered.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => handleNotificationClick(item)}
                            className={`flex items-start justify-between rounded-xl border p-4 cursor-pointer transition-all ${
                                !item.isRead
                                    ? "border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20"
                                    : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                        >
                            <div className="flex items-start gap-3.5 min-w-0">
                                <span className={`relative flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${
                                    !item.isRead
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                }`}>
                                    {item.type === "FRIEND_REQUEST" ? (
                                        <UserPlus className="h-4.5 w-4.5" />
                                    ) : item.type === "MESSAGE" ? (
                                        <MessageSquare className="h-4.5 w-4.5" />
                                    ) : (
                                        <Bell className="h-4.5 w-4.5" />
                                    )}
                                </span>
                                <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                                            {item.title}
                                        </h4>
                                        {!item.isRead && (
                                            <span className="rounded-md bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.2 text-[9px] font-bold text-blue-600 dark:text-blue-400">
                                                NEW
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-300">{item.content}</p>

                                    {item.type === "FRIEND_REQUEST" && (
                                        <div className="flex items-center gap-2 pt-2">
                                            <button
                                                type="button"
                                                onClick={(e) => handleAcceptRequest(e, item)}
                                                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1 text-xs font-semibold text-white shadow-xs"
                                            >
                                                <Check className="h-3.5 w-3.5" /> Accept
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => handleRejectRequest(e, item)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600"
                                            >
                                                <X className="h-3.5 w-3.5" /> Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                                {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
