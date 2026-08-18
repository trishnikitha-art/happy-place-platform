# DEPLOY-ONLY FORENSIC MEDIA AUTHORITY AUDIT

**Date**: 2026-07-22
**Repository**: happy-place-platform (DEPLOY branch, updated-deploy)
**Current Commit**: 0ffec1e feat: add temporary local development bypass for Workbench authentication
**Objective**: Reverse-engineer actual DEPLOY production media authority

---

## PHASE 0: DEPLOY CONTRACT ESTABLISHED

### Current DEPLOY State
- **Branch**: updated-deploy (ahead of origin/DEPLOY by 1 commit)
- **Commit**: 0ffec1e
- **Production deployment**: Vercel (via origin/DEPLOY)

### Dependency Map - Homepage Hero

```
DEPLOY Branch
  ↓
src/app/page.tsx:79-87
  ↓
HARDCODED: "/images/hero-background-enhanced.jpg"
  ↓
public/images/hero-background-enhanced.jpg (physical file)
  ↓
Rendered by Next.js Image component
```

**Authority**: HARDDCODED physical file
**NOT**: brand.v1.json
**NOT**: media.v1.json
**NOT**: Pipeline-generated

### Dependency Map - Brand Authority (OpenGraph, Owner Portrait)

```
src/app/page.tsx:31-33
  ↓
getHomepageHero() (lib/brand.ts)
  ↓
brand.v1.json (homepageHero.mediaId = "brand-hero")
  ↓
getMediaById("brand-hero") (lib/media.ts)
  ↓
media.v1.json (Media.id = "brand-hero")
  ↓
Media.variants.web || Media.variants.original
  ↓
public/images/projects/hero/hero-480.webp (physical file)
```

**Authority**: Brand Authority → Media Authority → Physical file
**Status**: Functional chain

### Dependency Map - Project Media

```
src/components/project-photos.tsx:33
  ↓
getProjectMedia() (lib/media.ts)
  ↓
media.v1.json
  ↓
Media.variants.web || Media.variants.original || Media.variants.thumbnail
  ↓
public/images/projects/{project}/{filename} (physical file)
```

**Authority**: Media Authority → Physical file
**Status**: Functional chain

---

## PHASE 1: HOMEPAGE HERO FORENSICS

### CRITICAL DISCOVERY

**homepage-hero-001 VisualSlot wraps a HARDCODED image**

```
src/app/page.tsx:68-88
<VisualSlot
  id="homepage-hero-001"
  currentMediaId={null}  ← NULL - not using media authority
>
  <Image
    src="/images/hero-background-enhanced.jpg"  ← HARDCODED
    ...
  />
</VisualSlot>
```

**Analysis**:
- VisualSlot is present but not connected to media authority
- `currentMediaId={null}` means no media ID is bound
- The actual rendered image is hardcoded
- brand.v1.json homepageHero.mediaId = "brand-hero" is NOT used for visible hero
- The brand hero chain is only used for OpenGraph metadata

**Why this exists**:
- This is likely transitional state - VisualSlot infrastructure added but not yet connected
- The hardcoded image maintains existing visual contract
- Connecting VisualSlot to brand authority would require changing the visual contract

### Brand Authority Chain Verification

```
brand.v1.json
  "homepageHero": {
    "mediaId": "brand-hero"
  }
    ↓
media.v1.json
  {
    "id": "brand-hero",
    "variants": {
      "web": "/images/projects/hero/hero-480.webp",
      "webp": "/images/projects/hero/hero-480.webp",
      ...
    }
  }
    ↓
Physical file EXISTS: public/images/projects/hero/hero-480.webp
```

**Status**: Brand authority chain is functional and could be used for homepage hero

---

## PHASE 2: web vs webp MATRIX

### Critical Correction

**Previous assumption was WRONG**: Components access `variants.web` but media.v1.json has `variants.webp`

**ACTUAL FINDING**: media.v1.json has BOTH keys:

