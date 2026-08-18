# PING90 EDITABLESLOT INTEGRATION FORENSIC AUDIT

## STOP IMPLEMENTATION - FORENSIC GATE 2

This audit performs the additional forensic pass specifically against the proposed PING90 EditableSlot integration. No files were modified during this investigation.

---

## A. PROVEN FACTS

### 1. Exact EditableSlot Prop Interface (PASS)
```typescript
interface EditableSlotProps {
  slotId: string;
  page: string;
  component: string;
  slotName: string;
  constraints: SlotConstraints;
  elementType?: 'image' | 'text' | 'color' | 'link';
  children: React.ReactNode;
}
```
**Source:** `src/components/editor/editable-slot.tsx:15-23`

### 2. Exact Server/Client Boundary for EditableSlot (PASS)
- **EditableSlot:** Client component ('use client')
- **Expected mechanism:** Server component → EditableSlot props → client registration
- **Current state:** NOT IMPLEMENTED - no production components use EditableSlot
- **Barrier:** Production components are server components, EditableSlot is client component

### 3. Exact Mechanism for Server-Derived Props (PASS)
- **Mechanism:** Props passed from server component to client EditableSlot
- **Serialization:** Standard Next.js server/client boundary serialization
- **Current usage:** NOT USED - no integration exists yet
- **Status:** THEORETICAL - not proven in HPP runtime

### 4. Exact slotRegistry.register() Implementation (PASS)
```typescript
register(registration: SlotRegistration): void {
  const existing = this.registeredSlots.get(registration.slotId);
  
  if (existing) {
    const isConsistent = 
      existing.page === registration.page &&
      existing.component === registration.component &&
      existing.slotName === registration.slotName &&
      existing.elementType === registration.elementType;
    
    if (!isConsistent) {
      throw new Error(`Slot ${registration.slotId} registration is inconsistent.`);
    }
    
    this.registeredSlots.set(registration.slotId, registration);
    return;
  }
  
  this.registeredSlots.set(registration.slotId, registration);
}
```
**Source:** `src/lib/editor/slot-registry.ts:50-74`

### 5. Exact Validation Performed by PING90 Registry (PASS)
- **Type:** Registration consistency validation (NOT authority consistency)
- **Validates:** page, component, slotName, elementType must match for same slotId
- **Does NOT validate:** Whether currentMediaId is authoritative
- **Behavior:** Throws error on inconsistent re-registration
- **Source:** `src/lib/editor/slot-registry.ts:55-66`

### 6. Exact Event Emitted by EditableSlot (FAIL - NO EVENT)
- **Finding:** EditableSlot does NOT emit any events
- **Registration only:** Uses useEffect to register with slotRegistry
- **No emission:** No SLOT_CLICK or similar event is emitted
- **Source:** `src/components/editor/editable-slot.tsx:36-52`

### 7. Exact SLOT_CLICK Payload Emitted (FAIL - IRRELEVANT)
- **Finding:** EditableSlot does not emit SLOT_CLICK
- **SLOT_CLICK source:** Workbench VisualSlot component only
- **Workbench payload:** `{ type: 'SLOT_CLICK', slot: { id, route, page, section, slotName, currentMediaId } }`
- **Source:** `src/components/visual-slot.tsx:96-99`

### 8. Exact Workbench Message Consumer (PASS)
```typescript
switch (event.data.type) {
  case 'WORKBENCH_PREVIEW_ACK':
    setIframeReady(true);
    break;
  case 'SLOT_REGISTER':
    slotRegistry.register({ ...event.data.slot, element: null });
    break;
  case 'SLOT_UNREGISTER':
    slotRegistry.unregister(event.data.slotId);
    break;
  case 'SLOT_CLICK':
    window.dispatchEvent(new CustomEvent('slot-click', { detail: event.data.slot }));
    break;
}
```
**Source:** `src/app/workbench/media/page.tsx:106-125`

