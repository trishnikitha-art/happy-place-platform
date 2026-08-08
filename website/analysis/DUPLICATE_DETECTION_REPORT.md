# Duplicate Detection Report

**Generated:** 2026-08-05 16:57:09
**Total Images Analyzed:** 43
**Duplicate Groups Found:** 6
**Images in Duplicate Groups:** 14
**Unique Images:** 35

---

## Detection Methodology

The following metrics were computed for each image:
1. **Perceptual Hash** (using PIL + ImageHash) - Detects visually similar images
2. **SHA256 Byte Hash** - Detects exact byte-for-byte duplicates
3. **Filename Similarity** (Levenshtein distance) - Detects similarly named files
4. **EXIF Similarity** (camera, timestamp, GPS) - Detects images from same capture session
5. **Dimension Comparison** - Detects same-size images
6. **Timestamp Clustering** - Groups images captured within 2 seconds

**Grouping Criteria:**
- Perceptual hash distance ≤ 5 with supporting evidence
- Exact SHA256 match (automatic duplicate)
- Filename similarity ≥ 0.7 with other evidence
- Images grouped when multiple metrics indicate similarity

**Canonical Selection:**
- Highest resolution
- Largest file size
- Most complete EXIF data
- Simplest filename (no copy/version suffixes)

---

## Image Inventory

