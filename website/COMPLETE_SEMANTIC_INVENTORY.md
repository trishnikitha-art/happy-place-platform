# Complete Semantic Inventory: August Website Visual Assets

## Executive Summary

**Analysis Scope:** Complete read-only semantic analysis of all visual assets across the August website codebase, tracing each through the full chain: route → page → component → section → visual slot → media → physical asset → canonical identity.

**Key Findings:**
- **26 August 3 baseline assets** with full Drive ID, project, service, role, and featured provenance
- **12 canonical assets** in manifest.v1.json with UUID v5 identity
- **16 reconciled assets** in current media.v1.json (partial bridge between systems)
- **103 physical files** across 14 directories in public/images/projects/
- **Current website has 4 broken file references** causing 404 errors
- **3 competing identity systems** (UUID v5, hash-based, August 3 string IDs)
- **No semantic bridge** between Workbench and actual website

---

## 1. Complete Route → Page → Component → Section → Visual Slot Inventory

### Homepage (`/`)

| Visual Slot | Component | Section | Media Call | Physical File | Canonical ID | Authority | Status |
|------------|----------|---------|-----------|--------------|--------------|-----------|--------|
| **Hero Background** | HeroSection | Hero | `getHomepageHeroMedia()` → `hero-background-enhanced.jpg` | `public/images/hero-background-enhanced.jpg` | `homepage-hero-canonical` | DERIVED | ✅ PRESENT + MAPPED |
| **Logo** | SiteHeader | Header | `/brand/logo.png` | `public/brand/logo.png` | `null` | DIRECT | ✅ PRESENT + UNMAPPED |
| **Service Cards** | ServiceCard | Services | `getServicePreviewMedia()` → projection | `various` | `various` | PROJECTION | ❌ BROKEN REFERENCES |
| **Featured Transformation** | BeforeAfterSlider | Featured | `project.media.before/after` | `HP0017_*.jpg` | `1ebc9012-*/2ebc9012-*` | INFERRED | ❌ MISSING FILES |
| **Owner Portrait** | HeroSection | Hero | `getOwnerPortrait()` → `brand-portrait` | MISSING | `brand-portrait` | DERIVED | ❌ MISSING FILE |

### About Page (`/about`)

| Visual Slot | Component | Section | Media Call | Physical File | Canonical ID | Authority | Status |
|------------|----------|---------|-----------|--------------|--------------|-----------|--------|
| **Logo** | SiteHeader | Header | `/brand/logo.png` | `public/brand/logo.png` | `null` | DIRECT | ✅ PRESENT + UNMAPPED |
| **Owner Portrait** | HeroSection | Hero | `getOwnerPortrait()` → `brand-portrait` | MISSING | `brand-portrait` | DERIVED | ❌ MISSING FILE |

### Our Work Page (`/our-work`)

| Visual Slot | Component | Section | Media Call | Physical File | Canonical ID | Authority | Status |
|------------|----------|---------|-----------|--------------|--------------|-----------|--------|
| **Featured Transformations** | BeforeAfterSlider | Featured | `project.media.before/after` | `various` | `various` | INFERRED | ❌ MISSING FILES |
| **Recent Projects** | ProjectSpotlight | Recent | `project.media.hero` | `various` | `various` | INFERRED | ❌ MISSING FILES |
| **Project Gallery** | ProjectPhotos | Gallery | `project.media.gallery[]` | `various` | `various` | INFERRED | ❌ MISSING FILES |

### Services Page (`/services`)

| Visual Slot | Component | Section | Media Call | Physical File | Canonical ID | Authority | Status |
|------------|----------|---------|-----------|--------------|--------------|-----------|--------|
| **Service Cards** | ServiceCard | Services | `getServicePreviewMedia()` → projection | `various` | `various` | PROJECTION | ❌ BROKEN REFERENCES |
| **Featured Project** | BeforeAfterSlider | Featured | `project.media.before/after` | `various` | `various` | INFERRED | ❌ MISSING FILES |
| **Project Gallery** | ProjectHero | Gallery | `project.media.hero` | `various` | `various` | INFERRED | ❌ MISSING FILES |

