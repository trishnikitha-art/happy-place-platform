# DEPLOY FORENSIC REVERSE-ENGINEERING REPORT

**Date**: 2026-07-22
**Repository**: happy-place-platform (DEPLOY branch, updated-deploy)
**Current Commit**: 0ffec1e feat: add temporary local development bypass for Workbench authentication
**Purpose**: Reverse-engineer actual DEPLOY system before any further changes

---

## PHASE 0: FREEZE - CURRENT STATE

### Git Status
- **Branch**: updated-deploy (ahead of origin/DEPLOY by 1 commit)
- **Modified files**:
  - scripts/image-pipeline.mjs (hardening changes)
  - src/app/page.tsx (VisualSlot for hero)
  - src/components/lenis-provider.tsx (unrelated)
  - src/components/visual-slot.tsx (geometry emission)
  - src/lib/slot-registry.ts (geometry handling)
  - src/lib/visual-asset-registry.ts (unrelated)
  - src/types/media.ts (new derivative types)
- **Untracked files**: Multiple forensic reports, new preflight-validator.mjs, workbench files

### Previous Hardening Changes Applied
1. Added EXIF orientation normalization (`autoOrient()`)
2. Added color profile normalization (`toColourspace('srgb')`)
3. Improved quality settings (WebP 80, AVIF 60, thumbnail 75)
4. Added preflight validation module
5. Added derivative validation
6. Bumped pipeline version to 2.0.0
7. Added structured derivative types (DerivativeSet, DerivativeProfile, DerivativeVariant)
8. Added presentation metadata types (PresentationMetadata)
9. Added quality gate types (QualityGateResult)

### CRITICAL DISCOVERY

**The previous hardening changes are NOT integrated with the actual website consumption pattern.**

---

## PHASE 1: REVERSE-ENGINEER ACTUAL DEPLOY SYSTEM

### A. ACTUAL WEBSITE UI CONSUMPTION

#### Homepage Hero
**File**: `src/app/page.tsx:79-87`
```tsx
<Image
  src="/images/hero-background-enhanced.jpg"
  alt="Photograph of a completed deck project..."
  fill
  priority
  sizes="100vw"
  className="object-cover"
  style={{ filter: "brightness(0.7)" }}
/>
```

**Consumes**: HARDCODED PATH `/images/hero-background-enhanced.jpg`
**Authority**: Physical file in `public/images/`
**NOT**: media.v1.json, brand.v1.json, or any canonical system

#### Brand Authority Consumption
**File**: `src/app/page.tsx:31-33`
```tsx
const heroBrand = getHomepageHero();
const heroMedia = heroBrand?.mediaId ? getMediaById(heroBrand.mediaId) : null;
const ogImageUrl = heroMedia?.variants?.web || `${siteUrl}/brand/logo.png`;
```

**Consumes**: brand.v1.json → media.v1.json (for OpenGraph metadata only)
**Authority**: Brand Authority → Media Authority
**NOT**: The actual visible hero image (which is hardcoded)

#### Owner Portrait
**File**: `src/app/page.tsx:51-53`
```tsx
const ownerBrand = getOwnerPortrait();
const ownerMedia = ownerBrand?.mediaId ? getMediaById(ownerBrand.mediaId) : null;
const ownerSrc = ownerMedia?.variants?.web || ownerMedia?.variants?.original;
```

**Consumes**: brand.v1.json → media.v1.json
**Authority**: Brand Authority → Media Authority
**Actual behavior**: Falls back to variants.original if variants.web missing

#### Media Authority Consumption Pattern
**File**: `src/lib/media.ts`
- **Reader**: 13 files consume media.v1.json
- **Primary access pattern**: `getMediaById()` from media.v1.json
- **Variant access pattern**: `media.variants.web || media.variants.original || media.variants.thumbnail`
- **Key finding**: Components use `variants.web` (NOT `webp`)

#### Project Media Consumption
**File**: `src/components/project-photos.tsx:33,37,54`
```tsx
photo.variants.web || photo.variants.original || photo.variants.thumbnail
```

**Consumes**: media.v1.json → MediaAuthority
**Authority**: Media Authority (canonical for project media)
**Variant**: Uses `variants.web` as primary

#### Before/After Slider
**File**: `src/components/before-after-slider.tsx:88-89`
```tsx
const beforeSrc = beforeMedia.variants.original || beforeMedia.variants.webp || beforeMedia.variants.avif;
const afterSrc = afterMedia.variants.original || afterMedia.variants.webp || afterMedia.variants.avif;
```

**Consumes**: media.v1.json → MediaAuthority
**Authority**: Media Authority
**Variant**: Uses `variants.original` as primary, falls back to webp/avif

