# CORRECTED SLOT CONTRACT AND EXECUTION PLAN

**Date**: Aug. 15, 2026  
**Reference**: MAIN@5ba201cd (public website baseline)  
**Objective**: Establish pixel-faithful slot contract with quality validation  
**ABSOLUTE RULE**: READ-ONLY planning - No implementation until approved

---

## 1. CRITICAL CORRECTIONS TO PREVIOUS REPORT

### Flaw 1: VisualSlot as Simple Wrapper

**Previous assumption**: VisualSlot as wrapper around Image component is sufficient.

**Correction**: Wrapper is insufficient for pixel-faithful replacement. Slot needs comprehensive contract including:
- Container geometry vs image geometry distinction
- object-fit: cover crop behavior analysis
- Focal point preservation
- Visual quality validation

### Flaw 2: "Same Aspect Ratio" = Same Visual Result

**Previous assumption**: Same aspect ratio containers guarantee same visual result.

**Correction**: Two 4:3 photographs can look radically different with object-fit: cover. Must account for:
- Source dimensions
- Crop region
- Focal point
- Object-position
- Subject placement
- Faces/important objects
- Brightness/contrast
- Image orientation
- Visual hierarchy

**Key insight**: Slot compatibility ≠ visual compatibility. Mapping system needs fit-and-quality gate.

### Flaw 3: Optimize Only for DOM Slot

**Previous assumption**: System should optimize for DOM slot identification.

**Correction**: System should optimize for: "Would a human judge the replacement to be at least as good?"

Replacement pipeline needs quality evaluation:
```
source image → orientation normalization → resolution check → aspect/crop simulation → focal-point detection → safe-crop validation → visual-quality checks → slot compatibility score → preview
```

Image that technically fits but cuts off person's head should NOT pass.

### Flaw 4: Coordinates as Source of Truth

**Previous assumption**: Coordinates → overlay system.

**Correction**: Coordinates should be rendering telemetry, not identity. Source of truth:
```
slotId → slot metadata → DOM element → current geometry
```

Coordinates are ephemeral (resize, scroll, zoom, fonts, image load can change them).

### Flaw 5: Slot Types vs Slot Instances

**Previous assumption**: 11 slot types = complete inventory.

**Correction**: service-card-hero is a TYPE, but:
- homepage/service-card/kitchen
- homepage/service-card/bathroom  
- services/remodeling/service-card

are INSTANCES. Every drop target needs globally unique slotInstanceId.

**Correct model**: Slot Definition → Slot Instance → Rendered DOM Element

### Flaw 6: 11-Slot Count Misleading

**Previous assumption**: 11 slots represent complete inventory.

**Correction**: Some represent many actual DOM instances. Need to count actual instances, not just types.

### Flaw 7: Premature Per-Photo API

**Previous assumption**: Build per-photo API early.

**Correction**: Premature. Should prove Photo → real slot → visually equivalent/better preview first. Otherwise building infrastructure around unproven mapping model.

### Flaw 8: Lenis Blocking Foundation

**Previous assumption**: Lenis scroll problem must be solved first.

**Correction**: Lenis is separate concern. Shouldn't block foundational slot implementation. Establish: Workbench owns scrolling; preview iframe owns only website rendering. Solve iframe scrolling as part of preview integration.

---

## 2. CORRECTED SLOT CONTRACT

### Phase 1: Slot Contract Definition

**SlotGeometry** (rendering telemetry, ephemeral):
```typescript
type SlotGeometry = {
  x: number;                    // left position
  y: number;                    // top position
  width: number;                // element width
  height: number;               // element height
  viewportWidth: number;        // window.innerWidth
  viewportHeight: number;       // window.innerHeight
  devicePixelRatio: number;     // window.devicePixelRatio
  scrollX: number;              // window.scrollX
  scrollY: number;              // window.scrollY
  timestamp: number;            // Date.now()
}
```

**SlotDefinition** (stable architectural identity):
```typescript
type SlotDefinition = {
  slotType: string;             // e.g., "homepage-hero", "service-card-hero"
  semanticRole: string;         // e.g., "hero", "before", "after", "gallery"
  requiredAspectRange: { min: number; max: number };  // acceptable aspect ratios
  objectFit: "cover" | "contain" | "fill";
  objectPosition: string;       // e.g., "center", "top", "bottom"
  minResolution: { width: number; height: number };
  qualityRequirements: string[]; // e.g., ["faces-visible", "no-crop-head"]
}
```

**SlotInstance** (globally unique instance):
```typescript
type SlotInstance = {
  slotInstanceId: string;       // e.g., "homepage-hero-001", "homepage-service-card-kitchen-002"
  slotDefinitionId: string;     // e.g., "homepage-hero"
  route: string;                // e.g., "/", "/services", "/about"
  context: Record<string, any>; // e.g., { serviceSlug: "kitchen", projectId: "fences-001" }
  geometry: SlotGeometry;
  currentMediaId: string | null;
  renderedImageUrl: string | null;
}
```

