import { useState, useEffect } from "react"
import { Search, X, Users, Check, Loader2, ArrowRight, ArrowLeft } from "lucide-react"
import { friendshipsApi, groupsApi } from "../../services/api"

interface CreateGroupModalProps {
    isOpen: boolean
    onClose: () => void
    onGroupCreated: (newGroup: any) => void
}

interface FriendItem {
    id: string
    displayName: string
    username?: string
    avatar?: string
    nativeLanguage?: string
}

export default function CreateGroupModal({ isOpen, onClose, onGroupCreated }: CreateGroupModalProps) {
    const [step, setStep] = useState<1 | 2>(1)
    const [friends, setFriends] = useState<FriendItem[]>([])
    const [isLoadingFriends, setIsLoadingFriends] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
    const [selectedFriends, setSelectedFriends] = useState<FriendItem[]>([])

    const [groupTitle, setGroupTitle] = useState("")
    const [description, setDescription] = useState("")
    const [avatarUrl, setAvatarUrl] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            fetchFriends()
        } else {
            resetForm()
        }
    }, [isOpen])

    const fetchFriends = async () => {
        setIsLoadingFriends(true)
        try {
            const data = await friendshipsApi.getFriends()
            setFriends(data || [])
        } catch {
            setErrorMsg("Failed to load contacts list")
        } finally {
            setIsLoadingFriends(false)
        }
    }

    const resetForm = () => {
        setStep(1)
        setSelectedMemberIds([])
        setSelectedFriends([])
        setGroupTitle("")
        setDescription("")
        setAvatarUrl("")
        setErrorMsg(null)
        setIsSubmitting(false)
        setSearchQuery("")
    }

    const toggleSelectFriend = (friend: FriendItem) => {
        if (selectedMemberIds.includes(friend.id)) {
            setSelectedMemberIds((prev) => prev.filter((id) => id !== friend.id))
            setSelectedFriends((prev) => prev.filter((f) => f.id !== friend.id))
        } else {
            setSelectedMemberIds((prev) => [...prev, friend.id])
            setSelectedFriends((prev) => [...prev, friend])
        }
    }

    const filteredFriends = friends.filter(
        (f) =>
            f.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (f.username && f.username.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    const handleCreate = async () => {
        const title = groupTitle.trim()
        if (!title) {
            setErrorMsg("Group name is required")
            return
        }

        setIsSubmitting(true)
        setErrorMsg(null)

        try {
            const res = await groupsApi.createGroup(title, selectedMemberIds, description, avatarUrl)
            const conversation = res.conversation || res
            onGroupCreated(conversation)
            onClose()
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to create group. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm transition-opacity">
            <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f111a] shadow-2xl">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-white/10 p-5 bg-[#141724]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-white shadow-md">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white text-base leading-tight">Create New Group</h3>
                            <p className="text-xs text-indigo-300 font-medium">
                                Step {step} of 2: {step === 1 ? "Add Group Members" : "Group Info"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                    <div className="mx-5 mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-medium text-rose-300">
                        {errorMsg}
                    </div>
                )}

                {/* Step 1: Select Members */}
                {step === 1 && (
                    <div className="flex flex-col p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                        {/* Selected Members Badges */}
                        {selectedFriends.length > 0 && (
                            <div className="flex flex-wrap gap-2 pb-2 border-b border-white/5">
                                {selectedFriends.map((friend) => (
                                    <div
                                        key={friend.id}
                                        className="flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-300 border border-indigo-500/30"
                                    >
                                        <span>{friend.displayName}</span>
                                        <button
                                            onClick={() => toggleSelectFriend(friend)}
                                            className="hover:text-white transition"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search contacts..."
                                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-xs font-medium text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>

                        {/* Friends List */}
                        <div className="space-y-1 overflow-y-auto max-h-[280px] pr-1">
                            {isLoadingFriends ? (
                                <div className="flex py-10 items-center justify-center text-gray-400">
                                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                                </div>
                            ) : filteredFriends.length === 0 ? (
                                <div className="py-8 text-center text-xs text-gray-400">
                                    No contacts found. Add friends first to invite them to groups.
                                </div>
                            ) : (
                                filteredFriends.map((friend) => {
                                    const isSelected = selectedMemberIds.includes(friend.id)
                                    return (
                                        <button
                                            key={friend.id}
                                            type="button"
                                            onClick={() => toggleSelectFriend(friend)}
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

                        <div className="flex justify-end pt-3 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-all shadow-lg"
                            >
                                <span>Next ({selectedMemberIds.length} selected)</span>
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Group Info */}
                {step === 2 && (
                    <div className="flex flex-col p-5 space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                                Group Name <span className="text-rose-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={groupTitle}
                                onChange={(e) => setGroupTitle(e.target.value)}
                                placeholder="e.g. Design Team, Friends Hangout"
                                maxLength={100}
                                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs font-medium text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                                Description (Optional)
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What is this group about?"
                                rows={3}
                                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs font-medium text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                                Group Avatar Image URL (Optional)
                            </label>
                            <input
                                type="url"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs font-medium text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                disabled={isSubmitting}
                                className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-white transition"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Back</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleCreate}
                                disabled={isSubmitting || !groupTitle.trim()}
                                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-lg min-h-[40px]"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Creating...</span>
                                    </>
                                ) : (
                                    <span>Create Group</span>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
