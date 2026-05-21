# Actor OS — Comprehensive Code Audit Report
**Date:** 2026-05-21  
**Scope:** Full Next.js 16 + TypeScript + Tailwind v4 source (`src/` + config)  
**Build Status:** ❌ Fails (`npx next build` exits with TypeScript errors)

---

## Critical Issues (Build Blockers / Security)

### 1. STRIPE IMPORT BROKEN — `src/app/api/checkout/route.ts`
- **Severity:** CRITICAL  
- **Problem:** `import stripe from "stripe"` then `const Stripe = stripe as unknown as typeof stripe.default` is invalid. Next.js 16 build reports `Property 'default' does not exist on type 'typeof Stripe'`.  
- **Impact:** Build fails. Stripe checkout is non-functional.  
- **Fix:**
  ```ts
  import Stripe from "stripe"
  const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-03-31.basil",
  })
  ```
  Remove the `const Stripe = stripe as unknown...` cast entirely.

### 2. CHECKOUT ROUTE MISSING HTTP HANDLER — `src/app/api/checkout/route.ts`
- **Severity:** CRITICAL  
- **Problem:** File exports named async functions (`createCheckoutSession`, `createPortalSession`) but no `GET`/`POST`/`PUT`/`DELETE` route handler. Next.js App Router expects default or named HTTP verb exports.  
- **Impact:** `/api/checkout` route never exists; Stripe calls cannot be invoked from the frontend.  
- **Fix:** Add a `POST` handler:
  ```ts
  export async function POST(request: NextRequest) {
    const { plan, customerEmail } = await request.json()
    const { url } = await createCheckoutSession(plan, customerEmail)
    return NextResponse.json({ url })
  }
  ```
  Also import `NextRequest` and `NextResponse`.

### 3. STRIPE WEBHOOK USES `require()` — `src/app/api/webhook/route.ts`
- **Severity:** HIGH  
- **Problem:** `const stripe = require("stripe")(...)` inside an ESM App Router file. Can break at runtime under strict ESM / Turbopack and leaks type safety.  
- **Impact:** Potential runtime crash on webhook events; inconsistent module system.  
- **Fix:**
  ```ts
  import Stripe from "stripe"
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-03-31.basil" })
  ```

### 4. MISSING `OutreachLog` TYPE — `src/app/dashboard/outreach/page.tsx`
- **Severity:** CRITICAL (Build Failure)  
- **Problem:** `import type { Contact, OutreachLog } from "@/types"` references `OutreachLog` which does not exist in `src/types/index.ts`.  
- **Impact:** TypeScript compilation error; build fails.  
- **Fix:** Add the missing type to `src/types/index.ts` (or remove the import if unused):
  ```ts
  export interface OutreachLog {
    id: string
    user_id: string
    contact_id: string
    method: "email" | "call" | "meeting" | "other"
    notes: string | null
    created_at: string
  }
  ```

### 5. AUTH HOOK USES `any` TYPES — `src/hooks/use-auth.tsx`
- **Severity:** HIGH  
- **Problem:** `profile: any | null`, `metadata?: any`, and `error: any` remove all type safety. The context returns plain objects with `any`.  
- **Impact:** Hidden runtime errors; downstream components have no type inference.  
- **Fix:** Replace `any` with strict types:
  ```ts
  import type { Profile } from "@/types"
  interface AuthContextType {
    user: User | null
    profile: Profile | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
    signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ error: AuthError | null }>
    signOut: () => Promise<void>
  }
  ```

---

## High Severity Issues

### 6. LOGIN / SIGNUP BYPASS AUTH — `src/app/login/page.tsx` & `src/app/signup/page.tsx`
- **Severity:** HIGH  
- **Problem:** Both pages contain commented-out Supabase auth and instead use `setTimeout(() => router.push("/dashboard"), 1000)` — any visitor can "log in" by clicking the button.  
- **Impact:** Zero security on authentication; anyone can access the dashboard.  
- **Fix:** Wire up `useAuth` hook:
  ```tsx
  const { signIn } = useAuth()
  const { error } = await signIn(email, password)
  if (error) setError(error.message)
  else router.push("/dashboard")
  ```

