# Actor OS — Setup Guide

## Prerequisites

- Supabase account (free tier) at [supabase.com](https://supabase.com)
- Stripe account at [stripe.com](https://stripe.com) (test mode OK for dev)
- `.env.local` file filled in (see `.env.example`)

---

## 1. Supabase Setup (5 min)

### Step 1: Create Project
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create new project → name it `actor-os`
3. After creation, go to **Project Settings** → **API**
4. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `Project API keys` → `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `Project API keys` → `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`

### Step 2: Run Schema

Go to **SQL Editor** → **New query** → paste the entire contents of `supabase/schema.sql` → click **Run**.

This creates all tables with Row Level Security.

### Step 3: Confirm Auth Trigger

In the SQL Editor, run:

```sql
select * from pg_trigger where tgname = 'on_auth_user_created';
```

Should return 1 row. If not, run the trigger section from schema.sql again.

### Step 4: Update Email Auth Settings

Go to **Authentication** → **Email Templates**.

Optionally customize the confirmation email, or turn off email confirmation for dev:

Go to **Authentication** → **Providers** → **Email** → uncheck "Confirm email" for testing.

---

## 2. Stripe Setup (10 min)

### Step 1: Create Products

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. **Products** → **Add product**

**Monthly Plan:**
- Name: "Actor OS Monthly"
- Price: $5.00 / month
- Create
- Click the price row → copy the **Price ID** (starts with `price_`) → `STRIPE_MONTHLY_PRICE_ID`

**Annual Plan:**
- Name: "Actor OS Annual"
- Price: $45.00 / year
- Create
- Click the price row → copy **Price ID** → `STRIPE_ANNUAL_PRICE_ID`

### Step 2: Webhook (for localhost testing)

1. Install Stripe CLI: [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
2. Login: `stripe login`
3. Forward webhooks:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhook
   ```
4. Copy the `whsec_...` key → `STRIPE_WEBHOOK_SECRET`
5. For production: add endpoint URL `https://yourdomain.com/api/webhook` in Stripe Dashboard → **Developers** → **Webhooks**

### Step 3: Test Mode Keys

Go to **Developers** → **API keys** → copy **Secret key** (starts with `sk_test_`) → `STRIPE_SECRET_KEY`

For production, switch to live keys and create live products.

---

## 3. Environment Variables

Create `.env.local` in project root:

```env
# Supabase (from Step 1)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe (from Step 2)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_ANNUAL_PRICE_ID=price_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, use your deployed URL:
```env
NEXT_PUBLIC_APP_URL=https://actor-os.vercel.app
```

---

## 4. Run

```bash
npm run dev
# Open http://localhost:3000
```

---

## 5. Manual Test Checklist

### Auth Flow
- [ ] Sign up at `/signup`
- [ ] Check Supabase table `profiles` for auto-created row
- [ ] Log in at `/login`
- [ ] Dashboard loads with your email in the top nav

### Stripe Flow
- [ ] Visit `/checkout?plan=monthly`
- [ ] Click "Pay $5/month" → redirects to Stripe Checkout
- [ ] Use test card: `4242 4242 4242 4242`, any future date, any CVC
- [ ] Success → redirected to `/dashboard?success=true`
- [ ] Check Supabase `profiles` table — `subscription_status` should be `active`

### Data Flow
- [ ] Create an audition in the dashboard
- [ ] Refresh page — data persists (reading from Supabase)

---

## 6. Deployment (Vercel)

```bash
npm i -g vercel
vercel --prod
```

Or connect GitHub repo to Vercel for auto-deploy on push.

Add environment variables in Vercel dashboard → **Settings** → **Environment Variables**.

---

## Troubleshooting

### "Cannot find module '@/lib/supabase'"
Not an actual runtime error — linter uses wrong tsc binary. Code runs fine at runtime.

### Webhook not receiving events
- For local: make sure `stripe listen` is running
- For production: check webhook endpoint URL is correct
- Check Stripe Dashboard → **Developers** → **Webhooks** → verify endpoint is active

### RLS blocking reads
- All tables have `auth.uid() = user_id` policy
- Make sure user is logged in before fetching data
- `supabase.auth.getSession()` must return a session

### Profile not auto-created
- Check trigger `on_auth_user_created` exists: `\df` in SQL Editor
- Verify `handle_new_user()` function exists
- The trigger fires AFTER insert on `auth.users`
