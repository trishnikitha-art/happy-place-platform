# Happy Place Platform — Core Constitution & Architecture

**Version 1 — Frontend First. Platform Ready.**

This repository is the first deployment of a reusable contractor platform. Today
it powers **Happy Place Carpentry**. Tomorrow it should be capable of powering
painters, remodelers, electricians, plumbers, landscapers, HVAC companies,
roofers, and other service businesses **without rewriting core application
logic**.

The philosophy is simple:

> Build the smallest production-quality product today while designing for ten
> years of growth.

---

## Vision

The immediate objective is **not** to build a CRM. It is not to build an ERP. It
is not to build a workflow engine. It is not to build an AI platform.

The immediate objective is to build a **beautiful website that consistently
converts visitors into customers**. Everything else exists only to make future
growth inexpensive.

---

## Core Philosophy

### 1. Customer Experience First
Every feature should improve one or more of: customer trust, conversion rate,
perceived craftsmanship, simplicity, accessibility, performance. If a feature
doesn't improve the customer experience or eliminate future rewrites, it
probably belongs in a later phase.

### 2. Frontend Before Platform
The frontend is the product. The backend exists to support the frontend. Every
backend decision should preserve the customer experience rather than dictate it.

### 3. Configuration Over Code
Business information belongs in configuration, never inside components.

Instead of `const phone = "(541)..."` inside a component, use `config/company.ts`.
Everything customer-facing should be editable without changing component logic.

### 4. Stable Domain Language
The platform speaks in business concepts, not implementation details: Company,
Service, ServiceCategory, EstimateRequest, Customer, Property, Project,
GalleryItem, Review, Appointment, Payment, Notification. These objects form the
long-term API contract.

### 5. Replace Implementations, Not Interfaces
Customer-facing components never know whether information comes from JSON, Google
Workspace, SQLite, PostgreSQL, Stripe, AI, or mock services. They simply call a
service.

```
EstimateWizard
      ↓
estimateService.submit()
      ↓
Implementation      Today: mailto:      Tomorrow: API → Workflow → Google Workspace → Calendar → Drive → CRM
```

The UI never changes.

---

## Current Architecture (MVP)

```
Customer → Next.js Website → Service Layer → Email (MVP) → Business Owner
```

No backend. No cloud infrastructure. No databases. No workflow engine. The
customer still receives a professional experience.

## Future Architecture

```
Customer → Website → Service Layer → API → Workflow Engine → Google Workspace → Stripe → Storage → Notifications → Analytics → Future AI
```

Only the service implementation changes. The customer experience remains
identical.

---

## Repository Structure

```
website/
  src/
    app/          # Next.js App Router routes (pages, layouts, sitemap, robots)
    components/   # UI + feature components (reusable, config-driven)
    config/       # ALL business-specific data (see below)
    services/     # service-layer boundaries (mock today, API tomorrow)
    types/        # stable domain types (the long-term contract)
    lib/          # framework-agnostic helpers (cn, etc.)
  public/         # static assets, images (originals/processed)
  scripts/        # image pipeline + tooling
docs/             # this constitution + deployment runbook
archive/          # previous backend prototype (reference only)
```

## Configuration

Everything business-specific belongs in `config/`:

```
company.ts  navigation.ts  services.ts  serviceCategories.ts  gallery.ts
projects.ts  reviews.ts  faq.ts  counties.ts  seo.ts  social.ts
theme.ts (tokens)  featureFlags.ts
```

Changing clients should primarily involve changing configuration.

## Feature Flags

Future functionality is controlled centrally so features roll out gradually
without branching the codebase:

```ts
export const features = {
  photoUpload: true,
  financing: false,
  reviews: true,
  estimateWizard: true,
  customerPortal: false,
  admin: false,
  aiEstimate: false,
  stripe: false,
  // + calendarIntegration, notifications, googleWorkspace, analytics,
  //   reviewsCollection, beforeAfterGallery, projectSpotlight, maintenanceMode
};
```

