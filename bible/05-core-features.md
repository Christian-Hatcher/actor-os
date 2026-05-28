# Chapter 5: Core Features

This chapter walks through every module in Actor OS with enough detail for a developer to understand what exists, how it works, and where the logic lives in code.

---

## 1. Dashboard Home

**Route:** `/dashboard`
**Component:** `src/components/dashboard/dashboard-home.tsx`
**Data hooks:** `useAuth`, `useAuditions`, `useReminders`, `useSelfTapes`, `useContacts`, `useContracts`, `usePendingApprovals`

The dashboard is the first thing an actor sees after login. It is a single scrollable page with a greeting, a prose briefing, a week strip, and an accordion of activity sections.

### Morning Briefing

The briefing is a deterministic, natural-language paragraph built by `src/lib/briefing.ts`. It composes sentences based on real data:

- **Callbacks today:** "You open with a callback for Toyota Commercial in Shibuya -- Yamazaki-san is in the room."
- **Shoots today:** "You're on set today for LOST10 at NHK Studios."
- **Quiet day:** "A quieter day -- 3 active auditions in play, nothing on the floor."
- **Reminders due:** "Self-tape deadline is due by 03:00 PM."
- **Earnings note:** "$2k banked this month, $5k still in play."

Proper nouns are wrapped in `<b>` tags and rendered with an amber underline via CSS. The briefing is always available as a client-side fallback. A future LLM-generated briefing endpoint (`POST /api/briefing/generate`) will provide richer prose.

### Week Strip

`src/components/dashboard/week-strip.tsx` renders a horizontal row of the next seven days. Each day shows dot indicators for auditions (amber for callbacks, blue for submitted, green for booked) and reminders.

### Accordion Sections

Seven collapsible sections, each with a title, a meta count, and expandable content:

| Section | Meta Display | Content |
|---------|-------------|---------|
| Auditions | "X active" | Count of callbacks, submitted; up to 5 this-week audition rows with project name, role, location, status chip |
| Earnings | "$Xk / $Yk" (banked / total) | Banked vs potential summary, link to full earnings view |
| Self-tapes | "X due" | Up to 4 tape cards with deadline, scene partner, due-today highlighting |
| Contracts | "X to review" | First contract title, red flag count if any |
| Outreach | "X to follow up" | First contact name, days since last contact |
| Relationships | "X notes" | Placeholder for Obsidian-style notes graph (coming soon) |
| Needs Approval | "X pending" | Count of parsed emails ready for one-tap review |

The accordion tone changes based on urgency: red border for items due today, amber for active items, default for informational.

---

## 2. Casting Pipeline

**Route:** `/dashboard/auditions` (list), `/dashboard/auditions/[id]` (detail)
**Components:** `auditions-view.tsx`, `audition-detail.tsx`
**Data hooks:** `useAuditions`, `useAuditionGroups`, `useAudition`

### Audition Status State Machine

Every audition has a `status` field that follows this state machine:

```
submitted --> callback --> booked --> wrapped/archived
    |             |           |
    +-- passed    +-- passed  +-- passed
    +-- archived  +-- archived
    +-- pinned (starred, stays active)
```

Valid statuses: `submitted`, `callback`, `pinned`, `booked`, `passed`, `archived`.

The `isActiveAudition()` helper in `src/lib/format.ts` defines active statuses as `submitted`, `callback`, and `pinned`. Passed and archived auditions are considered inactive.

### Agenda View

The default view groups auditions chronologically into sections: "Today", "Tomorrow", "This Week", "Next Week", "Later", "Past". Each row shows:

- Time label (callback time or weekday)
- Project name (serif, large)
- Meta line: role, location, agency
- Status chip (colored pill: amber=callback, blue=submitted, green=booked, grey=passed)
- Compensation if present
- Colored left border indicating status

### Calendar View

A full month calendar grid (Monday-start) where each day cell shows:

- Day number
- Color tint: amber for callbacks, blue for submitted, green for booked
- Status label or event count for days with multiple auditions
- Clicking a day shows that day's auditions below the calendar

A legend shows the three color codes. Navigation arrows move between months.

### Filter and Search

A search bar filters by project name, role name, or agency. Filter chips for All, Callback, Submitted, Booked, and Past show counts and toggle filtering.

### Audition Detail Page

The detail view is a call-sheet-style page with:

- **Poster area:** Gradient background with project name, role, and agency overlaid
- **Ribbon:** Live status indicator (see Ribbon State Machine below)
- **Time and pay:** Large serif call time, estimated wrap, and compensation
- **Call sheet rows:** Role, location, casting director, agency, call time, wrap time, contract link
- **Director's note:** Expandable briefing panel with audition notes
- **Action bar:** Five buttons -- Briefing (toggle), Call, Text, Email, Maps
- **Primary CTA:** "On my way" (for callbacks -- texts the casting director and opens maps) or "Add to wallet pass" (for booked shoots)

