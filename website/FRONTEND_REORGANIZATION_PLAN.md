# HPP Frontend Reorganization Plan

**Based on:** PING Frontend Composition Sprint  
**Status:** Planning Phase - READ ONLY  
**Objective:** Organize, consolidate, compose, prepare, simplify - no new business logic

---

## Current Frontend Inventory

### Component Structure (44 components in root)

**UI Components (2):**
- `ui/button.tsx` - Premium button with magnetic effect, ripple
- `ui/card.tsx` - CraftCard with light sweep, Badge component

**Card Components (5):**
- `review-card.tsx` - Review display with moderation states
- `service-card.tsx` - Service display with photo-led design
- `before-after-card.tsx` - Transformation display
- `card-light-sweep.tsx` - Decorative card effect (used by CraftCard)
- `photo-mount.tsx` - Photo container component

**Review Components (5):**
- `featured-review.tsx` - Featured review display
- `review-structured-data.tsx` - SEO structured data
- `reviews-filter-client.tsx` - Client-side review filtering
- `reviews-filter.tsx` - Server-side review filtering

**Project Components (3):**
- `project-lightbox.tsx` - Project photo lightbox
- `project-photos.tsx` - Project photo gallery
- `project-spotlight.tsx` - Project featured display

**Navigation Components (3):**
- `site-header.tsx` - Main navigation header
- `site-footer.tsx` - Site footer
- `tape-measure-nav.tsx` - Decorative navigation element

**Section Components (3):**
- `section.tsx` - Container, Section, CraftDivider, SectionHeading
- `cta-section.tsx` - Call-to-action section
- `placeholder-section.tsx` - Intelligent placeholder states

**Photo Components (3):**
- `photo-mount.tsx` - Photo container
- `photo-placeholder.tsx` - Photo placeholder state
- `project-photos.tsx` - Project photo gallery

**Provider Components (3):**
- `lenis-provider.tsx` - Smooth scroll provider
- `motion-provider.tsx` - Animation provider
- `theme-provider.tsx` - Theme provider

**Decorative Components (8):**
- `cedar-corner.tsx` - Woodworking corner decoration
- `cedar-divider.tsx` - Woodworking divider
- `blueprint-grid.tsx` - Blueprint background
- `wood-grain-shimmer.tsx` - Wood grain effect
- `card-light-sweep.tsx` - Card light sweep effect
- `saw-line-reveal.tsx` - Saw line animation
- `measuring-line.tsx` - Measuring tape decoration
- `pencil-line.tsx` - Pencil line decoration

**Form Components (1):**
- `animated-input.tsx` - Animated input field

**Utility Components (6):**
- `icon.tsx` - Icon wrapper
- `star-rating.tsx` - Star rating display
- `scroll-reveal.tsx` - Scroll reveal animation
- `scroll-to-top.tsx` - Scroll to top button
- `router-link.tsx` - Link wrapper
- `theme-toggle.tsx` - Theme toggle button

**Complex Components (3):**
- `estimate-wizard.tsx` - Multi-step estimate form (35KB)
- `job-timeline.tsx` - Job timeline display
- `level-bubble.tsx` - Level indicator

**Brand Components (1):**
- `happy-brand-signature.tsx` - Brand signature

**Technical Components (1):**
- `speculation-rules.tsx` - Browser speculation rules

---

## Duplicate Component Analysis

### Cards - NEEDS CONSOLIDATION

**Current State:**
- `ui/card.tsx` - CraftCard (canonical), Card (legacy wrapper), Badge
- `review-card.tsx` - Uses CraftCard
- `service-card.tsx` - Uses CraftCard
- `before-after-card.tsx` - Custom card implementation (does NOT use CraftCard)

**Consolidation Plan:**
- Keep `ui/card.tsx` as canonical card component
- Migrate `before-after-card.tsx` to use CraftCard
- Remove legacy Card wrapper from `ui/card.tsx`
- Keep Badge in `ui/badge.tsx` (separate file)

### Filters - NEEDS CONSOLIDATION

**Current State:**
- `reviews-filter-client.tsx` - Client-side filtering
- `reviews-filter.tsx` - Server-side filtering

