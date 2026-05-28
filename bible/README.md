# Actor OS Bible

The definitive product document for Actor OS -- the $5/month career command center for student and emerging actors. Built by Christian Hatcher (At Home Reelz K.K., Tokyo) and powered by Next.js 16, Supabase, Stripe, and a provider-agnostic LLM abstraction layer.

**Guiding motto:** "Best solution = the one that doesn't need to be fixed in the future."

---

## Table of Contents

| Chapter | Title | What It Covers |
|---------|-------|----------------|
| [01](01-what-is-this-product.md) | What Is This Product | One-sentence explanation, target audience, design philosophy, non-goals |
| [02](02-architecture-and-tech-stack.md) | Architecture and Tech Stack | Full stack diagram, framework choices, deployment, auth pattern |
| [03](03-data-model.md) | Data Model | Every table, column, type, default, relationship, and RLS policy |
| [04](04-roles-and-permissions.md) | Roles and Permissions | Individual Actor, University Admin, Service Role, RLS enforcement |
| [05](05-core-features.md) | Core Features | Module-by-module breakdown: Dashboard, Casting Pipeline, Self-Tape Partner, Contract Reader, Outreach CRM, Tax Keeper, Earnings, Email Ingestion |
| [06](06-email-ingestion-pipeline.md) | Email Ingestion Pipeline | Gmail OAuth, token lifecycle, incremental sync, casting detection, LLM parsing, review queue, contact auto-creation |
| [07](07-llm-provider-abstraction.md) | LLM Provider Abstraction | Three tiers, provider support, configuration, cost considerations, usage map |
| [08](08-stripe-and-monetization.md) | Stripe and Monetization | Pricing tiers, trial logic, webhook handler, billing portal, beta coupons, university licensing |
| [09](09-infrastructure-and-cost.md) | Infrastructure and Cost | Per-service cost breakdown, break-even analysis, scaling thresholds |
| [10](10-repo-file-tree.md) | Repo File Tree | Complete directory structure of the actor-os repository |
| [11](11-api-contracts.md) | API Contracts | Every API route with method, request body, response shape, auth requirements |
| [12](12-frontend-pages.md) | Frontend Pages | Every route with component tree, data hooks, features |
| [13](13-roadmap.md) | Roadmap | Phase 1 through Phase 4, V2 feature specs, Stage Manager OS, university licensing, mobile app |

---

## How to Read This Document

Each chapter is a standalone markdown file that can be read independently. Chapters reference each other by number when cross-cutting concerns arise. Code blocks contain actual TypeScript types and SQL from the codebase -- they are not pseudocode.

## Authorship

Written May 2026 by Claude (Opus 4.6) with full read access to the actor-os repository. Every schema, type, API route, and component referenced in this Bible was read from source.