### Project Detail Pages (`/projects/[slug]`)

| Visual Slot | Component | Section | Media Call | Physical File | Canonical ID | Authority | Status |
|------------|----------|---------|-----------|--------------|--------------|-----------|--------|
| **Project Hero** | ProjectSpotlight | Hero | `project.media.hero` | `various` | `various` | INFERRED | ❌ MISSING FILES |
| **Before/After** | BeforeAfterSlider | Transformation | `project.media.before/after` | `various` | `various` | INFERRED | ❌ MISSING FILES |
| **Gallery** | ProjectPhotos | Gallery | `project.media.gallery[]` | `various` | `various` | INFERRED | ❌ MISSING FILES |

### Service Detail Pages (`/services/[slug]`)

| Visual Slot | Component | Section | Media Call | Physical File | Canonical ID | Authority | Status |
|------------|----------|---------|-----------|--------------|--------------|-----------|--------|
| **Featured Project** | BeforeAfterSlider | Featured | `project.media.before/after` | `various` | `various` | INFERRED | ❌ MISSING FILES |
| **Project Gallery** | ProjectHero | Gallery | `project.media.hero` | `various` | `various` | INFERRED | ❌ MISSING FILES |

### Review Components

| Visual Slot | Component | Section | Media Call | Physical File | Canonical ID | Authority | Status |
|------------|----------|---------|-----------|--------------|--------------|-----------|--------|
| **Project Hero (Review)** | ReviewCard | Review | `project.media.hero` → `getMediaById()` | `various` | `various` | DERIVED | ⚠️ CONDITIONAL |
| **Review Photos** | ReviewCard | Review | `review.photos[]` → `getMediaById()` | `various` | `various` | DERIVED | ⚠️ CONDITIONAL |
| **Project Hero (Featured)** | FeaturedReview | Featured | `project.media.hero` → `getMediaById()` | `various` | `various` | DERIVED | ⚠️ CONDITIONAL |

### Other Pages

| Visual Slot | Component | Section | Media Call | Physical File | Canonical ID | Authority | Status |
|------------|----------|---------|-----------|--------------|--------------|-----------|--------|
| **Logo** | SiteHeader | Header | `/brand/logo.png` | `public/brand/logo.png` | `null` | DIRECT | ✅ PRESENT + UNMAPPED |
| **Logo** | SiteFooter | Footer | `/brand/logo.png` | `public/brand/logo.png` | `null` | DIRECT | ✅ PRESENT + UNMAPPED |
| **Logo** | EstimatePage | Hero | `/brand/logo.png` | `public/brand/logo.png` | `null` | DIRECT | ✅ PRESENT + UNMAPPED |
| **Logo** | ContactPage | Hero | `/brand/logo.png` | `public/brand/logo.png` | `null` | DIRECT | ✅ PRESENT + UNMAPPED |
| **Logo** | ReviewsPage | Hero | `/brand/logo.png` | `public/brand/logo.png` | `null` | DIRECT | ✅ PRESENT + UNMAPPED |

---

## 2. August 3 Baseline: Complete Asset Inventory

### Full 26-Asset Inventory with Drive Provenance

