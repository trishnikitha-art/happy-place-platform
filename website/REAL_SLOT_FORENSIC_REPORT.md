# 1. REAL SLOT INVENTORY

## Homepage (/)

**REPLACEABLE:**
1. **Homepage Hero**
   - Component: `src/app/page.tsx` (lines 69-83)
   - DOM: `<Image>` with `fill` prop inside `<section className="relative isolate overflow-hidden">`
   - Source: `heroSrc` from `getHomepageHero()` → `getMediaById()` → `variants.web/original`
   - Authority: Brand Authority (`brand.v1.json` → `homepageHero.mediaId`)
   - Current media ID: `brand-hero`
   - Semantic identity: `homepage.hero` (Brand Authority contract)
   - DOM element: Absolutely positioned fill image with `object-cover`
   - Evidence: Lines 56-59 in page.tsx resolve hero through Brand Authority

2. **Homepage Owner Portrait**
   - Component: `src/app/page.tsx` (lines 256-258)
   - DOM: `<Image>` with `fill` prop inside `<div className="relative aspect-[4/3]">`
   - Source: `ownerSrc` from `getOwnerPortrait()` → `getMediaById()` → `variants.web/original`
   - Authority: Brand Authority (`brand.v1.json` → `ownerPortrait.mediaId`)
   - Current media ID: `brand-portrait`
   - Semantic identity: `about.ownerPortrait` (Brand Authority contract)
   - DOM element: Aspect-ratio constrained fill image with `object-cover`
   - Evidence: Lines 50-52 in page.tsx resolve portrait through Brand Authority

3. **Homepage Service Cards** (3 cards)
   - Component: `src/components/service-card.tsx` (lines 36-46)
   - DOM: `<Image>` with `fill` prop inside `<PhotoMount>` with `aspect-[4/3]`
   - Source: `getFeaturedServiceMedia(service.slug)` → `variants.web/original`
   - Authority: Indirect via Projects Authority → Media Authority
   - Current media ID: Varies per service (hero media of highest-ranked project for that service)
   - Semantic identity: `homepage.services.{slug}.hero` (indirect via Projects Authority)
   - DOM element: Aspect-ratio constrained fill image with `object-cover`
   - Evidence: Lines 23-25 in service-card.tsx resolve through Media Authority

4. **Homepage Featured Projects Grid** (4 project thumbnails)
   - Component: `src/app/page.tsx` (lines 204-224)
   - DOM: `<img>` (raw, not next/image) inside `<Link>` with grid spans
   - Source: `project.media.hero` → `getMediaById()` → `variants.web/original`
   - Authority: Projects Authority (`projects.v1.json` → `project.media.hero`)
   - Current media ID: Varies per project (hero media ID from project record)
   - Semantic identity: `project.{id}.hero` (Projects Authority contract)
   - DOM element: Raw `<img>` with `object-cover`, responsive grid spans
   - Evidence: Lines 195-197 in page.tsx resolve through Projects Authority

**NOT REPLACEABLE:**
- WorkshopAtmosphere particles (purely decorative overlay)
- BlueprintGrid backgrounds (CSS pattern, not image)
- Gradient overlays (CSS, not image)
- Icon components (SVG, not image)
- Trust strip statistics (text, not image)
- Review card text (text, not image)
- Newsletter signup (form, not image)

## About Page (/about)

**REPLACEABLE:**
1. **About Owner Portrait**
   - Component: `src/app/about/page.tsx` (lines 48-50)
   - DOM: `<Image>` with `fill` prop inside `<div className="relative aspect-[4/3]">`
   - Source: `ownerSrc` from `getOwnerPortrait()` → `getMediaById()` → `variants.web/original`
   - Authority: Brand Authority (`brand.v1.json` → `ownerPortrait.mediaId`)
   - Current media ID: `brand-portrait`
   - Semantic identity: `about.ownerPortrait` (Brand Authority contract)
   - DOM element: Aspect-ratio constrained fill image with `object-cover`
   - Evidence: Lines 20-22 in about/page.tsx resolve through Brand Authority

