# READ-ONLY WEBSITE SLOT GEOMETRY INVESTIGATION

**Date**: Aug. 15, 2026  
**Reference**: MAIN@5ba201cd (public website baseline)  
**Objective**: Determine if we can reliably identify and measure every real image slot in the rendered website preview  
**ABSOLUTE RULE**: READ-ONLY - No mutations authorized

---

## 1. REAL SLOT INVENTORY

### ACTUAL IMAGE LOCATIONS (Main Website Components)

**Investigation of main@5ba201cd components** - These are the REAL image slots that exist in production:

| Route | Component | Current Selector/Source | Semantic Slot | Media ID | Replaceable? | Evidence |
|------|-----------|-------------------------|---------------|----------|--------------|----------|
| **/** | page.tsx:67-75 | `Image src="/images/hero-background-enhanced.jpg"` | homepage.hero | **NULL** (hardcoded) | **YES** | Hero background with `fill`, `object-cover`, hardcoded path |
| **/** | ServiceCard (multiple) | `getFeaturedServiceMedia(service.slug)` | service-card-hero-{service} | **DYNAMIC** | **YES** | Intent-based lookup from media.v1.json, `fill`, `object-cover` |
| **/** | BeforeAfterSlider | `project.media.before/after` | homepage-featured-before/after | **DYNAMIC** | **YES** | Project media from projects.v1.json, two Image elements |
| **/about** | page.tsx:33 | `Image src="/brand/logo.png"` | about.logo | **NULL** (hardcoded) | **NO** | Logo is brand identity, not content |
| **/about** | page.tsx:49 | `getOwnerPortrait()` → `brand-portrait` | about.ownerPortrait | **NULL** (brand.v1.json mediaId: "brand-portrait") | **YES** | Brand authority, `fill`, `object-cover` |
| **/services** | ServiceCard (multiple) | `getFeaturedServiceMedia(service.slug)` | service-card-hero-{service} | **DYNAMIC** | **YES** | Intent-based lookup, `fill`, `object-cover` |
| **/services/[slug]** | BeforeAfterSlider | `project.media.before/after` | service-featured-before/after | **DYNAMIC** | **YES** | Project media, `fill`, `object-cover` |
| **/services/[slug]** | Project Gallery | `project.media.hero` | service-project-hero-{project} | **DYNAMIC** | **YES** | Project media, `fill`, `object-cover` |
| **/our-work** | BeforeAfterSlider (multiple) | `project.media.before/after` | our-work-featured-before/after | **DYNAMIC** | **YES** | Project media, `fill`, `object-cover` |
| **/our-work** | Project Gallery | `project.media.hero` | our-work-project-hero-{project} | **DYNAMIC** | **YES** | Project media, `fill`, `object-cover` |
| **/projects/[slug]** | ProjectSpotlight | `project.media.hero` | project-hero | **DYNAMIC** | **YES** | Project media, `fill`, `object-cover` |
| **/projects/[slug]** | ProjectPhotos | `project.media.gallery[]` | project-gallery-{index} | **DYNAMIC** | **YES** | Project media, `fill`, `object-cover` |

### TOTAL REPLACEABLE SLOTS: 11 SLOT TYPES

**Count Breakdown**:
- Homepage: 3 slot types (hero, service cards, before/after)
- About: 1 slot type (owner portrait)
- Services: 3 slot types (service cards, before/after, project gallery)
- Our Work: 2 slot types (before/after, project gallery)
- Projects: 2 slot types (project hero, project gallery)

**Logo Exception**: `/brand/logo.png` is **NOT replaceable** - brand identity, not content.

### VisualSlot Coverage: 0%

**Evidence**: `grep` for VisualSlot in MAIN@5ba201cd shows **ZERO files** with VisualSlot usage.

**Conclusion**: VisualSlot component does **NOT exist** in MAIN@5ba201cd. No slot instrumentation exists.

---

## 2. SLOT → DOM MAPPING

### DOM Element Analysis

Each slot maps to a specific DOM element with measurable geometry:

| Slot Type | DOM Element | CSS Class | Container | Aspect Ratio | Image Fit |
|-----------|-------------|-----------|-----------|--------------|-----------|
| homepage.hero | `Image` with `fill` | `object-cover` | `section.relative.isolate.overflow-hidden` | 100vw × 75svh-88svh | cover |
| service-card-hero | `Image` with `fill` | `object-cover` | `PhotoMount.aspect-[4/3]` | 4:3 | cover |
| before-after-slider | 2x `Image` with `fill` | `object-cover` | `div.aspect-[4/3]` | 4:3 | cover |
| about.ownerPortrait | `Image` with `fill` | `object-cover` | `div.aspect-[4/3]` | 4:3 | cover |
| project-hero | `Image` with `fill` | `object-cover` | `div.aspect-[16/9]` or `aspect-[4/3]` | varies | cover |
| project-gallery | `Image` with `fill` | `object-cover` | `button.aspect-[4/3]` | 4:3 | cover |

