-- Actor OS Database Schema + Auth Triggers

-- Users (managed by Supabase Auth, extended with profile data)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  agency_name text,
  agency_email text,
  subscription_tier text default 'free',
  subscription_status text default 'inactive',
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Casting Pipeline
create table public.auditions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  project_name text not null,
  role_name text,
  casting_director text,
  agency text,
  status text default 'submitted' not null,
  submitted_date date,
  callback_date date,
  shoot_date date,
  location text,
  notes text,
  self_tape_url text,
  headshot_url text,
  resume_url text,
  compensation text,
  contract_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Self-Tape Tracking
create table public.self_tapes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  audition_id uuid references public.auditions(id) on delete set null,
  title text not null,
  video_url text not null,
  thumbnail_url text,
  scene_partner text,
  deadline date,
  submitted boolean default false,
  feedback text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Outreach CRM
create table public.contacts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  role text,
  company text,
  last_contact_date date,
  notes text,
  priority integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.outreach_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  contact_id uuid references public.contacts(id) on delete cascade,
  type text not null,
  notes text,
  date date not null default current_date,
  follow_up_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Contract Analysis
create table public.contracts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  file_url text not null,
  status text default 'uploaded',
  summary text,
  key_clauses jsonb,
  red_flags text[],
  questions text[],
  analyzed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Calendar Reminders
create table public.reminders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  due_date timestamp with time zone not null,
  type text default 'general',
  related_id uuid,
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- University Licensing (Phase 2)
create table public.universities (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  department text,
  contact_name text,
  contact_email text,
  license_tier text default 'standard',
  student_count integer,
  active boolean default false,
  stripe_subscription_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.auditions enable row level security;
alter table public.self_tapes enable row level security;
alter table public.contacts enable row level security;
alter table public.outreach_logs enable row level security;
alter table public.contracts enable row level security;
alter table public.reminders enable row level security;

create policy "Users can only access their own profile"
  on public.profiles for all
  using (auth.uid() = id);

create policy "Users can only access their own auditions"
  on public.auditions for all
  using (auth.uid() = user_id);

create policy "Users can only access their own self tapes"
  on public.self_tapes for all
  using (auth.uid() = user_id);

create policy "Users can only access their own contacts"
  on public.contacts for all
  using (auth.uid() = user_id);

create policy "Users can only access their own outreach logs"
  on public.outreach_logs for all
  using (auth.uid() = user_id);

create policy "Users can only access their own contracts"
  on public.contracts for all
  using (auth.uid() = user_id);

create policy "Users can only access their own reminders"
  on public.reminders for all
  using (auth.uid() = user_id);

-- Auto-create profile on signup
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
-- (Manual: add to each table or use a generic trigger)

-- ==========================================
-- EMAIL INTEGRATION (v2)
-- ==========================================

-- Gmail OAuth tokens for each user
-- Tokens encrypted at rest by Supabase row-level security
-- Only user (and service role) can read their own tokens
create table public.email_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  provider text not null default 'gmail', -- gmail, custom_imap, etc.
  email_address text not null,
  display_name text,                       -- "Christian's Actor Gmail"
  access_token text not null,              -- OAuth2 access token
  refresh_token text not null,             -- OAuth2 refresh token
  token_expires_at timestamp with time zone,-- When access_token expires
  scopes text[] default array['https://www.googleapis.com/auth/gmail.readonly'],
  is_active boolean default true,
  last_synced_at timestamp with time zone, -- Last successful sync
  sync_cursor text,                        -- Gmail historyId for incremental sync
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.email_connections enable row level security;
create policy "Users can only manage their own email connections"
  on public.email_connections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Raw casting emails fetched from user's mailbox
create table public.casting_emails (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  connection_id uuid references public.email_connections(id) on delete cascade not null,
  gmail_message_id text not null,          -- Gmail API message id
  thread_id text,
  from_address text not null,              -- sender email
  from_name text,                          -- "Yamazaki Group Casting"
  to_address text not null,                -- user's actor email
  subject text not null,
  body_text text,                          -- Plain text body
  body_html text,                          -- HTML body (stripped later)
  received_at timestamp with time zone not null,
  is_casting_email boolean default false,  -- Flag after AI/pattern detection
  processing_status text default 'pending' not null,
    -- pending -> parsing -> parsed -> audition_created -> skipped -> error
  parsing_error text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, gmail_message_id)
);

