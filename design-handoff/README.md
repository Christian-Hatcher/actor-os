# Handoff: ActorOS

## Overview

ActorOS is a full-service mobile-first app for working actors. It combines **audition tracking, self-tape recording, earnings analytics, and casting-relationship management** into a single cinematic, type-led interface aimed at actors who think in stories — not stat blocks.

This handoff covers the six hi-fi screens designed in this round: **Dashboard** (briefing + accordion sections), **Splash motion** (cold-open animation), **Audition detail**, **Auditions list** (agenda + calendar), **Self-tapes**, and **Earnings**.

The existing codebase (Next.js + Supabase + Stripe + Gmail integration, shadcn/ui) provides the data layer. This redesign replaces the bland monochrome shell with a warm, cinematic ivory/near-black system anchored on **Instrument Serif** italic for voice and **JetBrains Mono** for call-sheet metadata.

---

## About the Design Files

The files in this bundle are **design references created in HTML** — high-fidelity prototypes showing intended look and behavior, **not production code to copy directly.**

The task is to **recreate these HTML designs in the existing Next.js codebase** (`uploads/actor-os-frontend/`) using its established patterns:
- React with App Router
- Tailwind CSS with the new color system below replacing the existing `#171717 / #f5f5f5` neutrals
- shadcn/ui components extended with the new color tokens
- Lucide React icons (the inline SVGs in the prototypes are placeholders — swap for Lucide equivalents)
- Existing Supabase queries via `use-data.tsx` hooks

If a screen has no existing equivalent in the current codebase (e.g., the splash, the earnings page, the day drilldown), build it new using the same conventions as the other dashboard pages.

---

## Fidelity

**High-fidelity (hifi).** Pixel-perfect mockups with final colors, typography, spacing, motion timings, and interactions. The developer should recreate the UI as closely as possible using the codebase's existing libraries and patterns.

---

## Design Tokens

Add these to `tailwind.config.ts` (replacing or extending the existing neutrals) and to `globals.css` as CSS variables.

### Colors

| Token | Hex | Role |
|---|---|---|
| `--bg` | `#0a0908` | Page background (warm near-black) |
| `--bg2` | `#141210` | Surface 1 (card backgrounds inside scroll containers) |
| `--bg3` | `#1c1916` | Surface 2 (deeper insets) |
| `--paper` | `#f4efe6` | Primary text (warm paper white) |
| `--paper-dim` | `#a8a298` | Secondary text |
| `--paper-faint` | `#6e6a62` | Tertiary text / labels |
| `--rule` | `#26231f` | Hairline dividers |
| `--rule-strong` | `#36322c` | Stronger borders |
| `--green` | `#3aa86b` | Banked money, booked status, signed contracts, success |
| `--green-glow` | `rgba(58,168,107,.14)` | Soft green halo |
| `--amber` | `#e8a755` | Callback, today, live ribbon, briefing highlight |
| `--blue` | `#6ab3e8` | Submitted / passive |
| `--red` | `#e8625a` | Urgent, overdue, passed, red flag |
| `--purple` | `#b69de0` | Personal events (costume, doctor, training) |

### Light theme (alt — opt-in)
| Token | Light Ivory |
|---|---|
| `--bg` | `#eaeef2` |
| `--bg2` | `#dee3e9` |
| `--paper` | `#1a2230` |
| `--paper-dim` | `#4a5468` |
| `--rule` | `#b7c0cf` |
| `--amber` (light) | `#a37314` |
| `--green` (light) | `#1c7a4a` |

Light mode is **default off**. The cinematic spec is dark-first.

### Typography

| Family | Use |
|---|---|
| **Instrument Serif** (Google Fonts, `wght 400`, italic available) | Big numbers, page titles, briefing prose, project titles, primary CTAs. Use italic for second-line subtitles. |
| **Inter** (Google Fonts, `wght 300, 400, 500, 600, 700`) | Body, button labels, secondary text |
| **JetBrains Mono** (Google Fonts, `wght 400, 500, 600`) | Call-sheet keys, dates/times, mono metadata, status pills, ribbon countdowns, fine print |