**NOT REPLACEABLE:**
- Logo (hardcoded `/brand/logo.png`, no Brand Authority mediaId assigned)
- City cards (text-only with CSS backgrounds)

## Project Pages (/projects/[slug])

**REPLACEABLE:**
1. **Project Hero Background**
   - Component: `src/components/project-spotlight.tsx` (lines 158-166)
   - DOM: `<Image>` with `fill` prop, `opacity-30`, background layer
   - Source: `project.media.hero` → `getMediaById()` → `variants.web/original`
   - Authority: Projects Authority (`projects.v1.json` → `project.media.hero`)
   - Current media ID: Varies per project
   - Semantic identity: `project.{id}.hero` (Projects Authority contract)
   - DOM element: Absolutely positioned fill image with low opacity
   - Evidence: Lines 38-41 in project-spotlight.tsx resolve through Projects Authority

2. **Project Gallery Images** (variable count)
   - Component: `src/components/project-spotlight.tsx` (lines 209-232)
   - DOM: `<Image>` with `fill` prop inside `<figure>` with `aspect-[4/3]`
   - Source: `project.media.gallery[]` → `getMediaById()` → `variants.web/original`
   - Authority: Projects Authority (`projects.v1.json` → `project.media.gallery[]`)
   - Current media ID: Varies per project, indexed array
   - Semantic identity: `project.{id}.gallery[{index}]` (Projects Authority contract)
   - DOM element: Aspect-ratio constrained fill images with `object-cover`, clickable for lightbox
   - Evidence: Lines 44-47 in project-spotlight.tsx resolve through Projects Authority

3. **Project Photos Section** (project page bottom gallery)
   - Component: `src/components/project-photos.tsx` (lines 52-83)
   - DOM: `<Image>` with `fill` prop inside `<button>` with `aspect-[4/3]`
   - Source: `project.media.gallery[]` → `getMediaById()` → `variants.web/original`
   - Authority: Projects Authority (`projects.v1.json` → `project.media.gallery[]`)
   - Current media ID: Varies per project, indexed array
   - Semantic identity: `project.{id}.gallery[{index}]` (Projects Authority contract)
   - DOM element: Aspect-ratio constrained fill images with `object-cover`, clickable for lightbox
   - Evidence: Lines 51-54 in projects/[slug]/page.tsx resolve through Projects Authority

**NOT REPLACEABLE:**
- Material tags (text pills, not images)
- Review text (text, not image)

## Service Pages (/services/[slug])

**REPLACEABLE:**
1. **Service Featured Project Before/After**
   - Component: `src/components/before-after-slider.tsx` (lines 108-131)
   - DOM: Two `<Image>` elements with `fill` prop in slider
   - Source: `project.media.before` and `project.media.after` → `getMediaById()` → `variants.original/webp/avif`
   - Authority: Projects Authority (`projects.v1.json` → `project.media.before/after`)
   - Current media ID: Varies per featured project
   - Semantic identity: `project.{id}.before` and `project.{id}.after` (Projects Authority contract)
   - DOM element: Clipped images in draggable slider, `object-cover`
   - Evidence: Lines 52-53 in before-after-slider.tsx resolve through Projects Authority

2. **Service Project Gallery Images** (masonry layout)
   - Component: `src/app/services/[slug]/page.tsx` (lines 126-133)
   - DOM: `<Image>` with `fill` prop inside `<div>` with `aspect-[4/3]`
   - Source: `project.media.hero` → `getMediaById()` → `variants.web/original`
   - Authority: Projects Authority (`projects.v1.json` → `project.media.hero`)
   - Current media ID: Varies per project in service gallery
   - Semantic identity: `project.{id}.hero` (Projects Authority contract)
   - DOM element: Aspect-ratio constrained fill images with `object-cover`
   - Evidence: Lines 120-121 in services/[slug]/page.tsx resolve through Projects Authority

