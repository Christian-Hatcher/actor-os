# Chapter 12: Frontend Pages

Every route in Actor OS with its component tree, data hooks, key features, and navigation behavior.

---

## Route Index

| Route | Auth | Component | Purpose |
|-------|------|-----------|---------|
| `/` | None | `LandingPage` | Marketing, features, pricing, university section |
| `/login` | None | `LoginPage` | Email/password login |
| `/signup` | None | `SignUpPage` | Account creation with plan selection |
| `/checkout` | None (user optional) | `CheckoutPage` | Stripe checkout redirect |
| `/dashboard` | AuthGuard | `DashboardHome` | Briefing, week strip, accordion sections |
| `/dashboard/auditions` | AuthGuard | `AuditionsView` | Agenda + calendar dual-view |
| `/dashboard/auditions/[id]` | AuthGuard | `AuditionDetail` | Call-sheet detail with ribbon |
| `/dashboard/self-tapes` | AuthGuard | `SelfTapesView` | Self-tape card list |
| `/dashboard/contracts` | AuthGuard | `ContractsPage` | Contract upload + AI analysis |
| `/dashboard/outreach` | AuthGuard | `OutreachPage` | Contact CRM grid |
| `/dashboard/emails` | AuthGuard | `EmailsPage` | Parsed audition review queue |
| `/dashboard/earnings` | AuthGuard | `EarningsView` | Earnings overview, goal, tax tabs |
| `/dashboard/settings` | AuthGuard | `SettingsPage` | Gmail, preferences, billing, theme, tax |
| `/dashboard/universities` | AuthGuard | `UniversitiesPage` | University licensing placeholder |
| `/seed` | None | `SeedPage` | Development seed data tool |

---

## Layout Hierarchy

```
RootLayout (src/app/layout.tsx)
  ├── ThemeProvider (CSS variable injection, no-flash script)
  │   └── AuthProvider (session, profile, signOut context)
  │       ├── Toaster (sonner toast notifications)
  │       ├── [public pages: /, /login, /signup, /checkout]
  │       └── DashboardLayout (src/app/dashboard/layout.tsx)
  │           └── AuthGuard (redirect to /login if unauthenticated)
  │               └── [dashboard pages]
```

### Root Layout

**File:** `src/app/layout.tsx`

Loads three Google Fonts via `next/font/google`:

| Font | CSS Variable | Usage |
|------|-------------|-------|
| Instrument Serif (400, normal + italic) | `--font-instrument-serif` | Page titles, briefing prose, big numbers, primary CTAs |
| Inter (300-700) | `--font-inter` | Body text, button labels, secondary text |
| JetBrains Mono (400-600) | `--font-jetbrains-mono` | Call-sheet metadata, status pills, dates, fine print |

Injects the theme no-flash script in `<head>` before first paint. Wraps all content in `ThemeProvider` then `AuthProvider`.

### Dashboard Layout

**File:** `src/app/dashboard/layout.tsx`

Minimal wrapper. Renders `AuthGuard` around all dashboard children. No sidebar, no top nav at this layer -- navigation is handled by the bottom nav bar inside `AuthGuard` or individual page components.

### AuthGuard

**File:** `src/components/auth/auth-guard.tsx`

- Reads `user` and `loading` from `useAuth()`.
- While loading: renders a centered spinning loader.
- If no user: redirects to `/login?returnTo={currentPath}` and renders nothing.
- If user exists: renders children.

---

## `/` -- Landing Page

**File:** `src/app/page.tsx`

**Auth:** None (public).

**Component:** `LandingPage` (default export, client component).

**Sections:**

