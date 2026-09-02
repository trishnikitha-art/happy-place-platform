# Media Authority Forensic Audit Report

## Executive Summary

**CRITICAL FINDING**: The public media gate (`resolvePublicMedia`) is designed to read from KV (Redis) at runtime, but during static generation it returns null when KV is unavailable. This breaks the build-safe media loading chain.

The recent commits correctly identified that dynamic Redis reads during prerendering were causing build failures, but the solution incorrectly removed the visual content instead of making the media gate build-safe.

## Current State Audit

### 1. Canonical Media Authority (media.v1.json)
- **Total media records**: 96
- **Valid published assets**: All 96 records have `lifecycleState: "published"`, `source: "local"`, `storage: "static"`
- **Brand media**: `brand-hero`, `brand-portrait`, `brand-featured` all exist with valid records
- **Project media**: All 14 projects have valid hero and gallery media references
- **Physical files**: All variant files exist in `public/images/projects/`

### 2. Projects Authority (projects.v1.json)
- **Total projects**: 14
- **Projects with valid media**: All 14 projects have valid hero and gallery references
- **Featured projects**: 3 projects marked as featured
- **Homepage eligible**: 8 projects marked as homepageEligible

### 3. Brand Authority (brand.v1.json)
- **homepageHero.mediaId**: `"brand-hero"` ✓
- **ownerPortrait.mediaId**: `"brand-portrait"` ✓
- **Both IDs resolve to valid media records**

### 4. Gallery Projection (.generated/gallery-projection.json)
- **Status**: STALE/INVALID
- **Contains**: Fake project IDs (`project-featured`, `project-hp0017`, `project-hp0018`)
- **Contains**: Fake filename references (`hero-background-enhanced.jpg`, `Feature-Fence-Photo.jpg`)
- **Does NOT contain**: Actual canonical project IDs from projects.v1.json
- **Does NOT contain**: Actual canonical media IDs from media.v1.json

### 5. Physical Files Verification
- **hero files**: hero-480.webp, hero-480.avif, hero-thumb.webp ✓
- **portrait files**: portrait-480.webp, portrait-480.avif, portrait-thumb.webp ✓
- **Project files**: All variant files exist for all 14 projects ✓

## The Root Cause

### Media Gate Architecture Problem

The `resolvePublicMedia` function in `src/lib/media.ts` follows this chain:

```
resolvePublicMedia(id)
  → getMediaByIdAsync(id)
    → getMedia(id) from KV (Redis)
      → Returns null if KV unavailable
```

**During static generation**:
- KV is unavailable
- `getMediaByIdAsync` returns null
- `resolvePublicMedia` returns null
- All visual slots render empty

**During runtime**:
- KV is available
- If records exist in KV, they resolve
- If records don't exist in KV, they fail
- Static media.v1.json is never consulted

### The Architectural Contract vs. Implementation

**Contract**: Media Authority (media.v1.json + KV)
- KV is the runtime authority
- Static files are for backup/audit only

**Problem**: The implementation makes KV mandatory even during static generation, which is architecturally incorrect. Static generation should use the static projection (media.v1.json) directly.

## Visual Slots Analysis

### Homepage Visual Slots

1. **Hero Background**
   - `brand.v1.json.homepageHero.mediaId`: `"brand-hero"` ✓
   - `media.v1.json` record exists ✓
   - Physical files exist ✓
   - **BLOCKED BY**: resolvePublicMedia → KV lookup (fails during static build)

2. **Owner Portrait**
   - `brand.v1.json.ownerPortrait.mediaId`: `"brand-portrait"` ✓
   - `media.v1.json` record exists ✓
   - Physical files exist ✓
   - **BLOCKED BY**: resolvePublicMedia → KV lookup (fails during static build)

3. **Service Cards**
   - `services.v1.json` cardMediaId values: all valid ✓
   - `media.v1.json` records exist ✓
   - Physical files exist ✓
   - **BLOCKED BY**: resolvePublicMedia → KV lookup (fails during static build)

4. **Gallery**
   - `.generated/gallery-projection.json`: STALE with fake data
   - Real projects exist in projects.v1.json
   - Real media exists in media.v1.json
   - **BLOCKED BY**: Stale projection + KV lookup

### Recent Commits Analysis

**Commit 15bf09e** - "Fix brand media loading to use static configuration"
- Changed `getHomepageHero()` to use static brand.v1.json instead of Redis
- Changed `getOwnerPortrait()` to use static brand.v1.json instead of Redis
- **BUT**: Both functions still call `resolvePublicMedia` which tries KV lookup
- **RESULT**: Static IDs are fetched, but resolution still fails

**Commit c3a2c48** - "Fix homepage service cards to use static configuration"
- Changed service cards to use static services.v1.json cardMediaId
- **BUT**: Still calls `resolvePublicMedia` which tries KV lookup
- **RESULT**: Static IDs are fetched, but resolution still fails

**Commit 80287ee** - "Remove dynamic Redis assignment call from homepage"
- Removed bottom visual section
- **RESULT**: Removed visual content that should have been fixed

## The Actual Problem

The core issue is NOT:
- Missing media records
- Missing physical files
- Invalid media IDs
- Broken canonical authority

The core problem IS:
- `resolvePublicMedia` tries KV lookup during static generation
- KV is unavailable during static generation
- All media resolution returns null
- All visual slots render empty

## The Fix Required

### Architectural Correction

The media gate needs to be build-safe by using the static projection during static generation:

```typescript
export async function resolvePublicMedia(id: string): Promise<Media | null> {
  // During static build, use static authority (media.v1.json)
  if (isStaticBuild()) {
    const staticMedia = getStaticMediaForBootstrap(id);
    if (staticMedia && isPublishedMediaAsset(staticMedia)) {
      return staticMedia;
    }
    return null;
  }

  // During runtime, use KV authority
  const media = await getMediaByIdAsync(id);
  if (!media) {
    return null;
  }

  // Apply public media gate validation
  if (!isPublishedMediaAsset(media)) {
    return null;
  }

  return media;
}
```

### Gallery Projection Regeneration

The `.generated/gallery-projection.json` needs to be regenerated from:
- Canonical projects (projects.v1.json)
- Canonical media (media.v1.json)
- Real project IDs and media IDs

### Visual Slots Restoration

All visual slots should work once the media gate is build-safe:
- Hero: brand-hero (already valid)
- Owner portrait: brand-portrait (already valid)
- Service cards: All cardMediaId values (already valid)
- Gallery: Will work once projection is regenerated

## Next Steps

1. Fix `resolvePublicMedia` to use static authority during static build
2. Regenerate `.generated/gallery-projection.json` from canonical authority
3. Verify all visual slots resolve through the corrected chain
4. Test production build
5. Verify deployed site renders actual images

## Evidence Summary

- **Canonical media records**: 96 valid records ✓
- **Physical files**: All variant files exist ✓
- **Brand media IDs**: Valid and correctly configured ✓
- **Project media IDs**: Valid and correctly configured ✓
- **Gallery projection**: STALE with fake data ✗
- **Media gate**: Not build-safe (requires KV during static generation) ✗
- **Visual slots**: Blocked by media gate failure ✗

## Conclusion

The media authority records and physical files are all present and valid. The problem is purely in the media resolution layer - the public media gate is not build-safe and tries to access KV during static generation when KV is unavailable. This is an architectural implementation problem, not a missing content problem.
