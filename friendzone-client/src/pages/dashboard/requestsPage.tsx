import { useState, useEffect } from "react"
import { Check, UserPlus, Loader2, X } from "lucide-react"
import { friendshipsApi, notificationsApi } from "../../services/api"
import { onFriendRequestReceived } from "../../services/socket"
import { UserAvatar } from "../../components/common/UserAvatar"

interface RequestItem {
    id: string
    userId: string
    displayName: string
    username: string
    email: string
    avatar?: string
    profileMediaId?: string | null
    createdAt: string
}

export default function RequestsPage() {
    const [requests, setRequests] = useState<RequestItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [toastMessage, setToastMessage] = useState<string | null>(null)

    const loadRequests = async () => {
        setIsLoading(true)
        try {
            const notifs = await notificationsApi.getNotifications()
            const reqNotifs = (notifs || [])
                .filter((n: any) => n.type === "FRIEND_REQUEST")
                .map((n: any) => ({
                    id: n.id,
                    userId: n.senderId || n.id.replace("friend_req_", ""),
                    displayName: n.senderName || "Friend",
                    username: n.senderUsername || n.senderName?.toLowerCase().replace(/\s+/g, "_") || "user",
                    email: n.content?.split(" ")?.[1] || "friend@zone.com",
                    avatar: n.senderAvatar || undefined,
                    profileMediaId: n.senderProfileMediaId || n.senderProfileMedia?.id || null,
                    createdAt: n.createdAt,
                }))
            setRequests(reqNotifs)
        } catch {
            setRequests([])
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadRequests()

        // Real-time friend request listener via Socket.IO
        onFriendRequestReceived((data: any) => {
            const senderName = data?.sender?.displayName || "Someone"
            showToast(`New friend request received from ${senderName}!`)
            loadRequests()
        })
    }, [])

    const showToast = (msg: string) => {
        setToastMessage(msg)
        setTimeout(() => setToastMessage(null), 3000)
    }

    const handleAccept = async (requesterUserId: string, reqId: string) => {
        try {
            await friendshipsApi.acceptRequest(requesterUserId)
            setRequests((prev) => prev.filter((r) => r.id !== reqId))
            showToast("Friend request accepted!")
        } catch (err: any) {
            showToast(err.message || "Failed to accept request.")
        }
    }

    const handleReject = async (requesterUserId: string, reqId: string) => {
        try {
            await friendshipsApi.rejectRequest(requesterUserId)
            setRequests((prev) => prev.filter((r) => r.id !== reqId))
            showToast("Friend request rejected.")
        } catch (err: any) {
            showToast(err.message || "Failed to reject request.")
        }
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 text-left max-w-5xl mx-auto animate-fade-in">
            {/* Toast Banner */}
            {toastMessage && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-900 dark:text-white shadow-lg animate-fade-in">
                    {toastMessage}
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Friend Requests
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Review and respond to incoming connection requests from members.
                </p>
            </div>

            {/* Request Feed */}
            {isLoading ? (
                <div className="flex h-48 w-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
            ) : requests.length === 0 ? (
                <div className="flex h-48 w-full flex-col items-center justify-center text-center rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-8">
                    <UserPlus className="h-8 w-8 text-slate-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No pending friend requests</p>
                    <p className="text-xs text-slate-500 mt-1">Incoming connection invitations will appear here in real time.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                    {requests.map((req) => (
                        <div
                            key={req.id}
                            className="flex flex-col justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
                        >
                            <div className="flex items-center gap-3">
                                <UserAvatar
                                    displayName={req.displayName}
                                    profileMediaId={req.profileMediaId}
                                    avatarUrl={(req as any)?.avatar || (req as any)?.avatarUrl}
                                    size="md"
                                />
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                        {req.displayName}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">@{req.username}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                        {new Date(req.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                                <button
                                    type="button"
                                    onClick={() => handleAccept(req.userId, req.id)}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 py-1.5 text-xs font-semibold text-white transition shadow-xs"
                                >
                                    <Check className="h-3.5 w-3.5" /> Accept
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleReject(req.userId, req.id)}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 transition"
                                >
                                    <X className="h-3.5 w-3.5" /> Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
