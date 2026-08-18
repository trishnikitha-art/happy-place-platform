# READ-ONLY TWO-PANEL DIRECT MEDIA MAPPING ARCHITECTURE PLAN

**Date**: Aug. 15, 2026  
**Directive**: READ-ONLY investigation of actual website media slots for two-panel direct mapping  
**Repository Evidence**: Current DEPLOY branch implementation vs MAIN@5ba201cd reference  
**ABSOLUTE RULE**: NO MUTATIONS AUTHORIZED - Read-only investigation only

---

## 1. CONTEXT RECONCILIATION

### Previous Plans and Reports
**Review of existing documentation**:
- `TWO_PANEL_DIRECT_MAPPING_PLAN.md` - Proposed three-column layout with drop zones, coordinate emission, variant generation API
- `WORKBENCH_ORDERING_OVERLAY_IMPLEMENTATION_REPORT.md` - Documented ordering overlay with localStorage persistence
- `WORKBENCH_DUPLICATE_REMOVAL_SCROLLING_FIX_REPORT.md` - Documented Lenis disabling for native scrolling
- `CANONICAL_PAINTING_IDENTITY_VERIFICATION.md` - Painting asset identity verification
- `GLOBAL_MEDIA_SEMANTIC_RECONCILIATION.md` - Global media reconciliation
- Various forensic reports on MAIN vs DEPLOY architecture

**Key finding**: Previous plans assumed VisualSlot was already integrated into website components. Repository evidence shows this is **NOT** the case.

### Repository Evidence vs Previous Assumptions

**Previous Assumption**: VisualSlot components are already wrapping website images  
**Repository Evidence**: VisualSlot exists in `src/components/visual-slot.tsx` but is **NOT imported or used** in any main website components

**Previous Assumption**: Slot registry already receives slot coordinates  
**Repository Evidence**: Slot registry receives slot metadata (id, route, page, section, slotName, currentMediaId, component) but **NO geometry** (no bounding rectangles, no coordinates)

**Previous Assumption**: Image pipeline can be triggered per-photo  
**Repository Evidence**: Image pipeline (`scripts/image-pipeline.mjs`) is a batch operation via `npm run images` - **NO per-photo API endpoint exists**

**Previous Assumption**: Lenis was the primary scrolling issue  
**Repository Evidence**: Lenis is disabled in Workbench (`window.location.pathname.startsWith('/workbench')`) but touchpad scrolling still requires specific CSS fixes

---

## 2. CURRENT TWO-PANEL STATE

### Existing Workbench Architecture

**Current Implementation** (`src/app/workbench/media/page.tsx`):
```
┌─────────────────────────────────────────────────────────────┐
│ WORKBENCH TOOLBAR                                           │
│ [Revert] [Reset to MAIN] [Save Ordering] [Reload]           │
└─────────────────────────────────────────────────────────────┘
┌──────────────┬──────────────────┬───────────────────────────┐
│ LEFT        │ MIDDLE            │ RIGHT                    │
│ Preview     │ Photo Grid        │ Slot List                 │
│ (iframe)    │ (25 photos)      │ (current mappings)       │
│             │                  │                           │
│ ┌─────────┐ │ ┌────────────┐   │ ┌─────────────────────┐ │
│ │ Website │ │ │ Photo 1    │   │ │ Hero slot           │ │
│ │ page    │ │ │ Photo 2    │   │ │ Before slot         │ │
│ │ renders │ │ │ Photo 3    │   │ │ After slot          │ │
│ │         │ │ │ ...        │   │ │ Gallery slots        │ │
│ └─────────┘ │ └────────────┘   │ └─────────────────────┘ │
│             │                  │                           │
│ Scrollable │ Scrollable      │ Scrollable                │
└──────────────┴──────────────────┴───────────────────────────┘
```

**Technical Details**:
- **Preview**: iframe to `https://happy-place-platform.vercel.app` (external production site)
- **Photo Grid**: 25 canonical photos from `media.v1.json` (duplicate excluded)
- **Slot List**: Registered slots from `slotRegistry` (no coordinates)
- **Scrolling**: Lenis disabled, native touchpad via `touch-pan-y` + `overscrollBehavior: contain`
- **Persistence**: localStorage for ordering overlay

