import { getSocket } from "./socket"
import { callsApi } from "./api"

export interface IceServerConfig {
    urls: string | string[]
    username?: string
    credential?: string
}

export class WebRTCManager {
    private pc: RTCPeerConnection | null = null
    private localStream: MediaStream | null = null
    private remoteStream: MediaStream | null = null
    private queuedCandidates: RTCIceCandidateInit[] = []
    private isPolite = false
    private isMakingOffer = false
    private ignoreOffer = false
    private callId: string | null = null
    private targetUserId: string | null = null

    private onRemoteStreamCallbacks: Array<(stream: MediaStream) => void> = []
    private onConnectionStateCallbacks: Array<(state: RTCPeerConnectionState) => void> = []

    public onRemoteStream(cb: (stream: MediaStream) => void) {
        this.onRemoteStreamCallbacks.push(cb)
    }

    public onConnectionStateChange(cb: (state: RTCPeerConnectionState) => void) {
        this.onConnectionStateCallbacks.push(cb)
    }

    /**
     * Fetches dynamic, short-lived ephemeral TURN/STUN credentials from backend.
     */
    public async fetchIceServers(): Promise<IceServerConfig[]> {
        try {
            const response = await callsApi.getIceServers()
            if (response?.iceServers) {
                return response.iceServers
            }
        } catch (err) {
            // Fallback to public STUN if backend request fails
        }
        return [
            { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }
        ]
    }

