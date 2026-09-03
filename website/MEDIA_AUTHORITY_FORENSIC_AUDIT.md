# Media Authority Forensic Audit Report

> **HISTORICAL DOCUMENT**: This forensic audit report documents the media authority investigation from an earlier session. The core issues identified have been resolved in the 2026-09-03 architectural fixes. This document is preserved for historical context and forensic reference. For current status, see `CURRENT_STATUS_REPORT.md` and `PRODUCTION_EXECUTION_PLAN.md`.

---

## 2026-09-03 Status Update

**CRITICAL FINDING ADDRESSED**: The static build detection issue identified in this report has been fixed in commit e9ff451. The `isStaticBuild()` function now correctly detects the Next.js production build phase (`'phase-production-build'` instead of `'build'`), ensuring static generation uses static authority without KV access.

**Additional Fixes (2026-09-03)**:
- CI secret drift fixed (5074a79) - ENCRYPTION_KEY_V1 removed from required secrets
- Media proof test fixed (86cb65a) - Updated to match current storage contract
- OAuth integration test fixed (e29431c) - Updated to match current API signatures
- Production reconciliation script added (17a8992)

**Current State**:
- Static build detection: ✅ Fixed
- Media gate build safety: ✅ Fixed
- TypeScript compilation: ✅ Clean (zero errors)
- Production build: ✅ Successful (53 pages, 102 kB shared JS)

The core architectural issue described below has been resolved. The remaining content is preserved for historical context.

---

## Original Executive Summary (Historical)

**CRITICAL FINDING**: The public media gate (`resolvePublicMedia`) is designed to read from KV (Redis) at runtime, but during static generation it returns null when KV is unavailable. This breaks the build-safe media loading chain.

The recent commits correctly identified that dynamic Redis reads during prerendering were causing build failures, but the solution incorrectly removed the visual content instead of making the media gate build-safe.

## Current State Audit (Historical - Earlier Session Context)

> **Note**: The following audit reflects the state at the time of the original investigation. The current state has evolved significantly with 96 media records and expanded project coverage.

### 1. Canonical Media Authority (media.v1.json)
- **Total media records** (at time of audit): 21 (current: 96)
- **Valid published assets**: All records had `lifecycleState: "published"`, `source: "local"`
- **Brand media**: `brand-hero`, `brand-portrait`, `brand-featured` existed with valid records
- **Project media**: Projects had valid hero and gallery media references
- **Physical files**: All variant files existed in `public/images/projects/`

### 2. Projects Authority (projects.v1.json)
- **Total projects** (at time of audit): 5 (current: 14)
- **Projects with valid media**: All projects had valid hero and gallery references
- **Featured projects**: Projects marked as featured
- **Homepage eligible**: Projects marked as homepageEligible

### 3. Brand Authority (brand.v1.json)
- **homepageHero.mediaId**: `"brand-hero"` ✓ (was null at one point, later fixed)
- **ownerPortrait.mediaId**: `"brand-portrait"` ✓ (was null at one point, later fixed)
- **Both IDs resolve to valid media records**

### 4. Gallery Projection (.generated/gallery-projection.json) (Historical)
- **Status** (at time of audit): STALE/INVALID
- **Contained**: Fake project IDs (`project-featured`, `project-hp0017`, `project-hp0018`)
- **Contained**: Fake filename references (`hero-background-enhanced.jpg`, `Feature-Fence-Photo.jpg`)
- **Did NOT contain**: Actual canonical project IDs from projects.v1.json
- **Did NOT contain**: Actual canonical media IDs from media.v1.json
- **Current Status**: May still need regeneration from canonical authority

### 5. Physical Files Verification
- **hero files**: hero-480.webp, hero-480.avif, hero-thumb.webp ✓
- **portrait files**: portrait-480.webp, portrait-480.avif, portrait-thumb.webp ✓
- **Project files**: All variant files exist for all 14 projects ✓

## The Root Cause (Historical Investigation)

### Media Gate Architecture Problem (Historical)