### Preview Mechanism

**Current Implementation** (`src/app/workbench/media/page.tsx:454-457`):
```typescript
<iframe
  src={`https://happy-place-platform.vercel.app${state.selectedPage}`}
  className="w-full h-full border-0"
  title="Website Preview"
  sandbox="allow-same-origin allow-scripts"
/>
```

**Preview Route** (`src/app/workbench/preview/[...path]/page.tsx`):
- Renders actual main@5ba201cd components via dynamic import
- Routes: `/`, `/about`, `/services`, `/our-work`, `/reviews`, `/estimate`
- No VisualSlot integration - renders production components directly

### Slot Registry Current State

**Interface** (`src/lib/slot-registry.ts:17-26`):
```typescript
export interface RegisteredSlot {
  id: string;
  route: string;
  page: string;
  section: string;
  slotName: string;
  currentMediaId: string | null;
  element: HTMLElement | null;  // Set in Workbench, null in iframe
  component: string;
}
```

**Communication** (`src/lib/slot-registry.ts:43-53`):
- Workbench mode: Listens for `SLOT_REGISTER`, `SLOT_UNREGISTER`, `SLOT_CLICK` postMessage
- Regular mode: Sends `SLOT_REGISTER` to parent when in iframe
- **Missing**: Coordinate emission (no bounding rectangle, no pixel positions)

**Critical Gap**: Slot registry stores **architectural identity** (id, route, section, slotName) but **NO presentation geometry** (no rect, no coordinates).

---

## 3. REAL WEBSITE MEDIA SLOT INVENTORY

### ACTUAL IMAGE LOCATIONS (Main Website Components)

**Analysis of main website components** - These are the REAL image slots that exist in production:

| Page | Component | Slot ID | Current Media | Render Element | VisualSlot Used? | Geometry Available? | Evidence |
|------|-----------|---------|---------------|----------------|------------------|-------------------|----------|
| **Homepage** | page.tsx:67-75 | homepage-hero | `/images/hero-background-enhanced.jpg` (hardcoded) | `Image` with `fill` | **NO** | **NO** | Hardcoded path, no VisualSlot |
| **Homepage** | ServiceCard (multiple) | service-card-hero-* | `getFeaturedServiceMedia(service.slug)` | `Image` with `fill` | **NO** | **NO** | Intent-based lookup, no VisualSlot |
| **Homepage** | BeforeAfterSlider | homepage-featured-before/after | `project.media.before/after` | `Image` in slider | **NO** | **NO** | Project media, no VisualSlot |
| **About** | page.tsx:48-50 | about-owner-portrait | `getOwnerPortrait()` → `brand-portrait` | `Image` with `fill` | **NO** | **NO** | Brand authority, no VisualSlot |
| **About** | page.tsx:33 | about-logo | `/brand/logo.png` (hardcoded) | `Image` with fixed dimensions | **NO** | **NO** | Hardcoded path, no VisualSlot |
| **Services** | ServiceCard (multiple) | service-card-hero-* | `getFeaturedServiceMedia(service.slug)` | `Image` with `fill` | **NO** | **NO** | Intent-based lookup, no VisualSlot |
| **Services** | BeforeAfterSlider | service-featured-before/after | `project.media.before/after` | `Image` in slider | **NO** | **NO** | Project media, no VisualSlot |
| **Services** | Project Gallery | service-project-hero-* | `project.media.hero` | `Image` with `fill` | **NO** | **NO** | Project media, no VisualSlot |
| **Our Work** | BeforeAfterSlider (multiple) | our-work-featured-before/after | `project.media.before/after` | `Image` in slider | **NO** | **NO** | Project media, no VisualSlot |
| **Our Work** | Project Gallery | our-work-project-hero-* | `project.media.hero` | `Image` with `fill` | **NO** | **NO** | Project media, no VisualSlot |
| **Projects** | ProjectSpotlight | project-hero | `project.media.hero` | `Image` with `fill` | **NO** | **NO** | Project media, no VisualSlot |
| **Projects** | ProjectPhotos | project-gallery-* | `project.media.gallery[]` | `Image` in grid | **NO** | **NO** | Project media, no VisualSlot |

### CRITICAL FINDING: ZERO VISUALSLOTS IN PRODUCTION

**Evidence**: `grep` for VisualSlot imports shows only:
- `src/app/workbench/media/page.tsx` (imports slotRegistry)
- `src/components/visual-slot.tsx` (the component itself)

**Conclusion**: VisualSlot component **exists but is NOT used** in any production website components. All production images use direct `Image` components with:
- Hardcoded paths (homepage hero, about logo)
- Intent-based media lookups (service cards, project galleries)
- Project media references (before/after sliders, project photos)

### Media Authority Chain

**Current Authority Flow**:
```
media.v1.json (26 canonical photos)
    ↓
