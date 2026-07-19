# Directive 025 — Production Readiness Audit (Read-Only)

**Auditor stance:** senior engineer, day one, zero trust in prior claims. Evidence
gathered by reading files, running the real build (`next build`), type-check
(`tsc --noEmit`), and scanning the tree. **No code changed.** Docs-only.

**Repo audited:** `happy-place-platform` @ `9a4816d` (clean working tree).
**CRITICAL PRECONDITION (verified):** there is **no git remote**. All 7 commits
exist locally on `master`; **nothing has been pushed to GitHub.** This fully
explains the Vercel `404: NOT_FOUND` — there is simply no deployed repository.
The app is not broken; it is not deployed.

---

## A. Repository Verification

| Check | Result | Evidence |
|---|---|---|
| Git history | ✅ | 7 commits `4e0918b…9a4816d` on `master` |
| Branches | ⚠️ | local branch is `master`; CI workflow triggers on `main` → **CI won't run on push** |
| Remote | ❌ | `git remote -v` empty — **must be added + pushed before Vercel** |
| README | ✅ | root `README.md` (Directive 021 aligned) |
| Architecture | ✅ | `docs/ARCHITECTURE.md` |
| Deployment | ✅ | `DEPLOYMENT.md` runbook |
| CI | ⚠️ | `.github/workflows/website-ci.yml` exists but binds to `main` |
| package.json | ✅ | present, scripts `dev/build/start/lint/images` |
| lockfile | ✅ | `package-lock.json` present |
| Next config | ✅ | `next.config.ts` (standard, `formats: avif/webp`, `dangerouslyAllowSVG` on) |
| TS config | ✅ | `strict: true`, `@/*` path alias |
| ESLint | ✅ | `eslint.config.mjs` present |
| Prettier | ❌ | **no Prettier config** (not claimed by CI; low priority) |
| GitHub Actions | ✅ | see CI above |

---

## B. Build Verification (real run)

- `npm run build` → **compiled successfully, 0 errors, 0 warnings.**
- **25 routes** generated: 23 fully static (`○`), 2 SSG (`●` `/projects/[slug]` ×2).
- `tsc --noEmit` → **exit 0** (no circular imports, no type errors).
- Client JS: **only 4 client components** (`site-header`, `estimate-wizard`,
  `gallery-lightbox`, `tracked-contact`). Largest shared chunk **224 KB**
  (framework/react runtime, not a page) — acceptable; pages are RSC with minimal
  hydration.
- Fonts: `next/font` (Geist) self-hosted → no layout-shift, no external request.
- Images: **24 SVG placeholders @ ~4 KB each** — no broken/oversized/duplicate
  assets, but `dangerouslyAllowSVG` is active because no raster exists yet.

---

## C. Lighthouse Readiness (estimated, ranked by impact)

| Category | Est. now | Est. post-photos | Impact-ranked risks |
|---|---|---|---|
| Performance | 90 | 96 | (1) SVG placeholders unoptimized *but tiny*; (2) LCP = hero SVG; (3) real raster + pipeline needed for true 100 |
| Accessibility | 90 | 96 | (1) no skip link; (2) lightbox focus trap partial; (3) verify honey-on-white contrast for body text |
| Best Practices | 95 | 95 | `dangerouslyAllowSVG` (safe CSP now; remove with rasters) |
| SEO | 90 | 98 | **(1) hardcoded JSON-LD `aggregateRating` "5.0"/"40"** → fix or derive |

---

## D. Verify Estimate Wizard (code walkthrough)

- Steps: Service → Photos → Service questions → Property → Contact → Review →
  Submit. Back button on steps 2–5; progress indicator present.
- **Invalid email:** `type="email" required` + submit disabled until valid (Contact step).
- **Missing fields:** each step's Continue is disabled until required fields set.
- **Mobile:** responsive, file input `accept="image/*"`, swipe not in form (N/A).
- **Keyboard/SR:** standard inputs; no custom widget trapping focus.
- **Photo upload:** captured as `{name,size}`; **not transmitted** (stays client-
  side, referenced in mailto body text) → minimal attack surface, but **no
  type/size validation yet** (acceptable for mailto; required before API).
