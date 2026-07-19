# Directive 024 — Independent Read-Only Architecture Audit

**Auditor stance:** senior staff engineer, first day on the project. Every prior
status report treated as *unverified until confirmed*. No features added, no
refactors performed. Evidence gathered by reading the repo and running the
production build.

**Commit audited:** `1b0c777` · **Build:** `next build` → PASS (22 static routes
+ 2 SSG project pages) · **TypeScript:** strict, PASS as part of build.

---

## 1. Claim Verification

| Claim | Verdict | Evidence |
|---|---|---|
| Next.js builds successfully | ✅ TRUE | `next build` exits 0, all routes emitted |
| TypeScript strict passes | ✅ TRUE | `tsconfig` `"strict": true`; build's TS phase passes |
| App Router only | ✅ TRUE | only `src/app/**`; no `pages/` dir |
| Server Components by default | ✅ TRUE | only 4 files carry `"use client"` |
| Client Components only where needed | ✅ TRUE | header (menu), estimate-wizard, gallery-lightbox, tracked-contact — all genuinely interactive |
| All reserved admin routes exist | ✅ TRUE | `/admin` + customers/projects/estimates/photos/settings/logs/integrations (8) |
| Estimate Wizard functional | ✅ TRUE | 6-step flow, service-driven questions, mailto submit via `estimateService.submit()` |
| Gallery works + lightbox | ✅ TRUE | `GalleryLightbox`: grid, modal, keyboard, swipe, lazy |
| Project Spotlight renders | ✅ TRUE | `/projects` + SSG `/projects/[slug]` (2 pages) |
| SEO metadata exists | ✅ TRUE | Metadata API in layout + per page |
| JSON-LD valid | ⚠️ MOSTLY | `LocalBusiness` present in layout; `aggregateRating` uses **hardcoded `ratingValue:"5.0"`, `reviewCount:"40"`** not derived from `reviews.ts` — inconsistent with real data (risk of misleading rich-result / mismatch) |
| sitemap.ts works | ✅ TRUE | emits `/sitemap.xml`, includes project slugs |
| robots.ts works | ✅ TRUE | emits `/robots.txt`, disallows `/admin` etc. |
| OpenGraph metadata | ✅ TRUE | `openGraph` in layout |
| Twitter metadata | ✅ TRUE | `twitter` card in layout |
| Responsive nav / mobile | ✅ TRUE | header has mobile menu w/ `aria-expanded`/`aria-controls` |
| Keyboard navigation | ✅ TRUE | lightbox arrows/Esc; native focus on links/buttons |
| Reduced motion | ✅ TRUE | `@media (prefers-reduced-motion)` in globals.css |
| Image optimization | ⚠️ PARTIAL | `next/image` everywhere; **but all live images are SVG placeholders served with `dangerouslyAllowSVG` and NOT optimized** — real optimization only activates when raster photos replace them |
| Blur placeholders | ⚠️ WIRED, UNUSED | components support `blurDataURL`; no asset actually has one yet (SVGs) |
| next/image usage | ✅ TRUE | all `<Image>`; no raw `<img>` |
| Semantic design tokens | ✅ TRUE | `@theme` tokens; raw brand colors swept out of components |
| **Feature flag system** | ❌ **FALSE** | **`config/featureFlags.ts` does not exist.** Claimed by constitution, never built |
| Configuration-driven content | ✅ TRUE | all copy/data in `config/*` |
| Mock service abstraction | ✅ TRUE | estimate/gallery/company/analytics services |
| Analytics abstraction | ✅ TRUE | no-op interface, wired to wizard + phone/email |
| Static generation | ✅ TRUE | all routes `○`/`●` prerendered |
| Vercel compatibility | ✅ TRUE | standard Next 16, `vercel.json`, no custom server |

**Bottom line:** the previous summary was **~90% accurate**. Three material
corrections: (1) **no feature-flag system exists**, (2) **JSON-LD ratings are
hardcoded**, (3) **image optimization/blur is scaffolded but inert** because only
SVG placeholders exist.