lib/media.ts (intent-based adapters)
    ↓
getFeaturedServiceMedia() / getProjectMedia() / getMediaById()
    ↓
Components (ServiceCard, BeforeAfterSlider, ProjectSpotlight, etc.)
    ↓
Image components with variants.web / variants.original
```

**Key Insight**: The authority chain is **architectural identity** (mediaId, projectId, roles) but **NO slot identity**. Components know what media they need by intent (getFeaturedServiceMedia, getProjectHero) but don't register themselves as slots.

---

## 4. PREVIEW GEOMETRY / SLOT-ID MODEL

### Current Model: Architectural Identity Only

**What EXISTS today**:
- Slot registry stores: `{ id, route, page, section, slotName, currentMediaId, component }`
- **Missing**: `{ rect, viewport, scrollOffset, responsiveBreakpoint, timestamp }`

**What DOES NOT exist**:
- No coordinate emission from VisualSlot
- No bounding rectangle calculation
- No viewport position tracking
- No scroll offset calculation
- No responsive breakpoint awareness
- No timestamp for geometry updates

### Proposed Geometry Model (NOT IMPLEMENTED)

**Required Addition to RegisteredSlot**:
```typescript
export interface RegisteredSlot {
  id: string;
  route: string;
  page: string;
  section: string;
  slotName: string;
  currentMediaId: string | null;
  element: HTMLElement | null;
  component: string;
  
  // MISSING - Proposed addition:
  rect?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  coordinateSpace?: 'viewport' | 'document' | 'preview';
  viewport?: {
    width: number;
    height: number;
    scrollX: number;
    scrollY: number;
  };
  timestamp?: number;
}
```

### Coordinate System Challenges

**iframe Communication**:
- Preview renders in iframe (different origin)
- postMessage can send data but **NOT DOM elements**
- `element: HTMLElement` is set to `null` when crossing iframe boundary
- Current slot registry explicitly removes element: `const { element, ...slotWithoutElement } = slot;`

**Solution Options**:
1. **VisualSlot emits coordinates** (preferred): Component calculates `getBoundingClientRect()` and sends `{ id, rect, viewport }` via postMessage
2. **Workbench measures iframe content**: Workbench uses `iframe.contentWindow` to query DOM (requires same-origin or postMessage-based query)
3. **Coordinate-free overlay**: Use CSS-only overlays with percentage-based positioning

**Current Reality**: None of these are implemented. Slot registry has **no geometry**.

---

## 5. RESPONSIVE SLOT MODEL

### Slot Identity vs Presentation Geometry

**Stable Slot Identity** (what exists):
- `slotId = "homepage-hero"` (architectural identity)
- `slotId = "service-card-hero-fencing"` (architectural identity)
- `slotId = "project-hero-fences-001"` (architectural identity)

**Variable Presentation Geometry** (what does NOT exist):
- Desktop: `rect = { left: 100, top: 200, width: 1200, height: 600 }`
- Tablet: `rect = { left: 50, top: 180, width: 800, height: 400 }`
- Mobile: `rect = { left: 20, top: 150, width: 360, height: 270 }`

### Responsive Behavior Analysis

**Current Component Behavior**:
- Homepage hero: `Image` with `fill` (100vw, responsive via `sizes`)
- Service cards: `aspect-[4/3]` container, responsive grid
- Before/after sliders: `aspect-[4/3]` container
- Project galleries: Responsive grid columns

**Key Insight**: Slot identity **IS stable** (same slotId across breakpoints) but geometry **changes significantly**.

### Desired Model

**Slot-centric approach** (not coordinate-centric):
```
slotId = "homepage-hero"
    ↓
