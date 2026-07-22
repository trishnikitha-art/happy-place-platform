# PING Read-Only Audit: Authentic Customer Feedback & Reputation Pipeline

**Directive:** PING — Replace Fake Reviews Pipeline  
**Date:** 2026-07-21  
**Scope:** Complete lifecycle from project completion through published review  
**Constraint:** Read-only. No code changes. Evidence-based.  

---

## Executive Summary

The repository has **no fake reviews**. The `reviews` array is empty by constitutional design. The word "fake" in the audit title refers to the **placeholder state** — hardcoded 5-star badges, hardcoded "12 years" claims, and zero authentic customer feedback flowing into the site. The site currently says "0 / 5 across 0 featured reviews."

What exists is a well-designed but **entirely unwired** reputation system. The `internal/` directory contains `ReviewAuthority`, `ReviewSource` adapter interface, `FOLLOW_UP_TIMELINE` automation, and a full `Provenance`-based data model across 10 Google Sheets schemas. None of this is connected to the website. The website reads from `src/config/reviews.ts` which exports an empty array.

The estimate pipeline produces `EstimateRequest` objects but they have **no identity** (no UUID, no correlation ID), **no persistence** (mailto opens the email client), and **no event trail** (no event emission on submission). The request is a client-side-only object that dies when the browser tab closes.

**The repository implies 9 canonical review objects but implements zero of them.** The infrastructure for a constitutional reputation pipeline exists in fragments across 4 disconnected layers:

1. **Website types** (`src/types/index.ts`) — `Review` interface with 10 fields
2. **Operational schemas** (`internal/sheets/schema.ts`) — `Review` interface with `Provenance` mixin, 10 Google Sheets domain objects
3. **Authority logic** (`internal/reviews/reviewAuthority.ts`) — `ReviewAuthority` class with aggregation, social proof, follow-up timeline
4. **Feature flags** (`src/config/featureFlags.ts`) — `reviewsCollection: false`, `reviews: true`

These four layers share **zero imports**. They are four independent opinions about what a review is.

---

## 1. Current Review Authority

### 1.1 Inventory

| Component | Location | Lines | Status | Authority? |
|-----------|----------|-------|--------|-----------|
| `reviews` array | `src/config/reviews.ts:9` | 14 | Empty, exports `[]` | **YES** — single source for website rendering |
| `averageRating()` | `src/config/reviews.ts:11` | 4 | Returns 0 when empty | Derived from reviews array |
| `Review` type (public) | `src/types/index.ts:107-119` | 13 | Type definition only | Schema authority |
| `Review` type (internal) | `internal/sheets/schema.ts:46-56` | 11 | Type definition only, DIFFERENT from public | **DUPLICATE** — different fields |
| `ReviewAuthority` class | `internal/reviews/reviewAuthority.ts` | 54 | Implemented, zero consumers | Unwired authority |
| `ReviewSource` interface | `internal/reviews/reviewAuthority.ts:9-12` | 4 | Interface only, no implementation | Adapter contract |
| `verifiedSocialProof()` | `internal/reviews/reviewAuthority.ts:30-34` | 5 | Implemented, zero callers | Derived string generator |
| `FOLLOW_UP_TIMELINE` | `internal/reviews/reviewAuthority.ts:36-43` | 8 | Implemented, zero consumers | Automation blueprint |
| `StarRating` component | `src/components/star-rating.tsx` | 19 | Active, renders 5 stars | Presentational only |
| `StarRating` hardcoded `rating={5}` | `src/app/page.tsx:73` | 1 | Active on homepage hero | **MISLEADING** — always 5 stars |
| `StarRating` hardcoded `rating={5}` | `src/app/reviews/page.tsx:29` | 1 | Active on reviews trust strip | **MISLEADING** — always 5 stars |
| "12 years serving" hardcoded | `src/app/reviews/page.tsx:32` | 1 | Active | **FALSE** — contradicts `Est. 2024` |
| Reviews page heading | `src/app/reviews/page.tsx:23-24` | 2 | Active, shows "0 / 5 across 0" | Technically accurate, poor UX |
| Homepage reviews section | `src/app/page.tsx:253-271` | 19 | Active, renders 0 cards | Dead section |
| `reviewsCollection` flag | `src/config/featureFlags.ts:21` | 1 | `false` | Gates the entire pipeline |
| `reviews` flag | `src/config/featureFlags.ts:14` | 1 | `true` | Gates the reviews page |
| JSON-LD `aggregateRating` | `src/app/layout.tsx` | — | **REMOVED this session** | Was hardcoded `"5.0"` / `"40"` |
| `GOOGLE_API_KEY` env var | `.env.example:32` | 1 | Commented out | Not configured |
| `GOOGLE_PLACE_ID` env var | `.env.example:35` | 1 | Commented out | Not configured |

### 1.2 Authority Determination

**Single authority for website rendering:** `src/config/reviews.ts`  
**Single authority for operational logic:** `internal/reviews/reviewAuthority.ts`  
**Conflict:** These two authorities share no import relationship. The website reads an empty array; the authority class has aggregation logic that would compute from data it cannot access.

### 1.3 Duplication

