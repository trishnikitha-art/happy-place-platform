# Happy Place Platform

A reusable **contractor platform**. The smallest deployable slice is the
**Happy Place Carpentry** website (first client / first deployment). Everything
is configuration-driven so the same platform can power additional service
businesses with minimal change.

> **CEO Directive 021 — Execution Lock.** The MVP is a **frontend-only website**.
> No backend, no database, no CRM, no workflow engine. The estimate wizard works
> **end-to-end via email**. The website is the first interface to a larger
> platform; Horizon 2 (admin/dashboard/customers/...) routes are reserved but
> unimplemented; Horizon 3 (AI estimates, scheduling, automation) is explicitly
> out of scope for the MVP.

## Repo layout

```
happy-place-platform/
  website/        # Next.js 16 App Router site (THE MVP)  ← build here
  archive/        # previous backend prototype (reference only, do not copy)
  docs/           # architecture + branding notes (historical)
  package.json    # (root) workspace/tooling scripts (optional)
```

The `archive/` holds an earlier backend prototype. Per the lock, the MVP does
**not** reuse it — it is reference material only. The platform's future backend
phases (Horizon 2/3) should be built against the domain objects in
`website/src/types`, not by reviving the archive.

## The website (MVP)

- **Next.js 16** App Router, React 19, TypeScript (strict), Tailwind v4
- **Server Components by default**; Client Components only for interaction
  (nav menu, estimate wizard)
- **Configuration-first**: all business content lives in `website/src/config/*`
  (company, services, gallery, reviews, faq, counties, seo, navigation)
- **Stable domain objects** in `website/src/types` (Company, ServiceCategory,
  Service, EstimateRequest, Customer, Property, Project, Review, GalleryItem,
  ContactRequest) — the future platform language
- **Mock services behind interfaces** in `website/src/services` (gallery,
  estimate). The estimate service is the single swap point: today it builds a
  `mailto:` link; later it posts to an API — change one implementation, not the
  components
- **Estimate wizard** at `/estimate`: Service → Photos → Questions (service-
  driven) → Property → Contact → Confirm → email
- **SEO**: Metadata API, JSON-LD `LocalBusiness`, `sitemap.ts`, `robots.ts`,
  OG/Twitter images
- **Accessible & responsive**: semantic HTML, focus rings, `prefers-reduced-
  motion`, mobile nav
- **Horizon 2 routes**: `/admin`, `/dashboard`, `/customers`, `/projects`,
  `/estimates`, `/photos`, `/settings`, `/logs`, `/integrations` — layout +
  routing reserved, no functionality

## Run it

```bash
cd website
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (Vercel uses this)
```

## Deploy (Vercel, free)

1. Push this repo to GitHub (private repo you own).
2. In Vercel, **Import** the `website` folder as a project (framework auto-
   detected as Next.js). No env vars needed for the MVP.
3. `vercel.json` pins the build; preview deployments run on every PR.

## Images (client-owned assets)

`website/public/images/**` currently holds branded **SVG placeholders**. To use
the real Happy Place Carpentry photos: drop the client-owned JPG/WebP files into
`public/images/gallery` and `public/images/services`, then update the `src`
fields in `website/src/config/gallery.ts` and `services.ts`. The file is the
only change — components render from config. Remove `dangerouslyAllowSVG` from
`website/next.config.ts` once real raster images replace the placeholders.

## Definition of Done (MVP)

- [x] Production-ready, responsive, accessible site
- [x] Estimate wizard works end-to-end via email
- [x] All business content configuration-driven
- [x] Deploys cleanly to Vercel
- [x] Swapping email → API requires changing only the service implementation
