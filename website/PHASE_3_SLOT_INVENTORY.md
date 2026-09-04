# PHASE 3: Complete Slot Inventory Before Migration

## Executive Summary
**STATUS:** ⚠️ PRODUCTION STATE UNKNOWN - MUST INVENTORY BEFORE MIGRATION

Before removing any static authorities, we must inventory every currently rendered media relationship to ensure we don't break production.

---

## Complete Slot Inventory

### Brand Slots

| Slot ID | Current Authority | Current Media ID | Static File | Runtime Assignment | KV Assignment Exists | PublishedMediaAsset | Public Gate Valid | Consumer | Risk |
|---------|------------------|-----------------|-------------|-------------------|---------------------|-------------------|------------------|----------|------|
| homepage-hero | Dual path (brand.v1.json + KV) | brand-hero | media.v1.json | service-card-assignment:brand-hero-background | UNKNOWN | UNKNOWN | UNKNOWN | page.tsx, layout.tsx | HIGH |
| homepage-owner-portrait | Dual path (brand.v1.json + KV) | brand-portrait | media.v1.json | service-card-assignment:brand-portrait-homepage | UNKNOWN | UNKNOWN | UNKNOWN | page.tsx, about/page.tsx | HIGH |
| header-logo | Hardcoded | /brand/logo.png | public/brand/logo.png | NONE | NO | N/A | N/A | site-header.tsx | MEDIUM |
| footer-logo | Hardcoded | /brand/logo.png | public/brand/logo.png | NONE | NO | N/A | N/A | site-footer.tsx | MEDIUM |
| favicon | Hardcoded | /brand/favicon.svg | public/brand/favicon.svg | NONE | NO | N/A | N/A | layout.tsx | LOW |
| og-default-image | Hardcoded | /images/projects/featured/featured-480.webp | public/images/projects/featured/featured-480.webp | NONE | NO | N/A | N/A | seo.ts, layout.tsx | LOW |

### Service Card Slots

| Slot ID | Current Authority | Current Media ID | Static File | Runtime Assignment | KV Assignment Exists | PublishedMediaAsset | Public Gate Valid | Consumer | Risk |
|---------|------------------|-----------------|-------------|-------------------|---------------------|-------------------|------------------|----------|------|
| service-card:fences | KV assignment | service-card-assignment:fences | N/A | service-card-assignment:fences | UNKNOWN | UNKNOWN | UNKNOWN | page.tsx | MEDIUM |
| service-card:painting | KV assignment | service-card-assignment:painting | N/A | service-card-assignment:painting | UNKNOWN | UNKNOWN | UNKNOWN | page.tsx | MEDIUM |
| service-card:drywall-repair | KV assignment | service-card-assignment:drywall-repair | N/A | service-card-assignment:drywall-repair | UNKNOWN | UNKNOWN | UNKNOWN | page.tsx | MEDIUM |
| service-card:shed-construction | KV assignment | service-card-assignment:shed-construction | N/A | service-card-assignment:shed-construction | UNKNOWN | UNKNOWN | UNKNOWN | page.tsx | MEDIUM |
| service-card:siding-repair | KV assignment | service-card-assignment:siding-repair | N/A | service-card-assignment:siding-repair | UNKNOWN | UNKNOWN | UNKNOWN | page.tsx | MEDIUM |
| service-card:door-replacement | KV assignment | service-card-assignment:door-replacement | N/A | service-card-assignment:door-replacement | UNKNOWN | UNKNOWN | UNKNOWN | page.tsx | MEDIUM |
| service-card:flooring | KV assignment | service-card-assignment:flooring | N/A | service-card-assignment:flooring | UNKNOWN | UNKNOWN | UNKNOWN | page.tsx | MEDIUM |
| service-card:window-refinishing | KV assignment | service-card-assignment:window-refinishing | N/A | service-card-assignment:window-refinishing | UNKNOWN | UNKNOWN | UNKNOWN | page.tsx | MEDIUM |

### Project Slots (Static JSON Authority)

