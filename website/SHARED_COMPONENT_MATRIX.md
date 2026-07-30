# HPP Shared Component Matrix

**Purpose:** Single source of truth for all components, their purposes, and canonical locations  
**Status:** Planning Phase - READ ONLY  
**Based on:** FRONTEND_REORGANIZATION_PLAN.md

---

## UI Components (Atomic/Shared)

### Button
- **File:** `components/ui/button.tsx`
- **Purpose:** Premium button with magnetic effect, ripple, press animation
- **Variants:** primary, secondary, accent, outline, ghost, link
- **Sizes:** sm, md, lg
- **Status:** ✅ Canonical - No consolidation needed
- **Usage:** All CTAs, form submissions, navigation actions

### Card
- **File:** `components/ui/card.tsx`
- **Purpose:** CraftCard with light sweep effect, premium shadows
- **Components:** CraftCard (canonical), Card (legacy wrapper), Badge
- **Status:** ⚠️ Needs cleanup - Remove legacy Card wrapper, extract Badge
- **Usage:** Review cards, service cards, project cards, admin panels
- **Consolidation:** Migrate `before-after-card.tsx` to use CraftCard

### Badge
- **File:** `components/ui/card.tsx` (currently embedded)
- **Purpose:** Status badges, tags, labels
- **Status:** ⚠️ Needs extraction - Move to `components/ui/badge.tsx`
- **Usage:** Review status badges, verification badges, admin status

### Input
- **File:** `components/animated-input.tsx` (current)
- **Target:** `components/ui/input.tsx`
- **Purpose:** Animated input field with focus states
- **Status:** ⚠️ Needs move and rename
- **Usage:** Estimate wizard, contact forms, admin filters

### Empty State
- **File:** `components/placeholder-section.tsx` (current)
- **Target:** `components/ui/empty-state.tsx`
- **Purpose:** Generic empty state with icon, title, description, action
- **Variants:** gallery, service, reviews, projects, before-after, generic
- **Status:** ⚠️ Needs consolidation - Merge with `photo-placeholder.tsx`
- **Usage:** Empty galleries, empty reviews, empty projects

### Loading States
- **File:** `components/ui/loading.tsx` (NEW)
- **Purpose:** Loading spinner, skeleton loader, loading overlay
- **Status:** ❌ Missing - Needs creation
- **Usage:** Dashboard panels, data fetching, form submission

### Error State
- **File:** `components/ui/error-state.tsx` (NEW)
- **Purpose:** Error display with retry mechanism
- **Status:** ❌ Missing - Needs creation
- **Usage:** API failures, data load errors, form validation errors

### Table
- **File:** `components/ui/table.tsx` (NEW)
- **Purpose:** Generic table component for admin dashboard
- **Components:** table, table-cell, table-row, table-header
- **Status:** ❌ Missing - Needs creation
- **Usage:** Review moderation table, findings table, metrics table

### Dialog
- **File:** `components/ui/dialog.tsx` (NEW)
- **Purpose:** Modal dialog component
- **Components:** dialog, dialog-content, dialog-header, dialog-footer
- **Status:** ❌ Missing - Needs creation
- **Usage:** Confirmations, details view, form modals

### Form Components
- **File:** `components/ui/form.tsx` (NEW)
- **Purpose:** Form wrapper with validation
- **Components:** form, form-field, form-select, form-checkbox, form-radio
- **Status:** ❌ Missing - Needs creation
- **Usage:** Estimate wizard, admin filters, contact forms

### Status Chip
- **File:** `components/ui/status-chip.tsx` (NEW)
- **Purpose:** Status indicator (pending, approved, rejected)
- **Status:** ❌ Missing - Needs creation
- **Usage:** Review moderation, project status, admin health

### Progress Indicator
- **File:** `components/ui/progress-indicator.tsx` (NEW)
- **Purpose:** Progress bar, step indicator
- **Status:** ❌ Missing - Needs creation
- **Usage:** Estimate wizard steps, upload progress, task completion

### Icon
- **File:** `components/icon.tsx`
- **Purpose:** Icon wrapper for Lucide icons
- **Status:** ✅ Canonical - No consolidation needed
- **Usage:** All icon displays throughout app

### Star Rating
- **File:** `components/star-rating.tsx`
- **Purpose:** Star rating display (1-5 stars)
- **Status:** ✅ Canonical - No consolidation needed
- **Usage:** Review cards, featured reviews, admin review display