[DESKTOP] rect = { left: 100, top: 200, width: 1200, height: 600 }
[TABLET]  rect = { left: 50, top: 180, width: 800, height: 400 }
[MOBILE]  rect = { left: 20, top: 150, width: 360, height: 270 }
```

**NOT**:
```
desktopHeroRect = { ... }
mobileHeroRect = { ... }
```

**Implementation Requirement**: Geometry must be **measured dynamically** from rendered preview, not stored as static data.

---

## 6. DIRECT DROP TARGET DESIGN

### Current Drop Mechanism

**Existing Implementation** (`src/app/workbench/media/page.tsx`):
```typescript
// Drag from right panel to slot list
handleDrop = (e: React.DragEvent, slot: RegisteredSlot) => {
  const assetId = e.dataTransfer.getData('text/plain');
  const asset = state.assets.find(a => a.id === assetId);
  if (asset) {
    setState(prev => ({ 
      ...prev, 
      pendingAssignment: { asset, slot },
      showConfirmDialog: true 
    }));
  }
};
```

**Current Flow**:
1. Drag photo from gallery
2. Drop on slot in right panel list
3. Confirmation dialog appears
4. Update slot assignment via API
5. Reload canonical data

### Proposed Direct Drop Mechanism

**Desired Flow**:
```
RIGHT PANEL (Photo Gallery)
    │
    │ drag
    ▼
LEFT PANEL (Website Preview)
    │
    │ drop on visual overlay zone
    ▼
Slot identified (slotId)
    │
    ├── Validate role compatibility
    │
    ├── Map photo → slot
    │
    ├── Trigger variant generation
    │
    └── Update preview when ready
```

### Drop Target Options

**Option A: Actual DOM Element**
- Target: The actual `<Image>` element in iframe
- Challenge: iframe boundary prevents direct DOM access
- Feasibility: **LOW** (requires same-origin or complex postMessage DOM query)

**Option B: Workbench Overlay Aligned to DOM Element**
- Target: Workbench-rendered overlay div positioned exactly over DOM element
- Challenge: Requires coordinate emission from VisualSlot
- Feasibility: **HIGH** (requires VisualSlot enhancement but technically straightforward)

**Option C: Existing VisualSlot Mechanism**
- Target: Use existing VisualSlot component
- Challenge: VisualSlot not used in production components
- Feasibility: **MEDIUM** (requires adding VisualSlot to all production components)

**Option D: CSS-only Percentage Overlays**
- Target: Predefined overlay zones using CSS percentages
- Challenge: Hardcoded to specific layouts, not adaptive
- Feasibility: **LOW** (brittle, requires manual maintenance)

**RECOMMENDATION**: **Option B** - Workbench overlay aligned to DOM element with coordinate emission from VisualSlot.

### Required VisualSlot Enhancement

**Add to src/components/visual-slot.tsx**:
```typescript
useEffect(() => {
  // Emit coordinates in workbench mode
  if (isWorkbenchMode && elementRef.current) {
    const rect = elementRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };
    
    window.parent.postMessage({
      type: 'SLOT_COORDINATES',
      payload: {
        id,
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        },
        viewport,
        coordinateSpace: 'viewport',
        timestamp: Date.now()
      }
    }, '*');
  }
}, [id, isWorkbenchMode]);
```

---

## 7. AUTOMATIC VARIANT PIPELINE

### Existing Image Pipeline

**Current Implementation** (`scripts/image-pipeline.mjs`):
- **Trigger**: Manual `npm run images` command
- **Scope**: Batch processing of entire `photo-intake/` directory
- **Output**: 
  - Archives originals to `photo-intake/_archive/`
  - Generates WebP + AVIF variants (responsive widths: 480, 768, 1080, 1600, 2000)
  - Generates thumbnails + blur placeholders
  - Writes `gallery.json` authority
- **NO per-photo API endpoint exists**

### Pipeline Capabilities

**What EXISTS**:
- Batch image processing
- WebP/AVIF generation
- Responsive width variants
- Thumbnail generation
- Blur placeholder generation
- EXIF metadata extraction (width/height)
- SHA-256 content hashing
- UUIDv5 stable ID generation

**What DOES NOT exist**:
- Per-photo API endpoint
- Queue processing
- Status tracking
- On-demand variant generation
- Progress callbacks

### Proposed Drop-to-Enhance Flow

**DESIRED**:
```
DROP PHOTO ON SLOT
    ↓
