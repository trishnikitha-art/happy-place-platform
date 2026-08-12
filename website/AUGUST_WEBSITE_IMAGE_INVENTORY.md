# August Website Image Inventory & Mapping

## Executive Summary

**Current State Analysis:**
- **Physical Files:** 103 optimized variants in `public/images/projects/` across 14 directories
- **Canonical Manifest:** 12 assets in `manifest.v1.json` with UUID v5 identity
- **Reconciled Media:** 16 assets in `media.v1.json` (includes brand assets)
- **Projects Authority:** 3 projects in `projects.v1.json`
- **Actual Website Usage:** Broken - multiple missing file references

---

## 1. Complete August Website Image Inventory

### Homepage Image Usage

| Visual Slot | Current File | Physical Status | Canonical ID | Authority | Section |
|-------------|-------------|-----------------|--------------|----------|---------|
| Hero Background | `hero-background-enhanced.jpg` | ✅ EXISTS | `homepage-hero-canonical` | DERIVED | Hero Section |
| Owner Portrait | `brand-portrait` (missing) | ❌ MISSING | `brand-portrait` | DERIVED | Hero Section |
| Logo | `/brand/logo.png` | ✅ EXISTS | `null` | DIRECT | Header |
| Service Cards | Projection-based | ❌ MISSING FILES | Various | PROJECTION | Services Section |
| Featured Transformation | Before/After Slider | ❌ MISSING FILES | `exterior-painting-001` | PROJECT | Transformation Section |

### About Page Image Usage

| Visual Slot | Current File | Physical Status | Canonical ID | Authority | Section |
|-------------|-------------|-----------------|--------------|----------|---------|
| Owner Portrait | `brand-portrait` (missing) | ❌ MISSING | `brand-portrait` | DERIVED | Hero Section |
| Logo | `/brand/logo.png` | ✅ EXISTS | `null` | DIRECT | Header |

### Our Work Page Image Usage

| Visual Slot | Current File | Physical Status | Canonical ID | Authority | Section |
|-------------|-------------|-----------------|--------------|----------|---------|
| Featured Transformations | Before/After Sliders | ❌ MISSING FILES | Project IDs | PROJECT | Featured Section |
| Recent Projects | Project hero images | ❌ MISSING FILES | Project IDs | PROJECT | Recent Section |
| Project Gallery | Gallery images | ❌ MISSING FILES | Project IDs | PROJECT | Gallery Section |

### Services Page Image Usage

| Visual Slot | Current File | Physical Status | Canonical ID | Authority | Section |
|-------------|-------------|-----------------|--------------|----------|---------|
| Service Cards | Projection-based | ❌ MISSING FILES | Various | PROJECTION | Services Grid |
| Featured Project | Project hero/before-after | ❌ MISSING FILES | Project IDs | PROJECT | Featured Section |
| Project Gallery | Project hero images | ❌ MISSING FILES | Project IDs | PROJECT | Gallery Section |

### Project Detail Pages Image Usage

| Visual Slot | Current File | Physical Status | Canonical ID | Authority | Section |
|-------------|-------------|-----------------|--------------|----------|---------|
| Project Hero | `project.media.hero` | ❌ MISSING FILES | Project IDs | PROJECT | Hero Section |
| Before/After | `project.media.before/after` | ❌ MISSING FILES | Project IDs | PROJECT | Transformation Section |
| Gallery | `project.media.gallery[]` | ❌ MISSING FILES | Project IDs | PROJECT | Gallery Section |

---

## 2. Missing Image Inventory

### Critical Missing Images (9 assets)

#### Exterior/Painting Photos (7-8 images)
| August 3 Filename | Drive ID | Physical Status | Canonical Status | Usage |
|-------------------|----------|-----------------|-----------------|-------|
| `IMG_0535.JPG` | `painting-001-master` | ❌ MISSING | ❌ NOT RECONCILED | Homepage featured transformation |
| `IMG_0555.JPG` | `painting-001-variant-001` | ❌ MISSING | ❌ NOT RECONCILED | Painting project gallery |
| `IMG_0559.JPG` | `painting-001-variant-002` | ❌ MISSING | ❌ NOT RECONCILED | Painting project gallery |
| `IMG_0737.JPG` | `painting-001-variant-003` | ❌ MISSING | ❌ NOT RECONCILED | Painting project gallery |
| `IMG_0805.JPG` | `painting-001-variant-004` | ❌ MISSING | ❌ NOT RECONCILED | Painting project gallery |
| `IMG_0841.JPG` | `painting-001-variant-005` | ❌ MISSING | ❌ NOT RECONCILED | Painting project gallery |
| `FENCE BEFORE.jpg` | `drive-c266e5096e43` | ❌ MISSING | ❌ NOT RECONCILED | Fence project before/after |
| `FENCE AFTER.jpg` | `drive-7a4b33c8b2bb` | ❌ MISSING | ❌ NOT RECONCILED | Fence project before/after |