**NOT REPLACEABLE:**
- Service hero text (text, not image)
- Related service cards (fallback to component, same analysis as homepage service cards)

## Our Work Page (/our-work)

**REPLACEABLE:**
1. **Featured Transformations Before/After Sliders** (up to 4)
   - Component: `src/app/our-work/OurWorkClient.tsx` (lines 66-71)
   - DOM: BeforeAfterSlider component (see above)
   - Source: `project.media.before/after` → Projects Authority
   - Authority: Projects Authority
   - Current media ID: Varies per featured project
   - Semantic identity: `project.{id}.before/after` (Projects Authority contract)
   - Evidence: Same as service page before/after

2. **Recent Projects Hero Images** (grid of project cards)
   - Component: `src/app/our-work/OurWorkClient.tsx` (lines 101-107)
   - DOM: `<Image>` with `fill` prop inside `<div>` with `aspect-[16/9]`
   - Source: `project.media.hero` → `getMediaById()` → `variants.web/original`
   - Authority: Projects Authority
   - Current media ID: Varies per project
   - Semantic identity: `project.{id}.hero` (Projects Authority contract)
   - DOM element: Aspect-ratio constrained fill image with `object-cover`
   - Evidence: Lines 87-89 in OurWorkClient.tsx resolve through Projects Authority

3. **Complete Archive Gallery Images** (masonry grid)
   - Component: `src/app/our-work/OurWorkClient.tsx` (lines 175-180)
   - DOM: Raw `<img>` (not next/image) inside `<button>` with `aspect-[4/3]`
   - Source: `project.media.gallery[]` → `getMediaById()` → `variants.web/original`
   - Authority: Projects Authority
   - Current media ID: Varies per project gallery
   - Semantic identity: `project.{id}.gallery[{index}]` (Projects Authority contract)
   - DOM element: Raw `<img>` with `object-cover`, clickable for lightbox
   - Evidence: Lines 144-147 in OurWorkClient.tsx resolve through Projects Authority

**NOT REPLACEABLE:**
- Hero section text (text, not image)
- BlueprintGrid background (CSS pattern)

## Summary of Replaceable Slots

**Total REPLACEABLE slots:** 5 semantic categories with variable counts
1. Homepage hero (1) - Brand Authority
2. Owner portrait (2 instances: homepage + about) - Brand Authority
3. Service card images (variable) - Indirect via Projects Authority
4. Project heroes (variable) - Projects Authority
5. Project galleries (variable arrays) - Projects Authority
6. Before/after pairs (variable) - Projects Authority

**NOT REPLACEABLE:** Decorative elements, text content, icons, CSS patterns

# 2. SLOT → DOM MAPPING