| # | Filename | Path | Dimensions | Size (KB) | SHA256 | Perceptual Hash |
|---|----------|------|------------|-----------|--------|-----------------|
| 1 | HP001_DrywallRepair_WallDamage_After.jpg | Drywall  Before & Afters\HP001_DrywallRepair_WallDamage_After.jpg | 1536×2048 | 662.3 | `f3272a08fa5696f5...` | `fcfff93878787020...` |
| 2 | HP001_DrywallRepair_WallDamage_Before.jpeg | Drywall  Before & Afters\HP001_DrywallRepair_WallDamage_Before.jpeg | 1536×2048 | 660.3 | `f7d81ae36436ba24...` | `fcfef07070787800...` |
| 3 | HP009_DrywallRepair_After_Primed.jpg | Drywall  Before & Afters\HP009_DrywallRepair_After_Primed.jpg | 1536×2048 | 647.3 | `7a1d3156c85b956f...` | `3f3f3e9e9c90c0c0...` |
| 4 | HP009_DrywallRepair_Before.jpg | Drywall  Before & Afters\HP009_DrywallRepair_Before.jpg | 1536×2048 | 555.5 | `ebd80b34246d9255...` | `0f4fefe1e0e0e0e0...` |
| 5 | HP016_BathroomDrywallRepair_After.jpg | Drywall  Before & Afters\HP016_BathroomDrywallRepair_After.jpg | 1536×2048 | 737.4 | `423a516956d5abbf...` | `ccfcfcfc98f87000...` |
| 6 | HP016_BathroomDrywallRepair_Before.jpg | Drywall  Before & Afters\HP016_BathroomDrywallRepair_Before.jpg | 1536×2048 | 914.8 | `a6d9b68b55547787...` | `e3f331131311dccc...` |
| 7 | Feature-Fence-Photo.jpg | Featured Projects\Feature-Fence-Photo.jpg | 4367×3275 | 4009.7 | `371531fd79afd224...` | `3fff7f423f7c0000...` |
| 8 | HP0018_FenceInstallation_Exterior_SideStained_After.jpg | Fencing  Before & Afters\HP0018_FenceInstallation_Exterior_SideStained_After.jpg | 1536×2048 | 1054.5 | `41d7fccfe16b5479...` | `ffffff80bcc00000...` |
| 9 | HP0018_FenceInstallation_Exterior_Side_After.jpg | Fencing  Before & Afters\HP0018_FenceInstallation_Exterior_Side_After.jpg | 2048×1536 | 1121.4 | `ad5df85e04df0a07...` | `ffff7f3c7c800000...` |
| 10 | HP0018_FenceInstallation_Interior_WalkwayStained_After.jpg | Fencing  Before & Afters\HP0018_FenceInstallation_Interior_WalkwayStained_After.jpg | 1536×2048 | 684.0 | `a2e488b435a03af2...` | `fdf901000c1e3e7e...` |
| 11 | HP0020_FenceInstallation_After.jpg | Fencing  Before & Afters\HP0020_FenceInstallation_After.jpg | 4032×3024 | 6406.9 | `876300ab9d29bdc0...` | `fbc14101ff030b0f...` |
| 12 | HP012_FenceRebuild_After.jpg | Fencing  Before & Afters\HP012_FenceRebuild_After.jpg | 1536×2048 | 928.0 | `6e5fd45ff9bcd36d...` | `df1f1f1f1f3f1f07...` |
| 13 | HP012_FenceRebuild_Before.jpg | Fencing  Before & Afters\HP012_FenceRebuild_Before.jpg | 1536×2048 | 857.1 | `78e29fe65034376a...` | `ffff000000010000...` |
| 14 | HP019_FenceRebuild_After (1).jpg | Fencing  Before & Afters\HP019_FenceRebuild_After (1).jpg | 3880×3024 | 3668.0 | `784ed722c5ad578c...` | `fffefe047c1c0000...` |
| 15 | HP019_FenceRebuild_Before.jpg | Fencing  Before & Afters\HP019_FenceRebuild_Before.jpg | 3397×3024 | 2580.5 | `f606ce10f283dcd4...` | `fffff80080c08000...` |
| 16 | HP013_WindowFrameRefinish_After.jpg | Finish Carpentry  Before & Afters\HP013_WindowFrameRefinish_After.jpg | 1536×2048 | 637.4 | `cc9978ce72542130...` | `ffffe4644242fefe...` |
| 17 | HP013_WindowFrameRefinish_Before.jpg | Finish Carpentry  Before & Afters\HP013_WindowFrameRefinish_Before.jpg | 1536×2048 | 892.1 | `f24533df36d30422...` | `772c0d7424247cfc...` |
| 18 | HP003_ShedConstruction_After.jpg | Other  Before & Afters\HP003_ShedConstruction_After.jpg | 1536×2048 | 961.4 | `4f908854385a7503...` | `bffffffe1c180000...` |
| 19 | HP003_ShedConstruction_Before.jpg | Other  Before & Afters\HP003_ShedConstruction_Before.jpg | 1536×2048 | 1570.4 | `424abddc8f2c7d31...` | `fff8e0c005010040...` |
| 20 | HP004_SidingRepair_After.jpeg | Other  Before & Afters\HP004_SidingRepair_After.jpeg | 1536×2048 | 1255.5 | `7e37b91cf8259344...` | `f0f0f0f0f0707f0f...` |
| 21 | HP004_SidingRepair_Before.jpeg | Other  Before & Afters\HP004_SidingRepair_Before.jpeg | 1536×2048 | 1158.4 | `a62a37096cbf71d3...` | `efe32fefe76e7b01...` |
| 22 | HP005_DoorReplacement_After.jpeg | Other  Before & Afters\HP005_DoorReplacement_After.jpeg | 1536×2048 | 843.9 | `c148cedee481f1e3...` | `ffc7c7c7c7c7003c...` |
| 23 | HP005_DoorReplacement_Before.jpeg | Other  Before & Afters\HP005_DoorReplacement_Before.jpeg | 1536×2048 | 1150.5 | `6c3ec0e3e2d2bc07...` | `c7c3c7c7c7c78718...` |
| 24 | HP007_SidingRotRepair_After.jpeg | Other  Before & Afters\HP007_SidingRotRepair_After.jpeg | 1536×2048 | 950.5 | `8151ae20b8c6b889...` | `7f7f7f3f03000000...` |
| 25 | HP007_SidingRotRepair_Before.jpeg | Other  Before & Afters\HP007_SidingRotRepair_Before.jpeg | 1536×2048 | 1074.6 | `a43e55b8cad48c7a...` | `f1f9fdfd3c000000...` |
| 26 | HP008_AtticAccessDoorInstallation_After_Closed.jpg | Other  Before & Afters\HP008_AtticAccessDoorInstallation_After_Closed.jpg | 1536×2048 | 818.1 | `0dba81d66f694ba2...` | `e0f8f8f8f8f8f8f8...` |
| 27 | HP008_AtticAccessDoorInstallation_After_Open.jpg | Other  Before & Afters\HP008_AtticAccessDoorInstallation_After_Open.jpg | 1536×2048 | 830.8 | `ac4b329d3b226247...` | `ffc3c3e7e6e77372...` |
| 28 | HP011_SubfloorReplacement_After.jpg | Other  Before & Afters\HP011_SubfloorReplacement_After.jpg | 1536×2048 | 1000.4 | `6fd33914d4c27fbf...` | `41d81f1f0f673f0e...` |
| 29 | HP011_SubfloorReplacement_Before.jpg | Other  Before & Afters\HP011_SubfloorReplacement_Before.jpg | 1536×2048 | 1280.4 | `ce4856d6469a8005...` | `19990101838fff7f...` |
| 30 | HP014_VinylFlooring_After.jpg | Other  Before & Afters\HP014_VinylFlooring_After.jpg | 1536×2048 | 1007.2 | `d37abed57981a5b7...` | `e7c7070732fcf4e4...` |
| 31 | HP014_VinylFlooring_Before.jpg | Other  Before & Afters\HP014_VinylFlooring_Before.jpg | 1536×2048 | 1139.6 | `23795fb692855f88...` | `f1f101013973ff72...` |
| 32 | HP015_VinylFlooring_After.jpg | Other  Before & Afters\HP015_VinylFlooring_After.jpg | 1536×2048 | 949.8 | `77d22cc406785f62...` | `fffff1fd7f3c0000...` |
| 33 | HP015_VinylFlooring_Before.jpg | Other  Before & Afters\HP015_VinylFlooring_Before.jpg | 1536×2048 | 1098.3 | `370603489fa7c9bd...` | `fffffffd4f230000...` |
| 34 | HP0017_ExteriorPainting_After.jpg | Painting  Before & Afters\HP0017_ExteriorPainting_After.jpg | 2048×1536 | 800.5 | `8ba3872848826e78...` | `ffdf0fecc0c0c0c0...` |
| 35 | HP0017_ExteriorPainting_Before.jpg | Painting  Before & Afters\HP0017_ExteriorPainting_Before.jpg | 2048×1536 | 1097.3 | `216cc8b785078664...` | `0023cd1c7e6f6e3c...` |
| 36 | HP002_ExteriorPainting_House_After.jpg | Painting  Before & Afters\HP002_ExteriorPainting_House_After.jpg | 1536×2048 | 1643.5 | `65def3ea3171af5d...` | `df83011900061fff...` |
| 37 | HP002_ExteriorPainting_House_Before.jpg | Painting  Before & Afters\HP002_ExteriorPainting_House_Before.jpg | 1536×2048 | 1507.1 | `2a4164c2f7d8a60d...` | `e1fc7e7e3c180000...` |
| 38 | HP006_ExteriorPainting_House_After.jpg | Painting  Before & Afters\HP006_ExteriorPainting_House_After.jpg | 1536×2048 | 1487.3 | `07c0eae184dc5a37...` | `3f1f00181901def8...` |
| 39 | HP006_ExteriorPainting_House_Before.jpg | Painting  Before & Afters\HP006_ExteriorPainting_House_Before.jpg | 1536×2048 | 1622.9 | `0d43db8a4d30037c...` | `0147860e070fffe7...` |
| 40 | HP010_ExteriorPainting_House_After.jpg | Painting  Before & Afters\HP010_ExteriorPainting_House_After.jpg | 5712×4284 | 7446.3 | `2df4fe450b3b35d3...` | `ffff0000300fe070...` |
| 41 | HP010_ExteriorPainting_House_Before.jpg | Painting  Before & Afters\HP010_ExteriorPainting_House_Before.jpg | 3855×2168 | 2477.3 | `3e9c88b28ebb1453...` | `ff7f406738383c78...` |
| 42 | HP016_ExteriorPainting_HouseRefresh_After.jpg | Painting  Before & Afters\HP016_ExteriorPainting_HouseRefresh_After.jpg | 2048×1536 | 1150.8 | `c65e27844063e63a...` | `fefec0c0d8000000...` |
| 43 | HP016_ExteriorPainting_HouseRefresh_Before.jpg | Painting  Before & Afters\HP016_ExteriorPainting_HouseRefresh_Before.jpg | 1536×2048 | 1436.0 | `2a1d4ae6e3b81282...` | `00fc1c80f8f85f07...` |