The `resolvePublicMedia` function in `src/lib/media.ts` followed this chain (at time of audit):

```
resolvePublicMedia(id)
  → getMediaByIdAsync(id)
    → getMedia(id) from KV (Redis)
      → Returns null if KV unavailable
```

**During static generation** (at time of audit):
- KV was unavailable
- `getMediaByIdAsync` returned null
- `resolvePublicMedia` returned null
- All visual slots rendered empty

**During runtime** (at time of audit):
- KV was available
- If records existed in KV, they resolved
- If records didn't exist in KV, they failed
- Static media.v1.json was never consulted

### The Architectural Contract vs. Implementation (Historical)

**Contract**: Media Authority (media.v1.json + KV)
- KV is the runtime authority
- Static files are for backup/audit only

**Problem** (at time of audit): The implementation made KV mandatory even during static generation, which was architecturally incorrect. Static generation should use the static projection (media.v1.json) directly.

**Resolution** (2026-09-03): Fixed in commit e9ff451 - Static build detection corrected to use proper Next.js phase, enabling static authority during static generation.

## Visual Slots Analysis (Historical Investigation)

### Homepage Visual Slots (Historical Context)

1. **Hero Background**
   - `brand.v1.json.homepageHero.mediaId`: `"brand-hero"` ✓
   - `media.v1.json` record exists ✓
   - Physical files exist ✓
   - **WAS BLOCKED BY**: resolvePublicMedia → KV lookup (failed during static build)
   - **NOW FIXED**: Static build detection corrected (e9ff451)

2. **Owner Portrait**
   - `brand.v1.json.ownerPortrait.mediaId`: `"brand-portrait"` ✓
   - `media.v1.json` record exists ✓
   - Physical files exist ✓
   - **WAS BLOCKED BY**: resolvePublicMedia → KV lookup (failed during static build)
   - **NOW FIXED**: Static build detection corrected (e9ff451)

3. **Service Cards**
   - `services.v1.json` cardMediaId values: all valid ✓
   - `media.v1.json` records exist ✓
   - Physical files exist ✓
   - **WAS BLOCKED BY**: resolvePublicMedia → KV lookup (failed during static build)
   - **NOW FIXED**: Static build detection corrected (e9ff451)

4. **Gallery**
   - `.generated/gallery-projection.json`: WAS STALE with fake data
   - Real projects exist in projects.v1.json
   - Real media exists in media.v1.json
   - **WAS BLOCKED BY**: Stale projection + KV lookup
   - **STATUS**: May still need regeneration

### Recent Commits Analysis (Historical Context)

**Commit 15bf09e** - "Fix brand media loading to use static configuration"
- Changed `getHomepageHero()` to use static brand.v1.json instead of Redis
- Changed `getOwnerPortrait()` to use static brand.v1.json instead of Redis
- **BUT** (at time): Both functions still called `resolvePublicMedia` which tried KV lookup
- **RESULT** (at time): Static IDs were fetched, but resolution still failed
- **NOW FIXED**: Static build detection allows static authority during build (e9ff451)

**Commit c3a2c48** - "Fix homepage service cards to use static configuration"
- Changed service cards to use static services.v1.json cardMediaId
- **BUT** (at time): Still called `resolvePublicMedia` which tried KV lookup
- **RESULT** (at time): Static IDs were fetched, but resolution still failed
- **NOW FIXED**: Static build detection allows static authority during build (e9ff451)

**Commit 80287ee** - "Remove dynamic Redis assignment call from homepage"
- Removed bottom visual section
- **RESULT** (at time): Removed visual content that should have been fixed
- **NOTE**: This content may need to be restored architecturally

## The Actual Problem (Historical Analysis)

The core issue identified in this investigation was NOT:
- Missing media records
- Missing physical files
- Invalid media IDs
- Broken canonical authority

The core problem identified WAS:
- `resolvePublicMedia` tried KV lookup during static generation
- KV was unavailable during static generation
- All media resolution returned null
- All visual slots rendered empty

