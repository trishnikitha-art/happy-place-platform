# VISUAL SLOT CONTRACT FORENSIC ANALYSIS

## Critical Discovery: Two Separate Slot Systems

### System 1: Workbench VisualSlot/slot-registry (UNUSED)
- `src/lib/slot-registry.ts` - Simple Workbench registry
- `src/components/visual-slot.tsx` - Workbench VisualSlot component
- Status: **NOT INTEGRATED** - No production components use this
- Purpose: Intended for Workbench preview interaction

### System 2: Editor EditableSlot/slot-registry (PING90)
- `src/lib/editor/slot-registry.ts` - Constitutional Editor registry
- `src/components/editor/editable-slot.tsx` - Editor EditableSlot component
- Status: **FULLY FUNCTIONAL** - Part of PING90 constitutional runtime
- Purpose: Constitutional Law 3: Components Register Themselves

## Exact VisualSlot Data Contract (Workbench System)

### RegisteredSlot Interface (src/lib/slot-registry.ts)
```typescript
export interface RegisteredSlot {
  id: string;              // Slot identifier
  route: string;           // Route where slot exists
  page: string;            // Page name
  section: string;         // Section within page
  slotName: string;       // Human-readable slot name
  currentMediaId: string | null;  // Current media assignment
  element: HTMLElement | null;  // DOM element reference
  component: string;       // Component name
}
```

### Key Characteristic
- **slotId origin:** Component-provided string (no generation function)
- **Semantic meaning:** All fields are semantic descriptors (route, page, section, slotName)
- **Media ID:** Current assignment from authority, not source of truth
- **Element reference:** DOM handle for positioning, not for truth
- **Registration method:** Explicit component call (not DOM discovery)

## Exact Slot-Registry Contract (Workbench System)

### SlotRegistry Class (src/lib/slot-registry.ts)
- **Storage:** Map<string, RegisteredSlot>
- **Registration:** Explicit register(slot) call
- **Unregistration:** Explicit unregister(slotId) call
- **Discovery:** NO DOM scanning, NO MutationObserver
- **Lifecycle:** Manual mount/unmount by component
- **Message types:** SLOT_REGISTER, SLOT_UNREGISTER, SLOT_CLICK, WORKBENCH_PREVIEW_INIT, WORKBENCH_PREVIEW_ACK

### Key Characteristic
- **Expectation:** Components explicitly register themselves
- **No discovery:** Does not scan DOM for slots
- **No derived state:** All data comes from explicit registration
- **Authority boundary:** Registration is one-way (component → registry)

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

### Key Characteristic
- **Payload:** Complete slot metadata (all semantic fields)
- **Source:** Component-provided (not DOM-derived)
- **Media ID:** Current assignment from authority
- **Purpose:** Selection notification for Workbench UI

## Existing Server/Client Boundary

### Workbench System Boundary
- **Server:** Authority data (brand.v1.json, projects.v1.json, media.v1.json)
- **Client adapter:** getHomepageHero(), getProjectById(), getMediaById()
- **Client component:** Production page components (server components)
- **Client registration:** VisualSlot (client component)
- **Blocker:** Server components cannot use client VisualSlot wrapper

### PING90 Editor System Boundary
- **Server:** Same authority data
- **Client adapter:** Same authority adapters
- **Client component:** EditableSlot (client component)
- **Client registration:** Explicit slotRegistry.register()
- **Blocker:** NONE - system is designed for this boundary

## PING90 Editor Integration Pattern

### EditableSlot Contract (src/components/editor/editable-slot.tsx)
```typescript
interface EditableSlotProps {
  slotId: string;              // Component-provided ID
  page: string;                // Route/page context
  component: string;          // Component name
  slotName: string;           // Semantic slot name
  constraints: SlotConstraints; // Technical constraints
  elementType: 'image' | 'text' | 'color' | 'link';
  children: React.ReactNode;
}
```

### Editor Slot Registry Contract (src/lib/editor/slot-registry.ts)
```typescript
interface SlotRegistration {
  slotId: string;
  page: string;
  component: string;
  slotName: string;
  constraints: SlotConstraints;
  elementType: 'image' | 'text' | 'color' | 'link';
}
```

### Key Characteristic
- **slotId origin:** Component-provided, semantic (e.g., "homepage-hero")
- **Validation:** Rejects duplicate registrations with different properties
- **Consistency:** Requires page/component/slotName/elementType to match
- **Lifecycle:** Register on mount, unregister on unmount
- **DOM attribute:** Stores `data-slot-id` for EditorOverlay positioning
- **Constitutional Law 3:** "Components Register Themselves"

## Whether VisualSlot Has Intended Server→Client Metadata Boundary

### Analysis
- **NO:** VisualSlot has no server→client metadata boundary designed
- **Assumption:** Components would call VisualSlot with all metadata
- **Reality:** Server components cannot use client VisualSlot
- **Missing:** No mechanism for server-side slot metadata to reach client VisualSlot