---

## Duplicate Groups

### Group 1: 2 images

**Canonical Original:** `HP019_FenceRebuild_Before.jpg`
- Path: `Fencing  Before & Afters\HP019_FenceRebuild_Before.jpg`
- Dimensions: 3397×3024
- Size: 2580.5 KB
- SHA256: `f606ce10f283dcd4996c923bb704d46f...`

**Derivatives:**

#### `HP012_FenceRebuild_Before.jpg`
- Path: `Fencing  Before & Afters\HP012_FenceRebuild_Before.jpg`
- Dimensions: 1536×2048
- Size: 857.1 KB
- SHA256: `78e29fe65034376a95759135c6c3fd8d...`
- **Similarity to Canonical:**
  - Perceptual hash distance: 10
  - SHA256 match: ❌ NO
  - Filename similarity: 96.55%
  - EXIF similarity: 50.00%
  - Dimension similarity: 0.00%

### Group 2: 2 images

**Canonical Original:** `HP008_AtticAccessDoorInstallation_After_Open.jpg`
- Path: `Other  Before & Afters\HP008_AtticAccessDoorInstallation_After_Open.jpg`
- Dimensions: 1536×2048
- Size: 830.8 KB
- SHA256: `ac4b329d3b22624747a9285c090cb924...`

**Derivatives:**

