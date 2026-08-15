import { useEffect } from "react"

interface SEOProps {
  title: string
  description?: string
  canonicalUrl?: string
  noindex?: boolean
}

const DEFAULT_TITLE = "FriendZone - Global Real-Time Messaging & Instant Translation"
const DEFAULT_DESCRIPTION =
  "FriendZone is a global social platform featuring real-time message translation, verified friendships, sub-100ms socket sync, and secure 1-on-1 and group chat."
const BASE_URL = "https://friendzone.com"

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalUrl,
  noindex = false,
}: SEOProps) {
  useEffect(() => {
    // 1. Update Title
    document.title = title ? `${title} | FriendZone` : DEFAULT_TITLE

    // 2. Update Meta Description
    let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!metaDesc) {
      metaDesc = document.createElement("meta")
      metaDesc.name = "description"
      document.head.appendChild(metaDesc)
    }
    metaDesc.content = description

    // 3. Update OG Title & Description
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')
    if (ogTitle) ogTitle.content = title ? `${title} | FriendZone` : DEFAULT_TITLE

    const ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]')
    if (ogDesc) ogDesc.content = description

    // 4. Update Robots (index vs noindex)
    let metaRobots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (!metaRobots) {
      metaRobots = document.createElement("meta")
      metaRobots.name = "robots"
      document.head.appendChild(metaRobots)
    }
    metaRobots.content = noindex
      ? "noindex, nofollow"
      : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"

    // 5. Update Canonical Link
    let linkCanonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!linkCanonical) {
      linkCanonical = document.createElement("link")
      linkCanonical.rel = "canonical"
      document.head.appendChild(linkCanonical)
    }
    const path = canonicalUrl || window.location.pathname
    linkCanonical.href = path.startsWith("http") ? path : `${BASE_URL}${path}`
  }, [title, description, canonicalUrl, noindex])

  return null
}
