# Chapter 3: Data Model

Every table in Actor OS lives in the `public` schema of a Supabase Postgres database. Row Level Security is enabled on every table. This chapter documents every table, every column, every RLS policy, and every relationship.

---

## Table Index

| Table | Purpose | RLS Policy |
|-------|---------|------------|
| `profiles` | Extended user data (auth.users managed by Supabase) | `auth.uid() = id` |
| `auditions` | Casting pipeline -- every audition from submission to wrap | `auth.uid() = user_id` |
| `self_tapes` | Self-tape tracking with deadline and scene partner info | `auth.uid() = user_id` |
| `contacts` | Outreach CRM contacts | `auth.uid() = user_id` |
| `outreach_logs` | Interaction log per contact | `auth.uid() = user_id` |
| `contracts` | Uploaded contracts and AI analysis results | `auth.uid() = user_id` |
| `contract_restrictions` | Social media and NDA restrictions extracted from contracts | `auth.uid() = contracts.user_id` (subquery) |
| `contract_analysis_logs` | AI processing audit trail per contract | `auth.uid() = contracts.user_id` (subquery) |
| `reminders` | Calendar reminders with related entity links | `auth.uid() = user_id` |
| `universities` | University licensing (Phase 2) | No user-scoped RLS (admin-managed) |
| `email_connections` | Gmail OAuth tokens per user | `auth.uid() = user_id` (select + insert check) |
| `casting_emails` | Raw emails fetched from Gmail | `auth.uid() = user_id` (select + insert check) |
| `parsed_auditions` | LLM-extracted audition data from casting emails | `auth.uid() = user_id` (select + insert check) |
| `casting_agency_patterns` | Shared reference data for known agency domains | Authenticated users can read (select only) |
| `audition_takes` | Individual takes per self-tape | `auth.uid() = user_id` |
| `overtime_log` | Per-shoot overtime records | `auth.uid() = user_id` |
| `relationships_notes` | Obsidian-style notes graph (future) | `auth.uid() = user_id` |
| `approvals_queue` | Multi-source approvals (email, text, agent forward) | `auth.uid() = user_id` |
| `tax_withholdings` | Monthly tax set-aside tracking | `auth.uid() = user_id` |
| `actor_preferences` | Audition priorities, career goals, project type preferences | `auth.uid() = user_id` |

---

## Table Definitions

### profiles

Extended user profile. Auto-created by a trigger on `auth.users` insert.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | (from auth.users) | Primary key, references `auth.users` on delete cascade |
| `email` | text | not null | User's email |
| `full_name` | text | null | Display name |
| `avatar_url` | text | null | Profile photo URL |
| `agency_name` | text | null | Actor's talent agency |
| `agency_email` | text | null | Agency contact email |
| `subscription_tier` | text | `'free'` | `free`, `monthly`, `yearly` |
| `subscription_status` | text | `'inactive'` | `active`, `inactive`, `cancelled`, `past_due` |
| `stripe_customer_id` | text | null | Stripe customer ID |
| `stripe_subscription_id` | text | null | Stripe subscription ID |
| `splash_photo_url` | text | null | Splash screen background photo |
| `splash_mode` | text | null | `headshot`, `onset`, `stage` |
| `currency` | text | `'JPY'` | Display currency code |
| `city` | text | null | Actor's city (shown in briefing) |
| `monthly_goal` | numeric | null | Monthly earnings goal |
| `yearly_goal` | numeric | null | Yearly earnings goal |
| `theme_id` | text | `'cinematic'` | Active theme identifier |
| `custom_theme` | jsonb | null | Custom theme color overrides |
| `preferred_mode` | text | `'both'` | `theater`, `film`, `both` |
| `tax_settings` | jsonb | null | Jurisdiction, filing status, manual rate |
| `created_at` | timestamptz | now() | |
| `updated_at` | timestamptz | now() | |

**Trigger:** `on_auth_user_created` runs `handle_new_user()` which inserts a profile row with `id`, `email`, and `full_name` from `auth.users.raw_user_meta_data`.

---

### auditions

