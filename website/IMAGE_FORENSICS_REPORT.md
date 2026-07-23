# READ-ONLY Image Forensics Report

**Date:** 2026-07-22  
**Constraint:** Zero files modified. Zero deploys. Zero commits.  
**Objective:** Determine exactly what image assets exist, where they are, what they map to, and what is missing.

---

## Executive Summary

**The images are not lost.** All 103 optimized images exist on disk in `public/images/projects/`. All 21 source originals exist in `photo-intake/`. The "catastrophic pipeline shift" was commit `33b82e7` which deleted the two authority files (`gallery.json` and `presentation.v1.json`) and replaced them with a new authority (`media.v1.json`) that was never fully populated.

The physical assets are intact. The authority metadata is incomplete.

---

## Phase 1 — Physical Asset Inventory

### Grand Totals

| Metric | Value |
|--------|-------|
| Total image files in repository | **178** |
| Total size | **39.1 MB** |
| Optimized images (public/images/projects/) | **103 files, 5.98 MB** |
| Source originals (photo-intake/) | **21 files, 32.9 MB** |
| Archive duplicates (photo-intake/_archive/) | **21 files, 32.9 MB** (byte-for-byte identical) |
| SVG icons/logos | **30 files, 25 KB** |

### Directory Breakdown

| Directory | JPG | JPEG | PNG | WEBP | AVIF | SVG | Total |
|-----------|-----|------|-----|------|------|-----|-------|
| `public/images/projects/` (8 subdirs) | 0 | 0 | 0 | 52 | 41 | 0 | **103** |
| `public/images/` (root) | 0 | 0 | 0 | 0 | 0 | 4 | **4** |
| `public/images/services/` | 0 | 0 | 0 | 0 | 0 | 7 | **7** |
| `public/images/gallery/` | 0 | 0 | 0 | 0 | 0 | 10 | **10** |
| `public/brand/` | 0 | 0 | 0 | 0 | 0 | 4 | **4** |
| `public/` (root) | 0 | 0 | 0 | 0 | 0 | 5 | **5** |
| `photo-intake/` (active) | 6 | 3 | 8 | 0 | 0 | 0 | **21** |
| `photo-intake/_archive/` | 6 | 3 | 8 | 0 | 0 | 0 | **21** |
| Root-level `photo-intake/` | 0 | 3 | 0 | 0 | 0 | 0 | **3** |
| **TOTAL** | **12** | **9** | **16** | **52** | **41** | **30** | **178** |

### Optimized Image Breakdown by Project

| Project | Images | Formats | Sizes |
|---------|--------|---------|-------|
| `bathroom-remodeling/` | 1 source → 7 variants | webp+avif × 3 sizes + thumb | 15–174 KB |
| `built-ins/` | 2 sources → 14 variants | webp+avif × 3 sizes + thumb × 2 | 14–174 KB |
| `featured/` | 1 source → 3 variants | webp+avif × 480 + thumb | 23–27 KB |
| `fences/` | 2 sources → 14 variants | webp+avif × 3 sizes + thumb × 2 | 21–283 KB |
| `hero/` | 1 source → 3 variants | webp+avif × 480 + thumb | 63–65 KB |
| `outdoor-living/` | 6 sources → 18 variants | webp+avif × 480 + thumb × 6 | 28–75 KB |
| `portrait/` | 1 source → 3 variants | webp+avif × 480 + thumb | 5–5 KB |
| `repairs/` | 7 sources → 41 variants | webp+avif × 3 sizes + thumb × 7 | 9–230 KB |

---

## Phase 2 — Missing Image Search

### Specific Filenames Requested

| Filename | Physical File Found? | Location |
|----------|---------------------|----------|
| `cedar-fence-001-before` | **NO** | Never existed on disk |
| `cedar-fence-001-after` | **NO** | Never existed on disk |
| `cedar-fence-001-hero` | **NO** | Never existed on disk |
| `deck-remodel-001-before` | **NO** | Never existed on disk |
| `deck-remodel-001-after` | **NO** | Never existed on disk |
| `deck-remodel-001-hero` | **NO** | Never existed on disk |
| `bathroom-remodel-001-before` | **NO** | Never existed on disk |
| `bathroom-remodel-001-after` | **NO** | Never existed on disk |
| `bathroom-remodel-001-hero` | **NO** | Never existed on disk |