### Scroll to Top
- **File:** `components/scroll-to-top.tsx`
- **Purpose:** Scroll to top button
- **Status:** ✅ Canonical - No consolidation needed
- **Usage:** Long pages, blog posts, project details

### Theme Toggle
- **File:** `components/theme-toggle.tsx`
- **Purpose:** Dark/light theme toggle
- **Status:** ✅ Canonical - No consolidation needed
- **Usage:** Navigation header, settings

### Router Link
- **File:** `components/router-link.tsx`
- **Purpose:** Link wrapper with active states
- **Status:** ✅ Canonical - No consolidation needed
- **Usage:** Navigation, internal links

### Layout Components
- **File:** `components/section.tsx` (current)
- **Target:** `components/ui/layout/`
- **Components:** Container, Section, CraftDivider
- **Purpose:** Layout primitives for page structure
- **Status:** ⚠️ Needs move to layout/ folder
- **Usage:** All page layouts, sections

### Section Components
- **File:** `components/section.tsx` (current)
- **Target:** `components/ui/sections/`
- **Components:** SectionHeading
- **Purpose:** Section headings with eyebrow, title, description
- **Status:** ⚠️ Needs move to sections/ folder
- **Usage:** Page sections, feature sections

### CTA Section
- **File:** `components/cta-section.tsx` (current)
- **Target:** `components/ui/sections/cta-section.tsx`
- **Purpose:** Call-to-action section with buttons
- **Status:** ⚠️ Needs move to sections/ folder
- **Usage:** Page CTAs, conversion sections

### Navigation Components
- **Files:** `components/site-header.tsx`, `components/site-footer.tsx`, `components/tape-measure-nav.tsx`
- **Target:** `components/ui/navigation/`
- **Purpose:** Site navigation (header, footer, decorative)
- **Status:** ⚠️ Needs move to navigation/ folder
- **Usage:** All pages

### Feedback Components
- **File:** `components/scroll-reveal.tsx`
- **Target:** `components/ui/feedback/scroll-reveal.tsx`
- **Purpose:** Scroll reveal animation
- **Status:** ⚠️ Needs move to feedback/ folder
- **Usage:** Page sections, content reveals

---

## Feature Components

### Reviews Feature
**Location:** `components/features/reviews/`

#### Review Card
- **File:** `components/review-card.tsx` (current)
- **Target:** `components/features/reviews/components/review-card.tsx`
- **Purpose:** Display customer reviews with moderation states
- **Features:** Avatar, rating, title, body, status badges, owner response, project association, photos
- **Status:** ⚠️ Needs move to reviews feature
- **Usage:** Reviews page, featured reviews, admin moderation

#### Featured Review
- **File:** `components/featured-review.tsx` (current)
- **Target:** `components/features/reviews/components/featured-review.tsx`
- **Purpose:** Featured review display for homepage
- **Status:** ⚠️ Needs move to reviews feature
- **Usage:** Homepage featured section

#### Review Structured Data
- **File:** `components/review-structured-data.tsx` (current)
- **Target:** `components/features/reviews/components/review-structured-data.tsx`
- **Purpose:** SEO structured data for reviews
- **Status:** ⚠️ Needs move to reviews feature
- **Usage:** Reviews page, project pages

#### Reviews Filter Client
- **File:** `components/reviews-filter-client.tsx` (current)
- **Target:** `components/features/reviews/components/reviews-filter-client.tsx`
- **Purpose:** Client-side review filtering
- **Status:** ⚠️ Needs move to reviews feature
- **Usage:** Reviews page

#### Reviews Filter Server
- **File:** `components/reviews-filter.tsx` (current)
- **Target:** `components/features/reviews/components/reviews-filter-server.tsx`
- **Purpose:** Server-side review filtering
- **Status:** ⚠️ Needs move and rename to reviews feature
- **Usage:** Reviews page, API routes

### Projects Feature
**Location:** `components/features/projects/`

#### Project Card
- **File:** `components/ui/card.tsx` (NEW)
- **Target:** `components/features/projects/components/project-card.tsx`
- **Purpose:** Project card display
- **Status:** ❌ Missing - Needs creation
- **Usage:** Projects page, gallery, featured projects

#### Project Lightbox
- **File:** `components/project-lightbox.tsx` (current)
- **Target:** `components/features/projects/components/project-lightbox.tsx`
- **Purpose:** Project photo lightbox viewer
- **Status:** ⚠️ Needs move to projects feature
- **Usage:** Project pages, gallery

