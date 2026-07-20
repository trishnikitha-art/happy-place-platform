# Happy Place Platform — Architecture

**Version 3 — Frontend Locked. Platform Evolving. Governed.**

> **Status key used throughout this document:**
> 🔒 **LOCKED** — true today, verified against the live deployment and current README. Changes require the process in §7 (Change Control).
> 🧭 **PROPOSED** — direction for a future horizon. Not built. Not promised. Subject to revision before it becomes locked.

---

## 1. What This Repository Is

This repository is the first deployment of a reusable contractor platform. Today it powers **Happy Place Carpentry**. The long-term goal is for the same platform to power other service businesses without rewriting core application logic. 🧭

The website is the product. Everything else exists to support it. 🔒

---

## 2. Non-Goals — Version 1 🔒

Stated explicitly so scope creep has something concrete to point at. Version 1 will **not** include:

- Authentication or user accounts
- CRM or lead management system
- Employee dashboard
- Scheduling engine
- Payment processing (Stripe or otherwise)
- AI assistants or AI-generated estimates
- Customer portal
- Database-backed administration
- Any cloud infrastructure beyond static hosting

If a request falls into this list, it belongs in a Horizon 2/3 conversation, not a Version 1 pull request.

---

## 3. Current State 🔒

This is what is actually live at the time of writing. If this section and the live site ever disagree, the live site is correct and this document needs updating — not the other way around.

```
Customer
  ↓
Next.js 16 Website (App Router, React 19, TypeScript strict, Tailwind v4)
  ↓
Service Layer (mock implementations)
  ↓
mailto: (Estimate Wizard output)
  ↓
Business Owner (Taylor / Lanie inbox)
```

No backend. No database. No workflow engine. The estimate wizard works end-to-end via email today.

### 3.1 Repo layout

```
happy-place-platform/
  website/        # Next.js 16 App Router site — THE MVP, build here
  archive/        # earlier backend prototype — reference only, do not copy
  docs/
    ARCHITECTURE.md
    adr/          # Architecture Decision Records — see §8
  package.json    # root workspace/tooling (optional)
```

Do not restructure this into a monorepo (`apps/`, `packages/`) until there is an actual second deployable app that justifies it.

### 3.2 Configuration — what belongs in `config/`, and only here 🔒

Configuration includes: **company identity, services, navigation, FAQs, gallery, reviews, SEO metadata, brand assets, business hours, coverage area.** If a piece of business data doesn't fit one of these, that's a signal to add a new config file — not to hardcode it into a component.

Verified files today:

```
website/src/config/
  company.ts
  navigation.ts
  services.ts
  gallery.ts
  reviews.ts
  faq.ts
  counties.ts
  seo.ts
```

### 3.3 Service categories (as actually deployed)

- **Outdoor Living** — Decks & Patios, Fences & Gates, Pergolas & Outdoor Structures
- **Remodeling** — Kitchen Remodeling, Bathroom Remodeling
- **Custom Carpentry** — Built-Ins & Trim
- **Repairs & Maintenance** — Repairs & Handyman

A future client needing a different category set is a new client configuration, not a rewrite of this list.

### 3.4 Estimate flow

```
Service → Photos → Questions (service-driven) → Property → Contact → Confirm → email
```

### 3.5 Horizon 2 routes — reserved, not implemented 🔒

`/admin`, `/dashboard`, `/customers`, `/projects`, `/estimates`, `/photos`, `/settings`, `/logs`, `/integrations` — layout and routing reserved, zero functionality behind them.

### 3.6 SEO, accessibility, deployment 🔒

- Metadata API, JSON-LD `LocalBusiness`, `sitemap.ts`, `robots.ts`, OG/Twitter images
- Semantic HTML, focus rings, `prefers-reduced-motion`, mobile nav
- Hosted on Vercel, deployed from GitHub, `vercel.json` pins the build

### 3.7 Known pre-launch items — tracked, not forgotten

- `dangerouslyAllowSVG` is enabled in `next.config.ts` to support placeholder SVG assets. **Must be removed** once real client photography replaces the placeholders.
- `public/images/**` currently holds placeholder SVGs, not real photos.
- `archive/2026-07-backend-prototype` is reference-only; do not build against it.
- Before/after gallery sliders currently point both "before" and "after" states at the same placeholder file — block launch on this being resolved with real assets.

---

## 4. Image Pipeline — Source of Truth 🔒

Photography is now central to the product, so this gets its own locked section rather than living inside general principles.

```
photo-intake/
  ↓
npm run images   (resize, WebP/AVIF conversion, blur placeholder generation)
  ↓
public/images/
  ↓
gallery.json / config/gallery.ts
  ↓
media.ts (typed accessors)
  ↓
React components
```

**Components must never reference image files directly.** Every image reaches a component through a typed config entry, never a raw path string written inline. This is one of the most important rules in this document — it's what lets real photography replace placeholders as a pure data change, not a component rewrite.

---

## 5. Engineering Principles 🔒

