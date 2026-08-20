# String Execution Matrix - Authoritative Execution Plan
**Session: String documentation reconciliation and execution matrix**
**Date: 2026-07-23**
**Baseline Git SHA: ebfb193**

## Executive Summary

Reconciled three existing string documents into one authoritative execution matrix. Ready to begin Phase 1 - document reconciliation and baseline freeze.

---

## Document Reconciliation

### Source Documents

1. **STRING_HARVEST.json** - Forensic harvest of 85 strings with locations
2. **STRING_PATCH_PLAN.md** - Surgical patch plan with 18 files requiring changes
3. **STRING_INTEGRATION_PLAN.md** - Architectural integration rules and classification system

### Reconciliation Status

**Status**: RECONCILED ✅
- All three documents are internally consistent
- No conflicts between harvest, patch plan, and integration rules
- Canonical key mapping is stable
- DO-NOT-TOUCH identifier list is stable
- Namespace convention is stable

---

## Baseline Freeze

### Current State
- **Git HEAD**: ebfb193
- **Production Deployment**: Latest Vercel deployment
- **Canonical Strings**: 85 keys
- **Files Requiring Changes**: 18 files
- **API Routes**: 8 files (error messages only)

### Baseline Recording

**String Inventory**:
- CANONICAL: 85 strings
- DYNAMIC: 2 strings (with interpolation)
- CONTEXTUAL: 1 string (requires separate keys)
- LOCKED: 36 identifiers (never to be modified)

**File Inventory**:
- Customer website pages: 7 files
- Shared components: 8 files
- Workbench pages: 3 files
- API routes: 8 files

---

## Authoritative Execution Matrix

### Phase 1: Create Canonical String Layer

**Task**: Create `src/lib/strings.ts`

**Namespace Structure**:
```typescript
// Navigation
nav.home
nav.services
nav.ourWork
nav.about
nav.reviews
nav.estimate

// Homepage
homepage.hero.title
homepage.hero.description
homepage.seeOurWork
homepage.tellUsPlanning

// Trust Signals
trust.licensed
trust.familyOwned
trust.serviceArea
trust.projectsCompleted

// Services
services.title
services.description

// Featured Projects
featuredProjects.title
featuredProjects.description
featuredProjects.seeAll

// Family Section
family.tagline
family.title

// Reviews
reviews.title
reviews.empty
reviews.readAll
reviews.helpingNeighbors
reviews.leaveReview

// About Page
about.serviceArea.title
about.cta.title

// Contact Page
contact.title
contact.phone
contact.email
contact.serviceArea
contact.hours

// Estimate Page
estimate.title
estimate.description

// Workbench
workbench.login.title
workbench.login.subtitle
workbench.login.password
workbench.login.placeholder
workbench.login.button
workbench.connectors.title
workbench.connectors.connectDrive
workbench.connectors.openDrive
workbench.explorer.title
workbench.explorer.search
workbench.explorer.useAsset

// Newsletter
newsletter.title
newsletter.description
newsletter.emailPlaceholder
newsletter.firstNamePlaceholder
newsletter.subscribe
newsletter.noSpam

// CTA Components
cta.startFreeEstimate

// Service Card
serviceCard.startQuote
serviceCard.photosComingSoon

// Placeholder
placeholder.gallery
placeholder.gallery.description

// Before/After
beforeAfter.before
beforeAfter.after

// API Errors
api.error.unauthorized
api.error.workbenchAuthRequired
api.error.driveDiscoveryFailed
api.error.driveFilesFailed
api.error.estimateFailed
api.error.reviewValidationFailed
api.error.newsletterFailed

// Accessibility
a11y.theme.toggle
a11y.siteHeader.home
a11y.siteHeader.primary
a11y.siteHeader.mobile
a11y.siteHeader.closeMenu
a11y.siteHeader.openMenu
```