| Route | Component | DOM Element | Current Source | Semantic Slot | Authority | Media ID | Replaceable | Evidence |
|------|-----------|-------------|----------------|---------------|-----------|----------|-------------|----------|
| / | page.tsx | `<Image fill>` inside hero section | heroSrc from getHomepageHero() | homepage.hero | Brand Authority | brand-hero | REPLACEABLE | Lines 56-59 page.tsx |
| / | page.tsx | `<Image fill>` inside owner section | ownerSrc from getOwnerPortrait() | about.ownerPortrait | Brand Authority | brand-portrait | REPLACEABLE | Lines 50-52 page.tsx |
| / | service-card.tsx | `<Image fill>` inside PhotoMount | getFeaturedServiceMedia() | homepage.services.{slug}.hero | Indirect (Projects→Media) | Variable | REPLACEABLE | Lines 23-25 service-card.tsx |
| / | page.tsx | `<img>` raw in featured projects grid | project.media.hero | project.{id}.hero | Projects Authority | Variable | REPLACEABLE | Lines 195-197 page.tsx |
| /about | about/page.tsx | `<Image fill>` inside owner section | ownerSrc from getOwnerPortrait() | about.ownerPortrait | Brand Authority | brand-portrait | REPLACEABLE | Lines 20-22 about/page.tsx |
| /projects/[slug] | project-spotlight.tsx | `<Image fill>` background layer | project.media.hero | project.{id}.hero | Projects Authority | Variable | REPLACEABLE | Lines 38-41 project-spotlight.tsx |
| /projects/[slug] | project-spotlight.tsx | `<Image fill>` in gallery figures | project.media.gallery[] | project.{id}.gallery[{index}] | Projects Authority | Variable | REPLACEABLE | Lines 44-47 project-spotlight.tsx |
| /projects/[slug] | project-photos.tsx | `<Image fill>` in buttons | project.media.gallery[] | project.{id}.gallery[{index}] | Projects Authority | Variable | REPLACEABLE | Lines 51-54 projects/[slug]/page.tsx |
| /services/[slug] | before-after-slider.tsx | Two `<Image fill>` in slider | project.media.before/after | project.{id}.before/after | Projects Authority | Variable | REPLACEABLE | Lines 52-53 before-after-slider.tsx |
| /services/[slug] | services/[slug]/page.tsx | `<Image fill>` in masonry | project.media.hero | project.{id}.hero | Projects Authority | Variable | REPLACEABLE | Lines 120-121 services/[slug]/page.tsx |
| /our-work | OurWorkClient.tsx | BeforeAfterSlider | project.media.before/after | project.{id}.before/after | Projects Authority | Variable | REPLACEABLE | Lines 66-71 OurWorkClient.tsx |
| /our-work | OurWorkClient.tsx | `<Image fill>` in project cards | project.media.hero | project.{id}.hero | Projects Authority | Variable | REPLACEABLE | Lines 87-89 OurWorkClient.tsx |
| /our-work | OurWorkClient.tsx | `<img>` raw in archive | project.media.gallery[] | project.{id}.gallery[{index}] | Projects Authority | Variable | REPLACEABLE | Lines 144-147 OurWorkClient.tsx |

**NO EXISTING SEMANTIC IDENTITY:** None - all replaceable slots have existing authority contracts

# 3. GEOMETRY CAPABILITY

**AVAILABLE NOW:**
- `getBoundingClientRect()` is available on all DOM elements
- Returns viewport-relative x, y, top, left, right, bottom, width, height
- Works on both `<Image>` (via parent container) and raw `<img>` elements
- `window.innerWidth`, `window.innerHeight` for viewport dimensions
- `window.scrollX`, `window.scrollY` for scroll position
- `devicePixelRatio` for pixel density
- Element dimensions via `element.offsetWidth`, `element.offsetHeight`

**GEOMETRY CONSTRAINTS:**
- `getBoundingClientRect()` values change with scrolling (viewport-relative)
- Must be re-measured on scroll events for accurate coordinates
- iframe-contained elements require coordinate transformation across iframe boundary
- Transformed elements (CSS transforms) may have incorrect rectangle values without additional matrix calculations

**NOT AVAILABLE:**
- Persistent stored coordinates (not a technical limitation, but architectural choice)
- Cross-iframe direct DOM inspection (blocked by same-origin policy)
- Stable viewport-relative coordinates without scroll compensation

**REQUIRES FUTURE FOUNDATION:**
- Coordinate transformation across iframe boundary (iframe rectangle + content rectangle + scroll state)
- Scroll event listeners to invalidate cached coordinates
- ResizeObserver integration for detecting layout changes
- Origin validation for postMessage bridge if cross-origin

# 4. IFRAME BOUNDARY

**Current Workbench iframe configuration:**
- Source: `https://happy-place-platform.vercel.app{selectedPage}` (line 261 in workbench/media/page.tsx)
- Sandbox: `allow-same-origin allow-scripts` (line 264)

**Origin relationship:**
- **CROSS-ORIGIN**: Workbench at localhost/happy-place-platform.vercel.app vs production Vercel domain
- Parent code CANNOT directly access iframe contentDocument due to same-origin policy
- Direct DOM inspection from parent to iframe is BLOCKED

