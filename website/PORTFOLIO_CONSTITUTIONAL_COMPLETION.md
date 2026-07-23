# Portfolio Photo Constitutional Reconstruction — Complete Report

**Date:** 2026-07-22
**Status:** CONSTITUTIONALLY COMPLETE — all 7 phases verified

---

## Phase 1 — Canonical Path Audit

### Complete Authority Matrix (21 photos)

| # | Physical Original | Media ID | Optimized (web) | Project | Homepage | About | OG/Twitter | JSON-LD | Status |
|---|------------------|----------|-----------------|---------|----------|-------|------------|---------|--------|
| 1 | hero/hero.jpeg | brand-hero | hero-480.webp | (brand) | hero bg | — | — | hero image | **VERIFIED** |
| 2 | featured/featured.jpeg | brand-featured | featured-480.webp | (brand) | — | — | OG image | — | **VERIFIED** |
| 3 | portrait/portrait.jpeg | brand-portrait | portrait-480.webp | (brand) | owner portrait | owner portrait | — | — | **VERIFIED** |
| 4 | Fences/FENCE BUILD.jpg | fences-001-hero | FENCE BUILD-1080.webp | fences-001 | service card | — | project OG | — | **VERIFIED** |
| 5 | Fences/FENCEREBUILDMATCHINGSTAIN.png | fences-001-matching | FENCEREBUILDMATCHINGSTAIN-1080.webp | fences-001 | — | — | — | — | **VERIFIED** |
| 6 | Built-Ins/FINISHEDCARPENTRY.png | builtins-001-hero | FINISHEDCARPENTRY-1080.webp | builtins-001 | service card | — | project OG | — | **VERIFIED** |
| 7 | Built-Ins/FINISHEDCARPENTRY0.png | builtins-001-secondary | FINISHEDCARPENTRY0-1080.webp | builtins-001 | — | — | — | — | **VERIFIED** |
| 8 | Repairs/TRIMREPAIR.png | repairs-001-hero | TRIMREPAIR-1080.webp | repairs-001 | service card | — | project OG | — | **VERIFIED** |
| 9 | Repairs/DRYWALL.png | repairs-001-drywall | DRYWALL-1080.webp | repairs-001 | — | — | — | — | **VERIFIED** |
| 10 | Repairs/FLOOR.png | repairs-001-floor | FLOOR-1080.webp | repairs-001 | — | — | — | — | **VERIFIED** |
| 11 | Repairs/GUTTERCLEANING.jpg | repairs-001-gutter | GUTTERCLEANING-1080.webp | repairs-001 | — | — | — | — | **VERIFIED** |
| 12 | Repairs/FLOOR0.jpg | repairs-001-floor0 | FLOOR0-1080.webp | repairs-001 | — | — | — | — | **VERIFIED** |
| 13 | Repairs/IMG_0544.JPG | repairs-001-img0544 | IMG_0544-480.webp | repairs-001 | — | — | — | — | **VERIFIED** |
| 14 | Repairs/IMG_0546.JPG | repairs-001-img0546 | IMG_0546-480.webp | repairs-001 | — | — | — | — | **VERIFIED** |
| 15 | Outdoor Living/IMG_0535.JPG | outdoor-living-001-hero | IMG_0535-480.webp | outdoor-living-001 | service card | — | project OG | — | **VERIFIED** |
| 16 | Outdoor Living/IMG_0555.JPG | outdoor-living-001-2 | IMG_0555-480.webp | outdoor-living-001 | — | — | — | — | **VERIFIED** |
| 17 | Outdoor Living/IMG_0559.JPG | outdoor-living-001-3 | IMG_0559-480.webp | outdoor-living-001 | — | — | — | — | **VERIFIED** |
| 18 | Outdoor Living/IMG_0737.JPG | outdoor-living-001-4 | IMG_0737-480.webp | outdoor-living-001 | — | — | — | — | **VERIFIED** |
| 19 | Outdoor Living/IMG_0805.JPG | outdoor-living-001-5 | IMG_0805-480.webp | outdoor-living-001 | — | — | — | — | **VERIFIED** |
| 20 | Outdoor Living/IMG_0841.JPG | outdoor-living-001-6 | IMG_0841-480.webp | outdoor-living-001 | — | — | — | — | **VERIFIED** |
| 21 | Bathroom Remodeling/BATHROOM_WALL.png | bathroom-remodeling-001-hero | BATHROOM_WALL-1080.webp | bathroom-remodeling-001 | service card | — | project OG | — | **VERIFIED** |

