"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clapperboard, Loader2, Mail, ArrowRight } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export default function SignUpPage() {
  const searchParams = useSearchParams()
  const plan = searchParams.get("plan") || "monthly"
  const { signUp } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [confirmationSent, setConfirmationSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { error } = await signUp(email, password, { full_name: name })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Supabase sends a confirmation email by default.
      // Show the confirmation screen instead of redirecting to dashboard.
      setConfirmationSent(true)
      setLoading(false)
    }
  }

  // Confirmation sent screen
  if (confirmationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Clapperboard className="h-6 w-6" />
            <span className="text-xl font-bold">Actor OS</span>
          </div>

          <Card>
            <CardContent className="pt-8 pb-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <Mail className="h-7 w-7 text-green-600" />
              </div>

              <div>
                <h2 className="text-xl font-semibold">Check your email</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  We sent a confirmation link to
                </p>
                <p className="mt-1 font-medium">{email}</p>
              </div>

              <p className="text-sm text-muted-foreground">
                Click the link in the email to activate your account, then come
                back here and log in.
              </p>

              <Button asChild className="w-full mt-4">
                <Link href="/login">
                  Go to Login
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <p className="text-xs text-muted-foreground">
                Didn't get the email? Check your spam folder or{" "}
                <button
                  type="button"
                  onClick={() => {
                    setConfirmationSent(false)
                    setLoading(false)
                  }}
                  className="text-primary hover:underline"
                >
                  try again
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Clapperboard className="h-6 w-6" />
          <span className="text-xl font-bold">Actor OS</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Create your account</CardTitle>
            <p className="text-sm text-muted-foreground">
              Start your 14-day free trial. No credit card required.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="actor@example.com"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  minLength={8}
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Start Free Trial"
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