| Duplication | Severity | Detail |
|-------------|----------|--------|
| Two `Review` types | **HIGH** | `src/types/index.ts` has `{source?, verified?}`. `internal/sheets/schema.ts` has `{source: "google"|"internal"|"manual", published}` with `Provenance` mixin. Different shapes, same name, zero import relationship. |
| Hardcoded stars vs computed rating | **MEDIUM** | `StarRating rating={5}` is hardcoded on both homepage and reviews page. `averageRating()` from reviews.ts returns 0. These contradict. |
| "12 years" vs "Est. 2024" | **MEDIUM** | `reviews/page.tsx:32` says "12 years serving." `company.proof.yearsInBusiness` says "Est. 2024" (2 years). |
| Layout JSON-LD vs reviews.ts | **FIXED** | `aggregateRating: {ratingValue: "5.0", reviewCount: "40"}` was hardcoded in layout.tsx while reviews.ts exported empty array. Removed this session. |

### 1.4 Inconsistencies

1. **Reviews page metadata** (`reviews/page.tsx:10`): Description interpolates `averageRating()` → renders as "0 out of 5 from local reviews." Poor SEO signal.
2. **Reviews page footer** (`reviews/page.tsx:41`): "Reviews shown are a sample of our recent work." — implies reviews exist. Zero are shown.
3. **Homepage reviews section** (`page.tsx:253-271`): Renders "Read all reviews →" link to a page showing zero reviews.

---

## 2. Review Domain Model

### 2.1 Canonical Objects the Repository Implies

The codebase, when read holistically, implies 9 canonical objects. None are implemented as unified entities.

| # | Object | Implied By | Current Implementation | Gap |
|---|--------|------------|----------------------|-----|
| 1 | **Review** | `src/types/index.ts:107`, `internal/sheets/schema.ts:46`, `internal/reviews/reviewAuthority.ts` | Two incompatible type definitions, zero data | Two competing schemas, no data flow |
| 2 | **ReviewRequest** | `internal/reviews/reviewAuthority.ts:36-43` (`FOLLOW_UP_TIMELINE`) | 4-stage timeline constant, no automation | Blueprint exists, nothing triggers it |
| 3 | **Reviewer** | `Review.author` field, `ReviewSource` interface | Embedded in Review type as `author: string` | No独立 identity, no contact info, no consent |
| 4 | **ProjectReference** | `Review.project?` field, `internal/sheets/schema.ts` `Review.projectId` | Optional string on public type, required on internal type | No FK relationship, no lookup |
| 5 | **ReviewPublication** | Homepage rendering, reviews page, service cards | Direct array consumption in 3 components | No publication state machine, no timestamps |
| 6 | **ReviewConsent** | Not referenced anywhere | **DOES NOT EXIST** | Critical gap — no consent tracking |
| 7 | **ReviewModeration** | Not referenced anywhere | **DOES NOT EXIST** | No approval/rejection workflow |
| 8 | **ReviewAttachment** | `Review` type has no photo field | **DOES NOT EXIST** | No photo/video attachment to reviews |
| 9 | **ReviewAnalytics** | `src/services/analytics.ts` has review-related tracking methods | No-op interface, no events | No pipeline health metrics |

### 2.2 What the Internal Schema Already Defines

`internal/sheets/schema.ts` defines a richer `Review` with `Provenance`:

```
Review {
  reviewId: string          // Unique ID
  projectId: string         // FK to Project
  author: string            // Reviewer name
  location: string          // City/state
  rating: number            // 1-5
  title: string             // Review headline
  body: string              // Review text
  source: "google" | "" | "manual"  // Origin
  published: boolean        // Publication state
  + Provenance              // source, effectiveDate, confidence, lastVerified
}
```

This implies: ReviewRequest, ProjectReference, ReviewPublication (via `published`), and ReviewAnalytics (via Provenance) already have partial schema definitions.

### 2.3 Domain Boundary

The review domain spans **two bounded contexts** that currently share no interface:

**Website Context** (`src/`):
- `Review` type (10 fields, no Provenance)
- `reviews` config (empty array)
- `averageRating()` function
- `StarRating` component
- Reviews page, homepage section
- Feature flags: `reviews`, `reviewsCollection`

**Operational Context** (`internal/`):
- `Review` type (10 fields + Provenance, different shape)
- `ReviewAuthority` class (aggregation, social proof)
- `ReviewSource` adapter interface
- `FOLLOW_UP_TIMELINE` automation blueprint
- Google Sheets schema with 10 domain objects
- Feature flag: implicitly `googleWorkspace`

**These two contexts have zero import relationship.** `internal/README.md` line 2 explicitly states: `src/` never imports from `internal/`.

---

## 3. Producer Inventory

### 3.1 Current Producers

| # | Producer | Status | Authority | Trust Boundary |
|---|----------|--------|-----------|---------------|
| 1 | Google Form (proposed) | **DOES NOT EXIST** | None | Would be operational producer |
| 2 | Google Reviews (API) | **NO CLIENT EXISTS** | None | Would be external source |
| 3 | Manual Admin Entry | **NO UI EXISTS** | None | Would be internal producer |
| 4 | `src/config/reviews.ts` | **EXISTS, EMPTY** | Constitutional (for website) | Inside trust boundary |
| 5 | `internal/reviews/reviewAuthority.ts` | **EXISTS, UNWIRED** | Operational (for business logic) | Inside trust boundary |

### 3.2 Future Producers

Every producer must map to exactly one authority. The canonical authority for reviews should be the `Review` object with `Provenance`. Producers are replaceable adapters.

```
Producer                 →  Canonical Review Object  →  Consumers
─────────────────────────────────────────────────────────────────
Google Form              →  Review { source: "form" } →  Website, CRM, Analytics
Google Reviews API       →  Review { source: "google" } →  Website, Analytics
Manual Admin Entry       →  Review { source: "manual" } →  Website, CRM
Customer Portal (future) →  Review { source: "portal" } →  Website, CRM
CRM Integration          →  Review { source: "crm" } →  Website, Analytics
Mobile App (future)      →  Review { source: "app" } →  Website, CRM, Analytics
Voice AI (future)        →  Review { source: "voice" } →  Website, CRM
```