**Result: 21/21 rows end in VERIFIED.**

### Authority Chain Resolution Paths

```
Homepage Hero:
  page.tsx → getHomepageHero() → brand.v1.json.homepageHero.mediaId
  → getMediaById("brand-hero") → media.v1.json → variants.web
  → /images/projects/hero/hero-480.webp → disk ✓

Owner Portrait:
  page.tsx / about/page.tsx → getOwnerPortrait() → brand.v1.json.ownerPortrait.mediaId
  → getMediaById("brand-portrait") → media.v1.json → variants.web
  → /images/projects/portrait/portrait-480.webp → disk ✓

OG Image (site-wide):
  seo.ts → getMediaById("brand-featured") → media.v1.json → variants.web
  → /images/projects/featured/featured-480.webp → disk ✓

JSON-LD Image:
  layout.tsx → getHomepageHero() → getMediaById("brand-hero") → variants.web
  → /images/projects/hero/hero-480.webp → disk ✓

Project OG Image:
  projects/[slug]/page.tsx → getMediaById(project.media.hero) → variants.web
  → /images/projects/{service}/{FILENAME}-{size}.webp → disk ✓

Service Card Image:
  service-card.tsx → getFeaturedServiceMedia(slug) → projects → hero → media → variants.web
  → disk ✓

Project Gallery:
  project-spotlight.tsx → getMediaById(galleryId) → variants.web → disk ✓
  project-photos.tsx → getProjectMedia(id) → variants.web → disk ✓
```

---

## Phase 2 — Authority Graph Validation

### One-to-One Relationship Verification

```
Original Photo → Canonical Media Record → Optimized Variants → Project Gallery → Service
      ✓                    ✓                      ✓                   ✓              ✓
  21 physical       21 media IDs           63 paths on disk    5 projects      5 services
  files unique      all unique             all verified        all refs valid  all chains resolve
```

### Invariant Checks

| Invariant | Count | Status |
|-----------|-------|--------|
| Duplicate media IDs | 0 | **PASS** |
| Duplicate original filenames | 0 | **PASS** |
| Orphan optimized variants | 0 | **PASS** (all 63 paths on disk) |
| Orphan projects (no media) | 0 | **PASS** (5 projects, all have media) |
| Broken gallery references | 0 | **PASS** (all project gallery IDs exist in media.v1.json) |
| Broken service→project→media chains | 0 | **PASS** (all 5 services with projects resolve) |
| Brand mediaIds pointing to missing records | 0 | **PASS** (brand-hero, brand-featured, brand-portrait all exist) |
| Media records with no physical file | 0 | **PASS** (all 21 have originals on disk) |

---

## Phase 3 — Historical Recovery Sweep

### Recovered from Git History

| File | Commit | Content | Recovery Value |
|------|--------|---------|---------------|
| gallery.json | 33b82e7 | 22 images, 9 projects, full alt text, UUIDs, content hashes | **HIGH** — alt text and project assignments |
| presentation.v1.json | 33b82e7 | 22 photo roles, priorities, homepage curation, service mappings | **HIGH** — already recovered and used |
| gallery.ts | a802874 | 10 hardcoded SVG placeholders | **NONE** — no real photos |
| gallery-grid.tsx | 2913e39 | Gallery grid component | **NONE** — component code, not data |
| gallery.ts (service) | a802874 | GalleryService mock | **NONE** — dead service layer |
| imageRegistry.ts | a802874 | Intent-based image registry | **NONE** — dead code |
| presentation-authority.ts | 33b82e7 | PresentationAuthority class | **NONE** — code, not data |
| Earlier media.v1.json | 6bc8ed9~1 | 15 records with fabricated IDs (cedar-fence-001, deck-remodel-001) | **NONE** — fabricated data, no physical files |

### Alt Text Recovery (from gallery.json)

Gallery.json contained more descriptive alt text than current media.v1.json. Key differences:

| Media ID | Current Alt | Historical Alt (gallery.json) |
|----------|-------------|-------------------------------|
| fences-001-hero | "Completed fence installation" | "Fences — Willamette Valley — hero photo by Happy Place Carpentry" |
| bathroom-remodeling-001-hero | "Bathroom remodeling work" | "Bathroom Remodeling — Willamette Valley — hero photo by Happy Place Carpentry" |
| builtins-001-hero | "Custom built-in shelving" | "Built-Ins — Willamette Valley — hero photo by Happy Place Carpentry" |