Validate role compatibility
    ↓
MAP PHOTO → SLOT (update working state)
    ↓
CALL /api/workbench/generate-variants
    ↓
Image pipeline processes single photo
    ↓
Generate WebP/AVIF/thumbnail/blur
    ↓
Update media.v1.json with new variants
    ↓
Preview uses best available variant
    ↓
FINAL variant replaces temporary preview
```

**REALITY**: Requires NEW API endpoint creation. Current pipeline is batch-only.

### Dependencies

**Missing Infrastructure**:
1. **API endpoint**: `/api/workbench/generate-variants` (must be created)
2. **Single-photo pipeline mode**: Image pipeline needs per-photo mode (currently batch-only)
3. **Status tracking**: Pipeline completion status (currently no tracking)
4. **Queue management**: Handle concurrent variant generation requests

**Alternative**: Use existing `npm run images` in background, but this is **not per-photo** and not **on-demand**.

---

## 8. TWO-PANEL SCROLL MODEL

### Previous Scrolling Investigation

**Previous Attempt** (from `WORKBENCH_DUPLICATE_REMOVAL_SCROLLING_FIX_REPORT.md`):
- Disabled Lenis in Workbench via `window.location.pathname.startsWith('/workbench')`
- Added `touch-pan-y` class to scroll containers
- Added `overscrollBehavior: contain` to prevent scroll chaining
- Applied to both Mapping and Ordering modes

**Current Implementation** (`src/components/lenis-provider.tsx:33-39`):
```typescript
const isWorkbench = window.location.pathname.startsWith('/workbench');

if (isWorkbench) {
  // Don't initialize Lenis in Workbench - use native scrolling
  return;
}
```

### Why Previous Fix May Be Insufficient

**Potential Issues**:
1. **Nested scroll areas**: iframe + parent page may have scroll conflict
2. **Event propagation**: iframe may intercept wheel events before parent
3. **Touchpad sensitivity**: Native scroll may still be jerky without proper configuration
4. **iframe sandbox restrictions**: `sandbox="allow-same-origin allow-scripts"` may limit scroll control

### Minimal Future Solution

**Hypothesis**: The correct solution is to **remove all custom scroll handling** and rely on native overflow scrolling.

**Required Changes**:
1. Ensure Lenis is disabled in Workbench (already done)
2. Ensure iframe has `allow-scripts` and `allow-same-origin` (already done)
3. Ensure containers have `overflow-y-auto` and proper height constraints
4. Remove any custom wheel/touch event handlers that might interfere
5. Use CSS `overscroll-behavior: contain` to prevent scroll chaining

**Verification**: Two-finger touchpad should work naturally without any JavaScript scroll intervention.

---

## 9. MEDIA ORDERING MODEL

### Current Ordering Implementation

**Existing Infrastructure**:
- `src/lib/workbench-ordering.ts` - Ordering adapter with localStorage persistence
- `src/config/workbench-ordering.v1.json` - Ordering overlay authority
- Save/Reset functionality already implemented
- Drag-and-drop reordering already implemented

### Integration with Right Panel

**Current Issue**: Ordering is separate from mapping (was separate panel)

**Proposed Integration**: Ordering should live **inside the same right-hand media panel** as mapping.

**Design**:
```
RIGHT PANEL (Media Gallery)
┌─────────────────────────────┐
│ [Search] [Filter]           │
├─────────────────────────────┤
│ [Photo 1] [Photo 2] [Photo 3]│
│ [Photo 4] [Photo 5] [Photo 6]│
│ ...                         │
│                             │
│ Drag to reorder within grid  │
│ Drag to preview to map      │
└─────────────────────────────┘
```

**Interaction Model**:
- **Within-panel drag**: Reorder photos (update Workbench ordering overlay)
- **Cross-panel drag**: Drag photo to preview slot (map to slot)
- **Save button**: Commit both ordering and mapping

**Implementation**: No changes to ordering infrastructure needed - just UI integration.

---

## 10. MAIN / WORKBENCH BOUNDARY

### Current Authority Separation

**MAIN Authorities** (immutable):
- `src/config/media.v1.json` - 26 canonical media records
- `src/config/projects.v1.json` - Project definitions with media references
- `src/config/services.v1.json` - Service definitions
- `src/config/brand.v1.json` - Brand assets (homepageHero, ownerPortrait)

**Workbench State** (mutable, temporary):
- `src/config/workbench-ordering.v1.json` - Ordering overlay
- `localStorage` - Saved ordering state
- `localStorage` - Checkpoint state

### Desired Future State

**Three-Tier Authority**:
```
MAIN (immutable baseline)
    ↓
