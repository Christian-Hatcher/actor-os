# Actor OS V2 Feature Spec

**Date:** 2026-05-25
**Status:** Draft — awaiting Christian's review before any code

---

## 1. Multi-Job Tracking (The "Jobs" Entity)

### Problem
Right now, an audition that gets booked just stays in the `auditions` table with `status: "booked"`. There's no concept of a **job** — the thing that happens *after* you book. Rehearsals, shoot days, wrap dates, cast relationships, per-job notes — none of that exists.

### Solution: New `jobs` Table
When an audition status changes to `booked`, the user creates (or we auto-create) a **job** record. Jobs become the central hub for everything post-booking.

**New table: `jobs`**
```sql
create table jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  audition_id uuid references auditions(id),          -- nullable (direct bookings exist)
  title text not null,                                 -- "Macbeth" / "Toyota Commercial"
  type text not null check (type in ('theater', 'film', 'commercial', 'voiceover', 'other')),
  venue_or_location text,
  director text,
  production_company text,
  role_name text,
  status text not null default 'active' check (status in ('active', 'wrapped', 'archived')),
  start_date date,
  end_date date,
  compensation text,
  contract_id uuid references contracts(id),           -- link to analyzed contract
  notes text,                                          -- general job notes
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table jobs enable row level security;
create policy "Users own their jobs" on jobs
  for all using (auth.uid() = user_id);
```

**Impact on existing code:**
- `auditions` table unchanged — just add `job_id` backlink column
- Dashboard stats cards: add `active_jobs` count
- New dashboard page: `/dashboard/jobs` (list) + `/dashboard/jobs/[id]` (detail)
- Audition card gets "Create Job" action when status = booked

---

## 2. Rehearsal Process Module

### Problem
Actors live in rehearsal for weeks/months (especially theater). They take notes on scripts, blocking, director feedback, character work. Currently they use paper, Notes app, or nothing. Actor OS has zero rehearsal support.

### Solution: Rehearsal Logs + Script Annotations

**New table: `rehearsal_logs`**
```sql
create table rehearsal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  job_id uuid references jobs(id) not null,
  date date not null,
  duration_minutes int,
  type text check (type in ('table_read', 'blocking', 'run_through', 'tech_rehearsal', 'dress_rehearsal', 'put_in', 'other')),
  summary text,                                       -- "Worked Act 2, Scene 3. Director wants more urgency."
  director_notes text,                                -- verbatim director notes
  personal_notes text,                                -- actor's own observations
  created_at timestamptz default now()
);

alter table rehearsal_logs enable row level security;
create policy "Users own their rehearsal logs" on rehearsal_logs
  for all using (auth.uid() = user_id);
```

**New table: `scripts`**
```sql
create table scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  job_id uuid references jobs(id) not null,
  title text not null,                                -- "Macbeth - Full Script"
  file_url text,                                      -- Supabase Storage path (private bucket)
  file_type text check (file_type in ('pdf', 'txt', 'docx')),
  file_size_bytes bigint,
  uploaded_at timestamptz default now()
);

alter table scripts enable row level security;
create policy "Users own their scripts" on scripts
  for all using (auth.uid() = user_id);
```

**New table: `script_annotations`**
```sql
create table script_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  script_id uuid references scripts(id) not null,
  page_number int,                                    -- which page
  line_reference text,                                -- "Act 2, Scene 3, Line 45" or free text
  annotation_type text check (annotation_type in ('blocking', 'character_note', 'director_note', 'emotion', 'prop', 'cue', 'general')),
  content text not null,                              -- the actual note
  color text default 'yellow',                        -- highlight color for UI
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table script_annotations enable row level security;
create policy "Users own their annotations" on script_annotations
  for all using (auth.uid() = user_id);
```

**Privacy guarantee:** Scripts stored in a **private Supabase Storage bucket**. No server-side text extraction. Files are encrypted at rest. We literally cannot read them — they're just blobs the user uploads and downloads.

**UI integration:**
- `/dashboard/jobs/[id]/rehearsals` — chronological rehearsal log
- `/dashboard/jobs/[id]/script` — PDF viewer with annotation sidebar
- Script viewer: render PDF in-browser (react-pdf), overlay annotation pins on each page
- Annotation sidebar: filter by type (blocking, director notes, etc.)
- Quick-add annotation: tap a spot on the page, pick type, write note