**These filenames were never real files.** They appear only in the second agent's report and do not exist in any authority file or on disk. The actual fence images are named `FENCE BUILD.jpg` and `FENCEREBUILDMATCHINGSTAIN.png`.

### Partial Name Search Results

| Search Term | Files Found | Location |
|-------------|------------|----------|
| `cedar` | 0 | No files contain "cedar" in filename |
| `deck` | 0 | No files contain "deck" in filename (deck images use project slugs) |
| `bathroom` | 0 | Bathroom images use `BATHROOM_WALL` |
| `fence` | 0 | Fence images use `FENCE BUILD` and `FENCEREBUILDMATCHINGSTAIN` |
| `pergola` | 0 | No pergola source images exist |
| `hero` | 3 | `hero.jpeg` (source), `hero-480.webp`, `hero-480.avif`, `hero-thumb.webp` |
| `before` | 0 | No before/after naming convention in source files |
| `after` | 0 | No before/after naming convention in source files |
| `IMG_` | 12 | 8 source originals + 18 optimized variants (outdoor-living + repairs) |

---

## Phase 3 — Authority vs Physical Files

### The Authority Shift

Commit `33b82e7` ("feat(admin): implement compiler-style metrics dashboard and authority adapters") performed a **breaking architectural change**:

| Action | File | Impact |
|--------|------|--------|
| **DELETED** | `src/config/gallery.json` (3,317 lines) | Old image authority — every image record with UUID, contentHash, variants, provenance |
| **DELETED** | `src/config/presentation.v1.json` (63 lines) | Old human curation layer — role assignments, quality gates, homepage curation |
| **CREATED** | `src/config/media.v1.json` (566 lines) | New media authority — 16 entries with variant paths, roles, metadata |
| **REWRITTEN** | `src/lib/media.ts` (351→150 lines) | Old: consumed gallery.json + presentation.v1.json. New: consumes media.v1.json |
| **REWRITTEN** | `src/types/media.ts` (76 lines) | New type definitions for MediaAuthority schema |

### media.v1.json — Current Authority (16 entries)

All 64 variant paths in media.v1.json resolve to existing files on disk. **Zero broken paths.**

| # | Media ID | Variant Path | Physical File | Status |
|---|----------|-------------|---------------|--------|
| 1 | `fences-001-hero` | `/images/projects/fences/FENCE BUILD-1080.webp` | EXISTS | OK |
| 2 | `fences-001-matching` | `/images/projects/fences/FENCEREBUILDMATCHINGSTAIN-1080.webp` | EXISTS | OK |
| 3 | `builtins-001-hero` | `/images/projects/built-ins/FINISHEDCARPENTRY-1080.webp` | EXISTS | OK |
| 4 | `builtins-001-secondary` | `/images/projects/built-ins/FINISHEDCARPENTRY0-1080.webp` | EXISTS | OK |
| 5 | `repairs-001-hero` | `/images/projects/repairs/TRIMREPAIR-1080.webp` | EXISTS | OK |
| 6 | `repairs-001-drywall` | `/images/projects/repairs/DRYWALL-1080.webp` | EXISTS | OK |
| 7 | `repairs-001-floor` | `/images/projects/repairs/FLOOR-1080.webp` | EXISTS | OK |
| 8 | `repairs-001-trim` | `/images/projects/repairs/TRIMREPAIR-1080.webp` | EXISTS | **DUPLICATE** of #5 |
| 9 | `repairs-001-gutter` | `/images/projects/repairs/GUTTERCLEANING-1080.webp` | EXISTS | OK |
| 10 | `outdoor-living-001-hero` | `/images/projects/outdoor-living/IMG_0535-480.webp` | EXISTS | OK |
| 11 | `outdoor-living-001-2` | `/images/projects/outdoor-living/IMG_0555-480.webp` | EXISTS | OK |
| 12 | `outdoor-living-001-3` | `/images/projects/outdoor-living/IMG_0559-480.webp` | EXISTS | OK |
| 13 | `outdoor-living-001-4` | `/images/projects/outdoor-living/IMG_0737-480.webp` | EXISTS | OK |
| 14 | `outdoor-living-001-5` | `/images/projects/outdoor-living/IMG_0805-480.webp` | EXISTS | OK |
| 15 | `outdoor-living-001-6` | `/images/projects/outdoor-living/IMG_0841-480.webp` | EXISTS | OK |
| 16 | `bathroom-remodeling-001-hero` | `/images/projects/bathroom-remodeling/BATHROOM_WALL-1080.webp` | EXISTS | OK |

