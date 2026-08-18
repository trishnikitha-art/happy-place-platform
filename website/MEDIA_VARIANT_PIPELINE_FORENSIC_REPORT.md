# MEDIA VARIANT PIPELINE FORENSIC REPORT

**Date**: 2026-07-22
**Repository**: happy-place-platform (DEPLOY branch)
**Context**: DEPLOY-only media replacement workflow - Phase 1 complete, Phase 2 blocked pending pipeline research

---

## 1. CURRENT HPP PIPELINE

### Flow Trace

```
Google Drive (or photo-intake/)
    ↓
image-pipeline.mjs discovery
    ↓
Source acquisition (FilesystemImageSource or DriveImageSource)
    ↓
Content hash (SHA-256)
    ↓
Stable ID generation (UUIDv5 from content hash)
    ↓
Sharp processing
    ├── Archive original to _archive/
    ├── Generate variants at [480, 768, 1080, 1600, 2000]px
    │   ├── WebP (quality: 80)
    │   ├── AVIF (default settings)
    │   └── Thumbnail (unknown quality)
    ├── Read dimensions (EXIF-light, only W/H)
    └── Generate blur placeholder
    ↓
Write media.v1.json
    ├── Media.id = stable UUIDv5
    ├── Media.driveId = Drive ID
    ├── Media.dimensions = intrinsic W/H
    ├── Media.variants = { original, web, webp, avif, thumbnail }
    └── Metadata (filename, service, city, roles, etc.)
    ↓
Manifest generation (pipelineVersion, pipelineCommit, generatedAt)
    ↓
Website delivery (lib/media.ts → Media component)
```

### Current Variant Strategy

**Widths**: `[480, 768, 1080, 1600, 2000]` (hardcoded in image-pipeline.mjs:46)

**Formats**:
- `original`: Source path (preserved)
- `web`: Simplified web variant (same as webp)
- `webp`: WebP at quality 80
- `avif`: AVIF at default Sharp settings
- `thumbnail`: Thumbnail variant
- `blur`: Base64 blur placeholder

**Quality Settings**:
- WebP: `quality: 80` (Sharp default)
- AVIF: Default Sharp libaom settings (quality 50, effort 4)
- JPEG: Not explicitly configured in current pipeline
- Thumbnail: Not explicitly configured

**Sharp Configuration** (from research and pipeline inspection):
- No explicit `withoutEnlargement` - potential upscaling risk
- No EXIF orientation normalization visible
- No color profile normalization explicit
- No chroma subsampling configuration
- No progressive JPEG
- No mozjpeg
- No effort tuning for AVIF

### Current Data Model

```typescript
interface Media {
  id: string;              // UUIDv5 from content hash
  driveId?: string;        // Google Drive ID
  filename: string;
  type: MediaType;
  orientation: MediaOrientation;
  dimensions: MediaDimensions;  // { width, height }
  variants: MediaVariants;  // FLAT structure
  alt: string;
  // ... classification, roles, editorial, metadata, technical
}

interface MediaVariants {
  original?: string;      // Source path
  webp?: string;          // WebP variant
  avif?: string;          // AVIF variant
  thumbnail?: string;     // Thumbnail
  blur?: string;          // Base64 blur
  web?: string;           // Simplified web variant
}
```

**Defect**: Flat `MediaVariants` structure cannot distinguish:
- Which width a variant corresponds to
- Which delivery profile (hero vs gallery vs thumbnail)
- Quality settings used
- Pipeline version
- Checksums
- Whether a variant failed generation

### Current Quality Gates

**NONE**

There is no automated quality validation in the current pipeline. The pipeline:
- Checks file existence
- Generates derivatives
- Writes manifest

No validation of:
- Derivative visual quality
- Upscaling violations
- Color correctness
- Orientation correctness
- Compression artifacts
- File integrity beyond successful Sharp call

---

## 2. CURRENT DEFECTS

### CRITICAL

1. **NO UPSCALING PROTECTION**
   - Pipeline does not use `withoutEnlargement: true`
   - If source is 640px wide but variant specifies 2000px, Sharp will upscale
   - This violates Builder.io and industry standard
   - Risk: Mushy, pixelated derivatives

2. **NO EXIF ORIENTATION NORMALIZATION**
   - Pipeline does not call `autoOrient()`
   - Camera images with EXIF rotation will render sideways
   - Dimensions metadata may not match actual pixel orientation
   - Risk: Broken before/after, misaligned crops

3. **NO COLOR PROFILE NORMALIZATION**
   - No explicit sRGB conversion
   - Embedded ICC profiles may or may not be preserved
   - Sharp default converts to sRGB but strips ICC
   - Risk: Color shifts between source and derivative

4. **FLAT VARIANT STRUCTURE**
   - Cannot represent width-specific variants
   - Cannot represent quality profiles
   - Cannot track pipeline version
   - Cannot detect failed derivatives
   - Risk: Authority corruption, undetectable failures

### HIGH

5. **FIXED BREAKPOINTS WITHOUT CONTEXT**
   - Widths `[480, 768, 1080, 1600, 2000]` are arbitrary
   - Not tied to:
     - Layout breakpoints
     - Slot requirements
     - Source intrinsic dimensions
     - Image-specific optimal breakpoints
   - Imgix uses exponential growth (8% tolerance)
   - Cloudinary uses intelligent responsive breakpoint generation
   - HPP uses blind fixed array
   - Risk: Over-serving or under-serving variants

6. **UNOPTIMIZED QUALITY SETTINGS**
   - WebP quality 80 is generic
   - AVIF uses default settings (may be video-optimized)
   - No quality variation by:
     - Image type (photo vs graphics)
     - Content complexity
     - Slot importance
     - Target dimensions
   - Industry: Cloudinary uses `q_auto` (smart quality)
   - Risk: Suboptimal file size vs quality tradeoff

