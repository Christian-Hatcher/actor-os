# Chapter 1: What Is This Product

## One-Sentence Summary

Actor OS is a $5-per-month web application that gives student and emerging actors a single dashboard to track auditions, manage self-tapes, read contracts with artificial intelligence, and never miss a callback.

---

## Who It Is For

### Primary Users

| Segment | Description | Pain Level |
|---------|-------------|------------|
| **Student actors** | Undergrads in theater and film programs (University of Alabama is the first go-to-market target) | High -- they have never had a system; everything is paper, Notes app, or nothing |
| **Emerging actors** | 0-5 years professional experience, freelance, no full-time agent | Very high -- they juggle multiple agencies, casting calls across email, text, WhatsApp, LINE |
| **Working actors in Japan** | English-speaking talent in the Tokyo market (Christian's own cohort) | Extreme -- bilingual casting emails, Japanese contract formats, yen-based compensation |

### Secondary Users (Phase 2 and beyond)

| Segment | Description |
|---------|-------------|
| **University theater departments** | License Actor OS for entire programs; admin dashboards track student career readiness |
| **Talent agencies** | Read-only view into client pipelines (future phase, consent-gated) |

---

## What Problem It Solves

Actors are freelancers who manage their careers with zero infrastructure. The typical actor's workflow looks like this:

1. Casting emails arrive in a personal Gmail inbox, mixed with everything else.
2. Audition details get copy-pasted into a Notes app or a Google Sheet -- if they get recorded at all.
3. Self-tape deadlines live in the actor's head or on a sticky note.
4. Contracts are PDFs that get signed without being read, because legal language is opaque and lawyers cost $300 per hour.
5. Follow-ups with casting directors are forgotten because there is no relationship tracker.
6. Tax obligations are ignored until April when the bill arrives and there is no money set aside.
7. Earnings are a mystery -- the actor cannot answer "How much did I make this year?" without digging through bank statements.

Actor OS replaces all seven of those broken workflows with a single tool.

---

## Design Philosophy

### Mobile-First

Actors are on the move -- on set, in transit, waiting in a casting lobby. Every screen is designed for a phone first. Desktop is supported but secondary. The bottom navigation bar, the touch-friendly accordion sections, and the swipe-to-scroll month strips all assume a thumb as the input device.

### Cinematic User Interface

Actors are visual people. They respond to beautiful things. The default "Cinematic Dark" theme uses warm near-blacks (#0a0908), paper-white text (#f4efe6), and amber accents (#e8a755) to create a mood that feels like a director's office, not an accounting app. Every theme color is a CSS custom property, and users can switch to "Light Ivory" or create custom themes from Settings. No component uses hardcoded hex values.

### Privacy-First

Scripts and contracts never leave the user's control. Files are stored in private Supabase Storage buckets with Row Level Security. The Gmail integration is read-only -- Actor OS never sends emails, never deletes anything, never accesses contacts or calendars beyond the email scope. All data is scoped to the individual user.

### One-Stop-Shop

The career lifecycle is: Audition --> Booking --> Rehearsal --> Performance --> Payment --> Tax. Actor OS covers the full arc. Rather than being the best audition tracker or the best contract reader, it is the best at connecting all of those things together. A callback date on Tuesday becomes a self-tape deadline on Friday which becomes a booked job on Wednesday which becomes a contract to review which becomes income to track which becomes tax to set aside.

### Provider-Agnostic Intelligence

The artificial intelligence layer (contract analysis, email parsing, briefing composition, contact description generation) is not locked to any provider. The `llm.ts` abstraction layer supports Ollama (local, free), Anthropic, and OpenAI via environment variables. The default is Ollama running locally. This is a configuration choice, not a code constraint.

---

## What It Replaces

| Before Actor OS | After Actor OS |
|-----------------|----------------|
| Google Sheets audition tracker | Casting Pipeline with status state machine and calendar view |
| Notes app with self-tape deadlines | Self-Tape Partner with deadline tracking and take management |
| PDFs signed without reading | Contract Reader Agent with AI analysis, red flag detection, grade A through F |
| Scattered emails and texts | Outreach CRM with contact auto-population from Gmail |
| No earnings visibility | Earnings tracker with area charts, goal mode, monthly breakdown |
| Tax surprise in April | Tax Keeper with multi-jurisdiction estimation and monthly set-aside log |
| Manual email scanning | Gmail OAuth pipeline that detects, parses, and queues casting emails for one-tap approval |
| No daily overview | Morning briefing with natural-language summary of callbacks, shoots, and earnings |

---

## Non-Goals

Actor OS is NOT:

1. **Not a casting platform.** It does not replace Backstage, Actors Access, Casting Networks, or any site where casting directors post breakdowns. Actor OS is where the actor takes that data after they receive it.

2. **Not a social network.** There are no profiles that other users can browse, no "like" buttons, no feeds, no followers. Cast collaboration (Phase 2.5) is a private production bulletin board, not a social feature.

3. **Not a talent marketplace.** Actors are not listed for hire. There is no directory, no search-by-headshot, no agency storefront.

4. **Not a video editing tool.** Self-tape recording and upload are planned for Phase 2, but Actor OS will never be a video editor. It tracks the metadata around self-tapes (deadlines, takes, scene partner notes, submission status).

5. **Not tax advice.** The Tax Keeper module provides estimates based on published tax brackets. It explicitly disclaims: "This is a guide -- not tax advice."

6. **Not an agent.** The Morning Briefing uses natural-language summaries that sound conversational ("You open with a callback for Toyota Commercial in Shibuya"), but Actor OS is a tool, not a representative. It organizes the actor's career; it does not act on their behalf.

---

## The Company

**At Home Reelz K.K.** is the registered company behind Actor OS, based in Tokyo, Japan. Christian Hatcher is the founder, a working actor under contract with Horipro who built Actor OS to solve his own problems and those of every actor he has worked with.
