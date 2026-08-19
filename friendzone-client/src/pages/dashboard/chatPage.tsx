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
    Check,
    CheckCheck,
    Ban,
    Phone,
    Video,
    Smile,
    Plus,
    Users,
    Paperclip,
    Edit3,
    Trash2,
    X,
    Shield,
    User,
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { conversationsApi, messagesApi, notificationsApi, usersApi, translationApi, friendshipsApi } from "../../services/api"
import { SUPPORTED_LANGUAGES } from "../../config/languagesConfig"
import SubscriptionModal from "../../components/SubscriptionModal"
import EmojiPicker from "../../components/EmojiPicker"
import CallHistoryModal from "../../components/CallHistoryModal"
import { callStore } from "../../services/callStore"
import CreateGroupModal from "../../components/groups/CreateGroupModal"
import GroupInfoModal from "../../components/groups/GroupInfoModal"
import { MediaUploader } from "../../components/media/MediaUploader"
import { MediaMessageView } from "../../components/media/MediaMessageView"
import { UserAvatar } from "../../components/common/UserAvatar"
import {
    getSocket,
    joinConversationRoom,
    sendMessageViaSocket,
    editMessageViaSocket,
    deleteMessageViaSocket,
    markReadViaSocket,
    emitTypingStart,
    emitTypingStop,
    onUserTyping,
    onUserStoppedTyping,
    onUserStatusChanged,
    requestUserStatus,
    onUserStatusResponse,
    onGroupCreated,
    onGroupMemberAdded,
    onGroupMemberRemoved,
    onGroupMemberLeft,
    onGroupRoleUpdated,
    onGroupUpdated,
} from "../../services/socket"

interface MessageItem {
    id: string
    conversationId: string
    senderId: string
    senderName?: string
    contentOriginal: string
    originalLanguage: string
    idempotencyKey: string
    messageType?: "USER" | "SYSTEM" | string
    systemMetadata?: any
    createdAt: string
    translations?: { targetLanguage: string; translatedContent?: string; status: string }[]
    isMe?: boolean
    status?: "SENT" | "DELIVERED" | "READ" | string
    mediaAssets?: any[]
}

