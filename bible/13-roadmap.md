# Chapter 13: Roadmap

Actor OS ships in phases. Each phase builds on the previous one with no rework. The guiding principle: ship the smallest useful thing, validate it with real actors, then expand.

---

## Phase Overview

| Phase | Name | Timeline | Core Deliverables |
|-------|------|----------|-------------------|
| 1.0 | MVP | Complete | Auditions, self-tapes, contracts, outreach, earnings, email ingestion, Stripe billing |
| 1.5 | Hardening | Summer 2026 | Testing, auth hardening, performance, polish |
| 2.0 | V2 Features | Fall 2026 | Jobs entity, rehearsal logs, scripts, theater/film mode |
| 2.5 | MCP Server | Late 2026 | Agent-ready API via Model Context Protocol |
| 3.0 | Collaboration + University | 2027 | Cast collaboration, Stage Manager OS, university licensing |
| 4.0 | Mobile + International | 2027+ | Native mobile app, Japanese language support |

---

## Phase 1.0: MVP (Complete)

Everything documented in this Bible is Phase 1.0. The MVP is live and functional.

### What Shipped

| Module | Status | Key Capabilities |
|--------|--------|-----------------|
| Casting Pipeline | Complete | Full CRUD, status state machine (submitted through archived), agenda + calendar views, audition detail with ribbon |
| Self-Tape Tracker | Complete | Deadline tracking, draft/submitted states, scene partner notes |
| Contract Reader | Complete | Text paste, LLM analysis (grade A-F, red flags, key clauses, restrictions), analysis logs |
| Outreach CRM | Complete | Contact grid, priority ranking, last-contact tracking, LLM-generated descriptions |
| Earnings Tracker | Complete | Banked/potential rollup, area chart, monthly breakdown, pay parsing with 6 currencies |
| Tax Keeper | Complete | Multi-jurisdiction estimation (US/Japan/UK/Australia/Canada), bracket-based and flat-rate, manual override, monthly savings log |
| Email Ingestion | Complete | Gmail OAuth, incremental sync, casting detection (domain + keyword), LLM parsing with regex fallback, review queue |
| Dashboard | Complete | Deterministic briefing, week strip, 7 accordion sections, cinematic theme system |
| Stripe Billing | Complete | Monthly $5, annual $45, 14-day trial, webhook-driven subscription state, billing portal |
| Settings | Complete | Gmail connections, audition preferences, subscription management, theme picker, currency selector, tax configuration |
| Landing Page | Complete | Marketing, feature cards, pricing toggle, university teaser, testimonial |
| Auth | Complete | Supabase email/password, AuthGuard, session-based routing, RLS on every table |

### What Is Missing from MVP

These items were identified during development but deferred:

1. **No test suite.** Zero test files exist. This is the highest-priority item for Phase 1.5.
2. **Gmail auth hardening.** The sync and parse routes trust `user_id` in the request body. Production should verify the calling user's session.
3. **No service layer extraction.** Business logic lives in API route files. Shared service functions are needed before the MCP server can reuse this logic.
4. **No file upload for contracts.** The `fileUrl` parameter exists but PDF text extraction is not implemented. Users paste contract text.
5. **No real-time features.** Supabase Realtime is not used. All data is fetched on mount with no live updates.
6. **Settings page direct Supabase calls.** The settings page predates the hook pattern and calls Supabase directly instead of going through centralized hooks.

---

## Phase 1.5: Hardening (Summer 2026)

Focus: make the MVP production-grade without adding features.

### Testing

| Task | Priority | Approach |
|------|----------|----------|
| Unit tests for utility functions | High | Jest or Vitest for `briefing.ts`, `format.ts`, `ribbon.ts`, `tax-estimator.ts`, `themes.ts` |
| API route integration tests | High | Test each route handler with mocked Supabase and Stripe clients |
| Component tests | Medium | React Testing Library for key components (dashboard-home, auditions-view, earnings-view) |
| End-to-end tests | Medium | Playwright for critical flows: signup, login, create audition, sync email |
| LLM output tests | Low | Snapshot tests for prompt formatting; mock LLM responses for parsing and analysis |

