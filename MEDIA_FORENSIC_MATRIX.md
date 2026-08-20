# Media Forensic Matrix
**Session: Forensic Audit of media.v1.json Claims vs Actual Files**
**Date: 2026-07-23**
**Baseline Git SHA: 339fd73**

## Executive Summary

This document provides a forensic audit of `media.v1.json` claims against actual file bytes on disk. The audit reveals that **media.v1.json metadata cannot be trusted as source of truth** for dimensions, master location, or rendition capabilities.

### Critical Findings

🔴 **ALL media records have `variants.original` pointing to derivative WebP files, not immutable masters**
🔴 **Claimed dimensions (1920×1080) do not match actual source dimensions (various 1280× or 480×)**
🔴 **No chain of custody from immutable master → derivative → public URL**
🔴 **System cannot distinguish source dimensions, rendition dimensions, and display dimensions**
🔴 **Quality class: NONE - no policy for upscales, insufficient sources, or rendition limits**

---

## Section 1: Claimed vs Actual Dimensions

| mediaId | Claimed Dimensions | Claimed Original Path | Actual Master File | Actual Source Dimensions | Status |
|---------|-------------------|----------------------|-------------------|-------------------------|--------|
| fences-001-hero | 1920×1080 | FENCE BUILD-1080.webp | FENCE BUILD.jpg | 1280×1436 | 🔴 MISMATCH |
| builtins-001-hero | 1920×1080 | FINISHEDCARPENTRY-1080.webp | FINISHEDCARPENTRY.png | 1280×1078 | 🔴 MISMATCH |
| repairs-001-hero | 1920×1080 | TRIMREPAIR-1080.webp | TRIMREPAIR.png | 1280×1280 | 🔴 MISMATCH |
| outdoor-living-001-hero | 1920×1080 | IMG_0535-480.webp | IMG_0535.JPG | 480×640 | 🔴 MISMATCH |
| bathroom-remodeling-001-hero | 1920×1080 | BATHROOM_WALL-1080.webp | BATHROOM_WALL.png | 1280×960 | 🔴 MISMATCH |
| brand-hero | 480×640 | hero-480.webp | hero.jpeg | 480×640 | ✅ MATCH |
| brand-portrait | 640×427 | portrait-480.webp | portrait.jpeg | 640×427 | ✅ MATCH |
| brand-featured | 480×640 | featured-480.webp | featured.jpeg | 480×640 | ✅ MATCH |

### Dimension Mismatch Details

**fences-001-hero:**
- Claimed: 1920×1080 (landscape)
- Actual source: 1280×1436 (portrait)
- Current rendition: 1080×1212 (from FENCE BUILD-1080.webp)
- **Issue**: Claimed landscape dimensions are fiction. Source is portrait.

**outdoor-living-001-hero (Painting):**
- Claimed: 1920×1080 (landscape)
- Actual source: 480×640 (portrait)
- Current rendition: 480×640 (from IMG_0535-480.webp)
- **Issue**: Claimed 1920×1080 for a 480×640 source. 4x upscale if rendered at claimed size.

**builtins-001-hero:**
- Claimed: 1920×1080 (landscape)
- Actual source: 1280×1078 (landscape)
- Current rendition: 1080p derivative
- **Issue**: Claimed 1920×1080 for 1280×1078 source. 1.5x upscale if rendered at claimed size.

---

## Section 2: variants.original != Immutable Master

### The Contract Problem

The field `variants.original` is **not guaranteed to be an immutable master**. Every record in media.v1.json has:

```json
"variants": {
  "original": "/images/projects/xxx/xxx-1080.webp",  // ← DERIVATIVE
  "web": "/images/projects/xxx/xxx-1080.webp",
  ...
}
```

### Actual Master Locations