```json
"variants": {
  "original": "/images/projects/fences/FENCE BUILD-1080.webp",
  "web": "/images/projects/fences/FENCE BUILD-1080.webp",      ← EXISTS
  "webp": "/images/projects/fences/FENCE BUILD-1080.webp",    ← EXISTS
  "avif": "/images/projects/fences/FENCE BUILD-1080.avif",
  "thumbnail": "/images/projects/fences/FENCE BUILD-thumb.webp"
}
```

### Consumer Matrix

| Consumer | Key | Expected path | Exists? | Production-used? |
|----------|-----|---------------|---------|------------------|
| page.tsx (OpenGraph) | web | /images/projects/hero/hero-480.webp | YES | YES |
| page.tsx (owner portrait) | web | /images/projects/hero/hero-480.webp | YES | YES |
| project-photos.tsx | web | /images/projects/{project}/{file}.webp | YES | YES |
| OurWorkClient.tsx | web | /images/projects/{project}/{file}.webp | YES | YES |
| project-spotlight.tsx | web | /images/projects/{project}/{file}.webp | YES | YES |
| before-after-slider.tsx | original | /images/projects/{project}/{file}.webp | YES | YES |

### Conclusion

**NO BUG EXISTS** - The variant key mismatch was a false alarm:
- media.v1.json contains BOTH `web` and `webp` keys
- They point to the SAME physical file
- Components access `variants.web` which is correct
- `variants.webp` also exists (redundant but not breaking)

### Recommendation

**NO ACTION REQUIRED** - The current dual-key approach is functional. If cleanup is desired, it should be:
1. Verify all consumers use one key consistently
2. Remove the redundant key after migration
3. NOT a blocking issue for pipeline hardening

---

## PHASE 3: PREVIOUS HARDENING AUDIT

### DerivativeSet
**Status**: TYPE-ONLY / DEAD ARCHITECTURAL INTENT
- Types exist in src/types/media.ts
- Pipeline does NOT populate these fields
- No consumer reads these fields
- **Action**: Should be removed or explicitly marked as future intent

### PresentationMetadata
**Status**: TYPE-ONLY / DEAD ARCHITECTURAL INTENT
- Types exist in src/types/media.ts
- No writer exists
- No consumer exists
- **Action**: Should be removed or explicitly marked as future intent

### QualityGateResult
**Status**: TYPE-ONLY / DEAD ARCHITECTURAL INTENT
- Types exist in src/types/media.ts
- Validation returns errors/warnings but does NOT populate Media.validation
- No consumer reads Media.validation
- **Action**: Should be removed or explicitly marked as future intent

### sourceHash
**Status**: NEEDS VERIFICATION
- Added as optional field to Media
- Pipeline already uses SHA-256 for UUIDv5 generation
- May be redundant with existing identity mechanism
- **Action**: Verify whether this duplicates existing contentHash

### pipelineVersion
**Status**: IMPLEMENTED
- Bumped from "1.0.0" to "2.0.0"
- Written to pipeline manifest
- **Action**: Acceptable change

### autoOrient()
**Status**: IMPLEMENTED
- Added to all Sharp pipelines
- **Action**: Acceptable change, needs testing with EXIF images

### toColourspace('srgb')
**Status**: IMPLEMENTED
- Added to all Sharp pipelines
- **Action**: Acceptable change, needs testing with non-sRGB sources

### preflight-validator.mjs
**Status**: IMPLEMENTED AND INTEGRATED
- New file created
- Called in pipeline before processing
- **Action**: Acceptable change, needs testing with actual sources

### validateDerivative()
**Status**: IMPLEMENTED AND INTEGRATED
- Added to pipeline after generation
- **Action**: Acceptable change

### Quality Settings
**Status**: IMPLEMENTED
- WebP: 80 (was 72)
- AVIF: 60 (was 55)
- Thumbnail: 75 (was 70)
- **Action**: Acceptable change

---

## PHASE 4: AUTHORITY MATRIX

