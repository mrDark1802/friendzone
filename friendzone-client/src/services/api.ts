const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://friendzone-g05i.onrender.com/api/v1"

export interface UserProfile {
    id: string
    email: string
    username: string
    displayName: string
    nativeLanguage: string
    translationEnabled?: boolean
    role: string
    plan?: string
    avatar?: string
}

export interface QuotaInfo {
    plan: string
    planName: string
    price: string
    isDailyLimit: boolean
    used: number
    limit: number
    remaining: number
    percentage: number
    dailyUsed: number
    monthlyUsed: number
}

export interface AuthResponse {
    user: UserProfile
    accessToken: string
}

// In-memory access token storage with localStorage fallback for 30-day session persistence
let memoryAccessToken: string | null = null
let refreshPromise: Promise<string | null> | null = null

export function getMemoryAccessToken(): string | null {
    if (!memoryAccessToken) {
        memoryAccessToken = localStorage.getItem("fz_access_token")
    }
    return memoryAccessToken
}

export function setMemoryAccessToken(token: string | null) {
    memoryAccessToken = token
    if (token) {
        localStorage.setItem("fz_access_token", token)
    } else {
        localStorage.removeItem("fz_access_token")
    }
}

export function clearAuthMemory() {
    memoryAccessToken = null
    refreshPromise = null
    localStorage.removeItem("fz_access_token")
}

// Fetch helper with Bearer Authorization header, token refresh queue lock, and response unwrapping
async function request<T>(endpoint: string, options: RequestInit = {}, isRetry = false): Promise<T> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    }

    if (memoryAccessToken) {
        headers["Authorization"] = `Bearer ${memoryAccessToken}`
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: "include", // Essential for HttpOnly refresh_token cookie
        headers,
    })

    // Handle 401 Unauthorized with single mutex lock refresh call
    if (response.status === 401 && !isRetry && endpoint !== "/auth/login" && endpoint !== "/auth/refresh") {
        try {
            const newToken = await refreshAccessToken()
            if (newToken) {
                headers["Authorization"] = `Bearer ${newToken}`
                return await request<T>(endpoint, options, true)
            }
        } catch {
            clearAuthMemory()
            throw new Error("Session expired. Please sign in again.")
        }
    }

    const body = await response.json()

    if (!response.ok) {
        const errorMsg = body?.error?.message || body?.message || "API Request failed"
        throw new Error(errorMsg)
    }

    // Unwrap standard backend `{ success: true, data: ... }` response envelope
    if (body && typeof body === "object" && "data" in body && body.data !== null) {
        return body.data as T
    }

    return body as T
}

// Single mutex-locked refresh operation
export async function refreshAccessToken(): Promise<string | null> {
    if (refreshPromise) {
        return refreshPromise
    }

    refreshPromise = (async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
            })
            const body = await res.json()
            if (!res.ok) {
                clearAuthMemory()
                return null
            }
            const token = body?.data?.accessToken || body?.accessToken || null
            if (token) {
                setMemoryAccessToken(token)
            }
            return token
        } catch {
            clearAuthMemory()
            return null
        } finally {
            refreshPromise = null
        }
    })()

    return refreshPromise
}

export const authApi = {
    async register(data: {
        fullName: string
        username: string
        email: string
        password: string
        nativeLanguage?: string
    }) {
        const res = await request<any>("/auth/register", {
            method: "POST",
            body: JSON.stringify({
                displayName: data.fullName,
                username: data.username,
                email: data.email,
                password: data.password,
                nativeLanguage: data.nativeLanguage || "en",
            }),
        })
        return (res?.user || res) as UserProfile
    },

    async login(email: string, pass: string) {
        const res = await request<any>("/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email,
                password: pass,
            }),
        })

        const token = res?.accessToken || ""
        if (token) setMemoryAccessToken(token)

        return {
            user: (res?.user || res) as UserProfile,
            accessToken: token,
        }
    },

    async logout() {
        try {
            await request("/auth/logout", { method: "POST" })
        } catch {
            // Ignore offline logout errors
        } finally {
            clearAuthMemory()
        }
    },
}