#### About Us Image (1 image)
| August 3 Filename | Drive ID | Physical Status | Canonical Status | Usage |
|-------------------|----------|-----------------|-----------------|-------|
| `portrait.jpeg` | `brand-portrait-001` | ❌ MISSING | ❌ NOT RECONCILED | About page hero |

#### Other Missing Images
| August 3 Filename | Drive ID | Physical Status | Canonical Status | Usage |
|-------------------|----------|-----------------|-----------------|-------|
| `featured.jpeg` | `drive-7fc72d02ab05` | ❌ MISSING | ❌ NOT RECONCILED | Featured project |
| `hero.jpeg` | `brand-hero-001` | ❌ MISSING | ❌ NOT RECONCILED | Homepage hero |
| `FLOOR0.jpg` | `repairs-001-variant-004` | ❌ MISSING | ✅ RECONCILED | Repairs project |
| `IMG_0544.JPG` | `repairs-001-variant-005` | ❌ MISSING | ❌ NOT RECONCILED | Repairs project |
| `IMG_0546.JPG` | `repairs-001-variant-006` | ❌ MISSING | ❌ NOT RECONCILED | Repairs project |

### Project-Specific Missing Files
| Project ID | Missing File | Usage | Status |
|------------|-------------|-------|--------|
| `project-featured` | `Feature-Fence-Photo.jpg` | Project hero | ❌ MISSING |
| `project-hp0017` | `HP0017_ExteriorPainting_After.jpg` | Project hero | ❌ MISSING |
| `project-hp0017` | `HP0017_ExteriorPainting_Before.jpg` | Before/after | ❌ MISSING |
| `project-hp0018` | `HP0018_FenceInstallation_Exterior_SideStained_After.jpg` | Project hero | ❌ MISSING |

---

## 3. Media → Project → Service → Route → Section → Visual Slot Mapping

### Mapping Legend
- **AUTHORITATIVE**: Defined in canonical config files
- **DERIVED**: Computed from other sources
- **PROJECTION**: Generated by projection system
- **INFERRED**: Guessed from filenames/structure
- **UNKNOWN**: Cannot determine

### Complete Mapping Table

