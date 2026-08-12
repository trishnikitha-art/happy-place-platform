# Drive Source Forensic Map

**Date:** 2026-08-12
**Purpose:** Reconstruct the authoritative Drive sources for HPP media
**Context:** August 3 baseline reconstruction

---

## EXECUTIVE SUMMARY

**TWO DRIVE STRUCTURES EXIST:**

1. **H:\My Drive\Happy Place Media\** (Personal Drive - Working Assets)
   - Contains: Website Library (Hero, Projects, Brand)
   - 27 files referenced in master_asset_inventory.csv
   - Used for: Working assets, photo intake, project organization

2. **H:\Shared drives\Happy Place Carpentry Website** (Shared Drive - Production Assets)
   - Contains: Featured Projects, Before & Afters (organized by service)
   - 31 files referenced in MediaInventory.json
   - Used for: Production media, before/after documentation

**CONSTITUTIONAL AUTHORITY:** H:\Shared drives\Happy Place Carpentry Website
**MIGRATION SOURCE (Historical):** H:\My Drive\PIPING90

---

## DRIVE STRUCTURE 1: PERSONAL DRIVE

### Path: H:\My Drive\Happy Place Media\

### Structure:
```
H:\My Drive\
└── Happy Place Media\
    └── Website Library\
        ├── Hero\
        │   └── ?? DROP HERO IMAGE HERE\
        │       └── hero-background-enhanced.jpg
        ├── Brand\
        │   └── ?? DROP BRAND ASSETS HERE\
        ├── Projects\
        │   ├── Johnson Cedar Fence\
        │   │   ├── ?? DROP NEW PHOTO HERE\
        │   │   │   └── FENCE BUILD.jpg
        │   │   └── ?? OLD PHOTOS\
        │   │       └── FENCEREBUILDMATCHINGSTAIN.png
        │   ├── Smith Built-Ins\
        │   │   ├── ?? DROP NEW PHOTO HERE\
        │   │   │   └── FINISHEDCARPENTRY.png
        │   │   └── ?? OLD PHOTOS\
        │   │       └── FINISHEDCARPENTRY0.png
        │   ├── Wilson Home Repairs\
        │   │   ├── ?? DROP NEW PHOTO HERE\
        │   │   │   └── TRIMREPAIR.png
        │   │   └── ?? OLD PHOTOS\
        │   │       ├── DRYWALL.png
        │   │       ├── FLOOR.png
        │   │       ├── GUTTERCLEANING.jpg
        │   │       ├── FLOOR0.jpg
        │   │       ├── IMG_0544.JPG
        │   │       └── IMG_0546.JPG
        │   ├── Davis Bathroom Remodel\
        │   │   └── ?? DROP NEW PHOTO HERE\
        │   │       └── BATHROOM_WALL.png
        │   └── Martinez Pergola\
        │       ├── ?? DROP NEW PHOTO HERE\
        │       │   └── HOMESERVICEPROJECTPERGOLAS.jpg
        │       └── ?? OLD PHOTOS\
        │           └── 1.png
        └── ?? DROP FEATURED IMAGE HERE\
            └── featured.jpeg
```

### Files (27):
1. hero-background-enhanced.jpg (Hero)
2. FENCE BUILD.jpg (Fences - Johnson Cedar Fence)
3. FENCEREBUILDMATCHINGSTAIN.png (Fences - Old)
4. FINISHEDCARPENTRY.png (Built-Ins - Smith Built-Ins)
5. FINISHEDCARPENTRY0.png (Built-Ins - Old)
6. TRIMREPAIR.png (Repairs - Wilson Home Repairs)
7. DRYWALL.png (Repairs - Old)
8. FLOOR.png (Repairs - Old)
9. GUTTERCLEANING.jpg (Repairs - Old)
10. FLOOR0.jpg (Repairs - Old)
11. IMG_0544.JPG (Repairs - Old)
12. IMG_0546.JPG (Repairs - Old)
13. BATHROOM_WALL.png (Bathroom - Davis Bathroom Remodel)
14. HOMESERVICEPROJECTPERGOLAS.jpg (Pergolas - Martinez Pergola)
15. 1.png (Pergolas - Old)
16. featured.jpeg (Featured)
17. hero.jpeg (Brand)
18. portrait.jpeg (Brand)
... plus additional outdoor living images

### Purpose:
- Working photo intake
- Project organization by job
- Brand asset management
- Hero asset management

---

## DRIVE STRUCTURE 2: SHARED DRIVE

### Path: H:\Shared drives\Happy Place Carpentry Website

### Structure:
```
H:\Shared drives\Happy Place Carpentry Website\
├── Featured Projects\
│   └── Feature-Fence-Photo.jpg
├── Drywall Before & Afters\
│   ├── HP001_DrywallRepair_WallDamage_After.jpg
│   ├── HP001_DrywallRepair_WallDamage_Before.jpeg
│   ├── HP009_DrywallRepair_After_Primed.jpg
│   └── HP009_DrywallRepair_Before.jpg
├── Painting Before & Afters\
│   ├── HP002_ExteriorPainting_House_Before.jpg
│   ├── HP002_ExteriorPainting_House_After.jpg
│   ├── HP006_ExteriorPainting_House_Before.jpg
│   ├── HP006_ExteriorPainting_House_After.jpg
│   ├── HP010_ExteriorPainting_House_After.jpg
│   └── HP010_ExteriorPainting_House_Before.jpg
├── Fencing Before & Afters\
│   ├── HP012_FenceRebuild_Before.jpg
│   └── HP012_FenceRebuild_After.jpg
├── Finish Carpentry Before & Afters\
│   ├── HP013_WindowFrameRefinish_Before.jpg
│   └── HP013_WindowFrameRefinish_After.jpg
└── Other Before & Afters\
    ├── HP003_ShedConstruction_After.jpg
    ├── HP003_ShedConstruction_Before.jpg
    ├── HP004_SidingRepair_After.jpeg
    ├── HP004_SidingRepair_Before.jpeg
    ├── HP007_SidingRotRepair_After.jpeg
    ├── HP007_SidingRotRepair_Before.jpeg
    ├── HP008_AtticAccessDoorInstallation_After_Open.jpg
    ├── HP008_AtticAccessDoorInstallation_After_Closed.jpg
    ├── HP005_DoorReplacement_Before.jpeg
    ├── HP005_DoorReplacement_After.jpeg
    ├── HP015_VinylFlooring_Before.jpg
    ├── HP015_VinylFlooring_After.jpg
    ├── HP014_VinylFlooring_Before.jpg
    ├── HP011_SubfloorReplacement_Before.jpg
    └── HP011_SubfloorReplacement_After.jpg
```

