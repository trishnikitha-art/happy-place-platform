# FOUNDATION 0: Iframe Preview Context Handshake Plan

## Problem Statement

Current architecture cannot distinguish between:
- Public website (standalone)
- Website embedded in Workbench preview iframe
- Workbench application itself

Current detection logic: `window.location.pathname.startsWith('/workbench')`
- Only detects: "Is this document on a /workbench route?"
- Does NOT detect: "Am I embedded in Workbench preview?"
- iframe loads production routes (/, /about, etc.) so test fails
- Result: SLOT_CLICK unreachable in preview iframe

## Architectural Requirements

### Three Distinct Contexts

**Context A: Public Website**
- URL: `https://happyplacecarpentry.com/*`
- Behavior: No Workbench interaction, no visual changes, no geometry traffic
- VisualSlot: Invisible wrapper, no click handlers, no postMessage

**Context B: Workbench Preview Iframe**
- URL: `https://happy-place-platform.vercel.app/*` (inside iframe)
- Parent: Workbench application at localhost or deployed domain
- Behavior: SLOT_REGISTER, SLOT_CLICK, future SLOT_GEOMETRY
- VisualSlot: Interactive wrapper, click handlers, postMessage enabled

**Context C: Workbench Application**
- URL: `http://localhost:3000/workbench/*` or deployed workbench
- Behavior: Parent-side logic, receives messages, manages slot registry
- slot-registry: Receives SLOT_REGISTER, SLOT_UNREGISTER, SLOT_CLICK

### Security Boundary Requirements

**Outbound messages (iframe → parent):**
- Must use specific origin, not `"*"`
- Expected origin: Workbench application domain
- Validation: Hardcoded or configured Workbench origin

**Inbound messages (parent → iframe):**
- Must validate `event.origin` against expected Workbench origin
- Must validate `event.source === expectedIframeWindow`
- Must only accept known message types

**Message types:**
- `WORKBENCH_PREVIEW_INIT` (parent → iframe)
- `SLOT_REGISTER` (iframe → parent)
- `SLOT_UNREGISTER` (iframe → parent)
- `SLOT_CLICK` (iframe → parent)
- Future: `SLOT_GEOMETRY` (iframe → parent)

## Proposed Handshake Protocol

### Phase 1: Initialization (Parent → Iframe)

**Workbench sends:**
```typescript
window.parent.postMessage({
  type: 'WORKBENCH_PREVIEW_INIT',
  workbenchOrigin: 'http://localhost:3000', // or deployed origin
  sessionId: 'optional-session-id'
}, 'https://happy-place-platform.vercel.app');
```

**Iframe receives:**
```typescript
window.addEventListener('message', (event) => {
  if (event.data.type === 'WORKBENCH_PREVIEW_INIT') {
    // Validate origin
    if (event.origin !== expectedWorkbenchOrigin) return;
    
    // Set preview context flag
    isWorkbenchPreview = true;
    workbenchOrigin = event.data.workbenchOrigin;
    
    // Acknowledge
    event.source.postMessage({
      type: 'WORKBENCH_PREVIEW_ACK',
      previewUrl: window.location.href
    }, event.origin);
  }
});
```

### Phase 2: Acknowledgment (Iframe → Parent)

**Parent receives acknowledgment:**
```typescript
window.addEventListener('message', (event) => {
  if (event.data.type === 'WORKBENCH_PREVIEW_ACK') {
    // Validate origin
    if (event.origin !== 'https://happy-place-platform.vercel.app') return;
    
    // Mark iframe as ready
    iframeReady = true;
    
    // Now VisualSlot registrations will work with click handling
  }
});
```

### Phase 3: Slot Registration (Iframe → Parent)

**VisualSlot behavior changes:**
```typescript
// OLD (broken):
const isWorkbenchMode = window.location.pathname.startsWith('/workbench');

// NEW (correct):
const isWorkbenchPreview = isWorkbenchPreview || isWorkbenchMode;
```

**SLOT_REGISTER message:**
```typescript
window.parent.postMessage({
  type: 'SLOT_REGISTER',
  slot: { ...slotData },
}, workbenchOrigin); // Use specific origin, not '*'
```

### Phase 4: Slot Click (Iframe → Parent)

**VisualSlot click handler:**
```typescript
onClick={() => {
  if (isWorkbenchPreview && window.parent !== window) {
    window.parent.postMessage({
      type: 'SLOT_CLICK',
      slot: { id, route, page, section, slotName, currentMediaId },
    }, workbenchOrigin);
  }
}}
```

## Implementation Plan

### Files to Modify

**1. `src/lib/slot-registry.ts`**
- Add context state: `isWorkbenchPreview`, `workbenchOrigin`
- Add WORKBENCH_PREVIEW_INIT message handler
- Add origin validation on all received messages
- Change outbound postMessage to use specific origin
- Add WORKBENCH_PREVIEW_ACK response

**2. `src/components/visual-slot.tsx`**
- Change context detection from pathname to preview flag
- Use slot-registry context state instead of local detection
- Ensure click handler uses specific origin
- Add workbench-mode visual feedback only when preview context active

**3. `src/app/workbench/media/page.tsx`**
- Add WORKBENCH_PREVIEW_INIT send on iframe load
- Add WORKBENCH_PREVIEW_ACK receive handler
- Add origin validation on all received messages
- Store iframe reference for source validation
- Add expected origin configuration

**4. `src/app/workbench/preview/[...path]/page.tsx`**
- Optional: Add preview context initialization script
- Or rely on parent-to-child postMessage only

### Configuration

