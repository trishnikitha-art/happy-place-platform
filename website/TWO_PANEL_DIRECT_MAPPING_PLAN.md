# READ-ONLY PLAN: TWO-PANEL DIRECT VISUAL MAPPING INTERFACE

**Date**: Aug. 14, 2026  
**Directive**: READ-ONLY architectural plan for direct drag-and-drop photo mapping  
**Reference**: Current unified three-column interface → desired two-panel direct mapping  
**Context**: User wants direct visual mapping, not modal-based slot assignment

---

## 1. CURRENT STATE ANALYSIS

### Existing Architecture (from conversation context)

**Current Workbench Interface**:
- Three-column layout: LEFT (website preview) + MIDDLE (photo grid) + RIGHT (slot list)
- Mode toggle was previously used (Mapping vs Ordering)
- Now merged into unified interface with all features side-by-side
- Confirmation dialogs for slot assignments
- Checkpoint/revert mechanism
- Lenis disabled for native touchpad scrolling
- 25 canonical photos displayed (duplicate excluded)

**Key Components**:
- `src/app/workbench/media/page.tsx` - Main workbench page
- `src/app/workbench/media/page-ordering.tsx` - Ordering panel (now merged)
- `src/lib/visual-asset-registry.ts` - Asset management
- `src/lib/slot-registry.ts` - Slot registration system
- `src/lib/workbench-ordering.ts` - Ordering persistence
- `src/components/lenis-provider.tsx` - Scroll behavior

**Data Flow**:
1. Load canonical media from `media.v1.json` (25 photos)
2. Display in grid with search/filter
3. Drag photo to slot in right panel
4. Confirmation dialog appears
5. Update slot assignment via API
6. Reload canonical data

### User Feedback on Current Interface

**User dislikes**:
- Three-column layout (too complex)
- Indirect slot assignment (drag to slot list, not to visual spot)
- Confirmation dialogs (adds friction)
- Manual ordering separation (wants everything integrated)

**User wants**:
- Two-panel layout (simpler)
- Direct drag-to-spot mapping (drag photo directly onto website preview)
- Automatic variant enhancement (process on drop, no manual steps)
- Visual drop zones (see exact spots in preview)

---

