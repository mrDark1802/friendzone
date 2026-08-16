import { useState, useEffect, useRef } from "react"
import { callStore, type CallState } from "../services/callStore"
import { webRTCManager } from "../services/webRTCManager"
import { Phone, PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff, AlertCircle, Minimize2, Maximize2, X } from "lucide-react"

export default function CallModal() {
    const [callState, setCallState] = useState<CallState>(callStore.getState())
    const [isMinimized, setIsMinimized] = useState(false)
    const localVideoRef = useRef<HTMLVideoElement>(null)
    const remoteVideoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        const unsubscribe = callStore.subscribe((state) => {
            setCallState(state)
            // Auto expand if call starts connecting, ringing, or ends/fails
            if (["RINGING", "CONNECTING", "FAILED", "DECLINED", "CANCELLED", "TIMEOUT", "ENDED"].includes(state.status)) {
                setIsMinimized(false)
            }
        })
        callStore.initSocketListeners()
        return () => unsubscribe()
    }, [])

    // Bind local media stream to localVideoRef element
    useEffect(() => {
        if (localVideoRef.current && callState.status === "CONNECTED" && !isMinimized) {
            const stream = webRTCManager.getLocalStream()
            if (stream) {
                localVideoRef.current.srcObject = stream
            }
        }
    }, [callState.status, isMinimized])

    // Bind remote media stream to remoteVideoRef element
    useEffect(() => {
        if (callState.status === "CONNECTED" && !isMinimized) {
            webRTCManager.onRemoteStream((stream) => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = stream
                }
            })
            const currentRemote = webRTCManager.getRemoteStream()
            if (currentRemote && remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = currentRemote
            }
        }
    }, [callState.status, isMinimized])

    if (callState.status === "IDLE") {
        return null
    }

    const isTerminal = ["DECLINED", "CANCELLED", "TIMEOUT", "BUSY", "FAILED", "ENDED"].includes(callState.status)

    // Floating Minimized Bar Widget
    if (isMinimized) {
        return (
            <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl border border-indigo-500/40 bg-[#11131f]/95 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-200">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 font-bold text-white text-sm">
                    {callState.peer?.displayName ? callState.peer.displayName.charAt(0).toUpperCase() : "U"}
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#11131f] animate-pulse" />
                </div>
                <div className="flex flex-col pr-2">
                    <span className="text-xs font-bold text-white leading-tight">
                        {callState.peer?.displayName || "FriendZone Call"}
                    </span>
                    <span className="text-[10px] text-indigo-300 font-medium">
                        {callState.status === "CONNECTED" ? "Active Call" : "Connecting..."}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 border-l border-white/10 pl-2">
                    <button
                        onClick={() => callStore.toggleMute()}
                        className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                            callState.isMuted ? "bg-rose-600 text-white" : "bg-white/10 text-gray-300 hover:text-white"
                        }`}
                        title={callState.isMuted ? "Unmute" : "Mute"}
                    >
                        {callState.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={() => setIsMinimized(false)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition"
                        title="Expand Call Window"
                    >
                        <Maximize2 className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => callStore.endCall()}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-600 text-white hover:bg-rose-500 transition"
                        title="End Call"
                    >
                        <PhoneOff className="h-4 w-4" />
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md transition-opacity">
            <div className="relative flex w-full max-w-2xl flex-col items-center justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#11131f] p-6 shadow-2xl min-h-[420px]">
                {/* Header Info */}
                <div className="flex w-full items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white text-lg shadow-md">
                            {callState.peer?.displayName ? callState.peer.displayName.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div>
                            <h3 className="font-semibold text-white text-base leading-tight">
                                {callState.peer?.displayName || "FriendZone User"}
                            </h3>
                            <p className="text-xs text-indigo-300 font-medium">
                                {callState.type === "video" ? "Video Call" : "Audio Call"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
                            {callState.status === "RINGING" && (callState.isCaller ? "Calling..." : "Ringing...")}
                            {callState.status === "CONNECTING" && "Connecting..."}
                            {callState.status === "CONNECTED" && "Connected"}
                            {isTerminal && "Call Ended"}
                        </div>

                        {/* Minimize Overlay Button */}
                        <button
                            onClick={() => setIsMinimized(true)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
                            title="Minimize Call Window"
                        >
                            <Minimize2 className="h-4 w-4" />
                        </button>

                        {/* Direct Close Window Button */}
                        <button
                            onClick={() => {
                                setIsMinimized(false)
                                callStore.resetCall()
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition"
                            title="Close Window"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="my-6 flex w-full flex-1 items-center justify-center relative rounded-xl overflow-hidden bg-[#07080e] border border-white/5 min-h-[260px]">
                    {callState.status === "CONNECTED" ? (
                        callState.type === "video" ? (
                            <div className="relative h-full w-full flex items-center justify-center">
                                {/* Remote Video (Main View) */}
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    className="h-full w-full object-cover rounded-xl"
                                />

                                {/* Local Video (Pip Badge) */}
                                <div className="absolute bottom-3 right-3 h-28 w-20 sm:h-36 sm:w-28 overflow-hidden rounded-lg border-2 border-white/20 bg-black shadow-lg">
                                    <video
                                        ref={localVideoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            </div>
                        ) : (
                            /* Audio Call Avatar View */
                            <div className="flex flex-col items-center justify-center gap-4 py-8">
                                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-indigo-600 text-3xl font-bold text-white shadow-[0_0_30px_rgba(99,102,241,0.4)] animate-pulse">
                                    {callState.peer?.displayName ? callState.peer.displayName.charAt(0).toUpperCase() : "U"}
                                </div>
                                <p className="text-sm font-medium text-slate-300">Audio Call Active</p>
                            </div>
                        )
                    ) : isTerminal ? (
                        /* Terminal Error / Ended State */
                        <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                            <AlertCircle className="h-10 w-10 text-rose-400" />
                            <p className="text-base font-semibold text-white">
                                {callState.errorMessage || `Call ${callState.status.toLowerCase()}`}
                            </p>
                        </div>
                    ) : (
                        /* Calling / Ringing Avatar View */
                        <div className="flex flex-col items-center justify-center gap-4 py-8">
                            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-600/30 text-3xl font-bold text-white border border-indigo-500/40 animate-pulse">
                                {callState.peer?.displayName ? callState.peer.displayName.charAt(0).toUpperCase() : "U"}
                            </div>
                            <p className="text-sm font-medium text-slate-300">
                                {callState.isCaller ? "Calling user..." : "Incoming call..."}
                            </p>
                        </div>
                    )}
                </div>

                {/* Control Action Buttons Bar */}
                <div className="flex w-full items-center justify-center gap-4 pt-2">
                    {(callState.status === "CONNECTED" || callState.status === "CONNECTING") && (
                        <>
                            {/* Mic Mute Toggle */}
                            <button
                                onClick={() => callStore.toggleMute()}
                                className={`flex h-12 w-12 items-center justify-center rounded-full transition-all shadow-md ${
                                    callState.isMuted
                                        ? "bg-rose-600 hover:bg-rose-500 text-white"
                                        : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                                }`}
                                title={callState.isMuted ? "Unmute Microphone" : "Mute Microphone"}
                            >
                                {callState.isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                            </button>

                            {/* Camera Off Toggle (Video Calls Only) */}
                            {callState.type === "video" && (
                                <button
                                    onClick={() => callStore.toggleVideo()}
                                    className={`flex h-12 w-12 items-center justify-center rounded-full transition-all shadow-md ${
                                        callState.isVideoOff
                                            ? "bg-rose-600 hover:bg-rose-500 text-white"
                                            : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                                    }`}
                                    title={callState.isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
                                >
                                    {callState.isVideoOff ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}
                                </button>
                            )}

                            {/* End Call Button */}
                            <button
                                onClick={() => callStore.endCall()}
                                className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg"
                                title="End Call"
                            >
                                <PhoneOff className="h-5 w-5" />
                            </button>
                        </>
                    )}

                    {callState.status === "RINGING" && (
                        callState.isCaller ? (
                            /* Caller view: Show single Cancel button */
                            <button
                                onClick={() => callStore.cancelCall()}
                                className="flex items-center gap-2 rounded-full bg-rose-600 px-6 py-3 font-semibold text-white hover:bg-rose-500 transition-all shadow-lg min-h-[44px]"
                            >
                                <PhoneOff className="h-5 w-5" />
                                <span>Cancel Call</span>
                            </button>
                        ) : (
                            /* Recipient view: Show Accept & Decline buttons */
                            <>
                                <button
                                    onClick={() => callStore.acceptCall()}
                                    className="flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-500 transition-all shadow-lg min-h-[44px]"
                                >
                                    <Phone className="h-5 w-5" />
                                    <span>Accept</span>
                                </button>

                                <button
                                    onClick={() => callStore.declineCall()}
                                    className="flex items-center gap-2 rounded-full bg-rose-600 px-6 py-3 font-semibold text-white hover:bg-rose-500 transition-all shadow-lg min-h-[44px]"
                                >
                                    <PhoneOff className="h-5 w-5" />
                                    <span>Decline</span>
                                </button>
                            </>
                        )
                    )}

                    {isTerminal && (
                        <button
                            onClick={() => {
                                setIsMinimized(false)
                                callStore.resetCall()
                            }}
                            className="rounded-full bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-all min-h-[44px]"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