**Resolution**: This was fixed in commit e9ff451 by correcting static build detection to use the proper Next.js phase (`'phase-production-build'`), enabling static authority during static generation.

## The Fix Required (Historical - Completed 2026-09-03)

### Architectural Correction (Now Implemented)

The media gate was made build-safe by using the static projection during static generation. This was implemented in commit e9ff451:

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

**Key fix**: `isStaticBuild()` now correctly detects `'phase-production-build'` instead of `'build'`, ensuring static generation uses static authority without KV access.

### Gallery Projection Regeneration (Still Pending)

The `.generated/gallery-projection.json` may still need to be regenerated from:
- Canonical projects (projects.v1.json)
- Canonical media (media.v1.json)
- Real project IDs and media IDs

### Visual Slots Restoration (Partially Complete)

Visual slots should now work with the build-safe media gate:
- Hero: brand-hero ✅ (valid + build-safe resolution)
- Owner portrait: brand-portrait ✅ (valid + build-safe resolution)
- Service cards: All cardMediaId values ✅ (valid + build-safe resolution)
- Gallery: ⏳ Will work once projection is regenerated

## Next Steps (Historical - Completed 2026-09-03)

1. ✅ Fix `resolvePublicMedia` to use static authority during static build - COMPLETED (e9ff451)
2. ⏳ Regenerate `.generated/gallery-projection.json` from canonical authority - PENDING
3. ⏳ Verify all visual slots resolve through the corrected chain - PENDING (requires production access)
4. ✅ Test production build - COMPLETED (TypeScript clean, build successful)
5. ⏳ Verify deployed site renders actual images - PENDING (requires production access)

## Status Update (2026-09-03)

The core issue identified in this forensic audit has been resolved:

- **Static build detection**: Fixed to use correct Next.js phase (`'phase-production-build'`)
- **Media gate build safety**: Now correctly uses static authority during static generation
- **TypeScript compilation**: Clean (zero errors)
- **Production build**: Successful (53 pages, 102 kB shared JS)

The repository is now ready for production execution. The remaining work requires production access to execute KV reconciliation and verify visual slots render correctly on the deployed site.

See `PRODUCTION_EXECUTION_PLAN.md` for the comprehensive production execution plan.

## Evidence Summary (Updated 2026-09-03)

### Historical Evidence (At Time of Audit)
- **Canonical media records**: 21 valid records (current: 96) ✓
- **Physical files**: All variant files exist ✓
- **Brand media IDs**: Valid and correctly configured ✓
- **Project media IDs**: Valid and correctly configured ✓
- **Gallery projection**: STALE with fake data ✗
- **Media gate**: Not build-safe (requires KV during static generation) ✗
- **Visual slots**: Blocked by media gate failure ✗

### Current Evidence (2026-09-03)
- **Canonical media records**: 96 valid records ✓
- **Physical files**: All variant files exist ✓
- **Brand media IDs**: Valid and correctly configured ✓
- **Project media IDs**: Valid and correctly configured ✓
- **Gallery projection**: May still need regeneration ⚠️
- **Media gate**: Build-safe (correct static authority during static generation) ✅
- **Visual slots**: Should work with build-safe media gate ✅
- **TypeScript compilation**: Clean (zero errors) ✅
- **Production build**: Successful (53 pages, 102 kB shared JS) ✅

## Conclusion (Updated 2026-09-03)

### Historical Conclusion
The media authority records and physical files were all present and valid at the time of the audit. The problem was purely in the media resolution layer - the public media gate was not build-safe and tried to access KV during static generation when KV was unavailable. This was an architectural implementation problem, not a missing content problem.

### Current Status
The core architectural issue identified in this forensic audit has been resolved in the 2026-09-03 fixes. The media gate is now build-safe, correctly using static authority during static generation and KV authority during runtime. The repository is ready for production execution to verify visual slots render correctly on the deployed site.

**See `PRODUCTION_EXECUTION_PLAN.md` for the comprehensive production execution plan.**
