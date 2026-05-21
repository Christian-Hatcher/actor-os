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