## Service Layer

Every external capability lives behind a dedicated service boundary that exposes
a stable interface; only one implementation is active at a time.

```
services/ estimate/ payment/ storage/ calendar/ notification/ gallery/ company/ reviews/ analytics/
  each: index.ts  types.ts  mock.ts  api.ts
```

## Estimate System — the heart of the platform

Canonical `EstimateRequest`: Customer, Property, Selected Service, Questions,
Uploaded Photos, Notes, Preferred Contact, Submitted Time. Every future feature
(email, AI estimation, scheduling, CRM, analytics, Drive, Calendar, Stripe)
consumes this same object.

**Customer flow today:** Request Estimate → Select Service → Upload Photos →
Guided Questions → Contact Info → Confirmation → Email.
**Future:** the same front-of-flow feeds a Workflow Engine → Lead → Drive Folder
→ Calendar → Notifications → CRM → Project. The customer never notices the
transition.

## Payments

Provider-agnostic `PaymentProvider` (Cash, Check, Stripe, ACH, Financing).
Happy Place accepts cash + checks today; Stripe/Apple Pay/Google Pay/ACH/
financing are roadmap. New options must not affect the UI.

## Google Workspace

First production integrations leverage tools the client already pays for: Gmail,
Calendar, Drive, Contacts (later Maps, Docs, Sheets). Enhance existing workflows;
don't replace familiar tools overnight. The MVP intentionally avoids Google
Cloud — future adapters plug in behind the service layer without frontend
changes.

## Storage Philosophy

Never lock customer data into proprietary formats. Prefer Markdown, JSON, images,
PDFs. Generated artifacts remain portable.

## Security (part of the architecture, not an afterthought)

- **Secrets:** never commit; use environment variables (API keys, OAuth, SMTP,
  payment secrets).
- **Least privilege:** grant only permissions required (Drive only when needed,
  Calendar only when scheduling, payment isolated from content).
- **Validation:** validate all user input; never trust uploads, emails, phones,
  query params, form submissions.
- **File uploads:** treat as untrusted — type validation, size limits, safe
  filenames, malware scanning if infra grows, never execute uploaded content.
- **Rate limiting:** public forms need basic rate limiting, spam protection, bot
  mitigation.
- **Auth (future):** role-based (Owner, Office Manager, Employee, Read Only).
- **Auditability (future):** append-only event logs; every important action
  traceable (estimate submitted, payment created, appointment scheduled, review
  requested).

## Images — photography is the product

Every client image: preserved, optimized, responsive, accessible. Pipeline:
Original → WebP → AVIF → blur placeholders → responsive sizes → metadata → alt
text. **Never upscale low-quality images.**

## Accessibility (baseline requirement)

Keyboard navigation, screen readers, high contrast, reduced motion, semantic
HTML, proper heading hierarchy.

## Performance (a feature)

Fast initial load, minimal JavaScript, optimized images, static generation where
appropriate, excellent Core Web Vitals.

## Deployment

Primary hosting: GitHub + Vercel. Automatic + preview deployments, HTTPS,
rollbacks, minimal operational overhead.

---

## Roadmap

**Horizon 1 —** Premium marketing website, estimate wizard, gallery,
testimonials, services, contact, Google Workspace email workflow.

**Horizon 2 —** Backend, workflow engine, lead management, Drive automation,
calendar automation, photo organization, payment processing.

**Horizon 3 —** Business operating system, customer portal, employee portal,
scheduling optimization, AI-assisted estimates, marketing automation, analytics,
multi-company deployments.

---

## Long-Term Goal

The long-term vision is not simply to build websites. It is to build a flexible
platform that helps service businesses operate more efficiently while preserving
the craftsmanship and personal relationships that define their work. Happy Place
Carpentry is the first deployment. **Every architectural decision should make the
second deployment easier than the first.**

> Build for today. Design for tomorrow. Never sacrifice the customer experience
> for speculative architecture.