#### Project Photos
- **File:** `components/project-photos.tsx` (current)
- **Target:** `components/features/projects/components/project-photos.tsx`
- **Purpose:** Project photo gallery
- **Status:** ⚠️ Needs move to projects feature
- **Usage:** Project pages, gallery

#### Featured Project
- **File:** `components/project-spotlight.tsx` (current)
- **Target:** `components/features/projects/components/featured-project.tsx`
- **Purpose:** Featured project display
- **Status:** ⚠️ Needs move and rename to projects feature
- **Usage:** Homepage featured section

#### Before After Card
- **File:** `components/before-after-card.tsx` (current)
- **Target:** `components/features/projects/components/before-after-card.tsx`
- **Purpose:** Before/after transformation display
- **Status:** ⚠️ Needs move to projects feature AND migrate to use CraftCard
- **Usage:** Project pages, before/after gallery

#### Photo Mount
- **File:** `components/photo-mount.tsx` (current)
- **Target:** `components/features/projects/components/photo-mount.tsx`
- **Purpose:** Photo container with aspect ratio
- **Status:** ⚠️ Needs move to projects feature
- **Usage:** Project photos, service cards, review photos

### Services Feature
**Location:** `components/features/services/`

#### Service Card
- **File:** `components/service-card.tsx` (current)
- **Target:** `components/features/services/components/service-card.tsx`
- **Purpose:** Service display with photo-led design
- **Status:** ⚠️ Needs move to services feature
- **Usage:** Services page, homepage services section

### Estimate Feature
**Location:** `components/features/estimate/`

#### Estimate Wizard
- **File:** `components/estimate-wizard.tsx` (current)
- **Target:** `components/features/estimate/components/estimate-wizard.tsx`
- **Purpose:** Multi-step estimate form
- **Status:** ⚠️ Needs move to estimate feature
- **Usage:** Estimate page

### Admin Feature
**Location:** `components/features/admin/`

#### Dashboard Components
- **Files:** `components/app/admin/dashboard/components/*` (current)
- **Target:** `components/features/admin/components/dashboard/`
- **Components:** AuthorityCard, FindingsTable, HealthCard, RepositoryOverview, SystemStatusCard
- **Purpose:** Admin dashboard panels
- **Status:** ⚠️ Needs move to admin feature
- **Usage:** Admin dashboard

#### Review Moderation Table
- **File:** `components/app/admin/reviews/page.tsx` (current logic)
- **Target:** `components/features/admin/components/reviews/review-moderation-table.tsx` (NEW)
- **Purpose:** Review moderation interface
- **Status:** ❌ Missing - Needs extraction from page
- **Usage:** Admin reviews page

---

## Decorative Components

**Location:** `components/decorative/`

### Cedar Corner
- **File:** `components/cedar-corner.tsx`
- **Purpose:** Woodworking corner decoration
- **Status:** ✅ Canonical location - No move needed
- **Usage:** Hero sections, featured content

### Cedar Divider
- **File:** `components/cedar-divider.tsx`
- **Purpose:** Woodworking divider
- **Status:** ✅ Canonical location - No move needed
- **Usage:** Section separators

### Blueprint Grid
- **File:** `components/blueprint-grid.tsx`
- **Purpose:** Blueprint background pattern
- **Status:** ✅ Canonical location - No move needed
- **Usage:** Technical sections, estimate wizard

### Wood Grain Shimmer
- **File:** `components/wood-grain-shimmer.tsx`
- **Purpose:** Wood grain effect
- **Status:** ✅ Canonical location - No move needed
- **Usage:** Hero sections, backgrounds

### Card Light Sweep
- **File:** `components/card-light-sweep.tsx`
- **Purpose:** Card light sweep effect
- **Status:** ✅ Canonical location - No move needed
- **Usage:** CraftCard component

### Saw Line Reveal
- **File:** `components/saw-line-reveal.tsx`
- **Purpose:** Saw line animation
- **Status:** ✅ Canonical location - No move needed
- **Usage:** Section reveals, transitions

### Measuring Line
- **File:** `components/measuring-line.tsx`
- **Purpose:** Measuring tape decoration
- **Status:** ✅ Canonical location - No move needed
- **Usage:** Technical sections, measurements

### Pencil Line
- **File:** `components/pencil-line.tsx`
- **Purpose:** Pencil line decoration
- **Status:** ✅ Canonical location - No move needed
- **Usage:** Sketch-style sections, annotations

---

## Provider Components

**Location:** `components/providers/`

