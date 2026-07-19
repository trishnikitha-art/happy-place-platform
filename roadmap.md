# Roadmap — Happy Place Platform v1

## Phase 0 — Foundation (this task)
- [x] Clean repository structure (generic, reusable)
- [x] Archive previous backend prototype
- [x] Next.js 15 + React 19 + TypeScript + Tailwind scaffold
- [x] shadcn/ui, Framer Motion, Lucide
- [x] Centralized configuration (`company`, `services`, `counties`, `contact`, `reviews`, `seo`, `social`, `navigation`)
- [x] Mock service layer (`services/` + `mock/`)
- [ ] Premium components: hero, services, gallery, before/after, about, counties, reviews, faq, footer, contact
- [ ] Image pipeline: download client-owned photos, generate WebP/AVIF/responsive + blur placeholders, metadata objects
- [ ] Contact form (MVP) → routes to business email (feature-flagged photo upload)
- [ ] SEO: Metadata API, JSON-LD LocalBusiness, sitemap, robots, OG/Twitter, canonicals
- [ ] Accessibility: WCAG AA, keyboard nav, reduced motion, semantic HTML
- [ ] Performance: Lighthouse 100/100/100/100 target
- [ ] Vercel deploy green (preview per PR)

## Phase 1 — Backend integration (future, no frontend rewrite)
- Replace `mock/` with `api/` implementations behind the same `services/` interfaces.
- Reuse durable-outbox / retry / provider-interface infrastructure from `archive/`.
- Lead capture → backend (outbox → email/calendar/drive) instead of direct email.

## Phase 2 — Operations
- Admin application mounted at reserved routes (`/admin`, `/dashboard`, `/leads`, ...).
- Event log, queue + dead-letter visibility, replay.

## Phase 3 — Multi-tenant
- Onboard contractor #2 by swapping `config/` only.
- Per-tenant theming, services, counties, integrations.

## Lessons carried from the archived prototype
- Persist-then-publish: never call external APIs inline in a request.
- Durable outbox + retry/backoff + dead-letter for any side effect.
- Provider interfaces so Google can be swapped for M365/CalDAV.
- Append-only event log for debugging timelines.
- Logs in the database, not Google Sheets.
