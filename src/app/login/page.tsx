"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Step 1: Server-side auth (bypasses CORS)
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Login failed")

      // Step 2: Set session on browser client (cookie-based)
      const client = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      await client.auth.setSession({
        access_token: json.session.access_token,
        refresh_token: json.session.refresh_token,
      })

      // Step 3: Go to dashboard
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: "0 16px" }}>
        <h1 style={{ textAlign: "center", fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Actor OS</h1>

        <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8, padding: 24 }}>
          <h2 style={{ textAlign: "center", fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>Welcome back</h2>
          <p style={{ textAlign: "center", fontSize: 14, color: "#737373", margin: "0 0 20px" }}>
            Log in to your dashboard.
          </p>

          <form onSubmit={handleSubmit}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="actor@example.com"
              autoComplete="email"
              required
              style={{ width: "100%", height: 44, padding: "0 12px", borderRadius: 6, border: "1px solid #d4d4d4", fontSize: 16, boxSizing: "border-box", marginBottom: 12 }}
            />

            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
              required
              style={{ width: "100%", height: 44, padding: "0 12px", borderRadius: 6, border: "1px solid #d4d4d4", fontSize: 16, boxSizing: "border-box", marginBottom: 16 }}
            />

            {error && (
              <p style={{ fontSize: 14, color: "#dc2626", margin: "0 0 12px" }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", height: 44, borderRadius: 6, border: "none", background: loading ? "#525252" : "#171717", color: "#fff", fontSize: 16, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
