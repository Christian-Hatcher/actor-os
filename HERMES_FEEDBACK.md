# Hermes Build Feedback — Actor OS

Issues found and fixed after Hermes' initial scaffolding (21 commits on master).
Use this to train Hermes on patterns to avoid in future builds.

---

## CRITICAL: Build Blockers

### 1. `require("stripe")` in ESM context
**Files:** `api/checkout/route.ts`, `api/webhook/route.ts`, `api/portal/route.ts`
**Problem:** Used `const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)` which fails in Next.js App Router (ESM).
Also, `checkout/route.ts` had `"use server"` directive which is invalid on API routes.
**Fix:** Use `import Stripe from "stripe"` + `new Stripe(process.env.STRIPE_SECRET_KEY!)`.
**Rule:** Never use `require()` in Next.js App Router. Always use ESM `import`.

### 2. Phantom `pdf-lib` import
**File:** `api/contracts/analyze/route.ts`
**Problem:** `import { PDFExtract } from "pdf-lib"` — package not in `package.json`, and `PDFExtract` isn't even used anywhere in the file.
**Fix:** Removed the import.
**Rule:** Never import packages that aren't installed. Never leave unused imports.

### 3. Types file had line number prefixes baked in
**File:** `src/types/index.ts`
**Problem:** The file content literally contained `     1|export interface Profile {` — the line number prefix format from a Read tool was pasted directly into the source file.
**Fix:** Rewrote the entire file without prefixes.
**Rule:** NEVER copy tool output format (line numbers, pipe separators) into source files. Only copy the actual content.

---

## HIGH: Security / Auth Issues

### 4. Login and signup used fake `setTimeout` instead of real auth
**Files:** `login/page.tsx`, `signup/page.tsx`
**Problem:** Both pages had `setTimeout(() => router.push("/dashboard"), 1000)` instead of calling `supabase.auth.signInWithPassword()` / `signUp()`. The `useAuth()` hook was already built and working — it just wasn't wired up.
**Fix:** Replaced setTimeout with actual `useAuth().signIn()` / `signUp()` calls.
**Rule:** Never ship fake auth. If the hook exists, use it. If it doesn't exist yet, build it — don't stub with setTimeout.

### 5. API routes had zero auth verification
**File:** `api/auditions/route.ts`
**Problem:** GET returned ALL auditions (no user filter). POST/PUT/DELETE accepted any body with no user verification. Used `supabaseAdmin` (service role) without checking who is making the request.
**Fix:** Added user_id header check and scoped all queries to the authenticated user.
**Rule:** Every API route that touches user data must verify the user. Never use service_role without auth checks.

---

## MEDIUM: Missing Types and Imports

### 6. Database types missing `Insert`, `Update`, and `Relationships` for most tables
**File:** `src/types/database.ts`
**Problem:** Only `profiles`, `auditions`, `reminders`, and `contract_restrictions` had Insert/Update types. All other tables (self_tapes, contacts, contracts, email_connections, casting_emails, parsed_auditions, etc.) only had `Row`. This caused Supabase SDK to resolve `.insert()` and `.update()` to `never`, breaking the build.
Also missing `Relationships: []` on every table, plus `Views`, `Functions`, and `Enums` sections.
**Fix:** Added Insert/Update/Relationships for all 14 tables, plus Views/Functions/Enums stubs.
**Rule:** When defining Supabase Database types, EVERY table needs Row + Insert + Update + Relationships. The SDK's `GenericTable` type requires all four. Also include Views, Functions, Enums sections at the schema level.

### 7. Missing `ParsedAudition` type export
**File:** `src/types/index.ts`
**Problem:** `emails/page.tsx` imported `ParsedAudition` from `@/types` but it wasn't defined.
**Fix:** Added `ParsedAudition` and `ParsedAuditionFields` interfaces.
**Rule:** If a page imports a type, that type must exist. Run the build before pushing.

### 8. Missing `cn` import in dashboard-nav
**File:** `src/components/dashboard/dashboard-nav.tsx`
**Problem:** Used `cn()` utility but never imported it.
**Fix:** Added `import { cn } from "@/lib/utils"`.

### 9. Missing `Filter` import in auditions page
**File:** `src/app/dashboard/auditions/page.tsx`
**Problem:** Used `<Filter />` icon but only imported other lucide icons.
**Fix:** Added `Filter` to the lucide-react import.

---

## MEDIUM: CSS / UI Issues

### 10. Incomplete Tailwind CSS theme variables
**File:** `src/app/globals.css`
**Problem:** Only defined `--background` and `--foreground`. Missing all shadcn theme variables: `--card`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`, and their foreground variants.
**Fix:** Added complete light/dark theme with all 13 variable pairs + `@theme inline` block mapping them to Tailwind.
**Rule:** When using shadcn/ui components, all theme CSS variables must be defined. The components reference `bg-card`, `text-muted-foreground`, `border-input`, etc. — these break silently without the variables.

### 11. Dashboard components used hardcoded mock data instead of existing hooks
**Files:** `stats-cards.tsx`, `recent-auditions.tsx`, `upcoming-reminders.tsx`, `auditions/page.tsx`
**Problem:** Each component had its own `MOCK_*` array with hardcoded data. The `useAuditions()` and `useDashboardStats()` hooks already existed in `use-data.tsx` and correctly fetched from Supabase — they just weren't used.
**Fix:** Replaced all mock data with real hook calls + loading skeletons + empty states.
**Rule:** If data hooks exist, use them. Never duplicate data with mock arrays when the real fetch is already built.

### 12. `DashboardHeader` didn't accept children
**File:** `src/components/dashboard/dashboard-header.tsx`
**Problem:** The emails page passed children (an "Approve All" button) to DashboardHeader, but the component's props didn't include `children`.
**Fix:** Added optional `children` prop and rendered it alongside the heading.

---

## LOW: Package Issues

### 13. Obsolete `@types/stripe` in devDependencies
**Problem:** Stripe v22+ bundles its own TypeScript types. The separate `@types/stripe@8.0.416` package is for Stripe v8 and causes type conflicts.
**Fix:** Removed from devDependencies.
**Rule:** Check if a package bundles its own types before adding `@types/*`.

---

## Summary Checklist for Future Builds

Before pushing, Hermes should:
1. Run `npm run build` — if it fails, fix before pushing
2. Verify no `require()` in App Router files
3. Verify no unused imports
4. Verify all Database types have Row + Insert + Update + Relationships
5. Verify auth is real, not stubbed
6. Verify API routes check user identity
7. Verify all CSS theme variables exist for UI library
8. Verify all imported types actually exist
9. Never paste tool output format into source files