### B. ACTUAL DATA FLOW

#### Homepage Hero (CURRENT DEPLOY BEHAVIOR)
```
Physical file: public/images/hero-background-enhanced.jpg
    ↓
Hardcoded in: src/app/page.tsx
    ↓
Rendered by: Next.js Image component
    ↓
NOT: media.v1.json
NOT: brand.v1.json
NOT: pipeline-generated
```

#### Brand Authority System
```
brand.v1.json (homepageHero.mediaId = "brand-hero")
    ↓
media.v1.json (Media.id = "brand-hero")
    ↓
Media.variants.web || Media.variants.original
    ↓
Rendered in: OpenGraph metadata, owner portrait
```

#### Project Media System
```
projects.v1.json (project.media.hero = "fences-001-hero")
    ↓
media.v1.json (Media.id = "fences-001-hero")
    ↓
Media.variants.web || Media.variants.original
    ↓
Rendered in: Project detail pages, galleries
```

#### Pipeline System (image-pipeline.mjs)
```
Source (Drive or filesystem)
    ↓
SHA-256 hash → UUIDv5 stable ID
    ↓
Sharp processing (now with autoOrient + sRGB + quality settings)
    ↓
Generate variants at [480, 768, 1080, 1600, 2000]px
    ↓
Write to: public/images/projects/
    ↓
Write to: src/config/media.v1.json (FLAT MediaVariants structure)
    ↓
NOT: DerivativeSet (types exist but not populated)
NOT: PresentationMetadata (types exist but not used)
NOT: QualityGateResult (types exist but not populated)
```

### C. CRITICAL ARCHITECTURAL DISCREPANCIES

#### Discrepancy 1: Homepage Hero
**Expected (from report)**: Brand Authority → Media Authority → variants
**Actual**: Hardcoded `/images/hero-background-enhanced.jpg`
**Impact**: Pipeline changes do NOT affect homepage hero
**Historical note**: hero-background-enhanced.jpg exists in public/images/ and is NOT in media.v1.json

#### Discrepancy 2: Variant Key Naming
**Report assumption**: `variants.webp` is the primary variant
**Actual consumption**: `variants.web` is the primary variant (12 occurrences)
**media.v1.json reality**: Uses `webp` key, not `web` key
**Bug**: Components access `variants.web` but media.v1.json has `variants.webp`
**Status**: This is a KEY BUG - components are accessing a non-existent field

#### Discrepancy 3: DerivativeSet Implementation
**Report assumption**: DerivativeSet will be populated by pipeline
**Actual reality**: DerivativeSet types exist but are NEVER populated
**Pipeline reality**: Still uses flat MediaVariants structure
**Status**: DerivativeSet is DEAD CODE - unused types

#### Discrepancy 4: PresentationMetadata
**Report assumption**: PresentationMetadata will be used for focal/crop
**Actual reality**: PresentationMetadata types exist but are NEVER used
**Status**: PresentationMetadata is DEAD CODE - unused types

#### Discrepancy 5: QualityGateResult
**Report assumption**: QualityGateResult will be populated by validation
**Actual reality**: QualityGateResult types exist but are NEVER populated
**Pipeline reality**: Validation returns errors/warnings but does NOT populate Media.validation
**Status**: QualityGateResult is DEAD CODE - unused types

