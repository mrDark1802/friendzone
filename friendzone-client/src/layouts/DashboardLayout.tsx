import { useState, useEffect, useRef } from "react"
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import {
    LayoutGrid,
    MessageSquare,
    Users,
    UserCheck,
    Bell,
    Settings,
    LogOut,
    Search,
    HelpCircle,
    MoreHorizontal,
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
    { label: "Dashboard", to: "/dashboard", icon: LayoutGrid },
    { label: "Chats", to: "/chats", icon: MessageSquare },
    { label: "Contacts", to: "/contacts", icon: Users },
    { label: "Friend Requests", to: "/requests", icon: UserCheck },
    { label: "Notifications", to: "/notifications", icon: Bell },
]

export default function DashboardLayout() {
    const { user, logout } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
    const [moreMenuOpen, setMoreMenuOpen] = useState(false)
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
            setGlobalToast(`🔔 ${senderName} sent you a friend request!`)
            setPendingRequestsCount((prev) => prev + 1)
            setTimeout(() => setGlobalToast(null), 5000)

            // Native Desktop System Notification
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
                        const notif = new Notification(`New Message from ${message.senderName || "Friend"}`, {
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
        setMoreMenuOpen(false)
    }, [location.pathname])

    // Close options menu on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMoreMenuOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleLogout = () => {
        logout()
        navigate("/signin")
    }

    // Dynamic Actionable Breadcrumbs
    const getBreadcrumbSegments = () => {
        const path = location.pathname
        if (path === "/dashboard/onboarding") {
            return [
                { label: "Home", to: "/dashboard" },
                { label: "Onboarding", to: "/dashboard/onboarding" },
                { label: "Account Setup" },
            ]
        }
        if (path === "/chats" || path.startsWith("/chats/")) {
            return [
                { label: "Home", to: "/dashboard" },
                { label: "Chats", to: "/chats" },
                { label: "Direct Messages" },
            ]
        }
        if (path === "/contacts") {
            return [
                { label: "Community", to: "/contacts" },
                { label: "Contacts", to: "/contacts" },
                { label: "My Friends" },
            ]
        }
        if (path === "/requests") {
            return [
                { label: "Community", to: "/contacts" },
                { label: "Friend Requests", to: "/requests" },
                { label: "Incoming Requests" },
            ]
        }
        if (path === "/groups" || path.startsWith("/groups/")) {
            return [
                { label: "Home", to: "/dashboard" },
                { label: "Groups", to: "/groups" },
                { label: "Group Conversations" },
            ]
        }
        if (path === "/profile") {
            return [
                { label: "Home", to: "/dashboard" },
                { label: "Account", to: "/profile" },
                { label: "My Profile" },
            ]
        }
        if (path === "/notifications") {
            return [
                { label: "Home", to: "/dashboard" },
                { label: "Activity", to: "/notifications" },
                { label: "Notifications" },
            ]
        }
        if (path === "/settings") {
            return [
                { label: "Home", to: "/dashboard" },
                { label: "App", to: "/settings" },
                { label: "Settings" },
            ]
        }
        return [
            { label: "FriendZone", to: "/dashboard" },
            { label: "Dashboard", to: "/dashboard" },
            { label: "Overview" },
        ]
    }

    const segments = getBreadcrumbSegments()

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#07080d] text-white antialiased selection:bg-indigo-500/30 selection:text-white">
            {/* ---------------- Left Desktop & Mobile Sidebar ---------------- */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between border-r border-white/10 bg-[#050609] transition-transform duration-300 md:static md:translate-x-0 ${
                    mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div>
                    {/* Top Logo Header */}
                    <div className="flex h-16 items-center justify-between px-6 border-b border-white/5">
                        <Logo />
                        <button
                            type="button"
                            onClick={() => setMobileSidebarOpen(false)}
                            className="rounded-lg p-1 text-gray-400 hover:text-white md:hidden"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Main Nav Items */}
                    <nav className="space-y-1.5 px-4 py-6" aria-label="Dashboard Navigation">
                        {NAV_ITEMS.map((item) => {
                            const Icon = item.icon
                            const isActive = location.pathname === item.to || (item.to !== "/dashboard" && location.pathname.startsWith(item.to))
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
                                    className={`group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                                        isActive
                                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className={`h-4.5 w-4.5 transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                                        {item.label}
                                    </div>
                                    {badgeCount > 0 && (
                                        <span
                                            className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold transition-transform duration-200 ${
                                                isActive
                                                    ? "bg-white text-indigo-700 shadow-sm"
                                                    : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_10px_rgba(79,70,229,0.5)]"
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

                {/* Bottom Settings & User Profile Card */}
                <div className="border-t border-white/10 p-4 space-y-3">
                    <NavLink
                        to="/settings"
                        className={({ isActive }) =>
                            `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                                isActive
                                    ? "bg-white/10 text-white font-semibold"
                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                            }`
                        }
                    >
                        <Settings className="h-4.5 w-4.5" />
                        Settings
                    </NavLink>

                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-md transition-all hover:border-white/20">
                        <Link to="/profile" className="flex items-center gap-3 overflow-hidden group">
                            <UserAvatar
                                displayName={user?.name || "User"}
                                profileMediaId={(user as any)?.profileMediaId || (user as any)?.profileMedia?.id}
                                avatarUrl={(user as any)?.avatar || (user as any)?.avatarUrl}
                                size="sm"
                                className="border border-indigo-500/30 group-hover:scale-105 transition-transform"
                            />
                            <div className="truncate text-left">
                                <p className="truncate text-xs font-semibold text-white group-hover:text-indigo-400 transition-colors">
                                    {user?.name || "Alex Rivera"}
                                </p>
                                <p className="truncate text-[11px] text-gray-500">
                                    {user?.email || "alex.r@example.com"}
                                </p>
                            </div>
                        </Link>

                        <button
                            type="button"
                            onClick={handleLogout}
                            title="Sign Out"
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Backdrop Overlay */}
            {mobileSidebarOpen && (
                <div
                    onClick={() => setMobileSidebarOpen(false)}
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                />
            )}

            {/* ---------------- Main Content Area & Header ---------------- */}
            <div className="flex flex-1 flex-col overflow-hidden relative">
                {/* Global Live Socket Notification Toast */}
                {globalToast && (
                    <div className="fixed top-4 right-6 z-50 rounded-2xl border border-indigo-500/40 bg-[#07080d]/95 px-5 py-3 text-xs font-semibold text-white backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
                        {globalToast}
                    </div>
                )}

                {/* Top Header Bar */}
                <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#050609]/80 px-6 backdrop-blur-md z-30">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setMobileSidebarOpen(true)}
                            className="rounded-lg p-1 text-gray-400 hover:text-white md:hidden"
                        >
                            <Menu className="h-5 w-5" />
                        </button>

                        {/* Actionable Breadcrumbs */}
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-400 tracking-wide truncate">
                            {segments.map((seg, i) => (
                                <span key={i} className="flex items-center gap-1.5">
                                    {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-600 shrink-0" />}
                                    {i < segments.length - 1 && seg.to ? (
                                        <Link
                                            to={seg.to}
                                            className="hover:text-indigo-400 transition-colors underline-offset-4 hover:underline"
                                        >
                                            {seg.label}
                                        </Link>
                                    ) : (
                                        <span className="text-white font-semibold">{seg.label}</span>
                                    )}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Search Bar */}
                        <div className="relative hidden sm:block w-64 lg:w-80">
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search messages, people..."
                                className="w-full rounded-full border border-white/15 bg-white/5 py-1.5 pl-9 pr-4 text-xs text-white placeholder-gray-500 outline-none transition focus:border-indigo-500 focus:bg-white/10"
                            />
                        </div>

                        {/* Top Action Icons */}
                        <div className="relative flex items-center gap-2 text-gray-400" ref={menuRef}>
                            <Link
                                to="/notifications"
                                className="relative rounded-lg p-2 hover:bg-white/5 hover:text-white transition-colors"
                                title="Notifications"
                            >
                                <Bell className="h-4.5 w-4.5" />
                                {unreadNotificationsCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500 ring-2 ring-[#050609]" />
                                    </span>
                                )}
                            </Link>

                            <Link
                                to="/dashboard/onboarding"
                                className="rounded-lg p-2 hover:bg-white/5 hover:text-white transition-colors"
                                title="Help & Onboarding"
                            >
                                <HelpCircle className="h-4.5 w-4.5" />
                            </Link>

                            <Link
                                to="/settings"
                                className="rounded-lg p-2 hover:bg-white/5 hover:text-white transition-colors"
                                title="Settings"
                            >
                                <Settings className="h-4.5 w-4.5" />
                            </Link>

                            {/* Actionable Three-Dots Button */}
                            <button
                                type="button"
                                onClick={() => setMoreMenuOpen((prev) => !prev)}
                                className={`rounded-lg p-2 transition-colors ${
                                    moreMenuOpen ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"
                                }`}
                                title="More Options"
                            >
                                <MoreHorizontal className="h-4.5 w-4.5" />
                            </button>

                            {/* Dropdown Options Popup */}
                            {moreMenuOpen && (
                                <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-white/15 bg-[#0a0c14]/95 p-2 text-xs text-white backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left">
                                    <div className="px-3 py-2 border-b border-white/10 mb-1">
                                        <p className="font-bold text-white text-xs">{user?.name || "Alex Rivera"}</p>
                                        <p className="text-[10px] text-indigo-400 font-medium">FriendZone Pro Member</p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => { navigate("/profile"); setMoreMenuOpen(false); }}
                                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 font-medium hover:bg-white/10 transition"
                                    >
                                        <User className="h-4 w-4 text-indigo-400" /> My Profile
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { navigate("/notifications"); setMoreMenuOpen(false); }}
                                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 font-medium hover:bg-white/10 transition"
                                    >
                                        <Bell className="h-4 w-4 text-purple-400" /> Notifications Feed
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { navigate("/settings"); setMoreMenuOpen(false); }}
                                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 font-medium hover:bg-white/10 transition"
                                    >
                                        <Settings className="h-4 w-4 text-emerald-400" /> Account Settings
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { navigate("/dashboard/onboarding"); setMoreMenuOpen(false); }}
                                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 font-medium hover:bg-white/10 transition"
                                    >
                                        <HelpCircle className="h-4 w-4 text-blue-400" /> Help & Onboarding
                                    </button>

                                    <div className="my-1 h-px bg-white/10" />

                                    <button
                                        type="button"
                                        onClick={() => { handleLogout(); setMoreMenuOpen(false); }}
                                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 font-medium text-rose-400 hover:bg-rose-500/20 transition"
                                    >
                                        <LogOut className="h-4 w-4" /> Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Outlet */}
                <main className="flex-1 overflow-y-auto bg-[#07080d] transition-all duration-300">
                    <Outlet />
                </main>
            </div>

            {/* Global WebRTC Call Modal Overlay */}
            <CallModal />
        </div>
    )
}