**Impact on existing code:**
- New Supabase Storage bucket: `scripts` (private, RLS-protected)
- New API routes: `api/jobs/[id]/rehearsals`, `api/jobs/[id]/scripts`, `api/scripts/[id]/annotations`
- Add `react-pdf` dependency for in-browser PDF rendering

---

## 3. Theater vs Film Mode

### Problem
Theater and film actors have fundamentally different workflows:
- **Theater:** rehearsal-heavy (weeks of rehearsal), run-of-show calendar, ensemble dynamics, blocking notes, tech week
- **Film:** shoot-day-based, call sheets, coverage/setups, one-and-done scenes, continuity notes

Showing both dashboards to everyone adds clutter. A film actor doesn't need rehearsal logs. A theater actor doesn't need call sheet tracking.

### Solution: Mode Toggle + Filtered Dashboard

**Schema change:** Add `preferred_mode` to `profiles` table:
```sql
alter table profiles add column preferred_mode text
  default 'both' check (preferred_mode in ('theater', 'film', 'both'));
```

**How it works:**
- Settings page gets a "Focus Mode" toggle: Theater / Film / Both
- `jobs.type` already captures `theater` vs `film` vs `commercial` etc.
- Dashboard navigation adapts based on mode:

| Section | Theater Mode | Film Mode | Both |
|---------|-------------|-----------|------|
| Jobs | Theater jobs only | Film/commercial only | All |
| Rehearsals | Shown | Hidden | Shown for theater jobs |
| Call Sheets | Hidden | Shown (future) | Shown for film jobs |
| Script Annotations | Full feature | Sides-focused | Both |
| Cast Collab | Shown | Shown | Shown |

**Impact on existing code:**
- `profiles` table: 1 new column
- Dashboard nav (`dashboard-nav.tsx`): conditional menu items based on `profile.preferred_mode`
- Settings page (`/dashboard/settings`): add mode toggle UI
- No breaking changes — "both" is the default, existing users see everything

---

## 4. Cast Collaboration (Future — Phase 2+)

### Problem
Cast members on the same production currently have no way to share notes or communicate through Actor OS. They use group chats, email threads, or nothing.

### Solution: Production Groups (Consent-Gated)

**New table: `productions`**
```sql
create table productions (
  id uuid primary key default gen_random_uuid(),
  name text not null,                                 -- "Macbeth - Spring 2026"
  type text check (type in ('theater', 'film', 'commercial', 'other')),
  invite_code text unique not null,                   -- 6-char join code
  created_by uuid references auth.users(id) not null,
  created_at timestamptz default now()
);

alter table productions enable row level security;
```

**New table: `production_members`**
```sql
create table production_members (
  id uuid primary key default gen_random_uuid(),
  production_id uuid references productions(id) not null,
  user_id uuid references auth.users(id) not null,
  role_in_production text,                            -- "Macbeth" / "Stage Manager"
  joined_at timestamptz default now(),
  unique(production_id, user_id)
);

alter table production_members enable row level security;
create policy "Members see their productions" on production_members
  for all using (auth.uid() = user_id);
```

**New table: `production_notes`**
```sql
create table production_notes (
  id uuid primary key default gen_random_uuid(),
  production_id uuid references productions(id) not null,
  author_id uuid references auth.users(id) not null,
  content text not null,
  note_type text check (note_type in ('director_note', 'schedule_change', 'general', 'reminder')),
  created_at timestamptz default now()
);

alter table production_notes enable row level security;
create policy "Members see production notes" on production_notes
  for select using (
    auth.uid() in (
      select user_id from production_members where production_id = production_notes.production_id
    )
  );
create policy "Members create notes" on production_notes
  for insert with check (auth.uid() = author_id);
```

**How it works:**
1. Any user creates a Production → gets a 6-character invite code
2. Share the code with castmates (text, email, whatever)
3. Castmates enter code → join the production group
4. Shared feed of production notes (director notes, schedule changes, reminders)
5. Each member's personal rehearsal logs and script annotations stay **private**

**This is NOT a chat app.** It's a shared bulletin board for production-level information. No DMs, no threads, no social features.

**Link to jobs:** Add `production_id` column to `jobs` table:
```sql
alter table jobs add column production_id uuid references productions(id);
```