| Media ID | Filename | Project | Service | Route | Section | Visual Slot | Authority | Physical Status |
|----------|----------|---------|---------|-------|---------|-------------|-----------|-----------------|
| `b8adf93d-6a2e-5738-9dbf-aa2350f01d55` | `FENCE BUILD.jpg` | `johnson-cedar-fence` | `fencing` | `/projects/johnson-cedar-fence` | Project Hero | Hero Image | AUTHORITATIVE | ✅ EXISTS |
| `f01c063d-80e9-54e5-8150-d481cd27eac6` | `FENCEREBUILDMATCHINGSTAIN.png` | `johnson-cedar-fence` | `fencing` | `/projects/johnson-cedar-fence` | Gallery | Gallery Image | AUTHORITATIVE | ✅ EXISTS |
| `0a70fd32-d9f2-5aea-bd86-25437d39a7ad` | `FINISHEDCARPENTRY.png` | `smith-built-ins` | `finish-carpentry` | `/projects/smith-built-ins` | Project Hero | Hero Image | AUTHORITATIVE | ✅ EXISTS |
| `43cee174-ed0f-5190-b393-52ac748d1993` | `FINISHEDCARPENTRY0.png` | `smith-built-ins` | `finish-carpentry` | `/projects/smith-built-ins` | Gallery | Gallery Image | AUTHORITATIVE | ✅ EXISTS |
| `898839ee-b2cf-5507-a862-6e27ecae71f4` | `TRIMREPAIR.png` | `wilson-home-repairs` | `repairs` | `/projects/wilson-home-repairs` | Project Hero | Hero Image | AUTHORITATIVE | ✅ EXISTS |
| `b3dbfeba-58db-540c-b17d-9c5d3cc0e25a` | `DRYWALL.png` | `wilson-home-repairs` | `repairs` | `/projects/wilson-home-repairs` | Gallery | Gallery Image | AUTHORITATIVE | ✅ EXISTS |
| `453e7646-ca98-545f-bed4-5f60952faf58` | `FLOOR.png` | `wilson-home-repairs` | `repairs` | `/projects/wilson-home-repairs` | Gallery | Gallery Image | AUTHORITATIVE | ✅ EXISTS |
| `caa5f1f0-6dee-5ed9-a5b9-96334ed2cfde` | `GUTTERCLEANING.jpg` | `wilson-home-repairs` | `repairs` | `/projects/wilson-home-repairs` | Gallery | Gallery Image | AUTHORITATIVE | ✅ EXISTS |
| `1ac46242-e68b-575a-a4bc-03560bacadc6` | `BATHROOM_WALL.png` | `davis-bathroom-remodel` | `bathrooms` | `/projects/davis-bathroom-remodel` | Project Hero | Hero Image | AUTHORITATIVE | ✅ EXISTS |
| `fefd445b-c713-59b5-bb78-091cb373ace9` | `HOMESERVICEPROJECTPERGOLAS.jpg` | `martinez-pergola` | `pergolas` | `/projects/martinez-pergola` | Project Hero | Hero Image | AUTHORITATIVE | ✅ EXISTS |
| `27e7115b-5e29-5fc6-abf5-a11afcff944f` | `1.png` | `martinez-pergola` | `pergolas` | `/projects/martinez-pergola` | Gallery | Gallery Image | AUTHORITATIVE | ✅ EXISTS |
| `ba4132c9-66ee-5d26-be2d-b6f68cf1930e` | `FLOOR0.jpg` | `wilson-home-repairs` | `repairs` | `/projects/wilson-home-repairs` | Gallery | Gallery Image | AUTHORITATIVE | ✅ EXISTS |
| `homepage-hero-canonical` | `hero-background-enhanced.jpg` | `brand` | `brand` | `/` | Hero | Hero Background | DERIVED | ✅ EXISTS |
| `brand-portrait` | `portrait.jpeg` (missing) | `brand` | `brand` | `/about` | Hero | Owner Portrait | DERIVED | ❌ MISSING |
| `d9cd3d37-eea1-54a9-92f6-abd1e1f71c58` | `Feature-Fence-Photo.jpg` | `project-featured` | `fencing` | `/` | Services | Featured Project | INFERRED | ❌ MISSING |
| `1ebc9012-b788-5045-809c-9013d31f42be` | `HP0017_ExteriorPainting_After.jpg` | `project-hp0017` | `painting` | `/projects/exterior-painting` | Project Hero | Hero Image | INFERRED | ❌ MISSING |
| `2ebc9012-b788-5045-809c-9013d31f42be` | `HP0017_ExteriorPainting_Before.jpg` | `project-hp0017` | `painting` | `/projects/exterior-painting` | Before/After | Before Image | INFERRED | ❌ MISSING |

---

## 4. Current Canonical Identity for Every Recoverable Image

### Recoverable Images (Have Physical Files + Canonical Identity)