The core entity. Every audition the actor tracks, from submission through wrap.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `user_id` | uuid | not null | References `profiles(id)` on delete cascade |
| `project_name` | text | not null | Project or production name |
| `role_name` | text | null | Character or role name |
| `casting_director` | text | null | |
| `agency` | text | null | Casting agency |
| `status` | text | `'submitted'` | State machine: `submitted`, `callback`, `pinned`, `booked`, `passed`, `archived` |
| `submitted_date` | date | null | When audition was submitted |
| `callback_date` | date | null | Callback date |
| `shoot_date` | date | null | Shoot or performance date |
| `location` | text | null | |
| `notes` | text | null | Free text notes |
| `self_tape_url` | text | null | Link to self-tape |
| `headshot_url` | text | null | Headshot used for this audition |
| `resume_url` | text | null | Resume used |
| `compensation` | text | null | Free text, e.g. "¥150,000" or "$500/day" |
| `contract_url` | text | null | Link to contract file |
| `call_time` | text | null | HH:MM format for shoot call time |
| `est_wrap_time` | text | null | Estimated wrap time |
| `wrap_time` | text | null | Actual wrap time |
| `ot_rate_multiplier` | numeric | 1.5 | Overtime rate multiplier |
| `created_at` | timestamptz | now() | |
| `updated_at` | timestamptz | now() | |

---

### self_tapes

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `user_id` | uuid | not null | References `profiles(id)` |
| `audition_id` | uuid | null | References `auditions(id)` on delete set null |
| `title` | text | not null | |
| `video_url` | text | not null | |
| `thumbnail_url` | text | null | |
| `scene_partner` | text | null | |
| `deadline` | date | null | Self-tape submission deadline |
| `submitted` | boolean | false | Has it been sent to the casting director? |
| `feedback` | text | null | Casting director feedback |
| `created_at` | timestamptz | now() | |

---

### contacts

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `user_id` | uuid | not null | References `profiles(id)` |
| `name` | text | not null | |
| `email` | text | null | |
| `phone` | text | null | |
| `role` | text | null | "Casting", "Agent", "Director", etc. |
| `company` | text | null | |
| `last_contact_date` | date | null | |
| `notes` | text | null | LLM-generated description or manual notes |
| `priority` | integer | 0 | 0-5 star rating |
| `created_at` | timestamptz | now() | |

---

### outreach_logs

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `user_id` | uuid | not null | References `profiles(id)` |
| `contact_id` | uuid | null | References `contacts(id)` on delete cascade |
| `type` | text | not null | "email", "call", "meeting", "other" |
| `notes` | text | null | |
| `date` | date | current_date | |
| `follow_up_date` | date | null | |
| `created_at` | timestamptz | now() | |

---

### contracts

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `user_id` | uuid | not null | References `profiles(id)` |
| `title` | text | not null | |
| `file_url` | text | not null | |
| `status` | text | `'uploaded'` | `uploaded`, `analyzing`, `reviewed`, `signed` |
| `summary` | text | null | AI-generated summary |
| `key_clauses` | jsonb | null | Structured clause extraction |
| `red_flags` | text[] | null | Array of concerning clauses |
| `questions` | text[] | null | Questions for agent or lawyer |
| `analyzed_at` | timestamptz | null | |
| `created_at` | timestamptz | now() | |

---

### contract_restrictions

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `contract_id` | uuid | not null | References `contracts(id)` on delete cascade |
| `restriction_type` | text | not null | `nda`, `social_media_ban`, `bts_delay`, `exclusivity`, `non_compete`, `confidentiality` |
| `description` | text | not null | |
| `applies_to_platforms` | text[] | `{instagram,linkedin,facebook,twitter}` | |
| `effective_date` | date | null | |
| `expiry_date` | date | null | |
| `is_active` | boolean | true | |
| `created_at` | timestamptz | now() | |

**RLS:** Uses a subquery -- `auth.uid() = (select user_id from contracts where id = contract_id)`.

---

### contract_analysis_logs

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `contract_id` | uuid | not null | References `contracts(id)` on delete cascade |
| `analysis_type` | text | not null | `initial`, `comparison`, `compliance_check` |
| `model_used` | text | `'claude-sonnet-4'` | |
| `raw_response` | text | null | Full LLM response for debugging |
| `processing_time_ms` | integer | null | |
| `created_at` | timestamptz | now() | |

---