### 7. API ROUTES EXPOSE SERVICE ROLE KEY ON CLIENT SIDE — `src/app/api/auditions/route.ts`
- **Severity:** HIGH  
- **Problem:** Uses `SUPABASE_SERVICE_ROLE_KEY` in an API route. While server-side usage is correct, the route has **zero user authentication / authorization checks** before running `insert` / `update` / `delete`.  
- **Impact:** Anyone with a valid `POST` request can create, update, or delete any audition row (and potentially any table row because `service_role` bypasses RLS).  
- **Fix:** Verify the Supabase user JWT before every operation:
  ```ts
  import { createClient } from "@supabase/supabase-js"
  // Or better: use @supabase/ssr for cookie-based auth
  ```
  Read `Authorization` header, validate with `supabase.auth.getUser(token)`, and ensure `user_id` matches the authenticated user.

### 8. DASHBOARD LAYOUT IS CLIENT COMPONENT — `src/app/dashboard/layout.tsx`
- **Severity:** MEDIUM-HIGH  
- **Problem:** Uses `"use client"` and wraps everything in `<AuthGuard>` which does a client-side redirect. This prevents any server components inside the dashboard tree, negating Next.js 16 SSR benefits and causing layout-shift / FOUC.  
- **Impact:** All dashboard pages are forced client-side; slow initial paint.  
- **Fix:** Convert layout to a Server Component. Move auth check into middleware (`src/middleware.ts`) or a server auth guard, and only mark individual interactive components as `"use client"`.

### 9. API ROUTE EXPORTS WRONG DIRECTIVE — `"use server"` in API files
- **Severity:** MEDIUM  
- **Problem:** `src/app/api/auditions/route.ts`, `checkout/route.ts`, `contracts/analyze/route.ts`, and `webhook/route.ts` all have `"use server"` at the top. This directive is for Server Actions (invoked from components), not App Router API route handlers.  
- **Impact:** Confuses the bundler; can cause unexpected behavior in Next.js 16.  
- **Fix:** Remove `"use server"` from all `route.ts` files. Keep it only in actual Server Action files.

---

## Medium Severity Issues

### 10. MISSING `zod` IMPORT BREAKS VALIDATION — `src/lib/validation.ts`
- **Severity:** MEDIUM  
- **Problem:** `import { z } from "zod"` imports from `zod` v4. The installed version is `4.4.3`. The `zod` v4 API may differ slightly from v3, but more importantly, there is **no runtime validation used anywhere** — all forms bypass `zod` schemas entirely (login/signup/checkout just use manual state).  
- **Impact:** Validation schemas are dead code; forms have no client-side validation except HTML5 `required`.  
- **Fix:** Integrate schemas into forms (e.g. using `zodResolver` with a form library, or manual `schema.parse()` on submit). At minimum, use the schemas on API routes.

### 11. `useSearchParams` WITHOUT SUSPENSE — `src/app/signup/page.tsx` & `src/app/checkout/page.tsx`
- **Severity:** MEDIUM  
- **Problem:** Both pages call `useSearchParams()` at the top level of a Client Component without wrapping in a `<Suspense>` boundary. Next.js 16 can SSR these, and `useSearchParams` will throw a `dynamic rendering` warning / error during static generation.  
- **Impact:** Potential build warnings or hydration mismatches.  
- **Fix:** Wrap the component body in a `<Suspense>` boundary inside the page, or read search params from a nested client component.

### 12. HARDCODED MOCK DATA EVERYWHERE
- **Severity:** MEDIUM  
- **Problem:** Dashboard stats, recent auditions, self-tapes, contracts, outreach contacts, and universities all contain hard-coded mock arrays (`MOCK_AUDITIONS`, `MOCK_CONTACTS`, etc.).  
- **Impact:** App is non-functional for real users; data never persists or updates.  
- **Fix:** Replace mock data with Supabase queries using `useData` hooks or fetch in Server Components. Ensure RLS policies exist on tables.

### 13. `useAuditions` HOOK DOES NOT FILTER BY USER — `src/hooks/use-data.tsx`
- **Severity:** MEDIUM  
- **Problem:** `fetchAuditions()` does `.from("auditions").select("*")` without `.eq("user_id", userId)`. It returns every user's auditions globally.  
- **Impact:** Data leak between users.  
- **Fix:** Always filter by authenticated `user_id`:
  ```ts
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data } = await supabase.from("auditions").select("*").eq("user_id", user.id)
  ```

