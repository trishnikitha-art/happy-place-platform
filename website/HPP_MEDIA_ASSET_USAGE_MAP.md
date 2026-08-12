# HPP Media Asset Usage Map

**Generated:** 2026-08-11
**Purpose:** Complete forensic inventory of all media usage across HPP website
**Goal:** Identify ALL actual media in use, their sources, and their constitutional status

---

## EXECUTIVE SUMMARY

### TOTAL MEDIA IN USE
- **Brand Authority:** 1 asset (logo) - hardcoded in 9 locations
- **Homepage Hero:** 1 asset (hero-background-enhanced.jpg) - hardcoded, bypasses constitution
- **Service Cards:** 8 services - use constitutional projections
- **Projects:** 3 projects - use constitutional media registry
- **Total Unique Assets:** ~12 distinct media items

### CONSTITUTIONAL STATUS
- ✅ **Constitutional:** Service cards, Projects
- ❌ **Non-Constitutional:** Homepage hero, Logo
- 🔄 **Partially Constitutional:** Projects (hero filename references, but variants incomplete)

---

## DETAILED ASSET MAP

### 1. BRAND AUTHORITY (LOGO)

**Asset:** Logo
**Source:** `/brand/logo.png`
**Authority:** brand.v1.json (separate from media authority)
**Status:** ❌ NON-CONSTITUTIONAL - hardcoded in components

**Usage Locations (9):**
1. `src/app/estimate/page.tsx:23` - `<Image src="/brand/logo.png">`
2. `src/app/reviews/page.tsx:27` - `<Image src="/brand/logo.png">`
3. `src/app/newsletter/thank-you/page.tsx:23` - `<Image src="/brand/logo.png">`
4. `src/app/contact/page.tsx:24` - `<Image src="/brand/logo.png">`
5. `src/app/about/page.tsx:33` - `<Image src="/brand/logo.png">`
6. `src/components/site-footer.tsx:22` - `<Image src="/brand/logo.png">`
7. `src/components/site-header.tsx:92` - `<Image src="/brand/logo.png">`
8. `src/app/not-found.tsx:13` - `<Image src="/brand/logo.png">`

**Canonical Files (brand authority):**
- `/brand/logo-horizontal.svg`
- `/brand/logo-icon.svg`
- `/brand/logo-stacked.svg`
- `/brand/logo.png`

**Issue:** Components use hardcoded `/brand/logo.png` instead of brand authority resolution

---

### 2. HOMEPAGE HERO

**Asset:** Homepage Hero
**Source:** `/images/hero-background-enhanced.jpg`
**Authority:** Constitutional projection (hero-projection.json) + media.v1.json
**Status:** ❌ NON-CONSTITUTIONAL - hardcoded, bypasses projection system

**Usage Location:**
1. `src/app/page.tsx:68` - `<Image src="/images/hero-background-enhanced.jpg">`

**Constitutional Path (EXISTS BUT BYPASSED):**
- `brand.ts::getHomepageHero()` - exists and imported
- `page.tsx:25` - imports getHomepageHero
- `page.tsx:30` - calls getHomepageHero for metadata only
- `page.tsx:68` - IGNORES constitutional path, uses hardcoded image

**Constitutional Metadata:**
- `hero-projection.json`: heroMediaId = "homepage-hero-canonical"
- `media.v1.json`: id = "homepage-hero-canonical", filename = "hero-background-enhanced.jpg"
- `brand.v1.json`: homepageHero.mediaId = "homepage-hero-canonical"

**Issue:** Constitutional infrastructure exists but page.tsx Image component ignores it

---

### 3. SERVICE CARDS

**Authority:** Service projection (service-projection.json)
**Status:** ✅ CONSTITUTIONAL

**Components Using Constitutional Path:**
- `src/components/service-card.tsx:23` - `getServicePreviewMedia(service.slug)`

**Services (8):**
1. Painting - `getServicePreviewMedia("painting")`
2. Fencing - `getServicePreviewMedia("fencing")`
3. Decks - `getServicePreviewMedia("decks")`
4. Pergolas - `getServicePreviewMedia("pergolas")`
5. Kitchens - `getServicePreviewMedia("kitchens")`
6. Bathrooms - `getServicePreviewMedia("bathrooms")`
7. Finish Carpentry - `getServicePreviewMedia("finish-carpentry")`
8. Restoration - `getServicePreviewMedia("restoration")`

**Constitutional Flow:**
```
service-projection.json
  ↓
getServicePreviewMedia()
  ↓
media.v1.json (lookup by filename)
  ↓
variants.web or variants.original
  ↓
ServiceCard Image component
```

**Status:** ✅ Working correctly

---

### 4. PROJECT MEDIA

**Authority:** Projects.v1.json + media.v1.json
**Status:** ✅ CONSTITUTIONAL (mostly)

**Components Using Constitutional Path:**
- `src/components/project-spotlight.tsx:38-40` - `getMediaById(project.media.hero)`
- `src/components/project-photos.tsx:32-40` - `getMediaById()` for gallery

**Projects (3):**

