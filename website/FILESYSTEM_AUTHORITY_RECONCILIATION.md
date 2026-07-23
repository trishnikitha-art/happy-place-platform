# Filesystem → Authority Reconciliation Report

**Date:** 2026-07-22
**Method:** Read-only audit. No files moved, renamed, or created.
**Principle:** Filesystem is truth. Authority records reference filesystem. Never the reverse.

---

## 1. Physical File Inventory

### photo-intake/ — Source Originals

| # | Subdirectory | Filename | Exists |
|---|-------------|----------|--------|
| 1 | Bathroom Remodeling | BATHROOM_WALL.png | YES |
| 2 | Built-Ins | FINISHEDCARPENTRY.png | YES |
| 3 | Built-Ins | FINISHEDCARPENTRY0.png | YES |
| 4 | featured | featured.jpeg | YES |
| 5 | Fences | FENCE BUILD.jpg | YES |
| 6 | Fences | FENCEREBUILDMATCHINGSTAIN.png | YES |
| 7 | hero | hero.jpeg | YES |
| 8 | Outdoor Living | IMG_0535.JPG | YES |
| 9 | Outdoor Living | IMG_0555.JPG | YES |
| 10 | Outdoor Living | IMG_0559.JPG | YES |
| 11 | Outdoor Living | IMG_0737.JPG | YES |
| 12 | Outdoor Living | IMG_0805.JPG | YES |
| 13 | Outdoor Living | IMG_0841.JPG | YES |
| 14 | portrait | portrait.jpeg | YES |
| 15 | Repairs | DRYWALL.png | YES |
| 16 | Repairs | FLOOR.png | YES |
| 17 | Repairs | FLOOR0.jpg | YES |
| 18 | Repairs | GUTTERCLEANING.jpg | YES |
| 19 | Repairs | IMG_0544.JPG | YES |
| 20 | Repairs | IMG_0546.JPG | YES |
| 21 | Repairs | TRIMREPAIR.png | YES |

**Total active source files: 21**

photo-intake/_archive/ contains 21 identical copies (byte-for-byte same files in lowercase directory names). Archive is redundant.

### public/images/projects/ — Optimized Variants

| Subdirectory | Source Image | Variants Generated |
|-------------|-------------|-------------------|
| bathroom-remodeling/ | BATHROOM_WALL | 480, 768, 1080 (webp+avif) + thumb = **7** |
| built-ins/ | FINISHEDCARPENTRY | 480, 768, 1080 (webp+avif) + thumb = **7** |
| built-ins/ | FINISHEDCARPENTRY0 | 480, 768, 1080 (webp+avif) + thumb = **7** |
| featured/ | featured | 480 (webp+avif) + thumb = **3** |
| fences/ | FENCE BUILD | 480, 768, 1080 (webp+avif) + thumb = **7** |
| fences/ | FENCEREBUILDMATCHINGSTAIN | 480, 768, 1080 (webp+avif) + thumb = **7** |
| hero/ | hero | 480 (webp+avif) + thumb = **3** |
| outdoor-living/ | IMG_0535 | 480 (webp+avif) + thumb = **3** |
| outdoor-living/ | IMG_0555 | 480 (webp+avif) + thumb = **3** |
| outdoor-living/ | IMG_0559 | 480 (webp+avif) + thumb = **3** |
| outdoor-living/ | IMG_0737 | 480 (webp+avif) + thumb = **3** |
| outdoor-living/ | IMG_0805 | 480 (webp+avif) + thumb = **3** |
| outdoor-living/ | IMG_0841 | 480 (webp+avif) + thumb = **3** |
| portrait/ | portrait | 480 (webp+avif) + thumb = **3** |
| repairs/ | DRYWALL | 480, 768, 1080 (webp+avif) + thumb = **7** |
| repairs/ | FLOOR | 480, 768, 1080 (webp+avif) + thumb = **7** |
| repairs/ | FLOOR0 | 480, 768, 1080 (webp+avif) + thumb = **7** |
| repairs/ | GUTTERCLEANING | 480, 768, 1080 (webp+avif) + thumb = **7** |
| repairs/ | IMG_0544 | 480 (webp+avif) + thumb = **3** |
| repairs/ | IMG_0546 | 480 (webp+avif) + thumb = **3** |
| repairs/ | TRIMREPAIR | 480, 768, 1080 (webp+avif) + thumb = **7** |

**Total optimized files on disk: 103**
**All 103 files exist and are valid.**

---

