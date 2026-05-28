"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      const returnUrl = encodeURIComponent(pathname)
      router.push(`/login?returnTo=${returnUrl}`)
    }
  }, [user, loading, router, pathname])

  // Redirect to onboarding if the user has not completed setup.
  // We use `city` as a proxy — it is null until the user finishes step 2.
  useEffect(() => {
    if (!loading && user && profile && !profile.city) {
      router.push("/onboarding")
    }
  }, [user, profile, loading, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