| Slot ID | Current Authority | Current Media ID | Static File | Runtime Assignment | KV Assignment Exists | PublishedMediaAsset | Public Gate Valid | Consumer | Risk |
|---------|------------------|-----------------|-------------|-------------------|---------------------|-------------------|------------------|----------|------|
| project:fences-001:hero | projects.v1.json | fences-001-hero | media.v1.json | NONE | NO | UNKNOWN | UNKNOWN | page.tsx, projects/[slug]/page.tsx | HIGH |
| project:fences-001:before | projects.v1.json | fences-001-before | media.v1.json | NONE | NO | UNKNOWN | UNKNOWN | page.tsx, projects/[slug]/page.tsx | HIGH |
| project:fences-001:after | projects.v1.json | fences-001-after | media.v1.json | NONE | NO | UNKNOWN | UNKNOWN | page.tsx, projects/[slug]/page.tsx | HIGH |
| project:fences-001:gallery[0] | projects.v1.json | fences-001-matching | media.v1.json | NONE | NO | UNKNOWN | UNKNOWN | projects/[slug]/page.tsx | HIGH |
| project:fences-001:gallery[1] | projects.v1.json | fences-001-installation | media.v1.json | NONE | NO | UNKNOWN | UNKNOWN | projects/[slug]/page.tsx | HIGH |
| project:fences-001:gallery[2] | projects.v1.json | fences-001-detail | media.v1.json | NONE | NO | UNKNOWN | UNKNOWN | projects/[slug]/page.tsx | HIGH |
| project:fences-001:gallery[3] | projects.v1.json | fences-001-finished | media.v1.json | NONE | NO | UNKNOWN | UNKNOWN | projects/[slug]/page.tsx | HIGH |
| project:fences-001:gallery[4] | projects.v1.json | fences-001-progress | media.v1.json | NONE | NO | UNKNOWN | UNKNOWN | projects/[slug]/page.tsx | HIGH |
| project:fences-001:gallery[5] | projects.v1.json | fences-001-gate | media.v1.json | NONE | NO | UNKNOWN | UNKNOWN | projects/[slug]/page.tsx | HIGH |
| project:pergolas-001:hero | projects.v1.json | pergolas-001-hero | media.v1.json | NONE | NO | UNKNOWN | UNKNOWN | projects/[slug]/page.tsx | HIGH |
| project:pergolas-001:before | projects.v1.json | pergolas-001-before | media.v1.json | NONE | NO | UNKNOWN | UNKNOWN | projects/[slug]/page.tsx | HIGH |
| project:pergolas-001:after | projects.v1.json | pergolas-001-after | media.v1.json | NONE | NO | UNKNOWN | UNKNOWN | projects/[slug]/page.tsx | HIGH |
| project:pergolas-001:gallery[0] | projects.v1.json | pergolas-001-construction | media.v1.json | NONE | NO | UNKNOWN | UNKNOWN | projects/[slug]/page.tsx | HIGH |
| project:pergolas-001:gallery[1] | projects.v1.json | pergolas-001-steel-frame | media.v1.json | NONE | NO | UNKNOWN | UNKNOWN | projects/[slug]/page.tsx | HIGH |
| project:pergolas-001:gallery[2] | projects.v1.json | pergolas-001-finished | media.v1.json | NONE | NO | UNKNOWN | UNKNOWN | projects/[slug]/page.tsx | HIGH |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |

**Note:** projects.v1.json contains multiple projects, each with hero, before, after, and gallery. The above is a sample - full inventory required.

---

## Static Helper Usage Analysis

### Media Authority Static Helpers (media.ts)

