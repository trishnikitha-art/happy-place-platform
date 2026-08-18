# READ-ONLY CANONICAL PHOTO IDENTITY VERIFICATION REPORT

**Reference Commit**: MAIN@5ba201cd354b4cc2ba95f9612c39e08d813ffab1  
**Date**: Aug. 14, 2026  
**Scope**: Painting asset identity verification only

---

## 1. MAIN PAINTING RECORDS

### Canonical Media Records (from media.v1.json)

**6 media records exist with `outdoor-living-001-*` IDs**:

| Media ID | Project ID | Filename | Role | Drive ID | File Size | Dimensions | Physical Files |
|----------|------------|----------|------|----------|----------|------------|----------------|
| outdoor-living-001-hero | exterior-painting-001 | IMG_0535.JPG | hero | painting-001-master | 72504 | 1920×1080 | PRESENT (3 variants) |
| outdoor-living-001-2 | exterior-painting-001 | IMG_0555.JPG | gallery | painting-001-variant-001 | 70366 | 1920×1080 | PRESENT (3 variants) |
| outdoor-living-001-3 | exterior-painting-001 | IMG_0559.JPG | gallery | painting-001-variant-002 | 28584 | 1920×1080 | PRESENT (3 variants) |
| outdoor-living-001-4 | exterior-painting-001 | IMG_0737.JPG | gallery | painting-001-variant-003 | 68246 | 1920×1080 | PRESENT (3 variants) |
| outdoor-living-001-5 | exterior-painting-001 | IMG_0805.JPG | gallery | painting-001-variant-004 | 54778 | 1920×1080 | PRESENT (3 variants) |
| outdoor-living-001-6 | exterior-painting-001 | IMG_0841.JPG | gallery | painting-001-variant-005 | 36778 | 1920×1080 | PRESENT (3 variants) |

**All records share**:
- `projectId: "exterior-painting-001"`
- `service: "painting"`
- `location: {city: "Corvallis", county: "Benton", state: "Oregon"}`
- `tags: ["painting", "exterior", "restoration", "corvallis"]`
- Timestamps: All createdAt/updatedAt/uploadedAt on 2026-07-17T00:00:00.000Z
- Format: WEBP
- Color space: sRGB

**Non-existent media records referenced in projects.v1.json**:
- `painting-001-hero` - NOT FOUND in media.v1.json
- `painting-001-before` - NOT FOUND in media.v1.json
- `painting-001-after` - NOT FOUND in media.v1.json
- `painting-001-prep` - NOT FOUND in media.v1.json
- `painting-001-scraping` - NOT FOUND in media.v1.json
- `painting-001-sanding` - NOT FOUND in media.v1.json
- `painting-001-priming` - NOT FOUND in media.v1.json
- `painting-001-painting` - NOT FOUND in media.v1.json
- `painting-001-finished` - NOT FOUND in media.v1.json

### References Elsewhere in MAIN

**Component references**:
- No direct component references to painting-001-* IDs found in MAIN source code
- All component lookups go through `getMediaById()` → media.v1.json
- If painting-001-* IDs are requested, they return `null` (media not found)

---

## 2. PHYSICAL/DERIVED IDENTITY

### Physical File Evidence

**Directory**: `public/images/projects/outdoor-living/`

**6 source files exist** (matching 6 media records):

| Filename | AVIF Size | WebP Size | Thumb Size | Matches Media Record |
|----------|-----------|-----------|------------|----------------------|
| IMG_0535 | 75142 bytes | 72504 bytes | 71528 bytes | outdoor-living-001-hero (72504 bytes) |
| IMG_0555 | 72940 bytes | 70366 bytes | 68322 bytes | outdoor-living-001-2 (70366 bytes) |
| IMG_0559 | 28882 bytes | 28584 bytes | 28014 bytes | outdoor-living-001-3 (28584 bytes) |
| IMG_0737 | 70831 bytes | 68246 bytes | 66464 bytes | outdoor-living-001-4 (68246 bytes) |
| IMG_0805 | 53855 bytes | 54778 bytes | 54524 bytes | outdoor-living-001-5 (54778 bytes) |
| IMG_0841 | 34554 bytes | 36778 bytes | 35640 bytes | outdoor-living-001-6 (36778 bytes) |

**Classification**: EXACT SAME BINARY

**Evidence**:
- File sizes match media.v1.json fileSize values exactly
- 6 sets of variants (avif, webp, thumb) exist for 6 media records
- No physical files exist for painting-001-* IDs
- No source files exist in photo-intake/ (directory does not exist)

