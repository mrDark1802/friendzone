import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Menu, X } from "lucide-react"
import Logo from "../components/Logo"
import { useAuth } from "../context/AuthContext"
import { UserAvatar } from "../components/common/UserAvatar"

const NAV_LINKS = [
    { label: "Home", to: "/" },
    { label: "Features", to: "/features" },
    { label: "Solutions", to: "/solutions" },
    { label: "Community", to: "/community" },
    { label: "Pricing", to: "/pricing" },
]

const Header = () => {
    const { user, isAuthenticated } = useAuth()
    const [scrolled, setScrolled] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const location = useLocation()

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8)
        onScroll()
        window.addEventListener("scroll", onScroll, { passive: true })
        return () => window.removeEventListener("scroll", onScroll)
    }, [])

    useEffect(() => {
        document.body.style.overflow = mobileOpen ? "hidden" : ""
        return () => {
            document.body.style.overflow = ""
        }
    }, [mobileOpen])

    useEffect(() => {
        setMobileOpen(false)
    }, [location.pathname])

    return (
        <header
            className={`sticky top-0 z-50 w-full border-b backdrop-blur-md transition-all duration-200 ${
                scrolled
                    ? "border-slate-200/80 bg-white/95 dark:border-slate-800 dark:bg-[#0e121d]/95 shadow-xs"
                    : "border-transparent bg-white/80 dark:bg-[#0e121d]/80"
            }`}
        >
            <div className="mx-auto grid h-16 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-6 md:grid-cols-[1fr_auto_1fr]">
                <div className="justify-self-start">
                    <Logo />
                </div>

                <nav className="hidden items-center gap-8 justify-self-center md:flex" aria-label="Main Navigation">
                    {NAV_LINKS.map((link) => {
                        const isActive = location.pathname === link.to
                        return (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`text-[13px] font-medium transition-colors ${
                                    isActive
                                        ? "text-blue-600 dark:text-blue-400 font-semibold"
                                        : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                                }`}
                            >
                                {link.label}
                            </Link>
                        )
                    })}
                </nav>

                <div className="flex items-center gap-3 justify-self-end sm:gap-4">
                    {isAuthenticated && user ? (
                        <Link
                            to="/dashboard"
                            className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                            title="Go to Dashboard"
                        >
                            <UserAvatar
                                displayName={user.name}
                                profileMediaId={(user as any)?.profileMediaId || (user as any)?.profileMedia?.id}
                                avatarUrl={(user as any)?.avatar || (user as any)?.avatarUrl}
                                size="sm"
                            />
                            <span className="hidden sm:inline text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                                {user.name}
                            </span>
                        </Link>
                    ) : (
                        <>
                            <Link
                                to="/signin"
                                className={`text-xs font-semibold transition-colors sm:inline ${
                                    location.pathname === "/signin" ? "text-blue-600 font-bold" : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                                }`}
                            >
                                Sign In
                            </Link>
                            <Link
                                to="/signup"
                                className="inline-flex rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition"
                            >
                                Join FriendZone
                            </Link>
                        </>
                    )}

                    <button
                        type="button"
                        aria-expanded={mobileOpen}
                        aria-controls="mobile-nav"
                        aria-label={mobileOpen ? "Close menu" : "Open menu"}
                        onClick={() => setMobileOpen((open) => !open)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white md:hidden"
                    >
                        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {mobileOpen && (
                <nav
                    id="mobile-nav"
                    className="border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0e121d]/95 px-6 py-6 md:hidden backdrop-blur-xl animate-fade-in"
                    aria-label="Mobile Navigation"
                >
                    <ul className="space-y-1">
                        {NAV_LINKS.map((link) => {
                            const isActive = location.pathname === link.to
                            return (
                                <li key={link.to}>
                                    <Link
                                        to={link.to}
                                        onClick={() => setMobileOpen(false)}
                                        className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                                            isActive
                                                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold"
                                                : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                        }`}
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>

                    {isAuthenticated && user ? (
                        <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-6">
                            <Link
                                to="/dashboard"
                                onClick={() => setMobileOpen(false)}
                                className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-slate-900 dark:text-white"
                            >
                                <UserAvatar
                                    displayName={user.name}
                                    profileMediaId={(user as any)?.profileMediaId || (user as any)?.profileMedia?.id}
                                    avatarUrl={(user as any)?.avatar || (user as any)?.avatarUrl}
                                    size="md"
                                />
                                <div className="flex flex-col text-left">
                                    <span className="text-sm font-bold">{user.name}</span>
                                    <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Open Dashboard →</span>
                                </div>
                            </Link>
                        </div>
                    ) : (
                        <div className="mt-6 flex flex-col gap-2.5 border-t border-slate-200 dark:border-slate-800 pt-6">
                            <Link
                                to="/signin"
                                onClick={() => setMobileOpen(false)}
                                className="rounded-lg px-3 py-2.5 text-center text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Sign In
                            </Link>
                            <Link
                                to="/signup"
                                onClick={() => setMobileOpen(false)}
                                className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-center text-xs font-semibold text-white shadow-xs"
                            >
                                Join FriendZone
                            </Link>
                        </div>
                    )}
                </nav>
            )}
        </header>
    )
}

export default Header
