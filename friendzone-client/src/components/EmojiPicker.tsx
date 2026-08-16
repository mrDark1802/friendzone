import { useState, useEffect, useRef } from "react"
import { Smile, Heart, ThumbsUp, Zap, Sparkles, X } from "lucide-react"

interface EmojiPickerProps {
    onSelectEmoji: (emoji: string) => void
    onClose?: () => void
}

const EMOJI_CATEGORIES = [
    {
        id: "smileys",
        label: "Smileys",
        icon: Smile,
        emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "😮‍💨", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐", "😕", "😟", "🙁", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "💩", "🤡", "👻", "👽", "🤖"],
    },
    {
        id: "gestures",
        label: "Gestures",
        icon: ThumbsUp,
        emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪"],
    },
    {
        id: "hearts",
        label: "Hearts & Love",
        icon: Heart,
        emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "💌", "💋", "💏", "👩‍❤️‍💋‍👨", "👨‍❤️‍💋‍👨", "👩‍❤️‍💋‍👩", "💑", "👩‍❤️‍👨", "👨‍❤️‍👨", "👩‍❤️‍👩"],
    },
    {
        id: "objects",
        label: "Objects & Activities",
        icon: Zap,
        emojis: ["🔥", "✨", "🌟", "💫", "💥", "💢", "💦", "💨", "🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🥈", "🥉", "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🎯", "🎮", "🕹️", "🎰", "🎲", "🧩", "🎨", "🎭", "🎤", "🎧", "🎷", "🎸", "🎹", "🎺", "🎻", "🪕", "🥁", "🎬", "📱", "💻", "⌨️", "🖥️", "📷", "📸", "📹", "📺", "📻", "⏰", "⏱️", "⏲️", "💡", "🔦", "🕯️", "🧯", "🛢️", "💸", "💵", "💎", "⚖️", "🧹", "🧺", "🧻", "🧼", "🧽", "🔑", "🔒"],
    },
    {
        id: "symbols",
        label: "Symbols & Status",
        icon: Sparkles,
        emojis: ["✅", "❌", "❎", "➕", "➖", "➗", "❓", "❗", "‼️", "⁉️", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🟤", "🔺", "🔻", "💠", "🔘", "🔳", "🔲", "🏁", "🚩", "🎌", "🏴", "🏳️", "💯", "⚠️", "⛔", "🚫", "🚷", "📵", "🚭"],
    },
]

export default function EmojiPicker({ onSelectEmoji, onClose }: EmojiPickerProps) {
    const [activeTab, setActiveTab] = useState("smileys")
    const containerRef = useRef<HTMLDivElement>(null)

    // Handle click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                if (onClose) onClose()
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [onClose])

    const activeCategory = EMOJI_CATEGORIES.find((cat) => cat.id === activeTab) || EMOJI_CATEGORIES[0]

    return (
        <div
            ref={containerRef}
            className="absolute bottom-14 right-0 z-50 flex h-80 w-72 sm:w-80 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#11131f] shadow-2xl backdrop-blur-md"
        >
            {/* Header Tabs */}
            <div className="flex items-center justify-between border-b border-white/10 bg-[#07080e]/60 px-3 py-2">
                <div className="flex items-center gap-1 overflow-x-auto">
                    {EMOJI_CATEGORIES.map((cat) => {
                        const Icon = cat.icon
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveTab(cat.id)}
                                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                                    activeTab === cat.id
                                        ? "bg-indigo-600 text-white"
                                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                                }`}
                                title={cat.label}
                            >
                                <Icon className="h-4 w-4" />
                            </button>
                        )
                    })}
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Category Title */}
            <div className="px-3 pt-2 text-xs font-semibold text-slate-400">
                {activeCategory.label}
            </div>

            {/* Emoji Grid */}
            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-7 gap-1.5 scrollbar-thin">
                {activeCategory.emojis.map((emoji, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelectEmoji(emoji)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-indigo-600/30 transition-transform hover:scale-110 active:scale-95"
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </div>
    )
}