**Type scale (mobile, 380px frame):**
- Page title H1: `40px / line-height 1 / letter-spacing -0.015em` Instrument Serif
- Section title: `22px serif`
- Hero number (earnings): `64px serif tabular`
- Project title in list: `22px serif`
- Body italic (briefing): `18px Instrument Serif italic / 1.5`
- Body (general): `13–14px Inter / 1.55`
- Mono labels: `9–11px JetBrains Mono / .14–.22em letter-spacing / uppercase`

**Desktop scales up roughly 1.4×** — page titles 56px, hero numbers 96px.

### Spacing

- **22px** horizontal page padding on all phone scroll containers (matches dashboard, audition detail, earnings, etc.).
- **14px** between section cards
- **18px** vertical padding on list rows
- **14px** card border-radius
- **10px** card border-radius for sub-cards
- **30px** border-radius for pills/chips/buttons

### Borders & shadows

- Hairline: `1px solid var(--rule)`
- Stronger: `1px solid var(--rule-strong)`
- Card shadow (device frames only): `0 30px 80px rgba(0,0,0,.5)` + inner highlight
- No drop shadows on inline UI — rely on borders and color contrast.

### Status chip pattern

```html
<span class="chip cb">CB</span>     <!-- Callback amber -->
<span class="chip sub">SUB</span>   <!-- Submitted blue -->
<span class="chip bk">BK</span>     <!-- Booked green -->
<span class="chip flag">2 FLAGS</span> <!-- Red flag -->
<span class="chip pers">PERS</span> <!-- Personal purple -->
```

Common CSS (each variant overrides color, border, background with a tinted `rgba()` of its accent):
```css
.chip {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--mono); font-size: 9.5px;
  letter-spacing: .14em; text-transform: uppercase;
  padding: 3px 8px; border-radius: 30px;
  white-space: nowrap; flex-shrink: 0;
  background: rgba(255,255,255,.05); color: var(--paper-dim);
  border: 1px solid var(--rule);
}
```

---

## Screens / Views

### 1. Dashboard (`01_Dashboard.html`)

**Purpose**: The actor's morning briefing. Replaces the existing `/dashboard` page.

**Layout** (mobile, top → bottom):
1. **Greeting block** — meta-line (`TUE · 27 MAY · TOKYO` with live green dot) + `Good morning, Christian.` (avatar circle on the right).
2. **Prose briefing card** — amber-tinted, italic Instrument Serif paragraph 60–110 words. Names highlighted with a soft amber underline (`linear-gradient(180deg, transparent 65%, rgba(232,167,85,.22) 65%)`). Two CTAs underneath: `Open day →` (filled paper) and `Snooze` (ghost).
3. **Week strip** — 7-day grid, today inverted to paper background, dots underneath show event count.
4. **Section accordion** — collapsed by default. Each row: serif title + mono meta + plus icon. Sections:
   - Auditions (count: active)
   - Earnings (count: banked / potential)
   - Self-tapes (count: due — turns red if any due today)
   - Contracts (count: to review — red if flags)
   - Outreach (count: to follow up)
   - Relationships (count: notes — *future feature, Obsidian-style notes layer*)
   - Needs approval (count: pending — multi-source: email/text/agent forward)

**Interactions**:
- Briefing CTA `Open day →` → Day drilldown screen (not in this round, build later)
- Each accordion row toggles its body inline. Multiple can be open at once. State persists per-session in localStorage; resets to fully collapsed the next morning.
- Earnings row expanded shows a mini area chart (banked vs potential)
- Auditions row expanded shows a 5-row audition list (date markers like `27 Tue / 28 Wed / 30 Fri`)
- Tapping any item navigates to its detail page

**Briefing voice (LLM system prompt for generation)**:
> You are the actor's stage manager. Write a single short paragraph (60–110 words) describing their day. Bold every proper noun (project name, role, location, contact name) with `<b>`. End with a one-line earnings note. No bullet lists. No emojis. Talk to them, not about them.

Run server-side on dashboard load. Cache for 1 hour, invalidate on data change.

**Bottom nav (News-app style)**: Today · Auditions · Tapes · Earnings · Me. Thin-stroke icons + tiny labels. Active tab tints amber. Reads less app-y, more editorial.

---

### 2. Splash motion (`02_Splash_Motion.html`)

**Purpose**: Cold-open animation, plays on **first cold-open of the day only**. Persist `last_splash_date` in localStorage; skip if it equals today.

**Animation sequence (5.0s loop, 2.5s splash + 0.6s hold + 1.2s cross-fade):**

