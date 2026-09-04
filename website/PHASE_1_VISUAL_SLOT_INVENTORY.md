# PHASE 1: Visual Slot Forensic Inventory

## Executive Summary
**STATUS:** ❌ CRITICAL PARALLEL AUTHORITIES DETECTED

The system has **multiple competing rendering authorities** instead of one authoritative slot → asset → projection → renderer chain.

### Critical Findings:
1. **Generated projections exist but homepage ignores them** - `.generated/hero-projection.json`, `.generated/gallery-projection.json`, `.generated/service-projection.json` exist but homepage performs its own runtime assignment resolution
2. **Brand authority has dual paths** - `brand.ts` loads static `brand.v1.json` AND checks runtime assignments
3. **Project authority uses static JSON** - `projects.ts` uses `projects.v1.json` for media IDs instead of runtime assignments
4. **Multiple Drive API bypasses** - Workbench components directly render `/api/drive/` URLs
5. **Hardcoded static paths** - Header/footer use hardcoded `/brand/logo.png`

---

## Machine-Verifiable Visual Slot Inventory

| Slot ID | Route | Component | Section | Current Source | Current Media ID | Asset Authority | Fallback | Hardcoded Path | Projection Source | Runtime Assignment Source | Provenance Available | Public Gate Validated | HARD GATE |
|---------|-------|-----------|---------|----------------|-----------------|-----------------|----------|-----------------|-------------------|--------------------------|----------------------|----------------------|-----------|
| homepage-hero | / | page.tsx | Hero | Runtime assignment via getHomepageHero() | null (no assignment) | Brand Authority → Runtime Assignment | Fail closed (no static fallback) | None | .generated/hero-projection.json (NOT CONSUMED) | service-card-assignment:brand-hero-background | No | N/A | ❌ MISSING ASSIGNMENT |
| homepage-owner-portrait | / | page.tsx | Owner Section | Runtime assignment via getOwnerPortrait() | null (no assignment) | Brand Authority → Runtime Assignment | Fail closed (no static fallback) | None | .generated/hero-projection.json (NOT CONSUMED) | service-card-assignment:brand-portrait-homepage | No | N/A | ❌ MISSING ASSIGNMENT |
| service-card-* | / | service-card.tsx | Service Cards | Runtime assignment via getServiceCardAssignment() | service.slug assignments | Assignment Store → Media Authority | Fail closed (shows "Project photos coming soon") | None | .generated/service-projection.json (NOT CONSUMED) | service-card-assignment:{service.slug} | No | Yes (resolvePublicMedia) | ⚠️ PARTIAL |
| featured-project-* | / | page.tsx | Featured Projects | Project Authority via getProjectWithResolvedMedia() | project.media.hero | Projects Authority → Media Authority | None (project hero from projects.v1.json) | None | .generated/gallery-projection.json (NOT CONSUMED) | projects.v1.json hero field | No | Yes (resolvePublicMedia) | ⚠️ STATIC AUTHORITY |
| project-hero | /projects/[slug] | project-spotlight.tsx | Hero | Project Authority via project.media.heroMedia | project.media.hero | Projects Authority → Media Authority | None (project hero from projects.v1.json) | None | .generated/gallery-projection.json (NOT CONSUMED) | projects.v1.json hero field | No | Yes (resolvePublicMedia) | ⚠️ STATIC AUTHORITY |
| project-gallery-* | /projects/[slug] | project-spotlight.tsx | Gallery | Project Authority via project.media.galleryMedia | gallery array | Projects Authority → Media Authority | None (gallery from projects.v1.json) | None | .generated/gallery-projection.json (NOT CONSUMED) | projects.v1.json gallery field | No | Yes (resolvePublicMedia) | ⚠️ STATIC AUTHORITY |
| project-before | /projects/[slug] | before-after-slider.tsx | Before/After | Project Authority via project.media.beforeMedia | project.media.before | Projects Authority → Media Authority | None (before from projects.v1.json) | None | .generated/gallery-projection.json (NOT CONSUMED) | projects.v1.json before field | No | Yes (resolvePublicMedia) | ⚠️ STATIC AUTHORITY |
| project-after | /projects/[slug] | before-after-slider.tsx | Before/After | Project Authority via project.media.afterMedia | project.media.after | Projects Authority → Media Authority | None (after from projects.v1.json) | None | .generated/gallery-projection.json (NOT CONSUMED) | projects.v1.json after field | No | Yes (resolvePublicMedia) | ⚠️ STATIC AUTHORITY |
| site-header-logo | global | site-header.tsx | Header | Hardcoded static path | None | Static file system | None | /brand/logo.png | None | None | No | N/A | ❌ HARDCODED |
| site-footer-logo | global | site-footer.tsx | Footer | Hardcoded static path | None | Static file system | None | /brand/logo.png | None | None | No | N/A | ❌ HARDCODED |
| review-project-photo | /reviews | review-card.tsx | Review Card | Project Authority via projectWithMedia.heroMedia | project.media.hero | Projects Authority → Media Authority | Fallback to getProjectById() | None | None | projects.v1.json hero field | No | Yes (resolvePublicMedia) | ⚠️ STATIC AUTHORITY |
| featured-review-photo | / | featured-review.tsx | Featured Review | Project Authority via projectWithMedia.heroMedia | project.media.hero | Projects Authority → Media Authority | Fallback to getProjectById() | None | None | projects.v1.json hero field | No | Yes (resolvePublicMedia) | ⚠️ STATIC AUTHORITY |
| workbench-drive-thumbnail | /workbench/* | workbench/media/page.tsx | Workbench Media | Drive API direct access | Drive file ID | Drive API → Direct rendering | None | /api/drive/files/{fileId}/thumbnail | None | None | Yes (Drive session) | No | ❌ DRIVE API BYPASS |
| workbench-asset-thumbnail | /workbench/* | workbench/media/page.tsx | Workbench Media | Drive API fallback | Drive file ID | Drive API → Direct rendering | Fallback to asset.variants | /api/drive/files/{fileId}/thumbnail | None | None | Yes (Drive session) | No | ❌ DRIVE API BYPASS |

---

## Parallel Authority Analysis

### 1. Generated Projections (UNUSED)
**Files:** `.generated/hero-projection.json`, `.generated/gallery-projection.json`, `.generated/service-projection.json`
**Status:** Generated but NOT consumed by homepage
**Problem:** Homepage (`page.tsx`) performs its own runtime assignment resolution instead of using generated projections
**Constitutional Violation:** Two competing "real" systems exist

### 2. Brand Authority (DUAL PATH)
**File:** `src/lib/brand.ts`
**Current Behavior:**
- Loads static `brand.v1.json` via `loadBrandManifest()`
- Checks runtime assignments via `getServiceCardAssignment()`
- Returns `resolvedMedia` from public gate if assignment exists
- Returns `null mediaId` if no assignment (fail closed)
**Problem:** Static manifest + runtime assignment as competing authorities
**Constitutional Violation:** Static JSON should not participate in runtime public rendering

### 3. Project Authority (STATIC JSON)
**File:** `src/lib/projects.ts`
**Current Behavior:**
- Uses `projects.v1.json` for project media IDs (hero, gallery, before, after)
- Resolves media through public gate
- No runtime assignment checking
**Problem:** Project media IDs come from static JSON, not runtime assignments
**Constitutional Violation:** Static JSON competes with runtime assignment authority

### 4. Media Authority (STATIC HELPERS)
**File:** `src/lib/media.ts`
**Current Behavior:**
- Contains synchronous/static-manifest helpers like `getProjectMedia()`
- Reads `media.v1.json` directly
- Provides KV-based resolution via `resolvePublicMedia()`
**Problem:** Static manifest accessors compete with KV-based runtime authority
**Constitutional Violation:** Static JSON should not silently participate in runtime public rendering

### 5. Drive API Bypass (WORKBENCH)
**Files:** `src/app/workbench/media/page.tsx`, `src/app/workbench/explorer/drive/page.tsx`
**Current Behavior:**
- Directly renders `/api/drive/files/{fileId}/thumbnail` URLs
- Drive IDs exist as public asset identity in Workbench
- Fallback to `asset.variants` if Drive unavailable
**Problem:** Drive IDs appear as public assets, Drive API bypasses media authority
**Constitutional Violation:** Drive references cannot become public assets

### 6. Hardcoded Static Paths (HEADER/FOOTER)
**Files:** `src/components/site-header.tsx`, `src/components/site-footer.tsx`
**Current Behavior:**
- Hardcoded `/brand/logo.png` in both components
- No assignment checking
- No media authority validation
**Problem:** Hardcoded paths outrank authority
**Constitutional Violation:** Hardcoded image cannot outrank runtime assignment

---

## Authority Classification Required

### Static JSON Files Need Constitutional Classification:

| File | Current Usage | Required Classification |
|------|---------------|----------------------|
| `media.v1.json` | Media Authority KV source, static helpers | EVIDENCE/BOOTSTRAP only |
| `brand.v1.json` | Brand Authority + runtime fallback | EVIDENCE/BOOTSTRAP only |
| `projects.v1.json` | Project Authority media IDs | EVIDENCE/BOOTSTRAP only |
| `services.v1.json` | Service configuration | CONTENT AUTHORITY (slots) |
| `cities.v1.json` | Service area configuration | CONTENT AUTHORITY (metadata) |

### Current Classification Issues:
- **media.v1.json**: Currently used as runtime authority via static helpers
- **brand.v1.json**: Currently participates in runtime rendering via fallbacks
- **projects.v1.json**: Currently used as runtime authority for media IDs
- **generated projections**: Generated but not consumed (orphaned authority)

---

## Critical Constitutional Violations

### Violation 1: Two Competing "Real" Systems
**Evidence:** Generated projections exist but homepage ignores them
**Location:** `page.tsx` vs `.generated/*.json`
**Fix Required:** Either consume projections OR eliminate them

### Violation 2: Drive IDs as Public Assets
**Evidence:** Workbench renders `/api/drive/` URLs directly
**Location:** `workbench/media/page.tsx`, `workbench/explorer/drive/page.tsx`
**Fix Required:** Drive IDs must only be provenance, never public URLs

### Violation 3: Hardcoded Paths Outranking Authority
**Evidence:** Header/footer use hardcoded `/brand/logo.png`
**Location:** `site-header.tsx`, `site-footer.tsx`
**Fix Required:** Must use runtime assignment for all public slots

### Violation 4: Static JSON Participating in Runtime Rendering
**Evidence:** `projects.v1.json` used for media IDs, `brand.v1.json` used for fallbacks
**Location:** `projects.ts`, `brand.ts`
**Fix Required:** Static JSON must be evidence/bootstrap only

---

## Missing Slot Assignments

### Slots Without Runtime Assignments:
1. **homepage-hero** - `brand-hero-background` assignment missing
2. **homepage-owner-portrait** - `brand-portrait-homepage` assignment missing
3. **site-header-logo** - No assignment mechanism exists
4. **site-footer-logo** - No assignment mechanism exists

### Consequence:
These slots either show nothing (fail closed) or use hardcoded paths (constitutional violation).

---

## Immediate Blocking Issues

### Blocker 1: Generated Projections Orphaned
**Status:** Generated but not consumed
**Impact:** Two competing "real" systems
**Action Required:** Either consume projections in homepage OR eliminate generation

### Blocker 2: Project Authority Static JSON
**Status:** Uses `projects.v1.json` for media IDs
**Impact:** Static JSON competes with runtime assignments
**Action Required:** Move project media IDs to runtime assignments

### Blocker 3: Drive API Bypass
**Status:** Workbench renders Drive URLs directly
**Impact:** Drive IDs as public assets
**Action Required:** All Drive content must be materialized through media authority

### Blocker 4: Hardcoded Logo Paths
**Status:** Header/footer use hardcoded paths
**Impact:** Hardcoded paths outrank authority
**Action Required:** Create runtime assignment slots for logo

---

## PHASE 1 Conclusion

**STATUS:** ❌ FAILED - Multiple Parallel Authorities Detected

The system does NOT have one authoritative slot → asset → projection → renderer chain. Instead, it has:

1. **Generated projections** (unused)
2. **Runtime assignments** (partially implemented)
3. **Static JSON authorities** (competing)
4. **Drive API bypasses** (security violation)
5. **Hardcoded paths** (authority violation)

**Next Required Action:** PHASE 2 - Find and eliminate parallel authorities before proceeding to PHASE 3.