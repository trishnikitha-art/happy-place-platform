# Component Integration Audit
**Session: Next.js Image usage, srcSet/sizes behavior, Drive resolution paths**
**Date: 2026-07-23**
**Baseline Git SHA: 339fd73**

## Executive Summary

Component audit reveals that the system uses "highest variant wins" selection, has Drive URLs potentially reaching production, and lacks DPR-aware responsive delivery. The `sizes` attribute is present but actual rendered widths are not validated.

---

## Section 1: ServiceCard Component

### File: `src/components/service-card.tsx`

#### Image Selection Logic (Lines 49-58)

```typescript
const responsiveVariants = featuredMedia?.variants?.responsive;
const hasResponsiveVariants = responsiveVariants && responsiveVariants.length > 0;

const imageSrc = hasImage
  ? (hasResponsiveVariants
      ? responsiveVariants[responsiveVariants.length - 1].webp  // ← HIGHEST WINS
      : (featuredMedia.variants?.web || featuredMedia.variants?.original))
  : null;
```

**Finding**: Uses "highest variant wins" (last element of responsive array).

#### Next.js Image Configuration (Lines 81-88)

```typescript
<Image
  src={imageSrc}
  alt={featuredMedia.alt || service.name}
  fill
  sizes="(max-width: 768px) 50vw, 33vw"  // ← SIZES ATTRIBUTE PRESENT
  className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
  unoptimized={imageSrc.startsWith('/api/drive/')}  // ← DRIVE URL FLAG
/>
```

**Findings**:
- `sizes` attribute present: `(max-width: 768px) 50vw, 33vw`
- This tells browser: mobile = 50% viewport width, desktop = 33% viewport width
- `unoptimized` flag set for Drive URLs (acknowledges Drive URLs can reach production)
- No DPR awareness (no devicePixelRatio consideration)

#### Drive Resolution Path

From `src/app/page.tsx` (Lines 96-97):

```typescript
if (assignment.mediaId.startsWith('drive-')) {
  mediaObject = await getMediaByIdAsync(assignment.mediaId);
}
```

**Finding**: Drive-prefixed mediaIds are resolved via KV lookup. No evidence of materialization check before browser receives URL.

---

## Section 2: Homepage Hero Component

### File: `src/app/page.tsx`

#### Image Selection Logic (Lines 72-79)

```typescript
const heroResponsiveVariants = heroMedia?.variants?.responsive;
const hasHeroResponsiveVariants = heroResponsiveVariants && heroResponsiveVariants.length > 0;
const heroSrc = heroMedia
  ? (hasHeroResponsiveVariants
      ? heroResponsiveVariants[heroResponsiveVariants.length - 1].webp  // ← HIGHEST WINS
      : (heroMedia.variants?.web || heroMedia.variants?.original || '/images/hero-background-enhanced.jpg'))
  : '/images/hero-background-enhanced.jpg';
```

**Finding**: Uses "highest variant wins" (last element of responsive array).

#### Next.js Image Configuration (Lines 136-144)

```typescript
<Image
  src={heroSrc}
  alt={heroMedia.alt || "Happy Place Carpentry - Professional carpentry services"}
  fill
  priority
  sizes="100vw"  // ← FULL VIEWPORT WIDTH
  className="object-cover"
  style={{ filter: "brightness(0.7)" }}
/>
```

**Findings**:
- `sizes` attribute: `100vw` (full viewport width)
- `priority` flag (preloads hero image)
- No DPR awareness

---

## Section 3: Owner Portrait Component

### File: `src/app/page.tsx`

#### Image Selection Logic (Lines 58-64)

```typescript
const ownerResponsiveVariants = ownerMedia?.variants?.responsive;
const hasOwnerResponsiveVariants = ownerResponsiveVariants && ownerResponsiveVariants.length > 0;
const ownerSrc = ownerMedia
  ? (hasOwnerResponsiveVariants
      ? ownerResponsiveVariants[ownerResponsiveVariants.length - 1].webp  // ← HIGHEST WINS
      : (ownerMedia.variants?.web || ownerMedia.variants?.original || undefined))
  : undefined;
```

**Finding**: Uses "highest variant wins" (last element of responsive array).

---

## Section 4: VisualSlot Component

### File: `src/components/visual-slot.tsx`

**Purpose**: Wraps images for workbench slot registration. Does not affect image delivery directly.

**Finding**: This component is for workbench UI only, not production image delivery.

---

## Section 5: Responsive Delivery Chain Analysis

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
Next.js Image with sizes attribute
      ↓