| Beat | Time | Effect |
|---|---|---|
| Letterbox bars | 0.0–0.55s | Top + bottom black bars draw in vertically with `easeOutQuart`, height 0→44px |
| Photo | 0.3–1.5s | Full-bleed photo fades in `easeOutCubic` 0→1, scale `easeOutQuart` 1.06→1.0 |
| Slate metadata | 0.8–1.6s | `SCN 01 · TK 03 / 23.976 FPS` (top), `1.85:1 / TYO · 27 MAY / ACTOROS` (bottom) — char-by-char typed reveal in JetBrains Mono 8.5px |
| AO mark | 1.3–2.4s | Bottom-left Instrument Serif 120px, **letterspaced 60px → -6px with `easeInOutQuart`** (the signature gesture). y-translate 14→0 |
| Subtitle | 1.9–2.6s | `A C T O R · O S` letterspaced .42em, `tap to begin` mono on right |
| Cross-fade to dashboard | 3.2–4.4s | Opacity blend over 1.2s. Greeting fades up at 3.5s, briefing card at 3.9s |

**Photo**: Pulled from `profile.avatar_url` (or new `splash_photo_url` field — see below). Falls back to hatched placeholder. Onboarding lets the actor pick one of three modes: headshot / on-set still / stage still.

**Triggers**:
- First cold-open of the day. Subsequent opens of same day skip directly to dashboard.
- Tap anywhere mid-sequence to skip.

**Audio**: Default **off**. Settings can enable: faint film-reel click on bar reveal, low sustained tone under photo, click-clack as slate text types.

**Implementation note**: The prototype uses `animations.jsx` (a custom timeline + Stage component, included in this bundle for reference). In production, use Framer Motion or a CSS keyframe sequence — whichever fits the codebase. The Stage component's `useTime()` hook is the simplest reference for the timeline math.

---

### 3. Audition detail (`03_Audition_Detail.html`)

**Purpose**: The call-sheet page for a single audition. Daily-driver screen. Replaces existing audition card detail.

**Layout (Lean default — Callback state)**:
1. **Head row** — back link + amber live ribbon `starts in 1h 12m` (pulsing dot)
2. **Poster** — 4:3 placeholder (or actual still). Status badge top-left (`Callback` amber). Project title bottom-left in Instrument Serif italic; agency credit below in mono.
3. **Time + pay row** — two columns:
   - Left: `Callback · start` label / `Tue 27 May` date / **`10:30`** big serif (just the start time)
   - Right: `Pay` label / **`¥220,000`** big serif green
4. **Mini call-sheet** — 3 rows only: Role, Location, Casting. Mono key / Inter value. Hint below: *"tap briefing for full call-sheet, notes, sides"*
5. **5-button action bar** — Briefing (amber, document icon) · Call · Text · Email · Maps. Each button is icon + tiny mono label.
6. **Primary CTA** — `On my way →` (filled paper, large serif)
7. Caption underneath: `texts CD · shares ETA · opens maps`

**Briefing expanded state** (when user taps Briefing button):
- Same head + poster + time + pay
- Below the time/pay row: amber dashed divider labeled `BRIEFING`
- Full 6-row call-sheet (Role, Location, Casting, Agency, Shoot, Wardrobe)
- Director's note (amber-tinted card, italic body)
- Sides & brief panel (3 file rows with PDF/MP4 icons + open buttons)
- CD card (avatar + name + last contact mono)
- Action bar with Briefing now showing `Hide` (filled amber `.on` state)
- Same OMW CTA

State persists per-audition (`audition_briefing_expanded_<id>` in localStorage).

**Booked state**:
- Ribbon flips green: `Shoots Fri · 3d`
- Badge: `Booked`
- Time/pay row gains a `est. wrap 18:30 · 11h 30m` line under the start time
- Call-sheet adds: Call time, Wrap, Contract status (`Signed · 22 May ✓`)
- Notes card → pre-shoot checklist (different tint)
- People panel expands to production team (1st AD, stunt coord, etc.)
- Primary CTA → `Add to wallet pass →` (green)
- **OT timer (post-wrap)**: When live shoot crosses wrap time, the green ribbon flips to:
  ```
  ● OT · 1h 12m  | +¥48,000
  ```
  Amber. Auto-counts from wrap estimate. Math: `(now − wrap) × base_rate × 1.5`. Pings AD/agent at +1h / +2h / +3h. Rolls into Earnings when shoot day closes.