### Files (31):
- 1 Featured Projects image
- 4 Drywall Before & Afters (2 pairs)
- 6 Painting Before & Afters (3 pairs)
- 2 Fencing Before & Afters (1 pair)
- 2 Finish Carpentry Before & Afters (1 pair)
- 16 Other Before & Afters (8 pairs)

### Purpose:
- Production media library
- Before/after documentation by service
- Project-specific media (HP001, HP002, etc.)
- Collaborative access

---

## AUGUST 3 BASELINE VS CURRENT STATE

### August 3 Baseline (21 assets):
**Source:** H:\My Drive\Happy Place Media\ (Personal Drive)
- 21 media assets with driveId fields
- 6 projects with complete media references
- Full variant paths (original, web, webp, avif, thumbnail)
- Drive IDs like: "fences-001-master", "brand-hero-001", etc.

### Current State (4 assets):
**Source:** Unknown (driveId fields removed)
- 4 media assets only
- 3 projects only
- No Drive IDs
- Simplified variants (original + web only)

### Missing from Current:
- 17 baseline media assets
- 3 baseline projects
- All Drive ID mappings
- Full variant structure

---

## DRIVE REORGANIZATION PROJECT (COMPLETED)

**File:** `generated/DRIVE-REORGANIZATION-COMPLETE.md`

**Completed:**
- 26 images organized into H:\My Drive\ structure
- Project-based folders created (Hero/, Brand/, Projects/001-006/)
- Drive ID mappings generated for all entries
- Complete mapping table: `generated/drive-mapping-final.json`

**Structure Created:**
```
H:\My Drive\
├── Hero/
│   ├── MASTER/
│   └── Variants/
├── Brand/
│   ├── MASTER/
│   └── Variants/
└── Projects/
    ├── 001 - Johnson Cedar Fence/
    ├── 002 - Smith Built-Ins/
    ├── 003 - Wilson Home Repairs/
    ├── 004 - Thompson Exterior Painting/
    ├── 005 - Davis Bathroom Remodel/
    └── 006 - Martinez Pergola/
```

**Status:** COMPLETE - All files verified in correct locations

---

## CANONICAL MEDIA AUTHORITY

**File:** `analysis/CANONICAL_MEDIA_AUTHORITY.md`

**Constitutional Authority:** H:\Shared drives\Happy Place Carpentry Website
**Migration Source (Historical):** H:\My Drive\PIPING90

**Assets Imported from Shared Drive:**
- 43 original photos
- 63.26 MB total
- 5 services represented (drywall, fencing, painting, finish-carpentry, other)
- 42 before/after pairs
- 10 hero candidates

**Status:** MIGRATION COMPLETE - All 43 files imported to repository

---

## RECOMMENDED RECONSTRUCTION PLAN

### Phase 1: Restore August 3 Media Registry
1. Restore `media.v1.json` to 21 assets from `archive/legacy-runtime/media.v1.json`
2. Restore `projects.v1.json` to 6 projects from August 3 baseline
3. Verify all Drive IDs are present

### Phase 2: Map Drive Sources
1. Connect Personal Drive (H:\My Drive\Happy Place Media\) via existing OAuth
2. Verify Shared Drive (H:\Shared drives\Happy Place Carpentry Website) access
3. Reconcile which Drive is authoritative for which asset class

### Phase 3: Reconnect Variants
1. Restore full variant paths (original, web, webp, avif, thumbnail)
2. Verify all variant files exist on disk
3. Regenerate missing variants via image pipeline

### Phase 4: Constitutional Integration
1. Map Drive IDs to canonical media graph
2. Establish Drive source as provenance authority
3. Connect to PING90 constitutional identity/provenance

### Phase 5: Workbench Integration
1. Mount real Drive connector into Workbench
2. Display actual Drive file locations
3. Enable Drive actions (open, sync, replace)

---

## KEY FINDINGS

1. **Two Drive systems exist** - Personal (working) and Shared (production)
2. **August 3 used Personal Drive** - with 21 assets and full Drive IDs
3. **Constitutional authority is Shared Drive** - 43 production assets
4. **Drive reorganization completed** - 26 assets organized into project structure
5. **Current state lost Drive mappings** - driveId fields removed
6. **PING90 is historical only** - no runtime dependency

---

## NEXT STEPS

1. **Investigate existing Drive connector** - `src/lib/drive/` for OAuth/session handling
2. **Test Drive access** - verify both Personal and Shared Drive connectivity
3. **Restore media.v1.json** - bring back 21-asset state with Drive IDs
4. **Map to August 3 baseline** - ensure UI matches exactly
5. **Connect to constitutional graph** - establish provenance chain
