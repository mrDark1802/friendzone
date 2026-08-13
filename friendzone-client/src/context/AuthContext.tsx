import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import {
    authApi,
    usersApi,
    refreshAccessToken,
    getMemoryAccessToken,
    setMemoryAccessToken,
    clearAuthMemory,
} from "../services/api"
import { connectSocket, disconnectSocket } from "../services/socket"

export type AuthStatus = "AUTH_LOADING" | "AUTHENTICATED" | "UNAUTHENTICATED"

export interface User {
    id: string
    name: string
    username: string
    email: string
    avatar: string
    role: string
    nativeLanguage: string
    translationEnabled: boolean
}

interface AuthContextType {
    status: AuthStatus
    isAuthenticated: boolean
    user: User | null
    login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>
    register: (data: { fullName: string; username: string; email: string; password: string; nativeLanguage?: string }) => Promise<{ success: boolean; message?: string }>
    logout: () => void
    refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"

export function AuthProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<AuthStatus>("AUTH_LOADING")
    const [user, setUser] = useState<User | null>(null)

    // Deterministic authentication startup
    const initializeAuth = async () => {
        setStatus("AUTH_LOADING")
        let token = getMemoryAccessToken()

        if (!token) {
            token = await refreshAccessToken()
        }

        if (!token) {
            clearAuthMemory()
            setUser(null)
            setStatus("UNAUTHENTICATED")
            return
        }

        try {
            const profile = await usersApi.getProfile()
            if (profile && profile.id) {
                const authenticatedUser: User = {
                    id: profile.id,
                    name: profile.displayName || profile.email?.split("@")?.[0] || "user",
                    username: profile.username || profile.email?.split("@")?.[0] || "user",
                    email: profile.email || "",
                    avatar: profile.avatar || DEFAULT_AVATAR,
                    role: profile.role || "USER",
                    nativeLanguage: profile.nativeLanguage || "en",
                    translationEnabled: profile.translationEnabled ?? true,
                }
                setUser(authenticatedUser)
                setStatus("AUTHENTICATED")

                // Connect Socket.IO session
                connectSocket(token)
            } else {
                throw new Error("Invalid user profile")
            }
        } catch {
            clearAuthMemory()
            setUser(null)
            setStatus("UNAUTHENTICATED")
        }
    }

    useEffect(() => {
        initializeAuth()
    }, [])

    const refreshProfile = async () => {
        try {
            const profile = await usersApi.getProfile()
            if (profile && profile.id) {
                setUser({
                    id: profile.id,
                    name: profile.displayName || profile.email?.split("@")?.[0] || "user",
                    username: profile.username || profile.email?.split("@")?.[0] || "user",
                    email: profile.email || "",
                    avatar: profile.avatar || DEFAULT_AVATAR,
                    role: profile.role || "USER",
                    nativeLanguage: profile.nativeLanguage || "en",
                    translationEnabled: profile.translationEnabled ?? true,
                })
            }
        } catch {
            // Profile fetch fallback
        }
    }

    const login = async (email: string, pass: string) => {
        const cleanEmail = email.trim().toLowerCase()
        const cleanPass = pass.trim()

        try {
            const res = await authApi.login(cleanEmail, cleanPass)
            if (!res.user || !res.user.id) {
                return { success: false, message: "Invalid server credentials response." }
            }

            const loggedInUser: User = {
                id: res.user.id,
                name: res.user.displayName || cleanEmail?.split("@")?.[0] || "user",
                username: res.user.username || cleanEmail?.split("@")?.[0] || "user",
                email: res.user.email,
                avatar: DEFAULT_AVATAR,
                role: res.user.role || "USER",
                nativeLanguage: res.user.nativeLanguage || "en",
                translationEnabled: res.user.translationEnabled ?? true,
            }

            setMemoryAccessToken(res.accessToken)
            setUser(loggedInUser)
            setStatus("AUTHENTICATED")

            // Connect Socket.IO session
            connectSocket(res.accessToken)

            return { success: true }
        } catch (err: any) {
            return { success: false, message: err.message || "Invalid email or password." }
        }
    }

    const register = async (data: { fullName: string; username: string; email: string; password: string; nativeLanguage?: string }) => {
        try {
            await authApi.register(data)
            return await login(data.email, data.password)
        } catch (err: any) {
            return { success: false, message: err.message || "Registration failed." }
        }
    }

    const logout = () => {
        authApi.logout()
        disconnectSocket()
        clearAuthMemory()
        setUser(null)
        setStatus("UNAUTHENTICATED")
    }

    const isAuthenticated = status === "AUTHENTICATED"

    return (
        <AuthContext.Provider value={{ status, isAuthenticated, user, login, register, logout, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}