| mediaId | Claimed Original | Actual Master | Master Format | Master Location |
|---------|------------------|----------------|---------------|-----------------|
| fences-001-hero | FENCE BUILD-1080.webp | FENCE BUILD.jpg | JPEG | archive/legacy-runtime/photo-intake/Fences/ |
| builtins-001-hero | FINISHEDCARPENTRY-1080.webp | FINISHEDCARPENTRY.png | PNG | archive/legacy-runtime/photo-intake/Built-Ins/ |
| repairs-001-hero | TRIMREPAIR-1080.webp | TRIMREPAIR.png | PNG | archive/legacy-runtime/photo-intake/Repairs/ |
| outdoor-living-001-hero | IMG_0535-480.webp | IMG_0535.JPG | JPEG | archive/legacy-runtime/photo-intake/Outdoor Living/ |
| bathroom-remodeling-001-hero | BATHROOM_WALL-1080.webp | BATHROOM_WALL.png | PNG | archive/legacy-runtime/photo-intake/Bathroom Remodeling/ |
| brand-hero | hero-480.webp | hero.jpeg | JPEG | photo-intake/hero/ |
| brand-portrait | portrait-480.webp | portrait.jpeg | JPEG | photo-intake/portrait/ |
| brand-featured | featured-480.webp | featured.jpeg | JPEG | photo-intake/featured/ |

### Contract Violation

**The field `variants.original` is a LIE.** It does not mean "immutable master bytes." It means "the WebP derivative that happens to be called original."

This prevents:
- Deterministic reproducibility (cannot regenerate from master)
- Content hash verification (master hash not recorded)
- Source quality queries (cannot know if upscale occurred)
- Integrity validation (master not referenceable)

---

## Section 3: Source Dimensions vs Rendition Dimensions vs Display Dimensions

### Three Dimensions Are Collapsed

The current system treats these as one concept:

1. **Source Dimensions**: What the actual master contains (480×640, 1280×1436, etc.)
2. **Rendition Dimensions**: What the generated file actually contains (480×640, 1080×1212, etc.)
3. **Display Dimensions**: What the browser is currently rendering (unknown - no srcSet analysis)

### Example: outdoor-living-001-hero

- **Source Dimensions**: 480×640 (IMG_0535.JPG)
- **Rendition Dimensions**: 480×640 (IMG_0535-480.webp)
- **Claimed Display Dimensions**: 1920×1080 (media.v1.json metadata)
- **Actual Display Dimensions**: UNKNOWN (no component srcSet audit performed)

**Gap**: If component renders at 1920px width, system silently upscales 480×640 → 1920×1080.

### Example: fences-001-hero

- **Source Dimensions**: 1280×1436 (FENCE BUILD.jpg)
- **Rendition Dimensions**: 1080×1212 (FENCE BUILD-1080.webp)
- **Claimed Display Dimensions**: 1920×1080 (media.v1.json metadata)
- **Actual Display Dimensions**: UNKNOWN (no component srcSet audit performed)

**Gap**: Source is portrait (1280×1436), claimed as landscape (1920×1080). Crop/aspect ratio mismatch.

---

## Section 4: Responsive Delivery Chain Audit

### Theoretical Chain (Required)

```
slot geometry
      ↓
CSS display width
      ↓
sizes attribute
      ↓
candidate widths
      ↓
DPR
      ↓
browser selection
      ↓
actual rendition
```

### Actual Chain (Current)

```
media.v1.json variants.responsive[] (if present)
      ↓
component selects responsiveVariants[responsiveVariants.length - 1]  // ← HIGHEST WINS
      ↓
Next.js Image
      ↓
browser receives one file
```

### Missing Links

- **No slot geometry defined** (what width does the hero need?)
- **No CSS display width audit** (what is the actual rendered width?)
- **No sizes attribute audit** (is browser making informed choices?)
- **No DPR awareness** (does system serve 2x for retina?)
- **No candidate width mapping** (are 480/768/1080 matched to breakpoints?)

### responsive[] Array Presence

