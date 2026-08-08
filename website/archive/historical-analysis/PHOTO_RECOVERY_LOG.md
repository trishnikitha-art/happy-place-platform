# Photo Recovery Log

**Date:** 2026-07-22
**Status:** COMPLETE — 22/22 originals mapped, 0 unrecoverable

## Recovery Summary

| Metric | Count |
|--------|-------|
| Originals in photo-intake before recovery | 21 |
| New originals recovered from Drive | 1 |
| Total originals after recovery | **22** |
| Unrecoverable originals | **0** |
| media.v1.json entries | **22** |
| All variant paths verified on disk | **22/22** |

## Recovered Image

| Field | Value |
|-------|-------|
| Source | `H:\My Drive\HOMESERVICEPROJECTPERGOLAS.jpg` |
| Destination | `photo-intake/Pergolas/HOMESERVICEPROJECTPERGOLAS.jpg` |
| Size | 2,081,361 bytes (2.1MB) |
| Dimensions | 4367 × 3275 |
| Media ID | `pergolas-001-hero` |
| Project ID | `pergolas-001` |
| Service | pergolas |
| Optimized variants | 11 files (480/768/1080/1600/2000 webp+avif, thumbnail) |
| Media entry created | YES |
| Project entry created | YES |
| Pipeline processed | YES |

## Complete Portfolio (22 originals)

### Brand (3)
1. `brand-hero` — hero.jpeg (212KB) — Homepage hero background
2. `brand-featured` — featured.jpeg (141KB) — Secondary feature image
3. `brand-portrait` — portrait.jpeg (42KB) — Taylor & Lanie portrait

### Fences (2)
4. `fences-001-hero` — FENCE BUILD.jpg (679KB) — Fence installation hero
5. `fences-001-matching` — FENCEREBUILDMATCHINGSTAIN.png (2.0MB) — Matching stain rebuild

### Built-Ins (2)
6. `builtins-001-hero` — FINISHEDCARPENTRY.png (2.6MB) — Custom shelving hero
7. `builtins-001-secondary` — FINISHEDCARPENTRY0.png (170KB) — Detail view

### Repairs (8)
8. `repairs-001-hero` — TRIMREPAIR.png (3.3MB) — Trim repair hero
9. `repairs-001-drywall` — DRYWALL.png (2.8MB) — Drywall repair
10. `repairs-001-floor` — FLOOR.png (1.5MB) — Floor repair
11. `repairs-001-gutter` — GUTTERCLEANING.jpg (163KB) — Gutter cleaning
12. `repairs-001-floor0` — FLOOR0.jpg (377KB) — Floor detail
13. `repairs-001-img0544` — IMG_0544.JPG (115KB) — Repair detail
14. `repairs-001-img0546` — IMG_0546.JPG (224KB) — Repair detail

### Outdoor Living (6)
15. `outdoor-living-001-hero` — IMG_0535.JPG (238KB) — Outdoor living hero
16. `outdoor-living-001-2` — IMG_0555.JPG (224KB) — Progress photo
17. `outdoor-living-001-3` — IMG_0559.JPG (182KB) — Progress photo
18. `outdoor-living-001-4` — IMG_0737.JPG (221KB) — Detail photo
19. `outdoor-living-001-5` — IMG_0805.JPG (197KB) — Detail photo
20. `outdoor-living-001-6` — IMG_0841.JPG (167KB) — Detail photo

### Bathroom Remodeling (1)
21. `bathroom-remodeling-001-hero` — BATHROOM_WALL.png (1.7MB) — Bathroom hero

### Pergolas (1) — RECOVERED FROM DRIVE
22. `pergolas-001-hero` — HOMESERVICEPROJECTPERGOLAS.jpg (2.1MB) — Pergola construction

## Drive vs Repo Comparison

| File | Drive Size | Repo Size | Match? |
|------|-----------|-----------|--------|
| IMG_0535.JPG | 238,435 | 238,435 | YES |
| IMG_0544.JPG | 114,723 | 114,723 | YES |
| IMG_0546.JPG | 224,160 | 224,160 | YES |
| IMG_0555.JPG | 223,975 | 223,975 | YES |
| IMG_0559.JPG | 181,898 | 181,898 | YES |
| IMG_0737.JPG | 220,526 | 220,526 | YES |
| IMG_0805.JPG | 196,839 | 196,839 | YES |
| IMG_0841.JPG | 167,472 | 167,472 | YES |
| HOMESERVICEPROJECTPERGOLAS.jpg | 2,081,361 | NEW | N/A |

## Authority Chain Status

```
Homepage Hero  → brand.v1.json → "brand-hero"  → media.v1.json → hero-480.webp    → disk ✓
Featured       → brand.v1.json → "brand-featured" → media.v1.json → featured-480.webp → disk ✓
Portrait       → brand.v1.json → "brand-portrait" → media.v1.json → portrait-480.webp → disk ✓
Project pages  → projects.v1.json → media IDs → media.v1.json → variants → disk ✓
Service cards  → services.v1.json → projects → media → variants → disk ✓
Pergola        → projects.v1.json → "pergolas-001-hero" → media.v1.json → pergolas/HOMESERVICEPROJECTPERGOLAS-1080.webp → disk ✓
```

## Commits

- `cc30b3f` — Drive recovery: pergola image from H:\My Drive, media+project records created, pipeline ran