**SlotMetadata** (comprehensive rendering contract):
```typescript
type SlotMetadata = {
  instance: SlotInstance;
  definition: SlotDefinition;
  containerRect: { left: number; top: number; width: number; height: number };
  imageRect: { left: number; top: number; width: number; height: number };
  objectFit: "cover" | "contain" | "fill";
  objectPosition: string;
  aspectRatio: number;
  sourceImageDimensions: { width: number; height: number } | null;
  cropRegion: { x: number; y: number; width: number; height: number } | null;
  focalPoint: { x: number; y: number } | null;
}
```

---

## 3. CORRECTED EXECUTION PLAN

### Phase 1: Establish Slot Contract

**Create**:
- `src/types/slot.ts` - Slot contract types
- `src/components/visual-slot.tsx` - VisualSlot component with comprehensive contract
- `src/lib/slot-registry.ts` - Slot registry with instance tracking

**DO NOT**:
- Build gallery rewrite
- Build queue
- Build per-photo API
- Migrate 11 slots
- Rewrite three-panel UI

**Focus**: Establish comprehensive slot contract, not simple wrapper.

### Phase 2: Instrument Exactly ONE Real Slot

**Target**: homepage.hero only

**Implementation**:
- Wrap homepage hero Image with VisualSlot
- Emit: slot.register, slot.geometry, slot.unregister via postMessage
- Parent Workbench validates message origin
- Assign unique slotInstanceId: "homepage-hero-001"

**Acceptance Test**:
- Resize: 1440px, 1024px, 768px, 390px
- Scroll page
- Workbench must always know where hero actually is
- Coordinates must update on resize/scroll

**Stop Condition**: If hero vertical slice isn't rock solid, stop before instrumenting slot #2.

### Phase 3: Build Visual Overlay

**Workbench Translation**:
```
iframe rect + slot rect inside iframe → absolute overlay rect in Workbench
```

**Requirement**: Overlay must sit EXACTLY over actual image container, not approximately.

**Proof**: This becomes first proof that direct mapping works.

### Phase 4: Add Quality Gate

**Replacement Pipeline**:
```
PHOTO
  ↓
Normalize (orientation, EXIF)
  ↓
Resolution check (min requirements)
  ↓
Crop simulation (object-fit: cover behavior)
  ↓
Focal analysis (detect faces, subjects)
  ↓
Quality gate (safe-crop validation)
  ↓
┌────────┴────────┐
PASS              FAIL
  ↓                 ↓
preview           explain why
```

**Rejection Example**: "Doesn't fit this slot well — subject would be cropped at the current 4:3 framing."

**Do NOT**: Allow bad replacements without quality validation.

### Phase 5: Make Cropping Intelligent

**For every candidate image**:
- Calculate crop that object-fit: cover will produce
- Detect whether important content falls outside that crop
- Minimum detection: faces, people, major subjects, high-salience regions

**Validation Output**:
- Crop safety: PASS/FAIL
- Resolution: PASS/FAIL
- Aspect compatibility: PASS/FAIL
- Subject visibility: PASS/FAIL
- Visual quality: PASS/FAIL

**Only then**: Photo becomes slot candidate.

### Phase 6: Instrument All Real Slot Instances

**Only after hero vertical slice works**

**Instrument in order**:
1. Service card images (with unique instance IDs per card)
2. Before/after images (unique instance IDs per slider)
3. Owner portrait (single instance)
4. Project hero (unique instance IDs per project)
5. Project gallery (unique instance IDs per gallery item)

**Key**: Assign unique instance IDs, not merely slot-type IDs.

### Phase 7: Two-Panel Workbench

**Simplify existing three-panel UI to**:
```
┌──────────────────────────┬─────────────────────────┐
│                          │                         │
│                          │     CANONICAL MEDIA     │
│      REAL WEBSITE        │                         │
│        PREVIEW           │    draggable photos    │
│                          │                         │
│    ┌──────────────┐      │                         │
│    │ DROP TARGET  │      │                         │
│    └──────────────┘      │                         │
│                          │                         │
└──────────────────────────┴─────────────────────────┘
```

**No separate slot-list panel**

**Website itself becomes the slot interface**

**That's the right UX**

### Phase 8: Only Now Build Replacement Processing

**Only after proven**:
```
photo → slot → quality gate → preview
```

**Then add**:
```
photo → normalization → variant generation → media authority → mapping persistence → preview refresh
```

**At that point**: Per-photo API/queue makes sense.

---

## 4. NORTH STAR ACCEPTANCE CRITERION

