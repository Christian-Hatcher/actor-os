# Chapter 8: Stripe and Monetization

Actor OS is a subscription SaaS with simple pricing, a 14-day free trial, and a university licensing tier planned for Phase 2.

---

## Pricing Tiers

| Plan | Price | Billing | AI Contract Analyses | Support |
|------|-------|---------|---------------------|---------|
| Monthly | $5/month | Monthly recurring | 5 per month | Email support |
| Annual | $45/year ($3.75/month) | Yearly recurring | 10 per month | Priority support |
| University Standard (Phase 2) | $500/year per department | Yearly | Shared pool | Dedicated |
| University Premium (Phase 2) | $1,200/year per department | Yearly | Shared pool + admin analytics | Dedicated |
| University Enterprise (Phase 2) | Custom | Custom | Unlimited | Custom integrations |

The annual plan saves 25% compared to monthly. This is highlighted on the landing page.

---

## 14-Day Free Trial

Every new subscriber starts with a 14-day free trial regardless of plan. The trial is configured at the Stripe level:

```typescript
subscription_data: {
  trial_period_days: 14,
  metadata: { plan },
}
```

During the trial, the user has full access to all features. Stripe will not charge the card until day 15. If the user cancels during the trial, they are never charged.

---

## Stripe Integration

### Environment Variables

```
STRIPE_SECRET_KEY          — Server-side Stripe API key
STRIPE_WEBHOOK_SECRET      — Webhook endpoint signing secret
STRIPE_MONTHLY_PRICE_ID    — Stripe Price ID for $5/month
STRIPE_ANNUAL_PRICE_ID     — Stripe Price ID for $45/year
NEXT_PUBLIC_STRIPE_KEY     — Client-side publishable key
```

### Checkout Flow

**API:** `POST /api/checkout`

**Request:**
```typescript
{
  plan: "monthly" | "annual",
  email: string,
  name?: string
}
```

**Logic:**
1. Find or create a Stripe customer by email.
2. Create a Checkout Session with:
   - The appropriate Price ID based on plan
   - `mode: "subscription"`
   - `trial_period_days: 14`
   - `allow_promotion_codes: true`
   - Success URL: `/dashboard?success=true`
   - Cancel URL: `/checkout?plan={plan}&canceled=true`
3. Return the session URL for client redirect.

**Response:**
```typescript
{ url: string }
```

The client redirects the browser to this URL. Stripe handles the entire checkout experience.

---

### Webhook Handler

**API:** `POST /api/webhook`

The webhook is the source of truth for subscription state. Actor OS never polls Stripe -- it reacts to events.

**Signature Verification:**
```typescript
const event = stripe.webhooks.constructEvent(payload, signature, endpointSecret)
```

If verification fails, the endpoint returns 400. This prevents forged webhooks.

**Events Handled:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Set `stripe_customer_id`, `stripe_subscription_id`, `subscription_status = 'active'`, `subscription_tier` on the user's profile (matched by email) |
| `customer.subscription.updated` | Map Stripe status to Actor OS status: `active`/`trialing` becomes `active`, `past_due` stays `past_due`, `canceled`/`unpaid` becomes `cancelled` |
| `customer.subscription.deleted` | Set `subscription_status = 'cancelled'`, clear `stripe_subscription_id`, reset `subscription_tier = 'free'` |
| `invoice.payment_failed` | Set `subscription_status = 'past_due'` |

**Profile Update Pattern:**

All webhook handlers update profiles by matching on `stripe_customer_id` (except `checkout.session.completed` which matches on email, since the customer ID is being set for the first time).

---

### Billing Portal

**API:** `POST /api/portal`

**Request:**
```typescript
{ user_id: string }
```

**Logic:**
1. Look up the user's `stripe_customer_id` from their profile.
2. Create a Stripe Billing Portal Session with `return_url` pointing to `/dashboard/settings`.
3. Return the portal URL.

The billing portal is Stripe-hosted. It lets users:
- View invoices
- Update payment method
- Change plans (monthly to annual or vice versa)
- Cancel subscription
- View billing history

---

## Beta Tester Coupon System

Checkout sessions are created with `allow_promotion_codes: true`. This means any valid Stripe promotion code can be applied at checkout.

For beta testers, a 100% off coupon code is created in the Stripe dashboard. Beta users enter this code during checkout and get free access for the duration of the coupon (forever, or for a set number of months).

---

## Subscription Status Tracking

The `profiles` table tracks subscription state:

| Column | Values | Meaning |
|--------|--------|---------|
| `subscription_tier` | `free`, `monthly`, `yearly` | Which plan the user is on |
| `subscription_status` | `active`, `inactive`, `cancelled`, `past_due` | Current payment state |
| `stripe_customer_id` | Stripe customer ID | Links to Stripe for billing portal |
| `stripe_subscription_id` | Stripe subscription ID | Active subscription reference |

### Status Mapping

| Stripe Status | Actor OS Status |
|---------------|-----------------|
| `active` | `active` |
| `trialing` | `active` (trial is treated as active) |
| `past_due` | `past_due` |
| `canceled` | `cancelled` |
| `unpaid` | `cancelled` |
| (no subscription) | `inactive` |

---

## Landing Page Pricing Section

**File:** `src/app/page.tsx`

The landing page includes a pricing section with a monthly/annual toggle. The annual card is highlighted when selected. Each card lists features:

**Annual ($45/year):**
- Unlimited auditions
- Self-tape deadline tracker
- AI contract analysis (10/month)
- Outreach CRM
- Priority support

**Monthly ($5/month):**
- Unlimited auditions
- Self-tape deadline tracker
- AI contract analysis (5/month)
- Outreach CRM
- Email support

Both plans link to `/signup?plan={plan}` which initiates the checkout flow after account creation.

---

## University Licensing (Phase 2)

The `universities` table is already in the schema with fields for name, department, contact info, license tier, student count, active flag, and Stripe subscription ID.

Three tiers are planned:

| Tier | Price | Students | Features |
|------|-------|----------|----------|
| Standard | $500/year | Up to 50 | All individual features |
| Premium | $1,200/year | Up to 150 | Individual features + admin analytics |
| Enterprise | Custom | Unlimited | Custom integrations |

**Go-to-Market:** University of Alabama is the first target. Christian is an alumnus. The pitch: "Actor OS for every student in your department. Track career readiness from freshman year to graduation."

The landing page includes a "Contact for University Pilot" button linking to an email address.

---

## Future Monetization

### Usage-Based AI Pricing (Phase 2)

Contract analyses consume expensive LLM tokens. The plan:

- Monthly plan: 5 free analyses per month, then $0.50 per additional analysis
- Annual plan: 10 free analyses per month, then $0.50 per additional analysis
- This requires a usage counter in the database and a Stripe metered billing line item

### Revenue Math

At $5/month:

| Users | Monthly Revenue | Annual Revenue |
|-------|----------------|----------------|
| 10 | $50 | $600 |
| 100 | $500 | $6,000 |
| 1,000 | $5,000 | $60,000 |
| 10,000 | $50,000 | $600,000 |

At $45/year (annual, effective $3.75/month):

| Users | Annual Revenue |
|-------|---------------|
| 100 | $4,500 |
| 1,000 | $45,000 |

University licensing adds high-value contracts:

| Universities | Avg License | Annual Revenue |
|-------------|-------------|----------------|
| 10 | $800 | $8,000 |
| 50 | $1,000 | $50,000 |

The business model is: individual subscriptions drive volume, university licensing drives contract value, and AI usage pricing covers LLM costs at scale.