## 2. Authority Record Inventory

### media.v1.json — 16 entries

| # | Media ID | Source File | projectId | service | roles | Variants On Disk |
|---|----------|------------|-----------|---------|-------|-----------------|
| 1 | fences-001-hero | FENCE BUILD.jpg | fences-001 | fences | hero, gallery | 7/7 YES |
| 2 | fences-001-matching | FENCEREBUILDMATCHINGSTAIN.png | fences-001 | fences | gallery | 7/7 YES |
| 3 | builtins-001-hero | FINISHEDCARPENTRY.png | builtins-001 | built-ins | hero, gallery | 7/7 YES |
| 4 | builtins-001-secondary | FINISHEDCARPENTRY0.png | builtins-001 | built-ins | gallery | 7/7 YES |
| 5 | repairs-001-hero | TRIMREPAIR.png | repairs-001 | repairs | hero, gallery | 7/7 YES |
| 6 | repairs-001-drywall | DRYWALL.png | repairs-001 | repairs | gallery | 7/7 YES |
| 7 | repairs-001-floor | FLOOR.png | repairs-001 | repairs | gallery | 7/7 YES |
| 8 | repairs-001-trim | TRIMREPAIR.png | repairs-001 | repairs | gallery | 7/7 YES |
| 9 | repairs-001-gutter | GUTTERCLEANING.jpg | repairs-001 | repairs | gallery | 7/7 YES |
| 10 | outdoor-living-001-hero | IMG_0535.JPG | outdoor-living-001 | outdoor-living | hero, gallery | 3/3 YES |
| 11 | outdoor-living-001-2 | IMG_0555.JPG | outdoor-living-001 | outdoor-living | gallery | 3/3 YES |
| 12 | outdoor-living-001-3 | IMG_0559.JPG | outdoor-living-001 | outdoor-living | gallery | 3/3 YES |
| 13 | outdoor-living-001-4 | IMG_0737.JPG | outdoor-living-001 | outdoor-living | gallery | 3/3 YES |
| 14 | outdoor-living-001-5 | IMG_0805.JPG | outdoor-living-001 | outdoor-living | gallery | 3/3 YES |
| 15 | outdoor-living-001-6 | IMG_0841.JPG | outdoor-living-001 | outdoor-living | gallery | 3/3 YES |
| 16 | bathroom-remodeling-001-hero | BATHROOM_WALL.png | bathroom-remodeling-001 | bathrooms | hero, gallery | 7/7 YES |

**All 16 variant paths resolve to existing files. No broken references within media.v1.json.**
**All 16 have `driveId: ""` (empty placeholder).**
**All 16 have `dimensions: { width: 1920, height: 1080 }` regardless of actual image size (placeholder).**

### projects.v1.json — 5 projects

| # | Project ID | Media Hero | Media Gallery | References Resolve? |
|---|-----------|-----------|--------------|-------------------|
| 1 | fences-001 | fences-001-hero | fences-001-hero, fences-001-matching | YES |
| 2 | builtins-001 | builtins-001-hero | builtins-001-hero, builtins-001-secondary | YES |
| 3 | repairs-001 | repairs-001-hero | repairs-001-hero, repairs-001-drywall, repairs-001-floor, repairs-001-trim, repairs-001-gutter | YES |
| 4 | outdoor-living-001 | outdoor-living-001-hero | outdoor-living-001-hero through outdoor-living-001-6 | YES |
| 5 | bathroom-remodeling-001 | bathroom-remodeling-001-hero | bathroom-remodeling-001-hero | YES |

**All 16 media references in projects.v1.json resolve to existing media.v1.json entries.**
**All estimate data contains example values (placeholder).**

### manifest.v1.json — 21 assets

All 21 source images from photo-intake/ have entries. All variant paths resolve to existing files on disk.

### brand.v1.json — Brand Authority

| Asset | mediaId | What Happens |
|-------|---------|-------------|
| homepageHero | **null** | `getHomepageHero().mediaId` = null → `getMediaById(null)` = null → **NO HERO IMAGE** |
| ownerPortrait | **null** | `getOwnerPortrait().mediaId` = null → `getMediaById(null)` = null → **NO PORTRAIT** |
| logo | **null** | Logo not rendered |
| team | [] | Empty array |
| office | null | Office photo not rendered |

---

## 3. The Complete Authority Chain

