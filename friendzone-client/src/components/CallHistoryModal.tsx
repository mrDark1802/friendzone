import { useState, useEffect } from "react"
import { callsApi, type CallHistoryItem } from "../services/api"
import { callStore } from "../services/callStore"
import { Phone, Video, X, ArrowUpRight, ArrowDownLeft, PhoneMissed, Loader2, Clock } from "lucide-react"

interface CallHistoryModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function CallHistoryModal({ isOpen, onClose }: CallHistoryModalProps) {
    const [calls, setCalls] = useState<CallHistoryItem[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [filter, setFilter] = useState<"all" | "missed">("all")

    useEffect(() => {
        if (isOpen) {
            loadCallHistory()
        }
    }, [isOpen])

    const loadCallHistory = async () => {
        setIsLoading(true)
        try {
            const res = await callsApi.getCallHistory()
            setCalls(res?.calls || [])
        } catch {
            setCalls([])
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen) return null

    const filteredCalls = filter === "missed" ? calls.filter((c) => c.status === "missed" || c.status === "cancelled") : calls

    const handleCallBack = (item: CallHistoryItem) => {
        onClose()
        callStore.startCall(
            item.conversationId,
            {
                id: item.peer.id,
                displayName: item.peer.displayName || "User",
                avatar: item.peer.avatar,
            },
            item.type
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#11131f] shadow-2xl max-h-[85vh]">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-[#0a0b14]">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
                            <Clock className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white leading-tight">Call History</h2>
                            <p className="text-xs text-gray-400">Recent 1-on-1 audio and video calls</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-gray-400 hover:bg-white/10 hover:text-white transition"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex border-b border-white/5 bg-[#0e101b] px-6 py-2 gap-2">
                    <button
                        onClick={() => setFilter("all")}
                        className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition ${
                            filter === "all" ? "bg-indigo-600 text-white shadow-md" : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                    >
                        All Calls ({calls.length})
                    </button>
                    <button
                        onClick={() => setFilter("missed")}
                        className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition ${
                            filter === "missed" ? "bg-rose-600 text-white shadow-md" : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                    >
                        Missed ({calls.filter((c) => c.status === "missed" || c.status === "cancelled").length})
                    </button>
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[280px]">
                    {isLoading ? (
                        <div className="flex h-48 items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                        </div>
                    ) : filteredCalls.length === 0 ? (
                        <div className="flex h-48 flex-col items-center justify-center text-center">
                            <PhoneMissed className="h-8 w-8 text-gray-600 mb-2" />
                            <p className="text-xs text-gray-400">No call history records found.</p>
                        </div>
                    ) : (
                        filteredCalls.map((item) => {
                            const isMissed = item.status === "missed"
                            const isOutgoing = item.direction === "outgoing"

                            return (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-3 hover:bg-white/[0.07] transition"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            {item.peer.avatar ? (
                                                <img
                                                    src={item.peer.avatar}
                                                    alt={item.peer.displayName}
                                                    className="h-10 w-10 rounded-full object-cover border border-white/10"
                                                />
                                            ) : (
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-bold text-white text-sm">
                                                    {item.peer.displayName?.charAt(0).toUpperCase() || "U"}
                                                </div>
                                            )}
                                            <span
                                                className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                                                    isMissed
                                                        ? "bg-rose-600 text-white"
                                                        : isOutgoing
                                                        ? "bg-indigo-600 text-white"
                                                        : "bg-emerald-600 text-white"
                                                }`}
                                            >
                                                {isMissed ? "✕" : isOutgoing ? "↗" : "↙"}
                                            </span>
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-semibold text-white leading-tight">
                                                {item.peer.displayName || "FriendZone User"}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[11px] flex items-center gap-1 font-medium text-gray-400">
                                                    {isOutgoing ? (
                                                        <ArrowUpRight className="h-3 w-3 text-indigo-400" />
                                                    ) : isMissed ? (
                                                        <ArrowDownLeft className="h-3 w-3 text-rose-400" />
                                                    ) : (
                                                        <ArrowDownLeft className="h-3 w-3 text-emerald-400" />
                                                    )}
                                                    {item.text}
                                                </span>
                                                <span className="text-[10px] text-gray-500">
                                                    • {new Date(item.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}{" "}
                                                    {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleCallBack(item)}
                                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 transition"
                                            title={`Call back ${item.peer.displayName}`}
                                        >
                                            {item.type === "video" ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}