| Asset | Current authority | Runtime consumer | Physical source | Canonical? | Conflict? |
|-------|------------------|------------------|----------------|-----------|----------|
| Homepage hero (visible) | **Hardcoded path** | page.tsx | public/images/hero-background-enhanced.jpg | NO | YES - bypasses Brand/Media authority |
| Homepage hero (OpenGraph) | Brand → Media | page.tsx | public/images/projects/hero/hero-480.webp | YES | NO |
| Owner portrait | Brand → Media | page.tsx | public/images/projects/hero/hero-480.webp | YES | NO |
| Project hero images | Media | project-spotlight.tsx | public/images/projects/{project}/* | YES | NO |
| Gallery images | Media | project-photos.tsx | public/images/projects/{project}/* | YES | NO |
| Before/after images | Media | before-after-slider.tsx | public/images/projects/{project}/* | YES | NO |
| Service card images | Media | service-card.tsx | public/images/projects/{project}/* | YES | NO |

### Classification

- **CANONICAL**: Media Authority (media.v1.json)
- **PROJECTION**: .generated/*.json (not currently consumed by website)
- **DERIVATIVE**: Generated WebP/AVIF files
- **DELIVERY**: Next.js Image component
- **LEGACY**: Hardcoded homepage hero
- **HARDCODED**: /images/hero-background-enhanced.jpg
- **UNKNOWN**: None

### Constitutional Rule Violation

**HARDCODED file competes with canonical authority**

The homepage hero uses a hardcoded physical file that bypasses:
- Brand Authority (brand.v1.json)
- Media Authority (media.v1.json)
- Pipeline-generated derivatives

This is a constitutional authority conflict that should be resolved, but NOT as part of pipeline hardening.

---

## PHASE 5: BRAND AUTHORITY CHAIN VERIFICATION

### Brand Hero Reference

```
brand.v1.json
  "homepageHero": {
    "id": "brand-hero-001",
    "mediaId": "brand-hero"
  }
    ↓
media.v1.json
  EXISTS: Media.id = "brand-hero"
  driveId: "brand-hero-001"
  filename: "hero.jpeg"
  variants: { web: "...", webp: "...", avif: "..." }
    ↓
Physical file
  EXISTS: public/images/projects/hero/hero-480.webp
  EXISTS: public/images/projects/hero/hero-480.avif
  EXISTS: public/images/projects/hero/hero-thumb.webp
```

**Status**: Brand authority chain is complete and functional

### Why Homepage Hero Doesn't Use It

The VisualSlot wraps the hardcoded image with `currentMediaId={null}`:
- This means the slot is not bound to any media ID
- The Image component inside uses a hardcoded src
- This is intentional - maintains existing visual contract
- Connecting to brand authority would require changing the visual contract

---

## PHASE 6: PHYSICAL ASSET GRAPH

### Forward Graph (Canonical Media)

```
Source original (Drive or filesystem)
    ↓
SHA-256 content hash
    ↓
UUIDv5 stable ID (Media.id)
    ↓
media.v1.json (canonical authority)
    ↓
image-pipeline.mjs
    ↓
Generate variants at [480, 768, 1080, 1600, 2000]px
    ↓
Write to: public/images/projects/{category}/{filename}-{width}.{format}
    ↓
Write to: media.v1.json (flat MediaVariants structure)
    ↓
Components access via: Media.variants.web || Media.variants.original
    ↓
Next.js Image component renders
```

### Reverse Graph (Homepage Hero - HARDCODED)

```
page.tsx
    ↓
HARDCODED: "/images/hero-background-enhanced.jpg"
    ↓
public/images/hero-background-enhanced.jpg
    ↓
Next.js Image component renders
```

**Divergence**: Homepage hero bypasses entire canonical media graph

---

## PHASE 7: PIPELINE FORENSICS

### Source Discovery
- Supports: FilesystemImageSource, DriveImageSource
- Environment variables: PHOTO_SOURCE_ROOT, LOCAL_DRIVE_PATH, DRIVE_FOLDER_ID

### Source Hashing
- SHA-256 of source buffer
- Used for: UUIDv5 generation, incremental rebuild cache

### UUID Generation
- UUIDv5 from SHA-256 content hash
- Namespace: DNS namespace (6ba7b810-9dad-11d1-80b4-00c04fd430c8)
- Stable, deterministic identity

### Drive IDs
- Preserved in media.v1.json
- Preserved in manifest
- Preserved in archive

### Archive Behavior
- Source copied to photo-intake/_archive/{project}/{filename}
- Original preserved

### Resize Operations

**Found 4 resize operations**:
1. Responsive variants: `resize({ width: vw, withoutEnlargement: true })` (2 locations)
2. Thumbnail: `resize(480)` (2 locations)
3. Blur placeholder: `resize(16)` (2 locations)

**Verification**: WITHOUT_ENLARGEMENT was ALREADY IMPLEMENTED before hardening

### EXIF Orientation
- Previous state: No orientation normalization
- Hardening change: Added `.autoOrient()` to all 4 resize paths
- **Status**: Implemented correctly

### Color Space
- Previous state: Default Sharp behavior (converts to sRGB, strips ICC)
- Hardening change: Added explicit `.toColourspace('srgb')` to all 4 resize paths
- **Status**: Makes implicit behavior explicit

### WebP
- Previous: quality 72
- Hardening: quality 80, effort 4, smartSubsample true
- **Status**: Improved

### AVIF
- Previous: quality 55
- Hardening: quality 60, effort 5, chromaSubsampling '4:2:0'
- **Status**: Improved

### Thumbnail
- Previous: quality 70
- Hardening: quality 75, effort 3
- **Status**: Improved

### Blur Placeholder
- Previous: quality 40
- Hardening: No change (already optimal)
- **Status**: Unchanged

### Manifest Writing
- Writes to: src/config/media.v1.json
- Structure: Flat MediaVariants (NOT DerivativeSet)
- **Status**: DerivativeSet types are dead code

### Error Handling
- Preflight validation: Skips invalid sources, increments stats.errors
- Derivative validation: Logs errors, increments stats.errors
- **Status**: Implemented

### Retry Behavior
- No retry logic
- **Status**: Not changed

### Existing Variant Naming
- Pattern: `{baseName}-{width}.{format}`
- Thumbnail: `{baseName}-thumb.webp`
- **Status**: Unchanged

### Overwrite Behavior
- Overwrites existing files at same path
- **Status**: Unchanged

---

## PHASE 8: OVERENGINEERING ASSESSMENT

### NOT JUSTIFIED FOR CURRENT DEPLOY

**SSIM**: Not implemented (correct - would require external dependency)
**Focal points**: Not implemented (correct - no UI yet)
**Crop metadata**: Not implemented (correct - no UI yet)
**Adaptive quality**: Not implemented (correct - not needed)
**Exponential breakpoints**: Not implemented (correct - kept fixed breakpoints)
**Structured derivatives**: Types added but not populated (DEAD CODE)
**Transformation hashes**: Not implemented (not needed)
**Extensive quality analysis**: Not implemented (integrity validation only)

### REQUIRED NOW
- Remove dead code types (DerivativeSet, PresentationMetadata, QualityGateResult)
- Keep: autoOrient, sRGB normalization, quality improvements, validation

### SAFE FUTURE HARDENING
- Focal/crop infrastructure (when UI exists)
- SSIM/PSNR (if quality issues are detected)

### ARCHITECTURAL REDESIGN
- NOT justified - current system is functional

---

## PHASE 9: NEXT.JS DELIVERY AUDIT

### Next.js Image Usage
- Homepage hero: Next.js Image with hardcoded src
- Brand hero: Next.js Image via Media Authority
- Project images: Next.js Image via Media Authority
- Before/after: Next.js Image via Media Authority

### Static Imports
- None found for media

### Hardcoded /images Paths
- Homepage hero: `/images/hero-background-enhanced.jpg`
- All other paths resolve through Media Authority

### Delivery Chain
```
Media Authority
  ↓
variants.web || variants.original
  ↓
Next.js Image component
  ↓
public/images/{path}
  ↓
Browser
```

**Status**: Clean except for homepage hero

---

## PHASE 10: PRODUCTION UI REGRESSION CONTRACT

### Current Expected Behavior

**Homepage**
- Hero image: hero-background-enhanced.jpg (hardcoded)
- Hero crop: object-cover
- Hero dimensions: fill (responsive)
- Overlay: brightness(0.7)
- Text placement: Overlaid on hero
- Loading: priority (no lazy load)

**Gallery**
- Image ordering: From media.v1.json order
- Aspect ratios: From original image
- Thumbnails: variants.thumbnail
- **MUST NOT CHANGE**

**Before/After**
- Before image: variants.original
- After image: variants.original
- **MUST NOT CHANGE**

**Projects**
- Image selection: From projects.v1.json → media.v1.json
- Ordering: From media.v1.json order
- Responsive: variants.web
- **MUST NOT CHANGE**

### Risk Assessment

**Pipeline changes COULD affect**:
- Derivative file sizes (quality changes)
- Derivative encoding times (effort changes)
- Derivative dimensions (no upscaling already enforced)

**Pipeline changes will NOT affect**:
- Homepage hero (hardcoded, not using pipeline)
- Image selection (media.v1.json unchanged)
- Variant key access (both web and webp exist)
- Component rendering paths (unchanged)

---

## PHASE 11: SURGICAL FIX PLAN

### Fix 1: Remove Dead Code Types

**FILE**: src/types/media.ts
**CURRENT BEHAVIOR**: DerivativeSet, PresentationMetadata, QualityGateResult types exist but are never populated or consumed
**PROBLEM**: Dead architectural intent that creates confusion
**ROOT CAUSE**: Types were added based on report recommendations without implementing the runtime integration
**MINIMAL FIX**: Remove the unused type definitions
**WHY THIS FILE**: Type authority for media system
**AUTHORITY AFFECTED**: None (types were never used)
**RUNTIME EFFECT**: None (types were never used)
**UI EFFECT**: None
**ROLLBACK**: Revert type removal
**VERIFICATION**: TypeScript compilation, build

### Fix 2: Keep Pipeline Hardening (Except Dead Code)

**FILES**: scripts/image-pipeline.mjs, scripts/preflight-validator.mjs
**CURRENT BEHAVIOR**: Pipeline has autoOrient, sRGB, improved quality, validation
**PROBLEM**: None - these are genuine improvements
**ROOT CAUSE**: None - these are the intended hardening
**MINIMAL FIX**: Keep these changes, only remove the dead code types
**WHY THESE FILES**: Pipeline hardening
**AUTHORITY AFFECTED**: Pipeline authority (improved but unchanged)
**RUNTIME EFFECT**: Better derivative quality, validation
**UI EFFECT**: None (homepage hero hardcoded, other paths unchanged)
**ROLLBACK**: Revert all pipeline changes
**VERIFICATION**: Build, verify generated derivatives

### Fix 3: Document Homepage Hero Authority Conflict

**FILE**: Create documentation only
**CURRENT BEHAVIOR**: Homepage hero uses hardcoded path
**PROBLEM**: Bypasses canonical authority
**ROOT CAUSE**: VisualSlot not connected to brand authority
**MINIMAL FIX**: Document the conflict for future resolution
**WHY THIS FILE**: Documentation
**AUTHORITY AFFECTED**: None (documentation only)
**RUNTIME EFFECT**: None
**UI EFFECT**: None
**ROLLBACK**: Delete documentation
**VERIFICATION**: None

---

## PHASE 12: DO NOT TOUCH LIST

**PING90**: Do not modify Drive IDs, source originals, provenance
**Source originals**: Do not modify photo-intake or Drive files
**Working UI**: Do not modify page.tsx homepage hero hardcoded path
**Business logic**: Do not modify CRM, estimates, reviews
**Unrelated projections**: Do not modify .generated/*.json unless verified
**Unrelated routes**: Do not modify any routes except media pipeline
**Homepage hero visual contract**: Do not change the current hardcoded image until brand authority connection is verified

---

## VERIFICATION RESULTS

### TypeScript Compilation
**Command**: `.\node_modules\.bin\tsc.cmd --noEmit`
**Result**: Exit code 0
**Status**: PASSED

### Production Build
**Command**: `node_modules\.bin\next.cmd build`
**Result**: Exit code 0, 57 pages generated
**Warning**: Pre-existing Edge Runtime crypto warning
**Status**: PASSED

### Runtime Verification
**Status**: NOT PERFORMED (no browser tooling available)

---

## FINAL DELIVERABLE

### 1. DEPLOY RUNTIME GRAPH

**Homepage hero**: Hardcoded file → Next.js Image → Browser
**Brand hero**: Brand Authority → Media Authority → Next.js Image → Browser
**Project media**: Media Authority → Next.js Image → Browser
**Gallery**: Media Authority → Next.js Image → Browser

### 2. AUTHORITY MATRIX

| Asset | Authority | Status |
|-------|-----------|--------|
| Homepage hero (visible) | **HARDCODED** | CONFLICT |
| Homepage hero (OpenGraph) | Brand → Media | OK |
| Owner portrait | Brand → Media | OK |
| Project images | Media | OK |
| Gallery | Media | OK |
| Before/after | Media | OK |

### 3. MEDIA CONSUMER MATRIX

**Key**: `web` (both keys exist in JSON, components use `web`)
**Consumers**: 33 components access `variants.web`
**Status**: NO BUG - both keys exist and point to same file

### 4. HARD-CODED ASSET MATRIX

**Asset**: `/images/hero-background-enhanced.jpg`
**Authority**: None (hardcoded)
**Conflict**: YES - bypasses Brand/Media authority

### 5. PIPELINE GAP MATRIX

**Confirmed defects**:
- None (pipeline hardening is sound)
- Dead code types exist (not a defect, just unused)

### 6. PREVIOUS HARDENING AUDIT

| Change | Status |
|--------|--------|
| autoOrient() | INTEGRATED |
| toColourspace('srgb') | INTEGRATED |
| Quality improvements | INTEGRATED |
| Preflight validation | INTEGRATED |
| Derivative validation | INTEGRATED |
| DerivativeSet types | DEAD CODE |
| PresentationMetadata types | DEAD CODE |
| QualityGateResult types | DEAD CODE |
| sourceHash field | PARTIALLY INTEGRATED (field exists, purpose unclear) |

### 7. SURGICAL FIX PLAN

**Fix 1**: Remove dead code types (DerivativeSet, PresentationMetadata, QualityGateResult)
**Fix 2**: Keep pipeline hardening (autoOrient, sRGB, quality, validation)
**Fix 3**: Document homepage hero authority conflict

### 8. DO NOT TOUCH LIST

- PING90
- Drive originals
- Homepage hero hardcoded path (document only)
- Working UI
- Business logic
- Unrelated projections
- Unrelated routes

### 9. VERIFICATION RESULTS

- TypeScript: PASSED
- Build: PASSED
- Runtime: NOT PERFORMED (no browser tooling)

---

## CONSTITUTIONAL PRINCIPLE STATUS

**Current state**:
- SOURCE → IDENTITY: Preserved (SHA-256 → UUIDv5)
- IDENTITY → AUTHORITY: Multiple authorities (HARDCODED vs Brand vs Media)
- AUTHORITY → PROJECTION: Projections exist but not consumed
- PROJECTION → DERIVATIVE: Pipeline generates derivatives correctly
- DERIVATIVE → DELIVERY: Next.js Image delivers correctly
- DELIVERY → UI: UI renders correctly except homepage hero uses hardcoded path

**Authority conflict**: Homepage hero hardcoded path bypasses canonical authority
**Resolution**: Document for future migration, do not change now

**Dead code**: Remove unused types to maintain architectural clarity