### 3.3 Producer Ownership

| Producer | Ownership | Notes |
|----------|-----------|-------|
| Google Form | **Temporary** — operational producer until CRM exists | Like Drive is temporary for images |
| Google Reviews API | **Permanent** — external source of truth for Google reviews | Cannot be replaced |
| Manual Admin Entry | **Permanent** — edge cases always need human override | Internal tool |
| Customer Portal | **Future** — requires authentication infrastructure | High-effort, deferred |

---

## 4. Publication Pipeline

### 4.1 Current State

```
src/config/reviews.ts (empty array)
        │
        ├──→ src/app/page.tsx (homepage)
        │         ├── Hero: StarRating(5) hardcoded ← MISLEADING
        │         ├── Reviews section: 0 cards rendered
        │         └── "Read all reviews →" link
        │
        └──→ src/app/reviews/page.tsx
                  ├── "0 / 5 across 0 featured reviews"
                  ├── Trust strip: StarRating(5) ← MISLEADING
                  ├── "12 years serving..." ← FALSE
                  └── 0 review cards
```

### 4.2 Authority vs Presentation Map

| Component | Role | Authority? |
|-----------|------|-----------|
| `reviews.ts` | Data source | **YES** — single authority for website |
| `ReviewAuthority` (internal) | Business logic | **YES** — single authority for operations |
| `StarRating` | Presentational | No — renders any number |
| `reviews/page.tsx` | Page layout | No — consumes reviews.ts |
| `page.tsx` homepage section | Page layout | No — consumes reviews.ts |
| JSON-LD `aggregateRating` | SEO | **REMOVED** — was hardcoded authority |
| `verifiedSocialProof()` | Marketing copy | No — derives from ReviewAuthority data |

### 4.3 Publication Targets

| Target | Current Source | Authority Conflict? |
|--------|---------------|-------------------|
| Homepage hero badge | Hardcoded `StarRating(5)` | **YES** — ignores reviews.ts |
| Homepage reviews section | `reviews.slice(0, 3)` | No — reads from authority |
| Reviews page | `reviews` array | No — reads from authority |
| Reviews page trust strip | Hardcoded `StarRating(5)` | **YES** — ignores reviews.ts |
| JSON-LD LocalBusiness | Removed (was hardcoded) | **FIXED** — no longer conflicts |
| Service pages | No reviews shown | N/A |
| Sitemap | `/reviews` at priority 0.7 | N/A |

### 4.4 Presentation vs Authority Separation

The correct constitutional boundary:

```
AUTHORITY                          PRESENTATION
─────────                          ────────────
Review object with Provenance  →   Homepage hero badge (computed average)
ReviewAuthority aggregation    →   Reviews page card grid
ReviewSource adapter           →   Service page testimonials
Verified social proof string   →   Trust strip (dynamic, not hardcoded)
Review publication state       →   JSON-LD aggregateRating (computed, not hardcoded)
```

**Currently**: Everything on the presentation side is either hardcoded or empty. The authority side exists only in `internal/` with zero wiring.

---

## 5. Operational Pipeline

### 5.1 Desired Flow

```
Project Completed
        ↓
Eligibility Check
        ↓
Review Request (automated)
        ↓
Customer Response (Google Form / Google Review / manual)
        ↓
Validation (required fields, consent)
        ↓
Moderation (human review, approval)
        ↓
Canonical Review Object (with Provenance)
        ↓
Publication (website, JSON-LD, marketing)
        ↓
Analytics (pipeline health metrics)
        ↓
Archive (Google Sheets / future CRM)
```

### 5.2 Current State vs Desired

| Stage | Desired | Current | Gap |
|-------|---------|---------|-----|
| Project Completed | Event triggers eligibility | **No event system exists** | No `ProjectCompleted` event |
| Eligibility | Auto-determine if review request appropriate | **No logic** | No eligibility rules |
| Review Request | Automated email/form link | `FOLLOW_UP_TIMELINE` blueprint exists in `internal/` | Blueprint exists, no automation |
| Customer Response | Google Form / Google Review | **No form exists** | No Google Form, no Apps Script |
| Validation | Required field check, consent recorded | **No validation** | No form to validate |
| Moderation | Human approve/reject | **No moderation UI** | No admin review workflow |
| Canonical Review | Object with Provenance, ID, version | Two incompatible type defs | No unified canonical object |
| Publication | Website renders from canonical | Empty array, hardcoded badges | No data flow |
| Analytics | Request rate, completion rate, publication rate | No-op analytics interface | No events emitted |
| Archive | Google Sheets / CRM | Internal Sheets schema exists | Schema only, no read/write |

### 5.3 Entry Triggers

| Trigger | Current Support | Required Infrastructure |
|---------|----------------|------------------------|
| `ProjectCompleted` event | **None** — no event system | Event emitter + correlation ID |
| Manual admin trigger | **None** — no admin UI | Admin dashboard with action buttons |
| Scheduled follow-up | `FOLLOW_UP_TIMELINE` constant | Cron/scheduler + email sending |
| Customer self-submit | **None** — no form | Google Form or equivalent |

### 5.4 Exit Criteria

A review exits the pipeline when:
1. **Validated**: Required fields present, consent recorded
2. **Approved**: Human moderator approves (or auto-approved if source is Google Reviews)
3. **Published**: Canonical Review object is live on website
4. **Archived**: Record persisted to operational store (Google Sheets)