**Existing postMessage usage:**
- **Direction:** iframe → parent (website to Workbench)
- **Messages:**
  - `SLOT_REGISTER` (line 62-65 in slot-registry.ts) - FUNCTIONAL
  - `SLOT_UNREGISTER` (line 76-79 in slot-registry.ts) - FUNCTIONAL
  - `SLOT_CLICK` (line 91-94 in visual-slot.tsx) - STRUCTURALLY PRESENT BUT UNREACHABLE
- **Origin check:** Uses `"*"` as target (line 65, 79 in slot-registry.ts; line 94 in visual-slot.tsx)
- **Source check:** No explicit source validation in current implementation

**CRITICAL FINDING: SLOT_CLICK is unreachable under current iframe architecture**

**The contradiction:**
- VisualSlot gates click behavior on: `window.location.pathname.startsWith('/workbench')` (line 77 in visual-slot.tsx)
- Workbench iframe loads: `https://happy-place-platform.vercel.app{selectedPage}` (e.g., `/`)
- Inside iframe: `pathname === '/'`, NOT `/workbench/*`
- Therefore: `isWorkbenchMode === false` inside iframe
- Result: SLOT_CLICK branch never executes, even though code path exists

**SlotRegistry has different "workbench mode" logic:**
- SlotRegistry sends registration when: `!this.isWorkbenchMode && window.parent !== window` (line 59 in slot-registry.ts)
- Inside iframe: `isWorkbenchMode = false`, `window.parent !== window = true`
- Therefore: SLOT_REGISTER works even though SLOT_CLICK does not

**Architectural consequence:**
- Registration bridge: functional
- Click-selection bridge: structurally present but functionally unreachable
- Two components disagree on what "workbench mode" means
- Current architecture cannot distinguish: "Am I in Workbench?" vs "Am I embedded in Workbench preview?"

**Technical possibility:**
- Controlled postMessage is the ONLY viable communication bridge
- Parent cannot directly query iframe DOM
- Parent can send messages TO iframe via `iframe.contentWindow.postMessage()`
- Iframe can respond with slot geometry measurements
- Current implementation only sends slot registration, not geometry
- Current implementation cannot send slot clicks due to context detection bug

**Security concern:**
- Current postMessage uses `"*"` origin (unrestricted) - OUTBOUND security issue
- Should validate origin to expected Workbench domain when sending
- Should validate origin on received messages - INBOUND security issue
- Should validate source window object on received messages
- No navigation involved in current setup
- **CRITICAL:** Any window capable of delivering messages can inject SLOT_REGISTER/SLOT_UNREGISTER/SLOT_CLICK messages
- Bridge requires explicit trust boundary before becoming bidirectional or geometry-authoritative

# 5. SCROLLING FORENSICS

**Lenis configuration:**
- File: `src/components/lenis-provider.tsx`
- Settings (lines 34-39):
  - `lerp: 0.25` (higher than default 0.1 for snappier feel)
  - `wheelMultiplier: 1.0` (neutral)
  - `touchMultiplier: 1.0` (neutral)
  - `duration: 0.8` (reduced from 1.2)

**Scroll ownership:**
- **Page scroll:** Lenis instance owns page scrolling (smooth scroll)
- **Workbench scroll:** Lenis does NOT initialize in Workbench mode (only pathname check)
- **Preview scroll:** iframe has native scrolling (Lenis runs inside iframe content)
- **Gallery scroll:** Workbench media panel uses native overflow-y (line 269 in workbench/media/page.tsx)

**Trackpad/two-finger scrolling problem:**
- **Root cause:** Lenis intercepts all wheel events
- **Issue:** Touchpad momentum scroll conflicts with Lenis momentum simulation
- **Evidence:** Despite neutral multipliers (1.0), Lenis duration (0.8s) creates competing momentum
- **Observed behavior:** Trackpad feels "broken" or "stopping" because Lenis simulates momentum while touchpad already has momentum

**Scroll containers:**
- Website body: Lenis-controlled smooth scroll
- Workbench media panel: Native CSS overflow-y-auto (line 269)
- Workbench preview iframe: Native iframe scrolling
- Project gallery: Native scrolling within containers