---

## 2. Incorrect / Overstated Prior Assumptions

1. **"Feature flags implemented"** — not present. `theme.ts` and `social.ts`
   config files named in the constitution also don't exist (theme lives in
   `globals.css`; social lives inside `company.ts`).
2. **"Images optimized"** — true mechanism, but no optimized asset ships yet;
   Lighthouse Performance on real photos is unproven until the pipeline runs.
3. **"JSON-LD valid"** — structurally valid but semantically fabricated ratings.

---

## 3. Directory & Dead-Code Audit

- Structure is **clean** and matches the constitution intent (`app/components/
  config/services/types/lib`). No `pages/`, no stray build output tracked.
- **Dead dependency:** `framer-motion` is installed but **never imported**
  (`grep` = NOT USED). Remove or use. Adds ~0 to bundle today (tree-shaken/unused)
  but is developer-confusing debt.
- **Under-used service:** `companyService` exists but pages import `config/company`
  directly (8 direct `@/config` imports in `app/`). Not wrong for config, but
  `company`/`services`/`reviews`/`faq` have no service boundary yet — inconsistent
  with the "everything behind a service" claim (acceptable for pure config; worth
  a documented rule).
- No TODO/FIXME/dead markers. `.gitattributes` normalizes EOL (CRLF warnings are
  cosmetic).

---

## 4. Component Audit

| Component | Class | Notes |
|---|---|---|
| ui/button, ui/card, section, icon, star-rating | Reusable / platform-ready | token-based, generic |
| cta-section, service-card, gallery-lightbox, project-spotlight | Reusable | render config; trade-agnostic |
| site-header, site-footer | Reusable | driven by `navigation`/`company` |
| estimate-wizard | Reusable but **large (≈430 lines)** | single-file state machine; works, but a future refactor could split step components. Not a defect. |
| tracked-contact | Reusable | thin analytics wrapper |

No component is carpentry-specific in **logic** — only in **config data**. Passes
the Service Business Test at the code level.

---

## 5. Type Audit

