import { useState, useRef } from "react"
import EmojiPicker from "../../components/EmojiPicker"
import {
    Sparkles,
    Search,
    Plus,
    Smile,
    Mic,
    Send,
    Lock,
    UserPlus,
    Globe,
    Settings,
    PanelRight,
} from "lucide-react"

const GROUP_MEMBERS = [
    { name: "Elena Rodriguez", role: "DESIGN LEAD", lang: "ES", isAdmin: true, avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80" },
    { name: "Kenji Sato", role: "PRODUCT MANAGER", lang: "JP", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" },
    { name: "Jordan Smith", role: "UX DESIGNER", lang: "EN", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" },
    { name: "Sophie Chen", role: "QA ENGINEER", lang: "ZH", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" },
    { name: "Marcus Weber", role: "DEVELOPER", lang: "DE", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80" },
]

export default function GroupChatPage() {
    const [autoTranslate, setAutoTranslate] = useState(true)
    const [inputMsg, setInputMsg] = useState("")
    const [showSidebarMobile, setShowSidebarMobile] = useState(false)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const handleEmojiSelect = (emoji: string) => {
        if (inputRef.current) {
            const start = inputRef.current.selectionStart || inputMsg.length
            const end = inputRef.current.selectionEnd || inputMsg.length
            const updated = inputMsg.substring(0, start) + emoji + inputMsg.substring(end)
            setInputMsg(updated)
        } else {
            setInputMsg((prev) => prev + emoji)
        }
        setShowEmojiPicker(false)
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-[#07080d]">
            {/* ---------------- Main Group Chat Stream ---------------- */}
            <div className="flex flex-1 flex-col overflow-hidden border-r border-white/10">
                {/* Header */}
                <div className="flex h-16 items-center justify-between border-b border-white/10 px-4 sm:px-6 bg-[#050609]/60 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 font-bold text-white shadow-md">
                            #
                        </div>
                        <div className="text-left">
                            <h2 className="text-xs sm:text-sm font-bold text-white">Project Alpha Team</h2>
                            <p className="text-[10px] sm:text-[11px] font-semibold text-emerald-400">● 12 ACTIVE MEMBERS</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            type="button"
                            onClick={() => setAutoTranslate((prev) => !prev)}
                            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-xs font-semibold transition ${
                                autoTranslate
                                    ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                                    : "border-white/10 bg-white/5 text-gray-400"
                            }`}
                        >
                            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                            <span className="hidden xs:inline">Auto-Translate: {autoTranslate ? "On" : "Off"}</span>
                        </button>

                        <button type="button" className="rounded-lg p-1.5 sm:p-2 text-gray-400 hover:text-white">
                            <Search className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowSidebarMobile((prev) => !prev)}
                            className="rounded-lg p-1.5 sm:p-2 text-gray-400 hover:text-white lg:hidden"
                        >
                            <PanelRight className="h-4 w-4 text-indigo-400" />
                        </button>
                    </div>
                </div>

                {/* Stream Messages */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {/* Date Badge */}
                    <div className="flex justify-center">
                        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[11px] font-medium text-gray-400">
                            TODAY, OCTOBER 24
                        </span>
                    </div>

                    {/* Message 1 */}
                    <div className="flex gap-3 text-left">
                        <img src={GROUP_MEMBERS[0].avatar} alt="Elena" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover shrink-0" />
                        <div className="space-y-1 max-w-[85%] sm:max-w-xl">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">Elena Rodriguez</span>
                                <span className="rounded-md bg-indigo-600/30 px-1.5 py-0.5 text-[9px] font-bold text-indigo-300">ADMIN</span>
                                <span className="text-[10px] text-gray-500">10:24 AM</span>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 sm:p-4 text-xs sm:text-sm backdrop-blur-md">
                                <p className="text-gray-200">¡Hola a todos! ¿Cómo va el progreso del diseño?</p>
                                <div className="mt-2 border-t border-white/10 pt-2 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-indigo-300">
                                    TRANSLATED TO ENGLISH: <span className="normal-case italic text-gray-300 font-normal">Hello everyone! How is the design progress going?</span>
                                </div>
                            </div>
                            <span className="text-[10px] text-gray-500">✓ SEEN</span>
                        </div>
                    </div>

                    {/* Message 2 */}
                    <div className="flex gap-3 text-left">
                        <img src={GROUP_MEMBERS[1].avatar} alt="Kenji" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover shrink-0" />
                        <div className="space-y-1 max-w-[85%] sm:max-w-xl">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">Kenji Sato</span>
                                <span className="text-[10px] text-gray-500">10:26 AM</span>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 sm:p-4 text-xs sm:text-sm backdrop-blur-md">
                                <p className="text-gray-200">こんにちは。最初のモックアップは完成しました。</p>
                                <div className="mt-2 border-t border-white/10 pt-2 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-indigo-300">
                                    TRANSLATED TO ENGLISH: <span className="normal-case italic text-gray-300 font-normal">Hello. The initial mockups are completed.</span>
                                </div>
                            </div>
                            <span className="text-[10px] text-gray-500">✓ SEEN</span>
                        </div>
                    </div>

                    {/* Message 3 (Outgoing) */}
                    <div className="flex flex-col items-end text-right space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500">10:28 AM</span>
                            <span className="text-xs font-bold text-white">Jordan Smith</span>
                        </div>
                        <div className="max-w-[85%] sm:max-w-xl rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-3.5 sm:p-4 text-xs sm:text-sm font-medium text-white shadow-md">
                            Great work Kenji! I'm reviewing the accessibility layer now.
                        </div>
                        <span className="text-[10px] text-gray-500">✓ SEEN</span>
                    </div>

                    {/* AI Smart Context Banner */}
                    <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-transparent p-4 text-left space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                            <Sparkles className="h-4 w-4 text-indigo-400" />
                            AI Smart Context
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed">
                            This group is communicating in 4 different languages. I'm currently translating everything to English for you. You can adjust your target language in the settings.
                        </p>
                    </div>

                    {/* Quick Reaction Chips */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button type="button" className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-white/10">
                            👍 Progress
                        </button>
                        <button type="button" className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-white/10">
                            🚀 Rocket
                        </button>
                        <button type="button" className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-white/10">
                            📅 Schedule Review
                        </button>
                        <button type="button" className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-white/10">
                            📎 Upload Assets
                        </button>
                    </div>
                </div>

                {/* Input Controls */}
                <div className="border-t border-white/10 bg-[#050609] p-3 sm:p-4 space-y-2">
                    <div className="relative flex items-center">
                        <button type="button" className="absolute left-3 text-gray-400 hover:text-white">
                            <Plus className="h-4 w-4" />
                        </button>
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputMsg}
                            onChange={(e) => setInputMsg(e.target.value)}
                            placeholder="Message Project Alpha Team..."
                            className="w-full rounded-2xl border border-white/15 bg-white/5 py-3 pl-10 pr-24 text-xs sm:text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500"
                        />
                        <div className="absolute right-3 flex items-center gap-2">
                            <div className="relative flex items-center">
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                                    className="text-gray-400 hover:text-white"
                                    title="Choose Emoji"
                                >
                                    <Smile className="h-4 w-4" />
                                </button>
                                {showEmojiPicker && (
                                    <EmojiPicker
                                        onSelectEmoji={handleEmojiSelect}
                                        onClose={() => setShowEmojiPicker(false)}
                                    />
                                )}
                            </div>
                            <button type="button" className="text-gray-400 hover:text-white">
                                <Mic className="h-4 w-4" />
                            </button>
                            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-500">
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase tracking-wider font-semibold px-2">
                        <span>ATTACHED: 0</span>
                        <span className="flex items-center gap-1 text-emerald-400">
                            <Lock className="h-3 w-3" /> END-TO-END ENCRYPTED
                        </span>
                        <span className="hidden sm:inline">PRESS SHIFT + ENTER FOR NEW LINE</span>
                    </div>
                </div>
            </div>

            {/* ---------------- Right Sidebar: About Group (300px) ---------------- */}
            <div
                className={`w-80 flex-col overflow-y-auto bg-[#050609] p-6 lg:flex text-left space-y-6 shrink-0 transition-all ${
                    showSidebarMobile ? "flex fixed inset-y-0 right-0 z-40 shadow-2xl border-l border-white/10" : "hidden lg:flex"
                }`}
            >
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase">ABOUT GROUP</h3>
                    <button
                        type="button"
                        onClick={() => setShowSidebarMobile(false)}
                        className="text-gray-400 hover:text-white lg:hidden"
                    >
                        ✕
                    </button>
                </div>

                {/* Group Cover Box */}
                <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-indigo-950/60 to-purple-950/20 p-6 text-center space-y-3">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 font-bold text-2xl text-white shadow-lg">
                        #
                    </div>
                    <h4 className="text-base font-bold text-white">Project Alpha</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">
                        Main hub for global synchronization of the Alpha project launch.
                    </p>

                    <div className="pt-2 text-xs text-gray-400 space-y-1">
                        <div className="flex justify-between"><span>Created</span><span className="text-white font-medium">Aug 12, 2023</span></div>
                        <div className="flex justify-between"><span>Privacy</span><span className="text-emerald-400 font-medium">Public</span></div>
                        <div className="flex justify-between"><span>Region</span><span className="text-white font-medium">Global Hub</span></div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <button type="button" className="flex-1 rounded-xl border border-white/15 bg-white/5 py-2 text-xs font-semibold text-white hover:bg-white/10">
                            View Files
                        </button>
                        <button type="button" className="flex-1 rounded-xl border border-white/15 bg-white/5 py-2 text-xs font-semibold text-white hover:bg-white/10 inline-flex items-center justify-center gap-1">
                            <UserPlus className="h-3.5 w-3.5" /> Invite
                        </button>
                    </div>
                </div>

                {/* Pinned Notes */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold tracking-wider text-gray-400 uppercase">PINNED NOTES</h4>
                        <a href="#" className="text-[10px] text-indigo-400 hover:underline">View All</a>
                    </div>
                    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-xs text-indigo-300">
                        "Project delivery deadline moved to Friday 5 PM EST."
                        <div className="mt-1 text-[10px] text-gray-400">PINNED BY ELENA • 2D AGO</div>
                    </div>
                </div>

                {/* Members List */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold tracking-wider text-gray-400 uppercase">MEMBERS (12)</h4>
                        <button type="button" className="text-gray-400 hover:text-white"><Plus className="h-4 w-4" /></button>
                    </div>

                    <div className="space-y-2">
                        {GROUP_MEMBERS.map((m) => (
                            <div key={m.name} className="flex items-center justify-between py-1">
                                <div className="flex items-center gap-2.5">
                                    <img src={m.avatar} alt={m.name} className="h-8 w-8 rounded-full object-cover" />
                                    <div className="text-left">
                                        <p className="text-xs font-semibold text-white">{m.name}</p>
                                        <p className="text-[10px] text-gray-500">{m.role}</p>
                                    </div>
                                </div>
                                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono text-indigo-300">
                                    {m.lang}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Your Language Setting */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Globe className="h-5 w-5 text-indigo-400" />
                        <div className="text-left">
                            <p className="text-xs font-bold text-white">Your Language</p>
                            <p className="text-[11px] text-gray-400">ENGLISH (US)</p>
                        </div>
                    </div>
                    <Settings className="h-4 w-4 text-gray-400" />
                </div>
            </div>
        </div>
    )
}
