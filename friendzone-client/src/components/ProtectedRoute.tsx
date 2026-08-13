import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function ProtectedRoute() {
    const { status, isAuthenticated } = useAuth()

    if (status === "AUTH_LOADING") {
        return (
            <div className="flex min-h-screen w-full items-center justify-center bg-[#07080d]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
                    <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Verifying session...</p>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/signin" replace />
    }

    return <Outlet />
}