1. **Header** -- Logo, nav links (Features, Pricing, Universities), Log In and Get Started buttons.
2. **Hero** -- Badge "Built by a working actor in Tokyo", headline "Your Acting Career, Organized", subtitle, two CTAs (Start Free Trial, See Demo), trial notice.
3. **Features** -- Four-card grid: Casting Pipeline, Self-Tape Partner, Contract Reader, Outreach CRM. Each card uses a lucide icon, title, and description.
4. **Pricing** -- Monthly/Annual toggle. Two plan cards side-by-side. The active plan card gets a `border-primary` highlight. Annual shows `$45/year` with `$3.75/month` breakdown. Monthly shows `$5/month`. Both link to `/signup?plan={plan}`.
5. **Universities** -- Badge "Phase 2 -- Coming Fall 2026". Three tier cards (Standard $500, Premium $1,200, Enterprise Custom). Contact button links to `mailto:hatcher.actor@gmail.com`.
6. **Testimonial** -- Five-star rating, quote from Christian, attribution.
7. **Footer** -- Logo, copyright "At Home Reelz K.K.", Support and Privacy links.

**State:** `annual` boolean (default: `true`) toggles pricing display.

**Data hooks:** None. This is a static marketing page.

---

## `/login` -- Login Page

**File:** `src/app/login/page.tsx`

**Auth:** None (public). Redirects to dashboard if already authenticated.

**Component:** `LoginPage` (client component).

**Features:**
- Email and password form.
- Reads `returnTo` from search params (defaults to `/dashboard`).
- Calls `signIn(email, password)` from `useAuth()`.
- On success: `router.push(returnTo)`.
- On error: displays error message inline.
- Link to `/signup` at the bottom.

**UI:** Centered card on muted background. Logo at top. Loading spinner on submit button.

---

## `/signup` -- Signup Page

**File:** `src/app/signup/page.tsx`

**Auth:** None (public).

**Component:** `SignUpPage` (client component).

**Features:**
- Full name, email, and password form (minimum 8 characters).
- Reads `plan` from search params (defaults to `monthly`).
- Calls `signUp(email, password, { full_name: name })` from `useAuth()`.
- On success: redirects to `/dashboard`.
- On error: displays error message inline.
- Link to `/login` at the bottom.

**UI:** Same centered card layout as login. Trial notice: "Start your 14-day free trial. No credit card required."

---

## `/checkout` -- Checkout Page

**File:** `src/app/checkout/page.tsx`

**Auth:** None required, but reads `user` and `profile` from `useAuth()` if available.

**Component:** `CheckoutPage` (client component).

**Features:**
- Reads `plan` from search params (`monthly` or `annual`).
- Displays plan summary with price and feature list.
- Beta code input field (auto-uppercases input).
- Calls `POST /api/checkout` with plan, email, name, and optional coupon code.
- Redirects to the Stripe Checkout Session URL.
- Back link to `/signup`.

**UI:** Centered card. Plan details in a highlighted box. Feature checklist with green check icons. "Secure payment via Stripe" reassurance text.

---

## `/dashboard` -- Dashboard Home

**File:** `src/app/dashboard/page.tsx` delegates to `src/components/dashboard/dashboard-home.tsx`

**Auth:** AuthGuard.

**Data hooks:**
- `useAuth()` -- profile (name, city)
- `useAuditions()` -- full audition list
- `useReminders()` -- reminder list
- `useSelfTapes()` -- self-tape list
- `useContacts()` -- contact list
- `useContracts()` -- contract list
- `usePendingApprovals()` -- parsed auditions needing review

**Component tree:**
```
DashboardHome
  ├── Splash (cold-open animation)
  ├── Greeting (name, date, city, avatar initials)
  ├── Briefing Card (composeBriefing output as HTML)
  │   ├── "Open day" link → /dashboard/auditions
  │   └── "Snooze" button
  ├── WeekStrip (7-day horizontal calendar)
  └── Accordion Sections (7 total)
      ├── Auditions (active count, this-week list, AuditionMiniRow links)
      ├── Earnings (banked/potential rollup, link to full view)
      ├── Self-tapes (due count, deadline cards, urgent tone if due today)
      ├── Contracts (review count, red flag alerts)
      ├── Outreach (follow-up count, days since last contact)
      ├── Relationships (contact notes, "Coming soon" placeholder)
      └── Needs Approval (pending parsed audition count, link to review queue)
```