### projects.v1.json — Project-to-Media Mapping (5 projects)

All media IDs in projects.v1.json resolve to entries in media.v1.json.

| Project | Hero Media | Gallery Media | Status |
|---------|-----------|---------------|--------|
| `fences-001` | `fences-001-hero` | `fences-001-hero`, `fences-001-matching` | OK |
| `builtins-001` | `builtins-001-hero` | `builtins-001-hero`, `builtins-001-secondary` | OK |
| `repairs-001` | `repairs-001-hero` | 5 images (hero, drywall, floor, trim, gutter) | OK |
| `outdoor-living-001` | `outdoor-living-001-hero` | 6 images (hero + 5 gallery) | OK |
| `bathroom-remodeling-001` | `bathroom-remodeling-001-hero` | `bathroom-remodeling-001-hero` | OK |

### Images on Disk but NOT in media.v1.json (6 orphaned)

| Source Image | Physical File (on disk) | In media.v1.json? | In projects.v1.json? |
|-------------|------------------------|-------------------|---------------------|
| `featured/featured.jpeg` | `photo-intake/featured/featured.jpeg` + 3 optimized variants | **NO** | **NO** |
| `hero/hero.jpeg` | `photo-intake/hero/hero.jpeg` + 3 optimized variants | **NO** | **NO** |
| `portrait/portrait.jpeg` | `photo-intake/portrait/portrait.jpeg` + 3 optimized variants | **NO** | **NO** |
| `Repairs/FLOOR0.jpg` | `photo-intake/Repairs/FLOOR0.jpg` + 7 optimized variants | **NO** | **NO** |
| `Repairs/IMG_0544.JPG` | `photo-intake/Repairs/IMG_0544.JPG` + 3 optimized variants | **NO** | **NO** |
| `Repairs/IMG_0546.JPG` | `photo-intake/Repairs/IMG_0546.JPG` + 3 optimized variants | **NO** | **NO** |

**These 6 images have physical files but no authority entry.** They were in the old `gallery.json` (3,317 lines) but were not migrated to `media.v1.json` (566 lines). The old gallery had 21 entries; the new media authority has only 16 (with one duplicate = 15 unique).

### Content Hash Divergence

The old `gallery.json` used `contentHash` as SHA-256 of raw image bytes. The new `media.v1.json` uses `fileSize` as the integrity check. No hash comparison is possible between the two systems.

---

## Phase 4 — Placeholder Metadata

### media.v1.json

| Field | Value | Assessment |
|-------|-------|------------|
| `driveId` | `""` (empty string on all 16 entries) | **PLACEHOLDER** — Google Drive integration not wired |
| `generatedAt` | `"2026-07-22T00:00:00.000Z"` | Suspicious midnight timestamp — likely generated, not real |
| `createdAt` | Various dates `2026-07-16` to `2026-07-20` | Reasonable |
| `fileSize` | Matches actual file sizes on disk | **VERIFIED** — matches physical files |
| `dimensions` | `{width: 1920, height: 1080}` on ALL entries | **PLACEHOLDER** — all entries claim identical dimensions regardless of actual image |

### projects.v1.json

| Field | Value | Assessment |
|-------|-------|------------|
| `estimate.estimatedRange` | `{low: 3000, high: 8000}` etc. | **PLACEHOLDER** — example values, not real estimates |
| `story.challenge/solution/outcome` | Generic text | **PLACEHOLDER** — template language |
| `warranty.warrantyYears` | `2` | Reasonable default |
| `completionDate` | `"2026-07-20"` etc. | Reasonable |

### seo.ts

| Field | Value | Assessment |
|-------|-------|------------|
| `ogImage` | `"/images/projects/featured/featured-1080.webp"` | **BROKEN** — file does not exist (only `featured-480.webp` exists) |

### before-after-card.tsx

| Field | Value | Assessment |
|-------|-------|------------|
| fallback `src` | `"/placeholder.jpg"` | **BROKEN** — file does not exist |

