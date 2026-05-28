# Chapter 6: Email Ingestion Pipeline

The email ingestion pipeline is the most complex feature in Actor OS. It connects an actor's Gmail inbox to their casting pipeline, automatically detecting casting emails, parsing them with AI, and presenting extracted auditions for one-tap approval.

---

## Pipeline Overview

```
Gmail Inbox
  |
  | [1] OAuth2 Connection
  v
email_connections table (tokens stored)
  |
  | [2] Sync (manual trigger or future cron)
  v
Gmail API (search + fetch messages)
  |
  | [3] Casting Detection (domain patterns + keywords)
  v
casting_emails table (raw email data)
  |
  | [4] Parse (LLM with regex fallback)
  v
parsed_auditions table (extracted fields + confidence)
  |
  | [5] Review Queue (user approves or skips)
  v
auditions table (new audition created)
```

---

## Step 1: Gmail OAuth Connection

**API:** `GET /api/gmail/auth`, `GET /api/gmail/callback`

### Auth Flow

1. User clicks "Connect Gmail Account" in Settings.
2. Client calls `GET /api/gmail/auth` which returns a Google OAuth URL.
3. Client appends the Supabase `user.id` as the `state` parameter and redirects to Google.
4. User authorizes read-only Gmail access.
5. Google redirects to `GET /api/gmail/callback` with an authorization code.
6. Callback exchanges the code for access and refresh tokens via `https://oauth2.googleapis.com/token`.
7. Callback fetches user info from `https://www.googleapis.com/oauth2/v2/userinfo`.
8. If an `email_connections` row already exists for this user + email, it is updated. Otherwise a new row is inserted.
9. User is redirected to `/dashboard/settings?email_connected={email}`.

### Scopes Requested

```
gmail.readonly     — Read email content
gmail.modify       — Needed for history API (does NOT send or delete)
userinfo.email     — Get the connected email address
userinfo.profile   — Get display name
```

### Token Lifecycle

Access tokens expire (typically 1 hour). Before every sync, `getValidAccessToken()` checks `token_expires_at` with a 5-minute buffer. If expired or about to expire, it calls `refreshAccessToken()` using the stored refresh token. The new access token and expiry are saved back to `email_connections`.

If the refresh fails (user revoked access, refresh token expired), the connection is marked `is_active = false`.

---

## Step 2: Email Sync

**API:** `POST /api/gmail/sync`

### Request Body

```typescript
{
  user_id?: string       // Sync all connections for this user
  connection_id?: string // Sync a specific connection
  force_full?: boolean   // Ignore cursor, do full search (default: false)
}
```

### Sync Strategy

Two modes:

1. **Full search (first sync or force_full):** Queries Gmail with a keyword-based search:
   ```
   (audition OR casting OR self-tape OR callback OR ... Japanese keywords ...) newer_than:30d
   ```
   Limited to 50 messages per sync. After fetching, records the Gmail `historyId` from the user's profile as the cursor for future incremental syncs.

2. **Incremental sync (subsequent syncs):** Uses Gmail's History API with the stored `sync_cursor` (historyId) to fetch only messages added since the last sync. Falls back to full search if the History API fails.

### Per-Message Processing

For each fetched message:

1. **Deduplicate:** Check `casting_emails` for existing `(user_id, gmail_message_id)`. Skip if found.

2. **Extract content:** Parse the Gmail message payload recursively, decoding base64url text/plain and text/html parts.

3. **Extract headers:** From, To, Subject, Date.

4. **Casting detection:** An email is flagged as a casting email (`is_casting_email = true`) if ANY of these conditions match:
   - Sender domain is a known agency (`bay-side.biz`, `lilianamodels.com`, `horipro.co.jp`)
   - Subject contains casting keywords: audition, casting, self-tape, self tape, callback, or Japanese equivalents
   - Body contains: audition, self-tape, or Japanese filming keywords

5. **Insert:** Save to `casting_emails` with `processing_status = 'pending'` if casting, `'skipped'` if not.

6. **Contact auto-creation:** For each new sender email:
   - Check if a contact with that email already exists for this user.
   - If exists: update `last_contact_date`.
   - If new: insert a contact with name, email, company (derived from domain), role ("Casting" if casting email), priority 3.
   - Fire-and-forget: call `llm("low", ...)` to generate a one-sentence description and save it to `contacts.notes`.

### Response

```typescript
{
  results: [{
    connection_id: string,
    status: "success" | "error",
    emails_fetched: number,
    emails_inserted: number,
    emails_skipped: number,
    history_id: string,
    error?: string
  }]
}
```