**Consolidation Plan:**
- Keep both (different purposes)
- Move to `features/reviews/components/`
- Rename to `ReviewsFilterClient.tsx` and `ReviewsFilterServer.tsx`

### Photo Components - NEEDS CONSOLIDATION

**Current State:**
- `photo-mount.tsx` - Photo container
- `photo-placeholder.tsx` - Photo placeholder
- `project-photos.tsx` - Project photo gallery

**Consolidation Plan:**
- Move to `features/projects/components/`
- Keep `photo-mount.tsx` as generic `PhotoMount`
- Move `photo-placeholder.tsx` to `ui/empty-state.tsx` (generic)
- Keep `project-photos.tsx` in projects feature

### Section Components - WELL ORGANIZED

**Current State:**
- `section.tsx` - Container, Section, CraftDivider, SectionHeading
- `cta-section.tsx` - CTA section
- `placeholder-section.tsx` - Placeholder states

**Consolidation Plan:**
- Move `section.tsx` to `ui/layout/`
- Move `cta-section.tsx` to `ui/sections/`
- Move `placeholder-section.tsx` to `ui/empty-state.tsx` (merge with photo-placeholder)

---

## Proposed Directory Structure

```
src/
├── app/                          # Next.js app router (unchanged)
│   ├── admin/
│   │   ├── dashboard/
│   │   │   ├── components/       # Admin dashboard components
│   │   │   └── page.tsx
│   │   └── reviews/
│   │       └── page.tsx
│   ├── about/
│   ├── contact/
│   ├── estimate/
│   ├── faq/
│   ├── gallery/
│   ├── our-work/
│   ├── projects/
│   ├── review/
│   ├── reviews/
│   └── services/
│
├── components/
│   ├── ui/                       # Shared UI components (atomic)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── input.tsx             # from animated-input.tsx
│   │   ├── empty-state.tsx       # from placeholder-section.tsx
│   │   ├── loading.tsx           # NEW
│   │   ├── error-state.tsx       # NEW
│   │   ├── table.tsx             # NEW
│   │   ├── dialog.tsx            # NEW
│   │   ├── form.tsx              # NEW
│   │   ├── status-chip.tsx       # NEW
│   │   ├── progress-indicator.tsx # NEW
│   │   ├── icon.tsx
│   │   ├── star-rating.tsx
│   │   ├── scroll-to-top.tsx
│   │   ├── theme-toggle.tsx
│   │   ├── router-link.tsx
│   │   ├── layout/
│   │   │   ├── container.tsx     # from section.tsx
│   │   │   ├── section.tsx       # from section.tsx
│   │   │   └── divider.tsx      # from section.tsx
│   │   ├── sections/
│   │   │   ├── cta-section.tsx
│   │   │   └── section-heading.tsx # from section.tsx
│   │   ├── navigation/
│   │   │   ├── site-header.tsx
│   │   │   ├── site-footer.tsx
│   │   │   └── tape-measure-nav.tsx
│   │   └── feedback/
│   │       └── scroll-reveal.tsx
│
│   ├── features/                 # Feature-specific components
│   │   ├── reviews/
│   │   │   ├── components/
│   │   │   │   ├── review-card.tsx
│   │   │   │   ├── featured-review.tsx
│   │   │   │   ├── review-structured-data.tsx
│   │   │   │   ├── reviews-filter-client.tsx
│   │   │   │   └── reviews-filter-server.tsx
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── constants/
│   │   ├── projects/
│   │   │   ├── components/
│   │   │   │   ├── project-card.tsx      # NEW
│   │   │   │   ├── project-lightbox.tsx
│   │   │   │   ├── project-photos.tsx
│   │   │   │   ├── project-spotlight.tsx
│   │   │   │   ├── before-after-card.tsx
│   │   │   │   └── photo-mount.tsx
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── constants/
│   │   ├── services/
│   │   │   ├── components/
│   │   │   │   └── service-card.tsx
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── constants/
│   │   ├── estimate/
│   │   │   ├── components/
│   │   │   │   └── estimate-wizard.tsx
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── constants/
│   │   └── admin/
│   │       ├── components/
│   │       │   ├── dashboard/
│   │       │   │   ├── AuthorityCard.tsx
│   │       │   │   ├── FindingsTable.tsx
│   │       │   │   ├── HealthCard.tsx
│   │       │   │   ├── RepositoryOverview.tsx
│   │       │   │   └── SystemStatusCard.tsx
│   │       │   └── reviews/
│   │       │       └── ReviewModerationTable.tsx # NEW
│   │       ├── hooks/
│   │       ├── services/
│   │       ├── types/
│   │       └── constants/
│
│   ├── decorative/               # Decorative woodworking elements
│   │   ├── cedar-corner.tsx
│   │   ├── cedar-divider.tsx
│   │   ├── blueprint-grid.tsx
│   │   ├── wood-grain-shimmer.tsx
│   │   ├── card-light-sweep.tsx
│   │   ├── saw-line-reveal.tsx
│   │   ├── measuring-line.tsx
│   │   └── pencil-line.tsx
│
│   ├── providers/                # Context providers
│   │   ├── lenis-provider.tsx
│   │   ├── motion-provider.tsx
│   │   └── theme-provider.tsx
│
│   └── brand/                    # Brand-specific components
│       └── happy-brand-signature.tsx
│
├── lib/                          # Business logic (unchanged)
│   ├── analysis.ts
│   ├── authority-loader.ts
│   ├── before-after.ts
│   ├── brand.ts
│   ├── company.ts
│   ├── estimate-engine.ts
│   ├── faq.ts
│   ├── findings.ts
│   ├── galleries.ts
│   ├── google-config-diagnostic.ts
│   ├── google-sheets.ts
│   ├── google.ts
│   ├── health-rules.ts
│   ├── infrastructure/
│   │   ├── audit.ts
│   │   ├── auth-manager.ts
│   │   └── controller.ts
│   ├── media.ts
│   ├── metrics.ts
│   ├── navigation.ts
│   ├── oauth.ts
│   ├── pipeline/
│   │   └── index.ts
│   ├── planning-context.ts
│   ├── planning-range.ts
│   ├── planning-strategies/
│   ├── projects.ts
│   ├── registries.ts
│   ├── reports.ts
│   ├── reviews.ts
│   ├── sentiment/
│   │   ├── audit-trail.ts
│   │   ├── classifier-provider.ts
│   │   ├── classifier.ts
│   │   ├── county-suggester.ts
│   │   ├── duplicate-detector.ts
│   │   ├── metadata-extractor.ts
│   │   ├── normalizer.ts
│   │   ├── project-suggester.ts
│   │   ├── quality-scorer.ts
│   │   ├── service-suggester.ts
│   │   └── tag-suggester.ts
│   ├── system-status.ts
│   ├── utils.ts
│   ├── validation-engine.ts
│   └── wizard-persistence.ts
│
├── motion/                       # Motion primitives (already organized)
│   ├── buttons.ts
│   ├── cards.ts
│   ├── fade.ts
│   ├── hero.ts
│   ├── hover.ts
│   ├── index.ts
│   ├── magnetic.ts
│   ├── motionTokens.ts
│   ├── pageTransition.ts
│   ├── parallax.ts
│   ├── reveal.ts
│   ├── stagger.ts
│   └── typography.ts
│
├── types/                        # TypeScript types (unchanged)
│   ├── before-after.ts
│   ├── brand.ts
│   ├── company.ts
│   ├── faq.ts
│   ├── index.ts
│   ├── media.ts
│   ├── navigation.ts
│   ├── oauth.ts
│   ├── projects.ts
│   ├── registries.ts
│   └── reviews.ts
│
├── config/                       # Configuration (unchanged)
│   ├── before-after.v1.json
│   ├── brand.v1.json
│   ├── cities.v1.json
│   ├── company.v1.json
│   ├── faq.v1.json
│   ├── feature-flags.ts
│   ├── featureFlags.ts
│   ├── gallery-presets.v1.json
│   ├── gallery.json
│   ├── manifest.v1.json
│   ├── materials.v1.json
│   ├── media.v1.json
│   ├── navigation.v1.json
│   ├── oauth.v1.json
│   ├── projects.v1.json
│   ├── reviews.v1.json
│   ├── seo.ts
│   └── services.v1.json
│
├── services/                     # External service adapters (unchanged)
│   ├── analytics.ts
│   ├── company.ts
│   ├── estimate.ts
│   ├── notification.ts
│   └── storage.ts
│
├── hooks/                        # Shared hooks (NEW)
│   └── index.ts
│
└── adapters/                     # Data adapter layer (NEW)
    ├── review-adapter.ts
    ├── project-adapter.ts
    ├── service-adapter.ts
    ├── estimate-adapter.ts
    └── admin-adapter.ts
```