## 2. DESIRED TWO-PANEL ARCHITECTURE

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ WORKBENCH TOOLBAR                                           │
│ [Reload] [Reset to MAIN] [Save Mapping] [Checkpoint] [Revert]│
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────┬───────────────────────────────┐
│ LEFT: WEBSITE PREVIEW       │ RIGHT: PHOTO GALLERY         │
│ (iframe)                    │ (25 canonical photos)       │
│                             │                              │
│ [Interactive with]          │ [Drag photos from here]     │
│ [visual drop zones]         │                              │
│                             │ [Search/filter]             │
│ ┌─────────────────────┐     │ [Drag to preview spots]     │
│ │ Website page renders │     │                              │
│ │ with overlay zones  │     │ ┌───────────────────────┐  │
│ │ highlighted          │     │ │ Photo 1 (thumbnail)   │  │
│ │                      │     │ │ Role badges            │  │
│ │ [Hero slot]          │◄────┤ │ Drag me → drop zone    │  │
│ │ [Before slot]        │◄────┤ │                        │  │
│ │ [After slot]         │◄────┤ └───────────────────────┘  │
│ │ [Gallery slots]      │◄────┤                              │
│ │                      │     │ ┌───────────────────────┐  │
│ │ [Brand slots]        │◄────┤ │ Photo 2 (thumbnail)   │  │
│ └─────────────────────┘     │ │ ...                    │  │
│                             │ └───────────────────────┘  │
│                             │                              │
│ Scrollable independently   │ Scrollable independently    │
└─────────────────────────────┴──────────────────────────────┘
```

### Panel Specifications

**LEFT PANEL - Website Preview**:
- Full-height iframe rendering actual website pages
- Visual drop zones overlaid on image locations
- Drop zones highlight on drag-over
- Shows current assigned photos in place
- Real-time preview of mapping changes
- Independent scrolling (native touchpad)

**RIGHT PANEL - Photo Gallery**:
- Grid of 25 canonical photos
- Search/filter capabilities
- Role badges (Hero, Before, After, Gallery, Brand)
- Drag-ready thumbnails
- Independent scrolling (native touchpad)
- Status indicators (used/unused)

---

## 3. TECHNICAL ARCHITECTURE PLAN

### Phase 1: Visual Drop Zone Detection

**Challenge**: Identify exact pixel locations of image slots in website preview

**Solution**:
1. **Slot Registration System** (existing: `src/lib/slot-registry.ts`)
   - Website components already register slots via `VisualSlot` component
   - Slots emit postMessage with their identity
   - Need to enhance to include pixel coordinates

2. **Coordinate Communication**:
   - `VisualSlot` component calculates its bounding box
   - Sends coordinates via postMessage to Workbench parent
   - Workbench renders overlay zones at exact positions

3. **Implementation Points**:
   - Modify `src/components/visual-slot.tsx` to emit `slot-coordinates` event
   - Include: `{ id, rect: { x, y, width, height }, page, section, slotName }`
   - Workbench parent receives coordinates and renders overlay zones

### Phase 2: Direct Drag-and-Drop

**Challenge**: Drag from right panel, drop on exact visual spot in left panel

**Solution**:
1. **Drag Start** (right panel):
   - HTML5 drag API with `dataTransfer.setData('mediaId', media.id)`
   - Visual feedback: ghost image of photo being dragged

2. **Drag Over** (left panel overlay):
   - Overlay zones detect drag events
   - Highlight compatible zones (role matching)
   - Show drop zone borders/animations

3. **Drop** (left panel overlay):
   - Zone receives `mediaId` from drag data
   - Validates compatibility (role check)
   - Triggers assignment + variant enhancement

### Phase 3: Automatic Variant Enhancement

**Challenge**: Process photo variants on drop without manual steps

**Solution**:
1. **Variant Generation Pipeline** (existing: `scripts/image-pipeline.mjs`)
   - Currently requires manual `npm run images` command
   - Need to trigger automatically on assignment

2. **API Endpoint for Variant Generation**:
   - Create `/api/workbench/generate-variants` endpoint
   - Accepts: `{ mediaId, targetSlot, targetDimensions }`
   - Invokes image pipeline for that specific photo
   - Returns: generated variant paths

3. **Assignment Flow**:
   ```
   Drop photo on zone
   ↓
   Validate role compatibility
   ↓
   Call /api/workbench/generate-variants
   ↓
   Image pipeline processes photo
   ↓
   Update media.v1.json with new variants
   ↓
   Update slot assignment in authority
   ↓
   Refresh preview with new photo
   ```

### Phase 4: Authority Updates

**Challenge**: Update MAIN authorities without breaking immutability

**Solution**:
1. **Workbench-Only Overlay** (existing pattern):
   - Workbench maintains temporary mapping state
   - Changes persist to localStorage only initially
   - MAIN authorities not modified until explicit save

2. **Save Mechanism**:
   - "Save Mapping" button commits changes to MAIN authorities
   - Updates: `brand.v1.json`, `projects.v1.json`, `media.v1.json`
   - Triggers Vercel build verification
   - Requires explicit user confirmation

3. **Rollback Safety**:
   - Checkpoint system saves previous state
   - "Revert" button restores checkpoint
   - MAIN authorities never directly modified during drag-drop

---

## 4. DETAILED IMPLEMENTATION STEPS

### Step 1: Enhance Slot Registry with Coordinates

**File**: `src/components/visual-slot.tsx`

**Changes**:
```typescript
// Add coordinate calculation
useEffect(() => {
  const rect = ref.current?.getBoundingClientRect();
  if (rect) {
    window.parent.postMessage({
      type: 'slot-coordinates',
      payload: {
        id: slot.id,
        rect: {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        },
        page: slot.page,
        section: slot.section,
        slotName: slot.slotName,
        role: slot.role
      }
    }, '*');
  }
}, []);
```

**File**: `src/app/workbench/media/page.tsx`

**Changes**:
- Listen for `slot-coordinates` messages
- Store coordinates in state
- Render overlay zones at exact positions

### Step 2: Render Visual Drop Zones

**File**: `src/app/workbench/media/page.tsx`

**New Component**:
```typescript
interface DropZone {
  id: string;
  rect: { x: number; y: number; width: number; height: number };
  role: string;
  currentMediaId: string | null;
}