browser receives ONE file (not a srcSet)
```

### Missing Links

| Missing Link | Status | Impact |
|--------------|--------|--------|
| Slot geometry defined | ❌ NO | Unknown what width hero needs |
| CSS display width audit | ❌ NO | Unknown actual rendered width |
| Candidate width mapping | ❌ NO | 480/768/1080 not matched to breakpoints |
| DPR awareness | ❌ NO | No 2x/3x variants for retina |
| Browser srcSet selection | ❌ NO | System selects, not browser |

### sizes Attribute Analysis

| Component | sizes Value | Interpretation |
|-----------|------------|----------------|
| ServiceCard | `(max-width: 768px) 50vw, 33vw` | Mobile: 50vw, Desktop: 33vw |
| Homepage Hero | `100vw` | Full viewport width |

**Gap**: `sizes` tells browser what width the image will render at, but system doesn't use it to select appropriate variant. System pre-selects highest variant regardless of `sizes`.

---

## Section 6: Drive → Public Delivery Boundary Violation

### Evidence of Drive URLs in Production

**ServiceCard component** (Line 87):
```typescript
unoptimized={imageSrc.startsWith('/api/drive/')}
```

**Finding**: Component explicitly handles Drive URLs. This acknowledges Drive URLs can reach production.

**Homepage Drive resolution** (page.tsx Lines 96-97):
```typescript
if (assignment.mediaId.startsWith('drive-')) {
  mediaObject = await getMediaByIdAsync(assignment.mediaId);
}
```

**Finding**: Drive-prefixed mediaIds resolved via KV lookup. No materialization check before browser receives URL.

### Required Architecture

```
DriveReference (Workbench only)
    ↓
materialize (build-time) ← MISSING
    ↓
Master (archive)
    ↓
Renditions (public/images/)
    ↓
PublicMediaURL (production)
```

**BLOCKER**: No evidence of materialization step. Drive URLs may be reaching production.

---

## Section 7: Quality Policy in Components

### Current Quality Policy

**NONE.** Components have:
- No upscale rejection
- No insufficient source detection
- No rendition quality classes
- No capability reporting

### Quality Issues in Components

| Issue | Component | Severity |
|-------|-----------|----------|
| Silent upscale possible | ServiceCard, Hero, Portrait | HIGH |
| No source quality gating | All components | HIGH |
| No DPR awareness | All components | MEDIUM |
| Drive URLs can reach production | ServiceCard | CRITICAL |

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

---

## Section 9: Sharp Deployment Health

### Status: NOT COMPLETE

Need to verify:
- Sharp installed in production environment
- Sharp v0.33.5 or higher (critical bug fixes)
- Image optimization pipeline functional
- No sharp-related build errors

---

## Recommendations

### Immediate Actions

1. **Close Drive → public delivery boundary**
   - Remove `unoptimized={imageSrc.startsWith('/api/drive/')}` flag
   - Implement materialization check before rendering
   - Fail closed if materialization not complete

2. **Fix "highest variant wins" selection**
   - Replace with DPR-aware candidate selection
   - Use `sizes` attribute to calculate required width
   - Select variant based on `requiredWidth * devicePixelRatio`

3. **Add DPR awareness**
   - Generate 2x/3x variants for key slots
   - Select appropriate variant based on devicePixelRatio
   - Update responsive arrays to include DPR candidates

4. **Audit actual rendered widths**
   - Measure CSS display width for each slot
   - Validate `sizes` attribute accuracy
   - Map breakpoint widths to variant widths

### Architectural Changes Required

1. **Presentation Recipe Layer**
   - Define slot geometries (hero: 100vw, card: 33vw, portrait: TBD)
   - Map to quality classes (hero: high, card: medium, portrait: high)
   - Configure crop/focal point rules
   - Set DPR candidate widths

2. **Responsive Delivery Layer**
   - Calculate required width from `sizes` attribute
   - Apply DPR multiplier
   - Select closest variant from responsive array
   - Fallback to next-lower variant if insufficient

3. **Quality Gate Layer**
   - Check source capability before rendition
   - Reject upscales unless explicit policy
   - Report insufficient sources
   - Apply quality class settings

---

## Conclusion

Components use "highest variant wins" selection, have Drive URLs potentially reaching production, and lack DPR-aware responsive delivery. The `sizes` attribute is present but not used for variant selection. No quality policy enforcement at component level.

**String swaps must remain BLOCKED** until these gaps are closed.

---

## Audit Metadata

- **Auditor**: Devin CLI
- **Baseline Git SHA**: 339fd73
- **Audit Date**: 2026-07-23
- **Files Audited**: service-card.tsx, page.tsx, visual-slot.tsx
- **Scope**: Component Image usage, srcSet/sizes behavior, Drive resolution paths