---

## Missing UI Components (Priority: Medium)

### Tables
- `ui/table.tsx` - Generic table component for admin dashboard
- `ui/table-cell.tsx` - Table cell variants
- `ui/table-row.tsx` - Table row variants
- `ui/table-header.tsx` - Table header

### Forms
- `ui/form.tsx` - Form wrapper with validation
- `ui/form-field.tsx` - Form field with label and error
- `ui/form-select.tsx` - Select dropdown
- `ui/form-checkbox.tsx` - Checkbox input
- `ui/form-radio.tsx` - Radio button group

### Dialogs
- `ui/dialog.tsx` - Modal dialog component
- `ui/dialog-content.tsx` - Dialog content
- `ui/dialog-header.tsx` - Dialog header
- `ui/dialog-footer.tsx` - Dialog footer

### Loading States
- `ui/loading.tsx` - Loading spinner
- `ui/skeleton.tsx` - Skeleton loader
- `ui/loading-overlay.tsx` - Full-page loading overlay

### Error States
- `ui/error-state.tsx` - Error display component
- `ui/error-boundary.tsx` - React error boundary

### Status Indicators
- `ui/status-chip.tsx` - Status badge (pending, approved, rejected)
- `ui/progress-indicator.tsx` - Progress bar
- `ui/badge.tsx` - Generic badge (extract from card.tsx)

