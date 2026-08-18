# FINAL SLOT INTEGRATION FORENSIC ANALYSIS

## Exact VisualSlot Data Contract (Workbench System)

### RegisteredSlot Interface (src/lib/slot-registry.ts)
```typescript
export interface RegisteredSlot {
  id: string;              // Component-provided slot identifier
  route: string;           // Route where slot exists
  page: string;            // Page name
  section: string;         // Section within page
  slotName: string;       // Human-readable slot name
  currentMediaId: string | null;  // Current media assignment from authority
  element: HTMLElement | null;  // DOM element reference (runtime handle)
  component: string;       // Component name
}
```

### Key Characteristics
- **slotId origin:** Component-provided string (no generation function)
- **slotId nature:** Semantic identifier (e.g., "homepage-hero-slot")
- **Semantic fields:** route, page, section, slotName are semantic descriptors
- **Media ID:** Current assignment from authority, not source of truth
- **Element reference:** Runtime DOM handle, not authoritative
- **Registration method:** Explicit component call (not DOM discovery)

## Exact Slot-Registry Contract (Workbench System)

### SlotRegistry Class (src/lib/slot-registry.ts)
- **Storage:** Map<string, RegisteredSlot>
- **Registration:** Explicit register(slot) call from component
- **Unregistration:** Explicit unregister(slotId) call from component
- **Discovery:** NO DOM scanning, NO MutationObserver
- **Lifecycle:** Manual mount/unmount by component via useEffect
- **Message types:** SLOT_REGISTER, SLOT_UNREGISTER, SLOT_CLICK, WORKBENCH_PREVIEW_INIT, WORKBENCH_PREVIEW_ACK
- **Expectation:** Components explicitly register themselves with complete metadata

### Key Characteristics
- **Expectation:** Explicit registration only
- **No discovery:** Does not scan DOM for slots
- **No derived state:** All data comes from explicit component registration
- **Authority boundary:** Registration is one-way (component → registry)
- **Validation:** Currently NONE (accepts any registration without validation)

## Exact SLOT_CLICK Payload Contract

### Message Structure (src/components/visual-slot.tsx)
```typescript
{
  type: 'SLOT_CLICK',
  slot: {
    id: string,
    route: string,
    page: string,
    section: string,
    slotName: string,
    currentMediaId: string | null
  }
}
```

### Key Characteristics
- **Payload:** Complete slot metadata (all semantic fields)
- **Source:** Component-provided (not DOM-derived)
- **Media ID:** Current assignment from authority
- **Purpose:** Selection notification for Workbench UI
- **Validation:** Currently NONE (accepts any SLOT_CLICK message)

## Existing Server/Client Boundary

### Workbench System Boundary
- **Server:** Authority data (brand.v1.json, projects.v1.json, media.v1.json)
- **Server adapters:** getHomepageHero(), getProjectById(), getMediaById()
- **Server components:** Production page components (server components)
- **Client registration:** VisualSlot (client component)
- **Blocker:** Server components cannot use client VisualSlot wrapper directly
- **Metadata transfer:** NO MECHANISM exists for server→client slot metadata transfer

### PING90 Editor System Boundary
- **Server:** Same authority data
- **Server adapters:** Same authority adapters
- **Client components:** EditableSlot (client component)
- **Client registration:** Explicit slotRegistry.register() with props
- **Metadata transfer:** PROVEN - EditableSlot receives server-derived descriptors via props
- **Validation:** Consistency enforcement, duplicate rejection

## Candidate Integration Points Ranked by Architectural Legitimacy

### Rank 1: Use PING90 EditableSlot System (HIGHEST LEGITIMACY)
- **Evidence:** PING90 already solves server/client boundary with props
- **Contract:** EditableSlot with explicit props, slotRegistry.register()
- **Validation:** Consistency enforcement, duplicate rejection (lines 51-66 in editor/slot-registry.ts)
- **Authority:** Respects authority boundaries (no competing source of truth)
- **Data attributes:** Uses `data-slot-id` for positioning only, not as source of truth
- **Constitutional compliance:** Follows "components register themselves" principle
- **Status:** EXISTS, PROVEN, CONSTITUTIONAL
- **Work needed:** Integrate editor slotRegistry into Workbench, add EditableSlot to production components

### Rank 2: Data Attributes with Strict Validation (MEDIUM LEGITIMACY)
- **Evidence:** Minimal invasiveness to production code
- **Contract:** Add data attributes, scan DOM for registration
- **Validation:** Would require new validation logic to prevent authority divergence
- **Authority:** Risk of duplicate authority if validation is missing
- **Data attributes:** Would be derived, non-authoritative runtime metadata
- **Constitutional compliance:** Would require new validation architecture
- **Status:** UNPROVEN, REQUIRES NEW VALIDATION ARCHITECTURE
- **Work needed:** Add DOM scanning, validation, consistency checks

