export interface PlanDisplayInfo {
  id: string
  name: string
  badge: string
  limitText: string
  isPopular?: boolean
  features: string[]
  color: string
  borderColor: string
  buttonClass: string
  inrPrice: string
  usdPrice: string
  period: string
}

export const CENTRALIZED_PLANS: PlanDisplayInfo[] = [
  {
    id: "FREE",
    name: "Free",
    inrPrice: "₹0",
    usdPrice: "$0",
    period: "forever",
    badge: "🆓 Standard",
    limitText: "20 translations / day",
    features: [
      "20 Translations per day",
      "Azure & MyMemory Neural AI Engine",
      "Multi-Language Shifting",
      "Real-Time Chat Messaging",
    ],
    color: "from-gray-700 to-gray-900",
    borderColor: "border-gray-700",
    buttonClass: "bg-white/10 hover:bg-white/20 text-white",
  },
  {
    id: "PLUS",
    name: "Plus",
    inrPrice: "₹199",
    usdPrice: "$2.99",
    period: "per month",
    badge: "💎 Popular",
    isPopular: true,
    limitText: "2,000 translations / month",
    features: [
      "2,000 Translations per month",
      "Azure & MyMemory Neural AI Engine",
      "Multi-Language Shifting",
      "Real-Time Chat Messaging",
      "Automatic UTC Quota Reset",
    ],
    color: "from-indigo-600 to-purple-700",
    borderColor: "border-indigo-500/50",
    buttonClass: "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:scale-105 shadow-lg shadow-indigo-500/25",
  },
  {
    id: "PRO",
    name: "Pro",
    inrPrice: "₹499",
    usdPrice: "$5.99",
    period: "per month",
    badge: "🚀 Highest Limits",
    limitText: "10,000 translations / month",
    features: [
      "10,000 Translations per month",
      "Azure & MyMemory Neural AI Engine",
      "Multi-Language Shifting",
      "Real-Time Chat Messaging",
      "Highest Monthly Translation Limit",
    ],
    color: "from-amber-500 to-rose-600",
    borderColor: "border-amber-500/50",
    buttonClass: "bg-gradient-to-r from-amber-500 to-rose-600 text-white hover:scale-105 shadow-lg shadow-amber-500/25",
  },
]

/**
 * Robustly detects whether the user is in India using:
 * 1. User profile countryCode ('IN')
 * 2. System Timezone ('Asia/Kolkata' or 'Asia/Calcutta')
 * 3. UTC Offset (IST -330 minutes)
 * 4. Browser locale ('en-IN', 'hi-IN', etc.)
 */
export function isUserInIndia(countryCode?: string | null): boolean {
  if (countryCode && countryCode.toUpperCase() === "IN") {
    return true
  }

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""
    if (tz.includes("Kolkata") || tz.includes("Calcutta") || tz === "Asia/Colombo") {
      return true
    }

    const offset = new Date().getTimezoneOffset()
    if (offset === -330) {
      return true
    }

    if (typeof navigator !== "undefined") {
      const lang = (navigator.language || "").toLowerCase()
      if (lang.includes("-in") || lang === "hi" || lang === "mr" || lang === "ta" || lang === "te" || lang === "gu") {
        return true
      }
    }
  } catch {
    // Fallback if detection fails
  }

  return false
}

/**
 * Returns formatted price string for UI presentation based on user location.
 */
export function getDisplayPrice(plan: PlanDisplayInfo, countryCode?: string | null): string {
  const inIndia = isUserInIndia(countryCode)
  return inIndia ? plan.inrPrice : plan.usdPrice
}