| Physical File | Directory | Canonical ID | UUID v5 | Content Hash | Project | Status |
|---------------|-----------|---------------|--------|--------------|---------|--------|
| `FENCE BUILD.jpg` | `johnson-cedar-fence` | `b8adf93d-6a2e-5738-9dbf-aa2350f01d55` | `feea57b5-7ab4-5757-9525-4313f6ceec9e` | `fde707d0e89f57292087636f44c2e8a580add68c1bdf6a3f8573a15bc92623ce` | `johnson-cedar-fence` | ✅ RECOVERABLE |
| `FENCEREBUILDMATCHINGSTAIN.png` | `johnson-cedar-fence` | `f01c063d-80e9-54e5-8150-d481cd27eac6` | `d54ea7a9-3ebc-58bd-8d73-ec05b812fb46` | `e4dae37bb90595bbe466680b3295956f8a58a4589c5ce26c60ad7d4088e9535b` | `johnson-cedar-fence` | ✅ RECOVERABLE |
| `FINISHEDCARPENTRY.png` | `smith-built-ins` | `0a70fd32-d9f2-5aea-bd86-25437d39a7ad` | `f1c132be-5548-5fdd-84cc-0117240f1150` | `89a9f5d4bb013fa3978d767755fbfe05b11c3c0330ca6cf7ac02fb0d011be90e` | `smith-built-ins` | ✅ RECOVERABLE |
| `FINISHEDCARPENTRY0.png` | `smith-built-ins` | `43cee174-ed0f-5190-b393-52ac748d1993` | `2fb8b84f-990a-5542-8e04-99f6173d5782` | `c16f37d656c830146ee3f2b54ed0b62c5d821952c06b7e85cb9c465672cd093e` | `smith-built-ins` | ✅ RECOVERABLE |
| `TRIMREPAIR.png` | `wilson-home-repairs` | `898839ee-b2cf-5507-a862-6e27ecae71f4` | `0142ab58-aad9-5167-8d3e-18fc75cb0de4` | `5358901c87cd8fc7a4f665825b65e576d51b671ec8d1c71ca256ed6d90218657` | `wilson-home-repairs` | ✅ RECOVERABLE |
| `DRYWALL.png` | `wilson-home-repairs` | `b3dbfeba-58db-540c-b17d-9c5d3cc0e25a` | `3fc2fcf8-5bc3-5d53-abee-8ab0020bf138` | `bb60c0ff212d897f3ab4b5101d664a2613a98d70f1c96c18facf2dc0ad0a642c` | `wilson-home-repairs` | ✅ RECOVERABLE |
| `FLOOR.png` | `wilson-home-repairs` | `453e7646-ca98-545f-bed4-5f60952faf58` | `e61f29cb-33d1-51c2-84fe-a3429af80b66` | `263a496c4392923e59d82737ea296a7c548a1dc8571a322013c52b99001ad118` | `wilson-home-repairs` | ✅ RECOVERABLE |
| `GUTTERCLEANING.jpg` | `wilson-home-repairs` | `caa5f1f0-6dee-5ed9-a5b9-96334ed2cfde` | `3623dfa6-bde4-5df7-b341-1cea6b99c17b` | `39782328becb886acb5fcca700a27a746a19f299f0354cac7939aa08c5d663c0` | `wilson-home-repairs` | ✅ RECOVERABLE |
| `BATHROOM_WALL.png` | `davis-bathroom-remodel` | `1ac46242-e68b-575a-a4bc-03560bacadc6` | `UUID NOT IN MANIFEST` | `HASH NOT IN MANIFEST` | `davis-bathroom-remodel` | ⚠️ PARTIAL |
| `HOMESERVICEPROJECTPERGOLAS.jpg` | `martinez-pergola` | `fefd445b-c713-59b5-bb78-091cb373ace9` | `UUID NOT IN MANIFEST` | `HASH NOT IN MANIFEST` | `martinez-pergola` | ⚠️ PARTIAL |
| `1.png` | `martinez-pergola` | `27e7115b-5e29-5fc6-abf5-a11afcff944f` | `UUID NOT IN MANIFEST` | `HASH NOT IN MANIFEST` | `martinez-pergola` | ⚠️ PARTIAL |
| `FLOOR0.jpg` | `wilson-home-repairs` | `ba4132c9-66ee-5d26-be2d-b6f68cf1930e` | `UUID NOT IN MANIFEST` | `HASH NOT IN MANIFEST` | `wilson-home-repairs` | ⚠️ PARTIAL |
| `hero-background-enhanced.jpg` | `images/` | `homepage-hero-canonical` | NO UUID | NO HASH | `brand` | ⚠️ BRAND ASSET |
| `hero-background.jpeg` | `images/` | NOT IN MEDIA | NO UUID | NO HASH | `brand` | ⚠️ BRAND ASSET |

---

## 5. Images with No Canonical Identity

### Physical Files Without Canonical Records

| Physical File | Directory | Issue | Status |
|---------------|-----------|-------|--------|
| `featured-480.avif/webp/thumb.webp` | `featured/` | No original source file | ⚠️ ORPHANED VARIANTS |
| `hero-480.avif/webp/thumb.webp` | `hero/` | No original source file | ⚠️ ORPHANED VARIANTS |
| `portrait-480.avif/webp/thumb.webp` | `portrait/` | No original source file | ⚠️ ORPHANED VARIANTS |
| `BATHROOM_WALL.*` | `davis-bathroom-remodel` | No UUID in manifest | ⚠️ PARTIAL IDENTITY |
| `HOMESERVICEPROJECTPERGOLAS.*` | `martinez-pergola` | No UUID in manifest | ⚠️ PARTIAL IDENTITY |
| `1.png` + variants | `martinez-pergola` | No UUID in manifest | ⚠️ PARTIAL IDENTITY |
| `FLOOR0.jpg` + variants | `wilson-home-repairs` | No UUID in manifest | ⚠️ PARTIAL IDENTITY |

