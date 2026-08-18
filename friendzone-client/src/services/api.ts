export function getApiBaseUrl(): string {
    let envUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1"
    envUrl = envUrl.trim().replace(/\/+$/, "")
    if (!envUrl.endsWith("/api/v1")) {
        if (envUrl.endsWith("/api")) {
            envUrl = `${envUrl}/v1`
        } else {
            envUrl = `${envUrl}/api/v1`
        }
    }
    return envUrl
}

const API_BASE_URL = getApiBaseUrl()

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
    profileMediaId?: string | null
    profileMedia?: any
    isVerified?: boolean
    onboardingCompleted?: boolean
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

    const contentType = response.headers.get("content-type") || ""
    let body: any = null

    if (contentType.includes("application/json")) {
        try {
            body = await response.json()
        } catch {
            body = null
        }
    } else {
        const text = await response.text()
        if (!response.ok) {
            throw new Error(`Server error (${response.status}). ${text.includes("<!DOCTYPE") ? "Invalid route endpoint or backend server unreachable." : text.slice(0, 100)}`)
        }
    }

    if (!response.ok) {
        const errorMsg = body?.error?.message || body?.message || `API Request failed (${response.status})`
        const err: any = new Error(errorMsg)
        err.code = body?.code
        err.status = response.status
        err.data = body?.data
        throw err
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
    async checkUsername(username: string) {
        return await request<any>(`/auth/check-username?username=${encodeURIComponent(username)}`)
    },

    async register(data: {
        displayName: string
        username: string
        email: string
        password: string
        dateOfBirth?: string
    }) {
        const res = await request<any>("/auth/register", {
            method: "POST",
            body: JSON.stringify(data),
        })

        const token = res?.data?.accessToken || res?.accessToken || ""
        if (token) setMemoryAccessToken(token)

        return {
            user: (res?.data?.user || res?.user || res) as UserProfile,
            accessToken: token,
        }
    },

    async completeOnboarding(data: {
        nativeLanguage: string
        fluentLanguages?: string[]
        learningLanguages?: string[]
        countryCode?: string
        usagePurposes?: string[]
    }) {
        const res = await request<any>("/auth/onboarding", {
            method: "POST",
            body: JSON.stringify(data),
        })
        return (res?.data?.user || res?.user || res) as UserProfile
    },

    async verifyEmail(token: string) {
        return await request<any>(`/auth/verify-email?token=${encodeURIComponent(token)}`)
    },

    async resendVerification(email?: string) {
        return await request<any>("/auth/resend-verification", {
            method: "POST",
            body: JSON.stringify({ email }),
        })
    },

    async forgotPassword(email: string) {
        return await request<any>("/auth/forgot-password", {
            method: "POST",
            body: JSON.stringify({ email }),
        })
    },

    async resetPassword(token: string, newPassword: string) {
        return await request<any>("/auth/reset-password", {
            method: "POST",
            body: JSON.stringify({ token, newPassword }),
        })
    },

    async login(email: string, pass: string) {
        const res = await request<any>("/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email,
                password: pass,
            }),
        })

        const token = res?.data?.accessToken || res?.accessToken || ""
        if (token) setMemoryAccessToken(token)

        return {
            code: res?.code,
            message: res?.message,
            user: (res?.data?.user || res?.user || res) as UserProfile,
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
        if (plan.toUpperCase() === "FREE") {
            return await subscriptionApi.changePlan("FREE")
        }
        return await subscriptionApi.createCheckoutSession(plan)
    },
}

