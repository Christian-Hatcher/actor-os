"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  THEMES,
  type ActorOSTheme,
  resolveTheme,
  themeToCssVars,
} from "@/lib/themes"

interface ThemeContextValue {
  themeId: string
  theme: ActorOSTheme
  setThemeId: (id: string) => void
  availableThemes: ActorOSTheme[]
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/** Apply a theme's CSS variables to the document root. */
function applyTheme(theme: ActorOSTheme) {
  const root = document.documentElement
  const vars = themeToCssVars(theme)
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Default for SSR / first render. The no-flash script in <head> has already
  // applied the persisted theme to :root before React hydrates; we reconcile
  // state here on mount.
  const [themeId, setThemeIdState] = useState<string>(DEFAULT_THEME_ID)

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored && THEMES[stored]) {
      setThemeIdState(stored)
    }
  }, [])

  const setThemeId = useCallback((id: string) => {
    const theme = resolveTheme(id)
    applyTheme(theme)
    window.localStorage.setItem(THEME_STORAGE_KEY, theme.id)
    setThemeIdState(theme.id)
  }, [])

  const theme = useMemo(() => resolveTheme(themeId), [themeId])

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId,
      theme,
      setThemeId,
      availableThemes: Object.values(THEMES),
    }),
    [themeId, theme, setThemeId],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return ctx
}