-- Index for fast scanning + dedupe during sync

create index idx_casting_emails_user_sync on public.casting_emails(user_id, received_at desc);
create index idx_casting_emails_status on public.casting_emails(processing_status);

alter table public.casting_emails enable row level security;
create policy "Users can only see their own casting emails"
  on public.casting_emails for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Parsed audition data extracted from casting emails
-- 1:1 or 1:many with casting_emails (one email may have multiple auditions)
create table public.parsed_auditions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  email_id uuid references public.casting_emails(id) on delete cascade not null,
  source_email_id uuid references public.casting_emails(id) on delete set null, -- backward ref
  audition_id uuid references public.auditions(id) on delete set null,         -- once converted
  confidence_score integer default 0,       -- 0-100, AI confidence
  parser_version text default 'v1',          -- Which parser/extractor version
  extracted_fields jsonb default '{}',     -- { project_name: "...", role: "...", deadline: "..." }
  raw_snippets text[],                     -- Array of text snippets used
  needs_review boolean default true,        -- Human verification required
  review_reason text,                      -- Why it needs review
  reviewed_by_user boolean default false,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.parsed_auditions enable row level security;
create policy "Users can only see their own parsed auditions"
  on public.parsed_auditions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ==========================================
-- CONTRACT RESTRICTIONS (Social Media Compliance)
-- ==========================================

