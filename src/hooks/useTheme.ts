import { useCallback, useEffect, useSyncExternalStore } from "react"

export type Theme = "light" | "dark" | "system"

const KEY = "theme"
const media = window.matchMedia("(prefers-color-scheme: dark)")
const listeners = new Set<() => void>()

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY)
    return t === "light" || t === "dark" ? t : "system"
  } catch {
    return "system"
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  media.addEventListener("change", cb)
  return () => {
    listeners.delete(cb)
    media.removeEventListener("change", cb)
  }
}

const snapshot = () => `${readTheme()}|${media.matches ? "dark" : "light"}`

/** Minimal light/dark/system theme with a `.dark` class on <html> (see the inline script in index.html). */
export function useTheme() {
  const [theme, system] = useSyncExternalStore(subscribe, snapshot).split("|") as [Theme, "light" | "dark"]
  const resolvedTheme = theme === "system" ? system : theme

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
  }, [resolvedTheme])

  const setTheme = useCallback((t: Theme) => {
    try {
      if (t === "system") localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, t)
    } catch {
      /* storage unavailable */
    }
    listeners.forEach((l) => l())
  }, [])

  return { theme, resolvedTheme, setTheme }
}