### 9. Registry Compatibility (FAIL - INCOMPATIBLE)
| Feature | Workbench Registry | PING90 Registry | Compatible? |
|---------|-------------------|-----------------|-------------|
| Registration interface | `RegisteredSlot` | `SlotRegistration` | **NO** |
| currentMediaId field | YES | **NO** | **NO** |
| route field | YES | **NO** | **NO** |
| section field | YES | **NO** | **NO** |
| constraints field | **NO** | YES | **NO** |
| elementType field | **NO** | YES | **NO** |
| Validation | NONE | Consistency check | **NO** |
| Message protocol | postMessage | None | **NO** |
| Event emission | SLOT_CLICK | None | **NO** |

### 10. Registry Singleton/Module Scope (PASS)
- **Workbench registry:** Singleton (`export const slotRegistry = new SlotRegistry()`)
- **PING90 registry:** Singleton (`export const slotRegistry = SlotRegistry.getInstance()`)
- **Scope issue:** Both are singletons - replacing one breaks the other
- **Impact:** Cannot substitute one for the other without architectural change

### 11. Exact Lifecycle Behavior (PASS)
- **Registration:** useEffect on mount → slotRegistry.register()
- **Unregistration:** useEffect cleanup → slotRegistry.unregister()
- **Dependencies:** [slotId, page, component, slotName, constraints, elementType]
- **Source:** `src/components/editor/editable-slot.tsx:37-52`

### 12. Slot-ID Uniqueness Requirements (FAIL - NO SCHEME)
- **PING90:** No canonical slot-ID scheme documented
- **Current usage:** EditableSlot is not used anywhere
- **Requirement:** Global uniqueness within registry scope
- **Status:** UNKNOWN - no established scheme exists

### 13. CurrentMediaId Provenance (PASS - PROVEN CANONICAL)

**Homepage Hero:**
```
brand.v1.json (line 6: "mediaId": "brand-hero")
  ↓
getHomepageHero() (brand.ts:52-55)
  ↓
page.tsx:57-58
  ↓
getMediaById("brand-hero") (media.ts:43-46)
  ↓
Canonical media record
```

**Owner Portrait:**
```
brand.v1.json (line 15: "mediaId": "brand-portrait")
  ↓
getOwnerPortrait() (brand.ts:61-64)
  ↓
page.tsx:50-51
  ↓
getMediaById("brand-portrait") (media.ts:43-46)
  ↓
Canonical media record
```

**Service Card:**
```
service.slug
  ↓
getFeaturedServiceMedia(serviceSlug) (media.ts:117-150)
  ↓
getProjectsByServiceSlug() (projects.ts:60-62)
  ↓
topProject.media.hero (projects.v1.json:17)
  ↓
getMediaById(heroMediaId) (media.ts:43-46)
  ↓
Canonical media record
```

**Before/After:**
```
project.media.before (projects.v1.json:18)
  ↓
getMediaById(beforeMediaId) (media.ts:43-46)
  ↓
Canonical media record
```

**Project Hero:**
```
project.media.hero (projects.v1.json:17)
  ↓
getMediaById(heroMediaId) (media.ts:43-46)
  ↓
Canonical media record
```

**Finding:** All currentMediaId paths are canonical and authoritative.

### 14. HP012-HP015 Before/After Authority (PASS)
- **Canonical:** `project.media.before` and `project.media.after` in projects.v1.json
- **Evidence arrays:** `supportingGalleryEvidence[]` exists but is separate
- **Authority distinction:** Project media authority is canonical, evidence is provenance
- **Finding:** EditableSlot would use project media authority, not evidence arrays

### 15. OurWorkClient.tsx Audit (PASS)
- **Status:** Already a client component
- **Data boundary:** Receives serialized project data as props
- **Media resolution:** Uses getMediaById() client-side
- **Difference:** Can already access client-side data, different integration route
- **Source:** `src/app/our-work/OurWorkClient.tsx:1-208`