### Brand Assets Without Canonical Identity

| File | Usage | Issue | Status |
|------|-------|-------|--------|
| `hero-background-enhanced.jpg` | Homepage hero | No UUID, uses string ID | ⚠️ NON-CANONICAL |
| `hero-background.jpeg` | Fallback hero | No canonical record | ⚠️ NON-CANONICAL |
| `logo.png` | Logo | MediaId is null in brand.v1.json | ⚠️ NON-CANONICAL |

---

## 6. Canonical Images with No Current Website Usage

### Canonical Assets Not Used in Current Website

| Canonical ID | Filename | Project | Reason | Status |
|--------------|----------|---------|--------|--------|
| `b8adf93d-6a2e-5738-9dbf-aa2350f01d55` | `FENCE BUILD.jpg` | `johnson-cedar-fence` | Project not in projects.v1.json | ⚠️ UNUSED |
| `f01c063d-80e9-54e5-8150-d481cd27eac6` | `FENCEREBUILDMATCHINGSTAIN.png` | `johnson-cedar-fence` | Project not in projects.v1.json | ⚠️ UNUSED |
| `0a70fd32-d9f2-5aea-bd86-25437d39a7ad` | `FINISHEDCARPENTRY.png` | `smith-built-ins` | Project not in projects.v1.json | ⚠️ UNUSED |
| `43cee174-ed0f-5190-b393-52ac748d1993` | `FINISHEDCARPENTRY0.png` | `smith-built-ins` | Project not in projects.v1.json | ⚠️ UNUSED |
| `898839ee-b2cf-5507-a862-6e27ecae71f4` | `TRIMREPAIR.png` | `wilson-home-repairs` | Project not in projects.v1.json | ⚠️ UNUSED |
| `b3dbfeba-58db-540c-b17d-9c5d3cc0e25a` | `DRYWALL.png` | `wilson-home-repairs` | Project not in projects.v1.json | ⚠️ UNUSED |
| `453e7646-ca98-545f-bed4-5f60952faf58` | `FLOOR.png` | `wilson-home-repairs` | Project not in projects.v1.json | ⚠️ UNUSED |
| `caa5f1f0-6dee-5ed9-a5b9-96334ed2cfde` | `GUTTERCLEANING.jpg` | `wilson-home-repairs` | Project not in projects.v1.json | ⚠️ UNUSED |

**Reason:** Current `projects.v1.json` only contains 3 projects (`project-featured`, `project-hp0017`, `project-hp0018`) but the canonical manifest has 6 projects with physical files.

---

## 7. Broken/Missing File References

### Broken References in Current Website

| Page/Component | Referenced File | Expected Location | Status | Impact |
|----------------|----------------|-------------------|--------|--------|
| Homepage | `Feature-Fence-Photo.jpg` | `public/images/projects/featured/` | ❌ MISSING | Featured project shows nothing |
| Homepage | `HP0017_ExteriorPainting_After.jpg` | `public/images/projects/HP0017/` | ❌ MISSING | Painting project shows nothing |
| Homepage | `HP0017_ExteriorPainting_Before.jpg` | `public/images/projects/HP0017/` | ❌ MISSING | Before/after slider broken |
| Homepage | `HP0018_FenceInstallation_Exterior_SideStained_After.jpg` | `public/images/projects/HP0018/` | ❌ MISSING | Fence project shows nothing |
| About Page | `brand-portrait` | `public/images/projects/portrait/` | ❌ MISSING | Owner portrait shows nothing |
| Projections | Multiple filenames | Various | ❌ MISSING | Projections reference non-existent files |

### Broken Projection References

| Projection File | Referenced Images | Status |
|-----------------|-------------------|--------|
| `hero-projection.json` | `hero-background-enhanced.jpg` | ⚠️ EXISTS but non-canonical |
| `gallery-projection.json` | `Feature-Fence-Photo.jpg`, `HP0017_*.jpg`, `HP0018_*.jpg` | ❌ ALL MISSING |
| `service-projection.json` | Multiple HP project images | ❌ MOSTLY MISSING |

---

