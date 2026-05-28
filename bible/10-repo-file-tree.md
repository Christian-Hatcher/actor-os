# Chapter 10: Repo File Tree

Complete directory structure of the `actor-os` repository as of May 2026. Every file listed here exists in the repository and was read during Bible authorship.

---

## Root

```
actor-os/
  AGENTS.md                          -- Instructions for Claude Code agents
  AUDIT_REPORT.md                    -- Code audit findings
  CLAUDE.md                          -- Points to AGENTS.md
  HERMES_FEEDBACK.md                 -- Design feedback notes
  README.md                          -- Project README
  SETUP.md                           -- Setup instructions
  SPEC-V2-FEATURES.md               -- V2 feature specification (jobs, rehearsals, scripts, cast collab, MCP)
  next-env.d.ts                      -- Next.js TypeScript environment
  next.config.ts                     -- Next.js configuration
  package.json                       -- Dependencies and scripts
  package-lock.json                  -- Lock file
  tsconfig.json                      -- TypeScript configuration
```

---

## Design Handoff

```
  design-handoff/
    IMPLEMENTATION-NOTES.md          -- Build order, theme architecture, new tables, font loading
    README.md                        -- Design handoff overview
    (HTML prototypes from Open Design)
```

---

## Supabase

```
  supabase/
    schema.sql                       -- Full database schema (all tables, RLS, triggers, seed data)
    .temp/
      linked-project.json            -- Supabase project link metadata
    migrations/
      20260528_tax_keeper.sql        -- Tax withholdings table + tax_settings column on profiles
```

---

## Bible

```
  bible/
    README.md                        -- Table of contents (this document set)
    01-what-is-this-product.md
    02-architecture-and-tech-stack.md
    03-data-model.md
    04-roles-and-permissions.md
    05-core-features.md
    06-email-ingestion-pipeline.md
    07-llm-provider-abstraction.md
    08-stripe-and-monetization.md
    09-infrastructure-and-cost.md
    10-repo-file-tree.md
    11-api-contracts.md
    12-frontend-pages.md
    13-roadmap.md
```

---

## Source Code