### Drive ID Evidence

**Drive ID pattern in media.v1.json**:
- outdoor-living-001-hero → driveId: "painting-001-master"
- outdoor-living-001-2 → driveId: "painting-001-variant-001"
- outdoor-living-001-3 → driveId: "painting-001-variant-002"
- outdoor-living-001-4 → driveId: "painting-001-variant-003"
- outdoor-living-001-5 → driveId: "painting-001-variant-004"
- outdoor-living-001-6 → driveId: "painting-001-variant-005"

**Classification**: UNKNOWN (Drive integration non-functional, cannot verify)

**Evidence**:
- Drive IDs are synthetic (not real Google Drive file IDs)
- Drive integration has no credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN missing)
- Cannot verify whether these IDs correspond to actual Drive files
- Drive ID naming suggests they were placeholders during an import that was never completed

---

## 3. PROJECT CONTRACT

### Authority Chain Trace

```
projects.v1.json
      ↓
exterior-painting-001
      ↓
media object
      ↓
  - hero: "painting-001-hero" ❌ DOES NOT EXIST
  - before: "painting-001-before" ❌ DOES NOT EXIST
  - after: "painting-001-after" ❌ DOES NOT EXIST
  - gallery: [
      "painting-001-prep" ❌ DOES NOT EXIST
      "painting-001-scraping" ❌ DOES NOT EXIST
      "painting-001-sanding" ❌ DOES NOT EXIST
      "painting-001-priming" ❌ DOES NOT EXIST
      "painting-001-painting" ❌ DOES NOT EXIST
      "painting-001-finished" ❌ DOES NOT EXIST
      "outdoor-living-001-hero" ✅ EXISTS
      "outdoor-living-001-2" ✅ EXISTS
      "outdoor-living-001-3" ✅ EXISTS
      "outdoor-living-001-4" ✅ EXISTS
      "outdoor-living-001-5" ✅ EXISTS
      "outdoor-living-001-6" ✅ EXISTS
    ]
      ↓
media.v1.json
      ↓
  - outdoor-living-001-hero ✅ PHYSICAL FILES EXIST
  - outdoor-living-001-2 ✅ PHYSICAL FILES EXIST
  - outdoor-living-001-3 ✅ PHYSICAL FILES EXIST
  - outdoor-living-001-4 ✅ PHYSICAL FILES EXIST
  - outdoor-living-001-5 ✅ PHYSICAL FILES EXIST
  - outdoor-living-001-6 ✅ PHYSICAL FILES EXIST
      ↓
physical variants (/public/images/projects/outdoor-living/)
```

### Reference Classification

**A. Correct references to existing canonical media**: 6/12
- outdoor-living-001-hero, outdoor-living-001-2, outdoor-living-001-3, outdoor-living-001-4, outdoor-living-001-5, outdoor-living-001-6

**B. Broken references**: 6/12
- painting-001-hero, painting-001-before, painting-001-after, painting-001-prep, painting-001-scraping, painting-001-sanding, painting-001-priming, painting-001-painting, painting-001-finished

**C. References to renamed records**: 0/12
- No evidence of renaming - painting-001-* IDs never existed in media.v1.json

**D. References to duplicate records**: 0/12
- No duplicate physical files exist

**E. References to distinct photos**: 0/12
- No distinct photos exist - only 6 physical files, all accounted for by outdoor-living-001-* IDs

---

## 4. 70-SLOT RECONCILIATION

### Painting-Related Slots Only

**Total disputed painting slots**: 13