**Decision:** Current alt text is more accessible (describes the image content, not the project category). Historical alt text includes photographer credit which is valuable but not critical. Current alt text retained.

### Historical Project Assignments (from gallery.json + presentation.v1.json)

The historical authorities confirm the current project assignments are correct:
- fences/fence-build + fences/fencerebuildmatchingstain → fences service ✓
- built-ins/finishedcarpentry + built-ins/finishedcarpentry0 → built-ins service ✓
- repairs/* (7 images) → repairs service ✓
- outdoor-living/* (6 images) → outdoor-living service ✓
- bathroom-remodeling/bathroom-wall → bathrooms service ✓
- hero, featured, portrait → brand assets ✓
- painting/exterior-painting → painting service (NO PHYSICAL FILE — gap documented)

**No recoverable data changes needed.** Current authority files already contain all recoverable information.

---

## Phase 4 — Brand Media Validation

### Brand Asset Audit

| Asset | Canonical Media ID | Physical Original | Optimized Set | Presentation Role | Status |
|-------|-------------------|-------------------|---------------|-------------------|--------|
| Homepage Hero | brand-hero | hero/hero.jpeg (480×640) | hero-480.webp, hero-480.avif, hero-thumb.webp | HeroBackground | **VERIFIED** |
| Featured Transformation | brand-featured | featured/featured.jpeg (480×640) | featured-480.webp, featured-480.avif, featured-thumb.webp | FeaturedTransformation | **VERIFIED** |
| Owner Portrait | brand-portrait | portrait/portrait.jpeg (640×427) | portrait-480.webp, portrait-480.avif, portrait-thumb.webp | OwnerPortrait | **VERIFIED** |

### Brand Authority Chain

```
brand.v1.json
  homepageHero.mediaId = "brand-hero" → media.v1.json[id=brand-hero] → variants.web → disk ✓
  ownerPortrait.mediaId = "brand-portrait" → media.v1.json[id=brand-portrait] → variants.web → disk ✓
  logo.mediaId = null (no photo — uses SVG) ✓
  office.mediaId = null (no photo) ✓
```

**No gallery entry becomes the authority for brand assets.** Brand assets are resolved exclusively through brand.v1.json → media.v1.json.

---

## Phase 5 — Public Path Audit

### Consumer Resolution Verification (post-fix)

| Consumer | Image | Resolution Path | Authority Layer | Status |
|----------|-------|-----------------|-----------------|--------|
| Homepage hero | hero bg | getHomepageHero → getMediaById → variants.web | brand → media | **VERIFIED** |
| Homepage portrait | owner | getOwnerPortrait → getMediaById → variants.web | brand → media | **VERIFIED** |
| OG/Twitter (site-wide) | featured | getMediaById("brand-featured") → variants.web | media | **VERIFIED** |
| JSON-LD LocalBusiness | hero | getHomepageHero → getMediaById → variants.web | brand → media | **VERIFIED** |
| Project OG image | hero | getMediaById(project.media.hero) → variants.web | media | **VERIFIED** |
| Service cards | featured | getFeaturedServiceMedia → projects → hero → media | services → projects → media | **VERIFIED** |
| Our Work page | hero | getMediaById(project.media.hero) → variants.web | media | **VERIFIED** |
| Project spotlight | hero + gallery | getMediaById(ids) → variants.web | media | **VERIFIED** |
| Project photos | all | getProjectMedia(id) → variants.web | media | **VERIFIED** |
| About page | portrait | getOwnerPortrait → getMediaById → variants.web | brand → media | **VERIFIED** |
| Favicon | — | /brand/favicon.svg (static asset) | N/A | **EXEMPT** |
| Logo | — | /brand/logo-icon.svg (static asset) | N/A | **EXEMPT** |

### Previously Hardcoded Paths — Now Resolved

| File | Before | After | Status |
|------|--------|-------|--------|
| seo.ts ogImage | Hardcoded `/images/projects/featured/featured-480.webp` | Resolves through `getMediaById("brand-featured")` | **FIXED** |
| layout.tsx JSON-LD | Hardcoded `${siteUrl}/images/og-default.svg` | Resolves through `getHomepageHero → getMediaById` | **FIXED** |
| projects/[slug] og:image | Raw media ID string passed as URL | Resolves through `getMediaById(project.media.hero)` | **FIXED** |

### Remaining Exemptions (not authority violations)

| Path | Location | Reason Exempt |
|------|----------|--------------|
| /brand/favicon.svg | layout.tsx icons | Static asset, not a photo |
| /brand/logo-icon.svg | site-header.tsx | Static asset, not a photo |
| /placeholder.jpg | before-after-card.tsx fallback | Unreachable code (component unused in production) |
| /images/og-default.svg | layout.tsx (fallback only) | Fallback when brand hero is null — file exists on disk |

---

## Phase 6 — Image Quality Audit

| Image | Authority | Quality | Issue | Action |
|-------|-----------|---------|-------|--------|
| hero.jpeg | VERIFIED | **NEEDS BETTER SOURCE** | 480×640 — too small for social sharing | Get higher-res original |
| featured.jpeg | VERIFIED | **NEEDS BETTER SOURCE** | 480×640 — too small for social sharing | Get higher-res original |
| portrait.jpeg | VERIFIED | **NEEDS BETTER SOURCE** | 640×427 — too small for social sharing | Get higher-res original |
| IMG_0535-0841 (6 files) | VERIFIED | ADEQUATE | 480px max — source photos are phone-quality | Acceptable for gallery |
| All other project images | VERIFIED | GOOD | 1080px variants available | No action needed |

**Quality gaps are NOT architectural defects.** They are documented as Authority: VERIFIED, Quality: NEEDS BETTER SOURCE. No replacements invented.

---

## Phase 7 — Constitutional Completion Checklist

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Every physical original has exactly one canonical media record | **PASS** | 21 originals → 21 media IDs (0 duplicates) |
| 2 | Every optimized variant belongs to exactly one media record | **PASS** | 63 variant paths, all map to exactly 1 entry |
| 3 | Every project gallery contains unique media | **PASS** | 5 projects, all gallery IDs unique within each project |
| 4 | Every homepage/About image exists and resolves canonically | **PASS** | Hero, portrait, service cards all resolve through authority chain |
| 5 | No duplicate authorities remain | **PASS** | 0 duplicate media IDs, 0 duplicate originals |
| 6 | No orphan optimized variants remain | **PASS** | All 63 paths verified on disk, all belong to a media record |
| 7 | No broken public image paths remain | **PASS** | All consumers resolve through canonical media layer (3 violations fixed) |
| 8 | Every public consumer resolves images through the canonical media layer | **PASS** | 12 consumer sites verified, all route through media.v1.json or brand.v1.json |

**CONSTITUTIONAL COMPLETION: ALL 8 CRITERIA PASS**

---

## Files Modified This Session

| File | Change | Lines |
|------|--------|-------|
| src/config/media.v1.json | Removed duplicate repairs-001-trim | -38 |
| src/config/projects.v1.json | Added 3 missing gallery refs to repairs-001 | +3/-1 |
| src/config/seo.ts | ogImage resolves through getMediaById | +3 |
| src/app/layout.tsx | JSON-LD image resolves through brand authority | +4 |
| src/app/projects/[slug]/page.tsx | og:image resolves through getMediaById | +4 |
| PHOTO_RECONSTRUCTION_REPORT.md | Created | new |

## Commit

```
79d4df8 — fix(media): canonical photo reconstruction — 21 unique records, remove duplicate, restore full gallery
```

## Deployment

- Vercel production: https://website-plum-three-68.vercel.app
- All routes: 200 OK
- All images: serving correctly
- Build: 53 pages, zero TypeScript errors

---

## What the Portfolio Contains (genuinely)

21 photographs across 5 project categories + 3 brand images:

| Category | Photos | Service |
|----------|--------|---------|
| Fences | 2 | fences |
| Built-Ins | 2 | built-ins |
| Repairs | 7 | repairs |
| Outdoor Living | 6 | outdoor-living |
| Bathroom Remodeling | 1 | bathrooms |
| Brand (hero) | 1 | (brand) |
| Brand (featured) | 1 | (brand) |
| Brand (portrait) | 1 | (brand) |
| **Total** | **21** | |

Services with NO project photos (use SVG placeholders): decks, painting, finish-carpentry, restoration, pergolas, adus, pole-barns, flooring.

### Known Gap

`painting/exterior-painting` was planned in historical presentation.v1.json but has no physical photo. Cannot fix without source image.
