import { io, Socket } from "socket.io-client"
import { callStore } from "./callStore"
import { getMemoryAccessToken, refreshAccessToken, messagesApi, getApiBaseUrl } from "./api"

function getSocketServerUrl(): string {
    if (import.meta.env.VITE_SOCKET_SERVER_URL && import.meta.env.VITE_SOCKET_SERVER_URL.trim().length > 0) {
        return import.meta.env.VITE_SOCKET_SERVER_URL.trim().replace(/\/+$/, "")
    }
    const apiBase = getApiBaseUrl()
    try {
        const url = new URL(apiBase)
        return url.origin
    } catch {
        return "http://localhost:5000"
    }
}

let socket: Socket | null = null
let isRefreshingToken = false
let currentJoinedConversationId: string | null = null

export function connectSocket(initialToken?: string): Socket {
    const token = initialToken || getMemoryAccessToken()
    const targetServerUrl = getSocketServerUrl()

    if (socket && socket.connected) {
        callStore.initSocketListeners()
        return socket
    }

    if (socket) {
        socket.disconnect()
        socket = null
    }

    socket = io(targetServerUrl, {
        auth: (cb) => {
            const currentToken = getMemoryAccessToken() || token
            cb({ token: currentToken })
        },
        query: {
            token: getMemoryAccessToken() || token || "",
        },
        transports: ["websocket", "polling"],
        withCredentials: true,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
    })

    socket.on("connect", () => {
        console.log("Socket connected successfully to:", targetServerUrl, "id:", socket?.id)
        callStore.initSocketListeners()
        if (currentJoinedConversationId && socket) {
            socket.emit("join_conversation", { conversationId: currentJoinedConversationId })
        }
    })

    socket.on("connect_error", async (err: any) => {
        console.warn("Socket connection error:", err?.message || err)
        // If JWT token expired or failed auth, trigger silent refresh & reconnect
        if (
            err?.message?.includes("Authentication") ||
            err?.message?.includes("token") ||
            err?.message?.includes("jwt") ||
            err?.message?.includes("expired")
        ) {
            if (!isRefreshingToken) {
                isRefreshingToken = true
                try {
                    const newToken = await refreshAccessToken()
                    if (newToken && socket) {
                        socket.auth = { token: newToken }
                        socket.io.opts.query = { token: newToken }
                        socket.connect()
                    }
                } catch {
                    // Refresh failed
                } finally {
                    isRefreshingToken = false
                }
            }
        }
    })

    return socket
}

/**
 * Asynchronously ensures the socket is connected before performing an operation.
 */
export async function ensureSocketConnected(timeoutMs = 4000): Promise<Socket> {
    const token = getMemoryAccessToken()
    if (!token) {
        throw new Error("Cannot connect socket: User not authenticated")
    }

    if (!socket || (!socket.connected && !socket.active)) {
        socket = connectSocket(token)
    }

    if (socket.connected) {
        return socket
    }

    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            if (socket?.connected) {
                resolve(socket)
            } else {
                reject(new Error("Socket connection timed out"))
            }
        }, timeoutMs)

        const onConnect = () => {
            clearTimeout(timer)
            if (socket) resolve(socket)
        }

        const onError = (err: any) => {
            clearTimeout(timer)
            reject(err)
        }

        socket!.once("connect", onConnect)
        socket!.once("connect_error", onError)
    })
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect()
        socket = null
    }
}

export function getSocket(): Socket | null {
    return socket
}

export type Unsubscribe = () => void

export async function joinConversationRoom(conversationId: string) {
    try {
        const activeSocket = await ensureSocketConnected(3000)
        if (currentJoinedConversationId && currentJoinedConversationId !== conversationId) {
            activeSocket.emit("leave_conversation", { conversationId: currentJoinedConversationId })
        }
        currentJoinedConversationId = conversationId
        activeSocket.emit("join_conversation", { conversationId })
    } catch (err) {
        console.warn("Failed to join conversation room via socket:", err)
    }
}

export async function leaveConversationRoom(conversationId: string) {
    try {
        if (socket && socket.connected) {
            socket.emit("leave_conversation", { conversationId })
        }
        if (currentJoinedConversationId === conversationId) {
            currentJoinedConversationId = null
        }
    } catch (err) {
        console.warn("Failed to leave conversation room via socket:", err)
    }
}

export async function sendMessageViaSocket(
    payload: {
        conversationId: string
        contentOriginal: string
        originalLanguage: string
        idempotencyKey: string
        mediaAssetId?: string
    },
    ackCallback?: (response: { status: string; messageId?: string; isDuplicate?: boolean }) => void
) {
    try {
        const activeSocket = await ensureSocketConnected(3000)
        activeSocket.emit("send_message", payload, ackCallback)
    } catch (err: any) {
        console.warn("Socket send failed or timed out, executing HTTP REST fallback...", err)
        try {
            const res = await messagesApi.sendMessage(
                payload.conversationId,
                payload.contentOriginal,
                payload.originalLanguage,
                payload.idempotencyKey
            )
            if (ackCallback) {
                ackCallback({ status: "saved", messageId: res?.message?.id || res?.id })
            }
        } catch (restErr) {
            console.error("HTTP REST send message fallback failed:", restErr)
            if (ackCallback) {
                ackCallback({ status: "error" })
            }
        }
    }
}