### 14. `lucide-react` VERSION MISMATCH
- **Severity:** MEDIUM  
- **Problem:** `package.json` pins `lucide-react` at `^1.16.0`, but the latest stable major line is `0.x` or `0.500+`. `1.16.0` is a very old, potentially incompatible version that may have broken tree-shaking or missing icons in modern bundlers.  
- **Impact:** Bundle bloat, missing icons, or build warnings.  
- **Fix:** Upgrade to latest stable (e.g. `^0.508.0` or whichever is current at time of fix) and verify imports.

### 15. `openai` v6 IMPORT BROKEN — `src/app/api/contracts/analyze/route.ts`
- **Severity:** MEDIUM  
- **Problem:** Uses `new OpenAI({ apiKey: ... })` assuming a class export. `openai` v6 is a CLI tool / low-level library; the `OpenAI` class may not be the default export in this version.  
- **Impact:** Potential runtime crash when contract analysis is invoked.  
- **Fix:** Verify the import:
  ```ts
  import OpenAI from "openai"
  // or
  import { OpenAI } from "openai"
  ```
  If v6 does not expose a client class, downgrade to `openai@^4.x` which is the standard SDK.

### 16. `error: any` CATCH BLOCKS — `src/app/api/contracts/analyze/route.ts`
- **Severity:** MEDIUM  
- **Problem:** `catch (error: any)` disables TypeScript strict checks.  
- **Fix:** Use `unknown` and narrow:
  ```ts
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "AI analysis failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
  ```

### 17. EMAIL EXPOSED IN SEED SCRIPT — `src/app/seed/page.tsx`
- **Severity:** LOW-MEDIUM  
- **Problem:** Hardcoded Gmail address (`hatcher.actor@gmail.com`) inside a dev-only page.  
- **Impact:** Minor privacy / spam vector.  
- **Fix:** Remove or abstract to environment variable.

---

## Low Severity / Code Quality

### 18. UNUSED IMPORTS
- `src/app/dashboard/auditions/page.tsx` — `Filter` icon imported but unused (only `Search` and `Plus` are used).  
- `src/components/dashboard/dashboard-nav.tsx` — `Film` imported but never used (only `Clapperboard`, etc. are used).  
- `src/components/ui/loading.tsx` — `Suspense` imported but never used.  
- **Fix:** Remove unused imports to reduce bundle size and linter noise.

### 19. MOBILE NAV NEVER RENDERED — `src/components/dashboard/mobile-nav.tsx`
- **Severity:** LOW  
- **Problem:** Component is defined but never imported into `DashboardShell`, so there is no mobile hamburger menu. The `<header>` on mobile just shows the logo and `UserNav`.  
- **Fix:** Import `<MobileNav />` into `DashboardShell` header.

### 20. NO `sitemap.ts` / NO `error.tsx` / NO `loading.tsx`
- **Severity:** LOW  
- **Problem:** `robots.ts` references `/sitemap.xml` but no `sitemap.ts` exists. No global `error.tsx` or `loading.tsx` in `app/` for graceful error / loading boundaries.  
- **Fix:** Create `src/app/sitemap.ts`, `src/app/error.tsx`, and `src/app/loading.tsx`.

### 21. `seed/page.tsx` IS CLIENT COMPONENT FOR STATIC SQL
- **Severity:** LOW  
- **Problem:** Uses `"use client"` when it only renders static markup.  
- **Fix:** Remove `"use client"` to allow static rendering.