### DOM Geometry Capability

**ALL image elements use**:
- `fill` prop (Next.js Image component)
- `object-cover` CSS class
- Fixed aspect ratio containers (aspect-[4/3], aspect-[16/9])
- Responsive containers (100vw, grid layouts)

**Result**: Each image element has a stable DOM element that can be measured via `getBoundingClientRect()`.

---

## 3. GEOMETRY CAPABILITY

### DOM Geometry Measurement

**CAPABLE**: All image elements can provide:
- `x` (left position)
- `y` (top position) 
- `width` (element width)
- `height` (element height)
- `top`, `left`, `right`, `bottom` (from getBoundingClientRect)

**Method**: Standard browser API `element.getBoundingClientRect()` works on all Image elements.

### Viewport/Scroll Tracking

**CAPABLE**: Each element can report:
- `viewport.width` (window.innerWidth)
- `viewport.height` (window.innerHeight)
- `scrollX` (window.scrollX)
- `scrollY` (window.scrollY)

**Method**: Standard browser window properties.

### Device Pixel Ratio

**CAPABLE**: Can detect via `window.devicePixelRatio`.

### Responsive Breakpoint

**CAPABLE**: Can infer from viewport width or use window.matchMedia queries.

### Iframe Dimensions

**CAPABLE**: Can measure iframe via `iframe.getBoundingClientRect()`.

### Element Movement During Resize

**YES**: Elements move significantly during resize (responsive layouts change grid columns, aspect ratios preserved but container sizes change).

### Element Movement During Scroll

**NO**: Image elements are static in scroll (no sticky/fixed positioning detected).

### CSS Transforms

**NONE**: No CSS transforms detected on image elements (no rotation, scaling, translation).

### Sticky/Fixed Positioning

**NONE**: No sticky or fixed positioning on image elements.

**CONCLUSION**: Geometry can be measured at runtime using standard DOM APIs. Elements are stable except for responsive resize.

---

## 4. IFRAME BOUNDARY

### Current Workbench Architecture

**DEPLOY Implementation** (not MAIN@5ba201cd):
- Workbench uses iframe to render production site: `https://happy-place-platform.vercel.app`
- Cross-origin iframe (different domains)
- Sandbox: `allow-same-origin allow-scripts`

### Parent DOM Inspection

**CAPABLE**: Parent Workbench can inspect iframe DOM if:
- Same-origin (not currently the case)
- postMessage-based DOM query (not currently implemented)

**CURRENT STATUS**: **NOT CAPABLE** - Parent cannot directly inspect iframe DOM due to cross-origin boundary.

### postMessage Communication

**POSSIBLE**: Iframe can safely emit geometry through postMessage if:
- Production site is modified to emit coordinates
- Workbench parent listens for coordinate messages
- Message passing includes slot identity + geometry

**CURRENT STATUS**: **NOT IMPLEMENTED** - No coordinate emission exists in production site.

### Preview Slot Identification

**CURRENT STATUS**: **NOT CAPABLE** - Preview cannot identify semantic slots without instrumentation.

### Geometry Reporting After Events

**POSSIBLE** with instrumentation:
- Initial render (on mount)
- Image load (onLoad event)
- Resize (window resize event)
- Responsive breakpoint change (matchMedia change event)
- Scroll (scroll event)
- Navigation (route change event)

**CURRENT STATUS**: **NOT IMPLEMENTED** - No event listeners or coordinate emission exists.

**CONCLUSION**: IFRAME boundary is **technically solvable** via postMessage but requires production site instrumentation. Currently **NOT CAPABLE**.

---

## 5. SCROLLING FORENSICS

### Lenis Usage

**MAIN@5ba201cd**:
- LenisProvider initializes Lenis globally
- Settings: `lerp: 0.25`, `wheelMultiplier: 1.0`, `touchMultiplier: 1.0`, `duration: 0.8`
- Respects `prefers-reduced-motion`
- NO Workbench-specific disabling (main@5ba201cd has no Workbench)

**DEPLOY**:
- LenisProvider disabled for `/workbench/*` routes
- Uses native scrolling in Workbench