export async function markReadViaSocket(conversationId: string, messageId: string) {
    try {
        const activeSocket = await ensureSocketConnected(3000)
        activeSocket.emit("mark_read", { conversationId, messageId })
    } catch {
        // Silent catch for background read receipt
    }
}

export async function emitTypingStart(conversationId: string) {
    if (socket && socket.connected) {
        socket.emit("typing_start", { conversationId })
    }
}

export async function emitTypingStop(conversationId: string) {
    if (socket && socket.connected) {
        socket.emit("typing_stop", { conversationId })
    }
}

export function onUserTyping(callback: (payload: { conversationId: string; userId: string }) => void): Unsubscribe {
    if (socket) {
        socket.on("user_typing", callback)
    }
    return () => {
        socket?.off("user_typing", callback)
    }
}

export function onUserStoppedTyping(callback: (payload: { conversationId: string; userId: string }) => void): Unsubscribe {
    if (socket) {
        socket.on("user_stopped_typing", callback)
    }
    return () => {
        socket?.off("user_stopped_typing", callback)
    }
}

export function onUserStatusChanged(callback: (payload: { userId: string; status: "ONLINE" | "OFFLINE"; lastSeen: string | null }) => void): Unsubscribe {
    if (socket) {
        socket.on("user_status_changed", callback)
    }
    return () => {
        socket?.off("user_status_changed", callback)
    }
}

export async function requestUserStatus(userIds: string[]) {
    try {
        const activeSocket = await ensureSocketConnected(3000)
        activeSocket.emit("get_user_status", { userIds })
    } catch {
        // Silent catch
    }
}

export function onUserStatusResponse(callback: (payload: Array<{ userId: string; isOnline: boolean; lastSeen: string | null }>) => void): Unsubscribe {
    if (socket) {
        socket.on("user_status_response", callback)
    }
    return () => {
        socket?.off("user_status_response", callback)
    }
}

export function onFriendRequestReceived(callback: (payload: any) => void): Unsubscribe {
    if (socket) {
        socket.on("friend_request_received", callback)
    }
    return () => {
        socket?.off("friend_request_received", callback)
    }
}

export function onGroupCreated(callback: (payload: any) => void): Unsubscribe {
    if (socket) {
        socket.on("group:created", callback)
    }
    return () => {
        socket?.off("group:created", callback)
    }
}

export function onGroupMemberAdded(callback: (payload: any) => void): Unsubscribe {
    if (socket) {
        socket.on("group:member_added", callback)
    }
    return () => {
        socket?.off("group:member_added", callback)
    }
}

export function onGroupMemberRemoved(callback: (payload: any) => void): Unsubscribe {
    if (socket) {
        socket.on("group:member_removed", callback)
    }
    return () => {
        socket?.off("group:member_removed", callback)
    }
}

export function onGroupMemberLeft(callback: (payload: any) => void): Unsubscribe {
    if (socket) {
        socket.on("group:member_left", callback)
    }
    return () => {
        socket?.off("group:member_left", callback)
    }
}

export function onGroupRoleUpdated(callback: (payload: any) => void): Unsubscribe {
    if (socket) {
        socket.on("group:role_updated", callback)
    }
    return () => {
        socket?.off("group:role_updated", callback)
    }
}

export function onGroupUpdated(callback: (payload: any) => void): Unsubscribe {
    if (socket) {
        socket.on("group:updated", callback)
    }
    return () => {
        socket?.off("group:updated", callback)
    }
}

export async function editMessageViaSocket(
    messageId: string,
    contentOriginal: string,
    ackCallback?: (response: { status: string; message?: any }) => void
) {
    try {
        const activeSocket = await ensureSocketConnected(3000)
        activeSocket.emit("edit_message", { messageId, contentOriginal }, ackCallback)
    } catch (err) {
        try {
            const res = await messagesApi.editMessage(messageId, contentOriginal)
            if (ackCallback) {
                ackCallback({ status: "edited", message: res?.message || res })
            }
        } catch {
            if (ackCallback) ackCallback({ status: "error" })
        }
    }
}

export async function deleteMessageViaSocket(
    messageId: string,
    ackCallback?: (response: { status: string; messageId?: string; conversationId?: string }) => void
) {
    try {
        const activeSocket = await ensureSocketConnected(3000)
        activeSocket.emit("delete_message", { messageId }, ackCallback)
    } catch (err) {
        try {
            const res = await messagesApi.deleteMessage(messageId)
            if (ackCallback) {
                ackCallback({ status: "deleted", messageId: res?.messageId, conversationId: res?.conversationId })
            }
        } catch {
            if (ackCallback) ackCallback({ status: "error" })
        }
    }
}

export function onMessageEdited(callback: (payload: { message: any }) => void): Unsubscribe {
    if (socket) {
        socket.on("message_edited", callback)
    }
    return () => {
        socket?.off("message_edited", callback)
    }
}

export function onMessageDeleted(callback: (payload: { messageId: string; conversationId: string }) => void): Unsubscribe {
    if (socket) {
        socket.on("message_deleted", callback)
    }
    return () => {
        socket?.off("message_deleted", callback)
    }
}

