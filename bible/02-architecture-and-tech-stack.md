# Chapter 2: Architecture and Tech Stack

## Stack Overview

```
User's Browser (React 19, Next.js 16 App Router)
  |
  |-- Supabase JS Client (Auth + Realtime + Postgres)
  |     |
  |     +-- Supabase Auth (email/password signup, session JWT)
  |     +-- Supabase Postgres (all application data, RLS on every table)
  |     +-- Supabase Storage (private bucket for scripts/contracts, Phase 2)
  |
  |-- Next.js API Routes (server-side, service role)
        |
        +-- Stripe (checkout sessions, webhooks, billing portal)
        +-- Google Gmail API (OAuth2, message fetch, incremental sync)
        +-- LLM Providers (Ollama / Anthropic / OpenAI via llm.ts)
```

---

## Why Each Choice

### Next.js 16 (App Router)

| Reason | Detail |
|--------|--------|
| Server-side rendering for the landing page | The `/` route is a marketing page that needs SEO. App Router gives us server components by default. |
| API routes without a separate server | Every backend endpoint (`/api/checkout`, `/api/webhook`, `/api/gmail/sync`, etc.) is a file in `src/app/api/`. No Express, no separate deployment. |
| React 19 | Concurrent features, `use` hook, improved hydration. The dashboard is entirely client-side (`"use client"` components) for interactivity. |
| Vercel deployment | Push to `main`, deployed in seconds. No infrastructure to manage. |

### Supabase (Auth + Postgres + Row Level Security)

| Reason | Detail |
|--------|--------|
| Instant auth | Email/password signup with JWT sessions. No custom auth server. |
| Row Level Security | Every table has `auth.uid() = user_id` policies. Data isolation is enforced at the database layer, not the application layer. A bug in a React component cannot leak another user's auditions. |
| Realtime (future) | Supabase subscriptions will power live ribbon updates and briefing refreshes. |
| Free tier | Sufficient for MVP and the first hundreds of users. |
| Service role for API routes | API routes use a service-role Supabase client that bypasses RLS for administrative operations (webhook status updates, email sync). |

### Stripe

| Reason | Detail |
|--------|--------|
| Subscription billing | Two price IDs: `STRIPE_MONTHLY_PRICE_ID` ($5/month) and `STRIPE_ANNUAL_PRICE_ID` ($45/year). |
| 14-day free trial | Set on `subscription_data.trial_period_days` at checkout session creation. |
| Promotion codes | `allow_promotion_codes: true` on every checkout session. Beta testers get 100% off coupon codes. |
| Billing portal | Stripe-hosted portal for plan changes, cancellations, invoice history. |
| Webhook lifecycle | Four events handled: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. |

### Tailwind CSS v4

| Reason | Detail |
|--------|--------|
| Cinematic theming | Every color is a CSS custom property (`var(--bg)`, `var(--paper)`, `var(--amber)`, etc.) injected at `:root` by the ThemeProvider. Tailwind utilities reference these variables. |
| Utility-first | No custom CSS files beyond `globals.css`. All styling is in component JSX. |
| PostCSS integration | `@tailwindcss/postcss` v4 in devDependencies. |

### LLM Abstraction (Ollama / Anthropic / OpenAI)

| Reason | Detail |
|--------|--------|
| Provider agnostic | `src/lib/llm.ts` exports a single `llm(tier, messages, maxTokens)` function. Provider is selected by `LLM_LOW_PROVIDER` and `LLM_HIGH_PROVIDER` environment variables. |
| Default: local/free | Ollama with `llama3.2:3b` is the default. No API key needed for development. |
| Cost control | The `low` tier (email parsing, contact descriptions) uses cheap/fast models. The `high` tier (contract analysis) uses stronger reasoning models. |

---

## Client-Side Auth Pattern

Authentication uses Supabase JS client exclusively on the client side.

1. `src/lib/supabase.ts` creates a Supabase browser client with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. `src/hooks/use-auth.tsx` provides an `AuthProvider` context that listens to `onAuthStateChange` and exposes `profile`, `signOut`, and `refreshProfile`.
3. `src/components/auth/auth-guard.tsx` wraps protected routes and redirects to `/login` if no session.
4. `src/middleware.ts` runs on `/dashboard/:path*` routes. It does NOT verify auth tokens -- it only adds security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`).
5. API routes that need a user identity read the `x-user-id` header (set by the client before calling) and validate against the service-role Supabase client.

**Why client-side auth?** The dashboard is a fully interactive single-page application. Server components do not need user data. The landing page, login, and signup are public. This pattern avoids the complexity of server-side session management while keeping RLS as the true security boundary.

---

## Server-Side Admin Pattern

API routes that modify data across users (Stripe webhooks, Gmail sync) use a service-role Supabase client:

```typescript
// src/lib/supabase-admin.ts
import { createClient } from "@supabase/supabase-js"

export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

This client bypasses RLS. It is used ONLY in server-side API routes, never imported into client components.

---

## Deployment

| Layer | Service | Tier |
|-------|---------|------|
| Frontend + API | Vercel | Free / Hobby |
| Database + Auth | Supabase | Free tier (500 MB, 50k monthly active users) |
| Payments | Stripe | Pay-as-you-go (2.9% + 30 cents per transaction) |
| Gmail OAuth | Google Cloud Console | Free tier |
| LLM (default) | Ollama (local) | Free |
| LLM (production) | Anthropic or OpenAI | Per-token, capped by env config |

Deployment is a `git push` to the `main` branch on GitHub. Vercel auto-deploys. Environment variables are set in the Vercel dashboard.

---

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.2.6 | Framework |
| `react` / `react-dom` | 19.2.4 | UI library |
| `@supabase/supabase-js` | 2.106.1 | Database client |
| `stripe` / `@stripe/stripe-js` | 22.1.1 / 9.6.0 | Payment processing (server + client) |
| `tailwindcss` | 4.x | Styling |
| `@radix-ui/react-*` | Various | Accessible primitives (dialog, select, checkbox, separator, slot) |
| `lucide-react` | 1.16.0 | Icon library |
| `date-fns` | 4.2.1 | Date utilities |
| `sonner` | 2.0.7 | Toast notifications |
| `zod` | 4.4.3 | Schema validation |
| `class-variance-authority` | 0.7.1 | Component variant management |
| `clsx` / `tailwind-merge` | 2.1.1 / 3.6.0 | Class name utilities |
| `openai` | 6.38.0 | OpenAI SDK (optional provider) |

---

## No Separate Backend

There is no Express server, no tRPC, no GraphQL layer. The architecture is:

- **Client reads:** Supabase JS client queries Postgres directly (RLS protects all data).
- **Client writes:** Supabase JS client inserts and updates directly.
- **Server writes (admin):** Next.js API routes use the service-role Supabase client for operations that span users or require secrets (Stripe, Gmail, LLM calls).

This keeps the codebase in one repository, one deployment, and one language (TypeScript everywhere).