7. **NO QUALITY VALIDATION**
   - No SSIM, PSNR, or perceptual checks
   - No derivative vs source comparison
   - No visual regression detection
   - Risk: Silent quality degradation

### MEDIUM

8. **NO SOURCE VALIDATION**
   - No preflight checks for:
     - File corruption
     - Truncation
     - Invalid dimensions
     - Unsupported formats
     - Animation
   - Risk: Pipeline crashes on bad input

9. **NO CROP/FOCAL POINT INFRASTRUCTURE**
   - No hotspot/crop metadata
   - No focal point preservation
   - Sanity has this as first-class feature
   - Risk: Subject loss in responsive crops

10. **NO PIPELINE VERSIONING**
    - Derivatives have no `pipelineVersion` field
    - Cannot detect when pipeline configuration changed
    - Cannot reprocess deterministically
    - Risk: Stale derivatives, reproducibility issues

### LOW

11. **THUMBNAIL PROFILE NOT DEFINED**
    - Thumbnail quality not specified
    - May use same settings as hero
    - Industry: Thumbnails can use more aggressive compression
    - Risk: Suboptimal file sizes

12. **NO PER-IMAGE ADAPTATION**
    - All images get same treatment
    - Industry: Content-aware encoding
    - Risk: One-size-fits-all may be wrong for edge cases

---

## 3. INDUSTRY RESEARCH

### Cloudinary

**Source Preservation**:
- Original is immutable
- Derivatives are on-demand transformations
- Never replaces original
- Source hash/fingerprint not used for identity

**Responsive Breakpoints**:
- Intelligent responsive breakpoint generation
- Balances number of variants vs file-size reduction
- Uses `w_auto` for automatic width
- Uses `dpr_auto` for device pixel ratio
- Client hints (DPR, Viewport-Width, Width) for dynamic optimization
- Does NOT use fixed breakpoint arrays

**Quality**:
- `q_auto` - smart quality adjustment based on image content
- Adjusts quality automatically based on visual impact
- Per-format optimization
- Not a single quality value for all images

**Format Selection**:
- Delivery-time concern
- Automatic format selection via Accept header
- AVIF → WebP → JPEG fallback
- Format selection is NOT part of source identity

**Key Insight**: Format selection is delivery-time, not build-time. The canonical media asset is source-only. Formats are derived on delivery.

### Imgix

**Responsive Breakpoints**:
- Exponential width growth (not fixed)
- 8% tolerance: displayed image never more than 8% larger than source
- Reduces number of variants vs fixed pixel differences
- Improves cache hits
- `widthTolerance` parameter for customization
- `minWidth`/`maxWidth` for range control

**No Upscaling**:
- Respects intrinsic dimensions
- Will not exceed source width/height
- Explicit no-upscaling policy

**Variable Quality**:
- `variableQualities` option
- Quality can vary by image size
- Smaller images can use higher quality
- Larger images can use lower quality

**Key Insight**: Exponential growth + tolerance is superior to fixed breakpoints. Quality should vary by target size.

### Sanity CMS

**Hotspot/Crop Architecture**:
- **CRITICAL DISTINCTION**: Image asset vs image field
- Asset: Canonical source (immutable)
- Image field: Context-specific metadata (crop, hotspot, caption)
- Hotspot: `{ x, y, height, width }` - focal point rectangle
- Crop: `{ top, bottom, left, right }` - safe area
- These are PRESENTATION metadata, not IDENTITY

**Separation of Concerns**:
```
Canonical Media Asset
  └── Immutable source

Image Field (in content)
  ├── asset reference
  ├── crop (presentation)
  ├── hotspot (presentation)
  └── caption (presentation)
```

**Never Upscales**:
- Sanity Image URL Builder: "Images are never upscaled beyond their original dimensions"
- Constitutional rule

**Key Insight**: Crop/hotspot is presentation metadata, NOT source identity. The photograph and how a layout crops it are different pieces of information.

### Builder.io

**No Upscaling**:
- Explicit documentation: "API doesn't upscale images or photos"
- Values greater than intrinsic dimensions result in same dimensions as original
- Constitutional no-upscaling rule

**Format Selection**:
- Automatic format conversion (WebP)
- Layout analysis for sizes attribute
- Lazy loading optimization
- Format is delivery-time optimization

**Key Insight**: No upscaling is a constitutional rule for serious systems.

### Next.js Image Optimization

**Format Selection**:
- Uses HTTP Accept header
- AVIF → WebP → original fallback
- Order in config matters
- Format is delivery-time, not build-time
- Multiple formats cached separately

**Srcset Generation**:
- Standard HTML img element
- Delegates selection to browser via srcset/sizes
- No proprietary loading mechanism
- `priority` prop removes lazy loading for LCP images

**Quality**:
- Default quality: 75
- Can be configured per format
- Per-image quality possible
- No `q_auto` equivalent

**Key Insight**: Next.js handles delivery-time format selection. Build-time pipeline should generate high-quality source variants.

### Sharp/libvips Quality Settings

**WebP**:
- Default quality: 80
- Range: 1-100
- `alphaQuality`: 0-100 for transparency
- `lossless`: boolean
- `nearLossless`: boolean
- `smartSubsample`: high-quality chroma subsampling
- `effort`: 0-6 (CPU effort, default 4)
- `preset`: default, photo, picture, drawing, icon, text