1. **The website is the product.** Everything else exists to support it.
2. **Configuration over code.** See §3.2 for what belongs there.
3. **Stable domain language.** Company, Service, ServiceCategory, EstimateRequest, Customer, Property, Project, Review, GalleryItem, ContactRequest — these are the long-term API contract.
4. **Replace implementations, not interfaces.** A component calls `estimateService.submit()`; whether that resolves to `mailto:` or a future API is invisible to the component.
5. **No magic.** No hidden behavior. Every workflow should be understandable by reading the repository. Avoid background automation that surprises a developer or the business owner. Prefer explicit pipelines over implicit behavior.

---

## 6. Future Direction 🧭

Describes the *shape* future work should take — not a commitment to build any of it now.

### 6.1 Service layer pattern

```
EstimateWizard → estimateService.submit() → mailto: (today) → API → Workflow → Google Workspace → CRM (future)
```

Every external capability (`estimate`, `gallery`, `reviews`, `payment`, `storage`, `calendar`, `notification`, `analytics`) sits behind its own service boundary, one active implementation at a time.

### 6.2 Feature flags — scoped narrowly

Feature flags exist **only** for rolling out new functionality, temporary migrations, or staged deployments. They are not configuration storage — business content still belongs in `config/`, not behind a flag.

```ts
export const features = {
  photoUpload: true,
  estimateWizard: true,
  reviews: true,
  financing: false,
  customerPortal: false,
  admin: false,
  aiEstimate: false,
  stripe: false,
};
```

### 6.3 Payments — provider-agnostic, not built

Happy Place Carpentry currently accepts cash and checks off-platform. A future `PaymentProvider` interface should support Stripe, Apple Pay, Google Pay, ACH, or financing without touching the UI layer. Horizon 2+ scope.

### 6.4 Google Workspace

Google Workspace is an **integration target, not a platform dependency.** It's the most sensible first backend integration because it enhances tools the client already uses — but the interface stays generic enough that Microsoft 365 or another provider could stand in later without changing component contracts.

### 6.5 Storage philosophy

Prefer portable formats — Markdown, JSON, images, PDFs — over proprietary lock-in, whenever a storage decision is made.

### 6.6 Security principles (apply from day one, regardless of horizon)

- Never commit secrets; use environment variables
- Principle of least privilege for any future integration access
- Validate all user input; treat uploaded photos as untrusted
- Public forms support basic rate limiting and spam/bot mitigation
- Future automation produces append-only audit logs for meaningful events

### 6.7 Performance & accessibility targets

Aspirational, not yet measured as of this writing — no Lighthouse/PageSpeed run has been confirmed in this document's history. Direction: fast initial load, minimal JS, optimized images, static generation where appropriate, strong Core Web Vitals, full keyboard/screen-reader support, proper heading hierarchy, high-contrast support. Once a real audit is run, replace this paragraph with the actual scores and date.

---

## 7. Change Control 🔒

Changes to any 🔒 **LOCKED** section of this document require, in order:

1. **Architecture review** — does the change conflict with a Non-Goal (§2) or an existing ADR (§8)?
2. **Migration plan** — if the change affects live behavior, what's the rollback path?
3. **Documentation update** — this file, updated in the same change set, not after the fact.
4. **Implementation update** — the code change itself.

All four stay synchronized. A 🔒 section that no longer matches the deployed code is a bug in this document, not a footnote.

---

## 8. Architecture Decision Records

Major decisions are recorded as ADRs in `docs/adr/`, so "why did we do this" points to a document instead of a re-litigated argument. See the companion ADR index for the initial set (`0001`–`0005`).

---

## 9. Definition of Done — Version 1

Version 1 is considered complete when:

- [ ] Real photography replaces all placeholder SVGs
- [ ] Before/after gallery pairs use distinct, real before/after images
- [ ] Homepage is production quality (copy, imagery, trust signals reviewed)
- [ ] Estimate workflow reaches Gmail reliably, tested end-to-end
- [ ] SEO metadata complete (OG image is a raster format, not SVG — see prior review findings)
- [ ] Accessibility audit passes (not yet run as of this writing)
- [ ] Image QA passes (no duplicate/placeholder assets shipped)
- [ ] Mobile UX approved (390px–430px)
- [ ] Desktop UX approved
- [ ] Client signs off

---

## 10. Version 1 Success Metrics 🧭

The architecture exists to serve these outcomes — not the reverse:

- Visitors trust the company within the first five seconds on the homepage
- Visitors request estimates without friction
- Pages load quickly on mobile networks
- The owner (Taylor/Lanie) can update content without a developer or training
- Real photography becomes the primary selling point, not a placeholder to route around

---

## 11. Roadmap

**Horizon 1 — 🔒 mostly complete, gated by §9 Definition of Done:** premium marketing website, estimate wizard, gallery, testimonials, services, about, email workflow.

**Horizon 2 — 🧭 proposed:** backend, workflow engine, lead management, Drive/Calendar automation, photo organization, payment processing.

**Horizon 3 — 🧭 proposed:** business operating system — customer portal, employee portal, scheduling optimization, AI-assisted estimates, marketing automation, analytics, multi-company deployments.

---

## 12. Long-Term Goal 🧭

A flexible platform that helps service businesses operate more efficiently while preserving the craftsmanship and personal relationships that define their work. Happy Place Carpentry is the first deployment. Every future architectural decision should make a second deployment easier than the first — a standard applied when there's an actual second client, not speculatively now.

**Build for today. Design for tomorrow. Never sacrifice the customer experience for speculative architecture.**