### 22. CSS CUSTOM PROPERTIES INCOMPLETE
- **Severity:** LOW  
- **Problem:** `globals.css` defines only `--background` and `--foreground`. Shadcn UI components rely on `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, etc. These are missing, causing some UI colors to fallback to browser defaults or look broken.  
- **Fix:** Add full Tailwind v4 theme mapping:
  ```css
  @theme inline {
    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-card: var(--card);
    --color-card-foreground: var(--card-foreground);
    --color-popover: var(--popover);
    --color-popover-foreground: var(--popover-foreground);
    --color-primary: var(--primary);
    --color-primary-foreground: var(--primary-foreground);
    --color-secondary: var(--secondary);
    --color-secondary-foreground: var(--secondary-foreground);
    --color-muted: var(--muted);
    --color-muted-foreground: var(--muted-foreground);
    --color-accent: var(--accent);
    --color-accent-foreground: var(--accent-foreground);
    --color-destructive: var(--destructive);
    --color-destructive-foreground: var(--destructive-foreground);
    --color-border: var(--border);
    --color-input: var(--input);
    --color-ring: var(--ring);
    --radius-sm: calc(var(--radius) - 4px);
    --radius-md: calc(var(--radius) - 2px);
    --radius-lg: var(--radius);
    --radius-xl: calc(var(--radius) + 4px);
  }
  ```
  And define corresponding `:root` CSS variables.

### 23. `lucide-react` icon imports may fail at build
- **Severity:** LOW  
- **Problem:** Some icons (`Star`, `Building2`, `GraduationCap`, `TrendingUp`) were added in later `lucide-react` versions. If `1.16.0` is truly old, these may not exist.  
- **Fix:** Upgrade `lucide-react` and verify all imported icons exist.

### 24. `stripe` package missing in `dependencies`
- **Severity:** LOW  
- **Problem:** `stripe` is listed in dependencies, but `@types/stripe` is in `devDependencies` and the `stripe` package itself is installed. However, the import pattern used (`import stripe from "stripe"`) is wrong for v22 ESM.  
- **Fix:** Ensure correct ESM import: `import Stripe from "stripe"`.

---

## Environment / Configuration

### 25. `.env` variables not validated at runtime
- **Severity:** MEDIUM  
- **Problem:** Every file uses `process.env.VAR!` with non-null assertions. If any variable is missing, the app crashes with cryptic errors.  
- **Fix:** Create a `src/lib/env.ts` schema (e.g. with `zod`) that validates required env vars on server start and throws a clear message.

### 26. `next.config.ts` is empty
- **Severity:** LOW  
- **Problem:** No `images.domains`, `redirects`, or output config set.  
- **Fix:** At minimum add `images` config for external domains (Supabase Storage, Stripe), and consider `output: "standalone"` if deploying in a container.

---

## Quick-Fix Checklist

| # | File | Action |
|---|------|--------|
| 1 | `src/app/api/checkout/route.ts` | Fix Stripe import + add `POST` handler |
| 2 | `src/app/api/webhook/route.ts` | Replace `require("stripe")` with `import Stripe from "stripe"` |
| 3 | `src/types/index.ts` | Add `OutreachLog` interface |
| 4 | `src/app/login/page.tsx` | Wire up `useAuth().signIn` |
| 5 | `src/app/signup/page.tsx` | Wire up `useAuth().signUp` |
| 6 | `src/app/api/auditions/route.ts` | Remove `"use server"`; add auth checks before DB ops |
| 7 | `src/hooks/use-auth.tsx` | Replace `any` with strict types (`Profile`, `AuthError`) |
| 8 | `src/app/dashboard/layout.tsx` | Remove `"use client"`; move auth to middleware |
| 9 | `src/hooks/use-data.tsx` | Filter auditions by `user_id` |
| 10 | `src/app/api/contracts/analyze/route.ts` | Fix `catch (error: any)` → `catch (error: unknown)` |
| 11 | `src/lib/validation.ts` | Actually use schemas in forms & API routes |
| 12 | `package.json` | Bump `lucide-react` to latest stable; verify `openai` version |
| 13 | `src/app/globals.css` | Add full Shadcn UI color token set |
| 14 | `src/components/dashboard/dashboard-shell.tsx` | Import and render `<MobileNav />` |
| 15 | `src/app/` root | Add `sitemap.ts`, `error.tsx`, `loading.tsx` |
| 16 | `src/app/seed/page.tsx` | Remove `"use client"` |
| 17 | `src/lib/env.ts` | Add runtime env validation with `zod` |

---

## Summary

- **Build currently fails** due to 3 TypeScript errors (Stripe import, missing `OutreachLog`, checkout route shape).  
- **Authentication is completely bypassed** on login & signup pages.  
- **API routes have no authorization**, exposing the service-role Supabase client to unauthenticated writes.  
- **Many dead-code patterns** (`"use server"` in routes, `any` types, unused imports).  
- **Missing foundational pieces:** runtime env validation, mobile nav, sitemap, error/loading boundaries, and complete Tailwind theme tokens.

**Priority order to unblock the build:** Fix #1, #3, #4 → then tackle #6 (auth) and #7 (API security) before any production deployment.