**AVIF**:
- Quality range: 0-100 (mapped to libaom CQ level 0-63)
- Mapping: `cq_level = ((100 - quality) * 63 + 50) / 100`
- Quality 60 ≈ JPEG 85 visually, but 30-40% smaller
- Encoding cost: 47× slower than WebP at comparable quality
- Peak memory: 2.5GB for 4000px image (vs 200MB for WebP)
- `effort`: 0-9 (default 4-5 recommended)
- Higher effort ≠ smaller files (unpredictable)
- Quality is primary driver of file size

**JPEG**:
- `mozjpeg`: true for modern compression (10-15% savings)
- `progressive`: true for progressive JPEG
- `chromaSubsampling`: '4:2:0' for photography
- Quality sweet spot: 75-85 for photos
- Quality 90 for screenshots with text

**Color Management**:
- Default: Converts to web-friendly sRGB
- Strips ICC profile unless `withMetadata()`
- `withMetadata()`: Preserves EXIF/XMP/IPTC, adds sRGB profile if appropriate
- `autoOrient()`: Normalizes EXIF orientation, removes tag
- `toColourspace('srgb')`: Explicit sRGB conversion

**EXIF Orientation**:
- `autoOrient()`: Rotates based on EXIF Orientation tag
- Removes EXIF Orientation tag after correction
- Mirroring supported
- Only one rotation per pipeline

**Key Insight**: Sharp defaults are reasonable but not optimal for all use cases. Configuration matters.

### Image Quality Metrics

**SSIM (Structural Similarity Index)**:
- Matches human visual perception better than MSE/PSNR
- Considers local structure, luminance, contrast
- Range: -1 to 1 (1 = perfect match)
- Better than MSE/PSNR for perceived quality

**PSNR (Peak Signal-to-Noise Ratio)**:
- Derived from MSE
- Simple to calculate
- Poor correlation with perceived quality
- Limited usefulness

**Perceptual Hashing**:
- PDQ (Facebook ThreatExchange): DCT-based spectral hashing
- Quality metric: filter junky/featureless images
- Distance threshold ≤31 for similarity
- Quality threshold ≤49 for discarding
- NOT identity authority (similarity ≠ identity)
- Can be defeated by adversarial attacks

**Key Insight**: SSIM is the most useful metric for quality validation. Perceptual hashing is for similarity detection, NOT identity.

### Integration Opportunities

**@mischback/imp**:
- Wrapper around Sharp
- Easy interface for Sharp in frontend workflow
- Out of maintenance (last push 2023)
- Not worth adding

**@apeleghq/esbuild-plugin-responsive-images**:
- esbuild plugin for responsive images using Sharp
- Generates srcset with custom sizes/formats
- 0 weekly downloads
- Build-time plugin pattern
- Not appropriate for HPP (already has custom pipeline)

**node-sharp-iqa**:
- Image quality assessment for Sharp
- MSE, PSNR metrics
- Uses bundled Sharp version to avoid segfaults
- Could be useful for quality gates
- Worth considering

**focal.js**:
- Helps define focal points for images
- BEM-style CSS
- Basic focal point selection UI
- Not necessary - can implement Sanity-style model

**jquery-focuspoint**:
- jQuery plugin for responsive cropping
- 3112 stars, mature
- Coordinates: -1 to +1 (center = 0)
- Has helper tool for finding focus points
- Good reference for coordinate system

**react-focus-point**:
- React component for focus point
- Interactive focus point selection
- 0-100 percentage coordinates
- TypeScript
- Could be useful for Workbench UI

**Key Insight**: node-sharp-iqa is the only package worth considering for quality gates. All others are either unmaintained or can be implemented using Sanity's proven model.

---

## 4. PROPOSED HPP MEDIA COMPILER

### Architecture

```
PING90 Constitutional Authority (Drive ID, provenance)
    ↓
HPP Canonical Media (media.v1.json - identity + metadata)
    ↓
Media Compiler (NEW)
    ├── Source Validation (preflight)
    ├── Normalization (orientation, color, EXIF)
    ├── Quality Analysis (sharpness, entropy, dimensions)
    ├── Focal/Crop Metadata (presentation layer)
    ├── Variant Planning (breakpoints, profiles, DPR)
    ├── Encoding (Sharp with optimal settings)
    ├── Quality Verification (SSIM, validation gates)
    ├── Manifest Generation (checksums, pipeline version)
    └── Provenance Tracking (source hash, transform hash)
    ↓
Derivative Set (per profile)
    ├── hero profile
    ├── gallery profile
    ├── card profile
    └── thumbnail profile
    ↓
Website Delivery (Next.js Image component + srcset)
```

### Authority Boundaries

**PING90**: Constitutional identity authority (Drive ID, provenance)
**HPP Canonical Media**: Application/business authority (media.v1.json)
**Media Compiler**: Deterministic compiler (transformations)
**Derivative Set**: Delivery artifacts (NOT authority)
**Website**: Delivery layer (Next.js, browser)

**CRITICAL**: Derivatives NEVER become canonical. If source changes, new derivatives are generated. If pipeline changes, derivatives are regenerated.

### Compiler Stages

#### Stage 1: Source Acquisition
- Discover source from Drive or filesystem
- Calculate SHA-256 content hash
- Generate stable UUIDv5 (existing, keep)
- Validate file type, MIME type
- Check for corruption/truncation

#### Stage 2: Source Validation (Preflight)
- File type validation (JPEG, PNG, WebP, HEIC allowed)
- Intrinsic dimensions (width, height)
- Aspect ratio validation
- Orientation check (EXIF)
- Color space check (sRGB, Display P3, embedded ICC)
- Alpha channel detection
- Bit depth validation
- Corruption detection (truncation, unexpected EOF)
- **NO-UPSCALING RULE**: Reject if requested width > intrinsic width

