# Roadmap — Happy Place Platform

Aligned to **CEO Directive 021 (Execution Lock)**: build the MVP, design (don't
implement) Horizon 2, defer Horizon 3.

## Horizon 1 — MVP (BUILD NOW) ✅
- [x] Public website (Next.js App Router, TS, Tailwind, Vercel)
- [x] Content: company, services, gallery, about, contact, estimate, reviews, faq, privacy, 404
- [x] Estimate wizard end-to-end via email (mock service, swap-ready)
- [x] Configuration-first content (src/config/*)
- [x] Stable domain objects (src/types)
- [x] SEO: metadata, JSON-LD, sitemap, robots, OG/Twitter
- [x] Accessibility + responsiveness
- [x] Vercel deploy config + CI

## Horizon 2 — Platform Foundation (DESIGN ONLY, routes reserved)
- [x] /admin, /dashboard, /customers, /projects, /estimates, /photos, /settings, /logs, /integrations
- [ ] Implement when the platform phase is authorized (deferred — not MVP)
- [ ] These map to domain objects already defined in src/types

## Horizon 3 — Business Operating System (DEFERRED, out of scope)
- AI estimate generation
- Scheduling optimization
- Google Drive / Calendar automation
- Workflow engine / durable outbox
- CRM / accounting / inventory
- Customer & employee portals / mobile / analytics / marketing automation

These belong to the platform roadmap, not the MVP.