### Ribbon State Machine

`src/lib/ribbon.ts` drives the live header ribbon on the audition detail page. It re-renders every 60 seconds and computes state from the audition's dates and times:

| Condition | Tone | Text | Pulse |
|-----------|------|------|-------|
| Booked shoot in the future | Green | "Shoots Wed 3d" | Yes |
| Shoot day, past estimated wrap | Amber | "OT 1h 23m" + owed amount | Yes |
| Shoot day, in progress | Amber | "In progress" | Yes |
| Target within 15 minutes | Red | "Starting now" | Yes |
| Target within 60 minutes | Amber | "Starts in 45m" | Yes |
| Target today, more than 1 hour away | Amber | "Today at 2:30 PM" | Yes |
| Target has passed | Grey | "Wrapped -- rate this audition" | No |
| No relevant dates | None | (hidden) | No |

The overtime calculation uses: `(minutes past wrap / 60) * (compensation / 8h day) * ot_rate_multiplier`.

---

## 3. Self-Tape Partner

**Route:** `/dashboard/self-tapes`
**Component:** `src/components/dashboard/self-tapes-view.tsx`
**Data hook:** `useSelfTapes`

Each self-tape is a card with three states:

| State | Visual | Actions |
|-------|--------|---------|
| `empty` | Hatched placeholder with camera icon, "not recorded" | "Record now", "Upload" |
| `draft` | Video preview with play button, "draft" badge | "Review and submit", "Reshoot" |
| `submitted` | Green-tinted card, "Submitted" chip | "Re-watch"; if feedback received: "Open callback" |

Cards due today get a red-tinted background and a "flag" chip with the date. Cards with casting director feedback show it in a green callout box labeled "CD feedback".

The header shows "{X} due, {Y} total" with a pulsing green dot.

---

## 4. Contract Reader Agent

**Route:** `/dashboard/contracts`
**Component:** `src/app/dashboard/contracts/page.tsx`
**API:** `POST /api/contracts/analyze`

The contract page shows an upload zone and a list of contracts. Each contract card shows:

- **Status badge:** "Uploaded" (blue), "Analyzing" (yellow with spinner), "Reviewed" (green with checkmark)
- **Summary:** AI-generated 2-3 sentence plain English summary
- **Key clauses:** Payment terms, usage rights, exclusivity, term/duration, cancellation
- **Red flags:** Red callout box listing concerning clauses
- **Questions:** Blue callout box with questions to ask an agent or lawyer
- **Overall grade:** A through F based on fairness to the actor

The analysis uses `llm("high", ...)` -- the strongest available model -- with a structured JSON prompt that extracts summary, key clauses, red flags, questions, restrictions, compensation, schedule, and an overall grade with reasoning.

Contract restrictions (NDA, social media bans, exclusivity) are extracted and stored in the `contract_restrictions` table with platform applicability and date ranges.

---

## 5. Outreach CRM

**Route:** `/dashboard/outreach`
**Component:** `src/app/dashboard/outreach/page.tsx`
**Data:** Direct Supabase queries on `contacts` table

A searchable grid of contact cards. Each card shows:

- Name, company, role badge
- Priority stars (0-5)
- Email, phone, last contact date
- AI-generated notes (from Gmail sync contact auto-creation)
- Action buttons: Email, Log

Contacts are auto-created when the Gmail sync detects a new sender. The LLM generates a one-sentence description via fire-and-forget `llm("low", ...)` call. Contacts are sorted by priority (descending) then last contact date (descending).

Follow-up detection: The dashboard home counts contacts where `last_contact_date` is null or more than 7 days ago.

---

## 6. Tax Keeper

**Route:** `/dashboard/earnings` (Tax tab)
**Component:** `src/components/dashboard/tax-keeper.tsx`
**Engine:** `src/lib/tax-estimator.ts`
**Data hook:** `useTax`

The Tax Keeper is a tab within the Earnings page. It provides:

### Hero Number

"Set aside this month: $X" -- the estimated tax liability for the current month's gross income, displayed in a large amber serif font.

### Year-to-Date Summary Card

Four stats in a 2x2 grid:

- **Total earned** (year to date gross)
- **Tax owed (estimated)** (red)
- **Actually saved** (green)
- **Surplus or shortfall** (green if ahead, red if behind)

A progress bar shows saved versus owed with an "On track" or "Behind" label.

### Tax Breakdown

Itemized breakdown by jurisdiction. For US users: self-employment tax, federal income tax, state tax. For Japan: withholding (gensenchoushu). For UK: income tax, National Insurance.

### Monthly Savings Log

A row per month showing gross income, estimated tax owed, and an editable "actually set aside" field. The actor can log what they actually put away each month. A diff column shows surplus or shortfall per month.

