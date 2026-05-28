"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useAuth } from "@/hooks/use-auth"

const STORAGE_KEY = "last_splash_date"

/**
 * Return a substring of `text` representing typed progress at time `t`.
 * `start` is the delay before typing begins, `dur` is the typing duration.
 */
function typedSlice(text: string, elapsed: number, start: number, dur: number): string {
  if (elapsed < start) return ""
  const progress = Math.min((elapsed - start) / dur, 1)
  // ease-in-out cubic for natural typing rhythm
  const eased =
    progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2
  return text.slice(0, Math.floor(text.length * eased))
}

// Cold-open animation. Plays on the first cold-open of the day only; subsequent
// opens skip straight to the dashboard. Tap anywhere to skip mid-sequence.
//
// Sequence timeline (from design spec 02_Splash_Motion):
//   0.00s  Letterbox bars draw in vertically (0.55s)
//   0.30s  Photo fades in with slight scale-down 1.06 -> 1.0 (1.2s)
//   0.80s  Vignette fades in over photo
//   0.85s  Slate metadata types char-by-char in mono (top + bottom bars)
//   1.30s  AO mark letterspaces wide -> tight, the signature brand gesture (1.1s)
//   1.90s  "ACTOR . OS" subtitle + "tap to begin" fade in (0.7s)
//   2.60s  Hold — the "look at me" pause
//   3.20s  Cross-fade out revealing dashboard (1.2s)
//   4.40s  Unmount
export function Splash() {
  const { profile } = useAuth()
  const [show, setShow] = useState(false)
  const [closing, setClosing] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef<number>(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    if (window.localStorage.getItem(STORAGE_KEY) === today) return
    window.localStorage.setItem(STORAGE_KEY, today)
    setShow(true)

    // Start the animation clock
    startRef.current = performance.now()
    const tick = () => {
      const t = (performance.now() - startRef.current) / 1000
      setElapsed(t)
      if (t < 4.5) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    // Begin cross-fade at 3.2s; unmount after the 1.2s fade completes.
    const fade = setTimeout(() => setClosing(true), 3200)
    const done = setTimeout(() => setShow(false), 4400)
    return () => {
      clearTimeout(fade)
      clearTimeout(done)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const skip = useCallback(() => {
    setClosing(true)
    cancelAnimationFrame(rafRef.current)
    setTimeout(() => setShow(false), 600)
  }, [])

  if (!show) return null

  const photo = profile?.splash_photo_url || profile?.avatar_url || null
  const now = new Date()
  const dateSlate = now
    .toLocaleDateString("en-US", { day: "2-digit", month: "short" })
    .toUpperCase()
  const city = (profile?.city || "TYO").toUpperCase()

  // Slate text strings — typed char-by-char like a real digital slate
  const slateTopLeft = "SCN 01 · TK 03"
  const slateTopRight = "23.976 FPS"
  const slateBotLeft = "1.85 : 1"
  const slateBotCenter = `${city} · ${dateSlate}`
  const slateBotRight = "ACTOROS"

  return (
    <div
      className={`splash-overlay${closing ? " closing" : ""}`}
      onClick={skip}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") skip()
      }}
      role="button"
      tabIndex={0}
      aria-label="Skip intro"
    >
      {/* Top letterbox bar */}
      <div className="splash-bar top" />

      {/* Full-bleed photo or placeholder */}
      <div
        className={photo ? "splash-photo" : "splash-photo placeholder"}
        style={photo ? { backgroundImage: `url(${photo})` } : undefined}
      />

      {/* Cinematic vignette over photo — darkens top and bottom for legibility */}
      <div className="splash-vignette" />

      {/* Slate metadata — top bar: typed char-by-char */}
      <div className="splash-slate t splash-slate-row">
        <span>{typedSlice(slateTopLeft, elapsed, 0.85, 0.7)}</span>
        <span>{typedSlice(slateTopRight, elapsed, 1.1, 0.6)}</span>
      </div>

      {/* Slate metadata — bottom bar: 3-column typed */}
      <div className="splash-slate b splash-slate-row">
        <span>{typedSlice(slateBotLeft, elapsed, 0.95, 0.5)}</span>
        <span>{typedSlice(slateBotCenter, elapsed, 1.1, 0.6)}</span>
        <span>{typedSlice(slateBotRight, elapsed, 1.25, 0.5)}</span>
      </div>

      {/* AO mark — the signature wide-to-tight letterspacing gesture */}
      <div className="splash-ao">AO</div>

      {/* Subtitle row */}
      <div className="splash-sub">
        <span className="label">A C T O R &middot; O S</span>
        <span className="tap">tap to begin</span>
      </div>

      {/* Bottom letterbox bar */}
      <div className="splash-bar bottom" />
    </div>
  )
}