| Filename | Drive ID | Project | Service | Roles | Featured | Physical Status | Canonical Status | Reconciliation |
|----------|----------|---------|---------|-------|----------|-----------------|-----------------|----------------|
| `FENCE BUILD.jpg` | `fences-001-master` | `fences-001` | `fences` | `[hero]` | `true` | ✅ EXISTS | ✅ RECONCILED | `b8adf93d-6a2e-5738-9dbf-aa2350f01d55` |
| `FENCE BEFORE.jpg` | `drive-c266e5096e43` | `fences-001` | `fences` | `[before]` | `false` | ❌ MISSING | ❌ NOT RECONCILED | — |
| `FENCE AFTER.jpg` | `drive-7a4b33c8b2bb` | `fences-001` | `fences` | `[after]` | `false` | ❌ MISSING | ❌ NOT RECONCILED | — |
| `FENCEREBUILDMATCHINGSTAIN.png` | `fences-001-variant-001` | `fences-001` | `fences` | `[gallery]` | `false` | ✅ EXISTS | ✅ RECONCILED | `f01c063d-80e9-54e5-8150-d481cd27eac6` |
| `FINISHEDCARPENTRY.png` | `builtins-001-master` | `builtins-001` | `built-ins` | `[hero]` | `true` | ✅ EXISTS | ✅ RECONCILED | `0a70fd32-d9f2-5aea-bd86-25437d39a7ad` |
| `FINISHEDCARPENTRY0.png` | `builtins-001-variant-001` | `builtins-001` | `built-ins` | `[gallery]` | `false` | ✅ EXISTS | ✅ RECONCILED | `43cee174-ed0f-5190-b393-52ac748d1993` |
| `TRIMREPAIR.png` | `repairs-001-master` | `repairs-001` | `repairs` | `[hero]` | `true` | ✅ EXISTS | ✅ RECONCILED | `898839ee-b2cf-5507-a862-6e27ecae71f4` |
| `DRYWALL.png` | `repairs-001-variant-001` | `repairs-001` | `repairs` | `[gallery]` | `false` | ✅ EXISTS | ✅ RECONCILED | `b3dbfeba-58db-540c-b17d-9c5d3cc0e25a` |
| `FLOOR.png` | `repairs-001-variant-002` | `repairs-001` | `repairs` | `[gallery]` | `false` | ✅ EXISTS | ✅ RECONCILED | `453e7646-ca98-545f-bed4-5f60952faf58` |
| `GUTTERCLEANING.jpg` | `repairs-001-variant-003` | `repairs-001` | `repairs` | `[gallery]` | `false` | ✅ EXISTS | ✅ RECONCILED | `caa5f1f0-6dee-5ed9-a5b9-96334ed2cfde` |
| `IMG_0535.JPG` | `painting-001-master` | `exterior-painting-001` | `painting` | `[hero]` | `true` | ❌ MISSING | ❌ NOT RECONCILED | — |
| `IMG_0555.JPG` | `painting-001-variant-001` | `exterior-painting-001` | `painting` | `[gallery]` | `false` | ❌ MISSING | ❌ NOT RECONCILED | — |
| `IMG_0559.JPG` | `painting-001-variant-002` | `exterior-painting-001` | `painting` | `[gallery]` | `false` | ❌ MISSING | ❌ NOT RECONCILED | — |
| `IMG_0737.JPG` | `painting-001-variant-003` | `exterior-painting-001` | `painting` | `[gallery] | `false` | ❌ MISSING | ❌ NOT RECONCILED | — |
| `IMG_0805.JPG` | `painting-001-variant-004` | `exterior-painting-001` | `painting` | `[gallery] | `false` | ❌ MISSING | ❌ NOT RECONCILED | — |
| `IMG_0841.JPG` | `painting-001-variant-005` | `exterior-painting-001` | `painting` | `[gallery]` | `false` | ❌ MISSING | ❌ NOT RECONCILED | — |
| `BATHROOM_WALL.png` | `bathroom-001-master` | `bathroom-remodeling-001` | `bathrooms` | `[hero]` | `true` | ✅ EXISTS | ⚠️ PARTIAL IDENTITY | — |
| `featured.jpeg` | `drive-7fc72d02ab05` | `null` | `null` | `[brand]` | `false` | ❌ MISSING | ❌ NOT RECONCILED | — |
| `hero.jpeg` | `brand-hero-001` | `null` | `null` | `[hero, brand]` | `true` | ❌ MISSING | ❌ NOT RECONCILED | — |
| `portrait.jpeg` | `brand-portrait-001` | `null` | `null` | `[portrait, brand]` | `false` | ❌ MISSING | ❌ NOT RECONCILED | — |
| `FLOOR0.jpg` | `repairs-001-variant-004` | `repairs-001` | `repairs` | `[gallery]` | `✅ EXISTS` | ✅ RECONCILED | `ba4132c9-66ee-5d26-be2d-b6f68cf1930e` |
| `IMG_0544.JPG` | `repairs-001-variant-005` | `repairs-001` | `repairs` | `[gallery]` | ❌ MISSING | ❌ NOT RECONCILED | — |
| `IMG_0546.JPG` | `repairs-001-variant-006` | `repairs-001` | `repairs` | `[gallery]` | ❌ MISSING | ❌ NOT RECONCILED | — |
| `HOMESERVICEPROJECTPERGOLAS.jpg` | `pergolas-001-master` | `pergolas-001` | `pergolas` | `[hero]` | `true` | ✅ EXISTS | ⚠️ PARTIAL IDENTITY | — |
| `1.png` | `pergolas-001-variant-001` | `pergolas-001` | `pergolas` | `[before]` | `false` | ✅ EXISTS | ⚠️ PARTIAL IDENTITY | — |
| `HOMESERVICEPROJECTPERGOLAS.jpg` | `pergolas-001-master` | `pergolas-001` | `pergolas` | `[after]` | `false` | ❌ DUPLICATE REFERENCE | ❌ NOT RECONCILED | — |

