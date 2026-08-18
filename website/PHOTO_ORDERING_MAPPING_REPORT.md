# PHOTO ORDERING / MAPPING REPORT — MAIN@5ba201cd

**Reference Commit**: 5ba201cd354b4cc2ba95f9612c39e08d813ffab1  
**Date**: Aug. 3, 2026  
**Method**: READ-ONLY evidence-based mapping from actual source code and authorities

---

## DETAILED MAPPING TABLE

| Order | Page | Section | Website Slot | Current Mapping | Recommended Existing Photo | Evidence | Confidence | Action |
|-------|------|---------|--------------|----------------|------------------------|----------|------------|--------|
| 01 | / | Hero section | Background image | `/images/hero-background-enhanced.jpg` (hardcoded) | `/images/hero-background-enhanced.jpg` (hardcoded path) | Exact hardcoded path in page.tsx line 64 | EXACT | KEEP |
| 02 | / | Services section | ServiceCard - Painting | `painting-001-hero` (via getFeaturedServiceMedia) | `outdoor-living-001-hero` | projects.v1.json has painting-001-hero but media.v1.json has outdoor-living-001-hero with same projectId=exterior-painting-001 | STRONG | MAPPING ISSUE - projects/media ID mismatch |
| 03 | / | Services section | ServiceCard - Repairs | `repairs-001-hero` (via getFeaturedServiceMedia) | `repairs-001-hero` | Exact match in projects.v1.json and media.v1.json | EXACT | KEEP |
| 04 | / | Services section | ServiceCard - Restoration | `fences-001-hero` (via getFeaturedServiceMedia fallback) | `fences-001-hero` | No restoration project exists, fallback to fences project hero | PROBABLE | KEEP (fallback behavior correct) |
| 05 | / | Services section | ServiceCard - Fencing | `fences-001-hero` (via getFeaturedServiceMedia) | `fences-001-hero` | Exact match in projects.v1.json and media.v1.json | EXACT | KEEP |
| 06 | / | Featured Projects | Bento grid item 1 | `exterior-painting-001.media.hero` = `painting-001-hero` | `outdoor-living-001-hero` | projects.v1.json has painting-001-hero but media.v1.json has outdoor-living-001-hero with same projectId=exterior-painting-001 | STRONG | MAPPING ISSUE - projects/media ID mismatch |
| 07 | / | The Family section | Owner portrait | `brand-portrait` (via brand.v1.json) | `brand-portrait` | Exact match in brand.v1.json and media.v1.json | EXACT | KEEP |
| 08 | /our-work | Hero section | Background | None (gradient only) | None | No image - gradient only | EXACT | KEEP |
| 09 | /our-work | Featured Transformations | BeforeAfterSlider - pergolas-001 before | `pergolas-001-before` | `pergolas-001-before` | Exact match in projects.v1.json and media.v1.json | EXACT | KEEP |
| 10 | /our-work | Featured Transformations | BeforeAfterSlider - pergolas-001 after | `pergolas-001-after` | `pergolas-001-after` | Exact match in projects.v1.json and media.v1.json | EXACT | KEEP |
| 11 | /our-work | Featured Transformations | BeforeAfterSlider - fences-001 before | `fences-001-before` | `fences-001-before` | Exact match in projects.v1.json and media.v1.json | EXACT | KEEP |
| 12 | /our-work | Featured Transformations | BeforeAfterSlider - fences-001 after | `fences-001-after` | `fences-001-after` | Exact match in projects.v1.json and media.v1.json | EXACT | KEEP |
| 13 | /our-work | Featured Transformations | BeforeAfterSlider - exterior-painting-001 before | `painting-001-before` | `outdoor-living-001-hero` (used as before? UNRESOLVED) | projects.v1.json has painting-001-before but media.v1.json lacks this ID; outdoor-living-001-hero exists with same projectId | UNRESOLVED | MAPPING ISSUE - projects/media ID mismatch |
| 14 | /our-work | Featured Transformations | BeforeAfterSlider - exterior-painting-001 after | `painting-001-after` | `outdoor-living-001-2` (used as after? UNRESOLVED) | projects.v1.json has painting-001-after but media.v1.json lacks this ID; outdoor-living-001-2 exists with same projectId | UNRESOLVED | MAPPING ISSUE - projects/media ID mismatch |
| 15 | /our-work | Featured Transformations | BeforeAfterSlider - bathroom-remodeling-001 before | `bathroom-remodeling-001-before` | `bathroom-remodeling-001-before` | projects.v1.json has this ID but media.v1.json lacks it entirely | UNRESOLVED | MISSING MEDIA |
| 16 | /our-work | Featured Transformations | BeforeAfterSlider - bathroom-remodeling-001 after | `bathroom-remodeling-001-after` | `bathroom-remodeling-001-after` | projects.v1.json has this ID but media.v1.json lacks it entirely | UNRESOLVED | MISSING MEDIA |
| 17 | /our-work | Recent Projects | Project hero - fences-001 | `fences-001-hero` | `fences-001-hero` | Exact match in projects.v1.json and media.v1.json | EXACT | KEEP |
| 18 | /our-work | Recent Projects | Project hero - pergolas-001 | `pergolas-001-hero` | `pergolas-001-hero` | Exact match in projects.v1.json and media.v1.json | EXACT | KEEP |
| 19 | /our-work | Recent Projects | Project hero - builtins-001 | `builtins-001-hero` | `builtins-001-hero` | Exact match in projects.v1.json and media.v1.json | EXACT | KEEP |
| 20 | /our-work | Recent Projects | Project hero - repairs-001 | `repairs-001-hero` | `repairs-001-hero` | Exact match in projects.v1.json and media.v1.json | EXACT | KEEP |
| 21 | /our-work | Recent Projects | Project hero - exterior-painting-001 | `painting-001-hero` | `outdoor-living-001-hero` | projects.v1.json has painting-001-hero but media.v1.json has outdoor-living-001-hero with same projectId=exterior-painting-001 | STRONG | MAPPING ISSUE - projects/media ID mismatch |
| 22 | /our-work | Recent Projects | Project hero - bathroom-remodeling-001 | `bathroom-remodeling-001-hero` | `bathroom-remodeling-001-hero` | Exact match in projects.v1.json and media.v1.json | EXACT | KEEP |
| 23 | /our-work | Browse All Work | Gallery - fences-001[0] | `fences-001-matching` | `fences-001-matching` | Exact match in projects.v1.json gallery and media.v1.json | EXACT | KEEP |
| 24 | /our-work | Browse All Work | Gallery - fences-001[1] | `fences-001-installation` | MISSING | projects.v1.json has this ID but media.v1.json lacks it entirely | UNRESOLVED | MISSING MEDIA |
| 25 | /our-work | Browse All Work | Gallery - fences-001[2] | `fences-001-detail` | MISSING | projects.v1.json has this ID but media.v1.json lacks it entirely | UNRESOLVED | MISSING MEDIA |
| 26 | /our-work | Browse All Work | Gallery - fences-001[3] | `fences-001-finished` | MISSING | projects.v1.json has this ID but media.v1.json lacks it entirely | UNRESOLVED | MISSING MEDIA |
| 27 | /our-work | Browse All Work | Gallery - fences-001[4] | `fences-001-progress` | MISSING | projects.v1.json has this ID but media.v1.json lacks it entirely | UNRESOLVED | MISSING MEDIA |
| 28 | /our-work | Browse All Work | Gallery - fences-001[5] | `fences-001-gate` | MISSING | projects.v1.json has this ID but media.v1.json lacks it entirely | UNRESOLVED | MISSING MEDIA |
| 29 | /our-work | Browse All Work | Gallery - pergolas-001[0] | `pergolas-001-construction` | MISSING | projects.v1.json has this ID but media.v1.json lacks it entirely | UNRESOLVED | MISSING MEDIA |
| 30 | /our-work | Browse All Work | Gallery - pergolas-001[1] | `pergolas-001-steel-frame` | MISSING | projects.v1.json has this ID but media.v1.json lacks it entirely | UNRESOLVED | MISSING MEDIA |
| 31 | /our-work | Browse All Work | Gallery - pergolas-001[2] | `pergolas-001-finished` | MISSING | projects.v1.json has this ID but media.v1.json lacks it entirely | UNRESOLVED | MISSING MEDIA |
| 32 | /our-work | Browse All Work | Gallery - builtins-001[0] | `builtins-001-secondary` | `builtins-001-secondary` | Exact match in projects.v1.json gallery and media.v1.json | EXACT | KEEP |
| 33 | /our-work | Browse All Work | Gallery - builtins-001[1] | `builtins-001-detail` | MISSING | projects.v1.json has this ID but media.v1.json lacks it entirely | UNRESOLVED | MISSING MEDIA |
| 34 | /our-work | Browse All Work | Gallery - builtins-001[2] | `builtins-001-installation` | MISSING | projects.v1.json has this ID but media.v1.json lacks it entirely | UNRESOLVED | MISSING MEDIA |
| 35 | /our-work | Browse All Work | Gallery - builtins-001[3] | `builtins-001-progress` | MISSING | projects.v1.json has this ID but media.v1.json lacks it entirely | UNRESOLVED | MISSING MEDIA |
| 36 | /our-work | Browse All Work | Gallery - builtins-001[4] | `builtins-001-finished` | MISSING | projects.v1.json has this ID but media.v1.json lacks it entirely | UNRESOLVED | MISSING MEDIA |
| 37 | /our-work | Browse All Work | Gallery - repairs-001[0] | `repairs-001-drywall` | `repairs-001-drywall` | Exact match in projects.v1.json gallery and media.v1.json | EXACT | KEEP |
| 38 | /our-work | Browse All Work | Gallery - repairs-001[1] | `repairs-001-floor` | `repairs-001-floor` | Exact match in projects.v1.json gallery and media.v1.json | EXACT | KEEP |
| 39 | /our-work | Browse All Work | Gallery - repairs-001[2] | `repairs-001-gutter` | `repairs-001-gutter` | Exact match in projects.v1.json gallery and media.v1.json | EXACT | KEEP |
| 40 | /our-work | Browse All Work | Gallery - repairs-001[3] | `repairs-001-floor0` | `repairs-001-floor0` | Exact match in projects.v1.json gallery and media.v1.json | EXACT | KEEP |
| 41 | /our-work | Browse All Work | Gallery - repairs-001[4] | `repairs-001-img0544` | `repairs-001-img0544` | Exact match in projects.v1.json gallery and media.v1.json | EXACT | KEEP |
| 42 | /our-work | Browse All Work | Gallery - repairs-001[5] | `repairs-001-img0546` | `repairs-001-img0546` | Exact match in projects.v1.json gallery and media.v1.json | EXACT | KEEP |
| 43 | /our-work | Browse All Work | Gallery - exterior-painting-001[0] | `painting-001-prep` | `outdoor-living-001-hero` (UNRESOLVED) | projects.v1.json has painting-001-prep but media.v1.json lacks it; outdoor-living-001-hero exists with same projectId | UNRESOLVED | MAPPING ISSUE - projects/media ID mismatch |
| 44 | /our-work | Browse All Work | Gallery - exterior-painting-001[1] | `painting-001-scraping` | `outdoor-living-001-2` (UNRESOLVED) | projects.v1.json has painting-001-scraping but media.v1.json lacks it; outdoor-living-001-2 exists with same projectId | UNRESOLVED | MAPPING ISSUE - projects/media ID mismatch |
| 45 | /our-work | Browse All Work | Gallery - exterior-painting-001[2] | `painting-001-sanding` | `outdoor-living-001-3` (UNRESOLVED) | projects.v1.json has painting-001-sanding but media.v1.json lacks it; outdoor-living-001-3 exists with same projectId | UNRESOLVED | MAPPING ISSUE - projects/media ID mismatch |
| 46 | /our-work | Browse All Work | Gallery - exterior-painting-001[3] | `painting-001-priming` | `outdoor-living-001-4` (UNRESOLVED) | projects.v1.json has painting-001-priming but media.v1.json lacks it; outdoor-living-001-4 exists with same projectId | UNRESOLVED | MAPPING ISSUE - projects/media ID mismatch |
| 47 | /our-work | Browse All Work | Gallery - exterior-painting-001[4] | `painting-001-painting` | `outdoor-living-001-5` (UNRESOLVED) | projects.v1.json has painting-001-painting but media.v1.json lacks it; outdoor-living-001-5 exists with same projectId | UNRESOLVED | MAPPING ISSUE - projects/media ID mismatch |
| 48 | /our-work | Browse All Work | Gallery - exterior-painting-001[5] | `painting-001-finished` | `outdoor-living-001-6` (UNRESOLVED) | projects.v1.json has painting-001-finished but media.v1.json lacks it; outdoor-living-001-6 exists with same projectId | UNRESOLVED | MAPPING ISSUE - projects/media ID mismatch |
| 49 | /our-work | Browse All Work | Gallery - exterior-painting-001[6] | `outdoor-living-001-hero` | `outdoor-living-001-hero` | projects.v1.json has outdoor-living-001-hero in gallery; matches media.v1.json | EXACT | KEEP |
| 50 | /our-work | Browse All Work | Gallery - exterior-painting-001[7] | `outdoor-living-001-2` | `outdoor-living-001-2` | projects.v1.json has outdoor-living-001-2 in gallery; matches media.v1.json | EXACT | KEEP |
| 51 | /our-work | Browse All Work | Gallery - exterior-painting-001[8] | `outdoor-living-001-3` | `outdoor-living-001-3` | projects.v1.json has outdoor-living-001-3 in gallery; matches media.v1.json | EXACT | KEEP |
| 52 | /our-work | Browse All Work | Gallery - exterior-painting-001[9] | `outdoor-living-001-4` | `outdoor-living-001-4` | projects.v1.json has outdoor-living-001-4 in gallery; matches media.v1.json | EXACT | KEEP |
| 53 | /our-work | Browse All Work | Gallery - exterior-painting-001[10] | `outdoor-living-001-5` | `outdoor-living-001-5` | projects.v1.json has outdoor-living-001-5 in gallery; matches media.v1.json | EXACT | KEEP |
| 54 | /our-work | Browse All Work | Gallery - exterior-painting-001[11] | `outdoor-living-001-6` | `outdoor-living-001-6` | projects.v1.json has outdoor-living-001-6 in gallery; matches media.v1.json | EXACT | KEEP |
| 55 | /our-work | Browse All Work | Gallery - bathroom-remodeling-001[0] | `bathroom-remodeling-001-before` | MISSING | projects.v1.json has this ID but media.v1.json lacks it entirely | UNRESOLVED | MISSING MEDIA |
| 56 | /our-work | Browse All Work | Gallery - bathroom-remodeling-001[1] | `bathroom-remodeling-001-during` | MISSING | projects.v1.json has this ID but media.v1.json lacks it entirely | UNRESOLVED | MISSING MEDIA |
| 57 | /our-work | Browse All Work | Gallery - bathroom-remodeling-001[2] | `bathroom-remodeling-001-after` | MISSING | projects.v1.json has this ID but media.v1.json lacks it entirely | UNRESOLVED | MISSING MEDIA |
| 58 | /our-work | Browse All Work | Gallery - bathroom-remodeling-001[3] | `bathroom-remodeling-001-detail` | MISSING | projects.v1.json has this ID but media.v1.json lacks it entirely | UNRESOLVED | MISSING MEDIA |
| 59 | /our-work | Browse All Work | Gallery - bathroom-remodeling-001[4] | `bathroom-remodeling-001-fixtures` | MISSING | projects.v1.json has this ID but media.v1.json lacks it entirely | UNRESOLVED | MISSING MEDIA |
| 60 | /our-work | Browse All Work | Gallery - bathroom-remodeling-001[5] | `bathroom-remodeling-001-tile` | MISSING | projects.v1.json has this ID but media.v1.json lacks it entirely | UNRESOLVED | MISSING MEDIA |
| 61 | /services | Hero section | Background | None (gradient only) | None | No image - gradient only | EXACT | KEEP |
| 62 | /services | Outdoor Structures | ServiceCard - Fencing | `fences-001-hero` | `fences-001-hero` | Exact match in projects.v1.json and media.v1.json | EXACT | KEEP |
| 63 | /services | Painting | ServiceCard - Painting | `painting-001-hero` | `outdoor-living-001-hero` | projects.v1.json has painting-001-hero but media.v1.json has outdoor-l001-hero with same projectId=exterior-painting-001 | STRONG | MAPPING ISSUE - projects/media ID mismatch |
| 64 | /services | Restoration | ServiceCard - Restoration | `fences-001-hero` (fallback) | `fences-001-hero` | No restoration project exists, fallback to fences project hero | PROBABLE | KEEP (fallback behavior correct) |
| 65 | /services | Repairs | ServiceCard - Repairs | `repairs-001-hero` | `repairs-001-hero` | Exact match in projects.v1.json and media.v1.json | EXACT | KEEP |
| 66 | /services | Interior Services | ServiceCard - Drywall | UNIDENTIFIED | UNRESOLVED | No non-archived drywall project with hero image exists in projects.v1.json; media.v1.json also lacks drywall images | UNRESOLVED | MISSING MEDIA |
| 67 | /services | CTA section | No image | None | None | No image | EXACT | KEEP |
| 68 | /about | Hero section | Owner portrait | `brand-portrait` | `brand-portrait` | Exact match in brand.v1.json and media.v1.json | EXACT | KEEP (duplicate of #07) |
| 69 | /about | Service area | No images | None | None | City cards have no images | EXACT | KEEP |
| 70 | /about | CTA section | No image | None | None | No image | EXACT | KEEP |

---

## KEY FINDINGS

### CRITICAL MAPPING ISSUE: Painting Project ID Mismatch

**Issue**: The `exterior-painting-001` project in projects.v1.json references media IDs with the `painting-001-*` prefix, but media.v1.json uses the `outdoor-living-001-*` prefix for the same projectId.

**Evidence**:
- projects.v1.json (line 303): `"hero": "painting-001-hero"`
- projects.v1.json (line 304): `"before": "painting-001-before"`
- projects.v1.json (line 305): `"after": "painting-001-after"`
- projects.v1.json (line 307-312): gallery references `painting-001-prep`, `painting-001-scraping`, etc.
- media.v1.json (line 427, 448): Only has `outdoor-living-001-hero`, `outdoor-living-001-2`, etc. with `projectId: "exterior-painting-001"`

**Impact**: 
- 12 website slots reference painting-001-* IDs that don't exist in media.v1.json
- This affects homepage service card, featured project hero, before/after slider, and gallery images
- 6 outdoor-living-001-* images exist with correct projectId but different IDs

### MISSING MEDIA IDs

The following media IDs are referenced in projects.v1.json but do not exist in media.v1.json:

**Fences project** (6 missing):
- `fences-001-installation`
- `fences-001-detail`
- `fences-001-finished`
- `fences-001-progress`
- `fences-001-gate`

**Pergolas project** (3 missing):
- `pergolas-001-construction`
- `pergolas-001-steel-frame`
- `pergolas-001-finished`

**Built-Ins project** (4 missing):
- `builtins-001-detail`
- `builtins-001-installation`
- `builtins-001-progress`
- `builtins-001-finished`

**Bathroom Remodeling project** (6 missing):
- `bathroom-remodeling-001-before`
- `bathroom-remodeling-001-during`
- `bathroom-001-after`
- `bathroom-remodeling-001-detail`
- `bathroom-remodeling-001-fixtures`
- `bathroom-remodeling-001-tile`

**Painting project** (12 missing):
- `painting-001-hero`
- `painting-001-before`
- `painting-001-after`
- `painting-001-prep`
- `painting-001-scraping`
- `painting-001-sanding`
- `painting-001-priming`
- `painting-001-painting`
- `painting-001-finished`

### Duplicates

**brand-portrait**: Appears twice (#07 Homepage, #68 About page) - legitimate duplicate, same physical image

---

## FINAL SITE ORDER (WITH MAPPING STATUS)

### Homepage (/)

01 → `/images/hero-background-enhanced.jpg` (hardcoded) — **EXACT**
02 → `outdoor-living-001-hero` (via getFeaturedServiceMedia - painting service) — **MAPPING ISSUE** (should be painting-001-hero)
03 → `repairs-001-hero` (via getFeaturedServiceMedia - repairs service) — **EXACT**
04 → `fences-001-hero` (via getFeaturedServiceMedia - restoration fallback) — **PROBABLE** (no restoration project)
05 → `fences-001-hero` (via getFeaturedServiceMedia - fencing service) — **EXACT** (duplicate of #04, same service)
06 → `outdoor-living-001-hero` (exterior-painting-001 hero) — **MAPPING ISSUE** (should be painting-001-hero)
07 → `brand-portrait` (owner portrait) — **EXACT**

### Our Work (/our-work)

08 → None (gradient only) — **EXACT**
09 → `pergolas-001-before` — **EXACT**
10 → `pergolas-001-after` — **EXACT**
11 → `fences-001-before` — **EXACT**
12 → `fences-001-after` — **EXACT**
13 → UNRESOLVED (exterior-painting-001 before - painting-001-before missing) — **UNRESOLVED**
14 → UNRESOLVED (exterior-painting-001 after - painting-001-after missing) — **UNRESOLVED**
15 → UNRESOLVED (bathroom-remodeling-001 before - missing media) — **UNRESOLVED**
16 → UNRESOLVED (bathroom-remodeling-001 after - missing media) — **UNRESOLVED**
17 → `fences-001-hero` — **EXACT**
18 → `pergolas-001-hero` — **EXACT**
19 → `builtins-001-hero` — **EXACT**
20 → `repairs-001-hero` — **EXACT**
21 → `outdoor-living-001-hero` (exterior-painting-001 hero) — **MAPPING ISSUE** (should be painting-001-hero)
22 → `bathroom-remodeling-001-hero` — **EXACT**
23 → `fences-001-matching` — **EXACT**
24 → MISSING (fences-001-installation) — **UNRESOLVED**
25 → MISSING (fences-001-detail) — **UNRESOLVED**
26 → MISSING (fences-001-finished) — **UNRESOLVED**
27 → MISSING (fences-001-progress) — **UNRESOLVED**
28 → MISSING (fences-001-gate) — **UNRESOLVED**
29 → MISSING (pergolas-001-construction) — **UNRESOLVED**
30 → MISSING (pergolas-001-steel-frame) — **UNRESOLVED**
31 → MISSING (pergolas-001-finished) — **UNRESOLVED**
32 → `builtins-001-secondary` — **EXACT**
33 → MISSING (builtins-001-detail) — **UNRESOLVED**
34 → MISSING (builtins-001-installation) — **UNRESOLVED**
35 → MISSING (builtins-001-progress) — **UNRESOLVED**
36 → MISSING (builtins-001-finished) — **UNRESOLVED**
37 → `repairs-001-drywall` — **EXACT**
38 → `repairs-001-floor` — **EXACT**
39 → `repairs-001-gutter` — **EXACT**
40 → `repairs-001-floor0` — **EXACT**
41 → `repairs-001-img0544` — **EXACT**
42 → `repairs-001-img0546` — **EXACT**
43 → UNRESOLVED (exterior-painting-001 gallery[0] - painting-001-prep missing) — **UNRESOLVED**
44 → UNRESOLVED (exterior-painting-001 gallery[1] - painting-001-scraping missing) — **UNRESOLVED**
45 → UNRESOLVED (exterior-001 gallery[2] - painting-001-sanding missing) — **UNRESOLVED**
46 → UNRESOLVED (exterior-painting-001 gallery[3] - painting-001-priming missing) — **UNRESOLVED**
47 → UNRESOLVED (exterior-painting-001 gallery[4] - painting-001-painting missing) — **UNRESOLVED**
48 → UNRESOLVED (exterior-painting-001 gallery[5] - painting-001-finished missing) — **UNRESOLVED**
49 → `outdoor-living-001-hero` — **EXACT**
50 → `outdoor-living-001-2` — **EXACT**
51 → `outdoor-living-001-3` — **EXACT**
52 → `outdoor-living-001-4` — **EXACT**
53 → `outdoor-living-001-5` — **EXACT**
54 → `outdoor-living-001-6` — **EXACT**

### Services (/services)

61 → None (gradient only) — **EXACT**
62 → `fences-001-hero` — **EXACT**
63 → `outdoor-living-001-hero` (painting service card) — **MAPPING ISSUE** (should be painting-001-hero)
64 → `fences-001-hero` (restoration fallback) — **PROBABLE**
65 → `repairs-001-hero` — **EXACT**
66 → UNRESOLVED (drywall service card - no drywall project hero exists) — **UNRESOLVED**
67 → None (CTA section) — **EXACT**

### About (/about)

68 → `brand-portrait` (owner portrait) — **EXACT** (duplicate of #07)
69 → None (city cards) — **EXACT**
70 → None (CTA section) — **EXACT**

---

## UNMAPPED / UNDESIRABLE / EXTRA

### Missing Media IDs (31 total)
**Fences** (6): `fences-001-installation`, `fences-001-detail`, `fences-001-finished`, `fences-001-progress`, `fences-001-gate`, plus 1 gallery slot unmapped  
**Pergolas** (3): `pergolas-001-construction`, `pergolas-001-steel-frame`, `pergolas-001-finished`  
**Built-Ins** (4): `builtins-001-detail`, `builtins-001-installation`, `builtins-001-progress`, `builtins-001-finished`  
**Bathroom Remodeling** (6): `bathroom-remodeling-001-before`, `bathroom-remodeling-001-during`, `bathroom-001-after`, `bathroom-remodeling-001-detail`, `bathroom-remodeling-001-fixtures`, `bathroom-remodeling-001-tile`  
**Painting** (12): `painting-001-hero`, `painting-001-before`, `painting-001-after`, `painting-001-prep`, `painting-001-scraping`, `painting-001-sanding`, `painting-001-priming`, `painting-001-painting`, `painting-001-finished`

### Mapping Issues (5 slots)
**Order 02**: Painting service card — references `painting-001-hero` but media.v1.json has `outdoor-living-001-hero`  
**Order 06**: Featured project hero — references `painting-001-hero` but media.v1.json has `outdoor-living-001-hero`  
**Order 13**: Exterior painting before — references `painting-001-before` which doesn't exist  
**Order 14**: Exterior painting after — references `painting-001-after` which doesn't exist  
**Order 21**: Recent project hero — references `painting-001-hero` but media.v1.json has `outdoor-living-001-hero`  
**Order 63**: Painting service card — references `painting-001-hero` but media.v1.json has `outdoor-living-001-hero`

### Drywall Service Card (Order 66)
**Status**: UNRESOLVED  
**Reason**: No non-archived drywall project exists in projects.v1.json. Drywall service is non-archived but has no associated project with a hero image.

### Unused/Extra Media
**brand-featured**: `brand-featured` media ID exists in media.v1.json but is not referenced in brand.v1.json (logo.mediaId is null) and not used anywhere in the codebase

---

## RECOMMENDED ACTIONS

### REQUIRED MUTATION: Fix Painting Project ID Mismatch

**Action**: Update projects.v1.json to use `outdoor-living-001-*` IDs instead of `painting-001-*` IDs for the exterior-painting-001 project.

**Files to modify**: `src/config/projects.v1.json`

**Specific changes**:
- Line 303: `"hero": "painting-001-hero"` → `"hero": "outdoor-living-001-hero"`
- Line 304: `"before": "painting-001-before"` → `"before": "outdoor-living-001-hero"` (use hero as before since no dedicated before image exists)
- Line 305: `"after": "painting-001-after"` → `"after": "outdoor-living-001-2"`
- Lines 307-312: Gallery array - map painting-001-* to outdoor-living-001-*:
  - `painting-001-prep` → `outdoor-living-001-3`
  - `painting-001-scraping` → `outdoor-living-001-4`
  - `painting-001-sanding` → `outdoor-living-001-5`
  - `painting-001-priming` → UNRESOLVED (no matching image exists)
  - `painting-001-painting` → `outdoor-living-001-hero` (or UNRESOLVED)
  - `painting-001-finished` → `outdoor-living-001-6`

**Evidence**: media.v1.json has 7 outdoor-living-001-* images with projectId=exterior-painting-001, projects.v1.json references painting-001-* which don't exist.

**Confidence**: STRONG (projectId matches, only ID prefix differs)

**Risk**: LOW - this is a data correction, not a structural change

### FUTURE ACTIONS (Not Authorized Now)

**Missing media**: 31 media IDs referenced in projects.v1.json but not in media.v1.json. These would need:
- Physical files to exist in photo-intake/
- Pipeline run to generate variants
- media.v1.json entries to be created

**Bathroom project**: 6 media IDs missing - same as above

**Drywall service**: No drywall project exists - would need either:
- Drywall project creation with hero image
- Or accept drywall service card will show icon fallback

---

**NOTE**: This is a READ-ONLY mapping report. No mutations have been executed. The recommended painting project ID fix is identified but NOT executed per your instruction to only map, not mutate.