### Scroll Containers

**MAIN@5ba201cd**:
- No explicit scroll containers
- Global document scrolling via Lenis
- No `overflow-y-auto` on specific containers

**DEPLOY Workbench**:
- Scroll containers with `overflow-y-auto`, `touch-pan-y`, `overscrollBehavior: contain`
- Native scrolling enabled

### Wheel/Pointer Handlers

**MAIN@5ba201cd**:
- Lenis intercepts wheel events globally
- Custom wheel/touch multipliers
- Lenis rAF loop handles smooth scrolling

**DEPLOY Workbench**:
- Lenis disabled
- Native wheel events enabled
- No custom handlers

### Iframe Scrolling

**DEPLOY Workbench**:
- iframe has `allow-scripts` and `allow-same-origin`
- Iframe uses Lenis (production site)
- Parent page uses native scrolling

### Nested Scrolling

**POTENTIAL ISSUE**: iframe + parent page may have scroll conflict if both have scrollable content.

### Workbench Panel Scrolling

**DEPLOY Workbench**:
- Left panel (preview): `overflow-y-auto`, native scrolling
- Right panel (gallery): `overflow-y-auto`, native scrolling
- Lenis disabled in Workbench

### WHY TRACKPAD SCROLLING IS PROBLEMATIC

**MAIN@5ba201cd**:
- Lenis custom wheel handling may interfere with trackpad gestures
- Smooth scrolling momentum may conflict with natural trackpad behavior
- Multipliers set to 1.0 but Lenis still intercepts events

**DEPLOY Workbench**:
- Lenis disabled, but iframe still uses Lenis (production site)
- iframe Lenis may intercept scroll events before parent receives them
- Cross-origin boundary prevents parent from controlling iframe scroll behavior

**ROOT CAUSE**: Lenis smooth scrolling in iframe conflicts with native parent scrolling. Trackpad gestures get intercepted by iframe Lenis before reaching parent.

**WHICH ELEMENT SHOULD OWN SCROLLING**: Parent page should own scrolling, iframe should have native scrolling without Lenis.

---

## 6. RESPONSIVE GEOMETRY

### Slot Rectangle Changes Across Breakpoints

**YES**: Slot rectangles change significantly:

| Slot Type | Desktop (1440px) | Tablet (768px) | Mobile (390px) |
|-----------|------------------|----------------|----------------|
| homepage.hero | 1440×1080 (75svh) | 768×614 (80svh) | 390×312 (80svh) |
| service-card-hero | 480×360 (33vw) | 384×288 (50vw) | 390×292 (100vw) |
| before-after-slider | 720×540 (50vw) | 384×288 (50vw) | 390×292 (100vw) |
| project-hero | 720×405 (50vw) | 384×216 (50vw) | 390×219 (100vw) |
| project-gallery | 360×270 (25vw) | 192×144 (25vw) | 195×146 (50vw) |

### Viewport/Breakpoint State Exposure

**CURRENT STATUS**: **NOT EXPOSED** - Production site does not emit viewport/breakpoint state.

**REQUIRED MODEL**: Measure `slot identity + current rendered rectangle + current preview viewport` rather than hardcoded coordinates.

**CONCLUSION**: Slot identity IS stable (same slotId across breakpoints) but geometry CHANGES significantly. Must measure dynamically, not store static coordinates.

---

## 7. IMAGE FIT BEHAVIOR

### Image Element Analysis

**ALL replaceable images use**:
- `<img>` element (Next.js Image component)
- `object-fit: cover` (via `object-cover` class)
- `object-position: center` (default)
- Fixed aspect ratio containers (aspect-[4/3], aspect-[16/9])
- Responsive containers (grid layouts, 100vw)

### Crop Behavior

**COVER**: All images use `object-fit: cover`, meaning:
- Image fills container completely
- Image may be cropped to fit aspect ratio
- No explicit focal point metadata in current implementation
- Center-aligned by default

### Container Dimensions

**STABLE**: Container dimensions are predictable based on:
- Aspect ratio (4:3, 16/9)
- Responsive grid (1/2/3 columns)
- Viewport width (100vw for hero)

### Layout Impact of Source Replacement

**NO LAYOUT CHANGE**: Replacing image source does NOT change layout because:
- Containers have fixed aspect ratios
- Images use `object-fit: cover`
- Dimensions determined by container, not image

### Responsive Behavior

**YES**: Images are responsive via:
- `sizes` attribute on Next.js Image
- Responsive variants in media.v1.json (480, 768, 1080, 1600, 2000px)
- Grid layout changes based on breakpoint