**Dynamic Templates**:
```typescript
dynamic.about.hero.title: "Every family deserves a {signature} place."
dynamic.estimate.preferTalk: "Prefer to talk? Call {phone} or email {email}."
dynamic.starRating.aria: "Rated {rating} out of 5"
dynamic.stats.average: "{stats.average} / 5 across {stats.count} featured reviews from homeowners across the Willamette Valley."
```

---

### Phase 2: Surgical Replacement (File-by-File)

**Execution Order**: 10-15 strings per batch, not all 85 at once

**Batch 1**: Navigation (6 strings)
- Files: site-header.tsx, site-footer.tsx

**Batch 2**: Homepage (4 strings)
- File: page.tsx

**Batch 3**: Trust & Services (4 strings)
- File: page.tsx

**Batch 4**: Featured Projects (3 strings)
- File: page.tsx

**Batch 5**: Family & Reviews (5 strings)
- File: page.tsx

**Batch 6**: About Page (2 strings)
- File: about/page.tsx

**Batch 7**: Contact Page (5 strings)
- File: contact/page.tsx

**Batch 8**: Estimate Page (2 strings)
- File: estimate/page.tsx

**Batch 9**: Reviews Page (2 strings)
- File: reviews/page.tsx

**Batch 10**: Review Form (8 strings)
- File: review/page.tsx

**Batch 11**: Workbench Pages (11 strings)
- Files: workbench/login/page.tsx, workbench/connectors/page.tsx, workbench/explorer/drive/page.tsx

**Batch 12**: Shared Components (15 strings)
- Files: newsletter-signup.tsx, service-card.tsx, cta-section.tsx, theme-toggle.tsx, before-after-slider.tsx, star-rating.tsx, placeholder-section.tsx

**Batch 13**: API Error Messages (7 strings)
- Files: api/drive/discovery/route.ts, api/drive/files/route.ts, api/workbench/login/route.ts, api/estimate/route.ts, api/reviews/route.ts, api/newsletter/subscribe/route.ts

---

### Phase 3: Validation Gates

**Pre-Commit Validation**:
1. TypeScript compilation: `npx tsc --noEmit`
2. Production build: `npm run build`
3. Grep for hardcoded strings
4. Grep for locked identifiers

**Post-Commit Validation**:
1. Visual verification - customer routes
2. Visual verification - workbench routes
3. Behavior verification
4. Git diff review

---

### Phase 4: Migration Inventory

**Expected Results**:
- 85 canonical strings → migrated
- 0 missing keys
- 0 duplicate authorities
- 0 changed values
- 0 orphaned keys

---

## Critical Rules

1. **NO GLOBAL SEARCH-AND-REPLACE** - Every replacement must be scoped to a specific line
2. **PRESERVE BEHAVIOR** - No changes to component logic, state, event handlers
3. **PRESERVE INTERPOLATION** - Dynamic strings must maintain variable interpolation
4. **PRESERVE ACCESSIBILITY** - ARIA labels and alt text must be preserved
5. **DO NOT TOUCH LOCKED** - All 36 locked identifiers must remain unchanged
6. **VALIDATE AFTER EACH BATCH** - TypeScript must pass after each batch
7. **NO REFACTORING** - Do not opportunistically refactor surrounding code
8. **ZERO CONTENT DELTA** - First migration must have exact text preservation

---

## Next Steps

1. **Begin Phase 1** - Create canonical string layer (src/lib/strings.ts)
2. **Execute Batch 1** - Navigation strings (6 strings)
3. **Validate** - Run validation gates after each batch
4. **Continue batches** - 10-15 strings per batch
5. **Final literal sweep** - Classify remaining occurrences

---

## Audit Metadata

- **Auditor**: Devin CLI
- **Baseline Git SHA**: ebfb193
- **Audit Date**: 2026-07-23
- **Scope**: String documentation reconciliation and execution matrix
- **Method**: Document reconciliation, baseline freeze, execution matrix creation