| Helper | Callers (Production) | Callers (Test) | Callers (Workbench) | Classification | Action Required |
|--------|---------------------|---------------|-------------------|----------------|-----------------|
| getProjectMedia() | NONE | test-media-authority.ts, media-authority-constitutional-test.ts | workbench/preview/main-media.ts (duplicate) | EVIDENCE/TEST | Remove duplicate, keep as test helper |
| getProjectHero() | NONE | test-media-authority.ts, media-authority-constitutional-test.ts | workbench/preview/main-media.ts (duplicate) | EVIDENCE/TEST | Remove duplicate, keep as test helper |
| getProjectThumbnail() | NONE | NONE | workbench/preview/main-media.ts (duplicate) | DEAD | Remove entirely |
| getProjectBeforeAfter() | NONE | NONE | workbench/preview/main-media.ts (duplicate) | DEAD | Remove entirely |
| getProjectMediaByRole() | NONE | NONE | workbench/preview/main-media.ts (duplicate) | DEAD | Remove entirely |
| getFeaturedServiceMedia() | NONE | test-media-authority.ts | NONE | DEAD | Remove entirely |

**Finding:** Static helpers are NOT used in production rendering. They are only used in tests and a duplicate Workbench preview file. This is safe to remove without affecting production.

---

## Workbench Preview Duplicate Analysis

**File:** `src/app/workbench/preview/main-media.ts`
**Status:** DUPLICATE of `src/lib/media.ts` static helpers
**Classification:** DEAD CODE
**Action Required:** Remove entire file, it's not imported anywhere

---

## Hardcoded Logo Path Inventory

| Location | Path | Consumer | Context | Required Action |
|----------|------|----------|---------|-----------------|
| site-header.tsx:92 | /brand/logo.png | Header logo | All pages | Create runtime assignment |
| site-footer.tsx:22 | /brand/logo.png | Footer logo | All pages | Create runtime assignment |
| about/page.tsx:46 | /brand/logo.png | About page logo | About page | Create runtime assignment |
| reviews/page.tsx:29 | /brand/logo.png | Reviews page logo | Reviews page | Create runtime assignment |
| newsletter/thank-you/page.tsx:25 | /brand/logo.png | Thank you page logo | Thank you page | Create runtime assignment |
| estimate/page.tsx:25 | /brand/logo.png | Estimate page logo | Estimate page | Create runtime assignment |
| contact/page.tsx:26 | /brand/logo.png | Contact page logo | Contact page | Create runtime assignment |
| page.tsx:41 | /brand/logo.png (fallback) | OG image fallback | Homepage OG | Create runtime assignment |
| layout.tsx:55-56 | /brand/logo.png (fallback) | OG/logo fallback | Site-wide OG/logo | Create runtime assignment |
| workbench/preview/main-page.tsx:34,64,112 | /brand/logo.png (fallback) | Workbench preview | Workbench preview | Create runtime assignment |
| not-found.tsx:13 | /brand/logo.png | 404 page logo | 404 page | Create runtime assignment |

**Total:** 12 hardcoded logo references across the application

---

## Brand Authority Dual Path Analysis

### Current Implementation (brand.ts)

**getHomepageHero():**
1. Loads brand.v1.json static manifest
2. Checks KV assignment: `service-card-assignment:brand-hero-background` OR `service-card-assignment:brand-hero`
3. If assignment exists → resolves through public media gate
4. If assignment missing → returns null mediaId (fail closed)
5. Does NOT fall back to static mediaId from brand.v1.json

**getOwnerPortrait():**
1. Loads brand.v1.json static manifest
2. Checks KV assignment: `service-card-assignment:brand-portrait-homepage` OR `service-card-assignment:brand-portrait-about` OR `service-card-assignment:brand-portrait`
3. If assignment exists → resolves through public media gate
4. If assignment missing → returns null mediaId (fail closed)
5. Does NOT fall back to static mediaId from brand.v1.json

**Finding:** The static brand.v1.json is loaded but its mediaId values are NOT used as fallbacks. The dual path is actually:
- Static manifest provides alt text and metadata
- Runtime assignment provides the actual mediaId

This is **NOT a competing authority** in the traditional sense - it's metadata (static) + mediaId (runtime). However, the static mediaId in brand.v1.json is unused and should be removed to prevent confusion.

---

## Project Authority Static JSON Analysis

### Current Implementation (projects.ts)

**getProjectWithResolvedMedia():**
1. Loads project from projects.v1.json
2. Extracts media IDs from project.media.hero, project.media.before, project.media.after, project.media.gallery
3. Resolves each mediaId through KV via `resolvePublicMedia()`
4. Returns project with resolved Media objects
5. No fallback to static manifest