---

## Data Adapter Layer (Priority: Medium)

### Purpose
Create interfaces that accept mock data today, but will be replaced by API adapters later. UI never changes.

### Proposed Adapters

```typescript
// adapters/review-adapter.ts
export interface ReviewAdapter {
  getReviews(filter?: ReviewFilter): Promise<Review[]>;
  getReviewById(id: string): Promise<Review>;
  approveReview(id: string): Promise<void>;
  rejectReview(id: string, reason: string): Promise<void>;
  featureReview(id: string): Promise<void>;
}

// adapters/project-adapter.ts
export interface ProjectAdapter {
  getProjects(filter?: ProjectFilter): Promise<Project[]>;
  getProjectById(id: string): Promise<Project>;
  getFeaturedProjects(): Promise<Project[]>;
}

// adapters/service-adapter.ts
export interface ServiceAdapter {
  getServices(): Promise<Service[]>;
  getServiceBySlug(slug: string): Promise<Service>;
}

// adapters/estimate-adapter.ts
export interface EstimateAdapter {
  submitEstimate(data: EstimateData): Promise<Estimate>;
  getEstimateById(id: string): Promise<Estimate>;
}

// adapters/admin-adapter.ts
export interface AdminAdapter {
  getMetrics(): Promise<Metrics>;
  getSystemStatus(): Promise<SystemStatus>;
  getFindings(): Promise<Finding[]>;
}
```

### Implementation Strategy
1. Create adapter interfaces with mock implementations
2. UI components consume adapters via dependency injection
3. Backend team replaces mock implementations with real API calls
4. UI components remain unchanged

---

## Dashboard Skeleton (Priority: Medium)

### Required Panels
- Reviews (moderation queue)
- Projects (overview)
- Metrics (health, authorities)
- System Status
- Findings (audit results)

### Panel States
Each panel must support:
- **Loading:** Skeleton loader
- **Error:** Error state with retry
- **Empty:** Empty state with call-to-action
- **Data:** Actual data display

### Proposed Structure
```
features/admin/components/
├── dashboard/
│   ├── DashboardShell.tsx       # Main dashboard layout
│   ├── DashboardPanel.tsx       # Generic panel wrapper
│   ├── ReviewsPanel.tsx         # Reviews moderation
│   ├── ProjectsPanel.tsx        # Projects overview
│   ├── MetricsPanel.tsx         # Health metrics
│   ├── SystemStatusPanel.tsx     # System status
│   └── FindingsPanel.tsx         # Audit findings
```