### 16. File Dependency Audit (PASS)
**editable-slot.tsx imports:**
- ZERO production files import editable-slot.tsx
- Only import: `src/lib/editor/event-system.ts:16` (PING90 internal)

**visual-slot.tsx imports:**
- ZERO production files import visual-slot.tsx
- Only import: References workbench slot-registry

**slot-registry imports:**
- `src/app/workbench/media/page.tsx:26` (Workbench)
- `src/components/editor/editable-slot.tsx:13` (PING90)
- `src/components/visual-slot.tsx:33` (Workbench)
- `src/lib/editor/event-system.ts:16` (PING90)

**Finding:** Both EditableSlot and VisualSlot are unused in production. Safe to defer deletion.

---

## B. ASSUMPTIONS TREATED AS FACTS (INCORRECT)

### 1. "PING90 solves server/client boundary" (INCORRECT)
- **Assumption:** EditableSlot props solve server/client boundary
- **Reality:** EditableSlot is NOT used anywhere in HPP
- **Status:** THEORETICAL, not proven in HPP runtime
- **Impact:** Cannot assume props serialization works without testing

### 2. "Validation prevents divergence" (INCORRECT)
- **Assumption:** PING90 validation prevents authority divergence
- **Reality:** Validation only prevents registration inconsistency
- **Missing:** No validation of currentMediaId authority
- **Impact:** Authority consistency is NOT proven

### 3. "Registries are interchangeable" (INCORRECT)
- **Assumption:** Workbench and PING90 registries are compatible
- **Reality:** Completely different interfaces and protocols
- **Impact:** Architectural substitution, not integration

### 4. "EditableSlot emits events" (INCORRECT)
- **Assumption:** EditableSlot emits events like VisualSlot
- **Reality:** EditableSlot only registers, does not emit
- **Impact:** Workbench event protocol incompatible

### 5. "Slot-ID scheme exists" (INCORRECT)
- **Assumption:** Canonical slot-ID scheme is established
- **Reality:** No documented scheme exists
- **Impact:** Uniqueness requirements unmet

---

## C. REMAINING ARCHITECTURAL RISKS

### 1. Registry Interface Incompatibility (HIGH RISK)
- **Risk:** Workbench expects currentMediaId, PING90 doesn't provide it
- **Impact:** Workbench cannot read current media assignments
- **Mitigation:** Unknown - requires interface redesign

### 2. Event Protocol Mismatch (HIGH RISK)
- **Risk:** Workbench expects SLOT_CLICK events, EditableSlot doesn't emit
- **Impact:** Workbench selection UI breaks
- **Mitigation:** Unknown - requires event emission in EditableSlot

### 3. Missing currentMediaId Field (HIGH RISK)
- **Risk:** PING90 SlotRegistration lacks currentMediaId field
- **Impact:** Workbench cannot display current media assignments
- **Mitigation:** Add currentMediaId to PING90 SlotRegistration

### 4. Singleton Scope Collision (MEDIUM RISK)
- **Risk:** Both registries are singletons with same export name
- **Impact:** Cannot use both simultaneously
- **Mitigation:** Namespace separation or unified registry

### 5. Slot-ID Uniqueness (MEDIUM RISK)
- **Risk:** No canonical slot-ID scheme for collections/paired slots
- **Impact:** Collisions in gallery/images
- **Mitigation:** Establish canonical scheme before implementation

### 6. Server/Client Props Serialization (MEDIUM RISK)
- **Risk:** Props serialization not proven in HPP runtime
- **Impact:** Runtime errors or data loss
- **Mitigation:** Test with actual production components

### 7. OurWorkClient Integration Path (LOW RISK)
- **Risk:** Different client boundary may require different approach
- **Impact:** Inconsistent integration pattern
- **Mitigation:** Audit OurWorkClient integration separately

---

## D. EXACT COMPATIBILITY GAPS