**Expected origins:**
```typescript
// Development
const WORKBENCH_ORIGIN = 'http://localhost:3000';
const PREVIEW_ORIGIN = 'https://happy-place-platform.vercel.app';

// Production (when deployed)
const WORKBENCH_ORIGIN = 'https://workbench.happyplacecarpentry.com';
const PREVIEW_ORIGIN = 'https://happy-placecarpentry.com';
```

**Environment variables:**
```bash
NEXT_PUBLIC_WORKBENCH_ORIGIN=http://localhost:3000
NEXT_PUBLIC_PREVIEW_ORIGIN=https://happy-place-platform.vercel.app
```

## Security Considerations

### Origin Validation

**On receive:**
```typescript
if (event.origin !== EXPECTED_WORKBENCH_ORIGIN) {
  console.warn('Rejected message from unauthorized origin:', event.origin);
  return;
}
```

**On send:**
```typescript
window.parent.postMessage(message, EXPECTED_WORKBENCH_ORIGIN);
```

### Source Validation

**On receive:**
```typescript
if (event.source !== expectedIframe.contentWindow) {
  console.warn('Rejected message from unexpected source');
  return;
}
```

### Message Type Whitelist

**Only accept:**
- WORKBENCH_PREVIEW_INIT
- WORKBENCH_PREVIEW_ACK
- SLOT_REGISTER
- SLOT_UNREGISTER
- SLOT_CLICK
- Future: SLOT_GEOMETRY

**Reject everything else:**
```typescript
const ALLOWED_MESSAGE_TYPES = [
  'WORKBENCH_PREVIEW_INIT',
  'WORKBENCH_PREVIEW_ACK',
  'SLOT_REGISTER',
  'SLOT_UNREGISTER',
  'SLOT_CLICK'
];

if (!ALLOWED_MESSAGE_TYPES.includes(event.data.type)) {
  console.warn('Rejected unknown message type:', event.data.type);
  return;
}
```

## Acceptance Test

### Test 1: Public Website
**Setup:** Open `https://happyplacecarpentry.com` directly
**Expected:**
- No WORKBENCH_PREVIEW_INIT received
- isWorkbenchPreview = false
- VisualSlot: No click handlers, no postMessage
- No visual changes (no dashed outlines)
- Console: No Workbench-related messages

### Test 2: Workbench Preview Iframe
**Setup:** Open Workbench, navigate to homepage preview
**Expected:**
- Parent sends WORKBENCH_PREVIEW_INIT
- Iframe receives and validates origin
- Iframe sends WORKBENCH_PREVIEW_ACK
- Parent receives acknowledgment
- isWorkbenchPreview = true
- VisualSlot: Click handlers enabled, postMessage works
- SLOT_CLICK messages reach parent
- Visual changes: Dashed outlines appear in preview

### Test 3: Security Validation
**Setup:** Attempt to send fake WORKBENCH_PREVIEW_INIT from unauthorized origin
**Expected:**
- Message rejected
- isWorkbenchPreview remains false
- Console warning logged
- No SLOT_REGISTER/SLOT_CLICK messages accepted

### Test 4: Source Validation
**Setup:** Attempt to send SLOT_REGISTER from unexpected window
**Expected:**
- Message rejected
- Console warning logged
- Slot not registered in Workbench

## Rollback Plan

**If handshake fails:**
1. Remove WORKBENCH_PREVIEW_INIT/ACK logic
2. Revert to pathname-based detection
3. Restore `"*"` origin (temporary)
4. SLOT_CLICK becomes unreachable again (current state)

**If security validation too strict:**
1. Log all rejected messages with details
2. Adjust origin matching rules
3. Add debug mode for development

## Blast Radius

**Limited to:**
- Workbench preview iframe communication
- VisualSlot context detection
- slot-registry message handling
- Workbench media page initialization

**Does NOT affect:**
- Production website behavior
- Authority contracts (Brand, Projects, Media)
- Image pipeline
- Public website rendering
- Existing slot registration (already works)

## Next Foundation Dependencies

**After FOUNDATION 0 is verified:**
- FOUNDATION 1: Secure the bridge (comprehensive origin/source validation)
- FOUNDATION 2: Make slot interaction actually reachable (prove SLOT_CLICK works end-to-end)
- FOUNDATION 3: Add runtime geometry
- FOUNDATION 4: Add resize/scroll invalidation
- FOUNDATION 5: Hit testing
- FOUNDATION 6: Drag/drop mutation

## Implementation Order

1. Add context state to slot-registry
2. Add WORKBENCH_PREVIEW_INIT handler to slot-registry
3. Add origin validation to slot-registry
4. Modify VisualSlot to use context state
5. Add WORKBENCH_PREVIEW_INIT send to Workbench media page
6. Add WORKBENCH_PREVIEW_ACK handler to Workbench media page
7. Add origin validation to Workbench media page
8. Test all four acceptance tests
9. Only then proceed to FOUNDATION 1 (comprehensive security)

## Critical Success Criteria

**MUST achieve:**
- ✅ Public website: No Workbench interaction
- ✅ Workbench iframe: SLOT_CLICK functional
- ✅ Security: Origin validation on all messages
- ✅ Security: Source validation on critical messages
- ✅ Security: Message type whitelist
- ✅ No regression in existing SLOT_REGISTER functionality

**MUST NOT:**
- ❌ Break production website
- ❌ Expose Workbench interaction to public visitors
- ❌ Accept messages from unauthorized origins
- ❌ Use `"*"` origin in production
- ❌ Make any iframe embedding a Workbench (must be explicit)