```
Homepage Component
       │
       ├─ getHomepageHero() → brand.v1.json → { mediaId: null }
       │                                          │
       │                                    getMediaById(null) → null
       │                                          │
       │                                    heroBg = null → NO IMAGE RENDERED
       │
       ├─ getOwnerPortrait() → brand.v1.json → { mediaId: null }
       │                                          │
       │                                    getMediaById(null) → null
       │                                          │
       │                                    ownerSrc = null → NO IMAGE RENDERED
       │
       ├─ getFeaturedProjects() → projects.v1.json → [5 projects]
       │         │
       │         ├─ cedar-fence-001? → NOT FOUND (project doesn't exist)
       │         │
       │         └─ Each project has media.hero → media.v1.json → variant URLs
       │                                                          → all resolve to disk ✓
       │
       └─ ServiceCard(s) → getFeaturedServiceMedia(slug)
                │
                └─ projects.v1.json → hero media ID → media.v1.json → variant URLs
                                                                      → all resolve to disk ✓
```

**Break point:** brand.v1.json has `mediaId: null` for all assets. The chain from brand → media is severed.

---

## 4. One-to-One Mapping: Every Physical File

### Source Files → Authority Status

| Source File (photo-intake/) | manifest.v1.json | media.v1.json | Optimized On Disk | Status |
|---------------------------|-----------------|--------------|-------------------|--------|
| Bathroom Remodeling/BATHROOM_WALL.png | YES (id: bathroom-remodeling/bathroom-wall) | YES (bathroom-remodeling-001-hero) | YES (7 variants) | **LINKED** |
| Built-Ins/FINISHEDCARPENTRY.png | YES (id: built-ins/finishedcarpentry) | YES (builtins-001-hero) | YES (7 variants) | **LINKED** |
| Built-Ins/FINISHEDCARPENTRY0.png | YES (id: built-ins/finishedcarpentry0) | YES (builtins-001-secondary) | YES (7 variants) | **LINKED** |
| **featured/featured.jpeg** | YES (id: featured/featured) | **NO** | YES (3 variants) | **ORPHANED** |
| Fences/FENCE BUILD.jpg | YES (id: fences/fence-build) | YES (fences-001-hero) | YES (7 variants) | **LINKED** |
| Fences/FENCEREBUILDMATCHINGSTAIN.png | YES (id: fences/fencerebuildmatchingstain) | YES (fences-001-matching) | YES (7 variants) | **LINKED** |
| **hero/hero.jpeg** | YES (id: hero/hero) | **NO** | YES (3 variants) | **ORPHANED** |
| Outdoor Living/IMG_0535.JPG | YES (id: outdoor-living/img-0535) | YES (outdoor-living-001-hero) | YES (3 variants) | **LINKED** |
| Outdoor Living/IMG_0555.JPG | YES (id: outdoor-living/img-0555) | YES (outdoor-living-001-2) | YES (3 variants) | **LINKED** |
| Outdoor Living/IMG_0559.JPG | YES (id: outdoor-living/img-0559) | YES (outdoor-living-001-3) | YES (3 variants) | **LINKED** |
| Outdoor Living/IMG_0737.JPG | YES (id: outdoor-living/img-0737) | YES (outdoor-living-001-4) | YES (3 variants) | **LINKED** |
| Outdoor Living/IMG_0805.JPG | YES (id: outdoor-living/img-0805) | YES (outdoor-living-001-5) | YES (3 variants) | **LINKED** |
| Outdoor Living/IMG_0841.JPG | YES (id: outdoor-living/img-0841) | YES (outdoor-living-001-6) | YES (3 variants) | **LINKED** |
| **portrait/portrait.jpeg** | YES (id: portrait/portrait) | **NO** | YES (3 variants) | **ORPHANED** |
| Repairs/DRYWALL.png | YES (id: repairs/drywall) | YES (repairs-001-drywall) | YES (7 variants) | **LINKED** |
| Repairs/FLOOR.png | YES (id: repairs/floor) | YES (repairs-001-floor) | YES (7 variants) | **LINKED** |
| **Repairs/FLOOR0.jpg** | YES (id: repairs/floor0) | **NO** | YES (7 variants) | **ORPHANED** |
| Repairs/GUTTERCLEANING.jpg | YES (id: repairs/guttercleaning) | YES (repairs-001-gutter) | YES (7 variants) | **LINKED** |
| **Repairs/IMG_0544.JPG** | YES (id: repairs/img-0544) | **NO** | YES (3 variants) | **ORPHANED** |
| **Repairs/IMG_0546.JPG** | YES (id: repairs/img-0546) | **NO** | YES (3 variants) | **ORPHANED** |
| Repairs/TRIMREPAIR.png | YES (id: repairs/trimrepair) | YES (repairs-001-hero, repairs-001-trim) | YES (7 variants) | **LINKED** |

