# SITE-ORDER PHOTO MAPPING — MAIN@5ba201cd

**Reference Commit**: 5ba201cd354b4cc2ba95f9612c39e08d813ffab1  
**Date**: Aug. 3, 2026  
**Method**: READ-ONLY source code analysis  
**Scope**: Public website scroll order as visitor encounters images

---

## Homepage (/)

| # | Page | Section / Component | Slot | Media ID | Path / Filename | Notes |
|---|------|-------------------|------|----------|----------------|-------|
| 01 | / | Hero section | Background image | None (hardcoded) | `/images/hero-background-enhanced.jpg` | Hardcoded path in page.tsx line 64 |
| 02 | / | Services section | ServiceCard - Painting | None (computed) | `painting-001-hero` via `getFeaturedServiceMedia("painting")` | Highest-ranked painting project hero |
| 03 | / | Services section | ServiceCard - Repairs | None (computed) | `repairs-001-hero` via `getFeaturedServiceMedia("repairs")` | Highest-ranked repairs project hero |
| 04 | / | Services section | ServiceCard - Restoration | None (computed) | `fences-001-hero` via `getFeaturedServiceMedia("restoration")` | Falls back to fences project (no restoration project) |
| 05 | / | Services section | ServiceCard - Fencing | None (computed) | `fences-001-hero` via `getFeaturedServiceMedia("fences")` | Highest-ranked fencing project hero |
| 06 | / | Featured Projects section | Bento grid item 1 | `exterior-painting-001.media.hero` | `painting-001-hero` | Featured project hero (exterior-painting-001) |
| 07 | / | The Family section | Owner portrait | `brand.v1.json.ownerPortrait.mediaId` | `brand-portrait` via `media.v1.json` | Taylor & Lanie portrait |

**Note**: Services marked `archived=true` in services.v1.json (Decks, Built-Ins, Pergolas, Flooring, Historic Restoration, ADUs, Pole Barns) are not displayed on homepage. Only Painting, Repairs, Restoration, and Fencing are `homepageEligible=true` and `archived=false`.

---

## Our Work Page (/our-work)

| # | Page | Section / Component | Slot | Media ID | Path / Filename | Notes |
|---|------|-------------------|------|----------|----------------|-------|
| 08 | /our-work | Hero section | Background | None | None (gradient only) | No image |
| 09 | /our-work | Featured Transformations | BeforeAfterSlider - pergolas-001 before | `pergolas-001.media.before` | `pergolas-001-before` | pergolas-001 is archived=true but still in featuredProjects |
| 10 | /our-work | Featured Transformations | BeforeAfterSlider - pergolas-001 after | `pergolas-001.media.after` | `pergolas-001-after` | Same project (before/after pair) |
| 11 | /our-work | Featured Transformations | BeforeAfterSlider - fences-001 before | `fences-001.media.before` | `fences-001-before` | Not featured in projects.v1.json but shown in featuredProjects slice |
| 12 | /our-work | Featured Transformations | BeforeAfterSlider - fences-001 after | `fences-001.media.after` | `fences-001-after` | Same project (before/after pair) |
| 13 | /our-work | Featured Transformations | BeforeAfterSlider - exterior-painting-001 before | `exterior-painting-001.media.before` | `painting-001-before` | Featured project (before/after pair) |
| 14 | /our-work | Featured Transformations | BeforeAfterSlider - exterior-painting-001 after | `exterior-painting-001.media.after` | `painting-001-after` | Same project (before/after pair) |
| 15 | /our-work | Featured Transformations | BeforeAfterSlider - bathroom-remodeling-001 before | `bathroom-remodeling-001.media.before` | `bathroom-remodeling-001-before` | Not featured in projects.v1.json but shown in featuredProjects slice |
| 16 | /our-work | Featured Transformations | BeforeAfterSlider - bathroom-remodeling-001 after | `bathroom-remodeling-001.media.after` | `bathroom-remodeling-001-after` | Same project (before/after pair) |
| 17 | /our-work | Recent Projects | Project hero - fences-001 | `fences-001.media.hero` | `fences-001-hero` | All non-archived projects shown |
| 18 | /our-work | Recent Projects | Project hero - pergolas-001 | `pergolas-001.media.hero` | `pergolas-001-hero` | archived=true but shown in allProjects |
| 19 | /our-work | Recent Projects | Project hero - builtins-001 | `builtins-001.media.hero` | `builtins-001-hero` | archived=true but shown in allProjects |
| 20 | /our-work | Recent Projects | Project hero - repairs-001 | `repairs-001.media.hero` | `repairs-001-hero` | non-archived |
| 21 | /our-work | Recent Projects | Project hero - exterior-painting-001 | `exterior-painting-001.media.hero` | `painting-001-hero` | non-archived |
| 22 | /our-work | Recent Projects | Project hero - bathroom-remodeling-001 | `bathroom-remodeling-001.media.hero` | `bathroom-remodeling-001-hero` | archived=true but shown in allProjects |
| 23-28 | /our-work | Browse All Work | Gallery - fences-001 | `fences-001.media.gallery[0-5]` | `fences-001-matching`, `fences-001-installation`, `fences-001-detail`, `fences-001-finished`, `fences-001-progress`, `fences-001-gate` | 6 gallery photos |
| 29-31 | /our-work | Browse All Work | Gallery - pergolas-001 | `pergolas-001.media.gallery[0-2]` | `pergolas-001-construction`, `pergolas-001-steel-frame`, `pergolas-001-finished` | 3 gallery photos |
| 32-36 | /our-work | Browse All Work | Gallery - builtins-001 | `builtins-001.media.gallery[0-4]` | `builtins-001-secondary`, `builtins-001-detail`, `builtins-001-installation`, `builtins-001-progress`, `builtins-001-finished` | 5 gallery photos |
| 37-42 | /our-work | Browse All Work | Gallery - repairs-001 | `repairs-001.media.gallery[0-5]` | `repairs-001-drywall`, `repairs-001-floor`, `repairs-001-gutter`, `repairs-001-floor0`, `repairs-001-img0544`, `repairs-001-img0546` | 6 gallery photos |
| 43-54 | /our-work | Browse All Work | Gallery - exterior-painting-001 | `exterior-painting-001.media.gallery[0-11]` | `painting-001-prep`, `painting-001-scraping`, `painting-001-sanding`, `painting-001-priming`, `painting-001-painting`, `painting-001-finished`, `outdoor-living-001-hero`, `outdoor-living-001-2`, `outdoor-living-001-3`, `outdoor-living-001-4`, `outdoor-living-001-5`, `outdoor-living-001-6` | 12 gallery photos |
| 55-60 | /our-work | Browse All Work | Gallery - bathroom-remodeling-001 | `bathroom-remodeling-001.media.gallery[0-5]` | `bathroom-remodeling-001-before`, `bathroom-remodeling-001-during`, `bathroom-remodeling-001-after`, `bathroom-remodeling-001-detail`, `bathroom-remodeling-001-fixtures`, `bathroom-remodeling-001-tile` | 6 gallery photos |