WORKBENCH WORKING STATE (localStorage, temporary)
    ↓
EXPLICITLY SAVED / PROMOTED STATE (MAIN update requires explicit user action)
```

**Commit Workflow**:
1. Workbench maintains temporary mapping state in localStorage
2. User clicks "Save Mapping" → updates MAIN authorities
3. User clicks "Revert" → restores checkpoint from localStorage
4. MAIN never modified without explicit save

**Current Gap**: No mapping state exists yet (only ordering state exists).

---

## 11. TARGET TWO-PANEL ARCHITECTURE

### Final Architecture Diagram

```
                 WORKBENCH (Two-Panel Interface)


       ┌───────────────────────────┐
       │                           │
       │     LEFT: LIVE PREVIEW    │
       │                           │
       │   [iframe → production]   │
       │                           │
       │   [visual drop overlays]  │ ← NEW: Coordinate-based overlays
       │                           │
       └─────────────┬─────────────┘
                     │
              slotId + geometry (NEW)
                     │
                     ▼
       ┌───────────────────────────┐
       │                           │
       │     RIGHT: MEDIA PANEL    │
       │                           │
       │  canonical photos         │
       │  ordering (integrated)    │ ← NEW: Integrated ordering
       │  drag source              │
       │                           │
       └───────────────────────────┘
                     │
                     ▼
              future mapping (NEW)
                     │
                     ▼
             existing pipeline
                     │
                     ▼
             generated variants (FUTURE)
                     │
                     ▼
              preview refresh (FUTURE)