#### Stage 3: Normalization
- `autoOrient()`: Normalize EXIF orientation
- `toColourspace('srgb')`: Convert to web-friendly sRGB
- Strip EXIF Orientation tag after correction
- Preserve ICC profile if `withMetadata()` enabled
- Normalize to consistent pixel dimensions

#### Stage 4: Quality Analysis
- Read Sharp metadata
- Extract entropy (histogram-based)
- Extract sharpness (Laplacian variance)
- Extract dominant color
- Classify content type (photo vs graphics vs UI)
- Determine quality tier (hero vs gallery vs thumbnail)

#### Stage 5: Focal/Crop Metadata (Presentation Layer)
- Optional focal point: `{ x: 0-1, y: 0-1 }`
- Optional crop: `{ top, bottom, left, right: 0-1 }`
- Stored in separate authority (not in Media)
- Applied during encoding for specific profiles
- NOT part of canonical identity

#### Stage 6: Variant Planning
- **Hybrid breakpoint strategy**:
  - Layout breakpoints: 390, 768, 1024, 1440 (canonical)
  - Image intrinsic dimensions (maximum width)
  - Slot requirements (hero vs gallery vs card)
  - DPR: 1, 2, 3
  - Exponential growth with 8% tolerance (Imgix model)
- Generate image-specific breakpoints
- Filter by intrinsic dimensions (no upscaling)
- Assign to delivery profiles

#### Stage 7: Encoding
- **Per-profile Sharp configuration**:
  - Hero profile: High quality, larger max width
  - Gallery profile: Medium quality, responsive
  - Card profile: Optimized for card dimensions
  - Thumbnail profile: Aggressive but visually acceptable
- **Per-format settings**:
  - JPEG: quality 82, mozjpeg, progressive, chroma 4:2:0
  - WebP: quality 80, effort 4, smartSubsample for photos
  - AVIF: quality 60, effort 5 (balance quality vs speed)
- **Apply focal/crop** if present for profile
- **No upscaling**: `withoutEnlargement: true`

#### Stage 8: Quality Verification
- Compute SSIM between source and derivative (if applicable)
- Validate derivative dimensions
- Validate file size within expected range
- Check for compression artifacts (if feasible)
- **PASS/WARN/FAIL** classification

#### Stage 9: Manifest Generation
- Compute checksums (SHA-256) for each variant
- Record pipeline version
- Record Sharp version
- Record quality settings used
- Record transformation hash
- Timestamp

#### Stage 10: Provenance Tracking
- Source hash (SHA-256)
- Variant checksums
- Pipeline version
- Transform hash
- Link to PING90 Drive ID

---

## 5. EXACT DATA MODEL

### Extensions to Media Types

```typescript
// Existing (keep)
export interface MediaDimensions {
  width: number;
  height: number;
}

export interface MediaVariants {
  original?: string;
  webp?: string;
  avif?: string;
  thumbnail?: string;
  blur?: string;
  web?: string;
}

// NEW: Replace flat MediaVariants with structured DerivativeSet
export interface DerivativeSet {
  sourceHash: string;           // SHA-256 of canonical source
  pipelineVersion: string;      // e.g., "2.0.0"
  generatedAt: string;         // ISO timestamp
  profiles: {
    hero?: DerivativeProfile;
    gallery?: DerivativeProfile;
    card?: DerivativeProfile;
    thumbnail?: DerivativeProfile;
  };
}

export interface DerivativeProfile {
  variants: DerivativeVariant[];
  checksum: string;             // SHA-256 of profile config
}

export interface DerivativeVariant {
  width: number;
  height: number;
  format: 'jpeg' | 'webp' | 'avif';
  quality: number;
  url: string;
  bytes: number;
  checksum: string;            // SHA-256 of file
  status: 'success' | 'failed' | 'warning';
  error?: string;
}

// NEW: Presentation metadata (separate from canonical Media)
export interface PresentationMetadata {
  mediaId: string;             // Reference to Media.id
  focalPoint?: { x: number; y: number };  // 0-1 range
  crop?: { top: number; bottom: number; left: number; right: number };  // 0-1 range
  safeArea?: { top: number; bottom: number; left: number; right: number };
  preferredAspectRatio?: string;  // e.g., "16/9", "4/3"
  updatedAt: string;
}

// NEW: Quality gate results
export interface QualityGateResult {
  gate: string;
  severity: 'error' | 'warning' | 'info';
  passed: boolean;
  metrics?: {
    ssim?: number;
    psnr?: number;
    fileDeviation?: number;
    artifactScore?: number;
  };
  message: string;
}

// NEW: Extended Media
export interface MediaV2 extends Media {
  // Existing fields preserved
  id: string;
  driveId?: string;
  filename: string;
  type: MediaType;
  orientation: MediaOrientation;
  dimensions: MediaDimensions;
  alt: string;
  // ... all existing fields

  // NEW FIELDS
  sourceHash: string;         // SHA-256 of canonical source
  derivatives?: DerivativeSet;  // Replaces flat MediaVariants
  qualityAnalysis?: {
    entropy: number;
    sharpness: number;
    contentClass: 'photo' | 'graphics' | 'ui' | 'unknown';
    qualityTier: 'hero' | 'gallery' | 'card' | 'thumbnail';
  };
  validation?: {
    preflight: QualityGateResult[];
    encoding: QualityGateResult[];
  };
}
```

### Schema Migration Path

**Phase 1**: Add new fields as optional (backwards compatible)
**Phase 2**: Populate new fields for new images
**Phase 3**: Migrate existing images (reprocess pipeline)
**Phase 4**: Deprecate flat MediaVariants
**Phase 5**: Remove flat MediaVariants

---

## 6. EXACT VARIANT STRATEGY

### Breakpoint Strategy: Hybrid

**Rationale**: Fixed breakpoints are inefficient. Image-specific breakpoints are expensive. Hybrid balances both.