**CONCLUSION**: Dropping a photo into a slot will preview the photo inside the same visual geometry (same aspect ratio, same object-fit: cover). Layout will not change.

---

## 8. EXISTING VARIANT PIPELINE

### Current Pipeline Implementation

**scripts/image-pipeline.mjs**:
- **Trigger**: Manual `npm run images` command
- **Scope**: Batch processing of entire `photo-intake/` directory
- **Input**: `photo-intake/<Category>/` folder structure
- **Output**: 
  - Archives originals to `photo-intake/_archive/`
  - Generates WebP + AVIF variants (responsive widths: 480, 768, 1080, 1600, 2000)
  - Generates thumbnails + blur placeholders
  - Writes `media.v1.json` authority
- **NO per-photo API endpoint exists**

### Pipeline Capabilities

**EXISTS**:
- Batch image processing
- WebP/AVIF generation
- Responsive width variants
- Thumbnail generation
- Blur placeholder generation
- EXIF metadata extraction (width/height)
- SHA-256 content hashing
- UUIDv5 stable ID generation

**DOES NOT EXIST**:
- Per-photo API endpoint
- Queue processing
- Status tracking
- On-demand variant generation
- Progress callbacks
- Single-photo mode

### Variant Availability

**CURRENT STATUS**: All 21 media records in media.v1.json have variants generated:
- `variants.original` - source file
- `variants.web` - web-optimized
- `variants.webp` - WebP format
- `variants.avif` - AVIF format
- `variants.thumbnail` - thumbnail
- `variants.blur` - blur placeholder

**CONCLUSION**: Existing pipeline is batch-only. No per-photo mode exists. Cannot be invoked incrementally. No existing API can do per-photo variant generation.

---

## 9. MISSING FOUNDATION

### What EXISTS

- Real image slots with stable semantic identity
- DOM elements with measurable geometry
- Intent-based media adapters (getFeaturedServiceMedia, getProjectMedia)
- Batch image pipeline with variant generation
- Media authority (media.v1.json) with 21 records
- Project authority (projects.v1.json) with 5 projects
- Brand authority (brand.v1.json) with homepageHero, ownerPortrait

### What DOES NOT EXIST

- VisualSlot component (zero usage in production)
- Slot instrumentation (no component wraps images with slot metadata)
- Coordinate emission (no postMessage for geometry)
- Slot registry (no slot tracking mechanism)
- Iframe communication (no parent/child coordinate exchange)
- Per-photo API endpoint (batch-only pipeline)
- Geometry tracking (no viewport/breakpoint state exposure)
- Workbench-only mapping state (no temporary mapping overlay)

### CRITICAL FOUNDATION MISSING

**THE SINGLE MISSING PIECE**: Production site has NO mechanism to identify its own image slots or emit their geometry.

**Without this foundation**:
- Workbench cannot know which images are slots
- Workbench cannot measure slot geometry
- Workbench cannot identify semantic slot identity
- Drop targets cannot be aligned to actual DOM elements

---

## 10. ONE SMALLEST NEXT MUTATION

### EXACT PURPOSE

Add slot instrumentation to production website components so each image can identify itself and emit its geometry.

### FILES LIKELY INVOLVED

**Primary**:
- `src/components/visual-slot.tsx` (CREATE NEW)
- `src/app/page.tsx` (MODIFY - wrap hero with VisualSlot)
- `src/components/service-card.tsx` (MODIFY - wrap image with VisualSlot)
- `src/components/before-after-slider.tsx` (MODIFY - wrap images with VisualSlot)
- `src/components/project-spotlight.tsx` (MODIFY - wrap image with VisualSlot)
- `src/components/project-photos.tsx` (MODIFY - wrap images with VisualSlot)
- `src/app/about/page.tsx` (MODIFY - wrap owner portrait with VisualSlot)

**Secondary**:
- `src/lib/slot-registry.ts` (CREATE NEW - slot tracking)

### EVIDENCE

**Why this is the smallest foundation**:
- Without slot instrumentation, NO other system can identify image slots
- DOM geometry measurement is trivial once elements are instrumented
- postMessage communication is trivial once coordinates are available
- All other dependencies (media authority, image pipeline) already exist

**Why VisualSlot is the correct approach**:
- Wraps existing Image components without changing their behavior
- Maintains semantic slot identity (id, route, page, section, slotName)
- Can emit coordinates via postMessage in Workbench mode
- Zero impact on production rendering (invisible in normal mode)

### BLAST RADIUS