```
  src/
    middleware.ts                     -- Security headers for /dashboard routes

    app/
      globals.css                    -- Global styles, CSS custom properties
      layout.tsx                     -- Root layout (fonts, ThemeProvider, head script)
      page.tsx                       -- Landing page (marketing, pricing, universities)
      error.tsx                      -- Error boundary page
      loading.tsx                    -- Global loading state
      not-found.tsx                  -- 404 page
      robots.ts                      -- robots.txt generation
      sitemap.ts                     -- sitemap.xml generation

      login/
        page.tsx                     -- Login form (Supabase email/password)

      signup/
        page.tsx                     -- Signup form

      checkout/
        page.tsx                     -- Checkout page (redirects to Stripe)

      seed/
        page.tsx                     -- Development seed data page

      dashboard/
        layout.tsx                   -- Dashboard layout (AuthGuard, bottom nav)
        page.tsx                     -- Dashboard home (delegates to DashboardHome component)

        auditions/
          page.tsx                   -- Auditions list (delegates to AuditionsView)
          [id]/
            page.tsx                 -- Audition detail (delegates to AuditionDetail)

        self-tapes/
          page.tsx                   -- Self-tapes page (delegates to SelfTapesView)

        contracts/
          page.tsx                   -- Contracts page (upload + AI analysis)

        outreach/
          page.tsx                   -- Outreach CRM (contact grid)

        emails/
          page.tsx                   -- Email review queue (parsed audition approval)

        earnings/
          page.tsx                   -- Earnings tracker (overview, goal, tax tabs)

        settings/
          page.tsx                   -- Settings (Gmail, preferences, billing, theme, tax)

        universities/
          page.tsx                   -- University licensing placeholder

      api/
        auditions/
          route.ts                   -- GET (list), POST (create), PUT (update), DELETE

        checkout/
          route.ts                   -- POST (create Stripe checkout session)

        webhook/
          route.ts                   -- POST (Stripe webhook handler)

        portal/
          route.ts                   -- POST (create Stripe billing portal session)

        contracts/
          analyze/
            route.ts                 -- POST (LLM contract analysis)

        gmail/
          auth/
            route.ts                 -- GET (return Google OAuth URL)
          callback/
            route.ts                 -- GET (handle OAuth callback, store tokens)
          sync/
            route.ts                 -- POST (fetch emails from Gmail)
          parse/
            route.ts                 -- POST (parse casting emails with LLM)

    components/
      auth/
        auth-guard.tsx               -- Session check, redirect to /login if unauthenticated

      dashboard/
        accordion-section.tsx        -- Collapsible section with tone variants
        audition-detail.tsx          -- Full audition call-sheet view
        auditions-view.tsx           -- Agenda + calendar dual-view
        bottom-nav.tsx               -- Mobile bottom navigation bar
        dashboard-header.tsx         -- Page header with heading + description
        dashboard-home.tsx           -- Main dashboard (briefing, week strip, accordions)
        dashboard-shell.tsx          -- Dashboard page wrapper
        earnings-chart.tsx           -- SVG area chart for earnings
        earnings-view.tsx            -- Earnings page (overview, goal, tax tabs)
        self-tapes-view.tsx          -- Self-tape card list
        splash.tsx                   -- Cold-open splash animation
        tax-keeper.tsx               -- Tax estimation and savings log UI
        week-strip.tsx               -- 7-day horizontal calendar strip

      theme-provider.tsx             -- ThemeProvider context (CSS variable injection)

      ui/
        badge.tsx                    -- Badge component (shadcn/ui)
        button.tsx                   -- Button component (shadcn/ui)
        card.tsx                     -- Card component (shadcn/ui)
        checkbox.tsx                 -- Checkbox component (Radix)
        error-boundary.tsx           -- Error boundary wrapper
        input.tsx                    -- Input component (shadcn/ui)
        loading.tsx                  -- Loading spinner
        select.tsx                   -- Select component (Radix)
        separator.tsx                -- Separator component (Radix)
        sheet.tsx                    -- Sheet/drawer component
        skeleton.tsx                 -- Skeleton loader
        skeletons.tsx                -- Pre-composed skeleton layouts
        sonner.tsx                   -- Toast notification provider

    hooks/
      use-auth.tsx                   -- AuthProvider, useAuth hook (session, profile, signOut)
      use-data.tsx                   -- Data hooks (useAuditions, useReminders, useSelfTapes, useContacts, useContracts, usePendingApprovals, useAudition, useAuditionGroups)
      use-earnings.tsx               -- Earnings computation hook (buckets, stats, breakdown)
      use-tax.tsx                    -- Tax computation hook (settings, summary, logSavings)

    lib/
      briefing.ts                    -- Deterministic morning briefing composer
      format.ts                      -- Currency formatting, pay parsing, earnings rollup, initials
      llm.ts                         -- LLM provider abstraction (Ollama, Anthropic, OpenAI)
      ribbon.ts                      -- Audition detail ribbon state machine
      stripe-admin.ts                -- Stripe server-side client factory
      stripe-client.ts               -- Stripe client-side loader
      supabase-admin.ts              -- Supabase service-role client factory
      supabase.ts                    -- Supabase browser client
      tax-estimator.ts               -- Multi-jurisdiction tax estimation engine
      themes.ts                      -- Theme definitions, CSS variable mapping, no-flash script
      utils.ts                       -- cn() class name utility
      validation.ts                  -- Zod validation schemas

    types/
      database.ts                    -- Supabase generated database types
      index.ts                       -- Application-level TypeScript interfaces
```

---

## File Counts

| Category | Count |
|----------|-------|
| TypeScript source files (.ts, .tsx) | 56 |
| SQL files (.sql) | 2 |
| Configuration files (json, config) | 4 |
| Markdown documentation | 8 (excluding bible) |
| Total source files | 70 |

---

## Notable Patterns

1. **No `src/lib/services/` directory yet.** Business logic lives in API route files. SPEC-V2-FEATURES.md plans to extract shared service functions when the MCP server is built.

2. **No test files.** Testing infrastructure has not been set up. This is a known gap for Phase 1.5.

3. **Component colocation:** Dashboard components live in `src/components/dashboard/` rather than alongside their page files. This keeps the `app/` directory clean for routing.

4. **Hook-driven data:** All data fetching is centralized in four hook files (`use-auth`, `use-data`, `use-earnings`, `use-tax`). Pages and components never call Supabase directly (except the Settings page which predates the hook pattern).
