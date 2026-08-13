import { useEffect, useRef, useState } from "react"

/**
 * Returns a ref to attach to any element, and `inView` which flips to
 * true the first time that element crosses into the viewport.
 * Used to drive the fade-up scroll reveals across the homepage.
 */
export function useInView<T extends HTMLElement>(threshold = 0.2) {
    const ref = useRef<T | null>(null)
    const [inView, setInView] = useState(false)

    useEffect(() => {
        const node = ref.current
        if (!node) return

        // Respect users who've asked for less motion.
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setInView(true)
            return
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true)
                    observer.disconnect()
                }
            },
            { threshold }
        )

        observer.observe(node)
        return () => observer.disconnect()
    }, [threshold])

    return { ref, inView }
}