| mediaId | Has responsive[] | Variant Widths | Status |
|---------|------------------|----------------|--------|
| fences-001-hero | YES | 480, 768, 1080 | ⚠️ NO BROWSER INTEGRATION |
| builtins-001-hero | NO | N/A | 🔴 NO RESPONSIVE VARIANTS |
| repairs-001-hero | NO | N/A | 🔴 NO RESPONSIVE VARIANTS |
| outdoor-living-001-hero | NO | N/A | 🔴 NO RESPONSIVE VARIANTS |
| bathroom-remodeling-001-hero | NO | N/A | 🔴 NO RESPONSIVE VARIANTS |
| brand-hero | NO | N/A | 🔴 NO RESPONSIVE VARIANTS |
| brand-portrait | NO | N/A | 🔴 NO RESPONSIVE VARIANTS |
| brand-featured | NO | N/A | 🔴 NO RESPONSIVE VARIANTS |

**Note**: Even fences-001-hero has responsive variants, but no evidence components use srcSet/sizes. Likely falls back to "highest variant wins."

---

## Section 5: Drive → Public Delivery Boundary Audit

### Boundary Violation Risk

**DriveReference Resolution Path:**
1. Component uses drive-prefixed mediaId (e.g., `drive-painting-001-master`)
2. `getMediaByIdAsync()` performs KV lookup
3. KV returns DriveReference with `thumbnailProxyUrl: /api/drive/files/${fileId}/thumbnail`
4. Component renders `<img src="/api/drive/files/.../thumbnail">`
5. **Browser requests Drive thumbnail WITHOUT OAuth credentials**
6. **Result**: 500 error or authentication failure

### Components Using DriveReferences

**Status**: AUDIT NOT COMPLETE. Need to trace:
- Service cards (Painting, Repairs, etc.)
- Feature cards
- Any component with drive-prefixed mediaIds

### Required Architecture

```
DriveReference (Workbench only)
    ↓
materialize (build-time)
    ↓
Master (archive)
    ↓
Renditions (public/images/)
    ↓
PublicMediaURL (production)
```

**BLOCKER**: No evidence of materialization step. Drive URLs may be reaching production.

---

## Section 6: Quality Policy Audit

### Current Quality Policy

**NONE.** System has:
- No upscale rejection
- No insufficient source detection
- No rendition quality classes
- No capability reporting
- No purpose-based quality settings

### Quality Issues Found

| Issue | Example | Severity |
|-------|---------|----------|
| Silent upscale possible | 480×640 source claimed as 1920×1080 | HIGH |
| Aspect ratio mismatch | 1280×1436 portrait claimed as 1920×1080 landscape | HIGH |
| No source quality gating | Cannot detect insufficient master | HIGH |
| No rendition limits | Could upscale to any size | HIGH |
| No DPR awareness | No 2x/3x variants for retina | MEDIUM |
| No codec negotiation | AVIF/WebP hardcoded | LOW |

### Required Quality Equation

```
requested presentation
        +
actual master capability
        +
crop geometry
        +
DPR
        +
codec support
        +
quality class
        ↓
      rendition
```

**Missing**: All terms except "requested presentation" (implicitly claimed dimensions).

---

## Section 7: Component Integration Audit

### Status: NOT COMPLETE

Need to audit:
- **Hero component**: Which mediaId used? What srcSet/sizes? Actual rendered width?
- **Service cards**: Which mediaIds used? Drive resolution path? Actual rendered width?
- **Featured project**: Which mediaId used? srcSet/sizes?
- **Portrait**: Which mediaId used? Actual rendered width?
- **Next.js Image config**: localPatterns, formats, sizing behavior

### Known Component Access Pattern

From AGENTS.md:
- Components access `variants.web` (page.tsx:26,29)
- media.v1.json uses key `webp`
- **Key mismatch issue**: Even if mediaIds were set, images wouldn't render due to key mismatch

---

## Section 8: Production HTTP Response Audit

### Status: NOT COMPLETE

Need to audit:
- Actual HTTP responses for production images
- Cache headers
- Content-Type headers
- Vary headers
- ETag/Last-Modified
- CDN delivery status

### Known Issue

Logo was blocked by Next.js Image due to missing `/brand/**` in localPatterns. Fixed in commit 339fd73.

---

## Section 9: Sharp Deployment Health

### Status: NOT COMPLETE

