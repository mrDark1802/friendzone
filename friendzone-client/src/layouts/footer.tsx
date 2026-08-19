import { Link } from "react-router-dom"
import { useInView } from "./useInView"
import Logo from "../components/Logo"

const COLUMNS = [
    {
        title: "Product",
        links: [
            { label: "Features", to: "/features" },
            { label: "Solutions", to: "/solutions" },
            { label: "Community", to: "/community" },
            { label: "Pricing", to: "/pricing" },
        ],
    },
    {
        title: "Company",
        links: [
            { label: "About Us", to: "/about" },
            { label: "Security", to: "/security" },
        ],
    },
    {
        title: "Legal",
        links: [
            { label: "Privacy Policy", to: "/privacy" },
            { label: "Terms of Service", to: "/terms" },
            { label: "Cookie Policy", to: "/cookies" },
        ],
    },
]

const Footer = () => {
    const { ref, inView } = useInView<HTMLElement>(0.1)

    return (
        <footer
            ref={ref}
            className={`w-full border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e121d] transition-all duration-500 ease-out ${
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
        >
            <div className="mx-auto max-w-7xl px-6 py-12">
                <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
                    <div className="text-left">
                        <Logo />
                        <p className="mt-3 max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                            Connecting people across languages through direct messaging, group conversations, and instant message translation.
                        </p>
                    </div>

                    {COLUMNS.map((column) => (
                        <div key={column.title} className="text-left">
                            <h3 className="text-xs font-bold tracking-wider text-slate-900 dark:text-white uppercase">{column.title}</h3>
                            <ul className="mt-3 space-y-2">
                                {column.links.map((link) => (
                                    <li key={link.to}>
                                        <Link
                                            to={link.to}
                                            className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-6 text-[11px] text-slate-400 sm:flex-row sm:items-center">
                    <p>© {new Date().getFullYear()} FriendZone. All rights reserved.</p>
                    <p>Make friends. No language barriers.</p>
                </div>
            </div>
        </footer>
    )
}

export default Footer