## 8. Mapping Authority Classification

### Authority Classification by Source

| Mapping Type | Source | Authority Level | Confidence |
|--------------|--------|-----------------|------------|
| **Physical → Canonical** | `manifest.v1.json` | AUTHORITATIVE | 100% |
| **Canonical → Media** | August 3 reconciliation | DERIVED | 95% |
| **Media → Project** | `projects.v1.json` | AUTHORITATIVE | 100% |
| **Media → Service** | `services.v1.json` | AUTHORITATIVE | 100% |
| **Project → Route** | Next.js routing | AUTHORITATIVE | 100% |
| **Route → Section** | Component structure | DERIVED | 90% |
| **Section → Visual Slot** | Component props | DERIVED | 85% |
| **Brand → Media** | `brand.v1.json` | AUTHORITATIVE | 100% |
| **Projection → Media** | `.generated/*.json` | PROJECTION | 60% (stale) |

### Mapping Gaps

| Gap | Current Solution | Authority | Issues |
|-----|-----------------|-----------|--------|
| Project → Media | `project.media.hero` | AUTHORITATIVE | Missing files |
| Service → Media | Projection system | PROJECTION | Stale, broken references |
| Brand → Media | `brand.v1.json` | AUTHORITATIVE | Missing portrait |
| Section → Slot | Not implemented | UNKNOWN | No slot system |

---

## 9. Current Website → Workbench Semantic Bridge

### Bridge Architecture

**Current State:** NO SEMANTIC BRIDGE EXISTS

The Workbench currently operates as an isolated media library with no connection to the actual website structure.

### Required Bridge Components

1. **Page Structure Mapping**
   - Routes: `/`, `/about`, `/our-work`, `/services`, `/projects/[slug]`, `/services/[slug]`
   - Components: Hero, Services, Featured Projects, Recent Projects, Gallery
   - Sections: Hero, Trust Strip, Services, Transformations, Project Overview

2. **Visual Slot Registration**
   - Homepage Hero: `homepage-hero-slot`
   - About Hero: `about-hero-slot`
   - Service Cards: `service-card-slot[]`
   - Project Heroes: `project-hero-slot[]`
   - Before/After: `before-after-slot[]`
   - Gallery: `gallery-slot[]`

3. **Placement Resolution**
   - Route → Component → Section → Slot → Media ID
   - Currently: NONE (no slot system implemented)

### Bridge Implementation Requirements

1. **Slot Registry Integration**
   - Register all visual slots from components
   - Map slots to current media IDs
   - Resolve slot → page → route hierarchy

2. **Live Website Preview**
   - Render actual website in iframe or side panel
   - Overlay slot indicators on visual elements
   - Enable hover to see slot → media mapping

3. **Drag-and-Drop Targeting**
   - Drag media → slot (not coordinates)
   - Resolve slot to canonical placement
   - Preview replacement at semantic location

---

## 10. Desktop Scrolling/Layout Defect Diagnosis

### Current Workbench Layout Issues

**File:** `src/app/workbench/media/page.tsx`

### Scrolling Problems Identified

1. **Nested Scroll Containers**
   - Current: `h-screen flex flex-col` on main container
   - Issue: Creates nested scroll context
   - Impact: Touchpad scrolling requires focus on correct container

2. **Sidebar Scroll Dependency**
   - Current: Sidebar and main content share scroll context
   - Issue: Scrolling behavior depends on sidebar state
   - Impact: Cannot scroll media grid when sidebar closed/focused

3. **Fixed Header Consumption**
   - Current: Fixed header consumes scroll surface
   - Issue: Reduces available scroll area
   - Impact: Inefficient touchpad scrolling

4. **No Independent Scroll Zones**
   - Current: Single scroll context for entire page
   - Issue: Cannot scroll media grid independently
   - Impact: Poor UX for media management workflow

### Layout Structure Analysis

```tsx
// Current problematic structure
<div className="h-screen flex flex-col bg-background">  // Main scroll container
  <div className="border-b ... px-6 py-4 flex-shrink-0">  // Fixed header
  <div className="border-b ... px-6 py-4 flex-shrink-0">  // Fixed search/filter
  <div className="flex-1 overflow-y-auto p-6">  // Main content scroll
    <div className="grid grid-cols-1 ...">  // Media grid
```

### Required Scrolling Fixes