interface ConversationItem {
    id: string
    type: "DIRECT" | "GROUP" | string
    name: string
    avatar: string
    profileMediaId?: string | null
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
    title?: string
    description?: string
    avatarUrl?: string
    onlyAdminsCanSend?: boolean
    onlyAdminsCanEditInfo?: boolean
    onlyAdminsCanAddMembers?: boolean
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
    const [isLoadingMoreMsgs, setIsLoadingMoreMsgs] = useState(false)
    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)
    const [hasMoreMsgs, setHasMoreMsgs] = useState(false)

    const [inputMsg, setInputMsg] = useState("")
    const [editingMessage, setEditingMessage] = useState<MessageItem | null>(null)
    const [searchFilter, setSearchFilter] = useState("")
    const aiLive = user?.translationEnabled !== false
    const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false)

    // Mobile View Toggle State
    const [mobileShowList, setMobileShowList] = useState(true)

    // Group and Contact Modals/Panels State
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
    const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false)
    const [showContactPanel, setShowContactPanel] = useState(false)

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{
        x: number
        y: number
        chatId: string
    } | null>(null)

    const [toastMessage, setToastMessage] = useState<string | null>(null)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [showChatMediaUploader, setShowChatMediaUploader] = useState(false)
    const [showCallHistoryModal, setShowCallHistoryModal] = useState(false)
    const [expandedBreakdownMsgId, setExpandedBreakdownMsgId] = useState<string | null>(null)
    const [wordBreakdowns, setWordBreakdowns] = useState<Record<string, Array<{ original: string; translated: string }>>>({})
    const [loadingBreakdownId, setLoadingBreakdownId] = useState<string | null>(null)

    const toggleWordBreakdown = async (msgId: string, originalText: string, translatedText: string) => {
        if (expandedBreakdownMsgId === msgId) {
            setExpandedBreakdownMsgId(null)
            return
        }
        setExpandedBreakdownMsgId(msgId)

        if (!wordBreakdowns[msgId]) {
            try {
                setLoadingBreakdownId(msgId)
                const res = await translationApi.getWordBreakdown({
                    originalText,
                    translatedText,
                })
                if (res.breakdown) {
                    setWordBreakdowns((prev) => ({ ...prev, [msgId]: res.breakdown }))
                }
            } catch (_) {
            } finally {
                setLoadingBreakdownId(null)
            }
        }
    }
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

    // Socket Typing, Presence, & Group Listeners
    useEffect(() => {
        const unsubs: (() => void)[] = []

        unsubs.push(
            onUserTyping(({ conversationId }) => {
                setTypingUsers((prev) => ({ ...prev, [conversationId]: true }))
            })
        )

        unsubs.push(
            onUserStoppedTyping(({ conversationId }) => {
                setTypingUsers((prev) => ({ ...prev, [conversationId]: false }))
            })
        )

        unsubs.push(
            onUserStatusChanged(({ userId, status, lastSeen }) => {
                setUserPresence((prev) => ({
                    ...prev,
                    [userId]: { isOnline: status === "ONLINE", lastSeen },
                }))
            })
        )

        unsubs.push(
            onUserStatusResponse((statusArray) => {
                const map: Record<string, { isOnline: boolean; lastSeen: string | null }> = {}
                statusArray.forEach((item) => {
                    map[item.userId] = { isOnline: item.isOnline, lastSeen: item.lastSeen }
                })
                setUserPresence((prev) => ({ ...prev, ...map }))
            })
        )

        // Realtime Group Socket Events
        const handleGroupEvent = () => {
            loadConversations()
            if (activeConvId) {
                loadMessages(activeConvId)
            }
        }

        unsubs.push(
            onGroupCreated((payload) => {
                showToast("New group chat added")
                loadConversations()
                if (payload?.conversation?.id) {
                    setActiveConvId(payload.conversation.id)
                    localStorage.setItem("fz_active_conv_id", payload.conversation.id)
                    setSearchParams({ id: payload.conversation.id }, { replace: true })
                }
            })
        )

        unsubs.push(onGroupMemberAdded(handleGroupEvent))
        unsubs.push(onGroupMemberRemoved(handleGroupEvent))
        unsubs.push(onGroupMemberLeft(handleGroupEvent))
        unsubs.push(onGroupRoleUpdated(handleGroupEvent))
        unsubs.push(onGroupUpdated(handleGroupEvent))

        return () => {
            unsubs.forEach((unsub) => unsub())
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
            }
        }
    }, [activeConvId])

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
            const urlId = searchParams.get("id")
            const storedId = localStorage.getItem("fz_active_conv_id")
            const preferredId = urlId || storedId

            const mapped: ConversationItem[] = (rawConvs || []).map((c: any) => {
                const isGroup = c.type === "GROUP"
                const otherMember = c.members?.find((m: any) => m.userId !== user?.id)?.user

                return {
                    id: c.id,
                    type: c.type || "DIRECT",
                    title: c.title,
                    description: c.description,
                    avatarUrl: c.avatarUrl,
                    onlyAdminsCanSend: c.onlyAdminsCanSend || false,
                    onlyAdminsCanEditInfo: c.onlyAdminsCanEditInfo || false,
                    onlyAdminsCanAddMembers: c.onlyAdminsCanAddMembers || false,
                    name: isGroup
                        ? c.title || "Group Chat"
                        : otherMember?.displayName || otherMember?.email?.split("@")?.[0] || "Chat",
                    avatar: isGroup ? c.avatarUrl || null : c.isBlocked ? null : otherMember?.avatar || null,
                    profileMediaId: isGroup ? null : c.isBlocked ? null : (otherMember?.profileMediaId || null),
                    nativeLang: isGroup ? "GROUP" : (otherMember?.nativeLanguage || "en").toUpperCase(),
                    lastMessage: c.messages?.[0]?.contentOriginal || "No messages yet",
                    lastMessageTime: c.messages?.[0]?.createdAt
                        ? new Date(c.messages[0].createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "",
                    unreadCount: preferredId === c.id ? 0 : (c.unreadCount || 0),
                    isPinned: (JSON.parse(localStorage.getItem("fz_pinned_chats") || "[]")).includes(c.id),
                    isMuted: (JSON.parse(localStorage.getItem("fz_muted_chats") || "[]")).includes(c.id),
                    isBlocked: c.isBlocked || false,
                    blockedByMe: c.blockedByMe || false,
                    members: c.members || [],
                    otherUserId: isGroup ? undefined : otherMember?.id,
                }
            })

            let selectedId: string | null = null
            if (preferredId && mapped.some((c) => c.id === preferredId)) {
                selectedId = preferredId
            } else if (mapped.length > 0) {
                selectedId = mapped[0].id
            }

            const finalMapped = mapped.map((c) => (c.id === selectedId ? { ...c, unreadCount: 0 } : c))
            setConversations(finalMapped)

            const totalUnread = finalMapped.reduce((acc, c) => acc + (c.unreadCount || 0), 0)
            window.dispatchEvent(new CustomEvent("fz:unread_chats_changed", { detail: { count: totalUnread } }))
            localStorage.setItem("fz_unread_chats_count", String(totalUnread))

            if (selectedId) {
                setActiveConvId(selectedId)
                localStorage.setItem("fz_active_conv_id", selectedId)
                setSearchParams({ id: selectedId }, { replace: true })
            }

            // Query online presence for direct conversation partners
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
        if (!cursor) {
            setIsLoadingMsgs(true)
        } else {
            setIsLoadingMoreMsgs(true)
        }
        try {
            const res = await messagesApi.getMessages(convId, 25, cursor)
            const newMsgs: MessageItem[] = (res.messages || []).map((m: any) => ({
                id: m.id,
                conversationId: m.conversationId,
                senderId: m.senderId,
                senderName: m.sender?.displayName || m.sender?.email?.split("@")[0] || "User",
                contentOriginal: m.contentOriginal,
                originalLanguage: m.originalLanguage || "en",
                idempotencyKey: m.idempotencyKey,
                messageType: m.messageType || "USER",
                systemMetadata: m.systemMetadata || null,
                createdAt: m.createdAt,
                translations: m.translations || [],
                isMe: m.senderId === user?.id,
                status: m.status || "SENT",
            }))

            if (cursor) {
                const container = chatContainerRef.current
                const previousHeight = container ? container.scrollHeight : 0

                setMessages((prev) => {
                    const existingIds = new Set(prev.map((p) => p.id))
                    const filteredNew = newMsgs.filter((n) => !existingIds.has(n.id)).reverse()
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
            setIsLoadingMoreMsgs(false)
        }
    }

    useEffect(() => {
        if (activeConvId) {
            loadMessages(activeConvId)
            joinConversationRoom(activeConvId)
        }
    }, [activeConvId])

    // Real-time Socket Message Listener & Read Receipts
    useEffect(() => {
        const socket = getSocket()
        if (socket && activeConvId) {
            const handleMessageSent = ({ message }: { message: any }) => {
                if (message.conversationId === activeConvId) {
                    const mapped: MessageItem = {
                        id: message.id,
                        conversationId: message.conversationId,
                        senderId: message.senderId,
                        senderName: message.sender?.displayName || message.sender?.email?.split("@")[0] || "User",
                        contentOriginal: message.contentOriginal,
                        originalLanguage: message.originalLanguage || "en",
                        idempotencyKey: message.idempotencyKey,
                        messageType: message.messageType || "USER",
                        systemMetadata: message.systemMetadata || null,
                        createdAt: message.createdAt,
                        translations: message.translations || [],
                        isMe: message.senderId === user?.id,
                        status: message.status || "SENT",
                        mediaAssets: message.mediaAssets || [],
                    }

                    if (message.senderId !== user?.id) {
                        markReadViaSocket(activeConvId, message.id)
                        notificationsApi.markRead(`msg_${message.id}`).catch(() => {})
                    }

                    setMessages((prev) => {
                        // 1. Direct match by Canonical Server ID -> Update server fields while keeping local state
                        const exactIdIndex = prev.findIndex((p) => p.id === mapped.id)
                        if (exactIdIndex !== -1) {
                            const updated = [...prev]
                            const existing = updated[exactIdIndex]
                            updated[exactIdIndex] = {
                                ...existing,
                                ...mapped,
                                isMe: existing.isMe ?? mapped.isMe,
                                translations: mapped.translations?.length ? mapped.translations : existing.translations,
                                mediaAssets: mapped.mediaAssets?.length ? mapped.mediaAssets : existing.mediaAssets,
                            }
                            return updated
                        }

                        // 2. Reconciliation by Idempotency Key (Optimistic Message -> Real Canonical Message)
                        if (mapped.idempotencyKey) {
                            const optIndex = prev.findIndex(
                                (p) => p.idempotencyKey && p.idempotencyKey === mapped.idempotencyKey
                            )
                            if (optIndex !== -1) {
                                const updated = [...prev]
                                const existing = updated[optIndex]
                                updated[optIndex] = {
                                    ...existing,
                                    ...mapped,
                                    id: mapped.id, // Update temp ID to canonical server ID
                                    createdAt: mapped.createdAt || existing.createdAt,
                                    status: mapped.status || "SENT",
                                    isMe: true,
                                    translations: mapped.translations?.length ? mapped.translations : existing.translations,
                                    mediaAssets: mapped.mediaAssets?.length ? mapped.mediaAssets : existing.mediaAssets,
                                }
                                return updated
                            }
                        }

                        // 3. Inbound message from another user -> Append new item
                        return [...prev, mapped]
                    })

                    // 4. Update Conversation Sidebar Preview, Order & Unread Count (HIGH-4)
                    setConversations((prev) => {
                        const convIndex = prev.findIndex((c) => c.id === message.conversationId)
                        if (convIndex === -1) return prev

                        const isIncoming = message.senderId !== user?.id
                        const isCurrentActive = message.conversationId === activeConvId
                        const currentUnread = prev[convIndex].unreadCount || 0
                        const newUnread = isCurrentActive ? 0 : (isIncoming ? currentUnread + 1 : currentUnread)

                        const targetConv = {
                            ...prev[convIndex],
                            lastMessage: message.contentOriginal,
                            lastMessageTime: new Date(message.createdAt || Date.now()).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            }),
                            unreadCount: newUnread,
                        }

                        const remaining = prev.filter((_, idx) => idx !== convIndex)
                        const pinned = remaining.filter((c) => c.isPinned)
                        const unpinned = remaining.filter((c) => !c.isPinned)

                        const reordered = targetConv.isPinned
                            ? [targetConv, ...pinned, ...unpinned]
                            : [...pinned, targetConv, ...unpinned]

                        const totalUnread = reordered.reduce((acc, c) => acc + (c.unreadCount || 0), 0)
                        window.dispatchEvent(new CustomEvent("fz:unread_chats_changed", { detail: { count: totalUnread } }))
                        localStorage.setItem("fz_unread_chats_count", String(totalUnread))

                        return reordered
                    })

                    if (message.conversationId === activeConvId) {
                        setTimeout(() => {
                            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
                        }, 50)
                    }
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

            const handleMessageEdited = (payload: { message: any }) => {
                if (payload.message) {
                    setMessages((prev) =>
                        prev.map((m) => {
                            if (m.id === payload.message.id) {
                                return {
                                    ...m,
                                    contentOriginal: payload.message.contentOriginal,
                                    translations: payload.message.translations || [],
                                    systemMetadata: payload.message.systemMetadata || null,
                                }
                            }
                            return m
                        })
                    )
                    setConversations((prev) =>
                        prev.map((c) => {
                            if (c.id === payload.message.conversationId) {
                                return { ...c, lastMessage: payload.message.contentOriginal }
                            }
                            return c
                        })
                    )
                }
            }

            const handleMessageDeleted = (payload: { messageId: string; conversationId: string }) => {
                setMessages((prev) => prev.filter((m) => m.id !== payload.messageId))
                setConversations((prev) =>
                    prev.map((c) => {
                        if (c.id === payload.conversationId && c.lastMessage && c.lastMessage.includes(payload.messageId)) {
                            return { ...c, lastMessage: "Message deleted" }
                        }
                        return c
                    })
                )
            }

            socket.on("message_sent", handleMessageSent)
            socket.on("message_translated", handleMessageTranslated)
            socket.on("read_receipt", handleReadReceipt)
            socket.on("quota_exceeded", handleQuotaExceeded)
            socket.on("message_edited", handleMessageEdited)
            socket.on("message_deleted", handleMessageDeleted)

            return () => {
                socket.off("message_sent", handleMessageSent)
                socket.off("message_translated", handleMessageTranslated)
                socket.off("read_receipt", handleReadReceipt)
                socket.off("quota_exceeded", handleQuotaExceeded)
                socket.off("message_edited", handleMessageEdited)
                socket.off("message_deleted", handleMessageDeleted)
            }
        }
    }, [activeConvId, user?.id])

    // Scroll Pagination Listener
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop } = e.currentTarget
        if (scrollTop <= 60 && hasMoreMsgs && nextCursor && activeConvId && !isLoadingMsgs && !isLoadingMoreMsgs) {
            loadMessages(activeConvId, nextCursor)
        }
    }

    // 3. Send Message via Socket with Optimistic UI & Quota Check Catch
    const handleSend = async (e: FormEvent) => {
        e.preventDefault()
        const text = inputMsg.trim()
        if (!text || !activeConvId) return

        if (editingMessage) {
            editMessageViaSocket(editingMessage.id, text, (res) => {
                if (res.status === "edited") {
                    showToast("Message updated")
                }
            })
            setEditingMessage(null)
            setInputMsg("")
            return
        }

        const activeConv = conversations.find((c) => c.id === activeConvId)
        if (activeConv?.isBlocked) {
            showToast("Cannot send message. User is blocked.")
            return
        }

        const idempotencyKey = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        const userLang = user?.nativeLanguage || "en"

        const tempId = `temp_${Date.now()}`
        const optimisticMsg: MessageItem = {
            id: tempId,
            conversationId: activeConvId,
            senderId: user?.id || "",
            senderName: (user as any)?.displayName || user?.username || "You",
            contentOriginal: text,
            originalLanguage: userLang,
            idempotencyKey,
            messageType: "USER",
            createdAt: new Date().toISOString(),
            translations: [],
            isMe: true,
            status: "SENT",
        }

        setMessages((prev) => [...prev, optimisticMsg])
        setInputMsg("")
        emitTypingStop(activeConvId)

        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 50)

        sendMessageViaSocket(
            {
                conversationId: activeConvId,
                contentOriginal: text,
                originalLanguage: userLang,
                idempotencyKey,
            },
            (ack) => {
                if (ack?.status === "saved" && ack.messageId) {
                    setMessages((prev) =>
                        prev.map((m) => (m.id === tempId ? { ...m, id: ack.messageId! } : m))
                    )
                } else {
                    setMessages((prev) =>
                        prev.map((m) => (m.id === tempId ? { ...m, status: "FAILED" } : m))
                    )
                }
            }
        )

        setConversations((prev) =>
            prev.map((c) =>
                c.id === activeConvId
                    ? {
                          ...c,
                          lastMessage: text,
                          lastMessageTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                      }
                    : c
            )
        )
    }

    const handleSelectChat = (chatId: string) => {
        setActiveConvId(chatId)
        localStorage.setItem("fz_active_conv_id", chatId)
        setSearchParams({ id: chatId }, { replace: true })
        setMobileShowList(false)

        // Reset unread count for this conversation & update global sidebar total
        setConversations((prev) => {
            const updated = prev.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c))
            const totalUnread = updated.reduce((acc, c) => acc + (c.unreadCount || 0), 0)
            window.dispatchEvent(new CustomEvent("fz:unread_chats_changed", { detail: { count: totalUnread } }))
            localStorage.setItem("fz_unread_chats_count", String(totalUnread))
            return updated
        })

        const targetConv = conversations.find((c) => c.id === chatId)
        if (targetConv?.otherUserId) {
            requestUserStatus([targetConv.otherUserId])
        }
    }

    // Context Menu Handlers
    const handleContextMenu = (e: MouseEvent, chatId: string) => {
        e.preventDefault()
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            chatId,
        })
    }

    const togglePinChat = (chatId: string) => {
        const currentPins: string[] = JSON.parse(localStorage.getItem("fz_pinned_chats") || "[]")
        const isPinned = currentPins.includes(chatId)
        const updated = isPinned ? currentPins.filter((id) => id !== chatId) : [...currentPins, chatId]
        localStorage.setItem("fz_pinned_chats", JSON.stringify(updated))

        setConversations((prev) =>
            prev.map((c) => (c.id === chatId ? { ...c, isPinned: !isPinned } : c))
        )
        showToast(isPinned ? "Chat unpinned" : "Chat pinned to top")
    }

    const toggleMuteChat = (chatId: string) => {
        const currentMutes: string[] = JSON.parse(localStorage.getItem("fz_muted_chats") || "[]")
        const isMuted = currentMutes.includes(chatId)
        const updated = isMuted ? currentMutes.filter((id) => id !== chatId) : [...currentMutes, chatId]
        localStorage.setItem("fz_muted_chats", JSON.stringify(updated))

        setConversations((prev) =>
            prev.map((c) => (c.id === chatId ? { ...c, isMuted: !isMuted } : c))
        )
        showToast(isMuted ? "Notifications unmuted" : "Notifications muted")
    }

    const handleToggleBlock = async (targetUserId: string, isCurrentlyBlocked: boolean) => {
        try {
            if (isCurrentlyBlocked) {
                await friendshipsApi.unblockUser(targetUserId)
                showToast("User unblocked successfully")
            } else {
                await friendshipsApi.blockUser(targetUserId)
                showToast("User blocked successfully")
            }
            await loadConversations()
        } catch (err: any) {
            showToast(err.message || "Failed to update block status")
        }
    }

    const activeConv = conversations.find((c) => c.id === activeConvId)

    // Sort conversations: Pinned first, then by latest message
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

    // Check if current user is admin/owner of active group conversation
    const activeUserRole = activeConv?.members?.find((m: any) => m.userId === user?.id)?.role
    const isGroupAdmin = activeUserRole === "OWNER" || activeUserRole === "ADMIN"
    const canSendInGroup = !activeConv?.onlyAdminsCanSend || isGroupAdmin

    return (
        <div className="relative flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-slate-50 dark:bg-[#0b0e17] text-left text-slate-900 dark:text-slate-100">
            {/* Toast Banner */}
            {toastMessage && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-900 dark:text-white shadow-lg animate-fade-in">
                    {toastMessage}
                </div>
            )}

            {/* ---------------- 1. Conversations List Sidebar ---------------- */}
            <div
                className={`w-full md:w-80 lg:w-88 flex-col overflow-hidden border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] shrink-0 transition-all ${
                    mobileShowList ? "flex" : "hidden md:flex"
                }`}
            >
                <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Messages</h1>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setIsCreateGroupOpen(true)}
                                className="flex items-center gap-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 transition"
                                title="Create Group Chat"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Group</span>
                            </button>
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            placeholder="Search conversations..."
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-1.5 pl-8 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-600"
                        />
                    </div>
                </div>

                {/* Chat Items List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {isLoadingConvs ? (
                        <div className="flex h-32 items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        </div>
                    ) : filteredConvs.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">No active conversations found.</div>
                    ) : (
                        filteredConvs.map((chat) => {
                            const isSelected = activeConvId === chat.id
                            const isOnline = chat.otherUserId ? (userPresence[chat.otherUserId]?.isOnline ?? true) : false

                            return (
                                <div
                                    key={chat.id}
                                    onClick={() => handleSelectChat(chat.id)}
                                    onContextMenu={(e) => handleContextMenu(e, chat.id)}
                                    className={`group relative flex items-center gap-3 rounded-xl p-2.5 cursor-pointer transition-colors ${
                                        isSelected
                                            ? "bg-blue-50/80 dark:bg-blue-950/30 border-l-3 border-blue-600"
                                            : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                    }`}
                                >
                                    <div className="relative shrink-0">
                                        {chat.type === "GROUP" ? (
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-white font-bold text-xs shadow-xs">
                                                <Users className="h-4.5 w-4.5" />
                                            </div>
                                        ) : (
                                            <UserAvatar
                                                displayName={chat.name}
                                                profileMediaId={chat.isBlocked ? null : chat.profileMediaId}
                                                avatarUrl={chat.isBlocked ? null : (chat.avatarUrl || chat.avatar)}
                                                size="md"
                                                isOnline={isOnline}
                                                showStatus={true}
                                            />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <h3 className={`text-xs font-semibold truncate ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-slate-900 dark:text-white"}`}>
                                                    {chat.name}
                                                </h3>
                                                {chat.type === "GROUP" && (
                                                    <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 text-[9px] font-semibold text-slate-600 dark:text-slate-300">
                                                        GROUP
                                                    </span>
                                                )}
                                                {chat.isPinned && <Pin className="h-3 w-3 text-blue-600 shrink-0 fill-blue-600/20" />}
                                                {chat.isMuted && <BellOff className="h-3 w-3 text-slate-400 shrink-0" />}
                                            </div>
                                            <span className="text-[10px] text-slate-400 shrink-0">{chat.lastMessageTime}</span>
                                        </div>

                                        <div className="flex items-center justify-between mt-0.5 gap-2">
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex-1">{chat.lastMessage}</p>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {chat.unreadCount > 0 && chat.id !== activeConvId && (
                                                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white">
                                                        {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                                                    </span>
                                                )}
                                                <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-slate-500 dark:text-slate-400">
                                                    {chat.nativeLang}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* ---------------- 2. Main Chat Workspace ---------------- */}
            <div
                className={`flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-[#0b0e17] ${
                    !mobileShowList ? "flex" : "hidden md:flex"
                }`}
            >
                {/* Header */}
                {activeConv ? (() => {
                    const isGroup = activeConv.type === "GROUP"
                    const presence = activeConv.otherUserId ? userPresence[activeConv.otherUserId] : null
                    const isOnline = presence?.isOnline ?? true
                    const statusText = isGroup
                        ? `${activeConv.members?.length || 0} members`
                        : isOnline
                        ? "Online"
                        : presence?.lastSeen
                        ? `Last seen ${new Date(presence.lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        : "Offline"

                    return (
                        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] px-4 py-2.5 shrink-0 z-20">
                            {/* Left User / Group Info */}
                            <div
                                onClick={() => {
                                    if (isGroup) setIsGroupInfoOpen(true)
                                }}
                                className={`flex items-center gap-2.5 sm:gap-3 min-w-0 ${isGroup ? "cursor-pointer hover:opacity-90 transition" : ""}`}
                            >
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setMobileShowList(true)
                                    }}
                                    className="md:hidden text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white p-1"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </button>

                                {isGroup ? (
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-white font-bold shrink-0">
                                        <Users className="h-4 w-4" />
                                    </div>
                                ) : (
                                    <UserAvatar
                                        displayName={activeConv.name}
                                        profileMediaId={activeConv.isBlocked ? null : activeConv.profileMediaId}
                                        avatarUrl={activeConv.isBlocked ? null : (activeConv.avatarUrl || activeConv.avatar)}
                                        size="sm"
                                        isOnline={isOnline}
                                        showStatus={true}
                                    />
                                )}

                                <div className="min-w-0">
                                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                        {activeConv.name}
                                    </h2>
                                    <p className="text-[11px] flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
                                        <span>{statusText}</span>
                                        {!isGroup && <span>• Speaks {activeConv.nativeLang}</span>}
                                    </p>
                                </div>
                            </div>

                            {/* Right Controls */}
                            <div className="flex items-center gap-2">
                                {/* Language Preference Switcher */}
                                <div className="hidden sm:flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                    <Globe className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                    <select
                                        value={(user?.nativeLanguage || "en").toLowerCase()}
                                        onChange={async (e) => {
                                            const newLang = e.target.value
                                            try {
                                                await usersApi.updateProfile({ nativeLanguage: newLang })
                                                await refreshProfile()
                                            } catch (_) {}
                                        }}
                                        className="bg-transparent text-slate-800 dark:text-slate-200 text-[11px] font-medium outline-none cursor-pointer"
                                        title="Shift my native translation language"
                                    >
                                        {SUPPORTED_LANGUAGES.map((lang) => (
                                            <option key={lang.code} value={lang.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                                                Translate to {lang.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Call Controls */}
                                {activeConv.otherUserId ? (
                                    <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
                                        <button
                                            type="button"
                                            disabled={activeConv.isBlocked}
                                            onClick={() => !activeConv.isBlocked && callStore.startCall(activeConv.id, { id: activeConv.otherUserId!, displayName: activeConv.name, avatar: activeConv.avatar }, "audio")}
                                            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                                                activeConv.isBlocked
                                                    ? "opacity-30 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200"
                                                    : "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200 dark:border-emerald-800"
                                            }`}
                                            title="Audio Call"
                                        >
                                            <Phone className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={activeConv.isBlocked}
                                            onClick={() => !activeConv.isBlocked && callStore.startCall(activeConv.id, { id: activeConv.otherUserId!, displayName: activeConv.name, avatar: activeConv.avatar }, "video")}
                                            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                                                activeConv.isBlocked
                                                    ? "opacity-30 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200"
                                                    : "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-600 border-blue-200 dark:border-blue-800"
                                            }`}
                                            title="Video Call"
                                        >
                                            <Video className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleBlock(activeConv.otherUserId!, activeConv.blockedByMe || false)}
                                            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                                                activeConv.blockedByMe
                                                    ? "bg-rose-100 text-rose-700 border-rose-300"
                                                    : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:text-rose-600"
                                            }`}
                                            title={activeConv.blockedByMe ? "Unblock user" : "Block user"}
                                        >
                                            <Shield className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowContactPanel((v) => !v)}
                                            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                                                showContactPanel
                                                    ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40"
                                                    : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:text-slate-900"
                                            }`}
                                            title="View contact info"
                                        >
                                            <User className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ) : isGroup ? (
                                    <button
                                        onClick={() => setIsGroupInfoOpen(true)}
                                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition"
                                    >
                                        <Users className="h-3.5 w-3.5 text-blue-600" />
                                        <span>Group Details</span>
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    )
                })() : (
                    <div className="flex h-16 items-center px-4 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d]">
                        <p className="text-xs text-slate-400">Select a conversation to begin</p>
                    </div>
                )}

                {/* ---------------- Chat Stream Messages Area ---------------- */}
                <div
                    ref={chatContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5"
                >
                    {isLoadingMoreMsgs && (
                        <div className="flex items-center justify-center gap-2 py-2 text-xs font-medium text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            <span>Loading previous messages...</span>
                        </div>
                    )}

                    {isLoadingMsgs && !hasMoreMsgs && messages.length === 0 ? (
                        <div className="flex h-48 items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex h-48 flex-col items-center justify-center text-center">
                            <Languages className="h-8 w-8 text-slate-400 mb-2" />
                            <p className="text-xs text-slate-500">No messages yet. Send a message to start chatting!</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            if (msg.messageType === "SYSTEM") {
                                return (
                                    <div key={msg.id} className="flex justify-center my-2">
                                        <div className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-3.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 shadow-xs">
                                            <Users className="h-3 w-3 text-blue-600 shrink-0" />
                                            <span>{msg.contentOriginal}</span>
                                            <span className="text-[10px] text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-1.5 ml-0.5">
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </div>
                                    </div>
                                )
                            }

                            const myNativeLang = (user?.nativeLanguage || "en").toLowerCase()
                            const isReceived = !msg.isMe
                            const msgOriginalLang = (msg.originalLanguage || "en").toLowerCase()

                            const targetTrans = isReceived
                                ? msg.translations?.find(
                                      (t) => t.targetLanguage.toLowerCase() === myNativeLang
                                  )
                                : undefined

                            const showTranslation =
                                isReceived &&
                                aiLive &&
                                msgOriginalLang !== myNativeLang &&
                                targetTrans?.status === "COMPLETED" &&
                                !!targetTrans?.translatedContent

                            const isPendingTranslation =
                                isReceived &&
                                aiLive &&
                                msgOriginalLang !== myNativeLang &&
                                targetTrans?.status === "PENDING"

                            const isCallLog = msg.contentOriginal.startsWith("📞") || msg.contentOriginal.startsWith("📹")
                            if (isCallLog) {
                                const isMissed = msg.contentOriginal.toLowerCase().includes("missed") || msg.contentOriginal.toLowerCase().includes("declined") || msg.contentOriginal.toLowerCase().includes("cancelled")
                                const isVideo = msg.contentOriginal.includes("📹") || msg.contentOriginal.toLowerCase().includes("video")
                                const isCaller = msg.isMe

                                let displayText = msg.contentOriginal
                                if (isCaller && (msg.contentOriginal.toLowerCase().includes("missed") || msg.contentOriginal.toLowerCase().includes("cancelled"))) {
                                    displayText = isVideo ? "📹 Cancelled video call" : "📞 Cancelled voice call"
                                } else if (!isCaller && msg.contentOriginal.toLowerCase().includes("cancelled")) {
                                    displayText = isVideo ? "📹 Missed video call" : "📞 Missed voice call"
                                }

                                return (
                                    <div key={msg.id} className="flex justify-center my-2">
                                        <div className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium shadow-xs ${
                                            isMissed
                                                ? "border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                                                : "border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                                        }`}>
                                            {isVideo ? <Video className="h-3.5 w-3.5 shrink-0" /> : <Phone className="h-3.5 w-3.5 shrink-0" />}
                                            <span>{displayText}</span>
                                            <span className="text-[10px] text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-1.5 ml-0.5">
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
                                    {!msg.isMe && activeConv?.type === "GROUP" && (
                                        <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-1 ml-1">
                                            {msg.senderName}
                                        </span>
                                    )}

                                    <div className={`relative group/msg flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}>
                                        <div
                                            className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                                msg.isMe
                                                    ? "bg-blue-600 text-white rounded-tr-xs shadow-xs"
                                                    : "bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 rounded-tl-xs shadow-xs"
                                            }`}
                                        >
                                            {msg.mediaAssets && msg.mediaAssets.length > 0 && (
                                                <MediaMessageView mediaAsset={msg.mediaAssets[0]} />
                                            )}

                                            {showTranslation ? (
                                                <>
                                                    <p className="text-sm font-medium leading-relaxed">{targetTrans!.translatedContent}</p>
                                                    
                                                    {/* Subtle translation accordion / original preview */}
                                                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400">
                                                        <div className="flex items-center justify-between text-[10px]">
                                                            <span>Original ({msgOriginalLang.toUpperCase()}):</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleWordBreakdown(msg.id, msg.contentOriginal, targetTrans?.translatedContent || "")}
                                                                className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                                                            >
                                                                Word breakdown
                                                                {loadingBreakdownId === msg.id && <Loader2 className="inline ml-1 h-2.5 w-2.5 animate-spin" />}
                                                            </button>
                                                        </div>
                                                        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 italic">{msg.contentOriginal}</p>
                                                    </div>

                                                    {expandedBreakdownMsgId === msg.id && wordBreakdowns[msg.id] && (
                                                        <div className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] space-y-1">
                                                            <div className="flex flex-wrap gap-1">
                                                                {wordBreakdowns[msg.id].map((item, idx) => (
                                                                    <span key={idx} className="inline-flex items-center gap-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5">
                                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.original}</span>
                                                                        <span className="text-slate-400">→</span>
                                                                        <span className="text-blue-600 dark:text-blue-400">{item.translated}</span>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            ) : isPendingTranslation ? (
                                                <>
                                                    <p className="text-sm font-medium leading-relaxed">{msg.contentOriginal}</p>
                                                    <span className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                                                        <Loader2 className="h-2.5 w-2.5 animate-spin text-blue-600" />
                                                        translating...
                                                    </span>
                                                </>
                                            ) : (
                                                <p className="text-sm font-medium leading-relaxed">{msg.contentOriginal}</p>
                                            )}
                                        </div>

                                        {/* Action buttons for owner */}
                                        {msg.isMe && (
                                            <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity absolute -top-3 right-1 flex items-center gap-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1 py-0.5 shadow-sm z-10">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingMessage(msg)
                                                        setInputMsg(msg.contentOriginal)
                                                    }}
                                                    className="p-1 text-slate-400 hover:text-blue-600 transition"
                                                    title="Edit message"
                                                >
                                                    <Edit3 className="h-3 w-3" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        deleteMessageViaSocket(msg.id, (res) => {
                                                            if (res.status === "deleted") {
                                                                showToast("Message deleted")
                                                                setMessages((prev) => prev.filter((m) => m.id !== msg.id))
                                                            }
                                                        })
                                                    }}
                                                    className="p-1 text-slate-400 hover:text-rose-600 transition"
                                                    title="Delete message"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className={`mt-1 flex items-center gap-1 text-[10px] text-slate-400 px-1 ${msg.isMe ? "justify-end" : "justify-start"}`}>
                                        <span>
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                        {(msg.systemMetadata?.isEdited || msg.systemMetadata?.edited) && (
                                            <span className="text-[9px] italic">(edited)</span>
                                        )}
                                        {msg.isMe && (
                                            <span className="shrink-0">
                                                {msg.status === "READ" ? (
                                                    <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                                                ) : msg.status === "DELIVERED" ? (
                                                    <CheckCheck className="h-3.5 w-3.5 text-slate-400" />
                                                ) : msg.status === "FAILED" ? (
                                                    <span className="text-[10px] text-rose-500 font-medium">Failed</span>
                                                ) : (
                                                    <Check className="h-3.5 w-3.5 text-slate-400" />
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

                {/* Real-time Typing Indicator */}
                {activeConvId && typingUsers[activeConvId] && (
                    <div className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 border-t border-slate-100 dark:border-slate-800">
                        <span className="font-medium">{activeConv?.name || "User"}</span> is typing
                        <span className="flex items-center gap-0.5 ml-1">
                            <span className="h-1 w-1 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="h-1 w-1 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="h-1 w-1 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                    </div>
                )}

                {/* Editing Banner */}
                {editingMessage && (
                    <div className="flex items-center justify-between px-4 py-2 bg-blue-50 dark:bg-blue-950/40 border-t border-blue-200 dark:border-blue-800 text-xs font-medium text-blue-700 dark:text-blue-300">
                        <div className="flex items-center gap-2 truncate">
                            <Edit3 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            <span>Editing message:</span>
                            <span className="truncate text-slate-600 dark:text-slate-400 italic max-w-md">"{editingMessage.contentOriginal}"</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setEditingMessage(null)
                                setInputMsg("")
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Compact Composer */}
                {!canSendInGroup ? (
                    <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-3 text-center text-xs font-medium text-slate-500 flex items-center justify-center gap-2">
                        <Ban className="h-4 w-4 text-amber-500 shrink-0" />
                        <span>Only group admins can send messages in this group.</span>
                    </div>
                ) : (
                    <div className="border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] p-3 shrink-0 relative space-y-2">
                        {showChatMediaUploader && activeConvId && !activeConv?.isBlocked && (
                            <div className="mb-2">
                                <MediaUploader
                                    mediaCategory="CHAT"
                                    conversationId={activeConvId}
                                    onUploadSuccess={(asset) => {
                                        setShowChatMediaUploader(false)
                                        const idempotencyKey = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
                                        const userLang = user?.nativeLanguage || "en"
                                        const tempId = `temp_${Date.now()}`

                                        const optimisticMsg: MessageItem = {
                                            id: tempId,
                                            conversationId: activeConvId,
                                            senderId: user?.id || "",
                                            senderName: (user as any)?.displayName || user?.username || "You",
                                            contentOriginal: asset.originalName,
                                            originalLanguage: userLang,
                                            idempotencyKey,
                                            messageType: "USER",
                                            createdAt: new Date().toISOString(),
                                            translations: [],
                                            isMe: true,
                                            status: "SENT",
                                            mediaAssets: [asset],
                                        }

                                        setMessages((prev) => [...prev, optimisticMsg])
                                        setTimeout(() => {
                                            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
                                        }, 50)

                                        sendMessageViaSocket({
                                            conversationId: activeConvId,
                                            contentOriginal: asset.originalName,
                                            originalLanguage: userLang,
                                            idempotencyKey,
                                            mediaAssetId: asset.id,
                                        }, (ack) => {
                                            if (ack?.status === "saved" && ack.messageId) {
                                                setMessages((prev) =>
                                                    prev.map((m) => (m.id === tempId ? { ...m, id: ack.messageId! } : m))
                                                )
                                            } else {
                                                setMessages((prev) =>
                                                    prev.map((m) => (m.id === tempId ? { ...m, status: "FAILED" } : m))
                                                )
                                            }
                                        })
                                    }}
                                    onCancel={() => setShowChatMediaUploader(false)}
                                />
                            </div>
                        )}

                        <form onSubmit={handleSend} className="flex items-center gap-2">
                            <div className="relative flex items-center gap-1">
                                <button
                                    type="button"
                                    disabled={activeConv?.isBlocked}
                                    onClick={() => !activeConv?.isBlocked && setShowChatMediaUploader((prev) => !prev)}
                                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition shrink-0 ${
                                        activeConv?.isBlocked
                                            ? "opacity-30 cursor-not-allowed bg-slate-100 text-slate-400"
                                            : showChatMediaUploader
                                            ? "bg-blue-600 text-white"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                                    }`}
                                    title="Attach File"
                                >
                                    <Paperclip className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    disabled={activeConv?.isBlocked}
                                    onClick={() => !activeConv?.isBlocked && setShowEmojiPicker((prev) => !prev)}
                                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition shrink-0 ${
                                        activeConv?.isBlocked
                                            ? "opacity-30 cursor-not-allowed bg-slate-100 text-slate-400"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                                    }`}
                                    title="Choose Emoji"
                                >
                                    <Smile className="h-4 w-4" />
                                </button>
                                {showEmojiPicker && !activeConv?.isBlocked && (
                                    <EmojiPicker
                                        onSelectEmoji={handleEmojiSelect}
                                        onClose={() => setShowEmojiPicker(false)}
                                    />
                                )}
                            </div>

                            <input
                                ref={inputRef}
                                type="text"
                                disabled={activeConv?.isBlocked}
                                value={inputMsg}
                                onChange={(e) => handleInputChange(e.target.value)}
                                placeholder={activeConv?.isBlocked ? "Messaging unavailable" : `Write a message...`}
                                className={`flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-2.5 px-3.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-600 ${
                                    activeConv?.isBlocked ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                            />
                            <button
                                type="submit"
                                disabled={activeConv?.isBlocked || !inputMsg.trim()}
                                className={`flex h-9 w-9 items-center justify-center rounded-xl text-white transition shadow-xs ${
                                    activeConv?.isBlocked || !inputMsg.trim()
                                        ? "opacity-40 cursor-not-allowed bg-slate-400"
                                        : "bg-blue-600 hover:bg-blue-700"
                                }`}
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* Right Profile / Context Drawer (Desktop & Mobile) */}
            {showContactPanel && activeConv && activeConv.type !== "GROUP" && (
                <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-80 border-l border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] shadow-xl md:relative md:shadow-none flex flex-col animate-fade-in">
                    <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 px-4 py-3">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Contact Info</h3>
                        <button
                            type="button"
                            onClick={() => setShowContactPanel(false)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-5 text-left">
                        <div className="flex flex-col items-center text-center space-y-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <UserAvatar
                                displayName={activeConv.name}
                                profileMediaId={activeConv.isBlocked ? null : activeConv.profileMediaId}
                                avatarUrl={activeConv.isBlocked ? null : (activeConv.avatarUrl || activeConv.avatar)}
                                size="lg"
                                isOnline={userPresence[activeConv.otherUserId || ""]?.isOnline}
                                showStatus={true}
                            />
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{activeConv.name}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {userPresence[activeConv.otherUserId || ""]?.isOnline ? "Active now" : "Offline"}
                                </p>
                            </div>

                            {activeConv.otherUserId && (
                                <div className="flex items-center gap-2 pt-2">
                                    <button
                                        type="button"
                                        disabled={activeConv.isBlocked}
                                        onClick={() => !activeConv.isBlocked && callStore.startCall(activeConv.id, { id: activeConv.otherUserId!, displayName: activeConv.name, avatar: activeConv.avatar }, "audio")}
                                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition disabled:opacity-40"
                                    >
                                        <Phone className="h-3.5 w-3.5 text-emerald-600" />
                                        <span>Audio</span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={activeConv.isBlocked}
                                        onClick={() => !activeConv.isBlocked && callStore.startCall(activeConv.id, { id: activeConv.otherUserId!, displayName: activeConv.name, avatar: activeConv.avatar }, "video")}
                                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition disabled:opacity-40"
                                    >
                                        <Video className="h-3.5 w-3.5 text-blue-600" />
                                        <span>Video</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Primary Language</span>
                                <p className="mt-1 font-medium text-slate-800 dark:text-slate-200">{activeConv.nativeLang || "English"}</p>
                            </div>

                            <div>
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Translation Route</span>
                                <p className="mt-1 font-medium text-slate-800 dark:text-slate-200">
                                    {activeConv.nativeLang || "English"} ↔ {user?.nativeLanguage || "en"}
                                </p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                            {activeConv.otherUserId && (
                                <button
                                    type="button"
                                    onClick={() => handleToggleBlock(activeConv.otherUserId!, activeConv.blockedByMe || false)}
                                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold border transition ${
                                        activeConv.blockedByMe
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                            : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                    }`}
                                >
                                    <Shield className="h-3.5 w-3.5" />
                                    <span>{activeConv.blockedByMe ? "Unblock Contact" : "Block Contact"}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            <CreateGroupModal
                isOpen={isCreateGroupOpen}
                onClose={() => setIsCreateGroupOpen(false)}
                onGroupCreated={(newGroup) => {
                    showToast("Group created successfully")
                    loadConversations()
                    if (newGroup?.id) {
                        setActiveConvId(newGroup.id)
                    }
                }}
            />

            {activeConvId && (
                <GroupInfoModal
                    isOpen={isGroupInfoOpen}
                    conversationId={activeConvId}
                    currentUserId={user?.id || ""}
                    onClose={() => setIsGroupInfoOpen(false)}
                    onGroupUpdated={() => {
                        loadConversations()
                        loadMessages(activeConvId)
                    }}
                    onLeftGroup={() => {
                        showToast("You left the group")
                        loadConversations()
                        setActiveConvId(null)
                    }}
                />
            )}

            {/* Custom Context Menu */}
            {contextMenu && (() => {
                const targetConv = conversations.find((c) => c.id === contextMenu.chatId)
                return (
                    <div
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                        className="fixed z-50 w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 shadow-xl animate-fade-in"
                    >
                        <button
                            onClick={() => {
                                togglePinChat(contextMenu.chatId)
                                setContextMenu(null)
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                            <Pin className="h-3.5 w-3.5 text-blue-600" />
                            <span>{targetConv?.isPinned ? "Unpin Chat" : "Pin to Top"}</span>
                        </button>

                        <button
                            onClick={() => {
                                toggleMuteChat(contextMenu.chatId)
                                setContextMenu(null)
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                            <BellOff className="h-3.5 w-3.5 text-slate-400" />
                            <span>{targetConv?.isMuted ? "Unmute Notifications" : "Mute Notifications"}</span>
                        </button>

                        {targetConv?.otherUserId && (
                            <button
                                onClick={() => {
                                    handleToggleBlock(targetConv.otherUserId!, targetConv.blockedByMe || false)
                                    setContextMenu(null)
                                }}
                                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                                    targetConv.blockedByMe
                                        ? "text-emerald-600 hover:bg-emerald-50"
                                        : "text-rose-600 hover:bg-rose-50"
                                }`}
                            >
                                <Shield className="h-3.5 w-3.5" />
                                <span>{targetConv.blockedByMe ? "Unblock User" : "Block User"}</span>
                            </button>
                        )}
                    </div>
                )
            })()}

            <SubscriptionModal isOpen={isQuotaModalOpen} onClose={() => setIsQuotaModalOpen(false)} />
            <CallHistoryModal isOpen={showCallHistoryModal} onClose={() => setShowCallHistoryModal(false)} />
        </div>
    )
}