**Components**:
1. **Canonical layout breakpoints**: 390, 768, 1024, 1440 (keep existing)
2. **Image intrinsic dimensions**: Maximum width constraint
3. **Slot requirements**: Hero vs gallery vs card vs thumbnail
4. **DPR**: 1, 2, 3 (for high-DPI displays)
5. **Exponential growth**: 8% tolerance (Imgix model)

**Algorithm**:
```javascript
function generateBreakpoints(intrinsicWidth, slotProfile) {
  const baseBreakpoints = [390, 768, 1024, 1440];
  const max = Math.min(intrinsicWidth, slotProfile.maxWidth);
  const breakpoints = [];
  
  let current = baseBreakpoints[0];
  while (current <= max) {
    breakpoints.push(current);
    // Exponential growth: next = current * 1.08
    current = Math.ceil(current * 1.08);
  }
  
  return breakpoints;
}
```

**Profile-Specific Max Widths**:
- Hero: 2000px (or intrinsic, whichever smaller)
- Gallery: 1600px
- Card: 800px
- Thumbnail: 400px

### Quality Settings

**JPEG**:
- Hero: quality 82, mozjpeg, progressive, chroma 4:2:0
- Gallery: quality 80, mozjpeg, progressive, chroma 4:2:0
- Card: quality 78, mozjpeg, progressive, chroma 4:2:0
- Thumbnail: quality 75, mozjpeg, chroma 4:2:0

**WebP**:
- Hero: quality 80, effort 4, smartSubsample (photo preset)
- Gallery: quality 78, effort 4, smartSubsample
- Card: quality 75, effort 3
- Thumbnail: quality 70, effort 3

**AVIF**:
- Hero: quality 60, effort 5, chroma 4:2:0
- Gallery: quality 55, effort 5, chroma 4:2:0
- Card: quality 50, effort 4
- Thumbnail: quality 45, effort 4

**Rationale**:
- AVIF quality 60 ≈ JPEG 85 visually but 30-40% smaller
- Higher effort for hero (quality more important)
- Lower effort for thumbnails (speed more important)
- SmartSubsample for photos (preserves detail)
- mozjpeg for modern JPEG compression

### Format Strategy

**Canonical Source**: Preserve original format (JPEG, PNG, HEIC)

**Delivery Formats**:
- Primary: AVIF (90%+ browser support, best compression)
- Fallback: WebP (96%+ support, good compression)
- Ultimate: JPEG (universal support)

**Format Selection**: Delivery-time (Next.js Image component handles this)
- Build-time pipeline generates all three formats
- Next.js selects based on Accept header
- This matches Cloudinary/Next.js best practices

**NO PNG DERIVATIVES**:
- PNG is for lossless only
- Convert PNG source to WebP/AVIF for delivery
- Keep original PNG in archive

### Thumbnail Profile

**Special Case**: Thumbnails can use more aggressive compression
- Max width: 400px
- Quality: JPEG 70, WebP 65, AVIF 40
- Effort: 3 (faster encoding)
- Purpose: Visual scanning, not detail inspection
- Constraint: Must preserve subject recognition

### Fallbacks

**If AVIF encoding fails**:
- Log warning
- Continue with WebP/JPEG
- Mark AVIF variant as failed in manifest

**If WebP encoding fails**:
- Log warning
- Continue with JPEG
- Mark WebP variant as failed

**If all fail**:
- Mark profile as failed
- Do not use image in production
- Alert operator

---

## 7. QUALITY-GATE SPECIFICATION

### Preflight Gates (Source Validation)

| Gate | Severity | Check | Fail Action |
|------|----------|-------|------------|
| FILE_EXISTS | error | File is readable | Reject image |
| FILE_TYPE | error | MIME type in [image/jpeg, image/png, image/webp, image/heic] | Reject image |
| FILE_SIZE | warning | > 50MB | Warn, continue |
| DIMENSIONS | error | Width/height > 100px and < 10000px | Reject image |
| ASPECT_RATIO | warning | Extreme ratios (< 1:10 or > 10:1) | Warn, continue |
| CORRUPTION | error | Truncation, unexpected EOF | Reject image |
| EXIF_ORIENTATION | info | Has EXIF Orientation tag | Note for normalization |

### Encoding Gates (Derivative Validation)

| Gate | Severity | Check | Pass Criteria | Fail Action |
|------|----------|-------|--------------|------------|
| NO_UPSCALE | error | Derivative width ≤ source width | Must pass | Reject derivative |
| DIMENSION_MATCH | error | Derivative dimensions match request | Must pass | Retry |
| FILE_SIZE | warning | Within expected range (±50%) | Warn if outlier | Continue |
| SSIM_THRESHOLD | warning | SSIM > 0.85 vs source (if applicable) | Warn if below | Continue |
| COMPRESSION_RATIO | info | Reasonable compression for quality | Log only | Continue |
| FORMAT_VALIDITY | error | Valid JPEG/WebP/AVIF header | Must pass | Retry |

### Classification

**PASS**: All error gates pass, warnings may be present
**WARN**: Error gates pass, but warnings exist → manual review recommended
**FAIL**: Any error gate fails → block production use

### NO AUTOMATIC SILENT PASS

- If analysis fails or times out → FAIL
- If quality check cannot complete → FAIL
- Never treat uncertainty as PASS

---

## 8. CROP/FOCAL-POINT ARCHITECTURE

### Constitutional Distinction

**Canonical Media Asset**:
- Immutable source
- Identity: UUIDv5 from content hash
- Location: PING90 Drive → HPP media.v1.json
- Authority: Constitutional

