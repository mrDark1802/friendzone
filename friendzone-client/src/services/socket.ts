import { io, Socket } from "socket.io-client"

const SOCKET_SERVER_URL = "https://friendzone-g05i.onrender.coms"

let socket: Socket | null = null

export function connectSocket(token: string): Socket {
    if (socket && socket.connected) {
        return socket
    }

    if (socket) {
        socket.disconnect()
    }

    socket = io(SOCKET_SERVER_URL, {
        auth: { token },
        withCredentials: true,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
    })

    socket.on("connect", () => {
        // Connected to Socket.IO
    })

    socket.on("connect_error", () => {
        // Handle socket connect error
    })

    return socket
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

export function joinConversationRoom(conversationId: string) {
    if (socket && socket.connected) {
        socket.emit("join_conversation", { conversationId })
    }
}

export function sendMessageViaSocket(
    payload: {
        conversationId: string
        contentOriginal: string
        originalLanguage: string
        idempotencyKey: string
    },
    ackCallback?: (response: { status: string; messageId?: string; isDuplicate?: boolean }) => void
) {
    if (socket && socket.connected) {
        socket.emit("send_message", payload, ackCallback)
    }
}

export function markReadViaSocket(conversationId: string, messageId: string) {
    if (socket && socket.connected) {
        socket.emit("mark_read", { conversationId, messageId })
    }
}

export function emitTypingStart(conversationId: string) {
    if (socket && socket.connected) {
        socket.emit("typing_start", { conversationId })
    }
}

export function emitTypingStop(conversationId: string) {
    if (socket && socket.connected) {
        socket.emit("typing_stop", { conversationId })
    }
}

export function onUserTyping(callback: (payload: { conversationId: string; userId: string }) => void) {
    if (socket) {
        socket.on("user_typing", callback)
    }
}

export function onUserStoppedTyping(callback: (payload: { conversationId: string; userId: string }) => void) {
    if (socket) {
        socket.on("user_stopped_typing", callback)
    }
}

export function onUserStatusChanged(callback: (payload: { userId: string; status: "ONLINE" | "OFFLINE"; lastSeen: string | null }) => void) {
    if (socket) {
        socket.on("user_status_changed", callback)
    }
}

export function requestUserStatus(userIds: string[]) {
    if (socket && socket.connected) {
        socket.emit("get_user_status", { userIds })
    }
}

export function onUserStatusResponse(callback: (payload: Array<{ userId: string; isOnline: boolean; lastSeen: string | null }>) => void) {
    if (socket) {
        socket.on("user_status_response", callback)
    }
}

export function onFriendRequestReceived(callback: (payload: any) => void) {
    if (socket) {
        socket.on("friend_request_received", callback)
    }
}