**No additional wheel handlers found** beyond Lenis

**No preventDefault on scroll** - Lenis handles this internally

**Overscroll behavior:** Not explicitly configured (uses browser default)

# 6. RESPONSIVE GEOMETRY

**Investigated breakpoints:**
- Desktop (1280px+): 4-column grids, full-width hero
- Tablet (768px-1279px): 2-column grids, reduced spacing
- Mobile (<768px): 1-column grids, stacked layouts

**Slot geometry changes:**

**Homepage hero:**
- Always `fill` (100vw width, 75-88svh height)
- Aspect ratio preserved via `object-cover`
- No layout change on resize
- Container dimensions change, but image fills completely

**Service cards:**
- Fixed aspect ratio `aspect-[4/3]` (PhotoMount)
- Grid: 1 col (mobile) → 3 cols (desktop)
- Image container aspect ratio STABLE
- Slot moves position but maintains dimensions

**Project cards:**
- Hero: `aspect-[16/9]` (OurWorkClient) or `aspect-[4/3]` (spotlight)
- Gallery: `aspect-[4/3]` (consistent)
- Grid spans change on breakpoints
- Individual slot aspect ratio STABLE

**Owner portrait:**
- Fixed aspect ratio `aspect-[4/3]`
- Grid: 1 col (mobile) → 2 cols (desktop)
- Container aspect ratio STABLE

**Before/after slider:**
- Fixed aspect ratio `aspect-[4/3]`
- Grid: 1 col (mobile) → 2 cols (desktop)
- Container aspect ratio STABLE

**Key finding:** All replaceable slots have STABLE aspect ratios (4:3 or 16:9)
- Source replacement does NOT change layout dimensions
- `object-cover` crops to fit, not layout-affecting
- Slot position changes with grid, but slot geometry is predictable

**DOM structure changes:** None observed across breakpoints - grid columns change, but individual element structure remains identical

# 7. IMAGE FIT BEHAVIOR

**Homepage hero:**
- DOM: `<Image fill className="object-cover">`
- Container: Full-width section, min-height 75-88svh
- Object-fit: cover (crops to fill, centers content)
- Object-position: default (center)
- Aspect ratio: None (fill container)
- Crop behavior: Crops top/bottom or sides depending on image vs container aspect
- Source replacement: Does NOT change layout, only displayed content
- Lazy loading: false (priority)
- Preload: true (priority)

**Service cards:**
- DOM: `<Image fill className="object-cover">`
- Container: `aspect-[4/3]` PhotoMount
- Object-fit: cover
- Aspect ratio: Fixed 4:3 container
- Crop behavior: Crops to fit 4:3, centers
- Source replacement: Does NOT change layout
- Lazy loading: implicit via Next.js
- Preload: false

**Project heroes:**
- DOM: Raw `<img className="object-cover">` (homepage grid) or `<Image fill object-cover>` (project pages)
- Container: `aspect-[16/9]` or `aspect-[4/3]`
- Object-fit: cover
- Aspect ratio: Fixed container
- Crop behavior: Crops to fit, centers
- Source replacement: Does NOT change layout
- Lazy loading: conditional (eager for first, lazy for others)

**Project galleries:**
- DOM: `<Image fill className="object-cover">` or raw `<img object-cover>`
- Container: `aspect-[4/3]` consistent
- Object-fit: cover
- Aspect ratio: Fixed 4:3
- Crop behavior: Crops to fit, centers
- Source replacement: Does NOT change layout
- Lazy loading: lazy (all gallery images)

**Before/after slider:**
- DOM: Two `<Image fill>` elements
- Container: `aspect-[4/3]`
- Object-fit: cover
- Before image: Additional filter (grayscale, brightness, sepia)
- Aspect ratio: Fixed 4:3
- Crop behavior: Crops to fit, centers
- Source replacement: Does NOT change layout
- Lazy loading: false (component-level)

