import { useState, useEffect } from "react"
import { Link2, Copy, Check, Trash2, X, Loader2 } from "lucide-react"
import { groupsApi } from "../../services/api"

interface GroupInviteModalProps {
    isOpen: boolean
    conversationId: string
    isAdminOrOwner: boolean
    onClose: () => void
}

export default function GroupInviteModal({
    isOpen,
    conversationId,
    isAdminOrOwner,
    onClose,
}: GroupInviteModalProps) {
    const [inviteUrl, setInviteUrl] = useState<string | null>(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [isRevoking, setIsRevoking] = useState(false)
    const [copied, setCopied] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            handleCreateInvite()
        } else {
            setInviteUrl(null)
            setCopied(false)
            setErrorMsg(null)
        }
    }, [isOpen])

    const handleCreateInvite = async () => {
        setIsGenerating(true)
        setErrorMsg(null)
        try {
            const data = await groupsApi.createInvite(conversationId)
            if (data.token) {
                const fullUrl = `${window.location.origin}/group/invite/${data.token}`
                setInviteUrl(fullUrl)
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to generate group invite link")
        } finally {
            setIsGenerating(false)
        }
    }

    const handleCopy = () => {
        if (inviteUrl) {
            navigator.clipboard.writeText(inviteUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2500)
        }
    }

    const handleRevoke = async () => {
        setIsRevoking(true)
        setErrorMsg(null)
        try {
            await groupsApi.revokeInvite(conversationId)
            setInviteUrl(null)
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to revoke invite link")
        } finally {
            setIsRevoking(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm transition-opacity">
            <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f111a] shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 p-5 bg-[#141724]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600/30 text-purple-400 border border-purple-500/30">
                            <Link2 className="h-4 w-4" />
                        </div>
                        <h3 className="font-semibold text-white text-base leading-tight">Group Invite Link</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {errorMsg && (
                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-medium text-rose-300">
                            {errorMsg}
                        </div>
                    )}

                    <p className="text-xs text-gray-400 leading-relaxed">
                        Anyone with this link can join this group. Share it securely with people you trust.
                    </p>

                    {isGenerating ? (
                        <div className="flex py-8 items-center justify-center text-gray-400">
                            <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                        </div>
                    ) : inviteUrl ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
                                <input
                                    type="text"
                                    readOnly
                                    value={inviteUrl}
                                    className="w-full bg-transparent text-xs text-indigo-300 font-mono focus:outline-none select-all"
                                />
                                <button
                                    onClick={handleCopy}
                                    className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow"
                                >
                                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                    <span>{copied ? "Copied!" : "Copy"}</span>
                                </button>
                            </div>

                            {isAdminOrOwner && (
                                <button
                                    onClick={handleRevoke}
                                    disabled={isRevoking}
                                    className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition font-medium pt-1"
                                >
                                    {isRevoking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                    <span>Revoke Link</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="py-6 text-center text-xs text-gray-400">
                            No active invite link available.
                        </div>
                    )}

                    <div className="flex justify-end pt-3 border-t border-white/10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl bg-white/10 px-5 py-2 text-xs font-semibold text-white hover:bg-white/15 transition"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
