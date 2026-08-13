import { Outlet } from "react-router-dom"
import Header from "./header"
import Footer from "./footer"

export default function PublicLayout() {
    return (
        <div className="flex min-h-screen flex-col bg-[#07080d] text-left text-white antialiased selection:bg-indigo-500/30 selection:text-white">
            <Header />
            <main className="flex flex-1 flex-col">
                <Outlet />
            </main>
            <Footer />
        </div>
    )
}