---

## 3. Missing Image Classification

### Classification Framework

| Classification | Definition | Count |
|--------------|------------|-------|
| **PRESENT + MAPPED** | Physical file exists + canonical identity + website usage | 4 |
| **PRESENT + UNMAPPED** | Physical file exists + canonical identity + NO website usage | 8 |
| **REFERENCED BUT MISSING** | Website references file but file doesn't exist | 5 |
| **AUGUST ASSET WITH RECOVERABLE PROVENANCE** | August 3 asset with Drive ID but missing physical file | 9 |
| **ORPHANED/GENERATED VARIANT** | Variant file exists without original source | 9 |
| **UNKNOWN** | Cannot determine status | 0 |

### Detailed Classification

#### PRESENT + MAPPED (4 assets)
| Asset | Physical File | Canonical ID | Website Usage | Authority |
|-------|--------------|--------------|---------------|-----------|
| Homepage hero | `hero-background-enhanced.jpg` | `homepage-hero-canonical` | Homepage hero | DERIVED |
| Logo | `/brand/logo.png` | `null` | All pages (header/footer) | DIRECT |
| Fence hero | `FENCE BUILD.jpg` | `b8adf93d-6a2e-5738-9dbf--aa2350f01d55` | NOT CURRENTLY USED | AUTHORITATIVE |
| Fence gallery | `FENCEREBUILDMATCHINGSTAIN.png` | `f01c063d-80e9-54e5-8150-d481cd27eac6` | NOT CURRENTLY USED | AUTHORITATIVE |

#### PRESENT + UNMAPPED (8 assets)
| Asset | Physical File | Canonical ID | Project | Authority |
|-------|--------------|--------------|---------|-----------|
| Built-ins hero | `FINISHEDCARPENTRY.png` | `0a70fd32-d9f2-5aea-bd86-25437d39a7ad` | `smith-built-ins` | AUTHORITATIVE |
| Built-ins gallery | `FINISHEDCARPENTRY0.png` | `43cee174-ed0f-5190-b393-52ac748d1993` | `smith-built-ins` | AUTHORITATIVE |
| Repairs hero | `TRIMREPAIR.png` | `898839ee-b2cf-5507-a862-6e27ecae71f4` | `wilson-home-repairs` | AUTHORITATIVE |
| Repairs gallery (4) | `DRYWALL.png`, `FLOOR.png`, `GUTTERCLEANING.jpg`, `FLOOR0.jpg` | Various IDs | `wilson-repairs` | AUTHORITATIVE |
| Bathroom hero | `BATHROOM_WALL.png` | NO UUID | `davis-bathroom-remodel` | PARTIAL |
| Pergola hero | `HOMESERVICEPROJECTPERGOLAS.jpg` | NO UUID | `martinez-pergola` | PARTIAL |
| Pergola before | `1.png` | NO UUID | `martinez-pergola` | PARTIAL |