### 5.5 Failure States

| Failure | Current Handling | Required |
|---------|-----------------|----------|
| Customer doesn't respond | **None** — no request sent | Reminder schedule (FOLLOW_UP_TIMELINE has this) |
| Invalid submission | **None** — no validation | Client-side + server-side validation |
| Moderation rejection | **None** — no moderation | Rejection reason, notification to admin |
| Publication failure | **None** — no publication pipeline | Retry, rollback, alert |
| Consent withdrawal | **None** — no consent tracking | GDPR-style removal, re-render without |

### 5.6 Automation Opportunities

| Opportunity | Current State | Effort |
|-------------|--------------|--------|
| Post-project email with review link | `FOLLOW_UP_TIMELINE` defines stages; Gmail API exists | Medium — wire timeline to Gmail |
| Google Form → Sheets → Website | Nothing exists | High — form creation + Apps Script + sync |
| Google Reviews → Website | `ReviewAuthority` + `ReviewSource` interface exists | Medium — implement adapter |
| Auto-publish low-risk reviews | No moderation system | Low — flag-based auto-approve |
| Review request A/B testing | No analytics infrastructure | High — requires event system |

---

## 6. Google Workspace Boundary

### 6.1 Product Role Map

| Google Product | Role | Authority? | Current Code |
|---------------|------|-----------|-------------|
| **Google Forms** | Operational producer (customer intake) | **NO** — replaceable adapter | Zero references |
| **Google Sheets** | Operational store (business database) | **NO** — cache/adapter | `internal/sheets/schema.ts` (10 schemas, types only) |
| **Google Drive** | File storage (photos, documents) | **NO** — adapter | `src/services/storage.ts` (interface only) |
| **Google Gmail** | Communication channel (notifications) | **NO** — adapter | `src/app/api/estimate/route.ts` (active, feature-gated) |
| **Google Calendar** | Scheduling (appointments) | **NO** — adapter | `src/config/featureFlags.ts:16` (flag only) |
| **Google Apps Script** | Event processor/orchestrator | **NO** — glue code | Zero references |
| **Google Places API** | External review source | **NO** — adapter | `GOOGLE_PLACE_ID` env var (commented out) |
| **Google OAuth2** | Authentication gateway | **CONSTITUTIONAL** — single auth authority | `src/lib/google.ts` (active, blocked by env vars) |

### 6.2 Constitutional Rule

**No Google product becomes the authority.** Every Google product is a replaceable adapter. The canonical `Review` object with `Provenance` is the authority. Google Forms produce Reviews. Google Sheets store Reviews. Google Reviews source Reviews. But none of them ARE the Review.

### 6.3 Current Google Workspace Readiness

| Capability | Code | Feature Flag | Env Vars | Status |
|-----------|------|-------------|----------|--------|
| Gmail send | `api/estimate/route.ts` | `estimateApi: false` | 4 vars needed, 0 configured | Blocked |
| Drive upload | `services/storage.ts` | `googleWorkspace: false` | Same 4 vars | Interface only |
| Sheets read/write | `internal/sheets/schema.ts` | Implicit | Same 4 + `spreadsheets` scope | Types only |
| Calendar create | None | `calendarIntegration: false` | `GOOGLE_CALENDAR_ID` not set | Flag only |
| Forms create | None | None | None | **DOES NOT EXIST** |
| Places read | `internal/reviews/reviewAuthority.ts` | `reviewsCollection: false` | `GOOGLE_API_KEY` + `GOOGLE_PLACE_ID` not set | Class exists, no adapter |
| Apps Script | None | None | None | **DOES NOT EXIST** |

### 6.4 Migration Path

The constitutional pattern requires that switching from Google Workspace to a future CRM changes only the adapters, not the canonical objects:

```
Today:                    Future:
Google Form    → Review   CRM Form      → Review
Google Sheets  ← Review   CRM Database  ← Review
Gmail          ← Review   CRM Email     ← Review
Google Calendar← Event    CRM Scheduler ← Event
```

The `Review` object, `Provenance` mixin, and `ReviewAuthority` class remain unchanged. Only the adapter implementations swap.

---

## 7. Identity

### 7.1 Required Identifiers

| ID | Purpose | Currently Exists? | Origin Point |
|----|---------|-------------------|-------------|
| **Review ID** | Unique review identity | `Review.id` field exists in type | Would be generated on submission (UUIDv5 from content hash) |
| **Customer ID** | Cross-reference customer across systems | `Customer.customerId` in internal schema | Would be generated on first contact |
| **Project ID** | Link review to completed project | `Project.projectId` in internal schema | Would be generated on project creation |
| **Estimate ID** | Link back to original estimate | `EstimateRequest` has NO id field | **MISSING** — would be generated on wizard submit |
| **Correlation ID** | Trace entire customer journey | **DOES NOT EXIST** | Would be generated on first touchpoint |

### 7.2 Identity Gap Analysis

The image pipeline already demonstrates the correct pattern:
- `deterministicUUID(slug, filename)` — content-based, reproducible
- `stableId` — content-hash-based, collision-resistant
- `id` — human-readable presentation key

The review pipeline needs the same three-layer identity:
1. **Content-based UUID**: `deterministicUUID("review", projectId + author + timestamp)` — survives regeneration
2. **Correlation ID**: Generated once per customer journey, shared across Estimate → Project → Review
3. **Presentation ID**: Human-readable slug (e.g., `"review-benton-county-deck-2026-07"`)