export const subscriptionApi = {
    async createCheckoutSession(plan: string) {
        const res = await request<any>("/subscription/create-checkout-session", {
            method: "POST",
            body: JSON.stringify({ plan }),
        })
        return res as {
            subscriptionId?: string
            shortUrl?: string
            keyId?: string
            plan?: string
            user?: { displayName: string; email: string }
            quota?: QuotaInfo
        }
    },

    async verifyPayment(data: {
        razorpay_payment_id: string
        razorpay_subscription_id: string
        razorpay_signature: string
        plan: string
    }) {
        const res = await request<any>("/subscription/verify-payment", {
            method: "POST",
            body: JSON.stringify(data),
        })
        return res as { user: UserProfile; quota: QuotaInfo; message?: string }
    },

    async changePlan(plan: string) {
        const res = await request<any>("/subscription/change-plan", {
            method: "POST",
            body: JSON.stringify({ plan }),
        })
        return res as { user: UserProfile; quota: QuotaInfo; message?: string; subscriptionId?: string; keyId?: string }
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

    async rejectRequest(targetUserId: string) {
        return await request<any>("/friendships/reject", {
            method: "POST",
            body: JSON.stringify({ targetUserId }),
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

    async createGroup(title: string, memberIds: string[], description?: string, avatarUrl?: string) {
        const res = await request<any>("/conversations/group", {
            method: "POST",
            body: JSON.stringify({ title, memberIds, description, avatarUrl }),
        })
        return res?.conversation || res?.data?.conversation || res
    },

    async getGroupDetails(id: string) {
        const res = await request<any>(`/conversations/${id}`)
        return res?.data || res
    },

    async updateGroupInfo(id: string, data: { title?: string; description?: string; avatarUrl?: string; onlyAdminsCanSend?: boolean; onlyAdminsCanEditInfo?: boolean; onlyAdminsCanAddMembers?: boolean }) {
        const res = await request<any>(`/conversations/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        })
        return res?.data || res
    },

    async getGroupMembers(id: string, search?: string, page = 1, limit = 30) {
        let url = `/conversations/${id}/members?page=${page}&limit=${limit}`
        if (search) url += `&search=${encodeURIComponent(search)}`
        const res = await request<any>(url)
        return res?.data || res
    },

    async addGroupMembers(id: string, memberIds: string[]) {
        const res = await request<any>(`/conversations/${id}/members`, {
            method: "POST",
            body: JSON.stringify({ memberIds }),
        })
        return res?.data || res
    },

    async removeGroupMember(id: string, targetUserId: string) {
        const res = await request<any>(`/conversations/${id}/members/${targetUserId}`, {
            method: "DELETE",
        })
        return res?.data || res
    },

    async leaveGroup(id: string) {
        const res = await request<any>(`/conversations/${id}/leave`, {
            method: "POST",
        })
        return res?.data || res
    },

    async updateMemberRole(id: string, targetUserId: string, role: "ADMIN" | "MEMBER" | "OWNER") {
        const res = await request<any>(`/conversations/${id}/roles/${targetUserId}`, {
            method: "PATCH",
            body: JSON.stringify({ role }),
        })
        return res?.data || res
    },

    async createInvite(id: string) {
        const res = await request<any>(`/conversations/${id}/invite`, {
            method: "POST",
        })
        return res?.data || res
    },

    async revokeInvite(id: string) {
        const res = await request<any>(`/conversations/${id}/invite`, {
            method: "DELETE",
        })
        return res?.data || res
    },

    async joinInvite(token: string) {
        const res = await request<any>(`/conversations/invite/${encodeURIComponent(token)}/join`, {
            method: "GET",
        })
        return res?.data || res
    },
}

export const groupsApi = conversationsApi

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

    async editMessage(messageId: string, contentOriginal: string) {
        return await request<any>(`/messages/${messageId}`, {
            method: "PATCH",
            body: JSON.stringify({ contentOriginal }),
        })
    },

    async deleteMessage(messageId: string) {
        return await request<any>(`/messages/${messageId}`, {
            method: "DELETE",
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

export interface PublicReview {
    id: string
    rating: number
    comment: string
    createdAt: string
    user: {
        id: string
        displayName: string
        nativeLanguage: string
    }
}

export interface CommunityStats {
    totalUsers: number
    totalTranslations: number
    totalReviews: number
    languagesCount: number
}

export const reviewsApi = {
    async getPublicReviews() {
        return await request<{ reviews: PublicReview[]; stats: CommunityStats }>("/reviews/public")
    },

    async submitReview(rating: number, comment: string) {
        return await request<{ success: boolean; review: PublicReview }>("/reviews", {
            method: "POST",
            body: JSON.stringify({ rating, comment }),
        })
    },
}

export interface CallHistoryItem {
    id: string
    conversationId: string
    peer: {
        id: string
        displayName: string
        username?: string
        avatar?: string
    }
    type: "audio" | "video"
    direction: "outgoing" | "incoming"
    status: "completed" | "missed" | "cancelled"
    text: string
    createdAt: string
}

export const callsApi = {
    async getIceServers() {
        return await request<{ iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }>; ttlSeconds: number }>("/calls/ice-servers", {
            method: "POST",
        })
    },

    async getCallHistory() {
        return await request<{ calls: CallHistoryItem[] }>("/calls/history")
    },
}

export interface InitUploadParams {
    mediaCategory: "PROFILE" | "CHAT"
    mediaType: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT"
    mimeType: string
    originalName: string
    size: number
    conversationId?: string
}

export interface MediaAssetResponse {
    id: string
    mediaCategory: string
    mediaType: string
    mimeType: string
    originalName: string
    size: number
    uploadStatus: string
    moderationStatus: string
    storageKey: string
    thumbnailKey?: string
    expiresAt?: string
}

export const mediaApi = {
    async initUpload(params: InitUploadParams) {
        return await request<{ mediaId: string; uploadUrl: string; expiresAt?: string }>("/media/upload/init", {
            method: "POST",
            body: JSON.stringify(params),
        })
    },

    async uploadToR2(uploadUrl: string, file: File, onProgress?: (pct: number) => void): Promise<void> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            xhr.open("PUT", uploadUrl, true)
            // Explicitly set Content-Type matching presigned URL registration. Do NOT send Authorization or custom headers to R2.
            xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")

            if (xhr.upload && onProgress) {
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100)
                        onProgress(percent)
                    }
                }
            }

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve()
                } else {
                    reject(new Error(`Direct R2 upload failed with status ${xhr.status}`))
                }
            }

            xhr.onerror = () => reject(new Error("Network or CORS error uploading directly to Cloudflare R2"))
            xhr.send(file)
        })
    },

    async completeUpload(mediaId: string) {
        return await request<{ mediaAsset: MediaAssetResponse }>(`/media/upload/${mediaId}/complete`, {
            method: "POST",
        })
    },

    async getMediaAccessUrl(mediaId: string) {
        return await request<{ mediaAsset: MediaAssetResponse; downloadUrl: string; thumbnailUrl?: string }>(`/media/${mediaId}/url`)
    },

    async setProfilePicture(mediaId: string) {
        return await request<{ profileMediaId: string }>("/media/profile-picture", {
            method: "POST",
            body: JSON.stringify({ mediaId }),
        })
    },

    async removeProfilePicture() {
        return await request<{ success: boolean }>("/media/profile-picture", {
            method: "DELETE",
        })
    },
}

export const translationApi = {
    async getWordBreakdown(data: {
        originalText: string
        translatedText: string
        sourceLanguage?: string
        targetLanguage?: string
    }) {
        return await request<{ breakdown: Array<{ original: string; translated: string }> }>("/translation/word-breakdown", {
            method: "POST",
            body: JSON.stringify(data),
        })
    },
}