---

## Navigation Consolidation (Priority: Medium)

### Current State
- `site-header.tsx` - Main navigation
- `site-footer.tsx` - Footer navigation
- `tape-measure-nav.tsx` - Decorative navigation

### Consolidation Plan
1. Move all navigation to `components/ui/navigation/`
2. Create single `NavigationShell.tsx` that wraps all navigation
3. Ensure no duplicate menus or layouts
4. Single shell for entire application

### Proposed Structure
```
components/ui/navigation/
├── NavigationShell.tsx          # Single navigation wrapper
├── SiteHeader.tsx               # Main header
├── SiteFooter.tsx               # Main footer
├── TapeMeasureNav.tsx           # Decorative element
├── NavItem.tsx                  # Navigation item
├── NavMenu.tsx                  # Navigation menu
└── MobileMenu.tsx               # Mobile navigation
```

---

## Naming Audit (Priority: Low)

### Current Inconsistencies
- `reviews-filter.tsx` vs `reviews-filter-client.tsx` (inconsistent naming)
- `before-after-card.tsx` vs `service-card.tsx` (inconsistent pattern)
- `project-spotlight.tsx` vs `featured-review.tsx` (inconsistent pattern)

### Standardized Vocabulary
- **Card:** Always `*-card.tsx`
- **Filter:** Always `*-filter.tsx` (client/server distinction in file)
- **Featured:** Always `featured-*.tsx`
- **Spotlight:** Change to `featured-*.tsx` for consistency
- **Wizard:** Always `*-wizard.tsx`
- **Timeline:** Always `*-timeline.tsx`

### Proposed Renames
- `project-spotlight.tsx` → `featured-project.tsx`
- `reviews-filter.tsx` → `reviews-filter-server.tsx`
- `reviews-filter-client.tsx` → `reviews-filter-client.tsx` (keep)

---

## Files Safe to Delete (Priority: Low)

### Candidates for Deletion
1. **Legacy wrappers:**
   - `ui/card.tsx` - Remove `Card` wrapper (keep `CraftCard`)
   - `reviews-filter.tsx` - After renaming to `reviews-filter-server.tsx`

2. **Duplicate functionality:**
   - `placeholder-section.tsx` - After merging into `ui/empty-state.tsx`
   - `photo-placeholder.tsx` - After merging into `ui/empty-state.tsx`

3. **Unused components:**
   - `job-timeline.tsx` - Check if used anywhere
   - `level-bubble.tsx` - Check if used anywhere

### DO NOT DELETE YET
Only identify candidates. Deletion requires verification of usage.

---

## Implementation Priority

### Phase 1: Foundation (High Priority)
1. Create directory structure
2. Move components to feature folders
3. Consolidate duplicate components
4. Create shared component matrix

### Phase 2: Missing UI (Medium Priority)
1. Create missing UI components (tables, forms, dialogs)
2. Create loading/error/empty states
3. Create data adapter layer interfaces

### Phase 3: Dashboard (Medium Priority)
1. Build dashboard skeleton
2. Create admin feature module
3. Consolidate navigation

### Phase 4: Cleanup (Low Priority)
1. Perform naming audit
2. Identify files safe to delete
3. Update all imports

---

## Success Criteria

Frontend becomes:
- **Organized:** Clear directory structure, no scattered components
- **Predictable:** Consistent naming, standard patterns
- **Composable:** Reusable components, feature modules
- **Reusable:** Single source of truth for each component type
- **Backend-agnostic:** Data adapter layer enables backend swap without UI changes

When the backend team finishes wiring events, Neo4j, Qdrant, Ollama, and connectors, they should only replace provider implementations. No UI rewrite should be necessary.

---

## Next Steps

1. **Review this plan** with user approval
2. **Begin Phase 1** - Create directory structure and move components
3. **Create shared component matrix** document
4. **Implement missing UI components**
5. **Build dashboard skeleton**
6. **Create data adapter layer**
7. **Consolidate navigation**
8. **Perform naming audit**
9. **Identify cleanup candidates**

**Constitutional Rule:** Before creating any new component, search the repository for an existing equivalent. If one exists, extend or compose it instead. Every new file must include a short justification explaining why an existing one could not be reused.
