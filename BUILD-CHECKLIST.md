# Actor OS — Ship Build Checklist

This is the ordered build checklist for taking Actor OS from current state to shippable product. Design references live in `design-handoff/`. Every task references the relevant design file and existing code.

---

## Phase 0: Foundation (Do First)

- [ ] **0.1 Supabase migration** — Run schema additions before touching any UI
  - Add to `profiles`: `theme_id TEXT DEFAULT 'cinematic'`, `custom_theme JSONB`, `splash_photo_url TEXT`, `splash_mode TEXT DEFAULT 'headshot'`, `currency TEXT DEFAULT 'USD'`, `city TEXT`, `monthly_goal INTEGER`, `yearly_goal INTEGER`
  - Add to `auditions`: `compensation_amount INTEGER` (cents), `compensation_currency TEXT DEFAULT 'USD'`, `compensation_confirmed BOOLEAN DEFAULT false`, `est_wrap_time TIMESTAMPTZ`, `ot_rate_multiplier NUMERIC DEFAULT 1.5`, `call_time TIMESTAMPTZ`, `wrap_time TIMESTAMPTZ`
  - Create `earnings_summary` view (materialized or function) that aggregates auditions by month into banked vs potential
  - Create `overtime_log` table: `id, user_id, audition_id, shoot_date, minutes_overtime, hourly_rate, multiplier, calculated_amount, paid BOOLEAN, paid_date`
  - Create `tax_withholdings` table: `id, user_id, year, month, gross_income INTEGER, tax_rate NUMERIC, estimated_tax INTEGER, actually_set_aside INTEGER, notes TEXT, created_at, updated_at`
  - Wire `self_tapes` table in Supabase (currently mock data only — table may not exist yet)
  - Wire `contracts` table in Supabase (currently mock data only)

- [ ] **0.2 Design tokens + theme system**
  - Create `src/lib/themes.ts` with `ActorOSTheme` interface and preset themes (Cinematic Dark, Light Ivory, Backstage Warm)
  - Replace `globals.css` color variables with new token system (`--bg`, `--bg2`, `--bg3`, `--paper`, `--paper-dim`, `--paper-faint`, `--rule`, `--rule-strong`, `--green`, `--amber`, `--blue`, `--red`, `--purple`)
  - Create `src/hooks/use-theme.tsx` — reads theme from profile, injects CSS vars into `:root`, provides `setTheme()`
  - Wrap app in `ThemeProvider` in `layout.tsx`
  - Ref: `design-handoff/README.md` (Design Tokens section)