### Auth Hardening

| Task | Priority |
|------|----------|
| Verify session on Gmail sync and parse routes (not just trust `user_id` in body) | High |
| Add rate limiting to public routes (`/api/checkout`, `/api/gmail/auth`) | Medium |
| Add CSRF protection for state-changing operations | Medium |
| Audit all API routes for consistent error handling | Medium |

### Performance

| Task | Priority |
|------|----------|
| Add loading skeletons to all dashboard pages (currently only dashboard home has them) | Medium |
| Implement SWR or React Query for cache-and-revalidate patterns | Medium |
| Lazy-load heavy components (earnings chart, contract analysis results) | Low |
| Optimize Supabase queries (select only needed columns instead of `select("*")`) | Low |

### Polish

| Task | Priority |
|------|----------|
| Extract Settings page data fetching into hooks (match the rest of the app) | Medium |
| Add empty states to all list pages | Medium |
| Implement the "Snooze" button on the briefing card | Low |
| Add toast notifications for all user actions (create, update, delete) | Low |
| Implement password reset flow | Medium |

---

## Phase 2.0: V2 Features (Fall 2026)

Source: `SPEC-V2-FEATURES.md`

Phase 2 introduces the post-booking workflow. Currently, once an audition is booked, Actor OS has nothing more to offer. Phase 2 extends the product into the working life of an actor.

### V2.0: Jobs Entity

**New table:** `jobs`

When an audition reaches `booked` status, the actor creates a Job record. Jobs become the hub for everything post-booking: rehearsals, scripts, contracts, production affiliations.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `audition_id` | uuid (nullable) | Source audition (null for direct bookings) |
| `title` | text | Production name |
| `type` | text | `theater`, `film`, `commercial`, `voiceover`, `other` |
| `venue_or_location` | text | Where |
| `director` | text | Director name |
| `production_company` | text | Production company |
| `role_name` | text | Character/role |
| `status` | text | `active`, `wrapped`, `archived` |
| `start_date` | date | First day |
| `end_date` | date | Last day |
| `compensation` | text | Pay details |
| `contract_id` | uuid (nullable) | Linked analyzed contract |
| `notes` | text | General notes |

**New pages:** `/dashboard/jobs` (list), `/dashboard/jobs/[id]` (detail)

**Impact:** Add `job_id` backlink to `auditions` table. Add "Create Job" action on booked audition cards. Add `active_jobs` count to dashboard stats.

### V2.1: Rehearsal Logs

**New table:** `rehearsal_logs`

Chronological log of rehearsal sessions tied to a job. Captures date, duration, type (table read, blocking, run-through, tech, dress, put-in), director notes, and personal notes.

**New page:** `/dashboard/jobs/[id]/rehearsals` -- timeline view of all rehearsal sessions for a job.

### V2.2: Script Upload and Annotations

**New tables:** `scripts`, `script_annotations`

Actors upload scripts (PDF, TXT, DOCX) to a private Supabase Storage bucket. Scripts are encrypted at rest. No server-side text extraction -- they are opaque blobs.

Annotations are layered on top:
- Page number and line reference
- Type: blocking, character note, director note, emotion, prop, cue, general
- Color coding for visual differentiation
- Free-text content

**New pages:** `/dashboard/jobs/[id]/script` -- in-browser PDF viewer (via `react-pdf`) with annotation sidebar.

**New dependency:** `react-pdf` for in-browser PDF rendering.

**Privacy guarantee:** Actor OS cannot read uploaded scripts. They are stored as encrypted blobs in a private bucket with RLS protection.

### V2.3: Theater vs Film Mode

**Schema change:** Add `preferred_mode` column to `profiles` (`theater`, `film`, `both`; default: `both`).

Dashboard navigation adapts based on mode:
- **Theater mode:** Shows rehearsal logs, hides call sheets (future).
- **Film mode:** Shows call sheets (future), hides rehearsals.
- **Both:** Shows everything.

No breaking changes. Existing users default to "both" and see all features.

