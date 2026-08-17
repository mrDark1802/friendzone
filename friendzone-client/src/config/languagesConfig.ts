export interface LanguageOption {
  code: string
  name: string
  nativeName: string
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English (US)" },
  { code: "ko", name: "Korean", nativeName: "Korean (한국어)" },
  { code: "es", name: "Spanish", nativeName: "Spanish (Español)" },
  { code: "de", name: "German", nativeName: "German (Deutsch)" },
  { code: "fr", name: "French", nativeName: "French (Français)" },
  { code: "ja", name: "Japanese", nativeName: "Japanese (日本語)" },
  { code: "zh", name: "Chinese", nativeName: "Chinese (中文)" },
  { code: "hi", name: "Hindi", nativeName: "Hindi (हिन्दी)" },
  { code: "ar", name: "Arabic", nativeName: "Arabic (العربية)" },
  { code: "pt", name: "Portuguese", nativeName: "Portuguese (Português)" },
  { code: "ru", name: "Russian", nativeName: "Russian (Русский)" },
  { code: "it", name: "Italian", nativeName: "Italian (Italiano)" },
  { code: "nl", name: "Dutch", nativeName: "Dutch (Nederlands)" },
  { code: "pl", name: "Polish", nativeName: "Polish (Polski)" },
  { code: "tr", name: "Turkish", nativeName: "Turkish (Türkçe)" },
  { code: "vi", name: "Vietnamese", nativeName: "Vietnamese (Tiếng Việt)" },
  { code: "th", name: "Thai", nativeName: "Thai (ไทย)" },
  { code: "id", name: "Indonesian", nativeName: "Indonesian (Bahasa Indonesia)" },
  { code: "ms", name: "Malay", nativeName: "Malay (Bahasa Melayu)" },
  { code: "sv", name: "Swedish", nativeName: "Swedish (Svenska)" },
  { code: "no", name: "Norwegian", nativeName: "Norwegian (Norsk)" },
  { code: "da", name: "Danish", nativeName: "Danish (Dansk)" },
  { code: "fi", name: "Finnish", nativeName: "Finnish (Suomi)" },
  { code: "el", name: "Greek", nativeName: "Greek (Ελληνικά)" },
  { code: "he", name: "Hebrew", nativeName: "Hebrew (עברית)" },
  { code: "uk", name: "Ukrainian", nativeName: "Ukrainian (Українська)" },
  { code: "cs", name: "Czech", nativeName: "Czech (Čeština)" },
  { code: "ro", name: "Romanian", nativeName: "Romanian (Română)" },
]

export const TOTAL_LANGUAGES_COUNT = SUPPORTED_LANGUAGES.length
export const LANGUAGES_CLAIM_TEXT = "25+ Neural Languages"