#### Discrepancy 6: Projections
**Report assumption**: .generated/*.json are canonical projections
**Actual reality**: gallery-projection.json references "hero-background-enhanced.jpg" (hardcoded file)
**Status**: Projections reference hardcoded files, not canonical media IDs

---

## PHASE 2: ACTUAL AUTHORITY MAP

| Concern | Current Authority | Reader | Writer | Status |
|---------|------------------|--------|--------|--------|
| Homepage hero image | **Hardcoded path** in page.tsx | page.tsx | Manual file placement | BUG - should be Brand Authority |
| Brand hero metadata | brand.v1.json | lib/brand.ts | Manual config | OK |
| Brand owner portrait | brand.v1.json | lib/brand.ts | Manual config | OK |
| Project media | media.v1.json | lib/media.ts | image-pipeline.mjs | OK |
| Project hero selection | projects.v1.json | lib/projects.ts | Manual config | OK |
| Gallery images | media.v1.json | lib/media.ts | image-pipeline.mjs | OK |
| Before/after images | media.v1.json | before-after-slider.tsx | image-pipeline.mjs | OK |
| Source asset | Drive or filesystem | image-pipeline.mjs | Manual upload | OK |
| Drive identity | Drive ID in media.v1.json | image-pipeline.mjs | Manual | OK |
| Canonical media identity | UUIDv5 from SHA-256 | image-pipeline.mjs | image-pipeline.mjs | OK |
| Variant generation | image-pipeline.mjs | None | image-pipeline.mjs | OK |
| Variant paths | Media.variants.* | Components | image-pipeline.mjs | BUG - variant key mismatch |
| Projection data | .generated/*.json | None | Projection scripts | OK |
| Visual Asset Registry | visual-asset-registry.ts | Workbench | Manual | OK |
| DerivativeSet | **NOT POPULATED** | None | None | DEAD CODE |
| PresentationMetadata | **NOT POPULATED** | None | None | DEAD CODE |
| QualityGateResult | **NOT POPULATED** | None | None | DEAD CODE |

---

## PHASE 3: AUDIT OF PREVIOUS HARDENING CHANGES

### FLAW 1: DerivativeSet EXISTS BUT IS NOT ACTUALLY THE PIPELINE AUTHORITY
**Status**: CONFIRMED - DerivativeSet types exist but are NEVER populated
**Pipeline reality**: Still writes flat MediaVariants to media.v1.json
**Impact**: Types are dead code, no actual improvement to derivative tracking
**Action**: Should remove these unused types

### FLAW 2: checksum IS UNDERSPECIFIED
**Status**: CONFIRMED - checksum field exists but not implemented
**Pipeline reality**: No checksum computation or storage
**Impact**: Ambiguous identity field that is never populated
**Action**: Should remove or specify transformation hash

### FLAW 3: VARIANT IDENTITY IS INCOMPLETE
**Status**: CONFIRMED - DerivativeVariant lacks source hash, pipeline version
**Pipeline reality**: Types exist but not used
**Impact**: Incomplete identity model that is never populated
**Action**: Should remove unused types

### FLAW 4: quality IS NOT UNIVERSALLY MEANINGFUL
**Status**: CONFIRMED - Different quality numbers for different formats
**Pipeline reality**: Format-specific quality settings are correct
**Impact**: No actual problem here, quality settings are format-specific as they should be

### FLAW 5: toColourspace('srgb') MUST BE PROVEN SAFE
**Status**: NEEDS VERIFICATION - Changes all sources to sRGB
**Concern**: What about Display P3? PNG transparency? Graphics?
**Impact**: May affect color accuracy for certain sources
**Action**: Needs testing with actual HPP source files

### FLAW 6: autoOrient() MUST NOT BE APPLIED CARELESSLY
**Status**: NEEDS VERIFICATION - Normalizes EXIF orientation
**Concern**: Does downstream code expect non-normalized orientation?
**Impact**: May cause double-rotation if orientation is already handled
**Action**: Needs testing with EXIF-rotated images

### FLAW 7: PREFLIGHT VALIDATION MUST NOT DESTROY INGESTION
**Status**: NEEDS VERIFICATION - Validates source before processing
**Concern**: May reject legitimate HPP source files
**Supported types**: .jpg, .jpeg, .png, .webp, .heic, .heif
**Impact**: Could block valid sources if validation is too strict
**Action**: Needs testing with actual HPP source files

### FLAW 8: QUALITY VALIDATION WITHOUT ACTUAL QUALITY VALIDATION
**Status**: CONFIRMED - Only validates integrity, not perceptual quality
**Pipeline reality**: Validates dimensions, format, file size
**Impact**: Does NOT detect perceptual quality degradation
**Action**: Should rename to "derivative integrity validation"

### FLAW 9: node-sharp-iqa NOT INSTALLED
**Status**: CORRECT - Did not install as directed
**Impact**: Good - no unnecessary dependency added

### FLAW 10: 8% BREAKPOINT ALGORITHM NOT IMPLEMENTED
**Status**: CORRECT - Kept fixed breakpoints
**Impact**: Good - no explosion of variant files

### FLAW 11: PROFILE TYPES PREMATURE
**Status**: CONFIRMED - hero/gallery/card/thumbnail profiles defined but not used
**Impact**: Dead code that should be removed

### FLAW 12: PRESENTATION METADATA NOT IMPLEMENTED
**Status**: CORRECT - Did not create slot-mapping.v1.json
**Impact**: Good - no competing authority created

---

## PHASE 4: ACTUAL DEPLOYED UI CONTRACT

### Homepage Hero
- **Page**: `/`
- **Component**: HeroSection
- **Media ID/path**: `/images/hero-background-enhanced.jpg` (HARDCODED)
- **Source of selection**: Manual file placement
- **Variant used**: None (original file)
- **Width/Height**: Not specified (fill)
- **Fit**: object-cover
- **Crop**: None
- **Priority**: true
- **Loading**: priority (no lazy load)
- **Mobile behavior**: 100vw width
- **Desktop behavior**: 100vw width

### Owner Portrait
- **Page**: `/`
- **Component**: HeroSection
- **Media ID**: brand-portrait (from brand.v1.json)
- **Source of selection**: Brand Authority
- **Variant used**: variants.web || variants.original
- **Bug**: media.v1.json has variants.webp, not variants.web

### Project Hero Images
- **Page**: `/projects/[slug]`
- **Component**: ProjectSpotlight
- **Media ID**: From projects.v1.json
- **Source of selection**: Projects Authority → Media Authority
- **Variant used**: variants.web || variants.original
- **Bug**: media.v1.json has variants.webp, not variants.web

### Gallery Images
- **Page**: Various
- **Component**: project-photos.tsx
- **Media ID**: From media.v1.json
- **Source of selection**: Media Authority
- **Variant used**: variants.web || variants.original
- **Bug**: media.v1.json has variants.webp, not variants.web

### Before/After Images
- **Page**: `/`, `/our-work`
- **Component**: BeforeAfterSlider
- **Media ID**: From media.v1.json
- **Source of selection**: Media Authority
- **Variant used**: variants.original || variants.webp || variants.avif
- **Bug**: Uses original, not web

---

## PHASE 5: CRITICAL BUG DISCOVERED

### Variant Key Mismatch
**Components access**: `media.variants.web`
**media.v1.json has**: `media.variants.webp`
**Result**: Components are accessing undefined fields
**Impact**: Images may not render correctly or fallback to undefined
**Severity**: HIGH
**Files affected**:
- src/app/workbench/media/page.tsx
- src/components/project-photos.tsx
- src/app/our-work/OurWorkClient.tsx
- src/lib/validation-engine.ts
- src/lib/analysis.ts

**Immediate action required**: Fix variant key mismatch before any pipeline changes

---

## PHASE 6: STOP CONDITIONS MET

### Multiple Competing Canonical Media Authorities
✓ **DISCOVERED**: Homepage hero uses hardcoded path, NOT Brand/Media Authority
✓ **DISCOVERED**: Visual Asset Registry is separate projection
✓ **DISCOVERED**: Projections reference hardcoded files

### Website Consuming Hardcoded Media Outside Canonical System
✓ **DISCOVERED**: `/images/hero-background-enhanced.jpg` is hardcoded
✓ **DISCOVERED**: This bypasses entire canonical media system

### Generated Projections Not Actually Consumed
✓ **DISCOVERED**: gallery-projection.json references hardcoded files
✓ **DISCOVERED**: Projections may not be consumed by website

### New Field Treated as Authoritative Without Writer
✓ **DISCOVERED**: DerivativeSet types exist but no writer
✓ **DISCOVERED**: PresentationMetadata types exist but no writer
✓ **DISCOVERED**: QualityGateResult types exist but no writer

### Variant Key Change That Could Invalidate Existing UI
✓ **DISCOVERED**: Components use `variants.web` but media.v1.json has `variants.webp`
✓ **SEVERITY**: HIGH BUG - images may not render

---

## FINAL ASSESSMENT

### Previous Implementation Status
❌ **NOT ACCEPTED** - The previous hardening implementation has multiple architectural problems:
1. DerivativeSet, PresentationMetadata, QualityGateResult are dead code
2. Pipeline changes do not affect homepage hero (hardcoded)
3. Variant key mismatch (web vs webp) is a BUG
4. Color/orientation normalization needs verification with actual sources
5. Quality validation is only integrity, not perceptual quality

### Actual System State
- **Homepage hero**: Hardcoded file (not canonical)
- **Project media**: Uses media.v1.json with variant key BUG
- **Pipeline**: Generates flat MediaVariants (not structured DerivativeSet)
- **Authority**: Multiple competing authorities (hardcoded, Brand, Media, Projections)

### Required Actions
1. **STOP** all further pipeline changes
2. **FIX** variant key mismatch (web vs webp) - HIGH PRIORITY BUG
3. **RESOLVE** homepage hero hardcoded path - ARCHITECTURAL DECISION NEEDED
4. **REMOVE** dead code (DerivativeSet, PresentationMetadata, QualityGateResult)
5. **VERIFY** color/orientation normalization with actual HPP sources
6. **DECIDE** whether to maintain multiple authorities or unify

### Cannot Proceed
The previous implementation created types and validation that are not integrated with the actual consumption pattern. The website has multiple competing authorities and a critical variant key bug. Do not proceed with further changes until these foundational issues are resolved.
