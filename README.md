# Happy Place Platform

> **Version 1 of a reusable contractor platform.** Happy Place Carpentry is the first deployment.
> The architecture is designed to later support electricians, plumbers, HVAC, painters,
> landscapers, remodelers, and other service businesses with minimal changes.

This repository is the **frontend + foundation** for the platform. It is intentionally
decoupled from any backend: today it runs entirely on **mock services**, and tomorrow a
real API can be dropped in by swapping a single implementation file.

## Principles

1. **Generic code, specific configuration.** No module is named after a client.
   Use `Company`, `Service`, `ProjectGallery`, `LeadForm`, `BusinessConfig`. All
   client-specific content (name, phone, counties, services, images) lives in
   configuration under `website/src/config/` and `packages/config/`.
2. **Configuration over hardcoding.** Business info is data, never literals in components.
3. **Never fetch from UI components directly.** All data access goes through
   `services/` → a `mock/` implementation today, an `api/` implementation later.
4. **Components are reusable and feature-organized**, not page-organized.
5. **Designed for gradual backend integration** without rewriting the frontend.

## Repository layout

```
happy-place-platform/
├── README.md
├── docs/                 # architecture, branding, decisions
├── roadmap.md
├── website/              # Next.js 15 app (the deployable frontend)
├── packages/             # shared, framework-agnostic building blocks (future)
│   ├── ui/  config/  types/  hooks/  lib/  services/  mock/  api/  components/  features/
├── public/images/        # static assets (copied from client-owned originals)
├── .github/              # CI (lint + build) + Vercel preview workflows
└── archive/              # previous experimental work, preserved not deleted
    └── 2026-07-backend-prototype/
```

## Getting started (frontend)

```bash
cd website
npm install
npm run dev          # http://localhost:3000
npm run build        # production build
```

## Deployment

- **GitHub** is the source of truth.
- **Vercel Hobby** auto-deploys every push to `main` and builds a preview per PR.
- Framework preset: **Next.js**. Root directory for the Vercel project: `website/`.

## Status

- [x] Repository initialized with clean, reusable structure
- [x] Previous backend archived (see `archive/`)
- [x] Next.js 15 + TypeScript + Tailwind scaffold
- [x] Mock service layer (no backend dependency)
- [ ] Premium component library (in progress)
- [ ] Image pipeline (WebP/AVIF/responsive/blur)
- [ ] SEO + accessibility pass
- [ ] Vercel deploy green

See `roadmap.md` and `docs/architecture/README.md` for the full plan.
