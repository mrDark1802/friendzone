import { useState, useEffect } from "react"
import { Search, X, UserPlus, Check, Loader2 } from "lucide-react"
import { friendshipsApi, groupsApi } from "../../services/api"

interface AddMembersModalProps {
    isOpen: boolean
    conversationId: string
    existingMemberIds: string[]
    onClose: () => void
    onMembersAdded: () => void
}

interface FriendItem {
    id: string
    displayName: string
    username?: string
    avatar?: string
}

export default function AddMembersModal({
    isOpen,
    conversationId,
    existingMemberIds,
    onClose,
    onMembersAdded,
}: AddMembersModalProps) {
    const [friends, setFriends] = useState<FriendItem[]>([])
    const [isLoadingFriends, setIsLoadingFriends] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            fetchFriends()
        } else {
            setSelectedMemberIds([])
            setErrorMsg(null)
            setSearchQuery("")
        }
    }, [isOpen])

    const fetchFriends = async () => {
        setIsLoadingFriends(true)
        try {
            const data = await friendshipsApi.getFriends()
            // Filter out users who are already active members of this group
            const available = (data || []).filter((f) => !existingMemberIds.includes(f.id))
            setFriends(available)
        } catch {
            setErrorMsg("Failed to load contacts")
        } finally {
            setIsLoadingFriends(false)
        }
    }

    const toggleSelectFriend = (id: string) => {
        if (selectedMemberIds.includes(id)) {
            setSelectedMemberIds((prev) => prev.filter((i) => i !== id))
        } else {
            setSelectedMemberIds((prev) => [...prev, id])
        }
    }

    const filteredFriends = friends.filter(
        (f) =>
            f.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (f.username && f.username.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    const handleAdd = async () => {
        if (selectedMemberIds.length === 0) return

        setIsSubmitting(true)
        setErrorMsg(null)

        try {
            await groupsApi.addGroupMembers(conversationId, selectedMemberIds)
            onMembersAdded()
            onClose()
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to add members")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm transition-opacity">
            <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f111a] shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 p-5 bg-[#141724]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
                            <UserPlus className="h-4 w-4" />
                        </div>
                        <h3 className="font-semibold text-white text-base leading-tight">Add Group Members</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {errorMsg && (
                    <div className="mx-5 mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-medium text-rose-300">
                        {errorMsg}
                    </div>
                )}

                <div className="p-5 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search contacts to add..."
                            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-xs font-medium text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                        />
                    </div>

                    <div className="space-y-1 overflow-y-auto max-h-[260px] pr-1">
                        {isLoadingFriends ? (
                            <div className="flex py-10 items-center justify-center text-gray-400">
                                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                            </div>
                        ) : filteredFriends.length === 0 ? (
                            <div className="py-8 text-center text-xs text-gray-400">
                                No additional contacts available to add.
                            </div>
                        ) : (
                            filteredFriends.map((friend) => {
                                const isSelected = selectedMemberIds.includes(friend.id)
                                return (
                                    <button
                                        key={friend.id}
                                        type="button"
                                        onClick={() => toggleSelectFriend(friend.id)}
                                        className={`flex w-full items-center justify-between rounded-xl p-3 text-left transition ${
                                            isSelected
                                                ? "bg-indigo-600/20 border border-indigo-500/30"
                                                : "hover:bg-white/5 border border-transparent"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600/30 font-bold text-white text-xs border border-indigo-500/30">
                                                {friend.displayName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-semibold text-white">
                                                    {friend.displayName}
                                                </h4>
                                                {friend.username && (
                                                    <p className="text-[10px] text-gray-400">@{friend.username}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div
                                            className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                                                isSelected
                                                    ? "border-indigo-500 bg-indigo-600 text-white"
                                                    : "border-white/20 bg-white/5"
                                            }`}
                                        >
                                            {isSelected && <Check className="h-3 w-3" />}
                                        </div>
                                    </button>
                                )
                            })
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-xs font-medium text-gray-400 hover:text-white transition"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleAdd}
                            disabled={isSubmitting || selectedMemberIds.length === 0}
                            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-lg min-h-[40px]"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Adding...</span>
                                </>
                            ) : (
                                <span>Add Selected ({selectedMemberIds.length})</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