### 1. Data Structure Incompatibility
```typescript
// Workbench expects (from visual-slot.tsx:62-71)
{
  id: string;
  route: string;
  page: string;
  section: string;
  slotName: string;
  currentMediaId: string | null;
  element: HTMLElement | null;
  component: string;
}

// PING90 provides (from editor/slot-registry.ts:22-29)
{
  slotId: string;
  page: string;
  component: string;
  slotName: string;
  constraints: SlotConstraints;
  elementType: 'image' | 'text' | 'color' | 'link';
}
```

**Gaps:**
- currentMediaId: MISSING in PING90
- route: MISSING in PING90
- section: MISSING in PING90
- element: MISSING in PING90
- constraints: MISSING in Workbench
- elementType: MISSING in Workbench
- id vs slotId: DIFFERENT FIELD NAMES

### 2. Event Protocol Incompatibility
```typescript
// Workbench expects (from visual-slot.tsx:96-99)
{
  type: 'SLOT_CLICK',
  slot: { id, route, page, section, slotName, currentMediaId }
}

// PING90 provides: NONE
```

**Gaps:**
- No event emission from EditableSlot
- No message protocol in PING90 system
- Workbench iframe communication broken

### 3. Registration Mechanism Incompatibility
```typescript
// Workbench uses: postMessage with WORKBENCH_PREVIEW_INIT/ACK
// PING90 uses: Direct registration call
```

**Gaps:**
- No iframe communication in PING90
- No preview context in PING90
- Workbench iframe integration broken

### 4. Validation Incompatibility
```typescript
// Workbench: NO validation
// PING90: Registration consistency validation
```

**Gaps:**
- Behavioral change when switching registries
- Error handling differences
- Runtime behavior unpredictable

---

## E. EXACT MINIMUM INTEGRATION SURFACE (IF COMPATIBILITY PROVEN)

### Prerequisites (MUST BE RESOLVED FIRST)
1. **Add currentMediaId to PING90 SlotRegistration**
2. **Add route, section to PING90 SlotRegistration**
3. **Add event emission to EditableSlot**
4. **Establish canonical slot-ID scheme**
5. **Resolve singleton scope collision**
6. **Test server/client props serialization**

### Integration Changes (AFTER PREREQUISITES)
1. **Workbench media page:** Switch to PING90 slotRegistry
2. **8 production components:** Add EditableSlot wrapper
3. **Workbench message handler:** Adapt to PING90 events
4. **EditableSlot:** Add SLOT_CLICK emission
5. **PING90 registry:** Add Workbench-compatible fields

### Category Classification
- **Instrumentation:** Adding EditableSlot wrappers (minimal risk)
- **Runtime integration:** Registry substitution (high risk)
- **Behavioral change:** Validation differences (medium risk)

---

## F. FILES THAT MUST REMAIN UNTOUCHED

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

### PING90 Core (UNCHANGEABLE except integration)
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
- HP012-HP015 evidence arrays (document separately, not cleaned up)

---

## G. FILES WHOSE DELETION IS CANDIDATE (NOT YET AUTHORIZED)

### Deletion Candidates (DEFER UNTIL DEPENDENCY AUDIT)
- `src/lib/slot-registry.ts` (Workbench registry)
- `src/components/visual-slot.tsx` (Workbench component)

### Deletion Blockers
- Workbench media page currently imports workbench slot-registry
- No integration path verified yet
- Registry substitution not proven safe

### Deletion Approval Process
1. Verify PING90 integration works
2. Verify Workbench functionality preserved
3. Audit all import references
4. Test Workbench preview mode
5. THEN approve deletion

---

## H. FINAL CONSTITUTIONAL VERDICT

### VERDICT: FAIL - INTEGRATION NOT PROVEN

### Reasoning
1. **Registry incompatibility:** Workbench and PING90 registries have completely different interfaces
2. **Missing currentMediaId:** PING90 lacks currentMediaId field that Workbench requires
3. **Event protocol mismatch:** EditableSlot does not emit events that Workbench expects
4. **Singleton collision:** Both registries are singletons with same export name
5. **Slot-ID scheme missing:** No canonical scheme for uniqueness
6. **Props serialization unproven:** Server/client boundary not tested in HPP runtime
7. **Behavioral change risk:** Validation differences create unpredictable behavior

