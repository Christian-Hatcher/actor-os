# Chapter 9: Infrastructure and Cost

Actor OS is designed to run at near-zero cost during MVP and early adoption, then scale cost linearly with revenue. Every infrastructure choice was made with the same question: "What is the cheapest option that does not need to be replaced when we grow?"

---

## Per-Service Cost Breakdown

### Supabase

| Resource | Free Tier Limit | When You Pay |
|----------|----------------|--------------|
| Database storage | 500 MB | Supabase Pro ($25/month) at 500 MB |
| Monthly active users | 50,000 | Supabase Pro at 50,000 MAU |
| API requests | Unlimited (fair use) | No hard cap |
| Auth users | Unlimited | No hard cap |
| Realtime connections | 200 concurrent | Supabase Pro for more |
| Storage (file uploads) | 1 GB | Supabase Pro at 1 GB |
| Edge Functions | 500,000 invocations | Supabase Pro |

**Current cost: $0/month.** The free tier is sufficient for MVP and the first several hundred users. A typical actor generates approximately 1-2 KB per audition row, 5-10 KB per casting email. At 1,000 users with 50 auditions each, total data is approximately 100 MB -- well within the 500 MB limit.

**Trigger for upgrade:** Supabase Pro ($25/month) is needed when:
- Database exceeds 500 MB (roughly 2,000-5,000 active users)
- Concurrent realtime connections exceed 200
- File storage exceeds 1 GB (when script upload feature launches)

---

### Vercel

| Resource | Free/Hobby Tier | When You Pay |
|----------|----------------|--------------|
| Deployments | Unlimited | Never (for deployments) |
| Bandwidth | 100 GB/month | Pro ($20/month) at 100 GB |
| Serverless function execution | 100 GB-hrs/month | Pro at limit |
| Build minutes | 6,000 min/month | Pro at limit |
| Custom domains | 1 | Pro for more |

**Current cost: $0/month.** The hobby tier handles the landing page, dashboard, and all API routes. Actor OS is a lightweight application -- the API routes are small serverless functions that execute in milliseconds.

**Trigger for upgrade:** Vercel Pro ($20/month) is needed when:
- Bandwidth exceeds 100 GB/month (unlikely until thousands of daily active users)
- Serverless function execution exceeds limits (unlikely for this workload)
- Team collaboration features are needed

---

### Stripe

| Fee | Amount |
|-----|--------|
| Per successful transaction | 2.9% + $0.30 |
| No monthly fee | $0 |

**Cost per $5 monthly subscription:** $0.30 + ($5 * 0.029) = $0.445
**Net revenue per $5 monthly:** $4.555 (91.1%)

**Cost per $45 annual subscription:** $0.30 + ($45 * 0.029) = $1.605
**Net revenue per $45 annual:** $43.395 (96.4%)

Annual plans have significantly better unit economics because the fixed $0.30 fee is amortized over a larger amount.

---

### LLM Providers

| Provider | Cost | When Used |
|----------|------|-----------|
| Ollama (local) | $0/month | Default for development and small-scale production |
| Anthropic (Haiku + Sonnet) | ~$0.12/active user/month | Production with paid API |
| OpenAI (4o-mini + 4o) | ~$0.10/active user/month | Alternative production provider |

**Current cost: $0/month** (Ollama default).

**Trigger for paid providers:** When:
- Running on Vercel (no local Ollama possible) -- need a cloud LLM provider
- Quality of local model is insufficient for contract analysis
- Scale requires faster inference than local hardware provides

At 100 active users with Anthropic: approximately $12/month in LLM costs.
At 1,000 active users: approximately $120/month.

---

### Google Cloud (Gmail OAuth)

| Resource | Free Tier |
|----------|-----------|
| OAuth consent screen | Free |
| Gmail API calls | 1 billion/day quota (free) |
| Google Cloud project | Free |

**Cost: $0/month.** Gmail API is free for OAuth-authenticated per-user access. There is no per-request charge.

---

## Total Cost at Each Scale