### PING90 System Has This Boundary
- **YES:** EditableSlot accepts all metadata as props
- **Source:** Component provides slotId, page, component, slotName, constraints
- **Flow:** Component → EditableSlot → slotRegistry → EditorOverlay
- **Data attribute:** Uses `data-slot-id` only for EditorOverlay positioning, not as source of truth

## Whether Slot Registry Expects Explicit Registration vs DOM Discovery

### Workbench Slot Registry
- **EXPLICIT REGISTRATION ONLY**
- **NO DOM DISCOVERY**
- **NO MutationObserver**
- **Expectation:** Components call register() with complete metadata

### Editor Slot Registry
- **EXPLICIT REGISTRATION ONLY**
- **NO DOM DISCOVERY**
- **NO MutationObserver**
- **Expectation:** Components call register() with complete metadata
- **Validation:** Rejects inconsistent registrations

## Whether MutationObserver/DOM Scanning Exists

### Current Architecture
- **NO MutationObserver in either system**
- **NO DOM scanning in either system**
- **NO data-slot-* attribute discovery**
- **Expectation:** Explicit registration, not derived discovery

## Whether Data-Slot-* Would Create Duplicate Authority

### Risk Assessment

**Data attributes as derived metadata:**
- `data-slot-id` - Derived from component slotId
- `data-slot-route` - Derived from component route
- `data-slot-section` - Derived from component section
- `data-slot-media-id` - Derived from authority currentMediaId

**Authority ownership:**
- **Source of truth:** Authority files (brand.v1.json, projects.v1.json, media.v1.json)
- **Component layer:** Reads from authority, renders image
- **Data attribute layer:** Copies current assignment to DOM

**Duplicate authority risk:**
- **HIGH** if data attributes become source of truth
- **ACCEPTABLE** if data attributes are purely derived display metadata
- **DANGER** if DOM attributes can diverge from authority without detection

### Current PING90 Pattern
- **Uses:** `data-slot-id` for EditorOverlay positioning only
- **Does NOT use:** data attributes as source of truth
- **Source of truth:** slotRegistry registration
- **Validation:** Registration consistency enforced

## Whether Existing Projection Layer Can Produce Slot Metadata

### Projection Files
- `.generated/gallery-projection.json` - Gallery metadata (stale, repetitive)
- `.generated/hero-projection.json` - Hero metadata (minimal)
- `.generated/service-projection.json` - Service metadata

### Analysis
- **NO slot metadata** in projections
- **NO route/section/component context** in projections
- **NO semantic slot contracts** in projections
- **Purpose:** Different (harvest/graph analysis, not slot registration)

### Conclusion
- Projections CANNOT produce slot metadata
- Slot metadata exists only in component semantic context
- No projection layer bridges this gap

## Whether Single Client Boundary Component Can Receive Server-Derived Descriptors

### Current Capability
- **NO:** No mechanism exists for server→client slot metadata transfer
- **NO:** Server components cannot pass slot metadata to client components
- **NO:** No data boundary component exists

### PING90 Pattern
- **YES:** EditableSlot receives server-derived descriptors via props
- **But:** This requires component to be client component
- **Current:** Production components are server components

### Workbench Pattern Needed
- **MISSING:** No client boundary component to receive server slot descriptors
- **MISSING:** No mechanism to convert server components to client wrappers
- **MISSING:** No data serialization for slot metadata

## Authority Ownership for Every Proposed Field

### Proposed Data Attributes
- `data-slot-id` - **COMPONENT-OWNED** (semantic identity)
- `data-slot-route` - **COMPONENT-OWNED** (routing context)
- `data-slot-section` - **COMPONENT-OWNED** (section context)
- `data-slot-media-id` - **AUTHORITY-DERIVED** (current assignment)

### VisualSlot Registration Fields
- `id` - **COMPONENT-OWNED** (semantic slot ID)
- `route` - **COMPONENT-OWNED** (routing context)
- `page` - **COMPONENT-OWNED** (page context)
- `section` - **COMPONENT-OWNED** (section context)
- `slotName` - **COMPONENT-OWNED** (semantic name)
- `currentMediaId` - **AUTHORITY-DERIVED** (current assignment)
- `element` - **RUNTIME-DERIVED** (DOM handle)
- `component` - **COMPONENT-OWNED** (component name)

### Authority Boundary Compliance
- **Component-owned fields:** Acceptable (component knows its own context)
- **Authority-derived fields:** Acceptable if read-only (not source of truth)
- **Runtime-derived fields:** Acceptable if ephemeral (element reference)

## Candidate Integration Points Ranked by Architectural Legitimacy

### Rank 1: Use PING90 EditableSlot System (HIGHEST LEGITIMACY)
- **Evidence:** PING90 already solves server/client boundary
- **Contract:** EditableSlot with explicit props, slotRegistry.register()
- **Validation:** Consistency enforcement, duplicate rejection
- **Authority:** Respects authority boundaries (no competing source of truth)
- **Status:** EXISTS, PROVEN, CONSTITUTIONAL
- **Work needed:** Integrate into Workbench instead of unused VisualSlot

