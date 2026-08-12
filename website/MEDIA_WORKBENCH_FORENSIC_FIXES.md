# Media Workbench Forensic Fixes

## Summary

Fixed critical rendering bugs in the Media Workbench and reconciled DRIVE_ONLY assets that exist in the canonical Drive graph but not in the current physical filesystem.

## Issues Fixed

### 1. Scrolling Issue (Blocking)
**Problem:** Only 6 of 16 assets were visible due to fixed-height viewport constraint (h-screen + overflow-hidden).

**Root Cause:** The page used `h-screen` with `overflow-hidden`, preventing the document from growing beyond the viewport.

**Fix:**
- Changed `h-screen` to `min-h-screen` to allow document to grow
- Removed `overflow-hidden` from main container
- Made toolbar sticky so it stays visible while scrolling
- Removed `overscroll-behavior-contain` from all panels

**Result:** All 16 assets now accessible via natural scrolling.

### 2. Variant Key Mismatch (Rendering Bug)
**Problem:** Components accessed `variants.web` but media.v1.json uses `variants.webp`, preventing images from rendering even when mediaIds were correct.

**Files Fixed:**
- `src/components/project-photos.tsx`
- `src/app/our-work/OurWorkClient.tsx`
- `src/app/page.tsx`
- `src/app/workbench/media/page.tsx`

**Result:** Images now render correctly with the correct variant key.

### 3. Brand Asset References (Broken Links)
**Problem:** brand.v1.json referenced non-existent mediaIds (homepage-hero-canonical, brand-portrait) causing broken image lookups.

**Fix:** Set both mediaIds to null to use gradient/overlay fallbacks as designed.

**Files Fixed:**
- `src/config/brand.v1.json`

**Result:** Brand sections now fall back to designed gradient/overlay instead of attempting broken lookups.

### 4. DRIVE_ONLY Asset Classification (404 Resolution)
**Problem:** Feature-Fence-Photo.jpg, HP0017_ExteriorPainting_After.jpg, HP0017_ExteriorPainting_Before.jpg were referenced in projections but didn't exist in physical filesystem, causing 404 errors.

**Root Cause:** These assets exist in the canonical Drive graph (metadata/canonical-media-graph.json) but were never deployed to the physical filesystem (public/images/).

**Solution:** Added DRIVE_ONLY classification to preserve them as canonical Drive evidence without requiring physical deployment.

**Files Modified:**
- `src/config/media.v1.json` - Added drive_canonical, physical_deployment flags to provenance
- `src/lib/visual-asset-registry.ts` - Added DRIVE_ONLY classification and getDriveOnlyAssets()
- `src/app/workbench/media/page.tsx` - Added Drive Only filter, badge, and statistics
- `src/types/media.ts` - Extended Media.provenance type

**Result:** DRIVE_ONLY assets are now properly classified, filterable, and distinguished from missing assets. They can be recovered from Drive when needed.

## Current State

### Asset Counts
- **Total media entries:** 16
- **Present + Mapped:** 13
- **DRIVE_ONLY:** 3 (Feature-Fence-Photo.jpg, HP0017_ExteriorPainting_After.jpg, HP0017_ExteriorPainting_Before.jpg)
- **August Recoverable:** 10 (from August 3 baseline with Drive IDs)
- **Empty Slots:** 8

### DRIVE_ONLY Assets
These assets exist in the canonical Drive graph but not in the physical filesystem:

1. **Feature-Fence-Photo.jpg** (d9cd3d37-eea1-54a9-92f6-abd1e1f71c58)
   - Drive path: H:\My Drive\Happy Place Carpentry\Photos\Featured Projects\Feature-Fence-Photo.jpg
   - Status: DRIVE_ONLY - exists in canonical Drive graph but not in current physical filesystem

2. **HP0017_ExteriorPainting_After.jpg** (1ebc9012-b788-5045-809c-9013d31f42be)
   - Status: DRIVE_ONLY - exists in canonical Drive graph but not in current physical filesystem

3. **HP0017_ExteriorPainting_Before.jpg** (2ebc9012-b788-5045-809c-9013d31f42be)
   - Status: DRIVE_ONLY - exists in canonical Drive graph but not in current physical filesystem

### Media Workbench Features
- Natural scrolling through all assets
- Sticky toolbar with summary statistics
- Filters: All, Present+Mapped, Present+Unmapped, ReferencedMissing, AugustRecoverable, DriveOnly, OrphanedVariant
- Classification badges with icons
- Physical status badges (Present, Missing, Recoverable, Drive Only)
- Summary statistics cards showing key metrics
- Three-panel layout with natural scroll zones
- Drag-and-drop slot targeting foundation

## Architecture Notes

### Constitutional Behavior
The DRIVE_ONLY classification preserves the constitutional principle that the canonical Drive graph is the source of truth. Assets that exist in the Drive graph are canonical evidence, even if they haven't been deployed to the physical filesystem yet.

### Projection Artifacts
The constitutional projection generator correctly includes DRIVE_ONLY assets in projections (gallery-projection.json), as they are part of the canonical graph. This is the intended behavior - projections reflect the canonical state, not the deployment state.

### Recovery Path
DRIVE_ONLY assets can be recovered from Drive using the existing Drive adapter infrastructure when needed for physical deployment.

## Commits

1. `37e5828` - Fix Media Workbench scrolling and variant key mismatch
2. `f17ff60` - Fix brand mediaId references and homepage variant key
3. `285f5ec` - Fix Media Workbench layout to allow natural scrolling
4. `66ed353` - Add DRIVE_ONLY classification for Drive-canonical assets without physical files
5. `e034bfb` - Fix TypeScript errors for DRIVE_ONLY classification
6. `2648ec4` - Add physical status badge to Media Workbench asset cards
7. `417a100` - Add summary statistics to Media Workbench

## Build Status

✅ Build passes with 51 pages generated
✅ Zero TypeScript errors
✅ Projections regenerated successfully
✅ All 16 assets visible and scrollable