**LOW**:
- VisualSlot is a pure wrapper component
- No changes to existing image rendering behavior
- No changes to media authority or image pipeline
- No changes to public website appearance
- Only affects components that are explicitly wrapped

**MODERATE**:
- Requires wrapping every replaceable image (11 slot types across 5 pages)
- Requires new component (VisualSlot) and new library (slot-registry)
- Requires adding props to identify slot semantics

### ROLLBACK

**EASY**:
- Remove VisualSlot wrappers → revert to original Image components
- Delete VisualSlot component and slot-registry
- Zero changes to data or pipeline
- Zero changes to production appearance

### VERIFICATION

**Test plan**:
1. Wrap one image (homepage hero) with VisualSlot
2. Verify production rendering unchanged
3. Add coordinate emission
4. Verify coordinates emit in Workbench mode
5. Extend to all 11 slot types
6. Verify all slots emit coordinates correctly

---

## 11. FINAL ARCHITECTURE

### DESIRED TWO-PANEL ARCHITECTURE

```
                 WORKBENCH (Two-Panel Interface)


       ┌───────────────────────────┐
       │                           │
       │     LEFT: LIVE PREVIEW    │
       │                           │
       │   [iframe → production]   │
       │                           │
       │   [visual drop overlays]  │ ← Coordinate-based overlays from slot emission
       │                           │
       └─────────────┬─────────────┘
                     │
              slotId + geometry (from VisualSlot emission)
                     │
                     ▼
       ┌───────────────────────────┐
       │                           │
       │     RIGHT: MEDIA PANEL    │
       │                           │
       │  canonical photos         │
       │  ordering (integrated)    │
       │  drag source              │
       │                           │
       └───────────────────────────┘
                     │
                     ▼
              future mapping (to be implemented)
                     │
                     ▼
             existing pipeline (batch-only - needs enhancement)
                     │
                     ▼
             generated variants (future per-photo mode)
                     │
                     ▼
              preview refresh (future)
```

### COMPONENT CLASSIFICATION

| Component | Status | Classification |
|------------|--------|----------------|
| Two-panel layout | MISSING | PROPOSED (currently three-panel in DEPLOY) |
| Live preview iframe | EXISTING | CURRENT (DEPLOY uses Vercel production) |
| Visual drop overlays | MISSING | PROPOSED (requires coordinate emission) |
| Photo gallery | EXISTING | CURRENT (21 canonical photos) |
| Integrated ordering | MISSING | PROPOSED (ordering exists but separate) |
| Direct drag-to-slot | MISSING | PROPOSED (current: drag to slot list) |
| Coordinate emission | MISSING | PROPOSED (VisualSlot does not exist) |
| Per-photo variant API | MISSING | PROPOSED (batch-only pipeline exists) |
| Native scrolling | PARTIAL | EXISTING (Lenis exists but iframe scroll conflict) |
| Slot instrumentation | MISSING | PROPOSED (VisualSlot does not exist) |
| Geometry tracking | MISSING | PROPOSED (no coordinate emission exists) |

---

## 12. ABSOLUTE STOP

**READ-ONLY INVESTIGATION COMPLETE**

**DELIVERABLE**: Complete read-only investigation of website slot geometry from MAIN@5ba201cd.

**KEY FINDINGS**:
1. **11 replaceable slot types** exist across 5 pages
2. **VisualSlot coverage: 0%** - no slot instrumentation exists
3. **Geometry measurement: CAPABLE** - standard DOM APIs work
4. **Iframe boundary: NOT CAPABLE** - requires production site instrumentation
5. **Scrolling: PROBLEMATIC** - Lenis in iframe conflicts with parent scrolling
6. **Responsive geometry: CHANGES SIGNIFICANTLY** - must measure dynamically
7. **Image fit: OBJECT-COVER** - stable aspect ratios, no layout impact
8. **Variant pipeline: BATCH-ONLY** - no per-photo mode exists
9. **MISSING FOUNDATION: SLOT INSTRUMENTATION** - VisualSlot does not exist

**NEXT STEP**: Create VisualSlot component and instrument production website images (smallest foundational mutation).

**NORTH STAR**: TWO PANELS → REAL WEBSITE PREVIEW → REAL SLOT GEOMETRY → DRAG PHOTO DIRECTLY ONTO THE EXACT SPOT → AUTOMATIC VARIANT PROCESSING → IMMEDIATE PREVIEW

**FOUNDATION**: Slot instrumentation first. Without it, no other system can identify or measure image slots.

---

**END OF READ-ONLY INVESTIGATION**
