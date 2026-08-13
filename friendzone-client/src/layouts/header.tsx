import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Menu, X } from "lucide-react"
import Logo from "../components/Logo"

const NAV_LINKS = [
    { label: "Features", to: "/features" },
    { label: "Solutions", to: "/solutions" },
    { label: "Community", to: "/community" },
    { label: "Pricing", to: "/pricing" },
]

const Header = () => {
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

    // Close mobile nav on route change
    useEffect(() => {
        setMobileOpen(false)
    }, [location.pathname])

    return (
        <header
            className={`sticky top-0 z-50 w-full border-b backdrop-blur-md transition-all duration-300 ${
                scrolled
                    ? "border-white/10 bg-[#07080d]/90 shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
                    : "border-transparent bg-[#07080d]/40"
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
                                className={`group relative text-[14px] font-medium transition-colors duration-200 ${
                                    isActive ? "text-white" : "text-gray-300 hover:text-white"
                                }`}
                            >
                                {link.label}
                                <span
                                    className={`absolute -bottom-1 left-0 h-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ${
                                        isActive ? "w-full" : "w-0 group-hover:w-full"
                                    }`}
                                />
                            </Link>
                        )
                    })}
                </nav>

                <div className="flex items-center gap-3 justify-self-end sm:gap-4">
                    <Link
                        to="/signin"
                        className={`hidden text-[14px] font-medium transition-colors duration-200 sm:inline ${
                            location.pathname === "/signin" ? "text-indigo-400 font-semibold" : "text-gray-300 hover:text-white"
                        }`}
                    >
                        Sign In
                    </Link>
                    <Link
                        to="/signup"
                        className="hidden rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 px-5 py-2 text-[13px] font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_28px_rgba(99,102,241,0.55)] active:scale-95 sm:inline-flex"
                    >
                        Get Started
                    </Link>
                    <button
                        type="button"
                        aria-expanded={mobileOpen}
                        aria-controls="mobile-nav"
                        aria-label={mobileOpen ? "Close menu" : "Open menu"}
                        onClick={() => setMobileOpen((open) => !open)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-gray-300 transition-colors hover:border-white/20 hover:text-white md:hidden"
                    >
                        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {mobileOpen && (
                <nav
                    id="mobile-nav"
                    className="border-t border-white/10 bg-[#07080d]/95 px-6 py-6 md:hidden backdrop-blur-xl animate-in slide-in-from-top-2"
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
                                        className={`block rounded-lg px-3 py-3 text-[15px] font-medium transition-colors ${
                                            isActive
                                                ? "bg-indigo-500/10 text-indigo-400"
                                                : "text-gray-300 hover:bg-white/5 hover:text-white"
                                        }`}
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                    <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6">
                        <Link
                            to="/signin"
                            onClick={() => setMobileOpen(false)}
                            className="rounded-lg px-3 py-3 text-center text-[15px] font-medium text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                        >
                            Sign In
                        </Link>
                        <Link
                            to="/signup"
                            onClick={() => setMobileOpen(false)}
                            className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 px-5 py-3 text-center text-[14px] font-semibold text-white shadow-lg"
                        >
                            Get Started
                        </Link>
                    </div>
                </nav>
            )}
        </header>
    )
}

export default Header