**Ribbon state machine**:
- T-24h+: no ribbon
- T-24h to T-1h: `tomorrow at 10:30` or `in 1h 12m`
- T-15m to T-0: `starting now` (red, pulsing)
- During: `in progress` (amber)
- Past wrap: OT pill (amber, with running timer + owed amount)
- After: `wrapped · rate this audition` (grey)

**"On my way" sequence**:
1. Tap → map sheet slides up (see Map handoff frame)
2. If "Text CD with ETA" toggle is on, sends a templated message (`"On my way, arriving 10:18."` — editable per CD)
3. Tap `Open in Maps` → hands off to system Maps with destination prefilled
4. Outreach log gets an entry automatically

---

### 4. Auditions list (`04_Auditions_List.html`)

**Purpose**: All auditions, agenda + calendar dual-view. Replaces `/dashboard/auditions`.

**Layout (Agenda default)**:
- **Page head** — meta-line (`TUE · 27 MAY · 12 ACTIVE`) + serif title `Auditions` + top-right view-toggle pair (agenda ⇄ calendar icons)
- **Search row** — pill-shape search input + `+ Add` button
- **Filter chips** — horizontal scroll: `All 12 · Callback 1 · Submitted 8 · Booked 2 · Past 28`. Single-select default, long-press for multi-select.
- **Day groups** — each group has a serif italic 24px header (`Today · Tue 27 May` in amber if today) + count meta on the right + hairline fading-right divider on top
- **Audition rows** — 56px time column (mono) · project (serif 22px) + sub (mono 10px) · status chip + pay (right). Each row has a 2px gradient left-edge stripe colored by status (amber/blue/green). "Now" rows widen to 3px amber with soft glow + warm horizontal gradient. Booked rows get a subtle green horizontal gradient.
- **"Awaiting reply"** group sorts last, time shown as `—`, pay dimmed.

**Calendar view** (toggle):
- Month grid, 7×6, with full-cell status tints:
  - **Amber-washed cells** for callback days (with `Callback` event label in mono at bottom)
  - **Blue-washed** for submission / self-tape due
  - **Green-washed** for booked shoot days
  - **Purple-washed** for personal events (once Calendar MCP onboarded)
- Date numbers in **Instrument Serif 18px** (was tiny mono, now hero)
- Today inverted to paper background, paper text → bg
- Selected day has 2px amber outline + glow
- Multi-status days show small corner dots top-right
- Below grid: legend strip + selected day's events list

**Data sources**:
- Existing `auditions` table → audition records
- Existing `casting_emails` + `parsed_auditions` → AI-ingested auditions
- **New: Google / Apple Calendar via MCP** — connect at onboarding, two-way sync, personal events flow into the `reminders` table
- **New: Outbound sync** — push auditions to user's external calendar

---

### 5. Self-tapes (`05_Self_Tapes.html`)

**Purpose**: Record / upload / review / submit self-tapes. Replaces `/dashboard/self-tapes` (currently mock data — wire to Supabase).

**List view**:
- Each tape is a card with three states:
  - **Empty** (red border) — hatched preview, target/record dot icon, `not recorded` label. Action row: `Record now` (filled paper) + `Upload`.
  - **Draft** (default border) — has takes but not submitted. Shows latest take preview + runtime. Action row: `Review & submit` + `Reshoot`.
  - **Submitted** (green border) — green outline, `Callback ✓` chip if CD replied. Shows submitted take.
- Card layout: project meta (mono) → scene title (serif 22px) → constraints (mono — partner, take cap, runtime) → action buttons or feedback. Status chip floats top-right via `order:-1; align-self:flex-end`.

**Tape detail**:
- Portrait 9:14 player up top (matches phone shooting aspect)
- Takes carousel — horizontal scroll of vertical thumbnails. Selected take has amber outline.
- Metadata block (mono key / value): Scene, Partner, Constraints (`2 takes max · ≤ 90s · MP4 1080p`), Submit to (CD), Brief link
- Director's note (amber sticky)
- Action row: Reshoot · Trim · Submit (primary, filled paper)
- Caption: `emails CD · logs in outreach · syncs to drive`

