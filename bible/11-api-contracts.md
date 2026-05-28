# Chapter 11: API Contracts

Every API route in Actor OS with method, request body, response shape, authentication requirements, and error cases.

---

## Route Index

| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/auditions` | GET, POST, PUT, DELETE | x-user-id header | Full CRUD on auditions |
| `/api/checkout` | POST | None (email in body) | Create Stripe checkout session |
| `/api/webhook` | POST | Stripe signature | Handle Stripe subscription events |
| `/api/portal` | POST | user_id in body | Create Stripe billing portal session |
| `/api/contracts/analyze` | POST | Service role (contractId) | AI contract analysis |
| `/api/gmail/auth` | GET | None | Return Google OAuth URL |
| `/api/gmail/callback` | GET | OAuth state parameter | Handle Google OAuth callback |
| `/api/gmail/sync` | POST | user_id or connection_id | Sync emails from Gmail |
| `/api/gmail/parse` | POST | user_id or connection_id | Parse casting emails with AI |

---

## POST /api/auditions (Create)

**Auth:** `x-user-id` header required. Verified by checking the header exists.

**Request:**
```typescript
{
  project_name: string       // Required
  role_name?: string
  casting_director?: string
  agency?: string
  status?: string            // Default: "submitted"
  submitted_date?: string    // ISO date
  callback_date?: string
  shoot_date?: string
  location?: string
  notes?: string
  compensation?: string
  call_time?: string
  est_wrap_time?: string
  wrap_time?: string
  ot_rate_multiplier?: number
}
```

**Response (201):**
```typescript
{
  id: string,
  user_id: string,
  project_name: string,
  // ... all audition fields
  created_at: string,
  updated_at: string
}
```

**Errors:**
- 401: Missing x-user-id header
- 500: Database insertion error

---

## GET /api/auditions (List)

**Auth:** `x-user-id` header required.

**Response (200):**
```typescript
Audition[]  // Array of all auditions for this user, ordered by created_at descending
```

---

## PUT /api/auditions (Update)

**Auth:** `x-user-id` header required. Enforces `user_id` match in query.

**Request:**
```typescript
{
  id: string,              // Required -- which audition to update
  // ... any audition fields to update
}
```

**Response (200):**
```typescript
Audition  // Updated audition
```

---

## DELETE /api/auditions

**Auth:** `x-user-id` header required. Enforces `user_id` match in query.

**Request:**
```typescript
{ id: string }
```

**Response (200):**
```typescript
{ success: true }
```

---

## POST /api/checkout

**Auth:** None (pre-signup). Email is passed in the body.

**Request:**
```typescript
{
  plan: "monthly" | "annual",
  email: string,
  name?: string
}
```

**Response (200):**
```typescript
{ url: string }  // Stripe Checkout Session URL -- client redirects here
```

**Errors:**
- 400: Missing plan or email
- 500: Stripe API error

**Behavior:**
1. Finds existing Stripe customer by email, or creates one.
2. Creates a Checkout Session with the appropriate Price ID.
3. Sets 14-day trial, enables promotion codes.
4. Returns the session URL.

---

## POST /api/webhook

**Auth:** Stripe webhook signature verification.

**Request:** Raw body (Stripe event payload).

**Headers required:** `stripe-signature`

**Response (200):**
```typescript
{ received: true }
```

**Errors:**
- 400: Signature verification failed

**Events handled:**

| Event | Profile Updates |
|-------|----------------|
| `checkout.session.completed` | Sets `stripe_customer_id`, `stripe_subscription_id`, `subscription_status = 'active'`, `subscription_tier` |
| `customer.subscription.updated` | Maps Stripe status to `active`, `past_due`, or `cancelled` |
| `customer.subscription.deleted` | Sets `cancelled`, clears subscription ID, resets tier to `free` |
| `invoice.payment_failed` | Sets `past_due` |

---

## POST /api/portal

**Auth:** `user_id` in request body. Service role looks up Stripe customer.

**Request:**
```typescript
{ user_id: string }
```

**Response (200):**
```typescript
{ url: string }  // Stripe Billing Portal URL
```

**Errors:**
- 401: Missing user_id
- 400: No Stripe customer found for this user
- 500: Stripe API error

---

## POST /api/contracts/analyze

**Auth:** Service role. Contract ownership verified via database lookup.

**Request:**
```typescript
{
  contractId: string,          // Required
  contractText?: string,       // Pasted contract text
  fileUrl?: string             // URL to contract file (PDF extraction not yet implemented)
}
```

**Response (200):**
```typescript
{
  success: true,
  contractId: string,
  analysis: {
    summary: string,
    key_clauses: Record<string, string>,
    red_flags: string[],
    questions: string[],
    overall_grade: "A" | "B" | "C" | "D" | "F",
    grade_reasoning: string,
    compensation: {
      amount: string,
      type: string,
      notes: string
    },
    schedule: {
      shoot_dates: string[],
      location: string,
      call_times: string | null,
      duration_days: number | null
    }
  }
}
```

**Errors:**
- 400: Missing contractId, or contract text too short (< 50 characters)
- 404: Contract not found
- 500: LLM response parsing failure (raw response saved to `contract_analysis_logs`)

**Side effects:**
1. Updates contract status to `analyzing`, then `reviewed`.
2. Saves `summary`, `key_clauses`, `red_flags`, `questions`, `analyzed_at` on the contract.
3. Inserts rows into `contract_restrictions` for each extracted restriction.
4. Inserts a row into `contract_analysis_logs` with model used and raw response.
5. If compensation and schedule are extracted, attempts to link to existing auditions by matching project name.

---

## GET /api/gmail/auth

**Auth:** None (OAuth flow initiation).

**Response (200):**
```typescript
{ url: string }  // Google OAuth authorization URL
```

The URL includes:
- `client_id` from env
- `redirect_uri` pointing to `/api/gmail/callback`
- `response_type: "code"`
- Scopes: `gmail.readonly`, `gmail.modify`, `userinfo.email`, `userinfo.profile`
- `access_type: "offline"` (ensures refresh token)
- `prompt: "consent"` (forces consent screen for refresh token)

---

## GET /api/gmail/callback

**Auth:** OAuth state parameter contains user_id.

**Query parameters:**
- `code`: Authorization code from Google
- `error`: Error from Google (if any)
- `state`: Supabase user_id

**Response:** Redirect to `/dashboard/settings` with query parameters:
- Success: `?email_connected={email}`
- Error: `?email_error={error_type}`

**Behavior:**
1. Exchanges authorization code for tokens.
2. Fetches Google user info.
3. Resolves user_id from state parameter (or falls back to profile email lookup).
4. Upserts `email_connections` row with tokens, scopes, and expiry.

---

## POST /api/gmail/sync

**Auth:** `user_id` or `connection_id` in body.

**Request:**
```typescript
{
  user_id?: string,
  connection_id?: string,
  force_full?: boolean       // Default: false
}
```

**Response (200):**
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

**Errors:**
- 404: No active email connections found
- 500: Sync error

**Side effects:**
1. Refreshes OAuth tokens if expired.
2. Fetches up to 50 messages from Gmail (full search or incremental via historyId).
3. Inserts new emails into `casting_emails` with casting detection.
4. Auto-creates contacts for new senders.
5. Fires LLM contact description generation (fire-and-forget).
6. Updates `sync_cursor` and `last_synced_at` on the connection.

---

## POST /api/gmail/parse

**Auth:** `user_id`, `connection_id`, or `email_ids` in body.

**Request:**
```typescript
{
  user_id?: string,
  connection_id?: string,
  email_ids?: string[],
  auto_create?: boolean,     // Default: false. If true, auto-create auditions for high-confidence parses
  dry_run?: boolean          // Default: false. If true, parse but do not create auditions or update statuses
}
```

**Response (200):**
```typescript
{
  processed: number,
  parsed: number,
  created: number,
  needs_review: number,
  errors: number,
  results: [{
    email_id: string,
    status: "success" | "error",
    confidence: number,
    needs_review: boolean,
    audition_created: boolean,
    audition_id: string | null,
    fields: {
      project_name: string | null,
      role_name: string | null,
      agency: string | null
    },
    error?: string
  }]
}
```

**Behavior:**
1. Fetches pending casting emails (last 30 days, limit 100).
2. For each email, runs LLM parser (with regex fallback).
3. Inserts `parsed_auditions` row with extracted fields and confidence.
4. If `auto_create` and confidence >= 80: creates an audition and links it.
5. Updates `casting_emails.processing_status`.

---

## Authentication Summary

| Route | Method | Auth Mechanism |
|-------|--------|----------------|
| `/api/auditions` | All | `x-user-id` header |
| `/api/checkout` | POST | None (public) |
| `/api/webhook` | POST | Stripe signature |
| `/api/portal` | POST | `user_id` in body |
| `/api/contracts/analyze` | POST | Service role + contract ownership check |
| `/api/gmail/auth` | GET | None (public) |
| `/api/gmail/callback` | GET | OAuth state |
| `/api/gmail/sync` | POST | `user_id` or `connection_id` in body |
| `/api/gmail/parse` | POST | `user_id` or `connection_id` in body |

**Note:** The Gmail sync and parse routes currently trust the `user_id` in the request body. In production, these should be hardened to verify the calling user's session before operating on their data. The Stripe webhook route is properly secured via signature verification.