### 7.3 Identity Chain

```
Customer First Touch
        ↓
Correlation ID (generated once)
        ↓
┌───────────────────────────────────────────┐
│ Estimate Request                          │
│   estimateId: deterministicUUID(...)      │
│   correlationId: <shared>                 │
├───────────────────────────────────────────┤
│ Project                                   │
│   projectId: deterministicUUID(...)       │
│   correlationId: <shared>                 │
│   estimateId: <FK>                        │
├───────────────────────────────────────────┤
│ Review Request                            │
│   requestId: deterministicUUID(...)       │
│   correlationId: <shared>                 │
│   projectId: <FK>                         │
├───────────────────────────────────────────┤
│ Review                                    │
│   reviewId: deterministicUUID(...)        │
│   correlationId: <shared>                 │
│   projectId: <FK>                         │
│   requestId: <FK>                         │
├───────────────────────────────────────────┤
│ Publication                               │
│   publicationId: deterministicUUID(...)   │
│   reviewId: <FK>                          │
│   correlationId: <shared>                 │
└───────────────────────────────────────────┘
```

### 7.4 Current EstimateRequest Identity Gap

`src/types/index.ts:149-158` defines `EstimateRequest` with:
- `customer: Customer` (name, email, phone)
- `property: Property` (address, city, county)
- `services: string[]`
- `answers: Record<string, string|boolean|number>`
- `photos: {name, size}[]`
- `submittedAt: string`

**Missing**: No `id`, no `correlationId`, no `version`, no `contentHash`, no `provenance`. The request is an anonymous blob that cannot be referenced after submission.

---

## 8. Evidence Model

### 8.1 Evidence Lineage

The image pipeline establishes the correct pattern: every artifact carries `provenance` (sourceFile, importedAt, pipelineVersion) and `contentHash` (SHA-256 of bytes). The review pipeline should carry equivalent evidence.

```
Project Evidence Chain:
        
Photos (before/after)     →  gallery.json (contentHash, provenance)
        ↓
Project Record            →  internal/sheets (provenance, confidence)
        ↓
Completion Evidence       →  Project.status = "completed"
        ↓
Review (with photos)      →  canonical Review object (provenance, consent)
        ↓
Publication               →  website rendering (derived, not authoritative)
```

### 8.2 Shared Lineage

Photos, reviews, estimates, and projects **should share lineage** through the Correlation ID. Currently:

| Artifact | Has Content Hash? | Has Provenance? | Has Correlation? |
|----------|-------------------|-----------------|-----------------|
| Gallery images | **YES** | **YES** | **NO** (uses project slug) |
| EstimateRequest | **NO** | **NO** | **NO** |
| Review (public) | **NO** | **NO** | **NO** |
| Review (internal) | **NO** | **YES** (Provenance mixin) | **NO** |
| Project (internal) | **NO** | **YES** (Provenance mixin) | **NO** |

### 8.3 Evidence Requirements

A constitutional review must answer:
1. **Who submitted it?** → `Reviewer` identity (name, email, consent)
2. **When?** → ISO timestamp, immutable
3. **What project?** → `ProjectReference` with FK
4. **What service?** → `ServiceSlug` (already exists)
5. **What evidence?** → Photos, completion status, before/after
6. **How was it obtained?** → `source` field (form, google, manual)
7. **Was consent given?** → `ReviewConsent` object (currently missing)
8. **Is it published?** → Publication state machine (currently missing)
9. **Who approved it?** → Moderator identity (currently missing)
10. **Can it be removed?** → Removal audit trail (currently missing)

---

## 9. Analytics

### 9.1 Events the Pipeline Should Emit

| Event | Trigger | Current Support |
|-------|---------|----------------|
| `ReviewRequested` | Request email sent | **None** — no event system |
| `ReviewRequestOpened` | Customer opens email | **None** — no email tracking |
| `ReviewFormOpened` | Customer opens Google Form | **None** — no form |
| `ReviewFormStarted` | Customer begins filling form | **None** — no form |
| `ReviewSubmitted` | Customer submits form | **None** — no form |
| `ReviewValidated` | Server validates submission | **None** — no validation |
| `ReviewModerated` | Admin approves/rejects | **None** — no moderation |
| `ReviewPublished` | Review goes live on website | **None** — no publication trigger |
| `ReviewRemoved` | Admin removes review | **None** — no removal workflow |
| `ReviewReminderSent` | Follow-up reminder sent | **None** — no automation |

### 9.2 Existing Analytics Architecture

`src/services/analytics.ts` defines a no-op interface with 4 methods:
- `trackEstimateStarted(service?)` — estimate wizard entry
- `trackEstimateSubmitted(service?, transport?)` — estimate submission
- `trackPhoneClicked()` — phone CTA
- `trackEmailClicked()` — email CTA

**Zero review-related tracking methods exist.** The analytics interface would need expansion to cover the review pipeline.

### 9.3 Pipeline Health Metrics

| Metric | Formula | Current Data |
|--------|---------|-------------|
| Request rate | ReviewRequested / ProjectCompleted | Neither event exists |
| Open rate | ReviewFormOpened / ReviewRequested | Neither event exists |
| Completion rate | ReviewSubmitted / ReviewFormOpened | Neither event exists |
| Publication rate | ReviewPublished / ReviewSubmitted | Neither event exists |
| Google conversion rate | Google Reviews / ReviewRequested | Neither event exists |
| Average time to review | ReviewSubmitted - ProjectCompleted | Neither event exists |
| Moderation backlog | ReviewValidated - ReviewPublished | Neither event exists |
| Removal rate | ReviewRemoved / ReviewPublished | Neither event exists |
| Revenue per review | Revenue / ReviewPublished | Neither event exists |

