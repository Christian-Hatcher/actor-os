# Actor OS

Your acting career, organized. A $5/month SaaS for student and emerging actors — built by a working actor in Tokyo.

## Features

- **Casting Pipeline** — Track every audition from submission to booking. Know your callback rate.
- **Self-Tape Partner** — Never miss a deadline. Upload, organize, and get feedback.
- **Contract Reader Agent** — AI analyzes any contract in 60 seconds. Spot red flags.
- **Outreach CRM** — Manage casting directors, agents, collaborators. Stay top of mind.

## Tech Stack

- Next.js 16 + TypeScript + Tailwind CSS v4
- Supabase (Auth + Database + Row Level Security)
- Stripe (Subscriptions + Billing Portal)
- OpenAI (Contract analysis)

## Pricing

| Plan | Price | Features |
|------|-------|----------|
| Monthly | $5/mo | Unlimited auditions, self-tapes, 5 AI contracts/month |
| Annual | $45/yr | Same + 10 AI contracts/month, priority support, save 25% |
| University | $500+/yr | Institutional licensing for drama departments |

## University Licensing (Phase 2)

Bulk pricing for drama schools:
- **Standard**: $500/year — up to 50 students
- **Premium**: $1,200/year — up to 150 students + admin analytics
- **Enterprise**: Custom — full drama school

Target launch: Fall 2026, starting with University of Alabama.

## Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
#          STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, etc.

# Run dev server
npm run dev

# Push database schema to Supabase
# (Run supabase/schema.sql in Supabase SQL Editor)
```

## Roadmap

- [x] Landing page with pricing
- [x] Dashboard with stats cards
- [x] Casting pipeline tracker
- [x] Self-tape deadline manager
- [x] Contract reader UI
- [x] Outreach CRM
- [x] University licensing scaffolding
- [x] Auth pages (login/signup)
- [x] Stripe checkout + billing portal
- [ ] Connect real Supabase data (replace mocks)
- [ ] Email ingestion from casting agencies
- [ ] Mobile app (React Native)
- [ ] Japanese language support

## License

© 2026 At Home Reelz K.K. — Built in Tokyo 🇯🇵