    /**
     * Obtains local media stream (microphone/camera).
     */
    public async getLocalMedia(video: boolean): Promise<MediaStream> {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Media devices are not accessible. Please use HTTPS or localhost.")
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
            })
            this.localStream = stream
            return stream
        } catch (err: any) {
            // Fallback 1: Try standard video constraint without resolution requirements
            if (video) {
                try {
                    const fallbackStream = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                        video: true,
                    })
                    this.localStream = fallbackStream
                    return fallbackStream
                } catch {
                    // Fallback 2: Try audio only if video device is unavailable
                    try {
                        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
                            audio: true,
                            video: false,
                        })
                        this.localStream = audioOnlyStream
                        return audioOnlyStream
                    } catch (audioErr) {
                        throw audioErr
                    }
                }
            }
            throw err
        }
    }

    /**
     * Initializes RTCPeerConnection with STUN/TURN configuration and perfect negotiation rules.
     */
    public async initializePeerConnection(callId: string, targetUserId: string, isPolite: boolean): Promise<RTCPeerConnection> {
        this.cleanupPeerConnectionOnly()
        this.callId = callId
        this.targetUserId = targetUserId
        this.isPolite = isPolite
        this.remoteStream = new MediaStream()

        const iceServers = await this.fetchIceServers()
        this.pc = new RTCPeerConnection({ iceServers })

        // Attach local tracks to peer connection
        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => {
                if (this.pc && this.localStream) {
                    this.pc.addTrack(track, this.localStream)
                }
            })
        }

        // Handle incoming remote tracks
        this.pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                this.remoteStream = event.streams[0]
            } else {
                if (this.remoteStream) {
                    this.remoteStream.addTrack(event.track)
                }
            }
            this.onRemoteStreamCallbacks.forEach((cb) => cb(this.remoteStream!))
            this.onConnectionStateCallbacks.forEach((cb) => cb("connected"))
        }

        // Handle ICE candidates generated locally
        this.pc.onicecandidate = (event) => {
            if (event.candidate && this.callId && this.targetUserId) {
                const socket = getSocket()
                if (socket) {
                    socket.emit("webrtc:ice-candidate", {
                        callId: this.callId,
                        targetUserId: this.targetUserId,
                        candidate: event.candidate,
                    })
                }
            }
        }

        // Perfect Negotiation: Handle negotiationneeded event
        this.pc.onnegotiationneeded = async () => {
            try {
                if (!this.pc || !this.callId || !this.targetUserId) return
                this.isMakingOffer = true
                const offer = await this.pc.createOffer()
                if (this.pc.signalingState !== "stable") return
                await this.pc.setLocalDescription(offer)

                const socket = getSocket()
                if (socket) {
                    socket.emit("webrtc:offer", {
                        callId: this.callId,
                        targetUserId: this.targetUserId,
                        offer: this.pc.localDescription,
                    })
                }
            } catch (err) {
                // Ignore negotiation error
            } finally {
                this.isMakingOffer = false
            }
        }

        // Connection state monitoring across connectionState and iceConnectionState
        const notifyConnected = () => {
            if (!this.pc) return
            const state = this.pc.connectionState
            const iceState = this.pc.iceConnectionState

            if (state === "connected" || iceState === "connected" || iceState === "completed") {
                this.onConnectionStateCallbacks.forEach((cb) => cb("connected"))

                if (this.callId) {
                    const socket = getSocket()
                    if (socket) {
                        socket.emit("call:connected", { callId: this.callId })
                    }
                }
            } else if (state === "failed" || iceState === "failed") {
                this.onConnectionStateCallbacks.forEach((cb) => cb("failed"))
            }
        }

        this.pc.onconnectionstatechange = notifyConnected
        this.pc.oniceconnectionstatechange = notifyConnected

        return this.pc
    }

    /**
     * Handles incoming WebRTC SDP offer using Perfect Negotiation pattern.
     */
    public async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
        if (!this.pc || !this.callId || !this.targetUserId) return

        const offerCollision = this.isMakingOffer || this.pc.signalingState !== "stable"
        this.ignoreOffer = !this.isPolite && offerCollision

        if (this.ignoreOffer) {
            return
        }

        await this.pc.setRemoteDescription(new RTCSessionDescription(offer))
        await this.flushQueuedIceCandidates()

        const answer = await this.pc.createAnswer()
        await this.pc.setLocalDescription(answer)

        const socket = getSocket()
        if (socket) {
            socket.emit("webrtc:answer", {
                callId: this.callId,
                targetUserId: this.targetUserId,
                answer: this.pc.localDescription,
            })
        }
    }

    /**
     * Handles incoming WebRTC SDP answer.
     */
    public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
        if (!this.pc) return
        if (this.pc.signalingState === "have-local-offer") {
            await this.pc.setRemoteDescription(new RTCSessionDescription(answer))
            await this.flushQueuedIceCandidates()
        }
    }

    /**
     * Handles incoming remote ICE candidates. Queues candidate if remoteDescription is not yet set.
     */
    public async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
        if (!this.pc) return

        if (!this.pc.remoteDescription) {
            this.queuedCandidates.push(candidate)
            return
        }

        try {
            await this.pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (err) {
            // Ignore candidate error
        }
    }

    /**
     * Flushes queued ICE candidates after remoteDescription is applied.
     */
    private async flushQueuedIceCandidates(): Promise<void> {
        if (!this.pc || this.queuedCandidates.length === 0) return
        const candidates = [...this.queuedCandidates]
        this.queuedCandidates = []
        for (const candidate of candidates) {
            try {
                await this.pc.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (err) {
                // Ignore candidate error
            }
        }
    }

    /**
     * Toggles microphone audio track (Zero SDP renegotiation).
     */
    public toggleAudio(enabled: boolean): void {
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach((t) => {
                t.enabled = enabled
            })
        }
    }

    /**
     * Toggles video track (Zero SDP renegotiation).
     */
    public toggleVideo(enabled: boolean): void {
        if (this.localStream) {
            this.localStream.getVideoTracks().forEach((t) => {
                t.enabled = enabled
            })
        }
    }

    /**
     * Replaces media track (e.g. camera device switch) without tearing down connection.
     */
    public async replaceVideoTrack(newTrack: MediaStreamTrack): Promise<void> {
        if (!this.pc) return
        const sender = this.pc.getSenders().find((s) => s.track && s.track.kind === "video")
        if (sender) {
            await sender.replaceTrack(newTrack)
        }
    }

    public getLocalStream(): MediaStream | null {
        return this.localStream
    }

    public getRemoteStream(): MediaStream | null {
        return this.remoteStream
    }

    public cleanupPeerConnectionOnly(): void {
        if (this.pc) {
            this.pc.ontrack = null
            this.pc.onicecandidate = null
            this.pc.onnegotiationneeded = null
            this.pc.onconnectionstatechange = null
            this.pc.close()
            this.pc = null
        }
        this.queuedCandidates = []
        this.isMakingOffer = false
        this.ignoreOffer = false
    }

    /**
     * Releases media tracks and closes RTCPeerConnection cleanly.
     */
    public cleanup(): void {
        if (this.localStream) {
            this.localStream.getTracks().forEach((t) => t.stop())
            this.localStream = null
        }
        if (this.remoteStream) {
            this.remoteStream.getTracks().forEach((t) => t.stop())
            this.remoteStream = null
        }
        this.cleanupPeerConnectionOnly()
        this.callId = null
        this.targetUserId = null
    }
}

export const webRTCManager = new WebRTCManager()