**Total gallery images on /our-work**: 38 photos

---

## Services Page (/services)

| # | Page | Section / Component | Slot | Media ID | Path / Filename | Notes |
|---|------|-------------------|------|----------|----------------|-------|
| 61 | /services | Hero section | Background | None | None (gradient only) | No image |
| 62 | /services | Outdoor Structures | ServiceCard - Fencing | None (computed) | `fences-001-hero` via `getFeaturedServiceMedia("fences")` | Fencing service card |
| 63 | /services | Painting | ServiceCard - Painting | None (computed) | `painting-001-hero` via `getFeaturedServiceMedia("painting")` | Painting service card |
| 64 | /services | Restoration | ServiceCard - Restoration | None (computed) | `fences-001-hero` via `getFeaturedServiceMedia("restoration")` | Falls back to fences (no restoration project) |
| 65 | /services | Repairs | ServiceCard - Repairs | None (computed) | `repairs-001-hero` via `getFeaturedServiceMedia("repairs")` | Repairs service card |
| 66 | /services | Interior Services | ServiceCard - Drywall | None (computed) | UNIDENTIFIED | No non-archived drywall project with hero image |
| 67 | /services | CTA section | No image | None | None | No image |

**Note**: Services page shows all non-archived services. Services with `archived=true` (Decks, Built-Ins, Pergolas, Flooring, Historic Restoration, ADUs, Pole Barns) are not displayed.

---

## About Page (/about)

| # | Page | Section / Component | Slot | Media ID | Path / Filename | Notes |
|---|------|-------------------|------|----------|----------------|-------|
| 68 | /about | Hero section | Owner portrait | `brand.v1.json.ownerPortrait.mediaId` | `brand-portrait` via `media.v1.json` | Taylor & Lanie portrait (same as homepage #07) |
| 69 | /about | Service area | No images | None | None | City cards have no images |
| 70 | /about | CTA section | No image | None | None | No image |

---

## Summary

**Total images encountered in scroll order**: 70

**Image sources**:
- Hardcoded path: 1 (`/images/hero-background-enhanced.jpg`)
- Brand authority: 2 (`brand-portrait` shown twice)
- Service card computed: 6 (some duplicates, some fallbacks)
- Project hero: 6 (some duplicates between pages)
- Before/after pairs: 8 (4 projects × 2 images each)
- Gallery photos: 38 (from 6 projects)

**Projects with gallery photos**:
- fences-001: 6 photos
- pergolas-001: 3 photos
- builtins-001: 5 photos
- repairs-001: 6 photos
- exterior-painting-001: 12 photos
- bathroom-remodeling-001: 6 photos

**UNIDENTIFIED**:
- Drywall service card (no non-archived drywall project with hero image)

**Notes**:
- Projects marked `archived=true` in projects.v1.json (pergolas-001, builtins-001, bathroom-remodeling-001) are still displayed in allProjects and featuredProjects arrays
- Only the `homepageEligible` flag filters homepage service cards
- Service cards with no matching project show icon fallback instead of image
- Before/after slider hides gracefully if before or after media is missing
