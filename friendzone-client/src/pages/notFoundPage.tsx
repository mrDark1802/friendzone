import { Link } from "react-router-dom"
import { AlertCircle, ArrowLeft } from "lucide-react"
import SEO from "../components/SEO"

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem-16rem)] w-full items-center justify-center bg-[#07080d] px-6 py-16 text-white text-left">
      <SEO title="Page Not Found" description="The page you requested could not be found." noindex={true} />
      <div className="mx-auto max-w-md space-y-6 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">404 — Page Not Found</h1>
        <p className="text-sm leading-relaxed text-gray-400">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-lg"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  )
}