**Non-negotiable product requirement**:

> A replacement is not successful merely because it fits the slot. It is successful only when the rendered replacement preserves the slot's geometry and rendering behavior, passes crop/resolution/quality validation, and produces a visual result judged equivalent or superior to the existing asset.

**This changes implementation priorities significantly**

---

## 5. ACTUAL NEXT EXECUTION TARGET

**Do only this next**:

1. Create comprehensive slot contract types (SlotGeometry, SlotDefinition, SlotInstance, SlotMetadata)
2. Create VisualSlot component with contract emission
3. Instrument homepage.hero only
4. Emit verified geometry through postMessage
5. Render one precisely aligned Workbench overlay

**DO NOT**:
- Gallery rewrite
- Queue
- Per-photo API
- 11-slot migration
- Three-panel rewrite yet

**Acceptance**: Once single slice passes acceptance test, expand it.

---

## 6. RESEARCH REQUIREMENTS FOR QUALITY GATE

**Before Phase 4 implementation**, research:

### Focal Point Detection
- JavaScript libraries for face detection
- Subject detection algorithms
- Salience region detection
- Browser-native APIs (FaceDetector API?)

### Crop Simulation
- How to simulate object-fit: cover behavior
- Calculate exact crop region for given aspect ratio
- Determine what portion of source image will be visible

### Quality Metrics
- Resolution adequacy thresholds
- Brightness/contrast validation
- Subject visibility scoring
- Crop safety scoring

### Browser Capabilities
- FaceDetector API support
- WebAssembly for image processing
- WebGL for visual analysis
- Performance considerations for real-time validation

---

## 7. UPDATED SLOT INVENTORY MODEL

### Slot Definitions (Types)
- homepage-hero
- service-card-hero
- before-after-slider-before
- before-after-slider-after
- owner-portrait
- project-hero
- project-gallery-item

### Slot Instances (Actual DOM Elements)
- homepage-hero-001 (1 instance)
- service-card-hero-* (N instances, dynamic based on services/projects)
- before-after-slider-before-* (N instances, dynamic based on featured projects)
- before-after-slider-after-* (N instances, dynamic based on featured projects)
- owner-portrait-001 (1 instance)
- project-hero-* (N instances, 1 per project)
- project-gallery-item-* (N instances, dynamic based on project galleries)

**Key Insight**: Cannot statically count slot instances. Must discover dynamically at runtime.

---

## 8. CORRECTED FOUNDATION

**Previous foundation**: VisualSlot wrapper + coordinate emission

**Corrected foundation**: Comprehensive slot contract + quality validation + intelligent cropping

**Critical missing pieces**:
1. Quality gate infrastructure (focal detection, crop simulation, visual validation)
2. Slot instance identification (globally unique IDs)
3. Crop behavior analysis (object-fit: cover simulation)
4. Visual quality metrics (subject visibility, crop safety)

**Without these**: System may allow visually degrading replacements.

---

## 9. ROLLBACK STRATEGY

**Each phase independently reversible**:
- Phase 1: Delete types, VisualSlot, slot-registry
- Phase 2: Remove hero wrapper
- Phase 3: Remove overlay rendering
- Phase 4: Remove quality gate
- Phase 5: Remove intelligent cropping
- Phase 6: Remove additional slot instrumentation
- Phase 7: Revert to three-panel UI
- Phase 8: Remove replacement processing

**Key**: Vertical slices allow rollback at any point.

---

## 10. RESEARCH BEFORE IMPLEMENTATION

**Required research before Phase 4 (Quality Gate)**:

1. **Focal Detection Options**
   - Investigate face-detection-api browser support
   - Research JavaScript libraries (face-api.js, tracking.js)
   - Evaluate WebAssembly options for image processing

2. **Crop Simulation Mathematics**
   - Derive exact object-fit: cover crop calculation
   - Determine aspect ratio to crop region mapping
   - Account for object-position offset

3. **Quality Metrics**
   - Define resolution adequacy thresholds
   - Establish brightness/contrast validation criteria
   - Define subject visibility scoring algorithm

4. **Performance Considerations**
   - Real-time validation impact on drag-drop UX
   - Debouncing/throttling requirements
   - Background processing options

---

## ABSOLUTE STOP

**READ-ONLY PLANNING COMPLETE**

**DELIVERABLE**: Corrected slot contract and execution plan based on pixel-faithful replacement requirements.

**NEXT STEP**: Research quality gate infrastructure (focal detection, crop simulation, visual validation) before Phase 4 implementation.

**NORTH STAR**: Pixel-faithful replacement with quality validation, not merely slot-fitting.

**FOUNDATION**: Comprehensive slot contract + quality gate + intelligent cropping, not simple wrapper.

---

**END OF CORRECTED PLAN**
