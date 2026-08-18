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
        <div className="relative p-6 lg:p-8 space-y-8 text-left max-w-7xl mx-auto">
            {/* Toast Banner */}
            {toastMessage && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl border border-indigo-500/40 bg-[#07080d]/95 px-5 py-2.5 text-xs font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-top-2">
                    {toastMessage}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white sm:text-3xl">Friend Requests</h1>
                    <p className="mt-1 text-xs sm:text-sm text-gray-400">
                        Review incoming connection requests from people.
                    </p>
                </div>
            </div>

            {/* Request Feed */}
            {isLoading ? (
                <div className="flex h-48 w-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                </div>
            ) : requests.length === 0 ? (
                <div className="flex h-48 w-full flex-col items-center justify-center text-center rounded-2xl border border-white/10 bg-[#11131f] p-8">
                    <UserPlus className="h-10 w-10 text-gray-600 mb-2" />
                    <p className="text-sm font-semibold text-gray-300">No pending friend requests</p>
                    <p className="text-xs text-gray-500 mt-1">When someone sends you a friend request, it will appear here in real time.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl">
                    {requests.map((req) => (
                        <div
                            key={req.id}
                            className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#11131f] p-5 transition hover:border-white/20"
                        >
                            <div className="flex items-center gap-3">
                                <UserAvatar
                                    displayName={req.displayName}
                                    profileMediaId={req.profileMediaId}
                                    avatarUrl={(req as any)?.avatar || (req as any)?.avatarUrl}
                                    size="lg"
                                />
                                <div>
                                    <h3 className="text-sm font-bold text-white">{req.displayName}</h3>
                                    <p className="text-xs text-indigo-400">@{req.username}</p>
                                </div>
                            </div>

                            <div className="mt-5 flex items-center gap-2 pt-3 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => handleAccept(req.userId, req.id)}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                                >
                                    <Check className="h-3.5 w-3.5" /> Accept
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleReject(req.userId, req.id)}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
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
