# Implementation Notes — Actor OS Redesign

## Overview

This directory contains 6 high-fidelity HTML screen prototypes + an animation engine exported from Open Design. These are design references, NOT production code. The task is to recreate them in the existing Next.js codebase using its established patterns.

## Build Order (Recommended)

1. **Design tokens + theme system** — Replace globals.css color system, add font imports, wire up customizable theme
2. **Dashboard shell + bottom nav** — Replace sidebar with new editorial bottom nav
3. **Dashboard home** (01_Dashboard) — Morning briefing, accordion sections, week strip
4. **Earnings page** (06_Earnings) — New route, area chart, month cards, goal mode
5. **Auditions list** (04_Auditions_List) — Agenda + calendar dual-view
6. **Audition detail** (03_Audition_Detail) — Call-sheet page, ribbon state machine, "On my way"
7. **Self-tapes** (05_Self_Tapes) — Wire to Supabase, recording UI, submit flow
8. **Splash motion** (02_Splash_Motion) — Cold-open animation, once-per-day gate

## Color Customization System

Colors MUST be customizable per-user. Store the user's theme preference in Supabase `profile` table.

### Theme Architecture

```typescript
// src/lib/themes.ts

export interface ActorOSTheme {
  id: string
  name: string
  bg: string        // Page background
  bg2: string       // Card surface
  bg3: string       // Deeper insets
  paper: string     // Primary text
  paperDim: string  // Secondary text
  paperFaint: string // Tertiary text
  rule: string      // Hairline dividers
  ruleStrong: string // Stronger borders
  green: string     // Booked/money/success
  greenGlow: string // Soft green halo
  amber: string     // Callback/today/live
  blue: string      // Submitted/passive
  red: string       // Urgent/overdue/flags
  purple: string    // Personal events
}

export const THEMES: Record<string, ActorOSTheme> = {
  cinematic: {
    id: 'cinematic',
    name: 'Cinematic Dark',
    bg: '#0a0908',
    bg2: '#141210',
    bg3: '#1c1916',
    paper: '#f4efe6',
    paperDim: '#a8a298',
    paperFaint: '#6e6a62',
    rule: '#26231f',
    ruleStrong: '#36322c',
    green: '#3aa86b',
    greenGlow: 'rgba(58,168,107,.14)',
    amber: '#e8a755',
    blue: '#6ab3e8',
    red: '#e8625a',
    purple: '#b69de0',
  },
  ivory: {
    id: 'ivory',
    name: 'Light Ivory',
    bg: '#eaeef2',
    bg2: '#dee3e9',
    bg3: '#d2d8e0',
    paper: '#1a2230',
    paperDim: '#4a5468',
    paperFaint: '#6b7a92',
    rule: '#b7c0cf',
    ruleStrong: '#a0aabb',
    green: '#1c7a4a',
    greenGlow: 'rgba(28,122,74,.14)',
    amber: '#a37314',
    blue: '#3a7db8',
    red: '#c8453e',
    purple: '#8b6bc0',
  },
  // Users can create custom themes via Settings
}
```

### How to Apply

1. Store `theme_id` in `profile` table (default: 'cinematic')
2. On app load, read theme and inject CSS variables into `:root`
3. Settings page shows theme picker with live preview
4. Custom theme editor: color pickers for each token
5. All components use `var(--bg)`, `var(--paper)`, etc. — never hardcoded hex values

### New Profile Fields for Themes

```sql
ALTER TABLE profiles ADD COLUMN theme_id TEXT DEFAULT 'cinematic';
ALTER TABLE profiles ADD COLUMN custom_theme JSONB DEFAULT NULL;
```

## New Supabase Tables

See README.md in this directory for full schema additions:
- `profile` additions: splash_photo_url, splash_mode, currency, city, monthly_goal, yearly_goal, theme_id, custom_theme
- `auditions` additions: est_wrap_time, ot_rate_multiplier, call_time, wrap_time
- New tables: audition_takes, overtime_log, relationships_notes, approvals_queue

## New API Routes

- POST /api/briefing/generate — LLM daily briefing prose
- POST /api/calendar/connect + /sync — Google/Apple Calendar
- POST /api/onmyway — text CD + open maps + log outreach
- POST /api/wallet-pass — phone wallet pass
- POST /api/relationships/notes — Obsidian-style note CRUD

## Font Loading

Add to `app/layout.tsx`:
```typescript
import { Instrument_Serif } from 'next/font/google'
// Inter is already similar to Geist Sans — can keep or swap
// JetBrains Mono replaces Geist Mono

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
})
```

## File Mapping

| Design File | Route | Replaces |
|---|---|---|
| 01_Dashboard.html | /dashboard | Current dashboard/page.tsx |
| 02_Splash_Motion.html | Client gate on /dashboard | New |
| 03_Audition_Detail.html | /dashboard/auditions/[id] | New |
| 04_Auditions_List.html | /dashboard/auditions | Current auditions/page.tsx |
| 05_Self_Tapes.html | /dashboard/self-tapes | Current self-tapes/page.tsx (mock) |
| 06_Earnings.html | /dashboard/earnings | New |
| animations.jsx | Reference only | Use Framer Motion in production |
