import { webRTCManager } from "./webRTCManager"
import { getSocket } from "./socket"

export type CallStatus =
    | "IDLE"
    | "RINGING"
    | "ACCEPTED"
    | "CONNECTING"
    | "CONNECTED"
    | "ENDED"
    | "DECLINED"
    | "CANCELLED"
    | "TIMEOUT"
    | "BUSY"
    | "FAILED"

export interface CallPeer {
    id: string
    displayName: string
    avatar?: string
}

export interface CallState {
    callId: string | null
    conversationId: string | null
    peer: CallPeer | null
    type: "audio" | "video"
    status: CallStatus
    isCaller: boolean
    isMuted: boolean
    isVideoOff: boolean
    errorMessage: string | null
}

type Listener = (state: CallState) => void

class CallStore {
    private state: CallState = {
        callId: null,
        conversationId: null,
        peer: null,
        type: "video",
        status: "IDLE",
        isCaller: false,
        isMuted: false,
        isVideoOff: false,
        errorMessage: null,
    }

    private listeners: Set<Listener> = new Set()
    private isInitialized = false
    private ringtoneAudio: HTMLAudioElement | null = null

    public getState(): CallState {
        return this.state
    }

    public subscribe(listener: Listener): () => void {
        this.listeners.add(listener)
        listener(this.state)
        return () => {
            this.listeners.delete(listener)
        }
    }

    private updateState(partial: Partial<CallState>) {
        this.state = { ...this.state, ...partial }
        this.listeners.forEach((cb) => cb(this.state))
    }

    /**
     * Initializes Socket.IO event listeners for incoming calls and WebRTC signaling.
     */
    public initSocketListeners() {
        const socket = getSocket()
        if (!socket || this.isInitialized) return

        this.isInitialized = true

        socket.on("call:incoming", ({ callId, conversationId, caller, type }) => {
            if (this.state.status !== "IDLE") {
                socket.emit("call:busy", { callId, reason: "Already in call" })
                return
            }
            this.playRingtone()
            this.updateState({
                callId,
                conversationId,
                peer: caller,
                type,
                status: "RINGING",
                isCaller: false,
                errorMessage: null,
            })
        })

        socket.on("call:accepted", async ({ callId }) => {
            if (this.state.callId === callId) {
                this.stopRingtone()
                this.updateState({ status: "CONNECTING" })

                try {
                    await webRTCManager.initializePeerConnection(callId, this.state.peer!.id, true)
                } catch (err: any) {
                    this.updateState({ status: "FAILED", errorMessage: err?.message || "Failed to initialize media stream" })
                }
            }
        })

        socket.on("call:connected", ({ callId }) => {
            if (this.state.callId === callId) {
                this.updateState({ status: "CONNECTED" })
            }
        })

        socket.on("call:declined", ({ callId }) => {
            if (this.state.callId === callId) {
                this.stopRingtone()
                this.updateState({ status: "DECLINED", errorMessage: "Call was declined" })
                setTimeout(() => this.resetCall(), 2500)
            }
        })

        socket.on("call:cancelled", ({ callId }) => {
            if (this.state.callId === callId) {
                this.stopRingtone()
                this.updateState({ status: "CANCELLED", errorMessage: "Call was cancelled" })
                setTimeout(() => this.resetCall(), 2500)
            }
        })

        socket.on("call:timeout", ({ callId }) => {
            if (this.state.callId === callId) {
                this.stopRingtone()
                this.updateState({ status: "TIMEOUT", errorMessage: "Call timed out" })
                setTimeout(() => this.resetCall(), 2500)
            }
        })

        socket.on("call:busy", ({ reason }) => {
            this.stopRingtone()
            this.updateState({ status: "BUSY", errorMessage: reason || "User is busy" })
            setTimeout(() => this.resetCall(), 2500)
        })

        socket.on("call:ended", ({ callId }) => {
            if (this.state.callId === callId) {
                this.stopRingtone()
                this.updateState({ status: "ENDED" })
                webRTCManager.cleanup()
                setTimeout(() => this.resetCall(), 1500)
            }
        })

        socket.on("call:reconnected", ({ callId, status }) => {
            if (this.state.callId === callId) {
                this.updateState({ status })
            }
        })

        socket.on("webrtc:offer", async ({ callId, offer }) => {
            if (this.state.callId === callId) {
                await webRTCManager.handleOffer(offer)
            }
        })

        socket.on("webrtc:answer", async ({ callId, answer }) => {
            if (this.state.callId === callId) {
                await webRTCManager.handleAnswer(answer)
            }
        })

        socket.on("webrtc:ice-candidate", async ({ callId, candidate }) => {
            if (this.state.callId === callId) {
                await webRTCManager.handleIceCandidate(candidate)
            }
        })

        // WebRTC connection state callback
        webRTCManager.onConnectionStateChange((connState) => {
            if (connState === "connected") {
                this.updateState({ status: "CONNECTED" })
            } else if (connState === "failed") {
                this.updateState({ status: "FAILED", errorMessage: "Connection lost. Please retry." })
            }
        })
    }