**Owner portrait:**
- DOM: `<Image fill className="object-cover">`
- Container: `aspect-[4/3]`
- Object-fit: cover
- Aspect ratio: Fixed 4:3
- Crop behavior: Crops to fit, centers
- Source replacement: Does NOT change layout
- Lazy loading: implicit

**Key finding:** All replaceable images use `object-cover` in fixed-aspect containers
- Source dimensions do NOT affect layout
- Replacing source preserves visual geometry
- Crop is deterministic based on container aspect ratio

# 8. EXISTING VARIANT PIPELINE

**Pipeline file:** `scripts/image-pipeline.mjs`

**Input:**
- Source images from `photo-intake/` directories
- Manual invocation via `npm run images` (AGENTS.md rule)
- No incremental/single-asset processing in current implementation

**Generated variants:**
- `original`: Source image
- `web`: WebP at responsive widths (480, 768, 1080, 1920px)
- `webp`: Duplicate of web (both keys exist, same file)
- `avif`: AVIF at same responsive widths
- `thumbnail`: 480px width WebP
- `blur`: 16px width WebP for placeholder

**Processing branches:**
1. Main filesystem/project processing (line 467+)
2. Secondary Drive/folder path (line 748+)

**Both branches include:**
- `autoOrient()` - EXIF orientation normalization
- `toColourspace('srgb')` - Color profile normalization
- Responsive AVIF/WebP generation with `withoutEnlargement: true`
- Thumbnail generation with `withoutEnlargement: true`
- Blur generation with `withoutEnlargement: true`

**Incremental processing capability:**
- NOT DETERMINABLE FROM CURRENT ARCHITECTURE
- Pipeline appears to process entire directories
- No evidence of single-asset trigger mechanism
- No existing API endpoint for incremental processing

**Archive behavior:**
- Moves originals to `photo-intake/_archive/`
- Generates variants in `public/images/projects/`
- Updates `media.v1.json` with new records

**Stable identity generation:**
- Uses Drive IDs when available
- Falls back to filename-based IDs
- Generates deterministic variant paths

**Processing state:**
- No in-memory queue visible
- No job mechanism visible
- Batch processing only

**Error state:**
- Logs errors, increments stats.errors
- Preflight validation fails skip source
- Derivative validation logs but does not block publication

**Existing API endpoints:**
- `/api/admin/brand/hero` - Brand Authority mutation
- `/api/admin/brand/portrait` - Brand Authority mutation
- No variant generation API endpoints found

**Incremental processing conclusion:**
- REQUIRES FUTURE FOUNDATION
- Current pipeline is batch-only
- Would need new API endpoint or CLI flag for single-asset processing

# 9. MISSING FOUNDATION

**Genuinely missing pieces:**

1. **Iframe coordinate transformation bridge**
   - Parent cannot directly measure iframe content geometry due to cross-origin
   - Need postMessage-based geometry reporting from iframe to parent
   - Need coordinate math: iframe rectangle + content rectangle + scroll state → parent viewport coordinates

2. **Project Authority mutation endpoints**
   - Brand Authority has `/api/admin/brand/hero` and `/api/admin/brand/portrait`
   - Projects Authority has NO mutation endpoints for before/after/gallery/hero
   - Workbench media page has alerts acknowledging this (lines 159-163 in workbench/media/page.tsx)

3. **Service Authority write boundary**
   - Service cards derive media from Projects Authority indirectly
   - No direct service.v1.json media assignment mechanism
   - Would need new authority structure or Projects Authority expansion

4. **Slot geometry instrumentation**
   - Current VisualSlot only registers identity, not geometry
   - No ResizeObserver integration
   - No scroll-aware coordinate invalidation
   - No iframe-to-parent geometry postMessage channel

5. **Incremental variant processing**
   - Pipeline is batch-only
   - No single-asset API endpoint
   - Workbench cannot trigger reprocessing of individual assets

6. **postMessage origin validation**
   - Current implementation uses `"*"` target (unrestricted)
   - No origin check on received messages
   - No source window validation