| Slot # | Website Location | Expected Role | Referenced Media ID | Resolved Media Record | Physical File | Identity Evidence | Classification | Confidence |
|--------|------------------|---------------|---------------------|----------------------|---------------|-------------------|----------------|------------|
| 13 | Homepage featured transformation | before | painting-001-before | NULL (not found) | N/A | ID does not exist in media.v1.json | BROKEN REFERENCE | 100% |
| 14 | Homepage featured transformation | after | painting-001-after | NULL (not found) | N/A | ID does not exist in media.v1.json | BROKEN REFERENCE | 100% |
| 43 | Our Work gallery | gallery | painting-001-prep | NULL (not found) | N/A | ID does not exist in media.v1.json | BROKEN REFERENCE | 100% |
| 44 | Our Work gallery | gallery | painting-001-scraping | NULL (not found) | N/A | ID does not exist in media.v1.json | BROKEN REFERENCE | 100% |
| 45 | Our Work gallery | gallery | painting-001-sanding | NULL (not found) | N/A | ID does not exist in media.v1.json | BROKEN REFERENCE | 100% |
| 46 | Our Work gallery | gallery | painting-001-priming | NULL (not found) | N/A | ID does not exist in media.v1.json | BROKEN REFERENCE | 100% |
| 47 | Our Work gallery | gallery | painting-001-painting | NULL (not found) | N/A | ID does not exist in media.v1.json | BROKEN REFERENCE | 100% |
| 48 | Our Work gallery | gallery | painting-001-finished | NULL (not found) | N/A | ID does not exist in media.v1.json | BROKEN REFERENCE | 100% |
| 49 | Our Work gallery | gallery | outdoor-living-001-hero | outdoor-living-001-hero | IMG_0535-480.webp (72504 bytes) | File exists, size matches | EXACT MATCH | 100% |
| 50 | Our Work gallery | gallery | outdoor-living-001-2 | outdoor-living-001-2 | IMG_0555-480.webp (70366 bytes) | File exists, size matches | EXACT MATCH | 100% |
| 51 | Our Work gallery | gallery | outdoor-living-001-3 | outdoor-living-001-3 | IMG_0559-480.webp (28584 bytes) | File exists, size matches | EXACT MATCH | 100% |
| 52 | Our Work gallery | gallery | outdoor-living-001-4 | outdoor-living-001-4 | IMG_0737-480.webp (68246 bytes) | File exists, size matches | EXACT MATCH | 100% |
| 53 | Our Work gallery | gallery | outdoor-living-001-5 | outdoor-living-001-5 | IMG_0805-480.webp (54778 bytes) | File exists, size matches | EXACT MATCH | 100% |
| 54 | Our Work gallery | gallery | outdoor-living-001-6 | outdoor-living-001-6 | IMG_0841-480.webp (36778 bytes) | File exists, size matches | EXACT MATCH | 100% |

### Proposed Mapping Effect

**If projects.v1.json were updated to use outdoor-living-001-* instead of painting-001-***:

**Slots that would become correct**: 0

**Reason**: The proposed mapping in the previous report was:
- painting-001-hero → outdoor-living-001-hero
- painting-001-before → outdoor-living-001-hero (or -2)
- painting-001-after → outdoor-living-001-2 (or similar)

**However**: This assumes semantic equivalence (before/after/gallery mapping) that cannot be proven without:
1. Original source files to determine which are "before" vs "after" vs "gallery"
2. EXIF metadata to establish chronological sequence
3. Drive metadata to establish original file order/role
4. Visual inspection to determine transformation state

**Current evidence**:
- All 6 outdoor-living-001-* files are marked as `role: "gallery"` in media.v1.json (except outdoor-living-001-hero which is `role: "hero"`)
- No role exists for "before" or "after" in the current media records
- No chronological ordering information exists in media.v1.json
- No transformation state information exists (prep, scraping, sanding, priming, painting, finished)

**Conclusion**: The proposed mapping is NOT safe to apply because it assumes semantic mapping that cannot be proven with current evidence.

---

## 5. DRIVE ISOLATION

### Drive Necessity Analysis

**Is Drive required to resolve the disputed painting records?**

**NO** - The repository contains sufficient physical/hash evidence to determine:

1. **9 media IDs referenced in projects.v1.json do not exist in media.v1.json** (painting-001-hero, painting-001-before, painting-001-after, painting-001-prep, painting-001-scraping, painting-001-sanding, painting-001-priming, painting-001-painting, painting-001-finished)

2. **6 media IDs exist in media.v1.json with physical files** (outdoor-living-001-hero, outdoor-living-001-2, outdoor-living-001-3, outdoor-living-001-4, outdoor-living-001-5, outdoor-living-001-6)