### Rank 3: Convert Production Components to Client (LOW LEGITIMACY)
- **Evidence:** Would enable existing unused VisualSlot pattern
- **Contract:** Convert server components to client, wrap with VisualSlot
- **Validation:** Existing VisualSlot contract is sound
- **Authority:** Respects authority boundaries
- **Constitutional compliance:** Would preserve component self-registration
- **Status:** TECHNICALLY POSSIBLE but HIGH BLAST RADIUS
- **Work needed:** Convert many components, performance impact unknown

### Rank 4: Server-Side Slot Registration (LOWEST LEGITIMACY)
- **Evidence:** Would avoid client boundary entirely
- **Contract:** Register in authority adapters, pass to client
- **Validation:** Violates "components register themselves" principle
- **Authority:** Moves registration from component to data layer
- **Constitutional compliance:** ARCHITECTURAL VIOLATION
- **Status:** VIOLATES CONSTITUTIONAL PRINCIPLE
- **Work needed:** Modify authority adapters, break component self-registration

## Authority Ownership for Every Proposed Field

### PING90 EditableSlot Fields
- **slotId:** COMPONENT-OWNED (semantic identifier from component)
- **page:** COMPONENT-OWNED (routing context from component)
- **component:** COMPONENT-OWNED (component name from component)
- **slotName:** COMPONENT-OWNED (semantic name from component)
- **constraints:** COMPONENT-OWNED (technical constraints from component)
- **elementType:** COMPONENT-OWNED (element type from component)
- **data-slot-id:** RUNTIME-DERIVED (positioning handle, not source of truth)

### Workbench VisualSlot Fields
- **id:** COMPONENT-OWNED (semantic identifier from component)
- **route:** COMPONENT-OWNED (routing context from component)
- **page:** COMPONENT-OWNED (page context from component)
- **section:** COMPONENT-OWNED (section context from component)
- **slotName:** COMPONENT-OWNED (semantic name from component)
- **currentMediaId:** AUTHORITY-DERIVED (current assignment from authority)
- **element:** RUNTIME-DERIVED (DOM handle for positioning)
- **component:** COMPONENT-OWNED (component name from component)

### Proposed Data Attributes
- **data-slot-id:** COMPONENT-OWNED (semantic identifier from component)
- **data-slot-route:** COMPONENT-OWNED (routing context from component)
- **data-slot-section:** COMPONENT-OWNED (section context from component)
- **data-slot-media-id:** AUTHORITY-DERIVED (current assignment from authority)

## Proof That No Duplicate Authority Is Created

### PING90 System (Rank 1)
- **Source of truth:** slotRegistry registration (explicit component call)
- **Data attributes:** `data-slot-id` used for EditorOverlay positioning only
- **Validation:** Lines 51-66 in editor/slot-registry.ts enforce registration consistency
- **Consistency check:** Rejects duplicate registrations with different properties
- **Authority boundary:** Registration is one-way, component is source of truth
- **Conclusion:** NO duplicate authority, constitutional compliance achieved

### Data Attributes (Rank 2)
- **Source of truth:** Authority files (brand.v1.json, projects.v1.json, media.v1.json)
- **Data attributes:** Derived display metadata only
- **Validation:** MISSING - would require new validation architecture
- **Consistency check:** MISSING - could diverge from authority without detection
- **Authority boundary:** Risk of UI saying one thing while authority says another
- **Conclusion:** DUPLICATE AUTHORITY RISK without strict validation architecture

## Smallest Legitimate Edit Set

### Option 1: Use PING90 EditableSlot System (RECOMMENDED)
**Files to change:**
- `src/app/workbench/media/page.tsx` - Integrate editor slotRegistry instead of workbench slotRegistry
- 8 production components - Add EditableSlot wrapper with props
- Remove: `src/lib/slot-registry.ts` (unused workbench registry)
- Remove: `src/components/visual-slot.tsx` (unused workbench component)

**Authority changes:** NONE
**Projection changes:** NONE
**Generated metadata changes:** NONE
**HP012-HP015 arrays:** PRESERVED (not touched)

