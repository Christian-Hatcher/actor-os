import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  // Prevent Vercel from serving stale HTML
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, max-age=0, must-revalidate"
  )

  const { pathname } = request.nextUrl

  // Block seed page in production
  if (pathname === "/seed" && process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-.*\\.png$).*)"],
}