**Key behaviors:**
- `metaDate(city)` formats the current date as `"WED · 28 MAY · TOKYO"`.
- `thisWeek(auditions)` filters to auditions within the next 7 days, limited to 5.
- `composeBriefing()` generates a deterministic prose briefing from auditions, reminders, and name.
- `rollupEarnings()` computes banked (booked/wrapped) and potential (callback/pinned) totals.
- Accordion sections use tone variants: `"default"`, `"good"` (green for earnings), `"urgent"` (red for due-today tapes or flagged contracts).
- Skeleton loading state while auditions are fetching.

---

## `/dashboard/auditions` -- Auditions List

**File:** `src/app/dashboard/auditions/page.tsx` delegates to `src/components/dashboard/auditions-view.tsx`

**Auth:** AuthGuard.

**Data hooks:** `useAuditions()`, `useAuditionGroups()`

**Features:**
- **Dual view:** Agenda (default) and Calendar toggle.
- **Agenda view:** Groups auditions by date using `useAuditionGroups()`. Each group shows a date label and a list of audition cards. Auditions with no date fall into an "Awaiting reply" group.
- **Calendar view:** Monthly calendar grid with audition dots on dates.
- **Search:** Text filter across project name, role, casting director.
- **Status filter:** Filter by audition status.
- **Add audition:** Inline form or modal to create a new audition via `addAudition()`.
- Each audition card links to `/dashboard/auditions/[id]`.

---

## `/dashboard/auditions/[id]` -- Audition Detail

**File:** `src/app/dashboard/auditions/[id]/page.tsx` delegates to `src/components/dashboard/audition-detail.tsx`

**Auth:** AuthGuard.

**Data hooks:** `useAudition(id)`

**Features:**
- **Ribbon header:** Dynamic state machine (`src/lib/ribbon.ts`) shows contextual information:
  - Green countdown to callback/shoot
  - Amber OT timer when past estimated wrap time
  - Red "starting now" at call time
  - Grey "wrapped" when complete
- **Poster section:** Project name, role, casting director, location.
- **Call-sheet fields:** Call time, estimated wrap, actual wrap, OT rate multiplier, compensation.
- **Status transitions:** Action bar with contextual buttons (e.g., "Mark as Callback", "Book This", "Pass").
- **Notes field:** Editable notes via `updateAudition()`.
- **Date display:** Shows submitted date, callback date, shoot date as applicable.

---

## `/dashboard/self-tapes` -- Self-Tapes

**File:** `src/app/dashboard/self-tapes/page.tsx` delegates to `src/components/dashboard/self-tapes-view.tsx`

**Auth:** AuthGuard.

**Data hooks:** `useSelfTapes()`

**Features:**
- Card list of self-tapes.
- Three visual states per card:
  - **Empty/not recorded:** Shows title and deadline, "not recorded" label.
  - **Draft:** Recorded but not submitted.
  - **Submitted:** Completed with submission date.
- Deadline badges. Cards due today get a `flag` chip class.
- Scene partner display when present.
- Empty state: "No tapes due. Nice."

---

## `/dashboard/contracts` -- Contract Reader

**File:** `src/app/dashboard/contracts/page.tsx`

**Auth:** AuthGuard.

**Data hooks:** `useContracts()` (from `use-data.tsx`)

**Features:**
- Contract list with status badges (uploaded, analyzing, reviewed, signed).
- Upload new contract (text paste or file reference).
- Trigger AI analysis via `POST /api/contracts/analyze`.
- Analysis results display: summary, key clauses, red flags (highlighted), questions to ask, overall grade (A-F with color coding), compensation breakdown, schedule details.
- Mock data included for development/demo purposes.

---

## `/dashboard/outreach` -- Outreach CRM

**File:** `src/app/dashboard/outreach/page.tsx`

**Auth:** AuthGuard.

**Data hooks:** `useContacts()` (from `use-data.tsx`)

**Features:**
- Contact grid/list view.
- Search by name, email, agency.
- Contact cards show: name, role/type, email, priority level, last contact date.
- Days-since-last-contact calculation for follow-up urgency.
- LLM-generated contact descriptions (one-sentence summaries from email context).