**Recording UI**:
- Full-bleed camera preview with subtle silhouette guide + rule-of-thirds grid
- Top: pulsing `REC · TAKE 04` ribbon + `0:42 / 1:30` time
- **Sides drawer** at bottom — script visible while shooting. Lines colored by speaker (mono "who" labels + serif italic dialogue).
- Bottom controls: camera flip (left) · big red record button (long-press to stop) · audio meter (right)
- Tap once on record button = bookmark a beat (surfaces in trim editor)
- Auto-stop at runtime cap with 3-second warning

**Submitted with feedback**:
- Green ribbon `Callback ✓`
- Player with green-tinted scrubber
- CD's feedback card — auto-parsed from email reply, shown as italic Instrument Serif with bolded callouts
- Green outcome card: `Callback booked. Tuesday 27 May · 10:30 · Roppongi Studio.`
- Actor's private notes card (amber, freeform)
- Action row: Re-watch · Open callback →

**Submit flow** (one tap):
1. Pick which take to send (default = latest)
2. Trim if needed (in/out points)
3. Tap Submit
4. App emails CD (template), logs Outreach entry, syncs file to Drive/iCloud, marks audition as `submitted`

---

### 6. Earnings (`06_Earnings.html`)

**Purpose**: The actor's career P&L. New screen. Reached from dashboard's Earnings card or bottom nav.

**Overview layout**:
1. Head row — back + segmented time-range (`3M · 6M · YTD`)
2. Hero — `May · banked` label + **`¥312,000`** in 64px green serif + delta line: `↑ 27% on April · ¥168k still in play`
3. **Area chart** (170px tall):
   - **Green solid area** = banked (cumulative)
   - **Grey dashed line** = potential (if every audition booked)
   - The gap between the two = money on the table
   - Y-axis labels in mono (`¥200k / ¥400k / ¥600k`)
   - X-axis months below
4. **Stat strip** — horizontal scroll, cells `min-width: 110px`. 4 stats: Booked (green) · Pending · Passed (red) · **OT** (amber). Number serif 22px, label mono 9px.
5. **Month strip** — horizontal scroll of month cards. Each: month name (serif) + year + banked amount + green fill bar + delta arrow (↑/↓ %). Current month highlighted.
6. **Breakdown card** — every project that contributed to this month. Booked (green pay) · Callback/Submitted (paper pay) · Passed (red `— ¥120k` with strike feel).

**Month deep-dive** (tap a month card):
- Hero amount of/65%/¥480k potential
- Progress bar (banked vs potential, amber tick at current pace marker)
- 4-stat grid: Booked · Callback · Submitted · Passed
- Outcomes list with OT breakdown
- **OT log card** (amber): each row shows the math: `1h 12m × ¥40k/hr × 1.5 = ¥48,000`

**Goal mode** (top-right toggle):
- Hero: `Hit ¥4.8M by Dec 31.`
- Goal ring (200px) — green arc fills with banked. Amber tick at top = pace marker (where you should be by today).
- Below ring: `5 mo in · on pace` (green if on pace)
- Pace bar: linear version with January / Today (amber) / Dec markers
- 4-stat grid: avg/mo · target/mo · booked count · book rate %
- Breakdown card translates the gap into action: `"submit 14 a month to hit ¥4.8M at your 18% book rate"`
- Bottom CTA: `Edit goal →`

**Privacy**: Goals are private by default. Optional "Share with agent" mode shows only the gap, not the absolute amount.

---

## Interactions & Behavior

### Animations & transitions
- All state transitions: **150ms** linear background, **250–300ms** ease for layout (accordion open/close, drawer slide)
- Splash: 5s loop (see breakdown above)
- Ribbon pulsing dot: 1.6s ease-in-out blink (`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.35} }`)
- Page transitions: cross-fade 200ms

### Persisted UI state (localStorage)
- `last_splash_date` — controls splash gating
- `audition_briefing_expanded_<id>` — per-audition briefing drawer state
- `dashboard_accordion_<section>` — section open/closed (resets daily at first launch)
- `auditions_view` — `agenda` | `calendar`
- `theme` — `dark` (default) | `ivory` | `navy` | `warm`

### Empty states
Match the existing codebase pattern (icon + line of text). Use the same Instrument Serif italic for the empty-state body to keep the voice consistent.

---

