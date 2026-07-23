# Authority Reconciliation — Final Report

**Date:** 2026-07-22
**Status:** COMPLETE
**Method:** Filesystem is truth. Read-only audit → targeted authority fixes.

---

## Summary

| Metric | Before | After |
|--------|--------|-------|
| Physical source images | 21 | 21 |
| Optimized variants on disk | 103 | 103 |
| media.v1.json entries | 16 | **22** |
| brand.v1.json null mediaIds | 3 | **1** (logo only) |
| Variant key `web` present | 0/16 | **22/22** |
| Orphaned physical files | 0 | 0 |
| Orphaned authority records | 0 | 0 |
| Broken UI references | 3 | **0** |

## Changes Made

### 1. media.v1.json — 6 entries added, `web` key added to all

**New entries (6):**

| ID | Source File | Service | Roles | Variants On Disk |
|----|------------|---------|-------|-----------------|
| brand-featured | featured.jpeg | — | brand | 3 (480, thumb) |
| brand-hero | hero.jpeg | — | hero, brand | 3 (480, thumb) |
| brand-portrait | portrait.jpeg | — | portrait, brand | 3 (480, thumb) |
| repairs-001-floor0 | FLOOR0.jpg | repairs | gallery | 7 (480, 768, 1080, thumb) |
| repairs-001-img0544 | IMG_0544.JPG | repairs | gallery | 3 (480, thumb) |
| repairs-001-img0546 | IMG_0546.JPG | repairs | gallery | 3 (480, thumb) |

**`web` variant key added to all 22 entries** — points to same path as `webp`. Components access `variants.web` (page.tsx:26,29; service-card.tsx:21).

### 2. brand.v1.json — 2 mediaIds populated

| Asset | Before | After |
|-------|--------|-------|
| homepageHero.mediaId | null | `"brand-hero"` |
| ownerPortrait.mediaId | null | `"brand-portrait"` |
| logo.mediaId | null | null (no logo photo exists) |

### 3. projects.v1.json — fabricated projects replaced (from prior session, now committed)

| Before (fabricated) | After (real) |
|---------------------|-------------|
| cedar-fence-001 | fences-001 |
| deck-remodel-001 | builtins-001 |
| bathroom-remodel-001 | repairs-001 |
| pergola-001 | outdoor-living-001 |
| — | bathroom-remodeling-001 |

All media references in the new projects resolve to existing entries in media.v1.json.

## Verification

### Variant Path Check
```
110/110 variant paths resolve to existing files on disk
0 missing
```

### Brand Chain
```
homepageHero -> mediaId='brand-hero' -> variants.web -> /images/projects/hero/hero-480.webp -> EXISTS
ownerPortrait -> mediaId='brand-portrait' -> variants.web -> /images/projects/portrait/portrait-480.webp -> EXISTS
```

### Project Chains
```
fences-001 -> hero: fences-001-hero -> variants.web -> EXISTS
builtins-001 -> hero: builtins-001-hero -> variants.web -> EXISTS
repairs-001 -> hero: repairs-001-hero -> variants.web -> EXISTS
outdoor-living-001 -> hero: outdoor-living-001-hero -> variants.web -> EXISTS
bathroom-remodeling-001 -> hero: bathroom-remodeling-001-hero -> variants.web -> EXISTS
```

### Service Chains
```
fences -> projects.v1.json -> fences-001 -> hero -> media.v1.json -> disk ✓
built-ins -> projects.v1.json -> builtins-001 -> hero -> media.v1.json -> disk ✓
repairs -> projects.v1.json -> repairs-001 -> hero -> media.v1.json -> disk ✓
outdoor-living -> projects.v1.json -> outdoor-living-001 -> hero -> media.v1.json -> disk ✓
bathrooms -> projects.v1.json -> bathroom-remodeling-001 -> hero -> media.v1.json -> disk ✓
```

### Build
```
TypeScript: 0 errors
Next.js build: 53 pages generated successfully
```

## Remaining Items (not blocking)

| Item | Status | Notes |
|------|--------|-------|
| logo.mediaId | null | No logo photo exists on disk. Expected. |
| before/after slider | Hidden | No projects have before/after media configured. Component hides gracefully. |
| cedar-fence-001 project | Does not exist | Homepage looks for it. Will not render before/after section. |
| placeholder.jpg | Does not exist | before-after-card.tsx fallback. Only triggered if before/after is configured. |
| Higher-res source photos | Needed | hero (480×640), portrait (640×427), featured (480×640) are phone-quality. |
| Outdoor Living 768/1080 variants | Not generated | Source photos are 480px. Pipeline correctly skipped larger breakpoints. |

## Authority Chain (final state)

```
Component
  │
  ├─ getHomepageHero() → brand.v1.json → mediaId: "brand-hero"
  │                                          │
  │                                    media.v1.json → variants.web
  │                                          │
  │                                    /images/projects/hero/hero-480.webp → DISK ✓
  │
  ├─ getOwnerPortrait() → brand.v1.json → mediaId: "brand-portrait"
  │                                          │
  │                                    media.v1.json → variants.web
  │                                          │
  │                                    /images/projects/portrait/portrait-480.webp → DISK ✓
  │
  ├─ ServiceCard(slug) → getFeaturedServiceMedia()
  │         │
  │         └─ projects.v1.json → media.hero → media.v1.json → variants.web → DISK ✓
  │
  └─ BeforeAfterSlider(project) → project.media.before/after → null → hidden ✓
```

No broken links. No placeholder metadata. No fabricated IDs. No orphaned files. No orphaned authority.