function DropZoneOverlay({ zones, onDrop }: { zones: DropZone[], onDrop: (zoneId: string, mediaId: string) => void }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {zones.map(zone => (
        <div
          key={zone.id}
          className="absolute border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/10 transition-all pointer-events-auto"
          style={{
            left: zone.rect.x,
            top: zone.rect.y,
            width: zone.rect.width,
            height: zone.rect.height
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const mediaId = e.dataTransfer.getData('mediaId');
            onDrop(zone.id, mediaId);
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center text-xs text-primary">
            {zone.role}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Step 3: Simplify to Two-Panel Layout

**File**: `src/app/workbench/media/page.tsx`

**Layout Changes**:
```typescript
// Remove middle column, keep only left (preview) and right (gallery)
<div className="grid grid-cols-2 h-full">
  {/* LEFT: Website Preview with Drop Zones */}
  <section className="relative h-full">
    <iframe src={previewUrl} className="w-full h-full" />
    <DropZoneOverlay zones={dropZones} onDrop={handleDrop} />
  </section>

  {/* RIGHT: Photo Gallery */}
  <section className="overflow-y-auto">
    <PhotoGallery photos={canonicalPhotos} />
  </section>
</div>
```

### Step 4: Implement Variant Generation API

**New File**: `src/app/api/workbench/generate-variants/route.ts`

**Implementation**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  const { mediaId, targetSlot } = await request.json();

  try {
    // Trigger image pipeline for specific photo
    const command = `node scripts/image-pipeline.mjs --media-id ${mediaId}`;
    await execAsync(command);

    return NextResponse.json({ success: true, variants: generated });
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
```

### Step 5: Integrate Drop-to-Enhance Flow

**File**: `src/app/workbench/media/page.tsx`

**Handler**:
```typescript
const handleDrop = async (zoneId: string, mediaId: string) => {
  // 1. Validate role compatibility
  const zone = dropZones.find(z => z.id === zoneId);
  const media = canonicalPhotos.find(m => m.id === mediaId);
  
  if (!isRoleCompatible(zone.role, media.roles)) {
    alert('Photo role incompatible with slot');
    return;
  }

  // 2. Generate variants
  const response = await fetch('/api/workbench/generate-variants', {
    method: 'POST',
    body: JSON.stringify({ mediaId, targetSlot: zoneId })
  });

  // 3. Update mapping
  updateSlotAssignment(zoneId, mediaId);

  // 4. Refresh preview
  refreshPreview();
};
```

---

## 5. TECHNICAL RISKS & MITIGATIONS

### Risk 1: iframe Communication Security

**Issue**: postMessage between iframe and parent needs security

**Mitigation**:
- Use specific origin validation
- Implement message type checking
- Add nonce-based authentication

### Risk 2: Coordinate Drift

**Issue**: iframe coordinates may not match parent viewport

**Mitigation**:
- Recalculate coordinates on window resize
- Use `getBoundingClientRect()` dynamically
- Implement coordinate normalization

### Risk 3: Variant Generation Performance

**Issue**: Image processing may be slow during drag-drop

**Mitigation**:
- Show loading indicator during processing
- Process variants asynchronously
- Allow user to continue while processing

### Risk 4: MAIN Authority Corruption

**Issue**: Automatic updates could corrupt MAIN authorities

**Mitigation**:
- Maintain strict Workbench-only overlay
- Require explicit "Save Mapping" for MAIN updates
- Implement Git-based rollback capability

---

## 6. VALIDATION CHECKLIST

### Before Implementation
- [ ] Verify existing slot registry works correctly
- [ ] Test iframe postMessage communication
- [ ] Confirm image pipeline can process individual photos
- [ ] Validate role compatibility logic

### During Implementation
- [ ] Two-panel layout renders correctly
- [ ] Drop zones appear at correct coordinates
- [ ] Drag-and-drop works across iframe boundary
- [ ] Variant generation API responds correctly
- [ ] Preview updates after assignment

### After Implementation
- [ ] All 25 canonical photos display
- [ ] Drop zones highlight on drag-over
- [ ] Role validation prevents incompatible assignments
- [ ] Variants generate automatically on drop
- [ ] MAIN authorities unchanged until explicit save
- [ ] Checkpoint/revert works correctly
- [ ] Native touchpad scrolling preserved
- [ ] TypeScript compilation passes

---

## 7. FILE MODIFICATION SUMMARY

### Files to Modify
1. **src/app/workbench/media/page.tsx**
   - Remove middle column (three → two panels)
   - Add drop zone overlay rendering
   - Implement coordinate message listener
   - Add drop handler with variant generation
   - Remove confirmation dialogs (direct mapping)

2. **src/components/visual-slot.tsx**
   - Add coordinate calculation
   - Emit coordinate postMessage
   - Include role information

3. **src/lib/slot-registry.ts**
   - Enhance to store coordinates
   - Add coordinate query methods

### Files to Create
1. **src/app/api/workbench/generate-variants/route.ts**
   - New API endpoint for variant generation
   - Integration with existing image pipeline

### Files to Keep Unchanged
- `src/config/media.v1.json` (MAIN authority)
- `src/config/projects.v1.json` (MAIN authority)
- `src/config/brand.v1.json` (MAIN authority)
- `src/config/services.v1.json` (MAIN authority)
- `src/lib/visual-asset-registry.ts` (asset management)
- `src/lib/workbench-ordering.ts` (ordering persistence)
- `src/components/lenis-provider.tsx` (scroll behavior)

---

## 8. HARD BOUNDARIES

### Authorized
- Two-panel layout implementation
- Visual drop zone rendering
- Direct drag-and-drop mapping
- Automatic variant generation
- Workbench-only overlay persistence
- Checkpoint/revert mechanism

### Not Authorized
- Modifications to MAIN authorities during drag-drop
- Automatic MAIN authority updates without explicit save
- Changes to public website routes
- Drive credential modifications
- Git operations during implementation
- Deployment until explicit user authorization

---

## 9. SUCCESS CRITERIA

### User Experience
- User sees two panels (preview + gallery)
- User drags photo from gallery
- User drops photo directly on visual spot in preview
- Photo automatically processes variants
- Preview updates with new photo
- No confirmation dialogs required
- No manual steps for variant generation

### Technical
- Drop zones appear at exact pixel locations
- Role validation prevents incompatible assignments
- Variants generate asynchronously without blocking
- MAIN authorities unchanged until explicit save
- Checkpoint/revert works for safety
- Native touchpad scrolling preserved
- TypeScript compilation passes

### Authority Safety
- Workbench maintains temporary mapping state
- MAIN authorities never modified during drag-drop
- Explicit "Save Mapping" required for MAIN updates
- Git-based rollback capability preserved
- All existing forensic reports remain valid

---

**READ-ONLY PLAN COMPLETE**

**Next Step**: Await user approval before any implementation begins.

**Questions for User**:
1. Confirm two-panel layout (left = preview, right = gallery)
2. Confirm automatic variant generation on drop (no manual steps)
3. Confirm removal of confirmation dialogs (direct mapping)
4. Confirm preservation of checkpoint/revert mechanism
5. Confirm MAIN authority immutability during drag-drop