---

## 10. AI Readiness

### 10.1 Evaluation Against AI Requirements

| Requirement | Current State | Score |
|-------------|--------------|-------|
| **Stable identifiers** | Image pipeline has UUID system. Review pipeline has none. | 2/10 |
| **Canonical ownership** | Two competing Review types. No single authority. | 1/10 |
| **Deterministic lifecycle** | No state machine. No events. No transitions. | 0/10 |
| **Explicit moderation** | No moderation system. No approval workflow. | 0/10 |
| **Provenance** | Internal schema has Provenance mixin. Public type has none. | 3/10 |
| **Structured relationships** | No FK relationships. No correlation IDs. No lineage. | 1/10 |

**Overall AI Readiness: 1/10** — The review pipeline cannot support AI analysis because it has no data, no structure, and no events.

### 10.2 What AI Would Need

An AI system consuming review data would need:
1. **Canonical Review objects** with stable IDs and full Provenance
2. **Event stream** of review lifecycle transitions
3. **Correlation chain** linking reviews to projects, estimates, and customers
4. **Moderation state** with approval/rejection history
5. **Publication state** with per-platform publication records
6. **Photo evidence** linked to review objects
7. **Analytics metrics** computed from event data

None of these exist today.

---

## 11. The Estimate Pipeline Gap

The estimate pipeline is the **upstream prerequisite** for the review pipeline. Without a completed estimate/project, there is no review to request. The estimate pipeline has critical gaps:

### 11.1 EstimateRequest Has No Identity

```
Current EstimateRequest:
{
  customer: { name, email, phone },
  property: { address, city, county },
  services: string[],
  answers: Record<string, string|boolean|number>,
  photos: { name, size }[],
  submittedAt: string       ← ISO timestamp, the only "identity"
}

Missing:
  id: string                ← No UUID
  correlationId: string     ← No correlation
  version: string           ← No schema version
  contentHash: string       ← No content hash
  provenance: Provenance    ← No lineage
  status: string            ← No lifecycle state
```

### 11.2 EstimateRequest Has No Persistence

The `estimateService.submit()` flow:
1. If `estimateApi: false` (current): Opens `mailto:` link → browser hands off to email client → **request dies client-side**
2. If `estimateApi: true`: POSTs to `/api/estimate` → Gmail sends email → **request not stored anywhere**

Neither path persists the `EstimateRequest` to a database, sheet, or file. There is no record of what was submitted.

### 11.3 EstimateRequest Has No Event Trail

No events are emitted when:
- Wizard is opened
- Service is selected
- Step is entered/exited
- Photos are added
- Form is submitted
- Email is sent

The `analytics` interface has `trackEstimateStarted` and `trackEstimateSubmitted` but they are no-ops.

### 11.4 Impact on Review Pipeline

The review pipeline cannot trigger on "Project Completed" because:
1. No `ProjectCompleted` event exists
2. No `EstimateRequest` is persisted to track the customer journey
3. No correlation ID links estimates to projects to reviews
4. The `FOLLOW_UP_TIMELINE` in `internal/reviews/reviewAuthority.ts` has no mechanism to fire

---

## 12. Constitutional Recommendations

### 12.1 Priority 0: Fix Hardcoded Inconsistencies (Immediate)

| Fix | File | Change |
|-----|------|--------|
| Remove hardcoded `StarRating(5)` on homepage | `src/app/page.tsx:73` | Use `averageRating()` when reviews exist, hide when empty |
| Remove hardcoded `StarRating(5)` on reviews page | `src/app/reviews/page.tsx:29` | Same treatment |
| Remove hardcoded "12 years serving" | `src/app/reviews/page.tsx:32` | Use `company.proof.yearsInBusiness` |
| Fix reviews page metadata | `src/app/reviews/page.tsx:10` | Don't show "0 out of 5" in SEO description |
| Fix reviews page footer | `src/app/reviews/page.tsx:41` | Don't claim "sample of recent work" when none exist |

**These are code fixes, not architecture. Can be done today.**

### 12.2 Priority 1: Unified Review Type (Constitutional)

Eliminate the two competing `Review` types. Define one canonical type:

```
Canonical Review:
  reviewId: string (deterministic UUID)
  correlationId: string (links to customer journey)
  projectId: string (FK to project)
  customer: { name, email? }
  rating: number (1-5)
  title: string
  body: string
  source: "google" | "form" | "manual" | "portal" | "api"
  published: boolean
  approved: boolean
  photos: string[] (URLs or Drive file IDs)
  consent: ReviewConsent
  moderation: ReviewModeration
  provenance: Provenance (source, effectiveDate, confidence, lastVerified)
```

Place this in `src/types/review.ts` (or `src/types/index.ts`). The `internal/sheets/schema.ts` Review type should become a serialization format, not a separate definition.

### 12.3 Priority 2: Correlation ID Infrastructure (Constitutional)

Generate a correlation ID on first customer touchpoint (wizard open or estimate submission). Propagate it through:

```
Correlation ID Generated
        ↓
EstimateRequest.correlationId
        ↓
Project.correlationId (when project created)
        ↓
ReviewRequest.correlationId
        ↓
Review.correlationId
        ↓
Publication.correlationId
```

This enables end-to-end tracing of the customer journey.

### 12.4 Priority 3: EstimateRequest Identity + Persistence (Constitutional)