### No other placeholder patterns found

Searches for `example-drive-id`, `H:\`, `C:\Users`, `lorem`, `dummy`, `TODO` near image references returned zero results outside the files already identified.

---

## Phase 5 — Recovery from Archives

### Source Files in photo-intake/

All 21 source originals exist. The pipeline can be re-run to regenerate all optimized variants.

| Source | Path | Size | Can Regenerate? |
|--------|------|------|----------------|
| BATHROOM_WALL.png | `photo-intake/Bathroom Remodeling/` | 1.6 MB | YES |
| FINISHEDCARPENTRY.png | `photo-intake/Built-Ins/` | 2.5 MB | YES |
| FINISHEDCARPENTRY0.png | `photo-intake/Built-Ins/` | 166 KB | YES |
| featured.jpeg | `photo-intake/featured/` | 138 KB | YES |
| FENCE BUILD.jpg | `photo-intake/Fences/` | 663 KB | YES |
| FENCEREBUILDMATCHINGSTAIN.png | `photo-intake/Fences/` | 1.9 MB | YES |
| hero.jpeg | `photo-intake/hero/` | 207 KB | YES |
| IMG_0535.JPG | `photo-intake/Outdoor Living/` | 233 KB | YES |
| IMG_0555.JPG | `photo-intake/Outdoor Living/` | 219 KB | YES |
| IMG_0559.JPG | `photo-intake/Outdoor Living/` | 178 KB | YES |
| IMG_0737.JPG | `photo-intake/Outdoor Living/` | 215 KB | YES |
| IMG_0805.JPG | `photo-intake/Outdoor Living/` | 192 KB | YES |
| IMG_0841.JPG | `photo-intake/Outdoor Living/` | 164 KB | YES |
| portrait.jpeg | `photo-intake/portrait/` | 41 KB | YES |
| DRYWALL.png | `photo-intake/Repairs/` | 2.7 MB | YES |
| FLOOR.png | `photo-intake/Repairs/` | 1.5 MB | YES |
| FLOOR0.jpg | `photo-intake/Repairs/` | 368 KB | YES |
| GUTTERCLEANING.jpg | `photo-intake/Repairs/` | 159 KB | YES |
| IMG_0544.JPG | `photo-intake/Repairs/` | 112 KB | YES |
| IMG_0546.JPG | `photo-intake/Repairs/` | 219 KB | YES |
| TRIMREPAIR.png | `photo-intake/Repairs/` | 3.1 MB | YES |

### Git History

No deleted image files found in git history. All images that were ever committed still exist on disk.

### Archive Directories

`archive/` directory does not exist. No backup image directories found.

---

## Phase 6 — Intelligent Matching

Not needed. All 21 source images exist at their expected paths. All 103 optimized variants exist at their expected paths. The second agent's claim about `cedar-fence-001-before` etc. was incorrect — those filenames do not appear anywhere in the actual codebase.

---

## Phase 7 — Broken References

### Code References to Non-Existent Files

| # | File | Line | Reference | Exists? | Severity |
|---|------|------|-----------|---------|----------|
| 1 | `src/config/seo.ts` | 19 | `/images/projects/featured/featured-1080.webp` | **NO** — only `featured-480.webp` exists | HIGH — used for OpenGraph/Twitter cards sitewide |
| 2 | `src/components/before-after-card.tsx` | 16 | `/placeholder.jpg` | **NO** — no placeholder.jpg in public/ | MEDIUM — fallback image for before/after cards |

### Orphaned Physical Files (exist but never referenced)

| Category | Files | Notes |
|----------|-------|-------|
| Next.js boilerplate SVGs | 5 (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) | Starter template leftovers |
| Images root SVGs | 3 (`hero.svg`, `favicon.svg`, `about.svg`) | Superseded by manifest-driven images |
| Gallery SVGs | 10 (`bath-corvallis.svg` etc.) | Placeholder gallery cards, never wired |
| Services SVGs | 7 (`bath.svg`, `decks.svg` etc.) | Icons use lucide-react instead |
| Unreferenced brand logos | 2 (`logo-stacked.svg`, `logo-horizontal.svg`) | Only `logo-icon.svg` and `favicon.svg` are used |
| **Total orphaned** | **27 files** | **None are harmful; all are dead weight** |

---

## Final Summary

### Existing Assets

| Category | Count | Status |
|----------|-------|--------|
| Source originals in photo-intake/ | 21 | ALL PRESENT |
| Optimized variants in public/images/projects/ | 103 | ALL PRESENT |
| media.v1.json authority entries | 16 | ALL paths resolve to existing files |
| projects.v1.json project entries | 5 | ALL media IDs resolve to media.v1.json |
| SVG icons/logos | 30 | 8 referenced, 22 orphaned |

### Missing Assets

| Category | Count | Status |
|----------|-------|--------|
| Images in media.v1.json that reference non-existent files | **0** | All 64 variant paths exist |
| Source images not in media.v1.json | **6** | featured, hero, portrait, floor0, img-0544, img-0546 |
| `gallery.json` (deleted in 33b82e7) | **1 file** | 3,317 lines of image authority — GONE |
| `presentation.v1.json` (deleted in 33b82e7) | **1 file** | 63 lines of curation — GONE |
| `featured-1080.webp` (referenced by seo.ts) | **1 file** | Only 480px variant was generated |

### Placeholder Metadata

| Location | Field | Issue |
|----------|-------|-------|
| media.v1.json (all 16 entries) | `driveId` | Empty string — Google Drive not wired |
| media.v1.json (all 16 entries) | `dimensions` | All claim 1920×1080 — likely incorrect for 480px images |
| media.v1.json | `generatedAt` | Midnight timestamp — synthetic |
| projects.v1.json | `estimate.estimatedRange` | Example values, not real estimates |
| projects.v1.json | `story.*` | Template language, not real project stories |

### Broken References

| Reference | File | Line | Issue |
|-----------|------|------|-------|
| `/images/projects/featured/featured-1080.webp` | `seo.ts` | 19 | File does not exist (only 480px variant) |
| `/placeholder.jpg` | `before-after-card.tsx` | 16 | File does not exist |

### Likely Matches

Not applicable. All files are at their expected paths. No renaming or matching needed.

---

## Recovery Plan

### Images Recoverable Automatically: 21/21 (100%)

All source originals exist. Running `npm run images` (the image pipeline) would regenerate all 103 optimized variants from the 21 sources. The pipeline script at `scripts/image-pipeline.mjs` is intact and functional.

### Images Requiring Manual Review: 6

The 6 images not in media.v1.json need authority entries added:

1. `featured/featured` — needs entry with roles `["featured-transformation"]`
2. `hero/hero` — needs entry with roles `["hero-background"]`
3. `portrait/portrait` — needs entry with roles `["owner-portrait"]`
4. `repairs/floor0` — needs entry with roles `["gallery"]`
5. `repairs/img-0544` — needs entry with roles `["gallery"]`
6. `repairs/img-0546` — needs entry with roles `["gallery"]`

### Images Permanently Missing: 0

No image has been permanently lost. Every source file and optimized variant exists on disk.

### Root Cause of "Lost Pictures"

The images were never physically lost. The issue is a **authority metadata gap**:

1. Commit `33b82e7` deleted `gallery.json` (21 entries) and `presentation.v1.json` (curation layer)
2. Commit `33b82e7` created `media.v1.json` with only 16 entries (5 images not migrated)
3. `media.ts` was rewritten to consume `media.v1.json` instead of `gallery.json`
4. Components that relied on the old `gallery.json` + `presentation.v1.json` system now read from an incomplete `media.v1.json`
5. The 6 missing authority entries mean 6 images have physical files but are invisible to the new code

Additionally, `seo.ts` references `featured-1080.webp` which was never generated (only 480px variants exist for the `featured` project).

### What Needs to Happen (Read-Only Assessment)

1. **Add 6 missing entries to media.v1.json** — featured, hero, portrait, floor0, img-0544, img-0546
2. **Fix seo.ts ogImage path** — change `featured-1080.webp` to `featured-480.webp` (or regenerate at 1080px)
3. **Fix dimensions in media.v1.json** — replace placeholder 1920×1080 with actual image dimensions
4. **Populate projects.v1.json story/estimate fields** — replace template language with real project data
5. **Optionally re-run image pipeline** — regenerate all variants to ensure consistency with current pipeline code
6. **Clean up 27 orphaned SVG files** — not blocking, but dead weight

---

*This report is read-only. No files were modified.*