### Lenis Provider
- **File:** `components/lenis-provider.tsx`
- **Purpose:** Smooth scroll provider
- **Status:** ⚠️ Needs move to providers/ folder
- **Usage:** Global app wrapper

### Motion Provider
- **File:** `components/motion-provider.tsx`
- **Purpose:** Animation provider
- **Status:** ⚠️ Needs move to providers/ folder
- **Usage:** Global app wrapper

### Theme Provider
- **File:** `components/theme-provider.tsx`
- **Purpose:** Theme provider
- **Status:** ⚠️ Needs move to providers/ folder
- **Usage:** Global app wrapper

---

## Brand Components

**Location:** `components/brand/`

### Happy Brand Signature
- **File:** `components/happy-brand-signature.tsx`
- **Purpose:** Brand signature component
- **Status:** ⚠️ Needs move to brand/ folder
- **Usage:** Footer, brand sections

---

## Technical Components

### Speculation Rules
- **File:** `components/speculation-rules.tsx`
- **Purpose:** Browser speculation rules for performance
- **Status:** ✅ Canonical location - No move needed
- **Usage:** Global app wrapper (layout.tsx)

---

## Complex Components (Status Unknown)

### Job Timeline
- **File:** `components/job-timeline.tsx`
- **Purpose:** Job timeline display
- **Status:** ❓ Usage unknown - Needs verification
- **Usage:** Unknown

### Level Bubble
- **File:** `components/level-bubble.tsx`
- **Purpose:** Level indicator
- **Status:** ❓ Usage unknown - Needs verification
- **Usage:** Unknown

---

## Component Consolidation Summary

### High Priority Consolidations
1. **Cards:** Migrate `before-after-card.tsx` to use CraftCard
2. **Filters:** Move review filters to reviews feature, rename for clarity
3. **Photo components:** Move to projects feature, merge placeholders
4. **Section components:** Move to ui/layout/ and ui/sections/
5. **Navigation:** Move to ui/navigation/

### Medium Priority Consolidations
1. **Providers:** Move to providers/ folder
2. **Brand:** Move to brand/ folder
3. **Decorative:** Keep in decorative/ folder (already organized)
4. **Admin components:** Move to admin feature

### Low Priority Consolidations
1. **Naming:** Standardize naming conventions
2. **Cleanup:** Remove legacy wrappers and unused components

---

## Missing Components (To Be Created)

### UI Components (High Priority)
- `ui/table.tsx` - Generic table
- `ui/form.tsx` - Form wrapper
- `ui/dialog.tsx` - Modal dialog
- `ui/loading.tsx` - Loading states
- `ui/error-state.tsx` - Error states
- `ui/badge.tsx` - Status badge
- `ui/status-chip.tsx` - Status indicator
- `ui/progress-indicator.tsx` - Progress bar

### Feature Components (Medium Priority)
- `features/projects/components/project-card.tsx` - Project card
- `features/admin/components/reviews/review-moderation-table.tsx` - Review moderation

---

## Component Usage Tracking

### Most Used Components
1. **CraftCard** - Used in review-card, service-card, before-after-card
2. **Container/Section** - Used in all page layouts
3. **Icon** - Used throughout app
4. **Button** - Used in all CTAs
5. **ScrollReveal** - Used in page sections

### Least Used Components
1. **Job Timeline** - Usage unknown
2. **Level Bubble** - Usage unknown
3. **Before After Card** - Limited usage
4. **Project Lightbox** - Limited usage
5. **Tape Measure Nav** - Decorative only

### Components Requiring Verification
1. **Job Timeline** - Check if used anywhere
2. **Level Bubble** - Check if used anywhere
3. **Before After Card** - Verify usage before migration
4. **Project Lightbox** - Verify usage before migration

---

## Next Steps

1. **Verify unknown component usage** (Job Timeline, Level Bubble)
2. **Begin Phase 1** - Move components to feature folders
3. **Create missing UI components** (tables, forms, dialogs)
4. **Consolidate duplicate components** (cards, filters, photo components)
5. **Extract embedded components** (Badge from card.tsx)
6. **Move providers to providers/ folder**
7. **Move brand components to brand/ folder**
8. **Move navigation to ui/navigation/ folder**
9. **Move layout components to ui/layout/ folder**
10. **Update all imports** after reorganization

**Constitutional Rule:** Before creating any new component, search the repository for an existing equivalent. If one exists, extend or compose it instead. Every new file must include a short justification explaining why an existing one could not be reused.