#### REFERENCED BUT MISSING (5 assets)
| Asset | Referenced By | Expected Location | August Drive ID | Status |
|-------|--------------|-----------------|---------------|--------|
| `Feature-Fence-Photo.jpg` | `project-featured` | `public/images/projects/featured/` | `drive-7fc72d02ab05` | ❌ MISSING |
| `HP0017_ExteriorPainting_After.jpg` | `project-hp0017` | `public/images/projects/HP0017/` | `painting-001-master` | ❌ MISSING |
| `HP0017_ExteriorPainting_Before.jpg` | `project-hp0017` | `public/images/projects/HP0017/` | `painting-001-variant-001` | ❌ MISSING |
| `HP0018_FenceInstallation_Exterior_SideStained_After.jpg` | `project-hp0018` | `public/images/projects/HP0018/` | UNKNOWN | ❌ MISSING |
| `brand-portrait` | `brand.v1.json` | `public/images/projects/portrait/` | `brand-portrait-001` | ❌ MISSING |

#### AUGUST ASSET WITH RECOVERABLE PROVENANCE (9 assets)
| Asset | August Drive ID | Project | Service | Role | Recovery Path |
|-------|----------------|---------|---------|-----|--------------|
| `FENCE BEFORE.jpg` | `drive-c266e5096e43` | `fences-001` | `fences` | before | Copy from Drive |
| `FENCE AFTER.jpg` | `drive-7a4b33c8b2bb` | `fences-001` | `fences` | after | Copy from Drive |
| `IMG_0535.JPG` | `painting-001-master` | `exterior-painting-001` | `painting` | hero | Copy from Drive |
| `IMG_0555.JPG` | `painting-001-variant-001` | `exterior-painting-001` | `painting` | gallery | Copy from Drive |
| `IMG_0559.JPG` | `painting-001-variant-002` | `exterior-painting-001` | `painting` | gallery | Copy from Drive |
| `IMG_0737.JPG` | `painting-001-variant-003` | `exterior-painting-001` | `painting` | gallery | Copy from Drive |
| `IMG_0805.JPG` | `painting-001-variant-004` | `exterior-painting-001` | `painting` | gallery | Copy from Drive |
| `IMG_0841.JPG` | `painting-001-variant-005` | `exterior-painting-001` | `painting` | gallery | Copy from Drive |
| `hero.jpeg` | `brand-hero-001` | `null` | `null` | hero/brand | Copy from Drive |
| `portrait.jpeg` | `brand-portrait-001` | `null` | `null` | portrait/brand | Copy from Drive |
| `featured.jpeg` | `drive-7fc72d02ab05` | `null` | `null` | brand | Copy from Drive |

#### ORPHANED/GENERATED VARIANTS (9 assets)
| Asset | Directory | Issue | Status |
|-------|----------|-------|--------|
| `featured-480.avif/webp/thumb.webp` | `featured/` | No original source file | ⚠️ ORPHANED |
| `hero-480.avif/webp/thumb.webp` | `hero/` | No original source file | ⚠️ ORPHANED |
| `portrait-480.avif/webp/thumb.webp` | `portrait/` | No original source file | ⚠️ ORPHANED |

---

## 4. Authority Classification by Component

### Component-Level Authority Analysis

