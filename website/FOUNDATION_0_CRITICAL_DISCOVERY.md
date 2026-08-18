# CRITICAL DISCOVERY: VisualSlot Not Actually Used

## Finding

After implementing FOUNDATION 0, inspection reveals that **VisualSlot is not actually used anywhere in the current website codebase**.

## Evidence

**Grep results:**
- No `import.*VisualSlot` found in `src/app/`
- No `from.*visual-slot` found in `src/`
- Only matches are in the component definition itself

**Current implementation:**
- Homepage hero: Direct `<Image>` with no VisualSlot wrapper
- Owner portrait: Direct `<Image>` with no VisualSlot wrapper  
- Service cards: Direct `<Image>` with no VisualSlot wrapper
- Project images: Direct `<Image>` or `<img>` with no VisualSlot wrapper

## Consequence

The forensic report's assumption that VisualSlot wraps production images is **incorrect**.

**Current state:**
- VisualSlot component exists but is unused
- slot-registry exists but receives no registrations
- SLOT_REGISTER messages are never sent because no VisualSlot mounts
- SLOT_CLICK cannot be tested because no VisualSlot exists to click

## Architectural Implication

The forensic report identified two possible approaches:

1. **Use existing VisualSlot infrastructure** - ASSUMED this was already wrapping images
2. **Add new instrumentation** - ASSUMED this was not needed because VisualSlot existed

**Reality:**
- VisualSlot exists but is not integrated into production components
- No image slots are currently registered
- The slot registry is a dormant system

## Revised Foundation Requirements

Before SLOT_CLICK can be tested, one of two paths must be chosen:

**Path A: Activate existing VisualSlot**
- Wrap actual production images with VisualSlot components
- This would require modifying production page.tsx, service-card.tsx, project-spotlight.tsx, etc.
- This touches production code (violates "no production changes" boundary)

**Path B: Add instrumentation without VisualSlot**
- Use alternative instrumentation (e.g., Image component augmentation, MutationObserver)
- This would be a new foundation, not activating existing unused code

## Verification Gate Status

**Current verification gates CANNOT be met:**
- ❌ Preview registers slots - No VisualSlot to register
- ❌ Clicking a slot produces SLOT_CLICK - No VisualSlot to click
- ❌ Parent receives the correct slot - No slots exist

## Next Decision Required

The user must decide:

1. **Activate VisualSlot** - Modify production components to wrap images with VisualSlot
2. **Alternative instrumentation** - Create a different foundation that doesn't require VisualSlot
3. **Abandon slot-based approach** - Use a different interaction model entirely

This is a critical architectural pivot point that cannot be resolved without user direction.