**UI:**
- `/dashboard/productions` — list of joined productions
- `/dashboard/productions/[id]` — shared notes feed + member list
- Job detail page: "Link to Production" action

**Phase 2+ because:** This requires multi-user RLS policies, invite flows, and moderation. Ship the single-user features (jobs, rehearsals, scripts) first.

---

## 5. MCP Server

### Problem
Actor OS should be agent-ready from day one. An AI agent should be able to manage an actor's career through Actor OS the same way a human uses the dashboard.

### Solution: MCP Server Exposing All Core Operations

**New directory: `src/mcp/`**

**MCP Tools to expose:**

```
# Auditions
auditions_list          — List auditions with filters (status, date range)
auditions_create        — Create a new audition
auditions_update        — Update audition status/details
auditions_search        — Search auditions by project/role/director

# Jobs
jobs_list               — List active/wrapped jobs
jobs_create             — Create job (optionally from booked audition)
jobs_update             — Update job details/status

# Rehearsals
rehearsals_list         — List rehearsal logs for a job
rehearsals_create       — Log a rehearsal session
rehearsals_search       — Search rehearsal notes

# Scripts
scripts_list            — List scripts for a job
scripts_upload          — Upload a script file
annotations_list        — List annotations for a script
annotations_create      — Add annotation to a script

# Contacts
contacts_list           — List contacts with filters
contacts_create         — Add a contact
contacts_update         — Update contact info
outreach_log            — Log an interaction

# Contracts
contracts_list          — List contracts
contracts_analyze       — Trigger LLM analysis
contracts_restrictions  — Get active restrictions

# Reminders
reminders_list          — List upcoming reminders
reminders_create        — Create a reminder
reminders_complete      — Mark reminder done

# Email
emails_sync             — Trigger Gmail sync
emails_pending          — List emails needing review
emails_approve          — Approve parsed audition

# Productions (Phase 2+)
productions_list        — List joined productions
productions_create      — Create production + invite code
productions_join        — Join via invite code
productions_notes       — List/add production notes

# Meta
profile_get             — Get user profile
profile_update          — Update profile/preferences
stats_dashboard         — Get dashboard statistics
```

**Implementation approach:**
- Use `@modelcontextprotocol/sdk` package
- Each tool maps to existing API logic (extract from route handlers into shared service functions)
- Auth via MCP session token → Supabase service role with user_id context
- Expose as standalone MCP server (separate entry point from Next.js)

**Impact on existing code:**
- Extract business logic from `src/app/api/*` routes into `src/lib/services/` (shared between API routes and MCP tools)
- Add `@modelcontextprotocol/sdk` dependency
- Add `src/mcp/server.ts` entry point
- Add `mcp` script to package.json

---

## 6. Implementation Order

| Phase | Feature | New Tables | Effort |
|-------|---------|-----------|--------|
| **V2.0** | Jobs entity | `jobs` | Small — foundation for everything else |
| **V2.1** | Rehearsal logs | `rehearsal_logs` | Small — CRUD + timeline UI |
| **V2.2** | Script upload + annotations | `scripts`, `script_annotations` | Medium — PDF viewer + annotation overlay |
| **V2.3** | Theater/Film mode toggle | profiles column | Small — conditional nav + filtering |
| **V2.4** | MCP server | none (uses existing) | Medium — extract services + wire MCP SDK |
| **V2.5** | Cast collaboration | `productions`, `production_members`, `production_notes` | Medium — multi-user RLS + invite flow |

**Total new tables:** 7 (jobs, rehearsal_logs, scripts, script_annotations, productions, production_members, production_notes)
**Total tables after V2:** 20 + 3 audit = 23

---

## 7. What Stays the Same

- Auth system (Supabase email/password + RLS) — unchanged
- Billing (Stripe $5/mo, $45/yr) — unchanged
- Gmail pipeline (sync → parse → review) — unchanged
- Contract analysis — unchanged, just linked to jobs
- LLM abstraction (low/high/human) — unchanged
- Outreach CRM — unchanged
- All existing API routes — unchanged (new routes added alongside)

---

## 8. Data Model Relationships (After V2)

