# REPOSITORY FORENSIC INVENTORY

## A. EXISTING HPP SLOT/INSTRUMENTATION SYSTEMS

### 1. website-structure.ts (COMPLETE SEMANTIC MAPPING)
**Location:** `src/lib/website-structure.ts`

**Capabilities:**
- Complete route → page → component → section → slot hierarchy
- Canonical slot-ID scheme ALREADY ESTABLISHED
- VisualSlotRef interface with currentMediaId tracking
- Helper functions: getWebsiteStructure(), getPageByRoute(), getAllEmptySlots(), getSlotById()

**Slot-ID Convention (ALREADY EXISTS):**
- `homepage-hero-slot`
- `homepage-owner-portrait-slot`
- `homepage-service-card-slot-fences`
- `homepage-service-card-slot-painting`
- `homepage-featured-transformation-before-slot`
- `homepage-featured-transformation-after-slot`
- `about-hero-slot`
- `our-work-featured-before-slot`
- `our-work-featured-after-slot`
- `project-hero-slot-fences`
- `project-hero-slot-builtins`
- `project-hero-slot-repairs`
- `project-hero-slot-painting`
- `global-logo-slot`

### 2. visual-asset-registry.ts (COMPLETE SLOT REGISTRY)
**Location:** `src/lib/visual-asset-registry.ts`

**Capabilities:**
- WEBSITE_VISUAL_SLOTS array with complete slot definitions
- VisualSlot interface matching Workbench registry expectations
- Integration with August 3 baseline data
- Usage slot mapping for media assets
- Functions: getWebsiteVisualSlots(), getVisualSlotsByRoute(), getEmptySlots()

**Data Structure:**
```typescript
interface VisualSlot {
  id: string;
  route: string;
  page: string;
  component: string;
  section: string;
  slotName: string;
  currentMediaId: string | null;
  physicalStatus: 'PRESENT' | 'MISSING' | 'RECOVERABLE' | 'DRIVE_ONLY';
  augustDriveId?: string;
}
```

### 3. slot-registry.ts (WORKBENCH RUNTIME REGISTRATION)
**Location:** `src/lib/slot-registry.ts`

**Capabilities:**
- SlotRegistry class with registration/unregistration
- postMessage communication for iframe preview
- WORKBENCH_PREVIEW_INIT/ACK handshake
- SLOT_REGISTER/SLOT_UNREGISTER/SLOT_CLICK message types
- Origin validation and security
- Already used by Workbench media page

### 4. visual-slot.tsx (CLIENT COMPONENT)
**Location:** `src/components/visual-slot.tsx`

**Capabilities:**
- Client component for slot registration
- Registers with slot-registry on mount
- Emits SLOT_CLICK events
- Supports iframe postMessage communication
- Preview mode detection

## B. EXISTING PING90 SLOT/EDITOR SYSTEMS

### 1. editor/slot-registry.ts (PING90 REGISTRY)
**Location:** `src/lib/editor/slot-registry.ts`

**Capabilities:**
- PING90 constitutional slot registry
- Registration consistency validation
- Singleton pattern
- Used by editor system only

### 2. editor/editable-slot.tsx (PING90 COMPONENT)
**Location:** `src/components/editor/editable-slot.tsx`

**Capabilities:**
- PING90 client component
- Different data contract (no currentMediaId, has constraints)
- Uses data-slot-id for positioning only
- NO event emission
- Currently UNUSED in production

## C. EXISTING ADAPTERS/BRIDGES

**NONE FOUND** - No existing adapter between Workbench and PING90 systems.

## D. EXISTING EVENT/MESSAGE PROTOCOLS

### Workbench Protocol (ALREADY EXISTS)
- WORKBENCH_PREVIEW_INIT
- WORKBENCH_PREVIEW_ACK
- SLOT_REGISTER
- SLOT_UNREGISTER
- SLOT_CLICK

**Source:** `src/lib/slot-registry.ts` and `src/components/visual-slot.tsx`

## E. EXISTING CANONICAL SLOT-ID CONVENTIONS

**ALREADY ESTABLISHED** in `website-structure.ts` and `visual-asset-registry.ts`:

```
homepage.hero → homepage-hero-slot
homepage.owner-portrait → homepage-owner-portrait-slot
service.<slug>.image → homepage-service-card-slot-<slug>
project.<projectId>.hero → project-hero-slot-<projectId>
project.<projectId>.before → <route>-featured-before-slot
project.<projectId>.after → <route>-featured-after-slot
```

## F. EXISTING VALIDATION/CONSISTENCY MECHANISMS

### Workbench Registry
- Origin validation
- Source validation
- Message type whitelisting
- NO registration consistency validation

### PING90 Registry
- Registration consistency validation
- NO authority consistency validation

## G. EXISTING SERVER→CLIENT WRAPPER PATTERNS

**NONE FOUND** - No existing wrapper pattern for server→client slot metadata transfer.

## H. EXISTING TESTS

**NONE FOUND** - No tests covering slot registration or Workbench integration.

## CRITICAL FINDING

The previous forensic reports operated on the assumption that no slot infrastructure existed. However:

1. **Complete slot infrastructure ALREADY EXISTS** in website-structure.ts and visual-asset-registry.ts
2. **Canonical slot-ID scheme ALREADY ESTABLISHED**
3. **Workbench protocol ALREADY IMPLEMENTED** in slot-registry.ts and visual-slot.tsx
4. **The problem is NOT missing infrastructure - it's that production components don't use VisualSlot**

## REAL PROBLEM

Production components (page.tsx, about/page.tsx, etc.) do NOT wrap their images with VisualSlot, so no slots are being registered.

The infrastructure is complete and ready - it just needs to be activated in production components.
