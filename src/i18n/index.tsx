import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { en } from "./en"
import { he } from "./he"

export type Lang = "en" | "he"
export type Messages = typeof en

const KEY = "lang"
const MESSAGES: Record<Lang, Messages> = { en, he }

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === "en" || saved === "he") return saved
  } catch {
    /* storage unavailable */
  }
  return navigator.languages.some((l) => /^(he|iw)\b/i.test(l)) ? "he" : "en"
}

/** BCP 47 tag for Intl formatting: Hebrew, or the user's own English variant (en-GB, en-US…). */
function intlLocale(lang: Lang): string {
  if (lang === "he") return "he-IL"
  return navigator.languages.find((l) => l.toLowerCase().startsWith("en")) ?? "en"
}

interface I18n {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Messages
  dir: "ltr" | "rtl"
  /** Locale tag for Intl.* formatters. */
  locale: string
}

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const dir = lang === "he" ? "rtl" : "ltr"

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
    document.title = MESSAGES[lang].app.documentTitle
  }, [lang, dir])

  const setLang = useCallback((l: Lang) => {
    try {
      localStorage.setItem(KEY, l)
    } catch {
      /* storage unavailable */
    }
    setLangState(l)
  }, [])

  const value = useMemo(() => ({ lang, setLang, t: MESSAGES[lang], dir, locale: intlLocale(lang) }) as const, [lang, setLang, dir])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>")
  return ctx
}

/** Memoized Intl.DateTimeFormat for the current locale. */
export function useDateFormat(options: Intl.DateTimeFormatOptions) {
  const { locale } = useI18n()
  const key = JSON.stringify(options)
  return useMemo(() => new Intl.DateTimeFormat(locale, options), [locale, key])
}