**Finding:** Project media IDs come from static projects.v1.json, but resolution goes through KV/public media gate. This IS a competing authority because the mediaId itself is static.

**Migration Required:** Move project media IDs to runtime assignments scoped to projects.

---

## Assignment Model Design

### Current Assignment Schema (assignment-store.ts)

```typescript
interface ServiceCardAssignment {
  serviceSlug: string;
  mediaId: string;
  updatedAt: string;
  source: 'workbench';
  revision?: number;
}
```

**Namespace:** `service-card-assignment:{serviceSlug}`

### Required Extension for Project/Brand/Logo Slots

Option 1: Extend existing schema with slot type
```typescript
interface MediaAssignment {
  slotType: 'service' | 'project' | 'brand' | 'logo';
  subjectId: string; // serviceSlug, projectId, 'homepage', 'header', 'footer'
  slotName: string; // 'card', 'hero', 'before', 'after', 'gallery[N]', 'background', 'portrait'
  mediaId: string;
  updatedAt: string;
  source: 'workbench';
  revision?: number;
}
```

**Namespace:** `media-assignment:{slotType}:{subjectId}:{slotName}`

Option 2: Keep service-card-assignment, create separate assignment stores
- `project-media-assignment:{projectId}:{slotName}`
- `brand-assignment:{slotName}`
- `logo-assignment:{location}`

**Recommendation:** Option 1 - unified assignment model prevents namespace proliferation

---

## Critical Unknowns Before Migration

1. **Do brand-hero and brand-portrait KV assignments currently exist?**
   - Must check production KV state
   - If NO → must backfill before removing static manifest lookup

2. **Do project media KV assignments currently exist?**
   - Must check production KV state
   - If NO → must backfill before removing projects.v1.json media IDs

3. **Do the media IDs in media.v1.json resolve to valid PublishedMediaAsset in KV?**
   - Must verify each mediaId
   - If NO → must materialize before migration

4. **What is the actual currently-rendered hero image in production?**
   - If KV assignment exists → use that
   - If KV assignment missing → currently shows nothing (fail closed)
   - Need to determine if this is intentional or a regression

---

## Immediate Next Steps

### STEP 1: Check Production KV State
- Query all service-card-assignment keys
- Query all brand-hero and brand-portrait assignments
- Determine if assignments exist and resolve correctly

### STEP 2: Verify Media Assets in KV
- For each mediaId in media.v1.json, check if PublishedMediaAsset exists in KV
- Verify public media gate accepts each asset
- Identify missing or invalid assets

### STEP 3: Design Unified Assignment Schema
- Extend assignment-store.ts to support project/brand/logo slots
- Implement namespace: `media-assignment:{slotType}:{subjectId}:{slotName}`

### STEP 4: Backfill Missing Assignments
- Create assignments for brand-hero, brand-portrait if missing
- Create assignments for project media (scoped to projects)
- Create assignments for logo slots

### STEP 5: Verify Backfilled Assignments
- Resolve each assignment through public media gate
- Verify rendered output matches pre-migration state

### STEP 6: Cut Over Consumers
- Update brand.ts to use only runtime assignments
- Update projects.ts to use runtime assignments
- Update logo consumers to use runtime assignments

### STEP 7: Remove Dead Code
- Remove static helpers from media.ts (production safe - not used)
- Remove workbench/preview/main-media.ts (dead duplicate)
- Remove unused static mediaId from brand.v1.json
- Remove media IDs from projects.v1.json (after backfill)

---

## PHASE 3 Conclusion

**STATUS:** ⚠️ PRODUCTION STATE UNKNOWN - MUST VERIFY KV STATE BEFORE MIGRATION

The inventory is complete, but we cannot safely proceed with migration until we verify:

1. What KV assignments currently exist in production
2. What media assets currently exist in KV
3. What the actual rendered state is in production

**Next Required Action:** Query production KV state to determine current assignment and asset status before proceeding with migration.