    /**
     * Initiates 1-on-1 audio or video call.
     */
    public async startCall(conversationId: string, targetUser: CallPeer, type: "audio" | "video") {
        if (["ENDED", "CANCELLED", "DECLINED", "TIMEOUT", "FAILED", "BUSY"].includes(this.state.status)) {
            this.resetCall()
        }
        if (this.state.status !== "IDLE") return

        const socket = getSocket()
        if (!socket || !socket.connected) {
            this.updateState({ status: "FAILED", errorMessage: "Socket disconnected" })
            return
        }

        try {
            await webRTCManager.getLocalMedia(type === "video")
        } catch (err: any) {
            const msg = err?.name === "NotAllowedError" ? "Camera/Microphone permission denied" : "Failed to access media devices"
            this.updateState({ status: "FAILED", errorMessage: msg })
            return
        }

        this.updateState({
            conversationId,
            peer: targetUser,
            type,
            status: "RINGING",
            isCaller: true,
            isMuted: false,
            isVideoOff: type === "audio",
            errorMessage: null,
        })

        socket.emit("call:invite", { conversationId, targetUserId: targetUser.id, type })
    }

    /**
     * Accepts incoming call.
     */
    public async acceptCall() {
        if (this.state.status !== "RINGING" || !this.state.callId) return

        this.stopRingtone()
        const socket = getSocket()
        if (!socket) return

        try {
            await webRTCManager.getLocalMedia(this.state.type === "video")
            await webRTCManager.initializePeerConnection(this.state.callId, this.state.peer!.id, false)
            socket.emit("call:accept", { callId: this.state.callId })
            this.updateState({ status: "CONNECTING" })
        } catch (err: any) {
            const msg = err?.name === "NotAllowedError" ? "Camera/Microphone permission denied" : "Failed to access media devices"
            this.updateState({ status: "FAILED", errorMessage: msg })
            socket.emit("call:decline", { callId: this.state.callId })
        }
    }

    /**
     * Declines incoming call.
     */
    public declineCall() {
        this.stopRingtone()
        const socket = getSocket()
        if (socket) {
            socket.emit("call:decline", { callId: this.state.callId, conversationId: this.state.conversationId })
        }
        this.resetCall()
    }

    /**
     * Cancels outgoing call before recipient accepts.
     */
    public cancelCall() {
        this.stopRingtone()
        const socket = getSocket()
        if (socket) {
            socket.emit("call:cancel", { callId: this.state.callId, conversationId: this.state.conversationId })
        }
        webRTCManager.cleanup()
        this.resetCall()
    }

    /**
     * Ends active call.
     */
    public endCall() {
        this.stopRingtone()
        const socket = getSocket()
        if (socket) {
            socket.emit("call:end", { callId: this.state.callId, conversationId: this.state.conversationId })
        }
        webRTCManager.cleanup()
        this.resetCall()
    }

    public toggleMute() {
        const newMuted = !this.state.isMuted
        webRTCManager.toggleAudio(!newMuted)
        this.updateState({ isMuted: newMuted })
    }

    public toggleVideo() {
        if (this.state.type === "audio") return
        const newVideoOff = !this.state.isVideoOff
        webRTCManager.toggleVideo(!newVideoOff)
        this.updateState({ isVideoOff: newVideoOff })
    }

    public resetCall() {
        this.stopRingtone()
        webRTCManager.cleanup()
        this.updateState({
            callId: null,
            conversationId: null,
            peer: null,
            type: "video",
            status: "IDLE",
            isCaller: false,
            isMuted: false,
            isVideoOff: false,
            errorMessage: null,
        })
    }

    private playRingtone() {
        try {
            if (!this.ringtoneAudio) {
                // Audio synthesis pulse for call alert
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
                const osc = ctx.createOscillator()
                const gain = ctx.createGain()
                osc.type = "sine"
                osc.frequency.setValueAtTime(440, ctx.currentTime)
                gain.gain.setValueAtTime(0.1, ctx.currentTime)
                osc.connect(gain)
                gain.connect(ctx.destination)
                osc.start()
                setTimeout(() => {
                    try { osc.stop() } catch (e) {}
                }, 1200)
            }
        } catch (e) {}
    }

    private stopRingtone() {
        if (this.ringtoneAudio) {
            this.ringtoneAudio.pause()
            this.ringtoneAudio = null
        }
    }
}

export const callStore = new CallStore()