#### Project 1: Featured Projects
- **ID:** project-featured
- **Slug:** featured
- **Service:** fencing
- **Hero Media:** Feature-Fence-Photo.jpg
- **Before:** null
- **After:** null
- **Gallery:** []

#### Project 2: Exterior Painting
- **ID:** project-hp0017
- **Slug:** exterior-painting
- **Service:** painting
- **Hero Media:** HP0017_ExteriorPainting_After.jpg
- **Before:** 2ebc9012-b788-5045-809c-9013d31f42be (UUID reference)
- **After:** 1ebc9012-b788-5045-809c-9013d31f42be (UUID reference)
- **Gallery:** []

#### Project 3: Fence Installation
- **ID:** project-hp0018
- **Slug:** fence-installation
- **Service:** fencing
- **Hero Media:** HP0018_FenceInstallation_Exterior_SideStained_After.jpg
- **Before:** null
- **After:** null
- **Gallery:** []

**Issue:** Some hero filenames may not exist in media.v1.json yet

---

### 5. OTHER IMAGE-USING COMPONENTS

**Before/After Slider:**
- `src/components/before-after-slider.tsx:15` - imports Image
- **Usage:** Renders before/after comparison
- **Status:** Needs investigation for actual media usage

**Review Cards:**
- `src/components/review-card.tsx:3` - imports Image
- **Status:** Needs investigation for actual media usage

**Featured Review:**
- `src/components/featured-review.tsx:1` - imports Image
- **Status:** Needs investigation for actual media usage

**Before/After Card:**
- `src/components/before-after-card.tsx:1` - imports Image
- **Status:** Needs investigation for actual media usage

**Parallax Image:**
- `src/components/parallax-image.tsx:4` - imports Image
- **Status:** Needs investigation for actual media usage

---

## CONSTITUTIONAL GAP ANALYSIS

### GAP 1: Homepage Hero Hardcoded Path
**Severity:** HIGH
**Issue:** page.tsx uses hardcoded `/images/hero-background-enhanced.jpg` instead of constitutional projection
**Fix:** Replace hardcoded path with constitutional resolution

### GAP 2: Logo Hardcoded Path
**Severity:** MEDIUM
**Issue:** 9 components use hardcoded `/brand/logo.png` instead of brand authority
**Fix:** Resolve logo through brand authority adapter

### GAP 3: Project Hero Missing from Media Registry
**Severity:** MEDIUM
**Issue:** Some project hero filenames may not exist in media.v1.json
**Fix:** Ensure all project hero filenames are in media.v1.json with proper variants

### GAP 4: Before/After UUID References
**Severity:** LOW
**Issue:** Before/after fields use UUIDs instead of filenames (inconsistent)
**Fix:** Standardize on filename references or ensure UUIDs resolve correctly

---

## MEDIA REGISTRY INVENTORY

### media.v1.json (Current State: 4 assets)

1. **homepage-hero-canonical**
   - Filename: hero-background-enhanced.jpg
   - Variants: original, web
   - Roles: hero
   - Status: ✅ Canonical

2. **d9cd3d37-eea1-54a9-92f6-abd1e1f71c58**
   - Filename: Feature-Fence-Photo.jpg
   - Variants: original, web
   - Roles: gallery
   - Status: ✅ Canonical

3. **1ebc9012-b788-5045-809c-9013d31f42be**
   - Filename: HP0017_ExteriorPainting_After.jpg
   - Variants: original, web
   - Roles: after
   - Status: ✅ Canonical

4. **2ebc9012-b788-5045-809c-9013d31f42be**
   - Filename: HP0017_ExteriorPainting_Before.jpg
   - Variants: original, web
   - Roles: before
   - Status: ✅ Canonical

### Missing from media.v1.json:
- HP0018_FenceInstallation_Exterior_SideStained_After.jpg (project-hp0018 hero)
- Service preview images (8 services)

---

## RECOMMENDED FIXES

### Priority 1: Fix Homepage Hero Constitutional Path
1. Remove hardcoded `/images/hero-background-enhanced.jpg` from page.tsx
2. Use `getHomepageHero()` → `getHomepageHeroMedia()` → constitutional resolution
3. Verify hero displays correctly

### Priority 2: Ensure All Project Heroes in Media Registry
1. Add HP0018_FenceInstallation_Exterior_SideStained_After.jpg to media.v1.json
2. Add all service preview images to media.v1.json
3. Regenerate projections

### Priority 3: Standardize Before/After References
1. Decide on filename vs UUID references
2. Update projects.v1.json to match chosen convention
3. Ensure resolution logic works

### Priority 4: Logo Brand Authority Resolution
1. Create brand authority adapter for logo resolution
2. Update 9 components to use brand authority
3. Test logo displays correctly

---

## NEXT STEPS

1. **PHASE 2 COMPLETE:** Asset/usage map created
2. **PHASE 3:** Connect existing infrastructure (Drive → ingestion → canonical → variants → projections)
3. **PHASE 4:** Automatically map all HPP media to constitutional model
4. **PHASE 5:** Build Workbench library UI over existing state
5. **PHASE 6:** Verify with typecheck, build, dev server, browser
6. **PHASE 7:** Surgical corrections only if needed