### Rank 2: Convert Production Components to Client (MEDIUM LEGITIMACY)
- **Evidence:** Would enable existing VisualSlot pattern
- **Contract:** Convert server components to client, wrap with VisualSlot
- **Validation:** Existing VisualSlot contract is sound
- **Authority:** Respects authority boundaries
- **Status:** TECHNICALLY POSSIBLE but HIGH BLAST RADIUS
- **Work needed:** Convert many components, performance impact unknown

### Rank 3: Add Data Attributes (LOW LEGITIMACY)
- **Evidence:** Minimal invasiveness
- **Contract:** Add data attributes, scan DOM for registration
- **Validation:** Requires new DOM scanning logic
- **Authority:** Risk of duplicate authority if not carefully managed
- **Status:** UNPROVEN, REQUIRES NEW ARCHITECTURE
- **Work needed:** Create DOM scanning, validation, consistency checks

### Rank 4: Server-Side Slot Registration (LOWEST LEGITIMACY)
- **Evidence:** Would avoid client boundary entirely
- **Contract:** Register in authority adapters, pass to client
- **Validation:** Violates "components register themselves" principle
- **Authority:** Moves registration from component to data layer
- **Status:** ARCHITECTURAL VIOLATION
- **Work needed:** Modify authority adapters, break component self-registration

## Proof That No Duplicate Authority Is Created

### PING90 System (Rank 1)
- **Source of truth:** slotRegistry registration
- **Data attributes:** Positioning only, not source of truth
- **Validation:** Registration consistency enforced
- **Conclusion:** NO duplicate authority

### Data Attributes (Rank 3)
- **Source of truth:** Authority files (unchanged)
- **Data attributes:** Derived display metadata only
- **Risk:** HIGH if validation missing
- **Conclusion:** DUPLICATE AUTHORITY RISK without strict validation

## Smallest Legitimate Edit Set

### Option 1: Use PING90 EditableSlot System
**Files to change:**
- `src/app/workbench/media/page.tsx` - Use editor slotRegistry instead of workbench slotRegistry
- Remove: `src/lib/slot-registry.ts` (unused workbench registry)
- Remove: `src/components/visual-slot.tsx` (unused workbench component)
- Add: EditableSlot to 8 production components

**Files that must not change:**
- Authority files (brand.v1.json, projects.v1.json, media.v1.json)
- Authority adapters (brand.ts, projects.ts, media.ts)
- PING90 editor system (except integration)
- Projections

### Option 2: Data Attributes with Strict Validation
**Files to change:**
- 8 production components - add data attributes
- `src/components/visual-slot.tsx` - add DOM scanning logic
- `src/lib/slot-registry.ts` - add validation for derived vs authoritative data

**Files that must not change:**
- Authority files
- Authority adapters
- PING90 editor system
- Projections

## Explicit List of Files That Would Change

### Option 1 (PINGTON Integration)
- `src/app/workbench/media/page.tsx` - Integrate editor slotRegistry
- 8 production components - Add EditableSlot wrapper
- `src/lib/slot-registry.ts` - Remove unused workbench registry
- `src/components/visual-slot.tsx` - Remove unused workbench component

### Option 2 (Data Attributes)
- `src/app/page.tsx` - Add data attributes to images
- `src/app/about/page.tsx` - Add data attributes to images
- `src/components/project-spotlight.tsx` - Add data attributes to images
- `src/components/project-photos.tsx` - Add data attributes to images
- `src/components/service-card.tsx` - Add data attributes to images
- `src/components/before-after-slider.tsx` - Add data attributes to images
- `src/app/services/[slug]/page.tsx` - Add data attributes to images
- `src/app/our-work/OurWorkClient.tsx` - Add data attributes to images
- `src/components/visual-slot.tsx` - Add DOM scanning logic
- `src/lib/slot-registry.ts` - Add validation logic

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

### PING90 System (EXCEPT INTEGRATION)
- `src/lib/editor/slot-registry.ts`
- `src/components/editor/editable-slot.tsx`
- `src/lib/editor/event-system.ts`
- `src/lib/editor/command-pattern.ts`
- `src/lib/editor/placement-graph.ts`

### Projections (UNCHANGEABLE)
- `.generated/gallery-projection.json`
- `.generated/hero-projection.json`
- `.generated/service-projection.json`

## Recommended Integration Strategy

### Use PING90 EditableSlot System (Rank 1)

**Rationale:**
- Already constitutional and proven
- Respects authority boundaries
- Has validation and consistency enforcement
- Solves server/client boundary properly
- No duplicate authority risk
- Smallest legitimate edit set
- Follows established "components register themselves" principle

**Implementation:**
1. Integrate editor slotRegistry into Workbench media page
2. Add EditableSlot to 8 production components
3. Remove unused workbench VisualSlot/slot-registry
4. Leverage existing PING90 validation and consistency enforcement

**This is the architecturally sound integration point.**