```

### Component Classification

| Component | Status | Classification |
|------------|--------|----------------|
| Two-panel layout | PARTIAL | EXISTING (currently three-panel) |
| Live preview iframe | EXISTING | CURRENT (uses Vercel production) |
| Visual drop overlays | MISSING | PROPOSED (coordinate emission required) |
| Photo gallery | EXISTING | CURRENT (25 canonical photos) |
| Integrated ordering | MISSING | PROPOSED (ordering exists but separate) |
| Direct drag-to-slot | MISSING | PROPOSED (current: drag to slot list) |
| Coordinate emission | MISSING | PROPOSED (VisualSlot enhancement) |
| Per-photo variant API | MISSING | PROPOSED (new endpoint required) |
| Native scrolling | PARTIAL | EXISTING (Lenis disabled, may need refinement) |
| Checkpoint/revert | EXISTING | CURRENT (for ordering only) |
| MAIN/Workbench boundary | PARTIAL | EXISTING (ordering only, not mapping) |

---

## 12. SURGICAL IMPLEMENTATION SEQUENCE

### Phase 1: Slot Identity Foundation (READ-ONLY VALIDATION)
1. **VERIFY**: Confirm that VisualSlot is NOT used in production components
2. **INVENTORY**: Complete website media slot inventory (this report)
3. **DECIDE**: Choose between adding VisualSlot to production vs. alternative slot identification

### Phase 2: Coordinate Emission (NEW CODE)
1. **Enhance VisualSlot**: Add coordinate calculation and postMessage emission
2. **Update Slot Registry**: Add rect, viewport, coordinateSpace, timestamp to RegisteredSlot
3. **Add VisualSlot to Production**: Wrap all production Image components with VisualSlot
4. **Test**: Verify coordinates emit correctly in Workbench iframe

### Phase 3: Drop Target Implementation (NEW CODE)
1. **Create Overlay Component**: Render drop zones at exact coordinates over iframe
2. **Implement Drag-Over/Drop**: Handle HTML5 drag events on overlay zones
3. **Role Validation**: Validate photo roles against slot requirements
4. **Visual Feedback**: Highlight compatible zones on drag-over

### Phase 4: Two-Panel Layout (MODIFY EXISTING)
1. **Remove Middle Column**: Convert three-panel to two-panel layout
2. **Integrate Ordering**: Add ordering controls to right panel (inline)
3. **Simplify Toolbar**: Remove unnecessary buttons, keep essential ones

### Phase 5: Variant Generation API (NEW CODE)
1. **Create API Endpoint**: `/api/workbench/generate-variants`
2. **Add Single-Photo Pipeline Mode**: Modify image pipeline for per-photo processing
3. **Status Tracking**: Add completion status callback
4. **Integration**: Call API on drop, show loading state, update preview on completion

### Phase 6: Scrolling Refinement (VERIFY/ADJUST)
1. **Test Touchpad**: Verify two-finger touchpad works on both panels
2. **Remove Interference**: Remove any custom scroll handlers if needed
3. **Cross-Panel Isolation**: Ensure one panel doesn't steal events from other

### Phase 7: Mapping State Management (NEW CODE)
1. **Create Mapping State**: localStorage for temporary mapping state
2. **Checkpoint System**: Extend checkpoint to include mapping state
3. **Save Mechanism**: Update MAIN authorities on explicit save
4. **Revert Mechanism**: Restore checkpoint on revert

---

## 13. ONE NEXT MUTATION

### SINGLE SMALLEST MUTATION

**Add coordinate emission to VisualSlot component**

**File**: `src/components/visual-slot.tsx`

**Change**: Add useEffect to calculate and emit coordinates via postMessage in workbench mode

**Rationale**: This is the foundational dependency for all subsequent work. Without coordinate emission, no drop target mechanism is possible.

**Risk**: LOW - Local component enhancement, no production impact (only affects Workbench mode)

**Validation**: Can verify coordinate emission without touching any other system.

**Specific Change**:
```typescript
useEffect(() => {
  // Emit coordinates in workbench mode
  if (isWorkbenchMode && elementRef.current) {
    const rect = elementRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };
    
    window.parent.postMessage({
      type: 'SLOT_COORDINATES',
      payload: {
        id,
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        },
        viewport,
        coordinateSpace: 'viewport',
        timestamp: Date.now()
      }
    }, '*');
  }
}, [id, isWorkbenchMode]);
```

---

## 14. FINAL WEBSITE PREVIEW SLOT MAP

### Complete Slot Inventory

| Page | Component | Slot ID | Current Media | Render Element | VisualSlot Used? | Geometry Available? | Drop Target Candidate | Confidence |
|------|-----------|---------|---------------|----------------|------------------|-------------------|---------------------|------------|
| **Homepage** | Hero Section | homepage-hero | `/images/hero-background-enhanced.jpg` (hardcoded) | `Image` with `fill` | **NO** | **NO** | **ADD VISUALSLOT** | 100% |
| **Homepage** | ServiceCard × N | service-card-hero-{service} | `getFeaturedServiceMedia(service.slug)` | `Image` with `fill` | **NO** | **NO** | **ADD VISUALSLOT** | 100% |
| **Homepage** | BeforeAfterSlider | homepage-featured-before/after | `project.media.before/after` | `Image` in slider | **NO** | **NO** | **ADD VISUALSLOT** | 100% |
| **About** | Owner Portrait | about-owner-portrait | `brand-portrait` via `getOwnerPortrait()` | `Image` with `fill` | **NO** | **NO** | **ADD VISUALSLOT** | 100% |
| **About** | Logo | about-logo | `/brand/logo.png` (hardcoded) | `Image` fixed dimensions | **NO** | **NO** | **ADD VISUALSLOT** | 100% |
| **Services** | ServiceCard × N | service-card-hero-{service} | `getFeaturedServiceMedia(service.slug)` | `Image` with `fill` | **NO** | **NO** | **ADD VISUALSLOT** | 100% |
| **Services** | BeforeAfterSlider | service-featured-before/after | `project.media.before/after` | `Image` in slider | **NO** | **NO** | **ADD VISUALSLOT** | 100% |
| **Services** | Project Gallery × N | service-project-hero-{project} | `project.media.hero` | `Image` with `fill` | **NO** | **NO** | **ADD VISUALSLOT** | 100% |
| **Our Work** | BeforeAfterSlider × N | our-work-featured-before/after | `project.media.before/after` | `Image` in slider | **NO** | **NO** | **ADD VISUALSLOT** | 100% |
| **Our Work** | Project Gallery × N | our-work-project-hero-{project} | `project.media.hero` | `Image` with `fill` | **NO** | **NO** | **ADD VISUALSLOT** | 100% |
| **Projects** | ProjectSpotlight | project-hero | `project.media.hero` | `Image` with `fill` | **NO** | **NO** | **ADD VISUALSLOT** | 100% |
| **Projects** | ProjectPhotos | project-gallery-{index} | `project.media.gallery[]` | `Image` in grid | **NO** | **NO** | **ADD VISUALSLOT** | 100% |

**Total Slots**: 15+ slots across 5 pages (exact count depends on service/project count)

**VisualSlot Coverage**: 0% (none currently use VisualSlot)

**Geometry Coverage**: 0% (no coordinate emission exists)

**Drop Target Readiness**: 0% (requires VisualSlot integration + coordinate emission)

---

## 15. CRITICAL UNCERTAINTIES

### High-Impact Uncertainties

1. **VisualSlot Integration Overhead**: Adding VisualSlot to all production components may have performance/complexity impact
2. **iframe Coordinate Accuracy**: postMessage coordinate transmission may have timing/precision issues
3. **Per-Photo Pipeline Feasibility**: Image pipeline may not be easily adaptable to single-photo processing
4. **Scrolling Cross-Panel Interference**: iframe + parent page scroll events may still conflict even with Lenis disabled

### Medium-Impact Uncertainties

1. **Variant Generation Performance**: On-demand processing may be slow, blocking user workflow
2. **State Synchronization**: Keeping Workbench state in sync with preview after variant generation
3. **Responsive Geometry**: Dynamic coordinate recalculation on window resize/viewport change

### Low-Impact Uncertainties

1. **Ordering Integration**: Integrating ordering into right panel is straightforward
2. **Checkpoint Extension**: Extending checkpoint to include mapping state is straightforward
3. **Main Authority Updates**: Existing save/revert pattern can be extended

---

## 16. SUCCESS CRITERIA

### User Experience
- User sees exactly two panels (preview + gallery)
- User drags photo from right panel
- User drops photo directly on visual spot in left panel
- Photo automatically processes variants (future implementation)
- Preview updates with new photo when ready (future implementation)
- No confirmation dialogs required
- No manual steps for variant generation (future implementation)

### Technical
- Drop zones appear at exact pixel locations (requires VisualSlot integration)
- Role validation prevents incompatible assignments
- Variants generate asynchronously without blocking (future implementation)
- MAIN authorities unchanged until explicit save (future implementation)
- Checkpoint/revert works for safety (existing)
- Native touchpad scrolling works (partially implemented, may need refinement)
- TypeScript compilation passes (must verify)

### Authority Safety
- Workbench maintains temporary mapping state (future implementation)
- MAIN authorities never modified during drag-drop (future implementation)
- Explicit "Save Mapping" required for MAIN updates (future implementation)
- Git-based rollback capability preserved (existing)

---

## 17. HARD STOP

**READ-ONLY INVESTIGATION COMPLETE**

**ABSOLUTE STOP - NO IMPLEMENTATION AUTHORIZED**

**Deliverable**: Complete read-only architectural plan for two-panel direct media mapping

**Next Step**: Awaiting user approval before proceeding with the single smallest mutation (VisualSlot coordinate emission).

**North Star**: TWO PANELS → REAL WEBSITE PREVIEW → REAL SLOT GEOMETRY → DRAG PHOTO DIRECTLY ONTO THE EXACT SPOT → AUTOMATIC VARIANT PROCESSING → IMMEDIATE PREVIEW

**Foundation**: Map the spots first. Do not build the interaction until we know what the spots actually are.

---

**END OF READ-ONLY REPORT**