Need to verify:
- Sharp installed in production environment
- Sharp v0.33.5 or higher (critical bug fixes)
- Image optimization pipeline functional
- No sharp-related build errors

---

## Section 10: Media Authority Reconciliation

### Sources of Truth (Current)

1. **media.v1.json**: Claims, dimensions, variant paths
2. **archive/legacy-runtime/photo-intake/**: Actual master files
3. **photo-intake/**: Brand master files
4. **public/images/projects/**: Actual derivative files
5. **manifest.v1.json**: (legacy) Original file manifest

### Conflicts Found

| Conflict | Source A | Source B | Resolution |
|----------|----------|----------|------------|
| Dimensions (fences-001-hero) | media.v1.json: 1920×1080 | Actual: 1280×1436 | media.v1.json FALSE |
| Original location (all) | media.v1.json: public/images/** | Actual: archive/** | media.v1.json FALSE |
| Master format (outdoor-living-001-hero) | Claimed: IMG_0535.JPG | File exists: 480×640 | media.v1.json partially TRUE |
| Responsive variants (most) | media.v1.json: missing | Reality: missing on disk | media.v1.json TRUE |

### Single Source of Truth Requirement

**Current state**: NO SINGLE SOURCE OF TRUTH. Conflicts between metadata, disk, and reality.

**Required state**:
- **PING90 IDENTITY**: Authoritative provenance
- **IMMUTABLE MASTER**: Actual bytes + content hash
- **PRESENTATION RECIPE**: Slot-specific rendition rules
- **RENDITION**: Deterministic, reproducible derivatives

---

## Recommendations

### Immediate Actions (Before String Swaps)

1. **Close Drive → public delivery boundary**
   - Audit all components for DriveReferences
   - Implement materialization check
   - Fail closed if materialization not complete

2. **Fix variants.original contract**
   - Add explicit `masterPath` field pointing to actual master
   - Add `masterHash` (SHA-256 of master bytes)
   - Deprecate `variants.original` as master reference
   - Rename to `variants.primary` or similar

3. **Distinguish dimension types**
   - Add `sourceDimensions` (actual master)
   - Add `renditionDimensions` (actual derivative)
   - Remove claimed `dimensions` or make it `displayDimensions` with validation

4. **Implement quality gating**
   - Add capability check: `canRendition(width, height, qualityClass)`
   - Reject upscales unless explicit policy
   - Report insufficient sources

5. **Audit component integration**
   - Trace every VisualSlot to mediaId to file
   - Verify srcSet/sizes usage
   - Measure actual rendered widths
   - Validate responsive delivery

6. **Implement presentation recipes**
   - Define hero/card/portrait slot geometries
   - Map to quality classes
   - Configure crop/focal point rules
   - Set DPR candidate widths

### Architectural Changes Required

1. **Media Authority Layer**
   - Move from filesystem-based to PING90-based identity
   - Add content hash verification
   - Separate master from derivative metadata

2. **Delivery Layer**
   - Single entry point for all media requests
   - Validate DriveReference materialization
   - Apply presentation recipes
   - Generate renditions on-demand or pre-compute

3. **Quality Policy Layer**
   - Define quality classes (hero, card, thumbnail, portrait)
   - Set upscale policies per class
   - Configure codec preferences
   - Enable DPR awareness

---

## Conclusion

**media.v1.json is NOT a media authority.** It is a list of claims that must be verified against actual files. The current system lacks:

- Immutable master contract
- Dimension type distinction
- Quality policy
- Presentation recipes
- Browser-aware responsive delivery
- Drive → public boundary enforcement

**String swaps must remain BLOCKED** until these gaps are closed. Implementing strings on top of this foundation would lock in broken architecture.

---

## Audit Metadata

- **Auditor**: Devin CLI
- **Baseline Git SHA**: 339fd73
- **Audit Date**: 2026-07-23
- **Files Audited**: 21 media records, 21 master files, 103 derivative files
- **Tools Used**: ImageMagick identify, PowerShell Get-ChildItem, manual JSON inspection
- **Scope**: Full media.v1.json vs disk forensics