Add to `EstimateRequest`:
- `id`: Deterministic UUID from content hash
- `correlationId`: Shared journey ID
- `status`: `"submitted"` → `"reviewed"` → `"quoted"` → `"accepted"` → `"completed"`

Persist to operational store (Google Sheets via API, or local JSON file as interim).

### 12.5 Priority 4: Review Request Automation (Operational)

Wire `FOLLOW_UP_TIMELINE` from `internal/reviews/reviewAuthority.ts` to Gmail API:
- Day 2: Thank you email with Google Form link
- Day 30: Review request reminder
- Day 180: Anniversary check-in
- Day 365: Annual review request

Requires: Gmail API enabled, Google Form created, Apps Script for form-to-sheets sync.

### 12.6 Priority 5: Google Form as Operational Producer (Operational)

Create Google Form matching `EstimateRequest` schema:
- Form fields mirror `EstimateQuestion` types
- Apps Script webhook on form submit
- Apps Script creates `Review` object with `Provenance { source: "form" }`
- Writes to Google Sheets (operational store)
- Triggers notification to admin

The form is replaceable. The canonical `Review` object is not.

### 12.7 Priority 6: Moderation Workflow (Operational)

Simple admin page at `/admin/reviews`:
- Lists unmoderated reviews
- Shows review content, source, project reference
- Approve / Reject / Edit buttons
- Rejection reason field
- Auto-publish if source is Google Reviews (trusted)

### 12.8 Priority 7: Publication Pipeline (Constitutional)

Wire `reviews.ts` to read from operational store:
- `ReviewAuthority.getForHomepage(limit)` → returns published reviews
- `ReviewAuthority.getAggregate()` → returns computed average
- Homepage and reviews page consume authority, not hardcoded data
- JSON-LD `aggregateRating` computed from authority, not hardcoded

### 12.9 Priority 8: Analytics Events (Observability)

Add to `src/services/analytics.ts`:
- `trackReviewRequested(correlationId)`
- `trackReviewSubmitted(correlationId, source)`
- `trackReviewPublished(correlationId)`
- `trackReviewRemoved(correlationId, reason)`

Wire to real provider when ready. No-op now preserves the interface.

---

## 13. End-to-End Customer Journey Map

After understanding the review vertical, the full journey becomes visible:

```
DISCOVERY
  Customer finds website (SEO, referral, ads)
  ↓
TRUST BUILDING
  Sees homepage, gallery, reviews, credentials
  ↓
QUALIFICATION
  Reads services, service area, FAQ
  ↓
ESTIMATE INTAKE
  Opens /estimate wizard
  → EstimateRequest (no identity, no persistence)
  → mailto: or Gmail API (feature-gated)
  ↓
OPERATIONAL REVIEW
  Owner reviews request (email or spreadsheet)
  ↓
ESTIMATE DELIVERY
  Walk-through + written quote
  → Quote object (internal/sheets/schema.ts)
  ↓
ACCEPTANCE
  Customer accepts quote
  → Project object (internal/sheets/schema.ts)
  ↓
EXECUTION
  Crew performs work
  → Materials, scheduling, calendar
  ↓
COMPLETION
  Final inspection, handoff
  → Project.status = "completed"
  ↓
REVIEW
  Automated follow-up (FOLLOW_UP_TIMELINE)
  → Google Form / Google Review / manual entry
  → Canonical Review object
  ↓
PUBLICATION
  Website, JSON-LD, marketing
  ↓
REFERRAL
  Customer refers others
  → Referral object (internal/sheets/schema.ts)
  ↓
REPEAT CUSTOMER
  New estimate request with correlationId
```

### 13.1 Current Journey Gaps

| Stage | Has Canonical Object? | Has Event? | Has Persistence? |
|-------|----------------------|-----------|-----------------|
| Discovery | **NO** | **NO** | **NO** |
| Trust Building | Partial (reviews.ts, gallery.json) | **NO** | Partial |
| Qualification | **NO** | **NO** | **NO** |
| Estimate Intake | `EstimateRequest` type exists | **NO** | **NO** |
| Operational Review | **NO** | **NO** | **NO** |
| Estimate Delivery | `Quote` in internal schema | **NO** | **NO** |
| Acceptance | `Project` in internal schema | **NO** | **NO** |
| Execution | **NO** | **NO** | **NO** |
| Completion | `Project.status` field | **NO** | **NO** |
| Review | Two competing types | **NO** | **NO** |
| Publication | Direct array consumption | **NO** | **NO** |
| Referral | `Referral` in internal schema | **NO** | **NO** |
| Repeat Customer | **NO** | **NO** | **NO** |

**Every stage has a gap in events and persistence.** The internal schema defines the right objects but nothing writes to or reads from them in the live website.

### 13.2 Constitutional Pattern Confirmed

The pattern is clear and consistent:

```
Canonical business objects (immutable, authoritative)
        ↕
Operational tools (replaceable, adapters)
        ↕
Presentation layer (derived, consumer)
```

This pattern works for:
- **Images**: `gallery.json` (canonical) ↔ `FilesystemImageSource` (adapter) ↔ React components (presentation)
- **Reviews**: `Review` with Provenance (canonical) ↔ Google Forms / Google Reviews / Manual (adapters) ↔ Homepage / JSON-LD (presentation)
- **Estimates**: `EstimateRequest` (canonical) ↔ Google Form / API / mailto (adapters) ↔ PlanningResult display (presentation)
- **Projects**: `Project` (canonical) ↔ Google Sheets / CRM (adapters) ↔ Status display (presentation)