---

## Step 3: Casting Detection

Casting detection happens in two layers during sync:

### Layer 1: Domain Pattern Matching

The `casting_agency_patterns` table contains known agency domains. Currently seeded with three agencies:

| Domain Pattern | Agency Name | Priority |
|---------------|-------------|----------|
| `@bay-side.biz` | BAYSIDE | 100 |
| `@horipro.co.jp` | Horipro | 95 |
| `@lilianamodels.com` | Liliana Models | 90 |

Emails from these domains are automatically marked as casting emails with high confidence.

### Layer 2: Keyword Matching

If the sender domain is not in the patterns table, the subject and body are scanned for keywords in English and Japanese:

**English keywords:** audition, casting, self-tape, self tape, callback
**Japanese keywords:** (kanji for appearance/performance), (katakana for audition), (katakana for casting), (kanji for filming day)

---

## Step 4: Email Parsing

**API:** `POST /api/gmail/parse`

### Two-Pass Parser

**Version 2 (LLM-powered, primary):** Sends the email subject, body (truncated to 3000 characters), and from address to `llm("low", ...)` with a structured extraction prompt. The LLM returns JSON with:

- `project_name`, `role_name`, `casting_director`, `agency`, `location`
- `compensation`, `deadline`, `shoot_date`, `callback_date`
- `notes`, `summary` (1-2 sentence plain English)
- `is_casting_email` (boolean), `confidence` (0-100)

**Version 1 (regex, fallback):** If the LLM call fails, a deterministic regex parser extracts the same fields using:

- Agency detection from known domains (+20 confidence)
- Cast/role extraction from "CAST:" patterns (+25 confidence)
- Project name from subject line patterns like "heading/bracket" structures (+20 confidence)
- Compensation from yen/dollar patterns (+10 confidence)
- Shoot date from Japanese and English date patterns (+10 confidence)
- Deadline from "deadline" keywords (+15 confidence)
- Location from "location/studio" patterns (+5 confidence)
- Casting director from signature patterns (+5 confidence)

Confidence is capped at 100.

### Review Threshold

- Confidence >= 70 AND project_name extracted: no review needed (if auto_create is enabled)
- Confidence < 70 OR no project_name: flagged for human review with a reason string

### Storage

Each parsed email creates a `parsed_auditions` row with:
- Extracted fields as JSONB
- Confidence score
- Parser version (`llm-v2` or `v1`)
- `needs_review` flag
- `review_reason` text

The source `casting_emails` row is updated to `processing_status = 'parsed'` or `'audition_created'`.

---

## Step 5: Review Queue

**Route:** `/dashboard/emails`
**Component:** `src/app/dashboard/emails/page.tsx`

The review queue fetches all `parsed_auditions` where `needs_review = true` and `reviewed_by_user = false`, sorted by confidence descending (most confident first).

### User Actions

| Action | What Happens |
|--------|-------------|
| **Add** | Creates an audition from extracted fields. Links `parsed_auditions.audition_id`. Updates `casting_emails.processing_status` to `'audition_created'`. Removes from queue. |
| **Reply** | Marks as reviewed with `review_reason = 'Needs response'`. Updates email status to `'needs_response'`. Removes from queue. |
| **Skip** | Marks as reviewed with `review_reason = 'User skipped'`. Removes from queue. |

### Confidence Badge Colors

| Score | Color |
|-------|-------|
| >= 70 | Green |
| >= 40 | Yellow |
| < 40 | Red |

---

## Settings Integration

The Settings page shows:

- Connected Gmail accounts with active/disconnected status
- Last sync date
- Sync button (triggers sync + parse pipeline)
- Delete button (removes connection, keeps imported emails)
- Connect Gmail button (starts OAuth flow)

A sync shows three progress states via toast-style inline messages:
1. "Fetching emails from Gmail..."
2. "Parsing X new emails with AI..."
3. Result: "Synced X emails, parsed Y, Z need review."

---

## Privacy Guarantees

1. Actor OS requests **read-only** Gmail access. It never sends emails.
2. Email body text is truncated to 10,000 characters, HTML to 50,000 characters.
3. All email data is scoped to the user via RLS.
4. OAuth tokens are stored in Supabase with RLS -- only the owning user (and service role) can access them.
5. If the user disconnects Gmail, the connection is deleted. Imported emails remain in the database but no new syncs occur.
6. The connection is auto-deactivated if token refresh fails.
