"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"

const SPLASH_FLAG = "show_splash"

// Cold-open animation. Plays after login only — the login page sets a
// sessionStorage flag that this component consumes once and clears.
// Sequence: letterbox bars (0–0.55s) → photo (0.3–1.5s) → slate metadata (0.8s)
// → AO mark letterspacing gesture (1.3–2.4s) → subtitle (1.9s) → cross-fade out.
export function Splash() {
  const { profile } = useAuth()
  const [show, setShow] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (window.sessionStorage.getItem(SPLASH_FLAG) !== "1") return
    window.sessionStorage.removeItem(SPLASH_FLAG)
    setShow(true)

    const fade = setTimeout(() => setClosing(true), 3200)
    const done = setTimeout(() => setShow(false), 4400)
    return () => {
      clearTimeout(fade)
      clearTimeout(done)
    }
  }, [])

  if (!show) return null

  const photo = profile?.splash_photo_url || profile?.avatar_url || null
  const now = new Date()
  const dateSlate = now
    .toLocaleDateString("en-US", { day: "2-digit", month: "short" })
    .toUpperCase()
  const city = (profile?.city || "TYO").toUpperCase()

  function skip() {
    setClosing(true)
    setTimeout(() => setShow(false), 600)
  }

  return (
    <div
      className={`splash-overlay${closing ? " closing" : ""}`}
      onClick={skip}
      role="button"
      tabIndex={0}
      aria-label="Skip intro"
    >
      <div className="splash-bar top" />
      <div
        className={photo ? "splash-photo" : "splash-photo placeholder"}
        style={photo ? { backgroundImage: `url(${photo})` } : undefined}
      />
      <div className="splash-slate t">SCN 01 · TK 03 / 23.976 FPS</div>
      <div className="splash-slate b">
        1.85:1 / {city} · {dateSlate} / ACTOROS
      </div>
      <div className="splash-ao">AO</div>
      <div className="splash-sub">
        <span className="label">A C T O R · O S</span>
        <span className="tap">tap to begin</span>
      </div>
      <div className="splash-bar bottom" />
    </div>
  )
}