### Supported Jurisdictions

| Jurisdiction | Method |
|-------------|--------|
| United States | Self-employment tax (12.4% SS capped at $176,100 + 2.9% Medicare) + federal brackets (2026 approximate) + state rate |
| Japan | Gensenchoushu: 10.21% on first 1,000,000 yen, 20.42% above |
| United Kingdom | Income tax bands + Class 4 National Insurance |
| Australia, Canada, Other | 25% flat estimate |
| Manual override | Any user can set a flat percentage from their accountant |

All filing statuses are supported for US: Single, Married Filing Jointly, Married Filing Separately, Head of Household.

### Tax Nudge

`taxNudgeAmount(bookingPay, settings)` calculates a per-booking nudge: "Set aside $X from this job for taxes." This appears after a job is booked (controlled by `tax_savings_reminder` setting).

---

## 7. Earnings Tracker

**Route:** `/dashboard/earnings`
**Component:** `src/components/dashboard/earnings-view.tsx`
**Data hook:** `useEarnings`

Three tabs: Overview, Goal, Tax.

### Overview Tab

- **Hero number:** Total banked amount in large green serif with currency symbol
- **Delta:** Percentage change from last month, with arrow indicator
- **Area chart:** Banked (solid green) and potential (dashed) lines over time
- **Stat strip:** Horizontal scroll with Booked count, Pending count, Passed count, OT total
- **Month strip:** Horizontal scroll of month cards showing banked amount, progress bar (banked vs potential), and month-over-month delta
- **Breakdown table:** Per-project rows with project name, role, compensation, and status chip. Booked = green text, passed = red strikethrough.

Range selector: 3 months, 6 months, or Year to Date.

### Goal Tab

- **Ring chart:** SVG donut showing percentage toward yearly goal
- **Stats:** Average per month, target per month, booked count, book rate
- **Prompt:** "Set a yearly goal in settings to track your pace" if no goal is set

### Currency Support

Six currencies are supported: USD ($), JPY (yen), GBP (pound), AUD (A$), CAD (C$), EUR (euro). The active currency is set from the user's profile and affects all formatting throughout the app. JPY does not show decimal places; all others do.

The `parsePay()` function handles free-text compensation strings including Japanese wan (10,000 yen) shorthand: "15万" becomes 150,000.

---

## 8. Email Ingestion (Review Queue)

**Route:** `/dashboard/emails`
**Component:** `src/app/dashboard/emails/page.tsx`

The review queue shows parsed auditions from the Gmail pipeline (see Chapter 6 for the full pipeline). Each card shows:

- Subject line and confidence badge (green >= 70%, yellow >= 40%, red < 40%)
- From name and received date
- AI-generated summary
- Review reason (if flagged)
- Key fields: project, role, agency, deadline
- Expandable details: casting director, location, compensation, shoot date, callback date, notes
- Three action buttons: **Add** (creates audition), **Reply** (marks as needs response), **Skip** (dismisses)

Cards are sorted by confidence score descending. When the user taps "Add", an audition is created from the extracted fields and the parsed_audition record is marked as reviewed.

---

## 9. Settings

**Route:** `/dashboard/settings`
**Component:** `src/app/dashboard/settings/page.tsx`

Five settings cards:

1. **Gmail Connection:** Connect/disconnect Gmail, sync status, sync button
2. **Audition Preferences:** Career goal (4 options), priority rankings (5 factors, 1-5 scale), preferred project types (checkboxes), minimum compensation, preferred locations, willing-to-travel toggle, bio context textarea
3. **Subscription:** Plan info, status badge, billing portal link
4. **Appearance:** Theme picker (Cinematic Dark, Light Ivory), currency selector (6 currencies)
5. **Tax Settings:** Jurisdiction (6 options), US filing status (4 options, shown only for US), state tax rate, manual rate override, tax savings reminder toggle
6. **Account:** Sign out button

---

## 10. Theme System

**Source:** `src/lib/themes.ts`, `src/components/theme-provider.tsx`

Two built-in themes:

| Theme | Background | Text | Accent |
|-------|-----------|------|--------|
| Cinematic Dark | #0a0908 | #f4efe6 | #e8a755 (amber) |
| Light Ivory | #eaeef2 | #1a2230 | #a37314 (amber) |

Each theme defines 14 color tokens. These are mapped to CSS custom properties and also remapped to shadcn/ui semantic tokens (--background, --foreground, --card, etc.) so existing Radix-based components inherit the theme automatically.

A no-flash script (`themeNoFlashScript()`) is injected into the document `<head>` to read the theme from localStorage and apply CSS variables before first paint, preventing a flash of the default theme on reload.

Users can set theme via Settings. Custom themes (stored as `custom_theme` JSONB on profiles) are supported in the resolver but not yet exposed in the UI.