1. **Independent Scroll Zones**
   - Main media grid: `overflow-y-auto` with independent scroll
   - Sidebar: `overflow-y-auto` only when content exceeds
   - No shared scroll context

2. **Touchpad Optimization**
   - Natural two-finger scrolling on media grid
   - No hover requirement for scroll activation
   - No nested scroll traps

3. **Sidebar Independence**
   - Sidebar state (open/closed) must not affect main scroll
   - Sidebar scroll only when sidebar content overflows
   - Main content scroll always available

4. **Header Non-Interference**
   - Sticky headers should not consume scroll surface
   - Scroll zones should be clearly separated
   - No horizontal scroll interference

---

## 11. Exact Smallest Changes Required

### Phase 1: Fix Missing Canonical Identity (URGENT)

**Change 1: Add missing UUIDs to manifest.v1.json**
- Add UUID v5 for `BATHROOM_WALL.png`
- Add UUID v5 for `HOMESERVICEPROJECTPERGOLAS.jpg`
- Add UUID v5 for `1.png`
- Add UUID v5 for `FLOOR0.jpg`
- **Impact:** Resolves partial identity issues

**Change 2: Fix projects.v1.json project IDs**
- Change `project-featured` → `johnson-cedar-fence`
- Change `project-hp0017` → `thompson-exterior-painting`
- Change `project-hp0018` → `actual fence project`
- **Impact:** Makes project mapping match canonical manifest

### Phase 2: Fix Broken File References (URGENT)

**Change 3: Remove broken project references**
- Remove `Feature-Fence-Photo.jpg` from `project-featured`
- Remove `HP0017_*` files from `project-hp0017`
- Remove `HP0018_*` files from `project-hp0018`
- **Impact:** Eliminates 404 errors, shows actual available projects

**Change 4: Use available canonical projects**
- Map `project-featured` → actual fence project from manifest
- Map painting project → use available repair project temporarily
- **Impact:** Shows real photos instead of broken references

### Phase 3: Add Missing About Us Image (HIGH)

**Change 5: Create portrait asset in media.v1.json**
- Add `portrait.jpeg` with canonical ID `brand-portrait`
- Map to physical files in `public/images/projects/portrait/`
- Update `brand.v1.json` to use correct media ID
- **Impact:** Restores owner portrait on About page

### Phase 4: Fix Workbench Scrolling (HIGH)

**Change 6: Restructure page.tsx layout**
```tsx
// New layout structure
<div className="h-screen flex flex-col bg-background">
  <div className="flex-shrink-0">  // Header (no scroll)
  <div className="flex flex-1 overflow-hidden">  // Split container
    <div className="flex-shrink-0 overflow-y-auto">  // Sidebar (independent scroll)
    <div className="flex-1 overflow-y-auto">  // Main content (independent scroll)
```

**Change 7: Add touchpad optimization**
- Add `overscroll-behavior: contain` to scroll zones
- Ensure scroll zones have minimum height
- Add visual scroll indicators

### Phase 5: Build Semantic Bridge (MEDIUM)

**Change 8: Create slot registry integration**
- Register visual slots from components
- Map current media IDs to slots
- Build slot → page → route hierarchy

**Change 9: Add website preview panel**
- Add right panel to Workbench layout
- Render current website in iframe
- Overlay slot indicators

**Change 10: Implement drag-and-drop targeting**
- Enable drag from media library to slots
- Resolve slot to canonical placement
- Show preview at semantic location

### Implementation Priority

1. **IMMEDIATE (Run current website):** Changes 1-4
2. **HIGH (Fix UX):** Changes 5-7
3. **MEDIUM (Enable future editing):** Changes 8-10

### Success Criteria

✅ **Current website renders without 404 errors**
✅ **All physical files have canonical identity**
✅ **Workbench shows actual available projects**
✅ **Desktop scrolling works independently**
✅ **Semantic bridge exists for future drag-and-drop**
✅ **Can account for every image on August website**

---

## Conclusion

**Current State:** The Media Workbench displays 16 reconciled assets but the actual August website has broken image references and missing files. The canonical infrastructure exists but is not properly connected to the current website implementation.

**Root Causes:**
1. Project ID mismatch between `projects.v1.json` and canonical manifest
2. Missing physical files for referenced project images
3. No semantic bridge between Workbench and actual website
4. Desktop scrolling defects in current layout

**Path Forward:** Fix canonical identity, remove broken references, use available physical files, fix scrolling, then build semantic bridge for future editing functionality.