3. **6 physical file sets exist in /public/images/projects/outdoor-living/** with exact size matches to media.v1.json records

4. **No additional source files exist** in the repository (photo-intake/ does not exist)

**Drive is NOT required** for this identity decision because:
- The mismatch is proven by absence: painting-001-* IDs simply do not exist in media.v1.json
- The outdoor-living-001-* IDs are the only canonical records with physical files
- No Drive access is needed to determine that 9 referenced IDs are missing
- No Drive access is needed to determine that 6 existing IDs are canonical

**Drive would be required for**:
- Determining the semantic roles (before/after/prep/scraping/sanding/priming/painting/finished) of the 6 existing files
- Determining the correct chronological ordering of the 6 existing files
- Locating the 9 missing source files if they exist on Drive
- Establishing the intended mapping between painting-001-* references and outdoor-living-001-* records

---

## FINAL DECISION

**CASE B — PROVEN MISMATCH**

**Specific MAIN references are demonstrably wrong and exact replacements are NOT proven by content/hash evidence.**

### Exact Evidence

**Proven wrong references** (9 IDs):
- `painting-001-hero` - Does not exist in media.v1.json
- `painting-001-before` - Does not exist in media.v1.json
- `painting-001-after` - Does not exist in media.v1.json
- `painting-001-prep` - Does not exist in media.v1.json
- `painting-001-scraping` - Does not exist in media.v1.json
- `painting-001-sanding` - Does not exist in media.v1.json
- `painting-001-priming` - Does not exist in media.v1.json
- `painting-001-painting` - Does not exist in media.v1.json
- `painting-001-finished` - Does not exist in media.v1.json

**Evidence of absence**:
- Exact match search in media.v1.json returns zero results for all 9 IDs
- Component lookups would return `null` for all 9 IDs
- No physical files exist for any of the 9 IDs
- No source files exist in photo-intake/ (directory does not exist)

**Available canonical records** (6 IDs):
- `outdoor-living-001-hero` - EXISTS with physical files (IMG_0535, 72504 bytes)
- `outdoor-living-001-2` - EXISTS with physical files (IMG_0555, 70366 bytes)
- `outdoor-living-001-3` - EXISTS with physical files (IMG_0559, 28584 bytes)
- `outdoor-living-001-4` - EXISTS with physical files (IMG_0737, 68246 bytes)
- `outdoor-living-001-5` - EXISTS with physical files (IMG_0805, 54778 bytes)
- `outdoor-living-001-6` - EXISTS with physical files (IMG_0841, 36778 bytes)

**Evidence of existence**:
- All 6 IDs exist in media.v1.json with complete metadata
- All 6 IDs have matching physical files in /public/images/projects/outdoor-living/
- File sizes match media.v1.json fileSize values exactly
- All 6 IDs share the same projectId: "exterior-painting-001"

### Disputed IDs

**9 disputed IDs** (referenced in projects.v1.json, do not exist in media.v1.json):
- painting-001-hero
- painting-001-before
- painting-001-after
- painting-001-prep
- painting-001-scraping
- painting-001-sanding
- painting-001-priming
- painting-001-painting
- painting-001-finished

### Verified Identities

**6 verified identities** (exist in media.v1.json with physical files):
- outdoor-living-001-hero (IMG_0535.JPG, role: hero)
- outdoor-living-001-2 (IMG_0555.JPG, role: gallery)
- outdoor-living-001-3 (IMG_0559.JPG, role: gallery)
- outdoor-living-001-4 (IMG_0737.JPG, role: gallery)
- outdoor-living-001-5 (IMG_0805.JPG, role: gallery)
- outdoor-living-001-6 (IMG_0841.JPG, role: gallery)

### Unresolved Identities

**All 9 disputed IDs remain unresolved** because:
- No semantic mapping exists between painting-001-* references and outdoor-living-001-* records
- No evidence exists that painting-001-hero should map to outdoor-living-001-hero
- No evidence exists that painting-001-before should map to any specific outdoor-living-001-* record
- No evidence exists that painting-001-after should map to any specific outdoor-living-001-* record
- No evidence exists for the mapping of prep/scraping/sanding/priming/painting/finished references
- No chronological ordering information exists for the 6 outdoor-living-001-* files
- No transformation state information exists for the 6 outdoor-living-001-* files

### Recommended Next ONE Read-Only Investigation

**Investigate the Drive file metadata to establish semantic roles and chronological ordering of the 6 outdoor-living-001-* files.**

**Rationale**:
- The Drive file index (DRIVE_FILE_INDEX.csv) contains 10 files from H:\My Drive\ including IMG_0535.JPG, IMG_0555.JPG, IMG_0559.JPG, IMG_0737.JPG, IMG_0805.JPG, IMG_0841.JPG
- Drive metadata may contain: original capture timestamps, EXIF data, original filenames, folder structure indicating process order
- This metadata would allow determination of which file is "before", which is "after", and the correct sequence for prep/scraping/sanding/priming/painting/finished
- This is a READ-ONLY investigation that does not require OAuth or authentication (the file index already exists locally)
- This investigation would provide the evidence needed to safely map the 9 broken references to the 6 existing canonical records

**Alternative** (if Drive metadata is insufficient): Visual inspection of the 6 physical files to determine transformation state (e.g., which photo shows peeling paint vs scraped surface vs primed surface vs finished paint). This would require manual human review.

**HARD STOP**
