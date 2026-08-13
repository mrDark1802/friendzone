import { Link } from "react-router-dom"
import { MessageCircle } from "lucide-react"

interface LogoProps {
    className?: string
    onClick?: () => void
}

export default function Logo({ className = "", onClick }: LogoProps) {
    return (
        <Link
            to="/"
            onClick={onClick}
            className={`group flex w-fit items-center gap-2.5 transition-opacity hover:opacity-95 ${className}`}
        >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-500 shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
                <MessageCircle className="h-4 w-4 text-white" strokeWidth={2.5} />
            </span>
            <span className="text-[16px] font-bold tracking-tight text-white">
                Friend<span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Zone</span>
            </span>
        </Link>
    )
}