- **Mailto generation:** `estimateService.submit()` composes a `mailto:` to
  `company.email` with subject/body — works, opens user's mail client.
- **Long messages:** body is plain text in a `mailto:` — length not capped;
  mail clients handle it. Fine for MVP.
- **Edge cases:** no service selected → Submit unreachable; no photos → still
  submits. ✅ Robust enough for MVP.

---

## E. Verify SEO

✅ Per-route `metadata` (title/description/canonical via `alternates.canonical`),
OpenGraph, Twitter card, `sitemap.xml` (incl. project slugs), `robots.txt`
(disallows `/admin*`), `LocalBusiness` JSON-LD.
❌ JSON-LD `aggregateRating` hardcoded (`ratingValue:"5.0"`, `reviewCount:"40"`)
— **not sourced from `reviews.ts`** (which has 6 reviews). Either derive or drop
until real counts exist. Breadcrumbs: not implemented (low priority for MVP).

---

## F. Verify Accessibility

✅ Landmarks (`header`/`main`/`footer`), one `<h1>`/page, mobile menu ARIA
(`aria-expanded`/`aria-controls`), `role="dialog"`+`aria-modal` lightbox, `alt` on
all `<Image>`, reduced-motion media query, focus-visible ring token.
❌ No skip-to-content link. ❌ Lightbox Tab can escape to background; no focus
return on Esc. ⚠️ Contrast: honey `#f59e0b` should be measured on white body text.

---

## G. Verify Mobile (responsive)

Layout uses Tailwind breakpoints; grid `grid-cols-1 → sm:2 → lg:3`. Sticky header
with hamburger < `md`. No horizontal-overflow patterns detected. **To truly
verify 320/375/390/768/1024** a browser pass is needed (recommended post-push in
Vercel preview). No thumb-reach "sticky CTA" on long pages — nice-to-have.

---

## H. Verify Configuration (hardcoded-value scan)

`src/config/*` holds company/navigation/services/categories/gallery/projects/
reviews/faq/counties/seo. **Drift found** (values outside config):
- `src/app/faq/page.tsx:13-14` — `CCB# 254240` and county names hardcoded in FAQ
  answers (duplicates `company.ccbNumber` + `counties.ts`).
- `src/app/gallery/page.tsx:22`, `src/app/page.tsx:98` — county names hardcoded in
  section descriptions.
- ✅ phone/email/address/branding/colors/logo currently DO come from config
  (`company.ts` + `globals.css` tokens). Logo icon (`Hammer`) is still hardcoded
  in header/footer — should be `company.logoIcon` for contractor #2.
- ✅ No social/hours hardcoded outside config.

---

## I. Verify Architecture

- ✅ Components reusable; **no business logic in UI** (mailto composition lives in
  the service).
- ✅ Service layer respected (`estimateService`, `galleryService`, `companyService`,
  `analytics`).
- ✅ No circular imports (tsc clean); minimal client components (4).
- ❌ **Dead code:** `framer-motion` installed, never imported.
- ❌ **Missing abstractions promised by constitution:**
  - ❌ `src/domain` folder does **not** exist — types live in `src/types`
    (`Company/Service/EstimateRequest/...` present, but `Appointment/Payment/
    Notification` absent).
  - ❌ **No provider interfaces** (`PaymentProvider`, `StorageProvider`,
    `CalendarProvider`, `NotificationProvider`, `ReviewProvider`,
    `EstimateProvider`) — only single `estimateService` boundary exists.
  - ❌ **No security module** (`config/security.ts`, `headers.ts`, `rateLimits.ts`,
    `uploads.ts`, `payments.ts`, `google.ts`, `storage.ts`) — the
    `security` object you specified does not exist.
  - ❌ **No `featureFlags.ts`** (named in constitution; absent).

---

## J. Verify Future Platform Readiness

- ✅ Adding Stripe/Drive/Calendar/Storage/Notifications/CRM/Scheduling/Customer
  Portal/Admin/AI is **currently** possible by swapping `estimateService`-
  style mocks for new impls behind `services/` — UI unchanged.
