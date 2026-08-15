import { useEffect } from "react"

interface SEOProps {
  title: string
  description?: string
  canonicalUrl?: string
  noindex?: boolean
  jsonLd?: Record<string, any>
}

const DEFAULT_TITLE = "FriendZone - Global Real-Time Messaging & Instant Translation"
const DEFAULT_DESCRIPTION =
  "FriendZone is a global social platform featuring real-time message translation, verified friendships, sub-100ms socket sync, and secure 1-on-1 and group chat."
const DEFAULT_BASE_URL =
  import.meta.env.VITE_SITE_URL?.replace(/\/+$/, "") || "https://sandeepworks.in"

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalUrl,
  noindex = false,
  jsonLd,
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

    // 3. Update OG Title & Description & URL
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

    // 5. Update Page-Specific Canonical Link
    let linkCanonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!linkCanonical) {
      linkCanonical = document.createElement("link")
      linkCanonical.rel = "canonical"
      document.head.appendChild(linkCanonical)
    }
    const path = canonicalUrl || window.location.pathname
    const fullCanonicalUrl = path.startsWith("http")
      ? path
      : `${DEFAULT_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`
    linkCanonical.href = fullCanonicalUrl

    const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]')
    if (ogUrl) ogUrl.content = fullCanonicalUrl

    const twitterUrl = document.querySelector<HTMLMetaElement>('meta[name="twitter:url"]')
    if (twitterUrl) twitterUrl.content = fullCanonicalUrl

    // 6. Optional Route-Specific JSON-LD Schema
    let scriptTag: HTMLScriptElement | null = null
    if (jsonLd) {
      scriptTag = document.createElement("script")
      scriptTag.type = "application/ld+json"
      scriptTag.id = "route-jsonld"
      scriptTag.text = JSON.stringify(jsonLd)
      document.head.appendChild(scriptTag)
    }

    return () => {
      if (scriptTag && document.head.contains(scriptTag)) {
        document.head.removeChild(scriptTag)
      }
    }
  }, [title, description, canonicalUrl, noindex, jsonLd])

  return null
}