**NOT missing (already exists):**
- Brand Authority mutation endpoints (hero, portrait)
- Media Authority (canonical identity, variants)
- Projects Authority (structure exists, mutation endpoints missing)
- Slot identity registration (VisualSlot, slot-registry)
- Authority ownership model
- DOM measurement primitives (getBoundingClientRect)
- Responsive layout (stable aspect ratios)

# 10. ONE SMALLEST NEXT MUTATION

**REVISED BASED ON CRITICAL FINDING:**

**Purpose:** Establish explicit Workbench-preview context for iframe to enable SLOT_CLICK reachability

**Foundation dependency order:**
- FOUNDATION 0: Establish iframe preview identity (THIS MUTATION)
- FOUNDATION 1: Secure the bridge (origin/source validation)
- FOUNDATION 2: Make slot interaction actually reachable (prove SLOT_CLICK works)
- FOUNDATION 3: Add runtime geometry
- FOUNDATION 4: Add resize/scroll invalidation
- FOUNDATION 5: Hit testing
- FOUNDATION 6: Drag/drop mutation

**Why this is now the smallest foundation:**
- SLOT_CLICK is structurally present but unreachable due to context detection bug
- Cannot add geometry until basic slot interaction works
- Cannot add hit testing until geometry exists
- Cannot add drag/drop until hit testing works
- Context detection is logically prior to all interaction mechanics

**Architectural problem to solve:**
- Current code uses `window.location.pathname.startsWith('/workbench')` to detect Workbench mode
- This only answers: "Is this document on a /workbench route?"
- Does NOT answer: "Am I embedded inside Workbench preview?"
- iframe loads production routes (/, /about, etc.) so pathname test fails
- Need explicit WORKBENCH_PREVIEW context separate from route pathname

**Acceptance test (DO NOT EXECUTE):**
Before touching geometry, demonstrate:
- Production `/`: no Workbench interaction, no visual changes, no geometry traffic
- Workbench iframe `/`: SLOT_REGISTER ✓, SLOT_CLICK ✓
- Workbench parent: receives both ✓

**Implementation approach (DO NOT EXECUTE):**
1. Establish explicit Workbench-preview handshake (e.g., postMessage on iframe load)
2. VisualSlot distinguishes three contexts:
   - Public website (no Workbench behavior)
   - Workbench iframe (interactive behavior enabled)
   - Workbench application (parent-side logic)
3. Add origin validation to postMessage (replace `"*"` with specific origin)
4. Add source validation on received messages
5. Prove SLOT_CLICK works before adding geometry

**Files likely involved:**
- `src/components/visual-slot.tsx` - Context detection logic
- `src/lib/slot-registry.ts` - Context-aware registration
- `src/app/workbench/media/page.tsx` - Establish preview handshake
- `src/app/workbench/preview/[...path]/page.tsx` - Receive preview context

**Blast radius:**
- Limited to Workbench preview context detection
- Does not affect production website behavior
- Does not modify authority contracts
- Does not add geometry (yet)
- Only enables existing unreachable code path

**Rollback:**
- Remove explicit preview context detection
- Revert to pathname-based detection
- SLOT_CLICK becomes unreachable again (current state)

**Verification:**
- Production website unaffected (no Workbench interaction)
- Workbench iframe recognizes preview context
- SLOT_CLICK messages successfully reach parent
- Origin validation prevents unauthorized message injection
- Source validation prevents message spoofing

**CRITICAL SECURITY REQUIREMENT:**
Before making bridge bidirectional or geometry-authoritative:
- Establish expected Workbench origin for outbound messages
- Validate event.origin on inbound messages
- Validate event.source === expected iframe window
- Only accept known message types (SLOT_REGISTER, SLOT_UNREGISTER, SLOT_CLICK)

**DO NOT proceed to geometry until:**
- Preview context is explicitly established
- SLOT_CLICK is functional
- Bridge is secured with origin/source validation