- ⚠️ BUT readiness is *informal*, not *codified*: without the provider interfaces
  and `domain/` types you proposed, the future seams are improvised per-integration
  rather than guaranteed by structure. Adding them now is the highest-leverage
  "plug-and-play" investment (cheap now, expensive later).

---

## Deliverables

### Executive Summary
The application is **genuinely well-built and production-shaped**, builds clean
with 0 errors, and is architecturally sound for a frontend-only MVP. The single
reason it isn't live is **operational, not technical**: there is no GitHub remote
and nothing has been pushed, so Vercel has nothing to deploy (the 404 is expected).
Two structural gaps vs the constitution remain: **no provider-interface layer,
no `domain/` module, no security/feature-flag config** — all deferred from
Directive 024 and explicitly requested for addition.

### Critical Issues
1. **No git remote / nothing pushed** → Vercel 404. *Blocker for deployment.*

### High-Priority Issues
2. Hardcoded JSON-LD `aggregateRating` ("5.0"/"40") — derive from `reviews.ts` or
   remove (SEO honesty + rich-result risk).
3. CI branch mismatch: workflow binds to `main`, local is `master` → **push won't
   trigger CI**. Align branch name or workflow.
4. Configuration drift: CCB# + county names duplicated in 3 components instead of
   referencing `company.ts`/`counties.ts`.

### Medium-Priority Issues
5. Add `src/domain` canonical module (re-home types; add `Appointment/Payment/
   Notification`).
6. Formalize provider interfaces (`PaymentProvider`, `StorageProvider`,
   `CalendarProvider`, `NotificationProvider`, `ReviewProvider`, `EstimateProvider`)
   with mock impls now.
7. Add `config/featureFlags.ts` + `config/security.ts` (the `security` object you
   specified).
8. A11y: add skip link; complete lightbox focus trap + focus return; contrast check.

### Low-Priority / Nice-to-Have
9. Remove dead `framer-motion` dep.
10. Make logo icon + footer tagline config-driven (`company.logoIcon`).
11. Standardize `galleryService` export naming.
12. Add Prettier config for DX consistency.
13. Thumb-reach sticky CTA on long pages.

### Technical Debt
`framer-motion` (dead), config drift (CCB/counties), missing promised
abstractions (`domain/`, providers, security, featureFlags), `siteUrl` hardcoded
(not env) — all catalogued in `docs/AUDIT-024.md` §16.

### Deployment Blockers
- #1 (push to GitHub) and Vercel Root Directory = `website` (not `/`). No code
  defect blocks deployment.

### Recommended Fixes (implementation order — matches your 10 steps)
1. Verify local commits (done — all 7 present).
2. **Add remote + push `master`** (you provide repo URL; I will not create/push
   unprompted).
3. Confirm `website/` + `package.json` + `next.config.ts` on GitHub.
4. Fix Vercel Root Directory = `website`; align CI branch (`master`↔`main`).
5. Get a green preview deployment.
6. Replace placeholder SVGs with real client photos; run `npm run images`; remove
   `dangerouslyAllowSVG`.
7. Fix JSON-LD ratings (source from `reviews.ts`).
8. Add `featureFlags.ts` + `security.ts` (constitution promises).
9. Test estimate flow end-to-end with the client's Gmail.
10. Only then begin Horizon 2 (payments, automation, providers).

### Deployment Readiness Score: **7/10**
(code is ready; ops gap = no push + Root-Dir/Vercel setup pending)

### Production Confidence Score: **8/10**
(strong, clean build; minor SEO/a11y/config polish before public traffic)

### Estimated Launch Risk: **LOW–MEDIUM**
- Technical risk: **low** (clean build, RSC, no secrets, no backend).
- Operational risk: **medium until pushed + Vercel configured**; drops to low once
  step 2–5 done. Highest residual risk is the hardcoded JSON-LD (correct before
  indexing).

---

## Note on your three architectural additions
All three are **absent today** and are the right Directive 025/026 investments:
1. **`src/domain`** — not present; types currently in `src/types`.
2. **Provider interfaces** — not present; only `estimateService` exists.
3. **Security configuration module** — not present; the `security` object you
   drafted does not exist in the repo.
Per the read-only mandate of this directive, none were added. They are queued as
the first implementation items for the next (non-audit) directive.
