import { useState, useEffect, useRef } from "react"
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import {
    Compass,
    MessageSquare,
    Users,
    UserCheck,
    Bell,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronRight,
    User,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import Logo from "../components/Logo"
import CallModal from "../components/CallModal"
import { notificationsApi, conversationsApi } from "../services/api"
import { getSocket, onFriendRequestReceived } from "../services/socket"
import { UserAvatar } from "../components/common/UserAvatar"

const NAV_ITEMS = [
    { label: "Discover", to: "/dashboard", icon: Compass },
    { label: "Messages", to: "/chats", icon: MessageSquare },
    { label: "Friends", to: "/contacts", icon: Users },
    { label: "Requests", to: "/requests", icon: UserCheck },
    { label: "Activity", to: "/notifications", icon: Bell },
]

export default function DashboardLayout() {
    const { user, logout } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
    const [userMenuOpen, setUserMenuOpen] = useState(false)
    const [globalToast, setGlobalToast] = useState<string | null>(null)
    const [unreadChatsCount, setUnreadChatsCount] = useState(0)
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
    const menuRef = useRef<HTMLDivElement>(null)

    // Request Browser Notification Permission on Login / App Load
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission()
        }
    }, [])

    // Load Badges for Chats, Notifications, and Friend Requests
    const loadSidebarBadges = async () => {
        try {
            const [convsRes, notifsRes] = await Promise.allSettled([
                conversationsApi.getConversations(),
                notificationsApi.getNotifications(),
            ])

            if (convsRes.status === "fulfilled" && Array.isArray(convsRes.value)) {
                const storedActiveId = localStorage.getItem("fz_active_conv_id")
                const activeId = location.pathname.startsWith("/chats") ? storedActiveId : null
                const totalUnreadChats = convsRes.value.reduce((acc: number, c: any) => {
                    if (c.id === activeId) return acc
                    return acc + (c.unreadCount || 0)
                }, 0)
                setUnreadChatsCount(totalUnreadChats)
                localStorage.setItem("fz_unread_chats_count", String(totalUnreadChats))
            }

            if (notifsRes.status === "fulfilled" && Array.isArray(notifsRes.value)) {
                const rawNotifs = notifsRes.value
                const unreadNotifs = rawNotifs.filter((n: any) => !n.isRead && n.type !== "FRIEND_REQUEST").length
                const pendingReqs = rawNotifs.filter((n: any) => !n.isRead && n.type === "FRIEND_REQUEST").length
                setUnreadNotificationsCount(unreadNotifs)
                setPendingRequestsCount(pendingReqs)
            }
        } catch {
            // Non-blocking catch
        }
    }

    useEffect(() => {
        loadSidebarBadges()
    }, [location.pathname])

    // Listen for custom event from chatPage when chat is opened/closed
    useEffect(() => {
        const handleUnreadChatsChanged = (e: any) => {
            const count = e.detail?.count
            if (typeof count === "number") {
                setUnreadChatsCount(count)
            }
        }
        window.addEventListener("fz:unread_chats_changed", handleUnreadChatsChanged)
        return () => {
            window.removeEventListener("fz:unread_chats_changed", handleUnreadChatsChanged)
        }
    }, [])

    // Global Real-time Socket & Native Desktop System Popup Notifications Listener
    useEffect(() => {
        onFriendRequestReceived((data: any) => {
            const senderName = data?.sender?.displayName || "Someone"
            setGlobalToast(`👋 ${senderName} sent you a friend request!`)
            setPendingRequestsCount((prev) => prev + 1)
            setTimeout(() => setGlobalToast(null), 5000)

            if ("Notification" in window && Notification.permission === "granted") {
                const notif = new Notification("New Connection Request", {
                    body: `${senderName} sent you a friend request on FriendZone.`,
                    icon: "/favicon.svg",
                })
                notif.onclick = () => {
                    window.focus()
                    navigate("/requests")
                }
            }
        })

        const socket = getSocket()
        if (socket) {
            const handleMessageSent = ({ message }: { message: any }) => {
                if (message && message.senderId !== user?.id) {
                    if (!location.pathname.startsWith("/chats")) {
                        setUnreadChatsCount((prev) => prev + 1)
                    }
                    if (location.pathname !== "/chats" && "Notification" in window && Notification.permission === "granted") {
                        const notif = new Notification(`New message from ${message.senderName || "Friend"}`, {
                            body: message.contentOriginal || "Sent you a message",
                            icon: "/favicon.svg",
                        })
                        notif.onclick = () => {
                            window.focus()
                            navigate("/chats")
                        }
                    }
                }
            }

            socket.on("message_sent", handleMessageSent)
            return () => {
                socket.off("message_sent", handleMessageSent)
            }
        }
    }, [user?.id, location.pathname, navigate])

    // Close mobile sidebar and top menu on navigation
    useEffect(() => {
        setMobileSidebarOpen(false)
        setUserMenuOpen(false)
    }, [location.pathname])

    // Close options menu on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setUserMenuOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleLogout = () => {
        logout()
        navigate("/signin")
    }

    const getBreadcrumbSegments = () => {
        const path = location.pathname
        if (path === "/dashboard/onboarding") {
            return [{ label: "Discover", to: "/dashboard" }, { label: "Welcome Setup" }]
        }
        if (path === "/chats" || path.startsWith("/chats/")) {
            return [{ label: "Messages", to: "/chats" }, { label: "Direct & Groups" }]
        }
        if (path === "/contacts") {
            return [{ label: "People & Friends", to: "/contacts" }, { label: "Directory" }]
        }
        if (path === "/requests") {
            return [{ label: "People", to: "/contacts" }, { label: "Friend Requests" }]
        }
        if (path === "/profile") {
            return [{ label: "Account", to: "/profile" }, { label: "My Profile" }]
        }
        if (path === "/notifications") {
            return [{ label: "Activity", to: "/notifications" }, { label: "Notifications" }]
        }
        if (path === "/settings") {
            return [{ label: "Preferences", to: "/settings" }, { label: "Settings" }]
        }
        return [{ label: "FriendZone", to: "/dashboard" }, { label: "Discover People" }]
    }

    const segments = getBreadcrumbSegments()

    return (
        <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-[#0b0e17] text-slate-900 dark:text-slate-100 antialiased">
            {/* ---------------- Left Vhato-Style Navigation Rail ---------------- */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-60 lg:w-64 flex-col justify-between border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] transition-transform duration-200 md:static md:translate-x-0 ${
                    mobileSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
                }`}
            >
                <div className="flex flex-col">
                    {/* Brand Header */}
                    <div className="flex h-16 items-center justify-between px-5 border-b border-slate-100 dark:border-slate-800/80">
                        <Logo />
                        <button
                            type="button"
                            onClick={() => setMobileSidebarOpen(false)}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white md:hidden"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Navigation Items */}
                    <nav className="space-y-1 px-3 py-4" aria-label="Dashboard Navigation">
                        {NAV_ITEMS.map((item) => {
                            const Icon = item.icon
                            const isActive =
                                location.pathname === item.to ||
                                (item.to !== "/dashboard" && location.pathname.startsWith(item.to))
                            const badgeCount =
                                item.to === "/chats"
                                    ? unreadChatsCount
                                    : item.to === "/requests"
                                    ? pendingRequestsCount
                                    : item.to === "/notifications"
                                    ? unreadNotificationsCount
                                    : 0

                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors duration-150 ${
                                        isActive
                                            ? "bg-blue-600 text-white shadow-xs font-semibold"
                                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon
                                            className={`h-4.5 w-4.5 shrink-0 transition-transform ${
                                                isActive ? "text-white" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                                            }`}
                                        />
                                        <span>{item.label}</span>
                                    </div>
                                    {badgeCount > 0 && (
                                        <span
                                            className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                                                isActive
                                                    ? "bg-white text-blue-700"
                                                    : "bg-blue-600 text-white"
                                            }`}
                                        >
                                            {badgeCount > 99 ? "99+" : badgeCount}
                                        </span>
                                    )}
                                </NavLink>
                            )
                        })}
                    </nav>
                </div>

                {/* Bottom Profile & Settings Area */}
                <div className="border-t border-slate-100 dark:border-slate-800/80 p-3 space-y-2">
                    <NavLink
                        to="/settings"
                        className={({ isActive }) =>
                            `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                                isActive
                                    ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-semibold"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                            }`
                        }
                    >
                        <Settings className="h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
                        Settings
                    </NavLink>

                    <div className="flex items-center justify-between rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-2.5">
                        <Link to="/profile" className="flex items-center gap-2.5 min-w-0 group">
                            <UserAvatar
                                displayName={user?.name || "User"}
                                profileMediaId={(user as any)?.profileMediaId || (user as any)?.profileMedia?.id}
                                avatarUrl={(user as any)?.avatar || (user as any)?.avatarUrl}
                                size="sm"
                                isOnline={true}
                                showStatus={true}
                            />
                            <div className="min-w-0 text-left">
                                <p className="truncate text-xs font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {user?.name || "Member"}
                                </p>
                                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                    {(user as any)?.nativeLanguage?.toUpperCase() || "EN"}
                                </p>
                            </div>
                        </Link>

                        <button
                            type="button"
                            onClick={handleLogout}
                            title="Sign out"
                            className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Backdrop */}
            {mobileSidebarOpen && (
                <div
                    onClick={() => setMobileSidebarOpen(false)}
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
                />
            )}

            {/* ---------------- Main Content Workspace ---------------- */}
            <div className="flex flex-1 flex-col overflow-hidden relative">
                {/* Global Toast Notification */}
                {globalToast && (
                    <div className="fixed top-4 right-4 sm:right-6 z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-medium text-slate-900 dark:text-white shadow-lg animate-fade-in flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-600" />
                        {globalToast}
                    </div>
                )}

                {/* Top Header */}
                <header className="flex h-16 items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] px-4 sm:px-6 shrink-0 z-30">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setMobileSidebarOpen(true)}
                            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 md:hidden"
                            title="Open navigation"
                        >
                            <Menu className="h-5 w-5" />
                        </button>

                        {/* Breadcrumbs */}
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                            {segments.map((seg, i) => (
                                <span key={i} className="flex items-center gap-1.5">
                                    {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600 shrink-0" />}
                                    {i < segments.length - 1 && seg.to ? (
                                        <Link
                                            to={seg.to}
                                            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                        >
                                            {seg.label}
                                        </Link>
                                    ) : (
                                        <span className="text-slate-900 dark:text-white font-semibold">{seg.label}</span>
                                    )}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Action Icons */}
                        <Link
                            to="/notifications"
                            className="relative rounded-xl p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                            title="Notifications"
                        >
                            <Bell className="h-4.5 w-4.5" />
                            {unreadNotificationsCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-blue-600" />
                            )}
                        </Link>

                        {/* User Menu Trigger */}
                        <div className="relative" ref={menuRef}>
                            <button
                                type="button"
                                onClick={() => setUserMenuOpen((prev) => !prev)}
                                className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-blue-500/30 transition"
                            >
                                <UserAvatar
                                    displayName={user?.name || "User"}
                                    profileMediaId={(user as any)?.profileMediaId || (user as any)?.profileMedia?.id}
                                    avatarUrl={(user as any)?.avatar || (user as any)?.avatarUrl}
                                    size="sm"
                                />
                            </button>

                            {userMenuOpen && (
                                <div className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 text-xs text-slate-700 dark:text-slate-200 shadow-xl animate-fade-in text-left">
                                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                                        <p className="font-semibold text-slate-900 dark:text-white text-xs">{user?.name || "Member"}</p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => { navigate("/profile"); setUserMenuOpen(false); }}
                                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    >
                                        <User className="h-4 w-4 text-blue-600" /> My Profile
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { navigate("/settings"); setUserMenuOpen(false); }}
                                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    >
                                        <Settings className="h-4 w-4 text-slate-500" /> Account Settings
                                    </button>

                                    <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />

                                    <button
                                        type="button"
                                        onClick={() => { handleLogout(); setUserMenuOpen(false); }}
                                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                                    >
                                        <LogOut className="h-4 w-4" /> Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Outlet */}
                <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0b0e17] pb-16 md:pb-0">
                    <Outlet />
                </main>

                {/* Mobile Bottom Navigation Bar (Thumb Friendly) */}
                <nav
                    className="fixed bottom-0 inset-x-0 z-30 flex h-14 items-center justify-around border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0e121d]/95 backdrop-blur-md md:hidden px-2"
                    aria-label="Mobile Navigation"
                >
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon
                        const isActive =
                            location.pathname === item.to ||
                            (item.to !== "/dashboard" && location.pathname.startsWith(item.to))
                        const badgeCount =
                            item.to === "/chats"
                                ? unreadChatsCount
                                : item.to === "/requests"
                                ? pendingRequestsCount
                                : item.to === "/notifications"
                                ? unreadNotificationsCount
                                : 0

                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={`relative flex flex-col items-center justify-center p-1 text-[10px] font-medium transition-colors ${
                                    isActive ? "text-blue-600 font-semibold" : "text-slate-500 dark:text-slate-400"
                                }`}
                            >
                                <Icon className="h-5 w-5" />
                                <span className="mt-0.5">{item.label}</span>
                                {badgeCount > 0 && (
                                    <span className="absolute top-0 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white">
                                        {badgeCount > 99 ? "99+" : badgeCount}
                                    </span>
                                )}
                            </NavLink>
                        )
                    })}
                </nav>
            </div>

            {/* Global WebRTC Call Modal Overlay */}
            <CallModal />
        </div>
    )
}
