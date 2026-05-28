// ActorOS theme system.
//
// Colors are customizable per-user. The active theme is stored on the
// `profiles` table (`theme_id` + optional `custom_theme` JSON) and mirrored to
// localStorage for instant first-paint. Every component reads CSS variables
// (`var(--bg)`, `var(--paper)`, ...) — never hardcoded hex — so swapping a
// theme is a single `:root` style write. See ThemeProvider for injection.

export interface ActorOSTheme {
  id: string
  name: string
  bg: string // Page background (warm near-black)
  bg2: string // Surface 1 — card backgrounds
  bg3: string // Surface 2 — deeper insets
  paper: string // Primary text (warm paper white)
  paperDim: string // Secondary text
  paperFaint: string // Tertiary text / labels
  rule: string // Hairline dividers
  ruleStrong: string // Stronger borders
  green: string // Banked money, booked, success
  greenGlow: string // Soft green halo
  amber: string // Callback, today, live ribbon, briefing highlight
  blue: string // Submitted / passive
  red: string // Urgent, overdue, passed, red flag
  purple: string // Personal events
}

export const THEMES: Record<string, ActorOSTheme> = {
  cinematic: {
    id: "cinematic",
    name: "Cinematic Dark",
    bg: "#0a0908",
    bg2: "#141210",
    bg3: "#1c1916",
    paper: "#f4efe6",
    paperDim: "#a8a298",
    paperFaint: "#6e6a62",
    rule: "#26231f",
    ruleStrong: "#36322c",
    green: "#3aa86b",
    greenGlow: "rgba(58,168,107,.14)",
    amber: "#e8a755",
    blue: "#6ab3e8",
    red: "#e8625a",
    purple: "#b69de0",
  },
  ivory: {
    id: "ivory",
    name: "Light Ivory",
    bg: "#eaeef2",
    bg2: "#dee3e9",
    bg3: "#d2d8e0",
    paper: "#1a2230",
    paperDim: "#4a5468",
    paperFaint: "#6b7a92",
    rule: "#b7c0cf",
    ruleStrong: "#a0aabb",
    green: "#1c7a4a",
    greenGlow: "rgba(28,122,74,.14)",
    amber: "#a37314",
    blue: "#3a7db8",
    red: "#c8453e",
    purple: "#8b6bc0",
  },
}

export const DEFAULT_THEME_ID = "cinematic"

/** localStorage key for instant first-paint before the profile loads. */
export const THEME_STORAGE_KEY = "theme"

/**
 * Map an ActorOSTheme to the CSS custom properties consumed across the app.
 * Includes both the new ActorOS tokens and remapped shadcn/ui semantic tokens
 * so existing components inherit the active theme without per-component edits.
 */
export function themeToCssVars(theme: ActorOSTheme): Record<string, string> {
  return {
    // --- ActorOS tokens ---
    "--bg": theme.bg,
    "--bg2": theme.bg2,
    "--bg3": theme.bg3,
    "--paper": theme.paper,
    "--paper-dim": theme.paperDim,
    "--paper-faint": theme.paperFaint,
    "--rule": theme.rule,
    "--rule-strong": theme.ruleStrong,
    "--green": theme.green,
    "--green-glow": theme.greenGlow,
    "--amber": theme.amber,
    "--blue": theme.blue,
    "--red": theme.red,
    "--purple": theme.purple,

    // --- shadcn/ui semantic tokens, remapped onto the active palette ---
    "--background": theme.bg,
    "--foreground": theme.paper,
    "--card": theme.bg2,
    "--card-foreground": theme.paper,
    "--popover": theme.bg2,
    "--popover-foreground": theme.paper,
    "--primary": theme.paper,
    "--primary-foreground": theme.bg,
    "--secondary": theme.bg3,
    "--secondary-foreground": theme.paper,
    "--muted": theme.bg3,
    "--muted-foreground": theme.paperDim,
    "--accent": theme.bg3,
    "--accent-foreground": theme.paper,
    "--destructive": theme.red,
    "--destructive-foreground": theme.paper,
    "--border": theme.rule,
    "--input": theme.ruleStrong,
    "--ring": theme.amber,
  }
}

/** Resolve a theme by id, falling back to the default. */
export function resolveTheme(
  id: string | null | undefined,
  custom?: ActorOSTheme | null,
): ActorOSTheme {
  if (id === "custom" && custom) return custom
  return THEMES[id ?? DEFAULT_THEME_ID] ?? THEMES[DEFAULT_THEME_ID]
}

/** Serialize CSS vars into a `style`-attribute string for SSR / inline use. */
export function cssVarsToStyleString(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";")
}

/**
 * Inline script for the document <head>. Reads the persisted theme and writes
 * its CSS variables to :root before first paint — preventing a flash of the
 * default theme on reload. Stringified and injected via dangerouslySetInnerHTML.
 *
 * Lives here (not in the client ThemeProvider module) so the server-rendered
 * root layout can import it directly.
 */
export function themeNoFlashScript(): string {
  const themesJson = JSON.stringify(THEMES)
  return `(function(){try{var t=localStorage.getItem(${JSON.stringify(
    THEME_STORAGE_KEY,
  )});var themes=${themesJson};var theme=themes[t]||themes[${JSON.stringify(
    DEFAULT_THEME_ID,
  )}];var m={bg:'--bg',bg2:'--bg2',bg3:'--bg3',paper:'--paper',paperDim:'--paper-dim',paperFaint:'--paper-faint',rule:'--rule',ruleStrong:'--rule-strong',green:'--green',greenGlow:'--green-glow',amber:'--amber',blue:'--blue',red:'--red',purple:'--purple'};var sem={bg:['--background'],paper:['--foreground'],bg2:['--card','--popover'],bg3:['--secondary','--muted','--accent'],paperDim:['--muted-foreground'],rule:['--border'],ruleStrong:['--input'],amber:['--ring']};var r=document.documentElement;Object.keys(m).forEach(function(k){r.style.setProperty(m[k],theme[k]);});Object.keys(sem).forEach(function(k){sem[k].forEach(function(v){r.style.setProperty(v,theme[k]);});});}catch(e){}})();`
}