create table public.contract_restrictions (
  id uuid default gen_random_uuid() primary key,
  contract_id uuid references public.contracts(id) on delete cascade not null,
  restriction_type text not null, -- 'nda', 'social_media_ban', 'bts_delay', 'exclusivity', 'non_compete', 'confidentiality'
  description text not null,
  applies_to_platforms text[] default array['instagram', 'linkedin', 'facebook', 'twitter'],
  effective_date date,
  expiry_date date,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.contract_restrictions enable row level security;
create policy "Users can only access their own contract restrictions"
  on public.contract_restrictions for all
  using (auth.uid() = (select user_id from public.contracts where id = contract_id))
  with check (auth.uid() = (select user_id from public.contracts where id = contract_id));

-- ==========================================
-- CONTRACT ANALYSIS LOGS (AI processing tracking)
-- ==========================================

create table public.contract_analysis_logs (
  id uuid default gen_random_uuid() primary key,
  contract_id uuid references public.contracts(id) on delete cascade not null,
  analysis_type text not null, -- 'initial', 'comparison', 'compliance_check'
  model_used text default 'claude-sonnet-4',
  raw_response text,
  processing_time_ms integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.contract_analysis_logs enable row level security;
create policy "Users can only access their own analysis logs"
  on public.contract_analysis_logs for all
  using (auth.uid() = (select user_id from public.contracts where id = contract_id));

-- ==========================================
-- PARSER PATTERNS (shared reference data)
-- ==========================================

-- Known casting agency email patterns for auto-detection
create table public.casting_agency_patterns (
  id uuid default gen_random_uuid() primary key,
  domain_pattern text not null,            -- e.g. "@bay-side.biz", "@lilianamodels.com"
  agency_name text not null,
  display_name text,
  country text default 'JP',
  email_signatures text[],                 -- Common footer phrases
  role_keywords text[],                    -- Keywords that indicate casting emails
  is_verified boolean default false,
  match_priority integer default 100,      -- Higher = checked first
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(domain_pattern)
);

-- Seed with your known agencies
insert into public.casting_agency_patterns (domain_pattern, agency_name, display_name, country, role_keywords, match_priority)
values
  ('@bay-side.biz', 'BAYSIDE', 'BAYSIDE Co., Ltd.', 'JP', array['audition','casting','self-tape','callback','shoot'], 100),
  ('@lilianamodels.com', 'Liliana Models', 'Liliana Model Agency', 'JP', array['modeling','audition','fitting','commercial'], 90),
  ('@horipro.co.jp', 'Horipro', 'Horipro Inc.', 'JP', array['audition','role','casting','schedule'], 95)
on conflict (domain_pattern) do nothing;

-- Anyone can read agency patterns (no user_id link)
alter table public.casting_agency_patterns enable row level security;
create policy "Agency patterns are readable by all authenticated users"
  on public.casting_agency_patterns for select
  using (auth.role() = 'authenticated');

-- =====================================================================
-- Redesign migration (Claude design handoff) — new columns + tables
-- Safe to re-run: all additions use IF NOT EXISTS.
-- =====================================================================

-- Profile additions: splash, currency/city, goals, theme, focus mode
alter table public.profiles add column if not exists splash_photo_url text;
alter table public.profiles add column if not exists splash_mode text
  check (splash_mode in ('headshot','onset','stage'));
alter table public.profiles add column if not exists currency text default 'JPY';
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists monthly_goal numeric;
alter table public.profiles add column if not exists yearly_goal numeric;
alter table public.profiles add column if not exists theme_id text default 'cinematic';
alter table public.profiles add column if not exists custom_theme jsonb;
alter table public.profiles add column if not exists preferred_mode text default 'both'
  check (preferred_mode in ('theater','film','both'));

-- Audition additions: shoot-day / overtime fields
alter table public.auditions add column if not exists call_time text;
alter table public.auditions add column if not exists est_wrap_time text;
alter table public.auditions add column if not exists wrap_time text;
alter table public.auditions add column if not exists ot_rate_multiplier numeric default 1.5;

-- One row per self-tape take
create table if not exists public.audition_takes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  self_tape_id uuid references public.self_tapes(id) on delete cascade,
  take_number integer not null default 1,
  video_url text,
  thumbnail_url text,
  duration_seconds integer,
  is_selected boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.audition_takes enable row level security;
create policy "Users own their takes" on public.audition_takes
  for all using (auth.uid() = user_id);
create index if not exists idx_audition_takes_tape on public.audition_takes(self_tape_id);

-- Per-shoot overtime records (feeds Earnings OT stat)
create table if not exists public.overtime_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  audition_id uuid references public.auditions(id) on delete set null,
  shoot_date date not null,
  minutes_overtime integer not null default 0,
  hourly_rate numeric,
  multiplier numeric default 1.5,
  calculated_amount numeric,
  paid boolean default false,
  paid_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.overtime_log enable row level security;
create policy "Users own their overtime log" on public.overtime_log
  for all using (auth.uid() = user_id);
create index if not exists idx_overtime_user on public.overtime_log(user_id, shoot_date);

-- Obsidian-style notes graph (Relationships — future-facing scaffold)
create table if not exists public.relationships_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  title text not null,
  body text,
  links uuid[] default '{}',
  entity_type text check (entity_type in ('person','project','place')),
  entity_id uuid,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.relationships_notes enable row level security;
create policy "Users own their notes" on public.relationships_notes
  for all using (auth.uid() = user_id);

-- Multi-source approvals queue (email / text / agent forward)
create table if not exists public.approvals_queue (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  source text check (source in ('email','text','forward')),
  confidence integer,
  parsed_audition_id uuid references public.parsed_auditions(id) on delete set null,
  raw_payload jsonb,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.approvals_queue enable row level security;
create policy "Users own their approvals" on public.approvals_queue
  for all using (auth.uid() = user_id);
create index if not exists idx_approvals_user on public.approvals_queue(user_id, status);
