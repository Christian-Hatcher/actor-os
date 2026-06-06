-- Actor OS V2 Migration: Jobs, Rehearsals, Scripts, Annotations, Productions
-- Apply via Supabase SQL editor

-- ============================================================
-- Jobs (V2.0)
-- ============================================================
create table public.jobs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  audition_id uuid references public.auditions(id) on delete set null,
  production_id uuid,  -- FK added after productions table exists
  title text not null,
  role_name text,
  project_type text default 'other' not null,
  status text default 'active' not null,
  location text,
  compensation text,
  start_date date,
  end_date date,
  contract_id uuid references public.contracts(id) on delete set null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.jobs enable row level security;
create policy "Users can manage own jobs" on public.jobs
  for all using (auth.uid() = user_id);

create index idx_jobs_user_status on public.jobs(user_id, status);
create index idx_jobs_audition on public.jobs(audition_id);

-- Add job_id backlink to auditions
alter table public.auditions add column if not exists job_id uuid references public.jobs(id) on delete set null;

-- ============================================================
-- Rehearsal Logs (V2.1)
-- ============================================================
create table public.rehearsal_logs (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  type text default 'other' not null,
  duration_minutes integer,
  location text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.rehearsal_logs enable row level security;
create policy "Users can manage own rehearsal logs" on public.rehearsal_logs
  for all using (auth.uid() = user_id);

create index idx_rehearsal_logs_job_date on public.rehearsal_logs(job_id, date);

-- ============================================================
-- Scripts (V2.2)
-- ============================================================
create table public.scripts (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  file_name text not null,
  file_url text not null,
  file_type text not null,
  file_size_bytes bigint not null,
  version_label text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.scripts enable row level security;
create policy "Users can manage own scripts" on public.scripts
  for all using (auth.uid() = user_id);

-- Script Annotations
create table public.script_annotations (
  id uuid default gen_random_uuid() primary key,
  script_id uuid references public.scripts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  page_number integer,
  line_reference text,
  annotation_type text default 'general' not null,
  content text not null,
  color text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.script_annotations enable row level security;
create policy "Users can manage own annotations" on public.script_annotations
  for all using (auth.uid() = user_id);

create index idx_script_annotations_script on public.script_annotations(script_id);

-- Create scripts storage bucket
insert into storage.buckets (id, name, public)
values ('scripts', 'scripts', false)
on conflict (id) do nothing;

create policy "Users can upload own scripts" on storage.objects
  for insert with check (
    bucket_id = 'scripts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can read own scripts" on storage.objects
  for select using (
    bucket_id = 'scripts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own scripts" on storage.objects
  for delete using (
    bucket_id = 'scripts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- Productions / Cast Collaboration (V2.5)
-- ============================================================
create table public.productions (
  id uuid default gen_random_uuid() primary key,
  created_by uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  invite_code text not null unique,
  project_type text default 'other' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.productions enable row level security;

create table public.production_members (
  id uuid default gen_random_uuid() primary key,
  production_id uuid references public.productions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role_label text,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(production_id, user_id)
);

alter table public.production_members enable row level security;

create table public.production_notes (
  id uuid default gen_random_uuid() primary key,
  production_id uuid references public.productions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.production_notes enable row level security;

create index idx_production_notes_prod_date on public.production_notes(production_id, created_at);

-- Production RLS: members can see their productions
create policy "Members can view productions" on public.productions
  for select using (
    id in (select production_id from public.production_members where user_id = auth.uid())
    or created_by = auth.uid()
  );

create policy "Creator can manage productions" on public.productions
  for all using (created_by = auth.uid());

create policy "Members can view membership" on public.production_members
  for select using (
    production_id in (select production_id from public.production_members where user_id = auth.uid())
  );

create policy "Users can join productions" on public.production_members
  for insert with check (user_id = auth.uid());

create policy "Users can leave productions" on public.production_members
  for delete using (user_id = auth.uid());

create policy "Members can view notes" on public.production_notes
  for select using (
    production_id in (select production_id from public.production_members where user_id = auth.uid())
  );

create policy "Members can create notes" on public.production_notes
  for insert with check (
    user_id = auth.uid()
    and production_id in (select production_id from public.production_members where user_id = auth.uid())
  );

create policy "Users can delete own notes" on public.production_notes
  for delete using (user_id = auth.uid());

-- Add production_id FK to jobs now that productions table exists
alter table public.jobs
  add constraint jobs_production_fk
  foreign key (production_id) references public.productions(id) on delete set null;

-- ============================================================
-- Backfill: create jobs for existing booked auditions
-- ============================================================
insert into public.jobs (user_id, audition_id, title, role_name, location, compensation, project_type, status)
select
  a.user_id,
  a.id,
  a.project_name,
  a.role_name,
  a.location,
  a.compensation,
  'other',
  'active'
from public.auditions a
where a.status = 'booked'
  and not exists (select 1 from public.jobs j where j.audition_id = a.id);

-- Backfill job_id on auditions
update public.auditions a
set job_id = j.id
from public.jobs j
where j.audition_id = a.id
  and a.job_id is null;