---

## `/dashboard/emails` -- Email Review Queue

**File:** `src/app/dashboard/emails/page.tsx`

**Auth:** AuthGuard.

**Data hooks:** `usePendingApprovals()` (from `use-data.tsx`)

**Features:**
- Queue of parsed casting emails awaiting user review.
- Each item shows: email subject, sender, parsed fields (project name, role, agency), confidence score.
- Three actions per item:
  - **Approve:** Creates an audition from the parsed data.
  - **Reply:** Opens email context for manual handling.
  - **Skip:** Dismisses the parsed audition.
- Confidence-based styling (high confidence items highlighted).
- Empty state when no approvals are pending.

---

## `/dashboard/earnings` -- Earnings Tracker

**File:** `src/app/dashboard/earnings/page.tsx` delegates to `src/components/dashboard/earnings-view.tsx`

**Auth:** AuthGuard.

**Data hooks:** `useEarnings()` (from `use-earnings.tsx`), `useAuth()` for profile

**Features:**
- **Three tabs:** Overview, Goal, Tax.
- **Overview tab:**
  - SVG area chart (`EarningsChart` component) showing earnings over time.
  - Stat strip: total banked, potential, number of bookings, conversion rate.
  - Monthly cards showing per-month earnings breakdown.
  - Per-audition breakdown with compensation details.
- **Goal tab:** Annual earnings goal tracking with progress visualization.
- **Tax tab:** Delegates to `TaxKeeper` component.

**Tax Keeper** (`src/components/dashboard/tax-keeper.tsx`):
- Hero number: estimated tax liability based on current earnings.
- Year-to-date summary: gross income, effective tax rate, estimated taxes owed.
- Jurisdiction-specific breakdown (US brackets, Japan gensenchoushu, UK income tax + NI).
- Monthly savings log: track when money was set aside for taxes.
- Uses `useTax()` hook for settings and computations.

---

## `/dashboard/settings` -- Settings

**File:** `src/app/dashboard/settings/page.tsx`

**Auth:** AuthGuard.

**Data hooks:** `useAuth()`, `useTheme()`, `useTax()`

**Note:** This is the one page that calls Supabase directly (predates the hook-based data pattern).

**Sections (6 cards):**

1. **Gmail Connection**
   - Lists connected email accounts with status indicator.
   - "Connect Gmail Account" button initiates OAuth flow via `GET /api/gmail/auth`.
   - Per-connection sync button calls `POST /api/gmail/sync` then `POST /api/gmail/parse`.
   - Two-phase sync with live status: "Fetching emails..." then "Parsing with AI..."
   - Delete connection button with confirmation.
   - Success/error banners from `email_connected` and `email_error` search params (set by OAuth callback redirect).

2. **Audition Preferences**
   - Career goal selector: Building Experience, Earning Income, Building Network, All Opportunities.
   - Priority rankings: 1-5 for compensation, experience, networking, project type, location flexibility.
   - Preferred project types: multi-select chips (commercial, film, TV, theater, voice over, modeling).
   - Minimum compensation text input.
   - Preferred locations (comma-separated).
   - Willing to travel toggle.
   - Bio context textarea.
   - Upserts to `actor_preferences` table.

3. **Subscription**
   - Current plan display with status badge (active, past_due, inactive).
   - Price display ($5/month, $45/year, or Free).
   - "Manage Subscription" button opens Stripe Billing Portal via `POST /api/portal`.
   - "Upgrade to Pro" link to `/checkout` if no Stripe customer.

4. **Appearance**
   - Theme picker: grid of available themes (Cinematic, Ivory). Each shows a gradient swatch.
   - Active theme highlighted with amber border.
   - Currency selector: 6 currencies (USD, JPY, GBP, EUR, AUD, CAD) in a grid. Updates profile and refreshes.