Domain types are stable and future-facing (`Company, Service, ServiceCategory,
EstimateRequest, Customer, Property, Project, GalleryItem, Review, FaqItem,
County, ImageAsset, ContactRequest, SeoMeta`).
- **Missing for roadmap:** `Appointment`, `Payment`, `Notification` (named in the
  constitution's domain language, not yet typed) — fine for Horizon 1, add when
  Horizon 2 starts.
- `EstimateRequest` lacks a `preferredContact` field that the constitution's
  canonical shape lists — minor gap.

---

## 6. Service Layer Audit

- ✅ No UI coupling: components call `estimateService.submit()` / `galleryService`
  and await a uniform result. `submit()` shape already matches a future API.
- ✅ No business logic in components (mailto body composition lives in the service).
- ⚠️ **Hidden assumption:** `estimateService.submit()` performs
  `window.location.href = mailto:` — a **client-only side effect**. The interface
  is API-ready, but a future server implementation must not reuse the `window`
  branch. Documented in code comments; acceptable.
- ⚠️ Two export names on gallery (`mockGalleryService` used on `/gallery`,
  `galleryService` on `/projects`) — harmless but inconsistent; standardize on
  `galleryService`.

---

## 7. Accessibility Audit

✅ Present: semantic landmarks (`<main>`, `<header>`, `<footer>`), one `<h1>` per
page, mobile menu ARIA, focus-visible ring token, reduced-motion, lightbox
keyboard + `role="dialog"`/`aria-modal`, image alt text on all `<Image>`.

❌/⚠️ Deficiencies:
1. **No skip-to-content link** — keyboard users can't bypass the nav.
2. **Lightbox focus trap is partial** — it focuses the dialog and handles Esc, but
   Tab can still escape to background content; no focus return to the triggering
   thumbnail on close.
3. **Contrast:** honey `#f59e0b` primary with `#1c1917` text = strong; verify
   `text-primary` (honey) on white for small text — it can dip below AA for body
   copy. Used mostly on large/bold text, so likely OK, but should be measured.
4. Placeholder alt text is generic ("project photo"); real photos need
   descriptive alt (pipeline reminds, but enforce in content pass).

---

## 8. Performance Audit

- Minimal JS: only 4 client components; rest RSC/static. Good.
- No third-party scripts, no analytics SDK, no web fonts beyond `next/font`
  (Geist, self-hosted) — excellent CLS/So posture.
- **Risk:** `dangerouslyAllowSVG` placeholders are unoptimized and some are large
  viewBoxes; real Lighthouse Performance is **unproven until raster photos +
  pipeline** land.
- **Dead dep** `framer-motion` (remove).
- Hero image uses `priority` correctly; gallery/spotlight use `loading="lazy"`.

---

## 9. Lighthouse Readiness (estimated)

| Category | Est. (placeholders) | Est. (after real optimized photos) | Points at risk |
|---|---|---|---|
| Performance | 88–95 | 95–100 | unoptimized SVGs; LCP on hero |
| Accessibility | 90–95 | 95–100 | skip link, focus trap, contrast check |
| Best Practices | 95–100 | 95–100 | `dangerouslyAllowSVG` CSP note; remove after real images |
| SEO | 95–100 | 100 | all metadata present; JSON-LD ratings fix |

---

## 10. SEO Audit

✅ Metadata API, canonicals (`alternates.canonical` per page), OG, Twitter,
robots, sitemap (incl. project slugs), `LocalBusiness` JSON-LD, semantic
headings, internal linking (nav/footer/CTAs), 404 (`not-found.tsx`), privacy page.
⚠️ Fix hardcoded JSON-LD `aggregateRating`; derive from `reviews.ts` or drop it
until real review counts exist (fabricated counts are a Best-Practices/ě legal
risk for rich results).

---

## 11. Security Audit (Vercel deployment)

- ✅ No secrets in repo; `.env*` git-ignored; no env vars needed for MVP.
- ✅ Mailto submission keeps photo bytes on-device (no upload surface today =
  minimal attack surface).
- ⚠️ **No input validation/sanitization** beyond `required` + `type="email"` — fine
  for mailto (user's own mail client), **mandatory** before any API/webhook path.
- ⚠️ **No rate limiting / spam / bot mitigation** — not needed for mailto, required
  when the estimate route becomes a POST endpoint. Document as a Horizon-2 gate.
- Future (documented, not built): Stripe webhook signature verification, Google
  OAuth least-privilege scopes, admin RBAC, append-only audit log, upload
  validation (type/size/safe-name/scan).
- `dangerouslyAllowSVG` is a deliberate placeholder-era flag — **must be removed**
  when raster photos ship (it relaxes image CSP).

---

## 12. Deployment Audit (Vercel)

- ✅ Standard Next 16 App Router; no Node-only runtime assumptions; no custom
  server. `vercel.json` pins framework/build. Static generation throughout.
- ✅ GitHub Actions CI builds on PR (`website-ci.yml`).
- ⚠️ **No ISR** used (all fully static) — fine for a marketing site; revalidation
  only matters when data goes dynamic.
- Action needed: point custom domain, set `NEXT_PUBLIC_SITE_URL` (currently
  `siteUrl` is hardcoded in `company.ts` — confirm it matches the production
  domain, or move to env). **This is a real pre-launch item.**

---

## 13. Google Workspace Readiness

Architecture keeps migration simple: the estimate flow already funnels through
`estimateService`. A future `estimate/api.ts` (or Gmail/Drive/Calendar adapters
behind `services/`) plugs in with **zero frontend change**. MVP correctly avoids
Google Cloud. ✅ Ready in principle; nothing to build now.

---

## 14. Feature-Flag Audit

❌ **System does not exist.** Recommended `config/featureFlags.ts` with:
`photoUpload, financing, reviews, estimateWizard, customerPortal, admin,
aiEstimate, stripe` **plus** `calendarIntegration, notifications, googleWorkspace,
analytics, reviewsCollection, beforeAfterGallery, projectSpotlight,
maintenanceMode`. This is the single highest-leverage missing abstraction from
the constitution. (Deferred to Directive 025 — not built in this audit.)

---

## 15. Future-Integration Readiness (evaluation only)

| Integration | Readiness | Path |
|---|---|---|
| Stripe / Affirm / Klarna | 🟡 Medium | needs `PaymentProvider` service (not yet typed) |
| Google Calendar/Drive/Gmail/Contacts | 🟢 High | slot behind `services/`; estimate object already canonical |
| Google Maps | 🟢 High | additive, config-driven |
| Cloudinary | 🟢 High | swap image `src`/loader; pipeline already abstracts assets |
| Resend (email API) | 🟢 High | becomes `estimate/api.ts` impl |
| Twilio (SMS) | 🟡 Medium | needs `notificationService` |
| PostHog | 🟢 High | implement `analytics` interface (already exists) |
| Sentry | 🟢 High | drop-in; add DSN env |

---

## 16. Technical Debt (prioritized)

1. **Missing feature-flag system** (constitution-mandated).
2. **Hardcoded JSON-LD ratings** (SEO integrity).
3. **`framer-motion` dead dependency** (remove).
4. **`siteUrl` hardcoded** in `company.ts` (should be env for portability).
5. **A11y gaps:** skip link, lightbox focus trap/return, contrast verification.
6. **Service naming inconsistency** (`galleryService` vs `mockGalleryService`).
7. **`EstimateRequest.preferredContact` missing** vs canonical shape.
8. **Constitution/config drift:** `theme.ts`/`social.ts` referenced but folded
   elsewhere — reconcile docs or create thin re-exports.

None are launch-blocking except #2 (SEO honesty) and #4 (domain correctness).

---

## 17. Migration Readiness (contractor #2)

Onboarding a painter/electrician/roofer requires editing: `company, navigation,
serviceCategories, services (+estimate questions), gallery, projects, reviews,
faq, counties, seo`, brand tokens in `globals.css @theme`, and swapping images.
**No component logic changes required.** The architecture survives. The only
carpentry assumption in *code* is copy inside config + the "Hammer" logo icon
(hardcoded `Hammer` from lucide in header/footer) and "building your happy place"
footer string — should become `company.logoIcon` / `company.footerTagline`.

---

## 18. Highest-Priority Fixes (for Directive 025, in order)

1. Fix/park JSON-LD `aggregateRating` (derive from reviews or remove).
2. Move `siteUrl` to `NEXT_PUBLIC_SITE_URL` env (+ `.env.example`).
3. Add `config/featureFlags.ts` and gate `admin`, `photoUpload`, `reviews`.
4. Remove `framer-motion` (or adopt it intentionally).
5. A11y: skip link, lightbox focus trap + focus return, run a contrast check.
6. Make logo icon + footer tagline config-driven (`company.ts`).
7. Standardize `galleryService` export; add `preferredContact` to `EstimateRequest`.
8. Run the image pipeline on real photos; remove `dangerouslyAllowSVG`.

## 19. Nice-to-Have

- Split `estimate-wizard` into step components.
- Add `Appointment`/`Payment`/`Notification` types when Horizon 2 begins.
- `services/index.ts` barrel + documented "config vs service" rule.

## 20. Final Scorecard (1–10)

| Area | Score |
|---|---|
| Architecture | 9 |
| Maintainability | 8 |
| Reusability | 9 |
| Scalability | 8 |
| Performance | 8 (7 until real images) |
| Accessibility | 7 |
| SEO | 8 (9 after ratings fix) |
| Design | 8 |
| Security | 8 (MVP scope) |
| Future Platform Readiness | 9 |
| Developer Experience | 8 |
| Business Readiness | 7 (domain/env + real photos) |
| Deployment Readiness | 8 |

**Overall: strong. Deployable now** to a Vercel preview. Before pointing the
production domain, resolve #1, #2, and drop real photos (#8). Everything else is
non-blocking polish for Directive 025.