export const usersApi = {
    async getProfile() {
        const res = await request<any>("/users/me")
        return (res?.user || res) as UserProfile
    },

    async updateProfile(data: Partial<UserProfile>) {
        const res = await request<any>("/users/me", {
            method: "PATCH",
            body: JSON.stringify(data),
        })
        return (res?.user || res) as UserProfile
    },

    async changePassword(data: { currentPassword: string; newPassword: string }) {
        return await request<any>("/users/me/password", {
            method: "POST",
            body: JSON.stringify(data),
        })
    },

    async searchUsers(query: string) {
        const res = await request<any>(`/users/search?q=${encodeURIComponent(query)}`)
        return (res?.users || res) as UserProfile[]
    },

    async getQuota() {
        const res = await request<any>("/users/me/quota")
        return (res?.quota || res) as QuotaInfo
    },

    async upgradePlan(plan: string) {
        const res = await request<any>("/users/me/plan", {
            method: "POST",
            body: JSON.stringify({ plan }),
        })
        return res as { user: UserProfile; quota: QuotaInfo }
    },
}

export const friendshipsApi = {
    async getFriends() {
        const res = await request<any>("/friendships")
        return (res?.friends || res) as any[]
    },

    async sendRequest(targetUserId: string) {
        return await request<any>("/friendships/request", {
            method: "POST",
            body: JSON.stringify({ targetUserId }),
        })
    },

    async acceptRequest(requesterUserId: string) {
        return await request<any>("/friendships/accept", {
            method: "POST",
            body: JSON.stringify({ requesterUserId }),
        })
    },

    async blockUser(targetUserId: string) {
        return await request<any>("/friendships/block", {
            method: "POST",
            body: JSON.stringify({ targetUserId }),
        })
    },

    async unblockUser(targetUserId: string) {
        return await request<any>("/friendships/unblock", {
            method: "POST",
            body: JSON.stringify({ targetUserId }),
        })
    },
}

export const conversationsApi = {
    async getConversations() {
        const res = await request<any>("/conversations")
        return (res?.conversations || res) as any[]
    },

    async createDirect(targetUserId: string) {
        const res = await request<any>("/conversations/direct", {
            method: "POST",
            body: JSON.stringify({ targetUserId }),
        })
        return res?.conversation || res
    },

    async createGroup(title: string, memberIds: string[]) {
        const res = await request<any>("/conversations/group", {
            method: "POST",
            body: JSON.stringify({ title, memberIds }),
        })
        return res?.conversation || res
    },
}

export const messagesApi = {
    async getMessages(conversationId: string, limit = 20, cursor?: string) {
        let url = `/messages/conversation/${conversationId}?limit=${limit}`
        if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`
        return await request<{ messages: any[]; nextCursor?: string }>(url)
    },

    async sendMessage(conversationId: string, contentOriginal: string, originalLanguage: string, idempotencyKey: string) {
        return await request<any>("/messages/send", {
            method: "POST",
            body: JSON.stringify({
                conversationId,
                contentOriginal,
                originalLanguage,
                idempotencyKey,
            }),
        })
    },

    async markRead(conversationId: string, messageId: string) {
        return await request<any>("/messages/read", {
            method: "POST",
            body: JSON.stringify({ conversationId, messageId }),
        })
    },
}

export const notificationsApi = {
    async getNotifications() {
        const res = await request<any>("/notifications")
        return (res?.notifications || res) as any[]
    },

    async markRead(notificationId?: string) {
        return await request<any>("/notifications/read", {
            method: "PATCH",
            body: JSON.stringify({ notificationId }),
        })
    },
}

export const moderationApi = {
    async reportUser(reportedUserId: string, reason: string, details?: string) {
        return await request<any>("/moderation/report", {
            method: "POST",
            body: JSON.stringify({ reportedUserId, reason, details }),
        })
    },
}