```
profiles
  └── auditions (1:many)
        └── jobs (1:1, optional — only if booked)
              ├── rehearsal_logs (1:many)
              ├── scripts (1:many)
              │     └── script_annotations (1:many)
              ├── contracts (1:1, optional)
              │     └── contract_restrictions (1:many)
              └── productions (many:1, optional)
                    ├── production_members (1:many)
                    └── production_notes (1:many)
  └── contacts (1:many)
        └── outreach_logs (1:many)
  └── email_connections (1:many)
        └── casting_emails (1:many)
              └── parsed_auditions (1:1)
  └── reminders (1:many)
```

---

## 9. V3 Seed: Stage Manager and Director Views (Role-Based Blocking Visibility)

**Origin:** Christian brainstorm 2026-05-25. Explicitly flagged as V3 / far future.

### The Idea

Productions have three distinct visibility tiers for blocking and rehearsal notes:

1. **Actor view** — I can see all of MY blocking, MY cues, MY notes. I cannot see other characters' blocking unless the stage manager or director grants access.
2. **Stage Manager view** — Sees ALL blocking for ALL characters across every scene. Can create/edit blocking notes for anyone. Uploads and maintains the master blocking document. This is the "god view" of the production.
3. **Director view** — Same visibility as stage manager, plus can see when things are happening (schedule overlay on blocking). Read-heavy, edit-light.

### How It Builds on V2

This extends three V2 features:

- **Productions (V2.5)** — `production_members` already has `role_in_production`. Add a `role_type` enum: `actor`, `stage_manager`, `director`, `crew`.
- **Script Annotations (V2.2)** — Annotations already have `annotation_type` including `blocking`. Add `character_id` or `character_name` field so blocking notes are tagged per character, not just per user.
- **Rehearsal Logs (V2.1)** — Already per-job. Add optional `shared_with_production` boolean so stage managers can publish rehearsal reports to the whole cast.

### Schema Additions (V3)

```sql
-- Extend production_members with role-based permissions
alter table production_members add column role_type text
  default 'actor' check (role_type in ('actor', 'stage_manager', 'director', 'crew'));

-- Blocking notes become character-tagged and production-scoped
create table production_blocking (
  id uuid primary key default gen_random_uuid(),
  production_id uuid references productions(id) not null,
  author_id uuid references auth.users(id) not null,   -- who wrote it (usually SM)
  character_name text not null,                          -- "Macbeth", "Lady Macbeth"
  scene_reference text,                                  -- "Act 2, Scene 3"
  page_number int,
  content text not null,                                 -- "Enter DSR, cross to UC on line 45"
  blocking_type text check (blocking_type in ('entrance', 'exit', 'cross', 'position', 'business', 'general')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table production_blocking enable row level security;

-- Actors see their own character's blocking only
create policy "Actors see own character blocking" on production_blocking
  for select using (
    -- Stage managers and directors see everything
    auth.uid() in (
      select user_id from production_members
      where production_id = production_blocking.production_id
      and role_type in ('stage_manager', 'director')
    )
    or
    -- Actors see only their character's blocking
    (
      auth.uid() in (
        select user_id from production_members
        where production_id = production_blocking.production_id
      )
      and character_name in (
        select role_in_production from production_members
        where production_id = production_blocking.production_id
        and user_id = auth.uid()
      )
    )
  );

-- Only stage managers and directors can create/edit blocking
create policy "SM and directors manage blocking" on production_blocking
  for all using (
    auth.uid() in (
      select user_id from production_members
      where production_id = production_blocking.production_id
      and role_type in ('stage_manager', 'director')
    )
  );
```

### Visibility Toggle UX

On the production blocking page:
- **Stage manager / director** sees a character filter (checkboxes): show/hide each character's blocking overlay
- **Actor** sees only their character(s) — no toggle needed, RLS enforces it
- **Director can grant "peek" access** — temporarily let an actor see another character's blocking for a specific scene (useful for duet scenes, fight choreography)

### Why V3

- Requires multi-user RLS that's more complex than V2.5's simple membership model
- Needs the `production_blocking` table with character-level tagging
- Stage manager workflow is a whole UX surface (master blocking doc, per-scene views, print-friendly exports)
- Could eventually be its own product vertical: "Stage Manager OS" (the expansion mentioned in the original Actor OS plan)

### Notes

- The "Stage Manager OS" expansion from the original plan lives here — it's not a separate product, it's a role within Actor OS productions
- Character names in `production_members.role_in_production` become the key that links actors to their blocking — no separate character table needed at V3
- Print-friendly blocking sheets (PDF export) would be a high-value feature for stage managers who still need paper copies in the booth
