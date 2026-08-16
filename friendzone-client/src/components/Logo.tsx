import { Link } from "react-router-dom"
import friendzone_logo from "../assets/friendzone_logo.png"

interface LogoProps {
    className?: string
    onClick?: () => void
}

export default function Logo({ className = "", onClick }: LogoProps) {
    return (
        <Link
            to="/"
            onClick={onClick}
            className={`group flex items-center gap-2.5 transition-opacity hover:opacity-95 shrink-0 ${className}`}
        >
            <img
                src={friendzone_logo}
                alt="FriendZone Logo"
                className="h-8 sm:h-9 md:h-10 w-auto object-contain shrink-0"
            />
        </Link>
    )
}