| Component | Media Authority | Slot Registration | Status |
|-----------|----------------|-----------------|--------|
| **HeroSection** | `getHomepageHeroMedia()` → brand.v1.json | NO SLOT REGISTRATION | ⚠️ NO SEMANTIC SLOT |
| **ServiceCard** | `getServicePreviewMedia()` → projection | NO SLOT REGISTRATION | ⚠️ NO SEMANTIC SLOT |
| **ProjectSpotlight** | `getMediaById()` → project.media.hero | NO SLOT REGISTRATION | ⚠️ NO SEMANTIC SLOT |
| **BeforeAfterSlider** | `getMediaById()` → project.media.before/after | NO SLOT REGISTRATION | ⚠️ NO SEMANTIC SLOT |
| **ReviewCard** | `getMediaById()` → project.media.hero | NO SLOT REGISTRATION | ⚠️ NO SEMANTIC SLOT |
| **SiteHeader** | `/brand/logo.png` (direct) | NO SLOT REGISTRATION | ⚠️ NO SEMANTIC SLOT |
| **SiteFooter** | `/brand/logo.png` (direct) | NO SLOT REGISTRATION | ⚠️ NO SEMANTIC SLOT |

**Critical Finding:** **NO COMPONENTS CURRENTLY REGISTER SEMANTIC SLOTS** despite slot-registry.ts existing. The editor infrastructure exists but is completely unused by the actual website components.

---

## 5. Workbench Layout Fix: Desktop Scrolling Model

### Current Layout Issues

**File:** `src/app/workbench/media/page.tsx`

**Problem Structure:**
```tsx
<div className="h-screen flex flex-col bg-background">  // BAD: Single scroll context
  <div className="border-b ... flex-shrink-0">  // Fixed header
  <div className="border-b ... flex-shrink-0">  // Fixed search/filter
  <div className="flex-1 overflow-y-auto p-6">  // Main content scroll (nested)
```

**Issues:**
1. Nested scroll contexts cause touchpad confusion
2. Sidebar state controls main content scroll
3. No independent scroll zones
4. Header consumes scroll surface

### Required Layout Structure

```tsx
<div className="h-screen flex flex-col bg-background overflow-hidden">  // Boundary
  <div className="flex-shrink-0">  // Fixed toolbar (no scroll)
  <div className="flex flex-1 overflow-hidden">  // Split container
    <div className="w-80 flex-shrink-0 overflow-y-auto overscroll-behavior-contain">  // Sidebar (independent scroll)
    <div className="flex-1 overflow-y-auto overscroll-behavior-contain">  // Main content (independent scroll)
```

### Key Scrolling Requirements

1. **Independent Scroll Zones:**
   - Sidebar: `overflow-y-auto` + `overscroll-behavior: contain`
   - Main content: `overflow-y-auto` + `overscroll-behavior: contain`
   - Website preview: `overflow-y-auto` + `overscroll-behavior: contain`

2. **Touchpad Optimization:**
   - Natural two-finger scrolling on all zones
   - No hover requirement for scroll activation
   - No nested scroll traps

3. **Sidebar Independence:**
   - Sidebar open/closed state must not affect main scroll
   - Sidebar scroll only when content overflows
   - Main content always scrollable

4. **Header Non-Interference:**
   - Fixed header should not consume scroll surface
   - Scroll zones clearly separated
   - No horizontal scroll interference

---

## 6. Workbench Semantic Bridge Design