### V2 Implementation Order

| Step | Feature | Effort | Dependencies |
|------|---------|--------|-------------|
| V2.0 | Jobs entity | Small | None (foundation) |
| V2.1 | Rehearsal logs | Small | Jobs |
| V2.2 | Scripts and annotations | Medium | Jobs |
| V2.3 | Theater/film mode | Small | Jobs (for type filtering) |

**Total new tables:** 4 (`jobs`, `rehearsal_logs`, `scripts`, `script_annotations`)

---

## Phase 2.5: MCP Server (Late 2026)

**Source:** `SPEC-V2-FEATURES.md`, section 5.

Actor OS should be agent-ready. An AI assistant should be able to manage an actor's career through Actor OS the same way a human uses the dashboard.

### Architecture

- **Package:** `@modelcontextprotocol/sdk`
- **Entry point:** `src/mcp/server.ts` (separate from Next.js)
- **Auth:** MCP session token mapped to a Supabase service role with user_id context.
- **Script:** `npm run mcp` in `package.json`.

### Prerequisite: Service Layer Extraction

Before the MCP server can exist, business logic must be extracted from API route files into shared service functions in `src/lib/services/`. Both API routes and MCP tools will call the same service layer.

### MCP Tools

| Category | Tools |
|----------|-------|
| Auditions | `auditions_list`, `auditions_create`, `auditions_update`, `auditions_search` |
| Jobs | `jobs_list`, `jobs_create`, `jobs_update` |
| Rehearsals | `rehearsals_list`, `rehearsals_create`, `rehearsals_search` |
| Scripts | `scripts_list`, `scripts_upload`, `annotations_list`, `annotations_create` |
| Contacts | `contacts_list`, `contacts_create`, `contacts_update`, `outreach_log` |
| Contracts | `contracts_list`, `contracts_analyze`, `contracts_restrictions` |
| Reminders | `reminders_list`, `reminders_create`, `reminders_complete` |
| Email | `emails_sync`, `emails_pending`, `emails_approve` |
| Meta | `profile_get`, `profile_update`, `stats_dashboard` |

Total: 26 tools covering all core operations.

---

## Phase 3.0: Collaboration + University (2027)

### Cast Collaboration

**Source:** `SPEC-V2-FEATURES.md`, section 4.

**New tables:** `productions`, `production_members`, `production_notes`

Productions are consent-gated groups. Any user creates a production and gets a 6-character invite code. Cast members join by entering the code. The shared space is a bulletin board for production-level information (director notes, schedule changes, reminders). It is not a chat app. No DMs, no threads, no social features.

Each member's personal rehearsal logs and script annotations remain private.

**Key design decisions:**
- Invite code, not email-based invitations. Simpler, no PII sharing.
- Shared notes are production-scoped, not user-scoped. RLS ensures members only see their productions.
- Link to jobs via optional `production_id` on the `jobs` table.

### Stage Manager OS (V3 Seed)

**Source:** `SPEC-V2-FEATURES.md`, section 9.

Three visibility tiers for blocking and rehearsal notes within a production:

| Role | Sees | Can Edit |
|------|------|----------|
| Actor | Own character's blocking only | Own annotations only |
| Stage Manager | All characters, all blocking | Everything (master blocking doc) |
| Director | All characters, schedule overlay | Read-heavy, minimal edits |

**New table:** `production_blocking` with character-tagged, production-scoped blocking notes. RLS policies enforce visibility by checking `production_members.role_type`.

This is not a separate product. It is a role within Actor OS productions. The "Stage Manager OS" name from the original plan refers to this feature set.

**Why Phase 3:** Requires multi-user RLS more complex than simple membership, character-level tagging, and a significant new UX surface (master blocking document, per-scene views, print-friendly exports).

### University Licensing

**Schema:** The `universities` table already exists with fields for name, department, contact info, license tier, student count, active flag, and Stripe subscription ID.

**Three tiers:**

| Tier | Price | Students | Features |
|------|-------|----------|----------|
| Standard | $500/year | Up to 50 | All individual features |
| Premium | $1,200/year | Up to 150 | Individual + admin analytics |
| Enterprise | Custom | Unlimited | Custom integrations |