#### `HP008_AtticAccessDoorInstallation_After_Closed.jpg`
- Path: `Other  Before & Afters\HP008_AtticAccessDoorInstallation_After_Closed.jpg`
- Dimensions: 1536×2048
- Size: 818.1 KB
- SHA256: `0dba81d66f694ba246ed0baf35119c1e...`
- **Similarity to Canonical:**
  - Perceptual hash distance: 36
  - SHA256 match: ❌ NO
  - Filename similarity: 90.00%
  - EXIF similarity: 66.67%
  - Dimension similarity: 100.00%

### Group 3: 2 images

**Canonical Original:** `HP014_VinylFlooring_After.jpg`
- Path: `Other  Before & Afters\HP014_VinylFlooring_After.jpg`
- Dimensions: 1536×2048
- Size: 1007.2 KB
- SHA256: `d37abed57981a5b7a5bc393c8f7bbf16...`

**Derivatives:**

#### `HP015_VinylFlooring_After.jpg`
- Path: `Other  Before & Afters\HP015_VinylFlooring_After.jpg`
- Dimensions: 1536×2048
- Size: 949.8 KB
- SHA256: `77d22cc406785f62a363f25306530cfc...`
- **Similarity to Canonical:**
  - Perceptual hash distance: 32
  - SHA256 match: ❌ NO
  - Filename similarity: 96.55%
  - EXIF similarity: 66.67%
  - Dimension similarity: 100.00%

### Group 4: 2 images

**Canonical Original:** `HP014_VinylFlooring_Before.jpg`
- Path: `Other  Before & Afters\HP014_VinylFlooring_Before.jpg`
- Dimensions: 1536×2048
- Size: 1139.6 KB
- SHA256: `23795fb692855f883b9c8af6f3205ac1...`

**Derivatives:**

#### `HP015_VinylFlooring_Before.jpg`
- Path: `Other  Before & Afters\HP015_VinylFlooring_Before.jpg`
- Dimensions: 1536×2048
- Size: 1098.3 KB
- SHA256: `370603489fa7c9bd5a5170f3c2d94dc3...`
- **Similarity to Canonical:**
  - Perceptual hash distance: 38
  - SHA256 match: ❌ NO
  - Filename similarity: 96.67%
  - EXIF similarity: 66.67%
  - Dimension similarity: 100.00%

### Group 5: 3 images

**Canonical Original:** `HP010_ExteriorPainting_House_After.jpg`
- Path: `Painting  Before & Afters\HP010_ExteriorPainting_House_After.jpg`
- Dimensions: 5712×4284
- Size: 7446.3 KB
- SHA256: `2df4fe450b3b35d38be23538e2fdcf0d...`

**Derivatives:**

#### `HP002_ExteriorPainting_House_After.jpg`
- Path: `Painting  Before & Afters\HP002_ExteriorPainting_House_After.jpg`
- Dimensions: 1536×2048
- Size: 1643.5 KB
- SHA256: `65def3ea3171af5d3fb7634a284260b2...`
- **Similarity to Canonical:**
  - Perceptual hash distance: 27
  - SHA256 match: ❌ NO
  - Filename similarity: 94.74%
  - EXIF similarity: 50.00%
  - Dimension similarity: 0.00%

#### `HP006_ExteriorPainting_House_After.jpg`
- Path: `Painting  Before & Afters\HP006_ExteriorPainting_House_After.jpg`
- Dimensions: 1536×2048
- Size: 1487.3 KB
- SHA256: `07c0eae184dc5a375f943a3ac2b67e95...`
- **Similarity to Canonical:**
  - Perceptual hash distance: 20
  - SHA256 match: ❌ NO
  - Filename similarity: 94.74%
  - EXIF similarity: 50.00%
  - Dimension similarity: 0.00%

### Group 6: 3 images

**Canonical Original:** `HP010_ExteriorPainting_House_Before.jpg`
- Path: `Painting  Before & Afters\HP010_ExteriorPainting_House_Before.jpg`
- Dimensions: 3855×2168
- Size: 2477.3 KB
- SHA256: `3e9c88b28ebb145335dc39ee38ce6bfd...`

