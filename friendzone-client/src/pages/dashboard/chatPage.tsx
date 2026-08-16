import { useState, useEffect, useRef, type FormEvent, type MouseEvent } from "react"
import { useSearchParams } from "react-router-dom"
import {
    Search,
    Send,
    Languages,
    ArrowLeft,
    Loader2,
    Globe,
    Pin,
    BellOff,
    Volume2,
    UserX,
    Check,
    CheckCheck,
    Ban,
    Phone,
    Video,
    Smile,
    Clock,
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { conversationsApi, messagesApi, friendshipsApi, notificationsApi, usersApi } from "../../services/api"
import SubscriptionModal from "../../components/SubscriptionModal"
import EmojiPicker from "../../components/EmojiPicker"
import CallHistoryModal from "../../components/CallHistoryModal"
import { callStore } from "../../services/callStore"
import {
    getSocket,
    joinConversationRoom,
    sendMessageViaSocket,
    markReadViaSocket,
    emitTypingStart,
    emitTypingStop,
    onUserTyping,
    onUserStoppedTyping,
    onUserStatusChanged,
    requestUserStatus,
    onUserStatusResponse,
} from "../../services/socket"

interface MessageItem {
    id: string
    conversationId: string
    senderId: string
    senderName?: string
    contentOriginal: string
    originalLanguage: string
    idempotencyKey: string
    createdAt: string
    translations?: { targetLanguage: string; translatedContent?: string; status: string }[]
    isMe?: boolean
    status?: "SENT" | "DELIVERED" | "READ" | string
}

interface ConversationItem {
    id: string
    name: string
    avatar: string
    nativeLang: string
    unreadCount: number
    lastMessage: string
    lastMessageTime: string
    isPinned?: boolean
    isMuted?: boolean
    isBlocked?: boolean
    blockedByMe?: boolean
    members?: any[]
    otherUserId?: string
}

export default function ChatPage() {
    const { user, refreshProfile } = useAuth()
    const [searchParams, setSearchParams] = useSearchParams()

    const initialConvId = searchParams.get("id") || localStorage.getItem("fz_active_conv_id")
    const [conversations, setConversations] = useState<ConversationItem[]>([])
    const [activeConvId, setActiveConvId] = useState<string | null>(initialConvId)
    const [messages, setMessages] = useState<MessageItem[]>([])
    const [isLoadingConvs, setIsLoadingConvs] = useState(true)
    const [isLoadingMsgs, setIsLoadingMsgs] = useState(false)
    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)
    const [hasMoreMsgs, setHasMoreMsgs] = useState(false)

    const [inputMsg, setInputMsg] = useState("")
    const [searchFilter, setSearchFilter] = useState("")
    // Initialize from user profile — respects user's translationEnabled preference
    const [aiLive, setAiLive] = useState(() => user?.translationEnabled !== false)
    const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false)

    // Mobile View Toggle State
    const [mobileShowList, setMobileShowList] = useState(true)

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{
        x: number
        y: number
        chatId: string
    } | null>(null)

    const [toastMessage, setToastMessage] = useState<string | null>(null)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [showCallHistoryModal, setShowCallHistoryModal] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const chatContainerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const handleEmojiSelect = (emoji: string) => {
        if (inputRef.current) {
            const start = inputRef.current.selectionStart || inputMsg.length
            const end = inputRef.current.selectionEnd || inputMsg.length
            const updated = inputMsg.substring(0, start) + emoji + inputMsg.substring(end)
            setInputMsg(updated)
        } else {
            setInputMsg((prev) => prev + emoji)
        }
        setShowEmojiPicker(false)
    }

    const showToast = (msg: string) => {
        setToastMessage(msg)
        setTimeout(() => setToastMessage(null), 3000)
    }

    const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({})
    const [userPresence, setUserPresence] = useState<Record<string, { isOnline: boolean; lastSeen: string | null }>>({})
    const typingTimeoutRef = useRef<any>(null)

    // Socket Typing & Presence Listeners
    useEffect(() => {
        onUserTyping(({ conversationId }) => {
            setTypingUsers((prev) => ({ ...prev, [conversationId]: true }))
        })

        onUserStoppedTyping(({ conversationId }) => {
            setTypingUsers((prev) => ({ ...prev, [conversationId]: false }))
        })

        onUserStatusChanged(({ userId, status, lastSeen }) => {
            setUserPresence((prev) => ({
                ...prev,
                [userId]: { isOnline: status === "ONLINE", lastSeen },
            }))
        })

        onUserStatusResponse((statusArray) => {
            const map: Record<string, { isOnline: boolean; lastSeen: string | null }> = {}
            statusArray.forEach((item) => {
                map[item.userId] = { isOnline: item.isOnline, lastSeen: item.lastSeen }
            })
            setUserPresence((prev) => ({ ...prev, ...map }))
        })
    }, [])

    // Handle Input Change with Debounced Typing Emit
    const handleInputChange = (val: string) => {
        setInputMsg(val)
        if (activeConvId) {
            emitTypingStart(activeConvId)
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
            typingTimeoutRef.current = setTimeout(() => {
                emitTypingStop(activeConvId)
            }, 2000)
        }
    }

    // Close context menu on outside click
    useEffect(() => {
        const handleClick = () => setContextMenu(null)
        window.addEventListener("click", handleClick)
        return () => window.removeEventListener("click", handleClick)
    }, [])

    // 1. Fetch Conversations on Mount
    const loadConversations = async () => {
        setIsLoadingConvs(true)
        try {
            const rawConvs = await conversationsApi.getConversations()
            const mapped: ConversationItem[] = (rawConvs || []).map((c: any) => {
                const otherMember = c.members?.find((m: any) => m.userId !== user?.id)?.user
                return {
                    id: c.id,
                    name: c.title || otherMember?.displayName || otherMember?.email?.split("@")?.[0] || "Chat",
                    avatar: otherMember?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
                    nativeLang: (otherMember?.nativeLanguage || "en").toUpperCase(),
                    lastMessage: c.messages?.[0]?.contentOriginal || "No messages yet",
                    lastMessageTime: c.messages?.[0]?.createdAt ? new Date(c.messages[0].createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
                    unreadCount: 0,
                    isPinned: (JSON.parse(localStorage.getItem("fz_pinned_chats") || "[]")).includes(c.id),
                    isMuted: (JSON.parse(localStorage.getItem("fz_muted_chats") || "[]")).includes(c.id),
                    isBlocked: c.isBlocked || false,
                    blockedByMe: c.blockedByMe || false,
                    members: c.members,
                    otherUserId: otherMember?.id,
                }
            })
            setConversations(mapped)
            const urlId = searchParams.get("id")
            const storedId = localStorage.getItem("fz_active_conv_id")
            const preferredId = urlId || storedId

            let selectedId: string | null = null
            if (preferredId && mapped.some((c) => c.id === preferredId)) {
                selectedId = preferredId
            } else if (mapped.length > 0) {
                selectedId = mapped[0].id
            }

            if (selectedId) {
                setActiveConvId(selectedId)
                localStorage.setItem("fz_active_conv_id", selectedId)
                setSearchParams({ id: selectedId }, { replace: true })
            }

            // Query online presence for partners
            const partnerIds = mapped.map((m) => m.otherUserId).filter(Boolean) as string[]
            if (partnerIds.length > 0) {
                requestUserStatus(partnerIds)
            }
        } catch {
            setConversations([])
        } finally {
            setIsLoadingConvs(false)
        }
    }

    useEffect(() => {
        loadConversations()
    }, [])

    // 2. Load Messages for Active Conversation & Connect Socket Room
    const loadMessages = async (convId: string, cursor?: string) => {
        if (!cursor) setIsLoadingMsgs(true)
        try {
            const res = await messagesApi.getMessages(convId, 20, cursor)
            const newMsgs: MessageItem[] = (res.messages || []).map((m: any) => ({
                id: m.id,
                conversationId: m.conversationId,
                senderId: m.senderId,
                senderName: m.sender?.displayName || m.sender?.email?.split("@")[0] || "User",
                contentOriginal: m.contentOriginal,
                originalLanguage: m.originalLanguage || "en",
                idempotencyKey: m.idempotencyKey,
                createdAt: m.createdAt,
                translations: m.translations || [],
                isMe: m.senderId === user?.id,
                status: m.status || "SENT",
            }))

            if (cursor) {
                // Prepend older messages cleanly & preserve scroll position
                const container = chatContainerRef.current
                const previousHeight = container ? container.scrollHeight : 0

                setMessages((prev) => {
                    const existingIds = new Set(prev.map((p) => p.id))
                    const filteredNew = newMsgs.filter((n) => !existingIds.has(n.id))
                    return [...filteredNew, ...prev]
                })

                setTimeout(() => {
                    if (container) {
                        container.scrollTop = container.scrollHeight - previousHeight
                    }
                }, 50)
            } else {
                setMessages(newMsgs.reverse())
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
                }, 100)
            }

            setNextCursor(res.nextCursor)
            setHasMoreMsgs(!!res.nextCursor)
        } catch {
            if (!cursor) setMessages([])
        } finally {
            setIsLoadingMsgs(false)
        }
    }

    useEffect(() => {
        if (!activeConvId) {
            ;(window as any).__activeConversationId = null
            return
        }

        // Track globally active open conversation thread
        ;(window as any).__activeConversationId = activeConvId

        loadMessages(activeConvId).then(() => {
            markReadViaSocket(activeConvId, "latest")
            messagesApi.markRead(activeConvId, "latest").catch(() => {})
        })
        joinConversationRoom(activeConvId)

        // Attach Real-Time Socket Event Listeners
        const socket = getSocket()
        if (socket) {
            const handleMessageSent = (payload: { message: any }) => {
                const msg = payload.message
                if (msg && msg.conversationId === activeConvId) {
                    const mapped: MessageItem = {
                        id: msg.id,
                        conversationId: msg.conversationId,
                        senderId: msg.senderId,
                        senderName: msg.sender?.displayName || msg.sender?.email?.split("@")[0] || "User",
                        contentOriginal: msg.contentOriginal,
                        originalLanguage: msg.originalLanguage || "en",
                        idempotencyKey: msg.idempotencyKey,
                        createdAt: msg.createdAt,
                        translations: msg.translations || [],
                        isMe: msg.senderId === user?.id,
                        status: msg.status || "SENT",
                    }

                    // Auto-mark incoming active thread message as read
                    if (msg.senderId !== user?.id) {
                        markReadViaSocket(activeConvId, msg.id)
                        notificationsApi.markRead(`msg_${msg.id}`).catch(() => {})
                    }

                    // Deduplicate strictly by canonical `message.id`
                    setMessages((prev) => {
                        if (prev.some((p) => p.id === mapped.id)) return prev
                        return [...prev, mapped]
                    })

                    setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
                    }, 50)
                }
            }

            const handleMessageTranslated = (payload: { messageId: string; targetLanguage: string; translatedContent: string | null; status: string }) => {
                setMessages((prev) =>
                    prev.map((m) => {
                        if (m.id === payload.messageId) {
                            const updatedTranslations = m.translations ? [...m.translations] : []
                            const payloadLang = payload.targetLanguage.toLowerCase()
                            const existingIndex = updatedTranslations.findIndex((t) => t.targetLanguage.toLowerCase() === payloadLang)
                            const item = {
                                targetLanguage: payloadLang,
                                translatedContent: payload.translatedContent || undefined,
                                status: payload.status,
                            }
                            if (existingIndex >= 0) {
                                updatedTranslations[existingIndex] = item
                            } else {
                                updatedTranslations.push(item)
                            }
                            return { ...m, translations: updatedTranslations }
                        }
                        return m
                    })
                )
            }

            const handleReadReceipt = (payload: { conversationId: string; userId: string; lastReadMessageId?: string }) => {
                if (payload.conversationId === activeConvId) {
                    setMessages((prev) =>
                        prev.map((m) => {
                            if (m.isMe) {
                                return { ...m, status: "READ" }
                            }
                            return m
                        })
                    )
                }
            }

            const handleQuotaExceeded = () => {
                setIsQuotaModalOpen(true)
            }

            socket.on("message_sent", handleMessageSent)
            socket.on("message_translated", handleMessageTranslated)
            socket.on("read_receipt", handleReadReceipt)
            socket.on("quota_exceeded", handleQuotaExceeded)

            return () => {
                socket.off("message_sent", handleMessageSent)
                socket.off("message_translated", handleMessageTranslated)
                socket.off("read_receipt", handleReadReceipt)
                socket.off("quota_exceeded", handleQuotaExceeded)
            }
        }
    }, [activeConvId, user?.id])

    const handleSelectChat = (id: string) => {
        setActiveConvId(id)
        setMobileShowList(false)
        localStorage.setItem("fz_active_conv_id", id)
        setSearchParams({ id }, { replace: true })
    }

    const handleContextMenu = (e: MouseEvent, chatId: string) => {
        e.preventDefault()
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            chatId,
        })
    }

    const togglePinChat = (id: string) => {
        let isNowPinned = false
        setConversations((prev) => {
            const updated = prev.map((c) => {
                if (c.id === id) {
                    isNowPinned = !c.isPinned
                    return { ...c, isPinned: isNowPinned }
                }
                return c
            })
            const pinnedIds = updated.filter((c) => c.isPinned).map((c) => c.id)
            localStorage.setItem("fz_pinned_chats", JSON.stringify(pinnedIds))
            return updated
        })
        showToast(isNowPinned ? "Chat pinned to top." : "Chat unpinned.")
        setContextMenu(null)
    }

    const toggleMuteChat = (id: string) => {
        let isNowMuted = false
        setConversations((prev) => {
            const updated = prev.map((c) => {
                if (c.id === id) {
                    isNowMuted = !c.isMuted
                    return { ...c, isMuted: isNowMuted }
                }
                return c
            })
            const mutedIds = updated.filter((c) => c.isMuted).map((c) => c.id)
            localStorage.setItem("fz_muted_chats", JSON.stringify(mutedIds))
            return updated
        })
        showToast(isNowMuted ? "Notifications muted." : "Notifications unmuted.")
        setContextMenu(null)
    }

    const toggleBlockChat = async (id: string) => {
        const conv = conversations.find((c) => c.id === id)
        const targetUserId =
            conv?.otherUserId ||
            conv?.members?.find((m: any) => m.userId !== user?.id)?.userId ||
            conv?.members?.find((m: any) => m.user?.id !== user?.id)?.user?.id

        if (!targetUserId) {
            showToast("Could not find user to block.")
            setContextMenu(null)
            return
        }

        if (conv?.isBlocked && conv?.blockedByMe) {
            try {
                await friendshipsApi.unblockUser(targetUserId)
                setConversations((prev) =>
                    prev.map((c) => (c.id === id ? { ...c, isBlocked: false, blockedByMe: false } : c))
                )
                showToast("User unblocked successfully.")
            } catch (err: any) {
                showToast(err?.message || "Failed to unblock user.")
            }
        } else {
            try {
                await friendshipsApi.blockUser(targetUserId)
                setConversations((prev) =>
                    prev.map((c) => (c.id === id ? { ...c, isBlocked: true, blockedByMe: true } : c))
                )
                showToast("Blocked user successfully.")
            } catch (err: any) {
                showToast(err?.message || "Failed to block user.")
            }
        }
        setContextMenu(null)
    }

    // 3. Canonical Real-Time Message Send with Idempotency Key
    const handleSend = async (e: FormEvent) => {
        e.preventDefault()
        if (!inputMsg.trim() || !activeConvId) return

        const textToSend = inputMsg.trim()
        setInputMsg("")

        // Generate 1 UUID idempotencyKey per logical send attempt
        const idempotencyKey = crypto.randomUUID()
        const userLang = user?.nativeLanguage || "en"

        // Optimistic UI pending item
        const tempMsg: MessageItem = {
            id: `temp_${idempotencyKey}`,
            conversationId: activeConvId,
            senderId: user?.id || "",
            senderName: user?.name || "Me",
            contentOriginal: textToSend,
            originalLanguage: userLang,
            idempotencyKey,
            createdAt: new Date().toISOString(),
            isMe: true,
        }

        setMessages((prev) => [...prev, tempMsg])
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50)

        try {
            // Canonical Socket.IO Real-Time send with ACK
            sendMessageViaSocket(
                {
                    conversationId: activeConvId,
                    contentOriginal: textToSend,
                    originalLanguage: userLang,
                    idempotencyKey,
                },
                (ack) => {
                    if (ack && ack.messageId) {
                        // Replace temp ID with canonical backend message.id
                        setMessages((prev) =>
                            prev.map((m) => (m.idempotencyKey === idempotencyKey ? { ...m, id: ack.messageId! } : m))
                        )
                    }
                }
            )
        } catch {
            // HTTP Fallback if socket fails
            try {
                const res = await messagesApi.sendMessage(activeConvId, textToSend, userLang, idempotencyKey)
                if (res?.message?.id) {
                    setMessages((prev) =>
                        prev.map((m) => (m.idempotencyKey === idempotencyKey ? { ...m, id: res.message.id } : m))
                    )
                }
            } catch {
                // Keep original message visible in case of network issue
            }
        }
    }

    const activeConv = conversations.find((c) => c.id === activeConvId) || conversations[0]

    const sortedConvs = [...conversations].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        return 0
    })

    const filteredConvs = sortedConvs.filter(
        (c) =>
            c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
            c.nativeLang.toLowerCase().includes(searchFilter.toLowerCase())
    )

    return (
        <div className="relative flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-[#07080d] text-left">
            {/* Toast Banner */}
            {toastMessage && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 rounded-2xl border border-indigo-500/40 bg-[#07080d]/90 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-top-2">
                    ✨ {toastMessage}
                </div>
            )}

            {/* ---------------- 1. Conversations List Sidebar ---------------- */}
            <div
                className={`w-full md:w-72 lg:w-80 flex-col overflow-hidden border-r border-white/10 bg-[#050609] shrink-0 transition-all ${
                    mobileShowList ? "flex" : "hidden md:flex"
                }`}
            >
                <div className="p-4 border-b border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                        <h1 className="text-base font-bold text-white tracking-wide">Messages</h1>
                        <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-[10px] font-bold text-indigo-400 border border-indigo-500/30">
                            LIVE SYNC
                        </span>
                    </div>

                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            placeholder="Search chats or languages..."
                            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-500"
                        />
                    </div>
                </div>

                {/* Chat Items */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {isLoadingConvs ? (
                        <div className="flex h-32 items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                        </div>
                    ) : filteredConvs.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-500">No active conversations.</div>
                    ) : (
                        filteredConvs.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => handleSelectChat(chat.id)}
                                onContextMenu={(e) => handleContextMenu(e, chat.id)}
                                className={`group relative flex items-center gap-3 rounded-2xl p-3 cursor-pointer transition-all ${
                                    activeConvId === chat.id
                                        ? "bg-indigo-600/20 border border-indigo-500/40 shadow-lg"
                                        : "hover:bg-white/5 border border-transparent"
                                }`}
                            >
                                <div className="relative shrink-0">
                                    <img
                                        src={chat.avatar}
                                        alt={chat.name}
                                        className="h-10 w-10 rounded-full object-cover border border-white/10"
                                    />
                                    {chat.otherUserId && (userPresence[chat.otherUserId]?.isOnline ?? true) && (
                                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#050609]" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <h3 className="text-xs font-bold text-white truncate">{chat.name}</h3>
                                            {chat.isPinned && <Pin className="h-3 w-3 text-indigo-400 shrink-0 fill-indigo-400/20" />}
                                            {chat.isMuted && <BellOff className="h-3 w-3 text-gray-500 shrink-0" />}
                                        </div>
                                        <span className="text-[10px] text-gray-500">{chat.lastMessageTime}</span>
                                    </div>
                                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{chat.lastMessage}</p>
                                </div>

                                <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-mono text-indigo-300 shrink-0">
                                    {chat.nativeLang}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ---------------- 2. Main Chat Workspace ---------------- */}
            <div
                className={`flex-1 flex-col overflow-hidden bg-[#07080d] ${
                    !mobileShowList ? "flex" : "hidden md:flex"
                }`}
            >
                {/* Header */}
                {activeConv && (() => {
                    const presence = activeConv.otherUserId ? userPresence[activeConv.otherUserId] : null
                    const isOnline = presence?.isOnline ?? true
                    const statusText = isOnline
                        ? "Online"
                        : presence?.lastSeen
                        ? `Last seen ${new Date(presence.lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        : "Offline"

                    return (
                        <div className="flex items-center justify-between border-b border-white/10 bg-[#050609]/80 px-4 py-3 backdrop-blur-md shrink-0">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setMobileShowList(true)}
                                    className="md:hidden text-gray-400 hover:text-white"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </button>
                                <img
                                    src={activeConv.avatar}
                                    alt={activeConv.name}
                                    className="h-9 w-9 rounded-full object-cover border border-white/10"
                                />
                                <div>
                                    <h2 className="text-xs font-bold text-white sm:text-sm">{activeConv.name}</h2>
                                    <p className={`text-[10px] flex items-center gap-1.5 ${isOnline ? "text-emerald-400 font-semibold" : "text-gray-400"}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-gray-500"}`} />
                                        {statusText} • Native: {activeConv.nativeLang}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Language Switcher Dropdown for shifting multiple languages */}
                                <div className="relative flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-gray-300 hover:border-indigo-500/50 transition">
                                    <Globe className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                    <select
                                        value={user?.nativeLanguage || "en"}
                                        onChange={async (e) => {
                                            const newLang = e.target.value
                                            try {
                                                await usersApi.updateProfile({ nativeLanguage: newLang })
                                                await refreshProfile()
                                                if (activeConvId) {
                                                    loadMessages(activeConvId)
                                                }
                                            } catch (_) {}
                                        }}
                                        className="bg-transparent text-white text-[11px] font-medium outline-none cursor-pointer pr-1"
                                        title="Shift target native language"
                                    >
                                        <option value="en" className="bg-[#0a0c14] text-white">English (EN)</option>
                                        <option value="es" className="bg-[#0a0c14] text-white">Spanish (ES)</option>
                                        <option value="de" className="bg-[#0a0c14] text-white">German (DE)</option>
                                        <option value="ja" className="bg-[#0a0c14] text-white">Japanese (JA)</option>
                                        <option value="fr" className="bg-[#0a0c14] text-white">French (FR)</option>
                                        <option value="zh" className="bg-[#0a0c14] text-white">Chinese (ZH)</option>
                                         <option value="hi" className="bg-[#0a0c14] text-white">Hindi (HI)</option>
                                        <option value="ar" className="bg-[#0a0c14] text-white">Arabic (AR)</option>
                                    </select>
                                </div>

                                {activeConv.otherUserId && (
                                    <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                                        <button
                                            type="button"
                                            onClick={() => callStore.startCall(activeConv.id, { id: activeConv.otherUserId!, displayName: activeConv.name, avatar: activeConv.avatar }, "audio")}
                                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition shadow-sm"
                                            title="Audio Call"
                                        >
                                            <Phone className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => callStore.startCall(activeConv.id, { id: activeConv.otherUserId!, displayName: activeConv.name, avatar: activeConv.avatar }, "video")}
                                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 transition shadow-sm"
                                            title="Video Call"
                                        >
                                            <Video className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowCallHistoryModal(true)}
                                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition shadow-sm"
                                            title="Call History Logs"
                                        >
                                            <Clock className="h-4 w-4 text-indigo-300" />
                                        </button>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        const next = !aiLive
                                        setAiLive(next)
                                        // Persist the preference to the backend
                                        usersApi.updateProfile({ translationEnabled: next }).catch(() => {})
                                    }}
                                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition ${
                                        aiLive
                                            ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300"
                                            : "border-white/10 bg-white/5 text-gray-400"
                                    }`}
                                >
                                    <Languages className="h-3.5 w-3.5 text-indigo-400" />
                                    {aiLive ? "Auto-Translate ON" : "Auto-Translate OFF"}
                                </button>
                            </div>
                        </div>
                    )
                })()}

                {/* Messages Area */}
                <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4"
                >
                    {hasMoreMsgs && (
                        <div className="text-center py-2">
                            <button
                                type="button"
                                onClick={() => activeConvId && loadMessages(activeConvId, nextCursor)}
                                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-gray-300 hover:bg-white/10"
                            >
                                Load older messages
                            </button>
                        </div>
                    )}

                    {isLoadingMsgs ? (
                        <div className="flex h-48 items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex h-48 flex-col items-center justify-center text-center">
                            <Languages className="h-8 w-8 text-gray-600 mb-2" />
                            <p className="text-xs text-gray-400">No messages yet in this conversation.</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const myNativeLang = (user?.nativeLanguage || "en").toLowerCase()

                            // Only look for translation for RECEIVED messages
                            // Sent messages always show original text — no translation shown
                            const isReceived = !msg.isMe
                            const msgOriginalLang = (msg.originalLanguage || "en").toLowerCase()

                            // Find the translation targeted at the viewer's native language
                            const targetTrans = isReceived
                                ? msg.translations?.find(
                                      (t) => t.targetLanguage.toLowerCase() === myNativeLang
                                  )
                                : undefined

                            // Show translated text as primary only if:
                            // - It's a received message
                            // - Auto-translate is ON
                            // - A completed translation exists
                            // - The message is actually in a different language than our native
                            const showTranslation =
                                isReceived &&
                                aiLive &&
                                msgOriginalLang !== myNativeLang &&
                                targetTrans?.status === "COMPLETED" &&
                                !!targetTrans?.translatedContent

                            // Show "translating…" spinner ONLY for received messages in foreign language
                            // that are explicitly in PENDING status
                            const isPendingTranslation =
                                isReceived &&
                                aiLive &&
                                msgOriginalLang !== myNativeLang &&
                                targetTrans?.status === "PENDING"

                            const isCallLog = msg.contentOriginal.startsWith("📞") || msg.contentOriginal.startsWith("📹")
                            if (isCallLog) {
                                const isMissed = msg.contentOriginal.toLowerCase().includes("missed") || msg.contentOriginal.toLowerCase().includes("declined")
                                const isVideo = msg.contentOriginal.includes("📹") || msg.contentOriginal.toLowerCase().includes("video")

                                return (
                                    <div key={msg.id} className="flex justify-center my-3">
                                        <div className={`flex items-center gap-2.5 rounded-full border px-4 py-2 text-xs font-semibold backdrop-blur-xl shadow-lg transition ${
                                            isMissed
                                                ? "border-rose-500/30 bg-rose-950/30 text-rose-300 shadow-rose-950/20"
                                                : "border-indigo-500/30 bg-indigo-950/30 text-indigo-200 shadow-indigo-950/20"
                                        }`}>
                                            {isVideo ? <Video className="h-4 w-4 text-indigo-400 shrink-0" /> : <Phone className="h-4 w-4 text-emerald-400 shrink-0" />}
                                            <span>{msg.contentOriginal}</span>
                                            <span className="text-[10px] text-gray-400 font-normal border-l border-white/10 pl-2 ml-1">
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </div>
                                    </div>
                                )
                            }

                            return (
                                <div
                                    key={msg.id}
                                    className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}
                                >
                                    <div
                                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-4 text-xs leading-relaxed ${
                                            msg.isMe
                                                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none shadow-lg"
                                                : "bg-white/[0.05] border border-white/10 text-gray-200 rounded-bl-none backdrop-blur-md"
                                        }`}
                                    >
                                        {showTranslation ? (
                                            <>
                                                {/* Translated text is the PRIMARY content */}
                                                <p className="font-medium">{targetTrans!.translatedContent}</p>
                                                {/* Original text shown as small secondary reference */}
                                                <p className="mt-2 pt-2 border-t border-white/10 text-[10px] text-gray-400 italic">
                                                    {msg.contentOriginal}
                                                </p>
                                                <span className="text-[9px] text-indigo-400/60 uppercase tracking-wider font-semibold">
                                                    ✦ translated · {msgOriginalLang.toUpperCase()} → {myNativeLang.toUpperCase()}
                                                </span>
                                            </>
                                        ) : isPendingTranslation ? (
                                            <>
                                                {/* Show original while translation is loading */}
                                                <p className="font-medium">{msg.contentOriginal}</p>
                                                <span className="mt-1.5 flex items-center gap-1 text-[10px] text-indigo-300/60">
                                                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                                    translating…
                                                </span>
                                            </>
                                        ) : (
                                            /* No translation needed / same language / translation off */
                                            <p className="font-medium">{msg.contentOriginal}</p>
                                        )}
                                    </div>
                                    <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-500">
                                        <span>
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                        {msg.isMe && (
                                            <span className="shrink-0">
                                                {msg.status === "READ" ? (
                                                    <CheckCheck className="h-3.5 w-3.5 text-sky-400" />
                                                ) : msg.status === "DELIVERED" ? (
                                                    <CheckCheck className="h-3.5 w-3.5 text-gray-400" />
                                                ) : (
                                                    <Check className="h-3.5 w-3.5 text-gray-400" />
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Real-time Animated Typing Indicator */}
                {activeConvId && typingUsers[activeConvId] && (
                    <div className="flex items-center gap-2 px-4 py-2 text-xs text-indigo-300 italic bg-indigo-500/10 border-t border-white/10">
                        <span className="font-semibold">{activeConv?.name || "User"}</span> is typing
                        <span className="flex items-center gap-1 ml-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                    </div>
                )}

                {/* Input Bar */}
                {activeConv?.isBlocked ? (
                    <div className="border-t border-white/10 bg-[#050609] p-4 text-center text-xs font-semibold text-gray-400 flex items-center justify-center gap-2">
                        <Ban className="h-4 w-4 text-red-400 shrink-0" />
                        <span>You cannot send messages to this conversation because this user is blocked.</span>
                    </div>
                ) : (
                    <form
                        onSubmit={handleSend}
                        className="border-t border-white/10 bg-[#050609] p-3 md:p-4 shrink-0 relative"
                    >
                        <div className="flex items-center gap-2">
                            <div className="relative flex items-center">
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition shrink-0"
                                    title="Choose Emoji"
                                >
                                    <Smile className="h-4 w-4" />
                                </button>
                                {showEmojiPicker && (
                                    <EmojiPicker
                                        onSelectEmoji={handleEmojiSelect}
                                        onClose={() => setShowEmojiPicker(false)}
                                    />
                                )}
                            </div>

                            <input
                                ref={inputRef}
                                type="text"
                                value={inputMsg}
                                onChange={(e) => handleInputChange(e.target.value)}
                                placeholder={`Type message in ${user?.nativeLanguage?.toUpperCase() || "EN"}...`}
                                className="flex-1 rounded-2xl border border-white/15 bg-white/5 py-3 px-4 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-500"
                            />
                            <button
                                type="submit"
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Custom Context Menu */}
            {contextMenu && (() => {
                const targetConv = conversations.find((c) => c.id === contextMenu.chatId)
                return (
                    <div
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                        className="fixed z-50 w-48 rounded-2xl border border-white/15 bg-[#07080d]/95 p-1.5 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-100"
                    >
                        <button
                            type="button"
                            onClick={() => togglePinChat(contextMenu.chatId)}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-white/10 hover:text-white transition"
                        >
                            <Pin className={`h-3.5 w-3.5 ${targetConv?.isPinned ? "text-indigo-400 fill-indigo-400" : ""}`} />
                            {targetConv?.isPinned ? "Unpin Chat" : "Pin Chat to Top"}
                        </button>
                        <button
                            type="button"
                            onClick={() => toggleMuteChat(contextMenu.chatId)}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-white/10 hover:text-white transition"
                        >
                            {targetConv?.isMuted ? (
                                <>
                                    <Volume2 className="h-3.5 w-3.5 text-emerald-400" /> Unmute Chat
                                </>
                            ) : (
                                <>
                                    <BellOff className="h-3.5 w-3.5 text-gray-400" /> Mute Notifications
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => toggleBlockChat(contextMenu.chatId)}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
                        >
                            <UserX className="h-3.5 w-3.5" />
                            {targetConv?.isBlocked && targetConv?.blockedByMe ? "Unblock User" : "Block User"}
                        </button>
                    </div>
                )
            })()}

            <SubscriptionModal
                isOpen={isQuotaModalOpen}
                onClose={() => setIsQuotaModalOpen(false)}
            />

            <CallHistoryModal
                isOpen={showCallHistoryModal}
                onClose={() => setShowCallHistoryModal(false)}
            />
        </div>
    )
}