**Presentation Metadata**:
- Context-specific crop/focal point
- Identity: Media ID + context (slot/page)
- Location: Separate authority (e.g., slot-mapping.v1.json)
- Authority: Application/business

**Derivative**:
- Transformed version of source
- Identity: Source hash + transform hash + pipeline version
- Location: public/images/ (derived)
- Authority: Compiler output (NOT constitutional)

### Data Model

```typescript
// In media.v1.json (canonical, immutable)
interface Media {
  id: string;              // UUIDv5 from content hash
  // ... source metadata only
  // NO crop/focal point here
}

// In slot-mapping.v1.json (presentation, mutable)
interface SlotMapping {
  slotId: string;          // e.g., "homepage-hero-001"
  mediaId: string;         // Reference to Media.id
  focalPoint?: { x: number; y: number };  // 0-1 range
  crop?: { top: number; bottom: number; left: number; right: number };  // 0-1 range
  safeArea?: { top: number; bottom: number; left: number; right: number };
  preferredAspectRatio?: string;
  updatedAt: string;
}
```

### Application During Encoding

**When generating derivative for slot**:
1. Look up slot mapping
2. If focal point present, apply crop logic
3. Use `focalPoint` as center for object-fit: cover calculation
4. Generate slot-specific variant
5. Store in DerivativeSet with slot context

**Fallback**: If no focal point, use center (0.5, 0.5) or entropy-based cropping

### Sanity Model Reference

Sanity's approach:
- Image field has `asset` reference + `crop` + `hotspot`
- Asset is immutable
- Crop/hotspot are presentation metadata
- Image URL builder respects crop/hotspot

HPP should replicate this separation.

---

## 9. PIPELINE VERSIONING

### Deterministic Identities

**Source Identity**:
```
sourceHash = SHA-256(source content)
mediaId = UUIDv5(sourceHash)
```

**Variant Identity**:
```
variantIdentity = {
  sourceHash,
  width,
  height,
  format,
  quality,
  pipelineVersion,
  transformHash
}
```

**Transform Hash**:
```
transformHash = SHA-256(JSON.stringify({
  width,
  height,
  format,
  quality,
  focalPoint,
  crop,
  effort,
  chromaSubsampling
}))
```

**Pipeline Version**:
- Major.Minor.Patch (e.g., 2.0.0)
- Stored in manifest
- Stored in each derivative
- Bumped on breaking Sharp config changes

### Reprocessing

**Source Changed, Pipeline Unchanged**:
- New source hash → new mediaId
- Treat as new canonical asset
- Generate new derivatives

**Source Unchanged, Pipeline Changed**:
- Same source hash → same mediaId
- New pipeline version
- Regenerate derivatives
- Old derivatives remain cached until new ones validated

**Detecting Pipeline Change**:
- Compare pipelineVersion in manifest
- If current > stored, reprocess all images
- Or selective reprocess if possible

### Rollback Safety

- Old derivatives remain until new ones validated
- Never delete derivatives before replacement is ready
- Atomic manifest update
- If reprocessing fails, keep old derivatives

---

## 10. INTEGRATION OPPORTUNITIES

### node-sharp-iqa

**What it solves**: MSE, PSNR quality metrics for Sharp

**What we can borrow**: Quality gate implementation

**Dependency worth adding?**: YES

**Why**:
- Provides MSE/PSNR calculation
- Can be used for derivative vs source comparison
- Lightweight wrapper around Sharp
- Maintained (uses bundled Sharp to avoid segfaults)

**Integration**:
```javascript
import { SharpIQA } from 'sharp-iqa';

const psnr = await SharpIQA.psnr(
  SharpIQA.sharp(sourcePath),
  SharpIQA.sharp(derivativePath)
);
if (psnr < 30) {
  // FAIL: quality degradation
}
```

### focal.js

**What it solves**: Focal point selection UI

**What we can borrow**: Coordinate system, UI pattern

**Dependency worth adding?**: NO

**Why**:
- Can implement Sanity-style model directly
- jQuery dependency (deprecated)
- UI pattern can be replicated in React

### jquery-focuspoint

**What it solves**: Responsive cropping with focal point

**What we can borrow**: Coordinate system (-1 to +1), helper tool concept

**Dependency worth adding?**: NO

**Why**:
- jQuery dependency
- Use 0-1 coordinate system (Sanity model) instead
- Reference helper tool for coordinate conversion

### react-focus-point

**What it solves**: React component for focus point selection

**What we can borrow**: React UI pattern

**Dependency worth adding?**: MAYBE

**Why**:
- TypeScript
- React component
- Could be useful for Workbench UI
- But can implement custom component

### Other Packages

**@mischback/imp**: NO (unmaintained)
**@apeleghq/esbuild-plugin-responsive-images**: NO (build-time plugin, HPP has custom pipeline)

### Open Source Reference

**Sanity image-url**: Reference for crop/hotspot logic
**Imgix srcset generation**: Reference for exponential breakpoint algorithm
**Cloudinary responsive breakpoints**: Reference for intelligent breakpoint generation
**Sharp API documentation**: Reference for optimal quality settings

---

## 11. SURGICAL IMPLEMENTATION PLAN

### Phase 1: No-Upscaling Protection (CRITICAL)

**File**: `scripts/image-pipeline.mjs`

**Exact responsibility**: Add `withoutEnlargement: true` to all Sharp resize operations

**Why this file**: Current pipeline entry point

**What existing authority it extends**: Sharp processing stage

**What it must NOT become**: Architectural redesign

**Changes**:
```javascript
// In generateVariants function
await sharp(source)
  .resize(width, null, { withoutEnlargement: true })  // ADD THIS
  .webp({ quality: 80 })
  .toFile(output);
```

**Verification**:
- Run pipeline on test image smaller than 2000px
- Verify derivative is NOT upscaled
- Check dimensions match source