5. **Tax Settings**
   - Jurisdiction selector: US, Japan, UK, Australia, Canada, Other.
   - US-specific: filing status (Single, Married Filing Jointly, Married Filing Separately, Head of Household) and state tax rate input.
   - Manual rate override: bypasses all bracket calculations.
   - Tax savings reminders toggle.
   - Persists via `useTax().updateSettings()`.

6. **Account**
   - Sign out button.

---

## `/dashboard/universities` -- University Licensing

**File:** `src/app/dashboard/universities/page.tsx`

**Auth:** AuthGuard.

**Features:** Placeholder page for Phase 2 university licensing. Displays information about the upcoming feature.

---

## `/seed` -- Development Seed Page

**File:** `src/app/seed/page.tsx`

**Auth:** None.

**Features:** Development utility page for inserting test data into the database. Not linked from the production UI.

---

## Data Hook Summary

All data fetching is centralized in four hook files. Pages and components never call Supabase directly, with the sole exception of the Settings page.

| Hook File | Hooks Exported | Data Source |
|-----------|---------------|-------------|
| `use-auth.tsx` | `useAuth()` | `supabase.auth`, `profiles` table |
| `use-data.tsx` | `useAuditions()`, `useAudition(id)`, `useDashboardStats()`, `useReminders()`, `useSelfTapes()`, `useContacts()`, `useContracts()`, `usePendingApprovals()`, `useAuditionGroups()` | Various tables via `useUserTable<T>()` generic |
| `use-earnings.tsx` | `useEarnings()` | Derived from audition compensation data |
| `use-tax.tsx` | `useTax()` | `profiles.tax_settings` column, `tax_withholdings` table |

### `useUserTable<T>()` Pattern

The `use-data.tsx` file contains a generic hook that fetches any user-scoped table:

```typescript
function useUserTable<T>(table: TableName, orderBy: string, ascending = false)
```

This generic is used by `useReminders`, `useSelfTapes`, `useContacts`, `useContracts`, and `usePendingApprovals`. It handles auth user lookup, loading state, error state, and cleanup via an `active` flag.

`useAuditions` does not use this generic because it also exposes `addAudition()` and `updateAudition()` mutation functions.

---

## Navigation

### Bottom Navigation Bar

**File:** `src/components/dashboard/bottom-nav.tsx`

Mobile-first bottom navigation bar rendered inside the dashboard layout. Links to the primary dashboard sections:

| Icon | Label | Route |
|------|-------|-------|
| Home | Home | `/dashboard` |
| Clapperboard | Auditions | `/dashboard/auditions` |
| Video | Self-Tapes | `/dashboard/self-tapes` |
| Users | Outreach | `/dashboard/outreach` |
| Settings | Settings | `/dashboard/settings` |

Active state is determined by matching `usePathname()` against each route.

### Page-Level Navigation

Several pages provide cross-links to related pages:
- Dashboard home accordion sections link to their respective full pages.
- Audition list items link to audition detail pages.
- Settings page links to checkout for free-tier users.
- Login and signup pages cross-link to each other.
- Checkout links back to signup.

---

## Error and Loading States

| File | Purpose |
|------|---------|
| `src/app/error.tsx` | Error boundary page for uncaught errors |
| `src/app/loading.tsx` | Global loading state |
| `src/app/not-found.tsx` | 404 page |
| `src/components/ui/error-boundary.tsx` | Reusable error boundary wrapper |
| `src/components/ui/loading.tsx` | Loading spinner component |
| `src/components/ui/skeleton.tsx` | Skeleton loader primitive |
| `src/components/ui/skeletons.tsx` | Pre-composed skeleton layouts for dashboard sections |

---

## SEO and Metadata

| File | Purpose |
|------|---------|
| `src/app/robots.ts` | Generates `robots.txt` |
| `src/app/sitemap.ts` | Generates `sitemap.xml` |
| `src/app/layout.tsx` | Sets default `<title>` and `<meta description>` |

Default title: "Actor OS -- Your Acting Career, Organized"
Default description: "The career command center for student and emerging actors. Track auditions, manage self-tapes, read contracts with AI."