### reminders

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `user_id` | uuid | not null | References `profiles(id)` |
| `title` | text | not null | |
| `description` | text | null | |
| `due_date` | timestamptz | not null | |
| `type` | text | `'general'` | `general`, `audition`, `self_tape`, `callback`, `follow_up`, `contract` |
| `related_id` | uuid | null | Generic foreign key to related entity |
| `completed` | boolean | false | |
| `created_at` | timestamptz | now() | |

---

### universities (Phase 2)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `name` | text | not null | |
| `department` | text | null | |
| `contact_name` | text | null | |
| `contact_email` | text | null | |
| `license_tier` | text | `'standard'` | `standard`, `premium`, `enterprise` |
| `student_count` | integer | null | |
| `active` | boolean | false | |
| `stripe_subscription_id` | text | null | |
| `created_at` | timestamptz | now() | |

No user-scoped RLS -- this table is admin-managed via service role.

---

### email_connections

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `user_id` | uuid | not null | References `profiles(id)` |
| `provider` | text | `'gmail'` | |
| `email_address` | text | not null | |
| `display_name` | text | null | |
| `access_token` | text | not null | OAuth2 access token |
| `refresh_token` | text | not null | OAuth2 refresh token |
| `token_expires_at` | timestamptz | null | |
| `scopes` | text[] | `{gmail.readonly}` | |
| `is_active` | boolean | true | |
| `last_synced_at` | timestamptz | null | |
| `sync_cursor` | text | null | Gmail historyId for incremental sync |
| `created_at` | timestamptz | now() | |
| `updated_at` | timestamptz | now() | |

---

### casting_emails

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `user_id` | uuid | not null | References `profiles(id)` |
| `connection_id` | uuid | not null | References `email_connections(id)` |
| `gmail_message_id` | text | not null | Gmail API message ID |
| `thread_id` | text | null | |
| `from_address` | text | not null | |
| `from_name` | text | null | |
| `to_address` | text | not null | |
| `subject` | text | not null | |
| `body_text` | text | null | Plain text, truncated to 10,000 characters |
| `body_html` | text | null | HTML body, truncated to 50,000 characters |
| `received_at` | timestamptz | not null | |
| `is_casting_email` | boolean | false | Set by pattern detection during sync |
| `processing_status` | text | `'pending'` | `pending`, `parsing`, `parsed`, `audition_created`, `needs_response`, `skipped`, `error` |
| `parsing_error` | text | null | |
| `created_at` | timestamptz | now() | |
| `updated_at` | timestamptz | now() | |

**Unique constraint:** `(user_id, gmail_message_id)` -- prevents duplicate imports.

**Indexes:** `idx_casting_emails_user_sync` on `(user_id, received_at desc)`, `idx_casting_emails_status` on `(processing_status)`.

---

### parsed_auditions

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `user_id` | uuid | not null | References `profiles(id)` |
| `email_id` | uuid | not null | References `casting_emails(id)` |
| `source_email_id` | uuid | null | References `casting_emails(id)` on delete set null |
| `audition_id` | uuid | null | References `auditions(id)` on delete set null -- populated when approved |
| `confidence_score` | integer | 0 | 0-100, AI confidence |
| `parser_version` | text | `'v1'` | Which parser produced this |
| `extracted_fields` | jsonb | `'{}'` | See ParsedAuditionFields type |
| `raw_snippets` | text[] | `'{}'` | Source text snippets |
| `needs_review` | boolean | true | Human review required |
| `review_reason` | text | null | |
| `reviewed_by_user` | boolean | false | |
| `reviewed_at` | timestamptz | null | |
| `created_at` | timestamptz | now() | |
| `updated_at` | timestamptz | now() | |

---

### casting_agency_patterns

Shared reference data seeded with known Japanese casting agencies.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `domain_pattern` | text | not null | e.g. `@bay-side.biz` |
| `agency_name` | text | not null | |
| `display_name` | text | null | |
| `country` | text | `'JP'` | |
| `email_signatures` | text[] | null | Common footer phrases |
| `role_keywords` | text[] | null | Words that indicate casting emails |
| `is_verified` | boolean | false | |
| `match_priority` | integer | 100 | Higher = checked first |
| `created_by` | uuid | null | References `profiles(id)` |
| `created_at` | timestamptz | now() | |
| `updated_at` | timestamptz | now() | |

**Unique constraint:** `(domain_pattern)`.

