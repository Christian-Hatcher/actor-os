"use client"

const SEED_SQL = `
-- Seed data for Actor OS development
-- Run this in Supabase SQL Editor

-- Seed sample auditions
INSERT INTO auditions (user_id, project_name, role_name, casting_director, agency, status, submitted_date, callback_date, shoot_date, location, notes, compensation, created_at) VALUES
  ('00000000-0000-0000-0000-000000000000', 'LOST10 — TBS Drama', 'Guest Star', 'Yamazaki Group', 'BAYSIDE', 'callback', '2026-05-09', '2026-05-25', null, 'Tokyo Studio', 'Ninja role. Prep sword fight choreography.', '¥80,000/day', now()),
  ('00000000-0000-0000-0000-000000000000', 'Shokz Earphone Commercial', 'Athletic Lead', 'Liliana / Goto', 'Liliana Models', 'submitted', '2026-05-20', null, null, 'Tokyo', 'Deadline May 21 10AM.', null, now()),
  ('00000000-0000-0000-0000-000000000000', 'Home Appliance Commercial', 'Family Member', 'P Company', 'BAYSIDE', 'submitted', '2026-05-20', null, null, 'Tokyo', 'Deadline May 22 10AM.', null, now()),
  ('00000000-0000-0000-0000-000000000000', 'Yamada Denki CM', 'Lead', 'Yamada Casting', 'BAYSIDE', 'passed', '2026-04-15', null, null, 'Saitama', 'Great feedback but went with older actor.', '¥60,000/day', now()),
  ('00000000-0000-0000-0000-000000000000', 'Godzilla Movie', 'Supporting', 'Cyrus Sethna', 'Direct', 'pinned', '2026-03-10', null, null, 'Tokyo', 'Major role. Waiting for callback.', '¥150,000/day', now());

-- Seed sample self-tapes
INSERT INTO self_tapes (user_id, project_name, role_name, deadline, notes, submitted, created_at) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Shokz Earphone', 'Athletic Lead', '2026-05-21T10:00:00', 'Show athletic energy. Wear dark clothes.', false, now()),
  ('00000000-0000-0000-0000-000000000000', 'Home Appliance', 'Family Member', '2026-05-22T10:00:00', 'Warm, friendly. Kitchen setting.', false, now()),
  ('00000000-0000-0000-0000-000000000000', 'LOST10', 'Guest Star', '2026-05-09T18:00:00', 'Sword fight scene uploaded.', true, now());

-- Seed sample contacts
INSERT INTO contacts (user_id, name, company, role, email, type, priority, status, notes, created_at) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Cyrus Sethna', 'Casting Asia', 'Casting Director', 'cyrus@castingasia.com', 'casting_director', 5, 'active', 'Major film contacts. Godzilla connection.', now()),
  ('00000000-0000-0000-0000-000000000000', 'Yamazaki', 'Yamazaki Group', 'Casting Director', null, 'casting_director', 4, 'active', 'TBS Drama LOST10. Great to work with.', now()),
  ('00000000-0000-0000-0000-000000000000', 'Goto', 'Liliana Models', 'Casting', null, 'casting_director', 3, 'active', 'Shokz commercial. Quick turnaround.', now()),
  ('00000000-0000-0000-0000-000000000000', 'Horipro Agent', 'Horipro Inc.', 'Talent Agent', null, 'agent', 5, 'active', 'Primary representation in Japan.', now()),
  ('00000000-0000-0000-0000-000000000000', 'Chuck Johnson', 'QF Stunts', 'Stunt Coordinator', 'chuck@qfstunts.com', 'collaborator', 4, 'active', 'Stunt mentor. Brought me to Japan.', now());

-- Seed sample reminders
INSERT INTO reminders (user_id, title, description, due_date, type, related_id, completed, created_at) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Submit Shokz self-tape', 'Athletic lead role. Deadline May 21 10AM.', '2026-05-21T10:00:00', 'self_tape', null, false, now()),
  ('00000000-0000-0000-0000-000000000000', 'Submit Home Appliance self-tape', 'P Company. Deadline May 22 10AM.', '2026-05-22T10:00:00', 'self_tape', null, false, now()),
  ('00000000-0000-0000-0000-000000000000', 'LOST10 callback prep', 'Practice sword choreography. Callback May 25.', '2026-05-24T18:00:00', 'callback', null, false, now()),
  ('00000000-0000-0000-0000-000000000000', 'Follow up with Cyrus Sethna', 'Godzilla movie lead status check.', '2026-05-23T12:00:00', 'follow_up', null, false, now());
`

export default function SeedPage() {
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Database Seed Script</h1>
      <p className="text-muted-foreground mb-4">
        Copy and paste this SQL into your Supabase SQL Editor to seed
        development data.
      </p>
      <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
        <code>{SEED_SQL}</code>
      </pre>
    </div>
  )
}