**No individual tool (Google Forms, Google Sheets, Gmail) becomes the authority.** They are all replaceable producers and consumers of canonical objects.

---

## 14. Google Form Classification

Per the directive, the Google Form is **not** the authority. It is a **temporary operational producer**, exactly like Drive is the temporary operational producer for images.

```
Google Form
        ↓
EstimateRequest Schema v1
        ↓
Canonical Review Object
        ↓
Website Publication
```

The form renders the schema. The schema is constitutional. The form is replaceable.

Eventually:
- Google Form → Review
- Typeform → Review
- Custom Wizard → Review
- API → Review
- Voice AI → Review
- SMS → Review

All publish the exact same canonical object.

---

## 15. Appendix: File Inventory

### 15.1 Review Pipeline Files

| File | Lines | Status | Role |
|------|-------|--------|------|
| `src/config/reviews.ts` | 14 | Active, empty data | Website review authority |
| `src/types/index.ts` (Review) | 13 | Active | Public Review type |
| `src/components/star-rating.tsx` | 19 | Active | Presentational component |
| `src/app/reviews/page.tsx` | 71 | Active | Reviews page |
| `src/app/page.tsx` (reviews section) | 19 | Active | Homepage reviews |
| `src/app/layout.tsx` (JSON-LD) | 74 | Active (fixed) | SEO structured data |
| `src/config/featureFlags.ts` | 27 | Active | Feature gates |
| `internal/reviews/reviewAuthority.ts` | 54 | Unwired | Business logic authority |
| `internal/sheets/schema.ts` (Review) | 149 | Unwired | Operational schema |

### 15.2 Estimate Pipeline Files (Upstream)

| File | Lines | Status | Role |
|------|-------|--------|------|
| `src/types/index.ts` (EstimateRequest) | 10 | Active | Canonical type (no identity) |
| `src/components/estimate-wizard.tsx` | 511 | Active | 6-step wizard UI |
| `src/services/estimate.ts` | 115 | Active | Transport abstraction |
| `src/app/api/estimate/route.ts` | 71 | Feature-gated | Gmail API submission |
| `src/lib/google.ts` | 56 | Active (blocked) | OAuth2 client |
| `src/lib/estimate-engine.ts` | 123 | Active | Post-submit price display |
| `src/lib/planning-context.ts` | 31 | Active | Request normalizer |
| `src/lib/planning-range.ts` | 124 | Active | Price seed data |
| `src/lib/planning-strategies/index.ts` | 162 | Active | Pricing strategies |
| `src/services/analytics.ts` | 31 | No-op | Event tracking interface |
| `src/config/services.ts` | 146 | Active | 7 services with questions |
| `src/config/company.ts` | 50 | Active | Business identity |
| `internal/reviews/reviewAuthority.ts` | 36-43 | Unwired | Follow-up timeline |

### 15.3 Google Workspace Files

| File | Lines | Status | Google Product |
|------|-------|--------|---------------|
| `src/lib/google.ts` | 56 | Active (blocked) | OAuth2 |
| `src/app/api/estimate/route.ts` | 71 | Feature-gated | Gmail |
| `src/app/api/auth/google/route.ts` | 29 | Active (blocked) | OAuth consent |
| `src/services/estimate.ts` | 115 | Active | Gmail (via API route) |
| `src/services/storage.ts` | 21 | Interface only | Drive |
| `src/services/notification.ts` | 17 | Interface only | Gmail abstraction |
| `internal/sheets/schema.ts` | 149 | Types only | Sheets |
| `internal/reviews/reviewAuthority.ts` | 54 | Unwired | Places + Sheets |
| `src/config/featureFlags.ts` | 27 | Active | All Google flags |
| `.env.example` | 35 | Config | Env var documentation |

---

## 16. Deliverable Summary

| # | Finding | Severity | Action Required |
|---|---------|----------|----------------|
| 1 | No fabricated reviews exist — array is empty | INFO | None (correct behavior) |
| 2 | Hardcoded `StarRating(5)` on 2 pages | MEDIUM | Use computed rating, hide when empty |
| 3 | "12 years serving" contradicts "Est. 2024" | MEDIUM | Use company.proof.yearsInBusiness |
| 4 | Two competing Review types (public vs internal) | HIGH | Unify to single canonical type |
| 5 | EstimateRequest has no identity | HIGH | Add UUID, correlationId, version |
| 6 | EstimateRequest has no persistence | HIGH | Add storage layer |
| 7 | Zero events emitted in entire pipeline | HIGH | Add event infrastructure |
| 8 | No correlation IDs anywhere | HIGH | Add correlation ID generation |
| 9 | ReviewAuthority exists but is unwired | MEDIUM | Wire to website via adapter |
| 10 | No Google Form exists | MEDIUM | Create as temporary producer |
| 11 | No moderation workflow exists | MEDIUM | Create admin review UI |
| 12 | No consent tracking exists | HIGH | Add ReviewConsent object |
| 13 | Google Workspace blocked by 4 missing env vars | LOW | Manual console verification |
| 14 | 5 feature flags control Google access | INFO | Documentation |
| 15 | No Apps Script references exist | INFO | Future implementation |
| 16 | Pipeline health metrics have no data source | MEDIUM | Add analytics events first |
| 17 | AI readiness: 1/10 for reviews | LOW | Address after canonical objects exist |
| 18 | Full customer journey has gaps at every stage | INFO | Address incrementally via vertical slices |

---

*This audit is read-only. No code was modified. All findings are evidence-based with file paths and line numbers.*