- [ ] **0.3 Font swap**
  - Add Instrument Serif (400 + italic) via `next/font/google`
  - Add JetBrains Mono (400, 500, 600) via `next/font/google`
  - Keep Inter (or swap Geist Sans for Inter — they're nearly identical)
  - Set CSS variables: `--font-serif`, `--font-sans`, `--font-mono`
  - Ref: `design-handoff/README.md` (Typography section)

---

## Phase 1: Shell + Navigation

- [ ] **1.1 Replace sidebar with bottom nav**
  - New component: `src/components/dashboard/bottom-nav.tsx`
  - 5 tabs: Today (Home icon), Auditions (Clapperboard), Tapes (Video), Earnings (BarChart3), Me (User)
  - Active tab tints amber. Thin-stroke icons + tiny mono labels.
  - Desktop: keep slim left sidebar option (collapsible) + bottom nav on mobile
  - Kill `mobile-nav.tsx` Sheet component (replaced by bottom nav)
  - Ref: `design-handoff/01_Dashboard.html` (bottom nav section)

- [ ] **1.2 Update dashboard-shell.tsx**
  - Add headshot/avatar circle to greeting area (pull from `profile.avatar_url`)
  - Update header to show location + date meta-line (`TUE · 27 MAY · TOKYO`)
  - Apply new color tokens throughout

---

## Phase 2: Core Screens

- [ ] **2.1 Dashboard home redesign**
  - Replace stats cards + two-column layout with morning briefing design
  - Greeting block with avatar, date meta-line, live dot
  - Static briefing card (hardcode prose for now — LLM endpoint is Phase 4)
  - 7-day week strip with today inverted and event count dots
  - Accordion sections: Auditions, Earnings, Self-tapes, Contracts, Outreach (each shows count + expands inline)
  - Persist accordion state in localStorage, reset daily
  - Ref: `design-handoff/01_Dashboard.html`

- [ ] **2.2 Earnings page (NEW — the big one)**
  - New route: `src/app/dashboard/earnings/page.tsx`
  - Add to nav
  - New hook: `src/hooks/use-earnings.ts` — queries auditions grouped by month, splits into banked (compensation_confirmed=true) vs potential
  - Hero number: total banked this month in big green serif + delta vs last month
  - Area chart (use recharts or visx — already in Next.js ecosystem):
    - Green solid area = banked cumulative
    - Gray dashed line = potential
  - Stat strip: Booked count (green), Pending count, Passed count (red), OT total (amber)
  - Month strip: horizontal scroll of month cards with amount + fill bar + delta arrow
  - Breakdown card: list of projects contributing to selected month
  - Ref: `design-handoff/06_Earnings.html`

- [ ] **2.3 Tax Keeper (NEW)**
  - New section on Earnings page OR new route: `src/app/dashboard/earnings/taxes/page.tsx`
  - **Tax estimation logic** (`src/lib/tax-estimator.ts`):
    - User sets their tax jurisdiction in Settings (US federal + state, Japan, UK, etc.)
    - For US: estimate using current self-employment tax brackets (15.3% SE + federal income brackets)
    - For Japan: estimate using freelancer/contractor withholding rates
    - Allow manual tax rate override ("I know my rate is 30%")
    - Calculate per-month: `gross_income * effective_tax_rate = estimated_tax_owed`
  - **Tax dashboard UI**:
    - Hero: "Set aside this month: $X" in amber serif — the number they need to save
    - YTD summary: total earned, total tax estimated, total actually set aside, shortfall/surplus
    - Monthly breakdown table: each month shows gross, estimated tax, what they actually set aside, difference
    - Visual: progress bar showing "saved vs owed" — green if ahead, red if behind
    - "Log savings" button: actor manually logs how much they put into their tax savings account that month
    - Smart nudge: if they book a new job, show a toast: "Nice! Set aside ~$X from this one for taxes."
  - **Settings fields**:
    - `tax_jurisdiction`: dropdown (US, Japan, UK, Australia, Canada, Other)
    - `tax_filing_status`: (US: single, married_joint, married_separate, head_of_household)
    - `state_tax_rate`: for US state taxes (or auto-lookup by state)
    - `manual_tax_rate`: override if they know their rate
    - `tax_savings_reminder`: boolean — show nudge on new bookings
  - Store in `tax_withholdings` table (created in Phase 0)

- [ ] **2.4 Auditions list redesign**
  - Replace flat card list with agenda view (day-grouped, serif date headers, time column, status stripes)
  - Keep search + filter chips (restyle to new design)
  - Status chips: new mono uppercase style with tinted backgrounds
  - "Awaiting reply" group sorts last
  - Cut calendar month view for v1 (agenda only)
  - Ref: `design-handoff/04_Auditions_List.html`

- [ ] **2.5 Audition detail page (NEW)**
  - New route: `src/app/dashboard/auditions/[id]/page.tsx`
  - Poster/still area with status badge
  - Time + pay two-column row
  - Mini call-sheet (3 rows: Role, Location, Casting)
  - Action bar: Briefing, Call, Text, Email, Maps (icons + mono labels)
  - Cut "On my way" and OT timer for v1 — just show the detail info
  - Ref: `design-handoff/03_Audition_Detail.html`

- [ ] **2.6 Wire self-tapes to Supabase**
  - Kill MOCK_TAPES array
  - Create `src/hooks/use-self-tapes.ts` hook
  - Card states: empty (not recorded), draft (has video, not submitted), submitted
  - Upload to Supabase Storage
  - Cut recording UI for v1 — upload only
  - Ref: `design-handoff/05_Self_Tapes.html`

- [ ] **2.7 Wire contracts to Supabase**
  - Kill MOCK_CONTRACTS array
  - Create `src/hooks/use-contracts.ts` hook
  - Upload to Supabase Storage, trigger AI analysis via existing `/api/contracts/analyze`
  - Keep existing reviewed/analyzing/uploaded states

---

## Phase 3: Settings + Polish

- [ ] **3.1 Settings page**
  - Theme picker: show 3 preset themes with live preview swatches
  - Profile section: avatar upload, name, agency, city, currency
  - Tax settings: jurisdiction, filing status, tax rate (manual override)
  - Calendar connection placeholder (disabled, "Coming soon")
  - Subscription management (existing Stripe portal link)
  - Notification preferences

- [ ] **3.2 Compensation input flow**
  - When adding/editing an audition, make compensation entry prominent
  - Two fields: amount (number) + confirmed toggle (yes = banked, no = potential)
  - This feeds the entire earnings + tax system — if people don't enter pay, everything downstream is empty
  - Consider: auto-parse compensation from email sync (already in parsed_auditions.extracted_fields.compensation)

- [ ] **3.3 Landing page reskin**
  - Apply new cinematic tokens to the marketing page
  - Update screenshots/demos to show new UI
  - Keep pricing and university sections as-is

- [ ] **3.4 Empty states**
  - Every screen needs a good empty state in Instrument Serif italic
  - Earnings empty: "Book your first gig and watch this come alive."
  - Auditions empty: "Your pipeline starts with one submission."
  - Self-tapes empty: "Lights, camera... upload your first tape."

---

## Phase 4: Post-Ship Enhancements (Not Blocking Launch)

- [ ] AI daily briefing endpoint (`/api/briefing/generate`)
- [ ] Splash cold-open animation
- [ ] Calendar month view (dual-view toggle)
- [ ] "On my way" + maps integration
- [ ] OT timer on audition detail (booked state)
- [ ] Goal mode on earnings page
- [ ] Recording UI for self-tapes (camera + script drawer)
- [ ] Custom theme editor (color pickers per token)
- [ ] Wallet pass generation
- [ ] Google/Apple Calendar MCP sync
- [ ] Relationships/notes (Obsidian-style)
- [ ] Tax projection: "At this pace, you'll owe $X by April 15"

---

## Technical Notes

### Libraries to Add
```bash
npm install recharts framer-motion
# recharts for earnings chart
# framer-motion for page transitions + accordion animations
```

### Key Principle
Every component uses CSS variables (`var(--bg)`, `var(--paper)`, etc.) — NEVER hardcoded hex values. This is what makes the theme system work. If you see a raw color in the code, it's a bug.

### Data Flow for Earnings + Taxes
```
Audition created (with compensation)
  → compensation_confirmed = false (potential)
  → Actor books the job → compensation_confirmed = true (banked)
  → Earnings hook aggregates by month
  → Tax estimator calculates withholding on banked amount
  → Tax dashboard shows "set aside $X"
  → Actor logs what they actually saved
  → End of year: total owed vs total saved = surplus or shortfall
```

### Test Checklist Before Ship
- [ ] Can sign up, subscribe, and access dashboard
- [ ] Can add an audition with compensation
- [ ] Can mark audition as booked (flips to banked earnings)
- [ ] Earnings page shows correct banked vs potential
- [ ] Tax keeper shows correct estimated withholding
- [ ] Can upload a self-tape
- [ ] Can upload and analyze a contract
- [ ] Gmail sync parses emails into review queue
- [ ] Theme switcher works (dark/light minimum)
- [ ] Mobile responsive on all screens
- [ ] Empty states render correctly on fresh account