## State Management & Data

### New / extended Supabase tables

- **`profile`** — add `splash_photo_url` (or reuse `avatar_url`), `splash_mode` ('headshot' | 'onset' | 'stage'), `currency` (default 'JPY'), `city`, `monthly_goal`, `yearly_goal`
- **`auditions`** — add `est_wrap_time`, `ot_rate_multiplier` (default 1.5), `call_time`, `wrap_time` (actuals on shoot day)
- **`audition_takes`** — one row per self-tape take (referenced by `self_tapes.id`)
- **`overtime_log`** — per-shoot OT records: shoot_date, audition_id, minutes_overtime, hourly_rate, multiplier, calculated_amount, paid (bool), paid_date
- **`relationships_notes`** — Obsidian-style notes graph: id, user_id, title, body (markdown), links (array of other note IDs), entity_type ('person' | 'project' | 'place'), entity_id (FK to contacts/auditions etc), updated_at
- **`approvals_queue`** — multi-source approval items: id, user_id, source ('email' | 'text' | 'forward'), confidence, parsed_audition_id (FK), raw_payload, status

### Existing hooks to extend
- `useAuditions` — add date-grouping memo for the agenda view
- `useDashboardStats` — extend with earnings deltas, OT YTD, book rate, pending sum
- `useSelfTapes` — wire to actual Supabase table (currently mock)
- `useContracts` — wire to actual table (currently mock)
- **New**: `useEarnings(range)` — `range: '3M' | '6M' | 'YTD' | 'ALL'`
- **New**: `useBriefing()` — calls server endpoint to generate daily briefing prose
- **New**: `useDayDrilldown(date)` — merges auditions + reminders + outreach reply queue for a chronological day

### New API routes
- `POST /api/briefing/generate` — server-side LLM call to generate the prose paragraph
- `POST /api/calendar/connect` — MCP OAuth for Google/Apple Calendar
- `POST /api/calendar/sync` — bi-directional sync
- `POST /api/onmyway` — texts CD with ETA, opens maps, logs outreach
- `POST /api/wallet-pass` — generates a phone wallet pass with call sheet QR (for Booked auditions)
- `POST /api/relationships/notes` — Obsidian-style note CRUD

---

## Assets

- **Fonts** — Google Fonts: Instrument Serif (400 + italic), Inter (300–700), JetBrains Mono (400–600). Load via `<link>` in `app/layout.tsx`.
- **Icons** — The HTML prototypes use inline SVGs as placeholders. Map to Lucide React equivalents:
  - Today → `Home`
  - Auditions → `Clapperboard`
  - Tapes → `Video`
  - Earnings → `BarChart3`
  - Me → `User`
  - Briefing button → `FileText`
  - Call → `Phone`
  - Text → `MessageSquare`
  - Email → `Mail`
  - Maps → `MapPin`
- **Photos** — placeholder hatched backgrounds in prototype. Production: user-uploaded via the splash onboarding step. Store in Supabase Storage `splash_photos/` bucket.

---

## Files in this bundle

| File | Maps to |
|---|---|
| `01_Dashboard.html` | `/dashboard` (replaces current `dashboard/page.tsx`) |
| `02_Splash_Motion.html` | New cold-open route — `/splash` or a client-side gate on `/dashboard` first paint |
| `03_Audition_Detail.html` | New — `/dashboard/auditions/[id]` |
| `04_Auditions_List.html` | `/dashboard/auditions` (replaces current) |
| `05_Self_Tapes.html` | `/dashboard/self-tapes` (replaces current mock UI) |
| `06_Earnings.html` | New — `/dashboard/earnings` |
| `animations.jsx` | Reference timeline engine for the splash. Replace with Framer Motion in production. |

Each HTML file is self-contained — opens in any browser, no build needed for review. The tab nav at the top of each file lets you switch between states (e.g., Callback / Booked / Map handoff / Briefing expanded).

---

## What's NOT in this round (next handoffs)

- Day drilldown screen (full chronological day from the briefing CTA)
- Relationships / Vault page (Obsidian-style note graph)
- Needs approval queue (multi-source pending approvals)
- Onboarding flow (photo upload, Gmail, Calendar MCP, currency, CD shortlist)
- Settings page
- Universities page

These pages will keep the same vocabulary — when they ship, they'll inherit all design tokens above.