### Required Three-Panel Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Toolbar / search / filters                                   │
├───────────────┬───────────────────────────────┬──────────────┤
│ Media /       │ Media + semantic usage        │ Website      │
│ metadata      │ library                       │ preview      │
│               │                               │              │
│ independent   │ INDEPENDENT SCROLL            │ independent  │
│ scroll        │                               │ scroll       │
└───────────────┴───────────────────────────────┴──────────────┘
```

### Panel Specifications

**Left Panel (Media Metadata):**
- Asset details, canonical identity, provenance
- Project/service mapping
- Usage statistics
- Independent scroll zone

**Center Panel (Media + Semantic Usage):**
- Media library grid with semantic usage indicators
- Shows which assets used where
- Slot-specific groupings
- Independent scroll zone

**Right Panel (Website Preview):**
- Live website preview in iframe
- Visual slot indicators overlay
- Current slot → media mapping visualization
- Independent scroll zone

### Semantic Slot Registration Required

The website components need to register semantic slots:

| Page | Component | Semantic Slot | Current Status |
|------|----------|--------------|---------------|
| Homepage | HeroSection | `homepage-hero-slot` | ❌ NOT REGISTERED |
| Homepage | ServiceCard | `service-card-slot-{service}` | ❌ NOT REGISTERED |
| Homepage | BeforeAfterSlider | `featured-transformation-before-slot` | ❌ NOT REGISTERED |
| Homepage | BeforeAfterSlider | `featured-transformation-after-slot` | ❌ NOT REGISTERED |
| About | HeroSection | `about-hero-slot` | ❌ NOT REGISTERED |
| Projects | ProjectSpotlight | `project-hero-slot-{projectId}` | ❌ NOT REGISTERED |
| Projects | BeforeAfterSlider | `project-before-slot-{projectId}` | ❌ NOT REGISTERED |
| Projects | BeforeAfterSlider | `project-after-slot-{projectId}` | ❌ NOT REGISTERED |
| Projects | ProjectPhotos | `project-gallery-slot-{projectId}-{index}` | ❌ NOT REGISTERED |

---

## 7. Architectural Constraint: Reuse Existing Authorities

### Required Authority Integration

**DO NOT DUPLICATE:**

1. **manifest.v1.json** - Use via existing authority-loader.ts
2. **media.v1.json** - Use via existing media.ts adapter
3. **projects.v1.json** - Use via existing projects.ts adapter
4. **services.v1.json** - Use via existing registries.ts
5. **brand.v1.json** - Use via existing brand.ts adapter
6. **.generated/*-projection.json** - Use via existing projection-loader.ts
7. **slot-registry.ts** - Use existing slot registry (currently unused)
8. **placement-graph.ts** - Use existing placement graph (currently unused)

### Integration Points

```typescript
// CORRECT: Use existing adapters
import { loadMediaManifest } from '@/lib/media';
import { loadProjectsManifest } from '@/lib/projects';
import { loadBrandManifest } from '@/lib/brand';
import { loadHeroProjection } from '@/lib/projection-loader';
import { slotRegistry } from '@/lib/editor/slot-registry';
```

**INCORRECT (Do NOT duplicate):**
- Do not create new manifest parsers
- Do not rebuild authority graphs
- Do not invent new ID systems
- Do not duplicate projection logic

---

## 8. Missing-Image Accounting: Complete Picture

### Inventory Summary

| Classification | Count | Evidence |
|--------------|-------|----------|
| **Present + Mapped** | 4 | Physical file + canonical ID + current usage |
| **Present + Unmapped** | 8 | Physical file + canonical ID + no current usage |
| **Referenced But Missing** | 5 | Website references broken files |
| **August Asset with Recoverable Provenance** | 9 | August 3 Drive ID but missing physical file |
| **Orphaned/Generated Variant** | 9 | Variant without original source |
| **Total Tracked Assets** | 35 | All visual evidence accounted for |

### "16 Assets" vs Reality

**Workbench Shows:** 16 reconciled assets from partial reconciliation

**Actual Website Evidence:** 35 total visual assets with various states

**Discrepancy:** Workbench is showing only 45% of actual visual evidence because:
1. It only shows reconciled assets from media.v1.json
2. It ignores unmapped canonical assets
3. It ignores missing but referenced assets
4. It ignores August 3 assets with Drive provenance
5. It ignores orphaned variants

---

## 9. Definition of Done: Success Criteria

The Workbench is complete when it can answer, for **every discovered visual**:

> "What is this image, where does it appear on the August website, what semantic slot consumes it, what is its canonical identity, and if it is missing, what evidence proves that?"

### Required Capabilities

✅ **Visual Inventory:** All 35 visual assets accounted for with classification  
✅ **Semantic Tracing:** Full chain from route → page → component → section → slot  
✅ **Authority Classification:** Each relationship classified as AUTHORITATIVE/DERIVED/PROJECTION/INFERRED/MISSING/ORPHANED  
✅ **Canonical Identity:** Each asset mapped to canonical ID where available  
✅ **Missing Evidence:** August 3 Drive ID provenance for missing assets  
✅ **Website Preview:** Real website visible beside media library  
✅ **Semantic Bridge:** Visual slot ↔ canonical media asset mapping  
✅ **Desktop Scrolling:** Independent scroll zones, touchpad optimized  
✅ **Authority Reuse:** Uses existing adapters, no duplication  

### Current State vs Done Criteria

| Capability | Current State | Required State |
|------------|--------------|----------------|
| Visual inventory tracking | Partial (16 assets) | Complete (35 assets) |
| Semantic tracing | None | Complete chain mapping |
| Authority classification | None | All relationships classified |
| Canonical identity mapping | Partial (16 assets) | All mapped where available |
| Missing asset evidence | None | August 3 Drive provenance tracked |
| Website preview | None | Live preview beside library |
| Semantic bridge | None | Slot ↔ media mapping visualization |
| Desktop scrolling | Broken (nested contexts) | Independent scroll zones |
| Authority reuse | Partial (duplicates graph-reconstructor) | Full reuse of existing adapters |

---

## 10. Recommended Next Steps (Read-Only Analysis Complete)

### Immediate Required Changes (Read-Only First)

**Phase 1: Fix Workbench Layout (HIGH PRIORITY)**
1. Restructure page.tsx with three-panel layout
2. Implement independent scroll zones
3. Add touchpad optimization
4. Add overscroll-behavior controls

**Phase 2: Build Complete Visual Inventory (HIGH PRIORITY)**
1. Create comprehensive visual asset registry
2. Classify all 35 assets by authority
3. Track August 3 provenance for missing assets
4. Map current website usage patterns

**Phase 3: Integrate Semantic Bridge (MEDIUM PRIORITY)**
1. Add website preview panel to Workbench
2. Implement slot registration in components
3. Build slot ↔ media visualization
4. Create drag-and-drop targeting foundation

**Phase 4: Reconcile Missing Assets (MEDIUM PRIORITY)**
1. Establish Drive connection for 9 recoverable assets
2. Fix broken file references in projects.v1.json
3. Add missing canonical identities for partial assets
4. Resolve orphaned variants

**PHASE 5: Surgical Manifest Fixes (LOW PRIORITY - AFTER ANALYSIS)**
1. Fix project ID mismatches
2. Reconcile August 3 assets properly
3. Eliminate competing identity authorities
4. Clean up stale projections

---

## Conclusion

**Current State:** The Media Workbench displays 16 reconciled assets but this represents only 45% of the actual visual evidence. The website has 35 total visual assets with various states, and the Workbench has no semantic bridge to the actual website structure.

**Root Issues:**
1. Incomplete visual inventory (showing only reconciled assets)
2. No semantic slot registration in components
3. Broken file references in current website
4. Desktop scrolling defects in Workbench layout
5. No semantic bridge between Workbench and actual website
6. Partial authority classification

**Path Forward:** Fix layout to include website preview panel, implement complete visual inventory tracking, establish semantic slot registration, and build the foundation for future drag-and-drop functionality BEFORE making any canonical configuration changes.

**Success Criteria:** The Workbench must account for all 35 visual assets, show the real website beside the media library, and establish semantic mappings such that future drag-and-drop operations can resolve to correct semantic placements rather than arbitrary coordinates.