**Derivatives:**

#### `HP002_ExteriorPainting_House_Before.jpg`
- Path: `Painting  Before & Afters\HP002_ExteriorPainting_House_Before.jpg`
- Dimensions: 1536×2048
- Size: 1507.1 KB
- SHA256: `2a4164c2f7d8a60d7707cc30318998ea...`
- **Similarity to Canonical:**
  - Perceptual hash distance: 25
  - SHA256 match: ❌ NO
  - Filename similarity: 94.87%
  - EXIF similarity: 50.00%
  - Dimension similarity: 0.00%

#### `HP006_ExteriorPainting_House_Before.jpg`
- Path: `Painting  Before & Afters\HP006_ExteriorPainting_House_Before.jpg`
- Dimensions: 1536×2048
- Size: 1622.9 KB
- SHA256: `0d43db8a4d30037caaaed1c6287102fe...`
- **Similarity to Canonical:**
  - Perceptual hash distance: 39
  - SHA256 match: ❌ NO
  - Filename similarity: 94.87%
  - EXIF similarity: 50.00%
  - Dimension similarity: 0.00%

---

## Canonical Media Updates

The following `duplicate_group` assignments should be added to `canonical-media.json`:

### dup-group-001
```json
// Group 1: 2 images
// Canonical: HP019_FenceRebuild_Before.jpg
// Canonical ID: bb1e13ad-a8ec-55ac-aeb3-6380fcab75b3
// HP012_FenceRebuild_Before.jpg -> duplicate_group: "dup-group-001"
// HP019_FenceRebuild_Before.jpg -> duplicate_group: "dup-group-001"
```

### dup-group-002
```json
// Group 2: 2 images
// Canonical: HP008_AtticAccessDoorInstallation_After_Open.jpg
// Canonical ID: e53e11a6-8eeb-53d7-b37f-dd8c56ddf425
// HP008_AtticAccessDoorInstallation_After_Closed.jpg -> duplicate_group: "dup-group-002"
// HP008_AtticAccessDoorInstallation_After_Open.jpg -> duplicate_group: "dup-group-002"
```

### dup-group-003
```json
// Group 3: 2 images
// Canonical: HP014_VinylFlooring_After.jpg
// Canonical ID: a72ff3a9-600d-51db-b7f9-3ef041c0b23a
// HP014_VinylFlooring_After.jpg -> duplicate_group: "dup-group-003"
// HP015_VinylFlooring_After.jpg -> duplicate_group: "dup-group-003"
```

### dup-group-004
```json
// Group 4: 2 images
// Canonical: HP014_VinylFlooring_Before.jpg
// Canonical ID: a8ce8ccd-df6f-5d73-bbfd-1e41a601918b
// HP014_VinylFlooring_Before.jpg -> duplicate_group: "dup-group-004"
// HP015_VinylFlooring_Before.jpg -> duplicate_group: "dup-group-004"
```

### dup-group-005
```json
// Group 5: 3 images
// Canonical: HP010_ExteriorPainting_House_After.jpg
// Canonical ID: f711baca-4ff4-5da9-b5ed-81e4cfaa4abf
// HP002_ExteriorPainting_House_After.jpg -> duplicate_group: "dup-group-005"
// HP006_ExteriorPainting_House_After.jpg -> duplicate_group: "dup-group-005"
// HP010_ExteriorPainting_House_After.jpg -> duplicate_group: "dup-group-005"
```

### dup-group-006
```json
// Group 6: 3 images
// Canonical: HP010_ExteriorPainting_House_Before.jpg
// Canonical ID: 9c1d7116-28c2-5b8e-bdfc-bd21c5d1a639
// HP002_ExteriorPainting_House_Before.jpg -> duplicate_group: "dup-group-006"
// HP006_ExteriorPainting_House_Before.jpg -> duplicate_group: "dup-group-006"
// HP010_ExteriorPainting_House_Before.jpg -> duplicate_group: "dup-group-006"
```

---

## Recommendations

### Immediate Actions

1. **Review duplicate groups** above to confirm they are true duplicates
2. **Update `canonical-media.json`** with the `duplicate_group` assignments
3. **Consider removing derivatives** after confirming canonical originals are correct
4. **Update any references** in project files to point to canonical originals

### Long-term Improvements

1. **Implement automatic duplicate detection** in the image pipeline
2. **Add duplicate prevention** to photo intake process
3. **Create archive policy** for derivative images
4. **Consider using hard links** for identical files to save space

---

*Report generated by duplicate_detection.py*
*Happy Place Carpentry Media Analysis*