### Summary

| Status | Count | Files |
|--------|-------|-------|
| **LINKED** (source → manifest → media → disk) | 15 | All source images that have both manifest and media entries |
| **ORPHANED** (source → manifest → disk, but NO media entry) | 6 | featured, hero, portrait, FLOOR0, IMG_0544, IMG_0546 |

---

## 5. Structural Violations

### V1 — brand.v1.json has null mediaIds
**Severity:** CRITICAL
**Impact:** Homepage hero and owner portrait render nothing.
**Evidence:** `brand.v1.json` line 6: `"mediaId": null`, line 14: `"mediaId": null`.
**Fix:** Set `homepageHero.mediaId` to a media.v1.json ID (e.g., `"fences-001-hero"` or create a dedicated hero entry). Set `ownerPortrait.mediaId` to a media.v1.json ID (e.g., create an entry for portrait.jpeg).
**Note:** 6 source images have no media.v1.json entry at all, so brand.v1.json cannot reference them until entries are created.

### V2 — 6 source images missing from media.v1.json
**Severity:** HIGH
**Impact:** Images exist on disk and in manifest.v1.json but are invisible to the media resolution layer.
**Evidence:** See ORPHANED rows in Section 4.
**Fix:** Add 6 entries to media.v1.json. Do NOT invent files. Use exact source filenames and variant paths that already exist on disk.

### V3 — media.v1.json variant key mismatch
**Severity:** MEDIUM
**Impact:** Components access `variants.web` but media.v1.json uses key `webp`.
**Evidence:** `page.tsx:26`: `heroMedia?.variants?.web`. `media.v1.json:16`: `"webp": "/images/projects/fences/FENCE BUILD-1080.webp"`.
**Fix:** Either rename `webp` → `web` in media.v1.json, or update component code to access `variants.webp`.

### V4 — TRIMREPAIR.png referenced twice in media.v1.json
**Severity:** LOW
**Impact:** Same physical file has two authority entries (repairs-001-hero and repairs-001-trim) with identical variant paths. Not a bug — intentional dual-role — but worth noting.
**Evidence:** media.v1.json lines 146-178 (repairs-001-hero) and lines 250-283 (repairs-001-trim). Same filename, same variants.
**Fix:** None required. Both entries point to the same valid files.

### V5 — Outdoor Living images only have 480px variants
**Severity:** LOW
**Impact:** All 6 outdoor-living images have only 480px variants (no 768px or 1080px). Other projects have full breakpoint sets. This means outdoor-living gallery images will appear smaller/less detailed on large screens.
**Evidence:** manifest.v1.json shows outdoor-living source images are 480×640 or 640×480 (phone photos). Pipeline correctly skipped larger breakpoints because source was too small.
**Fix:** Get higher-resolution source photos for outdoor-living if larger display is desired.

### V6 — hero.jpeg and featured.jpeg are low-resolution source photos
**Severity:** LOW
**Impact:** hero.jpeg is 480×640, featured.jpeg is 480×640. Both are phone-quality photos. Only 480px variants generated. Homepage hero will be upscaled.
**Evidence:** manifest.v1.json lines 212-213 (featured: 480×640), lines 339-340 (hero: 480×640).
**Fix:** Get higher-resolution source photos for hero and featured if homepage display quality matters.

### V7 — portrait.jpeg is 640×427 (very low resolution)
**Severity:** LOW
**Impact:** Owner portrait will be upscaled on all displays.
**Evidence:** manifest.v1.json line 543: width: 640, height: 427.
**Fix:** Get a higher-resolution portrait photo.

### V8 — photo-intake/_archive/ contains 21 redundant copies
**Severity:** INFO
**Impact:** No functional impact. 21 identical files taking up disk space.
**Evidence:** All files in `_archive/` are byte-for-byte identical to their active counterparts.
**Fix:** Delete _archive/ if confirmed redundant. Not urgent.

---

## 6. What the Homepage Actually Renders Today

Tracing `page.tsx` line by line:

1. **Hero section (line 24-26):**
   ```
   heroBrand = getHomepageHero()           → brand.v1.json → { mediaId: null }
   heroMedia = heroBrand.mediaId ? ...     → null ? ... : null
   heroBg = heroMedia?.variants?.web       → null?.variants?.web → undefined
   ```
   **Result: NO hero image rendered.** The `<Image>` at line 45 is conditionally rendered (`{heroBg && ...}`), so it renders nothing.