**Rollback boundary**: Single line change, easy revert

### Phase 2: EXIF Orientation Normalization (CRITICAL)

**File**: `scripts/image-pipeline.mjs`

**Exact responsibility**: Add `autoOrient()` to pipeline

**Why this file**: Processing entry point

**What existing authority it extends**: Normalization stage

**What it must NOT become**: Color profile management (separate concern)

**Changes**:
```javascript
// After Sharp load, before resize
await sharp(source)
  .autoOrient()  // ADD THIS
  .resize(width, null, { withoutEnlargement: true })
  .webp({ quality: 80 })
  .toFile(output);
```

**Verification**:
- Test with image with EXIF rotation
- Verify output has correct orientation
- Verify dimensions match visual orientation

**Rollback boundary**: Single function call, easy revert

### Phase 3: Color Profile Normalization (HIGH)

**File**: `scripts/image-pipeline.mjs`

**Exact responsibility**: Explicit sRGB conversion

**Why this file**: Processing entry point

**What existing authority it extends**: Normalization stage

**What it must NOT become**: ICC profile preservation (separate concern)

**Changes**:
```javascript
await sharp(source)
  .autoOrient()
  .toColourspace('srgb')  // ADD THIS
  .resize(width, null, { withoutEnlargement: true })
  .webp({ quality: 80 })
  .toFile(output);
```

**Verification**:
- Test with image with embedded ICC profile
- Verify output is sRGB
- Check for color shifts

**Rollback boundary**: Single function call, easy revert

### Phase 4: Quality Settings Optimization (HIGH)

**File**: `scripts/image-pipeline.mjs`

**Exact responsibility**: Configure optimal Sharp settings per format

**Why this file**: Processing entry point

**What existing authority it extends**: Encoding stage

**What it must NOT become**: Per-image adaptive encoding (later phase)

**Changes**:
```javascript
// WebP
.webp({
  quality: 80,
  effort: 4,
  smartSubsample: true,  // ADD for photos
  preset: 'photo'        // ADD
})

// AVIF
.avif({
  quality: 60,           // CHANGE from default
  effort: 5,             // CHANGE from default
  chromaSubsampling: '4:2:0'  // ADD
})

// JPEG (if added)
.jpeg({
  quality: 82,
  mozjpeg: true,         // ADD
  progressive: true,     // ADD
  chromaSubsampling: '4:2:0'  // ADD
})
```

**Verification**:
- Run pipeline on test images
- Compare file sizes vs current
- Visual inspection for quality
- No compression artifacts

**Rollback boundary**: Configuration object changes, revert to defaults

### Phase 5: Structured DerivativeSet Data Model (CRITICAL)

**File**: `src/types/media.ts`

**Exact responsibility**: Add DerivativeSet, DerivativeProfile, DerivativeVariant interfaces

**Why this file**: Existing type authority

**What existing authority it extends**: Media type system

**What it must NOT become**: Runtime processing logic

**Changes**:
- Add new interfaces (see Section 5)
- Keep MediaVariants for backwards compatibility
- Mark MediaVariants as @deprecated

**Verification**:
- TypeScript compilation
- No breaking changes to existing code

**Rollback boundary**: Type additions, backwards compatible

### Phase 6: Preflight Validation (HIGH)

**File**: `scripts/image-pipeline.mjs` (or new `scripts/preflight-validator.mjs`)

**Exact responsibility**: Validate source before processing

**Why new file**: Separation of concerns, reusability

**What existing authority it extends**: Source validation stage

**What it must NOT become**: Derivative quality validation (separate concern)

**Implementation**:
```javascript
async function validateSource(filePath) {
  const stats = await fs.stat(filePath);
  const metadata = await sharp(filePath).metadata();
  
  const errors = [];
  const warnings = [];
  
  // File size check
  if (stats.size > 50 * 1024 * 1024) {
    warnings.push('File size > 50MB');
  }
  
  // Dimension check
  if (metadata.width < 100 || metadata.height < 100) {
    errors.push('Dimensions too small');
  }
  
  // Aspect ratio check
  const ratio = metadata.width / metadata.height;
  if (ratio < 0.1 || ratio > 10) {
    warnings.push('Extreme aspect ratio');
  }
  
  return { errors, warnings };
}
```

**Verification**:
- Test with valid image
- Test with tiny image
- Test with corrupted image

**Rollback boundary**: New file, safe to remove

### Phase 7: Quality Gate Integration (MEDIUM)

**File**: `scripts/image-pipeline.mjs` + new `scripts/quality-gates.mjs`

**Exact responsibility**: Add quality gates using node-sharp-iqa

**Why new file**: Separation of concerns, reusability

**What existing authority it extends**: Quality verification stage

**What it must NOT become**: Automated acceptance/rejection (human review for WARN)

**Implementation**:
```javascript
import { SharpIQA } from 'sharp-iqa';

async function validateDerivative(sourcePath, derivativePath) {
  const psnr = await SharpIQA.psnr(
    SharpIQA.sharp(sourcePath),
    SharpIQA.sharp(derivativePath)
  );
  
  if (psnr < 30) {
    return { passed: false, message: 'Quality degradation detected' };
  }
  
  return { passed: true, message: 'Quality acceptable' };
}
```

**Verification**:
- Test with good derivative
- Test with over-compressed derivative
- Check PSNR values

**Rollback boundary**: New file, optional integration

### Phase 8: Hybrid Breakpoint Algorithm (MEDIUM)

**File**: `scripts/image-pipeline.mjs`

**Exact responsibility**: Replace fixed WIDTHS with hybrid algorithm

**Why this file**: Processing entry point

**What existing authority it extends**: Variant planning stage

