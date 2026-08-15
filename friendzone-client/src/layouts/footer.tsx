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
            className={`w-full border-t border-white/10 bg-[#07080d] transition-all duration-700 ease-out ${
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
        >
            <div className="mx-auto max-w-7xl px-6 py-16">
                <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
                    <div className="text-left">
                        <Logo />
                        <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-gray-400">
                            Eliminating language barriers for global teams and cross-cultural
                            communities through AI-powered real-time translation.
                        </p>
                    </div>

                    {COLUMNS.map((column) => (
                        <div key={column.title} className="text-left">
                            <h3 className="text-[13px] font-semibold tracking-wider text-white uppercase">{column.title}</h3>
                            <ul className="mt-4 space-y-3">
                                {column.links.map((link) => (
                                    <li key={link.to}>
                                        <Link
                                            to={link.to}
                                            className="group relative inline-block text-[13px] text-gray-400 transition-colors duration-200 hover:text-white"
                                        >
                                            {link.label}
                                            <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-indigo-400 transition-all duration-300 group-hover:w-full" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-[12px] text-gray-500 sm:flex-row sm:items-center">
                    <p>© {new Date().getFullYear()} FriendZone AI Inc. All rights reserved.</p>
                    <p>Built for teams that speak every language.</p>
                </div>
            </div>
        </footer>
    )
}

export default Footer
