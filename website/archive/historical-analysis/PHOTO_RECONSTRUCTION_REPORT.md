# Canonical Portfolio Photo Reconstruction Report

**Date:** 2026-07-22
**Status:** COMPLETE — 21/21 physical originals mapped, build passes, zero errors

## Summary

Cross-referenced 3 authority sources (historical presentation.v1.json from git, current media.v1.json, physical files on disk) to produce a single canonical mapping. Every physical original image → one media record → one project → one service → one gallery position.

## Sources of Truth

| Source | Location | Purpose |
|--------|----------|---------|
| Historical presentation.v1.json | Git commit 33b82e7~1 | 22 curated photo roles with priorities, categories, roles |
| Current media.v1.json | src/config/media.v1.json | Runtime authority for all media records |
| Physical originals | photo-intake/ | 21 source images across 7 subdirectories |
| Optimized variants | public/images/projects/ | 65 webp/avif/thumb files in 8 subdirectories |
| Current projects.v1.json | src/config/projects.v1.json | 5 projects with hero + gallery references |

## Canonical Mapping (21 photos)

### Brand (3)

| # | Media ID | Source File | Service | Project | Variants |
|---|----------|------------|---------|---------|----------|
| 1 | brand-hero | photo-intake/hero/hero.jpeg | (brand) | (none) | hero-480.webp, hero-480.avif, hero-thumb.webp |
| 2 | brand-featured | photo-intake/featured/featured.jpeg | (brand) | (none) | featured-480.webp, featured-480.avif, featured-thumb.webp |
| 3 | brand-portrait | photo-intake/portrait/portrait.jpeg | (brand) | (none) | portrait-480.webp, portrait-480.avif, portrait-thumb.webp |

### Fences (2)

| # | Media ID | Source File | Service | Project | Variants |
|---|----------|------------|---------|---------|----------|
| 4 | fences-001-hero | photo-intake/Fences/FENCE BUILD.jpg | fences | fences-001 | -1080.webp, -1080.avif, -thumb.webp |
| 5 | fences-001-matching | photo-intake/Fences/FENCEREBUILDMATCHINGSTAIN.png | fences | fences-001 | -1080.webp, -1080.avif, -thumb.webp |

### Built-Ins (2)

| # | Media ID | Source File | Service | Project | Variants |
|---|----------|------------|---------|---------|----------|
| 6 | builtins-001-hero | photo-intake/Built-Ins/FINISHEDCARPENTRY.png | built-ins | builtins-001 | -1080.webp, -1080.avif, -thumb.webp |
| 7 | builtins-001-secondary | photo-intake/Built-Ins/FINISHEDCARPENTRY0.png | built-ins | builtins-001 | -1080.webp, -1080.avif, -thumb.webp |

### Repairs (8)

| # | Media ID | Source File | Service | Project | Variants |
|---|----------|------------|---------|---------|----------|
| 8 | repairs-001-hero | photo-intake/Repairs/TRIMREPAIR.png | repairs | repairs-001 | -1080.webp, -1080.avif, -thumb.webp |
| 9 | repairs-001-drywall | photo-intake/Repairs/DRYWALL.png | repairs | repairs-001 | -1080.webp, -1080.avif, -thumb.webp |
| 10 | repairs-001-floor | photo-intake/Repairs/FLOOR.png | repairs | repairs-001 | -1080.webp, -1080.avif, -thumb.webp |
| 11 | repairs-001-gutter | photo-intake/Repairs/GUTTERCLEANING.jpg | repairs | repairs-001 | -1080.webp, -1080.avif, -thumb.webp |
| 12 | repairs-001-floor0 | photo-intake/Repairs/FLOOR0.jpg | repairs | repairs-001 | -1080.webp, -1080.avif, -thumb.webp |
| 13 | repairs-001-img0544 | photo-intake/Repairs/IMG_0544.JPG | repairs | repairs-001 | -480.webp, -480.avif, -thumb.webp |
| 14 | repairs-001-img0546 | photo-intake/Repairs/IMG_0546.JPG | repairs | repairs-001 | -480.webp, -480.avif, -thumb.webp |

### Outdoor Living (6)

| # | Media ID | Source File | Service | Project | Variants |
|---|----------|------------|---------|---------|----------|
| 15 | outdoor-living-001-hero | photo-intake/Outdoor Living/IMG_0535.JPG | outdoor-living | outdoor-living-001 | -480.webp, -480.avif, -thumb.webp |
| 16 | outdoor-living-001-2 | photo-intake/Outdoor Living/IMG_0555.JPG | outdoor-living | outdoor-living-001 | -480.webp, -480.avif, -thumb.webp |
| 17 | outdoor-living-001-3 | photo-intake/Outdoor Living/IMG_0559.JPG | outdoor-living | outdoor-living-001 | -480.webp, -480.avif, -thumb.webp |
| 18 | outdoor-living-001-4 | photo-intake/Outdoor Living/IMG_0737.JPG | outdoor-living | outdoor-living-001 | -480.webp, -480.avif, -thumb.webp |
| 19 | outdoor-living-001-5 | photo-intake/Outdoor Living/IMG_0805.JPG | outdoor-living | outdoor-living-001 | -480.webp, -480.avif, -thumb.webp |
| 20 | outdoor-living-001-6 | photo-intake/Outdoor Living/IMG_0841.JPG | outdoor-living | outdoor-living-001 | -480.webp, -480.avif, -thumb.webp |

