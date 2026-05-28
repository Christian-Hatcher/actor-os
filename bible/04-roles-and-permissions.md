# Chapter 4: Roles and Permissions

Actor OS has a deliberately simple permission model. There is one user role today, one planned for Phase 2, and one system role. Row Level Security at the database layer is the primary enforcement mechanism -- the application code never makes authorization decisions.

---

## Current Roles

### 1. Individual Actor (All Users)

Every person who signs up for Actor OS is an Individual Actor. They own all of their data and can only see their own data.

**What they can do:**

- Create, read, update, and delete their own auditions, self-tapes, contacts, outreach logs, contracts, reminders, tax withholdings, and actor preferences
- Connect and manage their own Gmail accounts
- View parsed auditions from their own casting emails
- Approve or skip parsed auditions in their review queue
- Trigger AI contract analysis on their own contracts
- Manage their profile (name, avatar, theme, currency, tax settings, goals)
- Subscribe, change plans, and cancel via Stripe billing portal
- Read (but not write) shared casting agency patterns

**How it is enforced:**

Every user-facing table has a Row Level Security policy:

```sql
create policy "Users can only access their own auditions"
  on public.auditions for all
  using (auth.uid() = user_id);
```

The `for all` qualifier means this single policy covers SELECT, INSERT, UPDATE, and DELETE. A user can never query, modify, or delete another user's rows. This is enforced at the Postgres level -- even if a React component had a bug that passed the wrong user_id, the database would reject the operation.

For tables without a direct `user_id` column (like `contract_restrictions` and `contract_analysis_logs`), the RLS policy uses a subquery:

```sql
create policy "Users can only access their own contract restrictions"
  on public.contract_restrictions for all
  using (auth.uid() = (select user_id from public.contracts where id = contract_id));
```

---

### 2. System / Service Role

The Supabase service role key is used exclusively in Next.js API routes for operations that require elevated access.

**When it is used:**

| Operation | Why Service Role Is Needed |
|-----------|---------------------------|
| Stripe webhook handler | Webhook has no user session -- it updates profiles by `stripe_customer_id` |
| Gmail sync | Needs to read/write email_connections, casting_emails, and contacts for the target user |
| Gmail parse | Needs to insert parsed_auditions and update casting_emails processing status |
| Contract analysis | Needs to update contract status and insert analysis logs |
| Gmail callback | Needs to insert/update email_connections during OAuth flow |
| Billing portal | Needs to read the stripe_customer_id from profiles |

**How it is used:**

```typescript
// src/lib/supabase-admin.ts
import { createClient } from "@supabase/supabase-js"

export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

This client bypasses RLS entirely. It is never imported into client-side code. Every API route that uses it manually validates the user (via `x-user-id` header or Stripe webhook signature).

**Security guarantee:** The service role key is a server-side environment variable. It is never exposed to the browser. Vercel environment variables are encrypted at rest.

---

### 3. University Admin (Phase 2 -- Not Yet Implemented)

When university licensing launches, a new role will be added for department administrators.

**Planned capabilities:**

- View aggregate statistics for their university's students (anonymized or with consent)
- Manage student seat count and billing
- Access admin dashboard with career readiness metrics
- Cannot view individual student auditions, contracts, or personal data

**Planned enforcement:**

A new `university_memberships` table will link users to universities with a role column:

```sql
-- Phase 2 (planned, not yet in schema)
create table university_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  university_id uuid references universities(id) not null,
  role text not null check (role in ('student', 'admin')),
  created_at timestamptz default now(),
  unique(user_id, university_id)
);
```

The existing `universities` table already has `name`, `department`, `contact_name`, `contact_email`, `license_tier`, `student_count`, `active`, and `stripe_subscription_id` columns. It currently has no user-scoped RLS because it is admin-managed via service role.

---

## RLS Policy Summary

| Table | Policy Name | Scope |
|-------|-------------|-------|
| profiles | Users can only access their own profile | `auth.uid() = id` |
| auditions | Users can only access their own auditions | `auth.uid() = user_id` |
| self_tapes | Users can only access their own self tapes | `auth.uid() = user_id` |
| contacts | Users can only access their own contacts | `auth.uid() = user_id` |
| outreach_logs | Users can only access their own outreach logs | `auth.uid() = user_id` |
| contracts | Users can only access their own contracts | `auth.uid() = user_id` |
| contract_restrictions | Users can only access their own contract restrictions | Subquery through contracts table |
| contract_analysis_logs | Users can only access their own analysis logs | Subquery through contracts table |
| reminders | Users can only access their own reminders | `auth.uid() = user_id` |
| email_connections | Users can only manage their own email connections | `auth.uid() = user_id` (with check) |
| casting_emails | Users can only see their own casting emails | `auth.uid() = user_id` (with check) |
| parsed_auditions | Users can only see their own parsed auditions | `auth.uid() = user_id` (with check) |
| casting_agency_patterns | Agency patterns are readable by all authenticated users | `auth.role() = 'authenticated'` (select only) |
| audition_takes | Users own their takes | `auth.uid() = user_id` |
| overtime_log | Users own their overtime log | `auth.uid() = user_id` |
| relationships_notes | Users own their notes | `auth.uid() = user_id` |
| approvals_queue | Users own their approvals | `auth.uid() = user_id` |
| tax_withholdings | Three separate policies (select, insert, update) | `auth.uid() = user_id` |

---

## Authentication Flow

1. **Signup:** User submits email + password to Supabase Auth. A JWT session is created. The `on_auth_user_created` trigger auto-creates a `profiles` row.

2. **Login:** User authenticates with Supabase Auth. The `useAuth` hook in `src/hooks/use-auth.tsx` listens to `onAuthStateChange` and fetches the profile.

3. **Session refresh:** Supabase JS client handles token refresh automatically. The JWT contains `auth.uid()` which Postgres uses for RLS evaluation.

4. **API route auth:** Client-side code passes the user ID via the `x-user-id` header. API routes verify this against the service-role Supabase client. The Stripe webhook route verifies the webhook signature instead.

5. **Signout:** `supabase.auth.signOut()` clears the session. The `AuthGuard` component redirects to `/login`.

---

## Design Philosophy: Why This Simple

Actors are individual freelancers. They do not share data with each other (until Cast Collaboration in Phase 2.5). There is no multi-tenant complexity, no team hierarchy, no admin-vs-member distinction. The permission model is:

- **You own your data.**
- **Nobody else can see it.**
- **The database enforces this, not the application.**

This simplicity is intentional and will only grow more complex when the product requires it (university licensing, cast collaboration, Stage Manager OS). Adding roles later is straightforward because RLS policies are additive -- you add new policies alongside existing ones without breaking anything.