**Go-to-market:** University of Alabama is the first target. Christian is an alumnus. Pitch: "Actor OS for every student in your department. Track career readiness from freshman year to graduation."

**Implementation needs:**
- University admin dashboard (student management, aggregate analytics).
- Bulk account provisioning.
- University-scoped Stripe subscription (one subscription covers N students).
- Admin analytics: department-wide audition stats, booking rates, career trajectory.

---

## Phase 4.0: Mobile + International (2027+)

### Native Mobile App

The current app is a responsive web application optimized for mobile browsers. A native app would provide:

- Push notifications for deadlines, callbacks, new casting emails.
- Offline access to audition details and call sheets.
- Camera integration for self-tape recording directly within the app.
- Background email sync.

**Technology decision not yet made.** Options include React Native (code sharing with web), Expo, or native Swift/Kotlin.

### Japanese Language Support

Christian is a working actor in Tokyo. Many of his colleagues are Japanese-speaking. Japanese language support would:

- Translate the entire UI.
- Support Japanese casting terminology.
- Handle Japanese yen formatting (already supported via the currency system).
- Parse Japanese-language casting emails (requires Japanese-capable LLM model).

This is a significant localization effort but opens the Japanese acting market as a first-mover advantage.

---

## What Stays the Same Across All Phases

These architectural decisions are locked and will not change:

| Decision | Reason |
|----------|--------|
| Supabase for auth, database, and storage | RLS, real-time capability, generous free tier |
| Stripe for billing | Industry standard, webhook-driven, no alternatives needed |
| LLM provider abstraction (low/high/human tiers) | Provider-agnostic by design; swap via env vars |
| Next.js App Router on Vercel | Serverless, zero-config deployment, scales automatically |
| Row Level Security on every table | Non-negotiable security requirement |
| Hook-based data fetching pattern | Centralized, testable, consistent |
| Cinematic theme system via CSS custom properties | Extensible without code changes |

---

## Data Model Growth

| Phase | Tables | New Tables Added |
|-------|--------|-----------------|
| 1.0 (MVP) | 20 | -- (baseline) |
| 2.0 (V2) | 24 | `jobs`, `rehearsal_logs`, `scripts`, `script_annotations` |
| 3.0 (Collab) | 28 | `productions`, `production_members`, `production_notes`, `production_blocking` |

All new tables follow the same pattern: UUID primary key, `user_id` foreign key (or production-scoped), RLS policies, `created_at` timestamp.

---

## Revenue Milestones

| Milestone | Users | Monthly Revenue | Infrastructure Cost | Trigger |
|-----------|-------|----------------|--------------------|---------|
| Ramen profitable | 10 | $50 | $0 (free tiers) | Covers Stripe fees |
| Infrastructure covered | 12 | $60 | $57 | Supabase Pro + Vercel Pro + LLM |
| Part-time income | 200 | $1,000 | $100 | Hire no one, keep building |
| Full-time income | 1,000 | $5,000 | $590 | 88% margin |
| First university deal | -- | +$500-1,200/year | Minimal | Validates B2B channel |
| Hire first employee | 5,000 | $25,000 | $3,000 | 88% margin at scale |

---

## Open Questions

These are decisions that have not been made and are not blocking any current work:

1. **Mobile technology:** React Native, Expo, or native? Decision deferred until Phase 4.
2. **Usage-based AI pricing:** How to meter contract analyses beyond the included monthly quota. Stripe metered billing is the likely mechanism.
3. **Self-tape video storage:** Where do video files live? Supabase Storage has a 1 GB free tier. At scale, a dedicated video host (Mux, Cloudflare Stream) may be needed.
4. **Notification system:** Email, push, or in-app? Needed for deadline reminders and new casting email alerts.
5. **Multi-language:** Full internationalization framework (i18n) or targeted Japanese translation? Affects component architecture.
6. **Data export:** Actors should be able to export their data (auditions, contacts, earnings) as CSV or PDF. Not yet designed.