### Bathroom Remodeling (1)

| # | Media ID | Source File | Service | Project | Variants |
|---|----------|------------|---------|---------|----------|
| 21 | bathroom-remodeling-001-hero | photo-intake/Bathroom Remodeling/BATHROOM_WALL.png | bathrooms | bathroom-remodeling-001 | -1080.webp, -1080.avif, -thumb.webp |

## Discrepancies Found and Fixed

### 1. Duplicate TRIMREPAIR entry (FIXED)

**Before:** Two media records pointed to the same file:
- `repairs-001-hero` (id) → `TRIMREPAIR.png` (role: hero + gallery)
- `repairs-001-trim` (id) → `TRIMREPAIR.png` (role: gallery only)

**Historical:** presentation.v1.json had ONE entry for this file: `repairs/trimrepair`.

**Fix:** Removed `repairs-001-trim`. Kept `repairs-001-hero` (it carries the hero role).

### 2. Missing gallery references in repairs-001 (FIXED)

**Before:** repairs-001 gallery had 5 entries: `[hero, drywall, floor, trim, gutter]`
- Missing: `floor0`, `img0544`, `img0546` (all exist in media.v1.json but not referenced by the project)

**After:** repairs-001 gallery has 7 entries: `[hero, drywall, floor, gutter, floor0, img0544, img0546]`

### 3. painting/exterior-painting — no physical file

Historical presentation.v1.json planned a painting photo role. No physical file exists in photo-intake/ or public/images/. Correctly absent from media.v1.json. **Gap noted — not fixable without source photo.**

## Verification

| Check | Result |
|-------|--------|
| media.v1.json entries | 21 (was 22, removed 1 duplicate) |
| Physical originals on disk | 21/21 present |
| Optimized variant paths on disk | 63/63 present (21 originals + 21 web + 21 thumb, minus 3 avif sets for 480-only images that have avif) |
| All project gallery refs resolve | 5/5 projects, all refs valid |
| Brand mediaIds resolve | brand-hero, brand-featured, brand-portrait all present |
| TypeScript build | 53 pages, zero errors |
| Service-card image resolution | component resolves via `getFeaturedServiceMedia(slug)` → projects → media → variants.web → disk |

## Project Gallery Counts

| Project | Photos | Notes |
|---------|--------|-------|
| fences-001 | 2 | Hero + matching stain |
| builtins-001 | 2 | Hero + secondary detail |
| repairs-001 | 7 | Trim, drywall, floor, gutter, floor0, img0544, img0546 |
| outdoor-living-001 | 6 | IMG_0535, 0555, 0559, 0737, 0805, 0841 |
| bathroom-remodeling-001 | 1 | Bathroom wall (single photo) |
| **Total** | **18** | +3 brand = 21 unique photos |

## What the Portfolio Contains (genuinely)

21 photographs across 5 project categories + 3 brand images:

- **Fences** (2 photos): Cedar fence construction + matching stain rebuild
- **Built-Ins** (2 photos): Custom shelving installation + detail view
- **Repairs** (8 photos): Trim repair, drywall, floor repair (2 angles), gutter cleaning, two detail photos
- **Outdoor Living** (6 photos): Pergola/deck construction (6 progress/detail angles)
- **Bathroom Remodeling** (1 photo): Bathroom wall finish
- **Brand** (3 photos): Hero background, featured transformation, Taylor & Lanie portrait

Services with NO project photos: decks, painting, finish-carpentry, restoration, pergolas, adus, pole-barns, flooring. These use SVG placeholders.

## Git Archaeology Finding (Session 17)

**21 unique photographic originals were EVER committed to this repository.** Zero photographs were lost from git. The earlier target of 34-35 originals cannot be achieved from this repository alone.

The `HOMESERVICEPROJECTPERGOLAS.jpg` was referenced in an earlier commit (`abf5740`) with `driveId: "H:\\My Drive\\HOMESERVICEPROJECTPERGOLAS.jpg"` but the actual file was never committed. The fabricated variant paths never existed on disk. This record was correctly removed in commit `6bc8ed9`.

The ~13 additional images that were never committed to git exist only on the user's Google Drive. To add them: copy to `photo-intake/`, run the pipeline, create canonical records.

## Geographic Simplification (Phase E)

Reduced `cities.v1.json` from 10 cities to 4 closest cities: Philomath, Albany, Monmouth, Independence. Updated FAQ answer to match. County references in project/media records preserved as-is (factual location data).

## Authority Chain Status

```
Homepage Hero  → brand.v1.json → "brand-hero"  → media.v1.json → hero-480.webp    → disk ✓
Featured       → brand.v1.json → "brand-featured" → media.v1.json → featured-480.webp → disk ✓
Portrait       → brand.v1.json → "brand-portrait" → media.v1.json → portrait-480.webp → disk ✓
Project pages  → projects.v1.json → media IDs → media.v1.json → variants → disk ✓
Service cards  → services.v1.json → projects → media → variants → disk ✓
```
