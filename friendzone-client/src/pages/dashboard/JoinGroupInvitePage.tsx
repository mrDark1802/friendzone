import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Loader2, Users, AlertCircle, CheckCircle2 } from "lucide-react"
import { groupsApi } from "../../services/api"

export default function JoinGroupInvitePage() {
    const { token } = useParams<{ token: string }>()
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [groupTitle, setGroupTitle] = useState<string | null>(null)

    useEffect(() => {
        if (token) {
            handleJoin()
        }
    }, [token])

    const handleJoin = async () => {
        if (!token) return
        setIsLoading(true)
        setErrorMsg(null)
        try {
            const res = await groupsApi.joinInvite(token)
            if (res.conversation?.id) {
                setGroupTitle(res.conversation.title || "Group")
                setTimeout(() => {
                    navigate(`/chats?id=${res.conversation.id}`, { replace: true })
                }, 1200)
            } else {
                setErrorMsg("Invalid group invite")
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to join group. The invite link may be expired or invalid.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center bg-[#07080d] p-4 text-center">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f111a] p-8 shadow-2xl space-y-5">
                <div className="flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-white shadow-lg text-2xl">
                        <Users className="h-8 w-8" />
                    </div>
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-500" />
                        <h3 className="text-sm font-bold text-white">Joining Group Chat...</h3>
                        <p className="text-xs text-gray-400">Verifying invite link credentials</p>
                    </div>
                ) : errorMsg ? (
                    <div className="space-y-4">
                        <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
                        <h3 className="text-sm font-bold text-white">Unable to Join Group</h3>
                        <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                            {errorMsg}
                        </p>
                        <button
                            onClick={() => navigate("/chats")}
                            className="w-full rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-lg"
                        >
                            Return to Messages
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
                        <h3 className="text-sm font-bold text-white">Successfully Joined {groupTitle}!</h3>
                        <p className="text-xs text-gray-400">Redirecting to chat workspace...</p>
                    </div>
                )}
            </div>
        </div>
    )
}