2. **Owner portrait (line 27-29):**
   ```
   ownerBrand = getOwnerPortrait()         → brand.v1.json → { mediaId: null }
   ownerMedia = ownerBrand.mediaId ? ...   → null ? ... : null
   ownerSrc = ownerMedia?.variants?.web    → undefined
   ```
   **Result: NO portrait rendered.** The `<Image>` at line 196 is conditionally rendered (`{ownerSrc && ...}`), so it renders nothing.

3. **Before/After slider (line 34, 160):**
   ```
   cedarFenceProject = featuredProjects.find(p => p.id === 'cedar-fence-001')
   ```
   `cedar-fence-001` does not exist in projects.v1.json. The 5 projects are: fences-001, builtins-001, repairs-001, outdoor-living-001, bathroom-remodeling-001.
   **Result: NO before/after slider rendered.**

4. **Services (line 37):**
   ```
   homepageServices = allServices.filter(s => s.homepageEligible)
   ```
   Service cards render from services.v1.json. Services reference projects via media. This chain works.
   **Result: Service cards render.** Images come through `getFeaturedServiceMedia()` → projects.v1.json → media.v1.json → variant URLs → all resolve to disk. ✓

5. **Reviews (line 20):**
   ```
   topReviews = getFeaturedReviews().slice(0, 3)
   ```
   reviews.ts exports empty array.
   **Result: "Building our review portfolio" message shown.** No fabricated reviews. ✓

**Summary:** The homepage renders service cards and the trust strip correctly. The hero, portrait, and before/after sections all render empty because brand.v1.json has null mediaIds.

---

## 7. What the Project Pages Render

For `/projects/[slug]/page.tsx`, projects reference media via `media.hero` and `media.gallery` in projects.v1.json.

All 5 projects have valid hero and gallery references → all resolve in media.v1.json → all variant URLs exist on disk.

**Result: Project pages should render images correctly.** The only issue is the variant key mismatch (V3) — if project pages access `variants.web` instead of `variants.webp`, they'll get undefined.

---

## 8. Recommended Fix Order

### Step 1: Fix brand.v1.json (unblocks homepage)
Set mediaIds to point at existing media.v1.json entries or create new entries for orphaned images.

**Option A — Reference existing entries:**
- `homepageHero.mediaId` → `"fences-001-hero"` (or any hero-eligible entry)
- `ownerPortrait.mediaId` → Create new media entry for portrait.jpeg

**Option B — Reference new entries (recommended, uses actual images):**
- Add 6 missing entries to media.v1.json first (Step 2), then:
- `homepageHero.mediaId` → `"hero/hero"` (the actual hero.jpeg)
- `ownerPortrait.mediaId` → `"portrait/portrait"` (the actual portrait.jpeg)

### Step 2: Add 6 missing entries to media.v1.json
Create entries for: featured, hero, portrait, FLOOR0, IMG_0544, IMG_0546.
Use exact variant paths that already exist on disk. Do not invent files.

### Step 3: Fix variant key mismatch
Either rename `webp` → `web` in media.v1.json, or update `page.tsx:26,29` to access `variants.webp`.

### Step 4: Verify end-to-end
After Steps 1-3, the homepage should render:
- Hero image (hero.jpeg, 480px)
- Owner portrait (portrait.jpeg, 480px)
- Service cards with project images ✓
- Before/after section (needs cedar-fence-001 project OR different project reference)

### Step 5 (optional): Get higher-resolution source photos
- hero.jpeg (480×640) — too small for full-width hero
- featured.jpeg (480×640) — too small for featured card
- portrait.jpeg (640×427) — too small for portrait display
- Outdoor Living photos (480×640) — too small for gallery display

---

## 9. What NOT To Do

1. **Do NOT rename files.** The filesystem is truth.
2. **Do NOT move files.** Directory structure is correct.
3. **Do NOT invent filenames.** Every authority record must reference a file that exists on disk.
4. **Do NOT invent projects.** 5 projects exist. cedar-fence-001 does not exist.
5. **Do NOT create "placeholder" authority records.** Every record must point to a real file.
6. **Do NOT delete the _archive/ directory yet.** Confirm redundancy first.
7. **Do NOT regenerate media.v1.json from scratch.** The 16 existing entries are correct. Add to them, don't replace.