**Files that must not change:**
- Authority files (brand.v1.json, projects.v1.json, media.v1.json, services.v1.json)
- Authority adapters (brand.ts, projects.ts, media.ts, registries.ts)
- PING90 editor system (editor/slot-registry.ts, editor/editable-slot.tsx, editor/event-system.ts, etc.)
- Projections (.generated/*.json)
- HP012-HP015 evidence arrays

### Option 2: Data Attributes with Validation (NOT RECOMMENDED)
**Files to change:**
- 8 production components - Add data attributes
- `src/components/visual-slot.tsx` - Add DOM scanning logic
- `src/lib/slot-registry.ts` - Add validation logic for derived vs authoritative data

**Authority changes:** NONE
**Projection changes:** NONE
**Generated metadata changes:** NONE
**HP012-HP015 arrays:** PRESERVED (not touched)

**Files that must not change:**
- Authority files (brand.v1.json, projects.v1.json, media.v1.json, services.v1.json)
- Authority adapters (brand.ts, projects.ts, media.ts, registries.ts)
- PING90 editor system
- Projections

## Explicit List of Files That Would Change

### Option 1 (PINGTON Integration)
1. `src/app/workbench/media/page.tsx` - Integrate editor slotRegistry
2. `src/app/page.tsx` - Add EditableSlot wrapper to hero, owner portrait, service cards, featured projects
3. `src/app/about/page.tsx` - Add EditableSlot wrapper to owner portrait
4. `src/components/project-spotlight.tsx` - Add EditableSlot wrapper to hero, gallery images
5. `src/components/project-photos.tsx` - Add EditableSlot wrapper to gallery images
6. `src/components/service-card.tsx` - Add EditableSlot wrapper to service card image
7. `src/components/before-after-slider.tsx` - Add EditableSlot wrapper to before/after images
8. `src/app/services/[slug]/page.tsx` - Add EditableSlot wrapper to featured project, gallery images
9. `src/app/our-work/OurWorkClient.tsx` - Add EditableSlot wrapper to featured transformations, recent projects, archive
10. `src/lib/slot-registry.ts` - Remove unused workbench registry
11. `src/components/visual-slot.tsx` - Remove unused workbench component

### Option 2 (Data Attributes)
1. `src/app/page.tsx` - Add data attributes to hero, owner portrait, service cards, featured projects
2. `src/app/about/page.tsx` - Add data attributes to owner portrait
3. `src/components/project-spotlight.tsx` - Add data attributes to hero, gallery images
4. `src/components/project-photos.tsx` - Add data attributes to gallery images
5. `src/components/service-card.tsx` - Add data attributes to service card image
6. `src/components/before-after-slider.tsx` - Add data attributes to before/after images
7. `src/app/services/[slug]/page.tsx` - Add data attributes to featured project, gallery images
8. `src/app/our-work/OurWorkClient.tsx` - Add data attributes to featured transformations, recent projects, archive
9. `src/components/visual-slot.tsx` - Add DOM scanning logic
10. `src/lib/slot-registry.ts` - Add validation logic for derived vs authoritative data

## Explicit List of Files That Must Not Change

### Authority Layer (UNCHANGEABLE)
- `src/config/brand.v1.json`
- `src/config/projects.v1.json`
- `src/config/media.v1.json`
- `src/config/services.v1.json`

### Authority Adapters (UNCHANGEABLE)
- `src/lib/brand.ts`
- `src/lib/projects.ts`
- `src/lib/media.ts`
- `src/lib/registries.ts`

### PING90 Editor System (UNCHANGEABLE except integration)
- `src/lib/editor/slot-registry.ts`
- `src/components/editor/editable-slot.tsx`
- `src/lib/editor/event-system.ts`
- `src/lib/editor/command-pattern.ts`
- `src/lib/editor/placement-graph.ts`
- `src/lib/editor/sequence-authority.ts`
- `src/lib/editor/durable-event-store.ts`
- `src/lib/editor/validation-result.ts`

### Projections (UNCHANGEABLE)
- `.generated/gallery-projection.json`
- `.generated/hero-projection.json`
- `.generated/service-projection.json`

### Evidence Arrays (UNCHANGEABLE)
- HP012 evidence arrays in gallery-projection.json
- HP013-HP015 evidence arrays (document separately, not cleaned up during this task)

## Final Recommendation

### Use PING90 EditableSlot System (Rank 1)

**Constitutional compliance:**
- ✅ "Components register themselves" principle preserved
- ✅ Authority → semantic derivation → runtime instrumentation chain preserved
- ✅ No duplicate authority (validation prevents divergence)
- ✅ Server/client boundary solved via props (proven PING90 pattern)

**Edit set:**
- 11 files total (8 production components + 3 workbench files)
- No authority changes
- No projection changes
- No generated metadata changes
- No evidence array cleanup

**This is the architecturally legitimate integration point.**