### Correct Constitutional Interpretation
**Authority → semantic derivation → runtime instrumentation**

The PING90 system is NOT currently a proven integration boundary. It is a similar implementation living in a different subsystem with:

- Different data contracts
- Different event protocols
- Different validation behavior
- Different runtime assumptions

### Correct Implementation Conclusion
"Data attributes remain the smallest legitimate integration point because PING90 EditableSlot is NOT proven in HPP runtime and requires significant architectural adaptation to be compatible with the Workbench."

### Required Resolution Path
1. **Choose one:**
   - Adapt PING90 to Workbench protocol (major PING90 changes)
   - Adapt Workbench to PING90 protocol (major Workbench changes)
   - Use data attributes (minimal changes, constitutional with proper validation)

2. **If choosing PING90 adaptation:**
   - Add currentMediaId, route, section to SlotRegistration
   - Add event emission to EditableSlot
   - Establish canonical slot-ID scheme
   - Resolve singleton scope collision
   - Test server/client props serialization
   - THEN integrate

3. **If choosing data attributes:**
   - Add strict validation to prevent authority divergence
   - Treat as derived, non-authoritative runtime metadata
   - Establish source of truth (authority files)
   - Prove registry cannot accept stale identity
   - THEN implement

### Status
**FORENSIC GATE 2: FAIL - PING90 INTEGRATION NOT PROVEN**

**NO IMPLEMENTATION AUTHORIZED UNTIL:**
- Registry compatibility resolved
- Event protocol compatibility resolved
- Slot-ID scheme established
- Props serialization proven
- Behavioral changes quantified

---

## I. CATEGORY CORRECTION

### Previous Incorrect Classification
- "Instrumentation-only" - INCORRECT

### Correct Classification
1. **Instrumentation:** Adding EditableSlot wrappers (minimal)
2. **Runtime integration:** Registry substitution (major)
3. **Behavioral change:** Validation differences (significant)

### Impact Assessment
- **Instrumentation:** Low risk, minimal changes
- **Runtime integration:** HIGH RISK, incompatibility proven
- **Behavioral change:** MEDIUM RISK, validation differences

### Recommendation
**DO NOT CALL THIS "INSTRUMENTATION-ONLY"**

This is a major architectural integration with:
- Registry substitution
- Event protocol changes
- Validation behavior changes
- Singleton scope collision

---

## J. FINAL RECOMMENDATION

### Recommended Path
**Use data attributes with strict validation**

### Rationale
1. **Proven minimal invasiveness:** Data attributes require smallest changes
2. **Constitutional compliance:** Can be implemented as derived runtime metadata
3. **No architectural substitution:** No registry replacement required
4. **No behavioral changes:** Validation can be added without changing existing behavior
5. **Lower risk:** Proven pattern, predictable outcomes

### Required Safeguards
1. **Explicit derived metadata classification:** Document as non-authoritative
2. **Source of truth identification:** Authority files only
3. **Validation architecture:** Prevent stale/contradictory identity
4. **Consistency checks:** Validate against authority on every registration
5. **Fallback to authority:** Never trust data attributes as source of truth

### Alternative Path (If PING90 Required)
1. **Adapt PING90 to Workbench protocol:** Add missing fields, add event emission
2. **Establish slot-ID scheme:** Canonical naming for singleton/collection/paired slots
3. **Test server/client boundary:** Prove props serialization in HPP runtime
4. **Resolve singleton collision:** Namespace separation or unified registry
5. **Quantify behavioral changes:** Measure validation impact
6. **THEN integrate with full compatibility testing**

### Status
**FORENSIC GATE 2 COMPLETE - NO IMPLEMENTATION AUTHORIZED**

**AWAITING DECISION:**
- Data attributes with validation (recommended)
- PING90 adaptation (requires significant work)
- Alternative integration path (to be identified)
