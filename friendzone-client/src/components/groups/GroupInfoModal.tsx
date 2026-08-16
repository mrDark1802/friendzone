import { useState, useEffect } from "react"
import {
    X,
    UserPlus,
    Link2,
    Shield,
    Crown,
    UserX,
    LogOut,
    Search,
    Loader2,
    MoreVertical,
} from "lucide-react"
import { groupsApi } from "../../services/api"
import AddMembersModal from "./AddMembersModal"
import GroupInviteModal from "./GroupInviteModal"

interface GroupInfoModalProps {
    isOpen: boolean
    conversationId: string
    currentUserId: string
    onClose: () => void
    onGroupUpdated: () => void
    onLeftGroup: () => void
}

export default function GroupInfoModal({
    isOpen,
    conversationId,
    currentUserId,
    onClose,
    onGroupUpdated,
    onLeftGroup,
}: GroupInfoModalProps) {
    const [groupData, setGroupData] = useState<any>(null)
    const [members, setMembers] = useState<any[]>([])
    const [currentUserRole, setCurrentUserRole] = useState<string>("MEMBER")
    const [isLoading, setIsLoading] = useState(true)
    const [memberSearch, setMemberSearch] = useState("")

    const [activeTab, setActiveTab] = useState<"members" | "settings">("members")
    const [isAddMembersOpen, setIsAddMembersOpen] = useState(false)
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

    // Edit Group Info state
    const [isEditingInfo, setIsEditingInfo] = useState(false)
    const [titleInput, setTitleInput] = useState("")
    const [descInput, setDescInput] = useState("")
    const [isSavingInfo, setIsSavingInfo] = useState(false)

    // Leave & Member action confirmation states
    const [activeActionMemberId, setActiveActionMemberId] = useState<string | null>(null)
    const [confirmAction, setConfirmAction] = useState<{
        type: "leave" | "remove" | "promote" | "demote" | "transfer"
        targetUser?: any
    } | null>(null)

    const [actionLoading, setActionLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen && conversationId) {
            fetchGroupDetails()
        } else {
            resetState()
        }
    }, [isOpen, conversationId])

    const resetState = () => {
        setGroupData(null)
        setMembers([])
        setCurrentUserRole("MEMBER")
        setIsLoading(true)
        setMemberSearch("")
        setActiveTab("members")
        setIsEditingInfo(false)
        setConfirmAction(null)
        setErrorMsg(null)
        setActionLoading(false)
    }

    const fetchGroupDetails = async () => {
        setIsLoading(true)
        setErrorMsg(null)
        try {
            const data = await groupsApi.getGroupDetails(conversationId)
            setGroupData(data.conversation)
            setMembers(data.conversation.members || [])
            setCurrentUserRole(data.currentUserRole || "MEMBER")

            setTitleInput(data.conversation.title || "")
            setDescInput(data.conversation.description || "")
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to load group details")
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveGroupInfo = async () => {
        if (!titleInput.trim()) return
        setIsSavingInfo(true)
        setErrorMsg(null)
        try {
            await groupsApi.updateGroupInfo(conversationId, {
                title: titleInput.trim(),
                description: descInput.trim(),
            })
            setIsEditingInfo(false)
            fetchGroupDetails()
            onGroupUpdated()
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to update group information")
        } finally {
            setIsSavingInfo(false)
        }
    }

    const handleToggleSetting = async (key: "onlyAdminsCanSend" | "onlyAdminsCanEditInfo" | "onlyAdminsCanAddMembers") => {
        if (!groupData) return
        const newValue = !groupData[key]
        try {
            await groupsApi.updateGroupInfo(conversationId, { [key]: newValue })
            setGroupData((prev: any) => ({ ...prev, [key]: newValue }))
            onGroupUpdated()
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to update setting")
        }
    }

    const handleExecuteAction = async () => {
        if (!confirmAction) return
        setActionLoading(true)
        setErrorMsg(null)

        try {
            if (confirmAction.type === "leave") {
                await groupsApi.leaveGroup(conversationId)
                onLeftGroup()
                onClose()
            } else if (confirmAction.type === "remove" && confirmAction.targetUser) {
                await groupsApi.removeGroupMember(conversationId, confirmAction.targetUser.userId)
                fetchGroupDetails()
                onGroupUpdated()
            } else if (confirmAction.type === "promote" && confirmAction.targetUser) {
                await groupsApi.updateMemberRole(conversationId, confirmAction.targetUser.userId, "ADMIN")
                fetchGroupDetails()
                onGroupUpdated()
            } else if (confirmAction.type === "demote" && confirmAction.targetUser) {
                await groupsApi.updateMemberRole(conversationId, confirmAction.targetUser.userId, "MEMBER")
                fetchGroupDetails()
                onGroupUpdated()
            } else if (confirmAction.type === "transfer" && confirmAction.targetUser) {
                await groupsApi.updateMemberRole(conversationId, confirmAction.targetUser.userId, "OWNER")
                fetchGroupDetails()
                onGroupUpdated()
            }
            setConfirmAction(null)
        } catch (err: any) {
            setErrorMsg(err.message || "Action failed")
        } finally {
            setActionLoading(false)
        }
    }

    if (!isOpen) return null

    const isOwner = currentUserRole === "OWNER"
    const isAdminOrOwner = currentUserRole === "OWNER" || currentUserRole === "ADMIN"

    const filteredMembers = members.filter((m) =>
        m.user?.displayName?.toLowerCase().includes(memberSearch.toLowerCase())
    )

    const existingMemberIds = members.map((m) => m.userId)

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm transition-opacity">
                <div className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f111a] shadow-2xl max-h-[85vh]">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/10 p-5 bg-[#141724]">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-white shadow-md text-lg">
                                {groupData?.title ? groupData.title.charAt(0).toUpperCase() : "#"}
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-base leading-tight">
                                    {groupData?.title || "Group Info"}
                                </h3>
                                <p className="text-xs text-indigo-300 font-medium">
                                    {members.length} {members.length === 1 ? "member" : "members"}
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

                    {errorMsg && (
                        <div className="mx-5 mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-medium text-rose-300">
                            {errorMsg}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex py-20 items-center justify-center text-gray-400">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <div className="flex flex-1 flex-col overflow-hidden">
                            {/* Group Details Header / Edit Section */}
                            <div className="p-5 border-b border-white/5 bg-white/[0.02]">
                                {isEditingInfo ? (
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={titleInput}
                                            onChange={(e) => setTitleInput(e.target.value)}
                                            placeholder="Group Title"
                                            className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs font-medium text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                                        />
                                        <textarea
                                            value={descInput}
                                            onChange={(e) => setDescInput(e.target.value)}
                                            placeholder="Group Description"
                                            rows={2}
                                            className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs font-medium text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none resize-none"
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setIsEditingInfo(false)}
                                                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveGroupInfo}
                                                disabled={isSavingInfo || !titleInput.trim()}
                                                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                                            >
                                                {isSavingInfo ? "Saving..." : "Save"}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="text-sm font-bold text-white">{groupData?.title}</h4>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {groupData?.description || "No group description provided."}
                                                </p>
                                            </div>
                                            {isAdminOrOwner && (
                                                <button
                                                    onClick={() => setIsEditingInfo(true)}
                                                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                        </div>

                                        {/* Action Bar */}
                                        <div className="flex flex-wrap items-center gap-2 mt-4">
                                            <button
                                                onClick={() => setIsAddMembersOpen(true)}
                                                className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition"
                                            >
                                                <UserPlus className="h-3.5 w-3.5" />
                                                <span>Add Members</span>
                                            </button>

                                            <button
                                                onClick={() => setIsInviteModalOpen(true)}
                                                className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition"
                                            >
                                                <Link2 className="h-3.5 w-3.5" />
                                                <span>Invite Link</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Tabs Navigation */}
                            <div className="flex border-b border-white/10 px-5 bg-[#141724]">
                                <button
                                    onClick={() => setActiveTab("members")}
                                    className={`py-3 px-4 text-xs font-semibold border-b-2 transition ${
                                        activeTab === "members"
                                            ? "border-indigo-500 text-indigo-400"
                                            : "border-transparent text-gray-400 hover:text-white"
                                    }`}
                                >
                                    Members ({members.length})
                                </button>
                                {isAdminOrOwner && (
                                    <button
                                        onClick={() => setActiveTab("settings")}
                                        className={`py-3 px-4 text-xs font-semibold border-b-2 transition ${
                                            activeTab === "settings"
                                                ? "border-indigo-500 text-indigo-400"
                                                : "border-transparent text-gray-400 hover:text-white"
                                        }`}
                                    >
                                        Permissions & Settings
                                    </button>
                                )}
                            </div>

                            {/* Tab 1: Members List */}
                            {activeTab === "members" && (
                                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            value={memberSearch}
                                            onChange={(e) => setMemberSearch(e.target.value)}
                                            placeholder="Search members..."
                                            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1 overflow-y-auto max-h-[260px] pr-1">
                                        {filteredMembers.map((m) => {
                                            const isMe = m.userId === currentUserId
                                            const showActions =
                                                !isMe &&
                                                (isOwner || (currentUserRole === "ADMIN" && m.role === "MEMBER"))

                                            return (
                                                <div
                                                    key={m.id}
                                                    className="flex items-center justify-between rounded-xl p-2.5 hover:bg-white/5 border border-transparent transition"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600/30 font-bold text-white text-xs border border-indigo-500/30">
                                                            {m.user?.displayName ? m.user.displayName.charAt(0).toUpperCase() : "U"}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <h5 className="text-xs font-semibold text-white">
                                                                    {m.user?.displayName}
                                                                </h5>
                                                                {isMe && (
                                                                    <span className="text-[10px] text-gray-400 font-normal">
                                                                        (You)
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] text-gray-400">
                                                                @{m.user?.username || "user"}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 relative">
                                                        {/* Role Badge */}
                                                        {m.role === "OWNER" && (
                                                            <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
                                                                <Crown className="h-3 w-3" />
                                                                Owner
                                                            </span>
                                                        )}
                                                        {m.role === "ADMIN" && (
                                                            <span className="flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-500/20">
                                                                <Shield className="h-3 w-3" />
                                                                Admin
                                                            </span>
                                                        )}
                                                        {m.role === "MEMBER" && (
                                                            <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-gray-400 border border-white/10">
                                                                Member
                                                            </span>
                                                        )}

                                                        {/* Actions Dropdown Button */}
                                                        {showActions && (
                                                            <div>
                                                                <button
                                                                    onClick={() =>
                                                                        setActiveActionMemberId(
                                                                            activeActionMemberId === m.id ? null : m.id
                                                                        )
                                                                    }
                                                                    className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white"
                                                                >
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </button>

                                                                {activeActionMemberId === m.id && (
                                                                    <div className="absolute right-0 top-7 z-20 w-44 rounded-xl border border-white/10 bg-[#181b28] p-1.5 shadow-xl text-xs space-y-1">
                                                                        {isOwner && m.role === "MEMBER" && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    setActiveActionMemberId(null)
                                                                                    setConfirmAction({
                                                                                        type: "promote",
                                                                                        targetUser: m,
                                                                                    })
                                                                                }}
                                                                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-indigo-300 hover:bg-white/5"
                                                                            >
                                                                                <Shield className="h-3.5 w-3.5" />
                                                                                Make Admin
                                                                            </button>
                                                                        )}

                                                                        {isOwner && m.role === "ADMIN" && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    setActiveActionMemberId(null)
                                                                                    setConfirmAction({
                                                                                        type: "demote",
                                                                                        targetUser: m,
                                                                                    })
                                                                                }}
                                                                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-gray-300 hover:bg-white/5"
                                                                            >
                                                                                <Shield className="h-3.5 w-3.5" />
                                                                                Dismiss as Admin
                                                                            </button>
                                                                        )}

                                                                        {isOwner && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    setActiveActionMemberId(null)
                                                                                    setConfirmAction({
                                                                                        type: "transfer",
                                                                                        targetUser: m,
                                                                                    })
                                                                                }}
                                                                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-amber-300 hover:bg-white/5"
                                                                            >
                                                                                <Crown className="h-3.5 w-3.5" />
                                                                                Transfer Ownership
                                                                            </button>
                                                                        )}

                                                                        <button
                                                                            onClick={() => {
                                                                                setActiveActionMemberId(null)
                                                                                setConfirmAction({
                                                                                    type: "remove",
                                                                                    targetUser: m,
                                                                                })
                                                                            }}
                                                                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-rose-400 hover:bg-rose-500/10"
                                                                        >
                                                                            <UserX className="h-3.5 w-3.5" />
                                                                            Remove Member
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Tab 2: Settings */}
                            {activeTab === "settings" && isAdminOrOwner && (
                                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h5 className="text-xs font-semibold text-white">
                                                    Only Admins Can Send Messages
                                                </h5>
                                                <p className="text-[11px] text-gray-400">
                                                    Restricts sending messages to group admins and owners.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleToggleSetting("onlyAdminsCanSend")}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                                    groupData?.onlyAdminsCanSend ? "bg-indigo-600" : "bg-white/10"
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                                        groupData?.onlyAdminsCanSend ? "translate-x-6" : "translate-x-1"
                                                    }`}
                                                />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                            <div>
                                                <h5 className="text-xs font-semibold text-white">
                                                    Only Admins Can Edit Group Info
                                                </h5>
                                                <p className="text-[11px] text-gray-400">
                                                    Restricts changing title, description, and settings to admins.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleToggleSetting("onlyAdminsCanEditInfo")}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                                    groupData?.onlyAdminsCanEditInfo ? "bg-indigo-600" : "bg-white/10"
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                                        groupData?.onlyAdminsCanEditInfo
                                                            ? "translate-x-6"
                                                            : "translate-x-1"
                                                    }`}
                                                />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                            <div>
                                                <h5 className="text-xs font-semibold text-white">
                                                    Only Admins Can Add Members
                                                </h5>
                                                <p className="text-[11px] text-gray-400">
                                                    Restricts adding members and invite links to admins.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleToggleSetting("onlyAdminsCanAddMembers")}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                                    groupData?.onlyAdminsCanAddMembers ? "bg-indigo-600" : "bg-white/10"
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                                        groupData?.onlyAdminsCanAddMembers
                                                            ? "translate-x-6"
                                                            : "translate-x-1"
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Danger Zone: Leave Group */}
                            <div className="p-4 border-t border-white/10 bg-[#141724] flex justify-between items-center">
                                <button
                                    onClick={() => setConfirmAction({ type: "leave" })}
                                    className="flex items-center gap-2 text-xs font-semibold text-rose-400 hover:text-rose-300 transition"
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span>Leave Group</span>
                                </button>

                                <button
                                    onClick={onClose}
                                    className="rounded-xl bg-white/10 px-5 py-2 text-xs font-semibold text-white hover:bg-white/15 transition"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Sub Modals */}
            <AddMembersModal
                isOpen={isAddMembersOpen}
                conversationId={conversationId}
                existingMemberIds={existingMemberIds}
                onClose={() => setIsAddMembersOpen(false)}
                onMembersAdded={() => {
                    fetchGroupDetails()
                    onGroupUpdated()
                }}
            />

            <GroupInviteModal
                isOpen={isInviteModalOpen}
                conversationId={conversationId}
                isAdminOrOwner={isAdminOrOwner}
                onClose={() => setIsInviteModalOpen(false)}
            />

            {/* Action Confirmation Modal */}
            {confirmAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
                    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#141724] p-5 shadow-2xl space-y-4 text-center">
                        <h4 className="text-sm font-bold text-white">
                            {confirmAction.type === "leave" && "Leave Group?"}
                            {confirmAction.type === "remove" && `Remove ${confirmAction.targetUser?.user?.displayName}?`}
                            {confirmAction.type === "promote" && `Make ${confirmAction.targetUser?.user?.displayName} Admin?`}
                            {confirmAction.type === "demote" && `Dismiss ${confirmAction.targetUser?.user?.displayName} as Admin?`}
                            {confirmAction.type === "transfer" && `Transfer Ownership to ${confirmAction.targetUser?.user?.displayName}?`}
                        </h4>

                        <p className="text-xs text-gray-400">
                            {confirmAction.type === "leave" &&
                                "Are you sure you want to leave this group? You will stop receiving messages from this group."}
                            {confirmAction.type === "remove" &&
                                "They will be removed from the group and will no longer see new messages."}
                            {confirmAction.type === "promote" &&
                                "They will be able to manage group members and settings."}
                            {confirmAction.type === "demote" &&
                                "They will be demoted to a regular group member."}
                            {confirmAction.type === "transfer" &&
                                "You will transfer full group ownership to this member."}
                        </p>

                        <div className="flex justify-center gap-3 pt-2">
                            <button
                                onClick={() => setConfirmAction(null)}
                                disabled={actionLoading}
                                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExecuteAction}
                                disabled={actionLoading}
                                className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold text-white shadow-md ${
                                    confirmAction.type === "leave" || confirmAction.type === "remove"
                                        ? "bg-rose-600 hover:bg-rose-500"
                                        : "bg-indigo-600 hover:bg-indigo-500"
                                }`}
                            >
                                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