**Seed data:** BAYSIDE (`@bay-side.biz`, priority 100), Horipro (`@horipro.co.jp`, priority 95), Liliana Models (`@lilianamodels.com`, priority 90).

**RLS:** Authenticated users can read (select only). No user can write without service role.

---

### audition_takes

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `user_id` | uuid | not null | References `profiles(id)` |
| `self_tape_id` | uuid | null | References `self_tapes(id)` on delete cascade |
| `take_number` | integer | 1 | |
| `video_url` | text | null | |
| `thumbnail_url` | text | null | |
| `duration_seconds` | integer | null | |
| `is_selected` | boolean | false | The chosen take |
| `created_at` | timestamptz | now() | |

---

### overtime_log

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `user_id` | uuid | not null | References `profiles(id)` |
| `audition_id` | uuid | null | References `auditions(id)` on delete set null |
| `shoot_date` | date | not null | |
| `minutes_overtime` | integer | 0 | |
| `hourly_rate` | numeric | null | |
| `multiplier` | numeric | 1.5 | |
| `calculated_amount` | numeric | null | |
| `paid` | boolean | false | |
| `paid_date` | date | null | |
| `created_at` | timestamptz | now() | |

---

### relationships_notes (Future)

Obsidian-style linked notes for people, projects, and places.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `user_id` | uuid | not null | References `profiles(id)` |
| `title` | text | not null | |
| `body` | text | null | |
| `links` | uuid[] | `'{}'` | Array of related note IDs |
| `entity_type` | text | null | `person`, `project`, `place` |
| `entity_id` | uuid | null | |
| `updated_at` | timestamptz | now() | |
| `created_at` | timestamptz | now() | |

---

### approvals_queue

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `user_id` | uuid | not null | References `profiles(id)` |
| `source` | text | null | `email`, `text`, `forward` |
| `confidence` | integer | null | |
| `parsed_audition_id` | uuid | null | References `parsed_auditions(id)` on delete set null |
| `raw_payload` | jsonb | null | |
| `status` | text | `'pending'` | `pending`, `approved`, `rejected` |
| `created_at` | timestamptz | now() | |

---

### tax_withholdings

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `user_id` | uuid | not null | References `auth.users(id)` on delete cascade |
| `year` | integer | not null | |
| `month` | integer | not null | 1-12, with check constraint |
| `gross_income` | integer | 0 | |
| `tax_rate` | numeric(5,4) | 0 | |
| `estimated_tax` | integer | 0 | |
| `actually_set_aside` | integer | 0 | |
| `notes` | text | null | |
| `created_at` | timestamptz | now() | |
| `updated_at` | timestamptz | now() | |

**Unique constraint:** `(user_id, year, month)`.

**RLS:** Separate policies for select, insert, and update (all `auth.uid() = user_id`).

---

### actor_preferences

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `user_id` | uuid | not null | References `profiles(id)` |
| `priorities` | jsonb | null | `{compensation: 1, experience: 2, ...}` |
| `min_compensation` | text | null | |
| `preferred_project_types` | text[] | `'{}'` | |
| `preferred_locations` | text[] | `'{}'` | |
| `willing_to_travel` | boolean | false | |
| `career_goal` | text | null | `building_experience`, `earning_income`, `building_network`, `all_opportunities` |
| `bio_context` | text | null | Free text for AI context |
| `created_at` | timestamptz | now() | |
| `updated_at` | timestamptz | now() | |

---

## Entity Relationship Summary

```
profiles (1)
  +-- auditions (many)
  +-- self_tapes (many) ---> auditions (optional)
  +-- contacts (many)
  |     +-- outreach_logs (many)
  +-- contracts (many)
  |     +-- contract_restrictions (many)
  |     +-- contract_analysis_logs (many)
  +-- reminders (many)
  +-- email_connections (many)
  |     +-- casting_emails (many)
  |           +-- parsed_auditions (many) ---> auditions (optional, when approved)
  +-- audition_takes (many) ---> self_tapes (optional)
  +-- overtime_log (many) ---> auditions (optional)
  +-- relationships_notes (many)
  +-- approvals_queue (many) ---> parsed_auditions (optional)
  +-- tax_withholdings (many)
  +-- actor_preferences (1:1)
```

Total tables: **20** (including `casting_agency_patterns` which is shared reference data).