| Scale | Supabase | Vercel | Stripe Fees | LLM | Google | Total Monthly Cost | Monthly Revenue (at $5) |
|-------|----------|--------|-------------|-----|--------|--------------------|------------------------|
| MVP (1-10 users) | $0 | $0 | $2-5 | $0 | $0 | $2-5 | $5-50 |
| Early (100 users) | $0 | $0 | $45 | $12 | $0 | $57 | $500 |
| Growth (1,000 users) | $25 | $0 | $445 | $120 | $0 | $590 | $5,000 |
| Scale (10,000 users) | $75 | $20 | $4,450 | $1,200 | $0 | $5,745 | $50,000 |

**Margins:**

| Scale | Cost | Revenue | Margin |
|-------|------|---------|--------|
| 100 users | $57 | $500 | 88.6% |
| 1,000 users | $590 | $5,000 | 88.2% |
| 10,000 users | $5,745 | $50,000 | 88.5% |

The business is profitable from user number one. Stripe fees are the largest cost at every scale. LLM costs are the second largest but are controllable (usage caps, Ollama for self-hosted).

---

## Break-Even Analysis

**Question:** How many paying users does it take to cover infrastructure?

| Trigger | Monthly Cost | Users Needed (at $5/month) |
|---------|-------------|---------------------------|
| Just Stripe fees | $0.445/user | 1 (always cash-flow positive) |
| Supabase Pro | $25 | 6 users |
| Supabase Pro + Anthropic | $37 | 8 users |
| Supabase Pro + Vercel Pro + Anthropic | $57 | 12 users |

**Answer: 10 paying users covers all fixed infrastructure costs.**

---

## Environment Variables Summary

| Variable | Service | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Yes (server only) |
| `STRIPE_SECRET_KEY` | Stripe | Yes (server only) |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Yes (server only) |
| `STRIPE_MONTHLY_PRICE_ID` | Stripe | Yes |
| `STRIPE_ANNUAL_PRICE_ID` | Stripe | Yes |
| `NEXT_PUBLIC_STRIPE_KEY` | Stripe | Yes (client) |
| `NEXT_PUBLIC_APP_URL` | Vercel | Yes |
| `GOOGLE_CLIENT_ID` | Google | Yes (for Gmail) |
| `GOOGLE_CLIENT_SECRET` | Google | Yes (for Gmail, server only) |
| `LLM_LOW_PROVIDER` | LLM | No (defaults to ollama) |
| `LLM_LOW_MODEL` | LLM | No (defaults to llama3.2:3b) |
| `LLM_LOW_BASE_URL` | LLM | No (defaults to localhost:11434) |
| `LLM_LOW_API_KEY` | LLM | No (not needed for Ollama) |
| `LLM_HIGH_PROVIDER` | LLM | No |
| `LLM_HIGH_MODEL` | LLM | No |
| `LLM_HIGH_BASE_URL` | LLM | No |
| `LLM_HIGH_API_KEY` | LLM | No |

---

## Scaling Strategy

### Phase 1 (0-500 users): Free Tier Everything

Everything runs on free tiers. Total cost: Stripe transaction fees only. Focus entirely on product, not infrastructure.

### Phase 2 (500-5,000 users): Supabase Pro + Cloud LLM

Upgrade Supabase to Pro ($25/month) for more storage and connections. Switch LLM provider from Ollama to Anthropic or OpenAI. Total cost: approximately $50-200/month.

### Phase 3 (5,000-50,000 users): Full Production Stack

Add Vercel Pro ($20/month), potentially Supabase Team ($599/month) for dedicated compute, and implement LLM cost caps (usage-based pricing passes cost to heavy users). Total cost: approximately $700-3,000/month against $25,000-250,000/month revenue.

### Never Needed

- Custom servers (Vercel + Supabase handle everything)
- Kubernetes or container orchestration (serverless scales automatically)
- CDN configuration (Vercel provides this automatically)
- Database replication (Supabase handles this at the Pro tier)