**What it must NOT become**: Slot-specific logic (separate concern)

**Implementation**:
```javascript
function generateBreakpoints(intrinsicWidth, maxWidth) {
  const breakpoints = [];
  let current = 390;
  const max = Math.min(intrinsicWidth, maxWidth);
  
  while (current <= max) {
    breakpoints.push(current);
    current = Math.ceil(current * 1.08);  // 8% tolerance
  }
  
  return breakpoints;
}
```

**Verification**:
- Test with small source (400px)
- Test with large source (4000px)
- Verify no upscaling
- Verify exponential growth

**Rollback boundary**: Function replacement, revert to fixed array

### Phase 9: Presentation Metadata Authority (LOW)

**File**: NEW `src/config/slot-mapping.v1.json`

**Exact responsibility**: Store focal/crop metadata separately from canonical media

**Why new file**: Separation of concerns (canonical vs presentation)

**What existing authority it extends**: Slot presentation layer

**What it must NOT become**: Canonical media authority

**Implementation**:
```json
{
  "version": "1.0.0",
  "generatedAt": "2026-07-22T00:00:00.000Z",
  "mappings": [
    {
      "slotId": "homepage-hero-001",
      "mediaId": "fences-001-hero",
      "focalPoint": { "x": 0.5, "y": 0.4 },
      "updatedAt": "2026-07-22T00:00:00.000Z"
    }
  ]
}
```

**Verification**:
- TypeScript compilation
- Workbench can read/write this file
- Does not affect media.v1.json

**Rollback boundary**: New file, safe to remove

### DEFERRED (Do NOT implement now)

- Full DerivativeSet migration (Phase 1-9 must complete first)
- Per-image adaptive quality
- Automatic focal point detection
- SSIM integration (requires more research)
- Pipeline versioning infrastructure
- Reprocessing automation
- Workbench focal point UI

---

## FINAL QUESTION ANSWER

**When I drop a brand-new high-quality photograph into the authorized source Drive tomorrow, can HPP automatically turn it into a production-quality media asset whose original is preserved, identity is deterministic, metadata is trustworthy, colors/orientation are correct, responsive variants are genuinely excellent, crops can preserve the subject, quality degradation is detected, provenance is retained, and the website receives the correct derivative without me manually touching the pipeline?**

**Current Answer**: NO

**Missing**:
1. No upscaling protection (Phase 1)
2. No EXIF orientation normalization (Phase 2)
3. No color profile normalization (Phase 3)
4. No optimal quality settings (Phase 4)
5. No structured derivative tracking (Phase 5)
6. No source validation (Phase 6)
7. No quality gates (Phase 7)
8. No intelligent breakpoints (Phase 8)
9. No focal/crop infrastructure (Phase 9 - deferred)
10. No pipeline versioning (deferred)

**After Phases 1-8**: PARTIAL YES
- Original preserved: YES
- Identity deterministic: YES
- Metadata trustworthy: PARTIAL (no quality gates yet)
- Colors/orientation correct: YES (Phases 2-3)
- Responsive variants excellent: IMPROVED (Phases 4, 7-8)
- Crops preserve subject: NO (deferred Phase 9)
- Quality degradation detected: PARTIAL (Phase 7)
- Provenance retained: YES (source hash exists)
- Website receives correct derivative: YES (with improved breakpoints)

**Complete YES requires**: Phases 1-8 + deferred phases (9, focal point UI, quality gates, pipeline versioning)

---

## APPENDIX: RESEARCH SOURCES

### Cloudinary
- https://cloudinary.com/guides/responsive-images/generate-responsive-images-for-reduced-bandwidth
- https://cloudinary.com/documentation/responsive_images
- https://github.com/cloudinary/responsive_breakpoints_generator
- https://cloudinary.com/blog/responsive-image-optimization-srcset-cloudinary

### Imgix
- https://github.com/imgix/js-core
- https://github.com/imgix/imgix.js/pull/130
- https://www.imgix.com/blog/srcset-generation

### Sanity
- https://www.sanity.io/plugins/image-url
- https://www.sanity.io/plugins/sanity-image-url-builder
- https://www.sanity.io/docs/studio/image-type
- https://github.com/sanity-io/image-url

### Builder.io
- https://www.builder.io/c/docs/image-api
- https://www.builder.io/c/docs/images

### Next.js
- https://nextjs.im/docs/14/app/building-your-application/optimizing/images/
- https://www.matthewswong.com/en/blog/nextjs-image-optimization-internals/
- https://www.matthewswong.com/en/blog/image-optimization-nextjs-webp-avif/

### Sharp
- https://sharp.pixelplumbing.com/api-output/
- https://sharp.pixelplumbing.com/api-operation/
- https://sharp.pixelplumbing.com/api-input/
- https://sharp.pixelplumbing.com/api-colour/
- https://github.com/lovell/sharp/issues/4227
- https://github.com/lovell/sharp/issues/2207

### Quality Metrics
- https://live.ece.utexas.edu/publications/2004/zwang_ssim_ieeeip2004.pdf
- https://github.com/facebook/ThreatExchange/tree/main/pdq
- https://www.mathworks.com/help/images/image-quality-metrics.html

### Focal Point
- https://github.com/chiel/focal.js
- https://github.com/jonom/jquery-focuspoint
- https://github.com/designedhead/react-focus-point
- https://github.com/abhishekfdd/focal-point-suggest

### Image Quality
- https://tarkarn.com/blog/sharp-nodejs-image-processing
- https://minipx.com/blog/image-compression-for-developers
- https://dev.to/serhii_kalyna_730b636889c/avif-encoding-speed-the-numbers-nobody-talks-about-a2h
- https://github.com/ideamans/node-sharp-iqa
