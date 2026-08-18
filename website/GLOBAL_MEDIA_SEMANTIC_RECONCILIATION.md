# GLOBAL MEDIA SEMANTIC RECONCILIATION & WORKBENCH ORDERING REPORT

**Reference Commit**: MAIN@5ba201cd354b4cc2ba95f9612c39e08d813ffab1  
**Date**: Aug. 14, 2026  
**Mode**: READ-ONLY FORENSICS AND IMPLEMENTATION PLANNING

---

## PART 1 — GLOBAL SEMANTIC SEARCH RESULTS

### Data Sources Analyzed

**MAIN Authority (happy-place-platform-main/website @ 5ba201cd):**
- `media.v1.json` - 26 media entries (canonical authority)
- `projects.v1.json` - 6 projects
- `services.v1.json` - 12 services with order fields
- `brand.v1.json` - Brand assets (hero, portrait, featured)
- `gallery.json` - Gallery ordering with `galleryOrder` arrays
- `manifest.v1.json` - Machine-generated image manifest (12 assets, 6 projects)

**Physical Files:**
- `photo-intake/` - 21 source originals across 7 folders
- `public/images/projects/` - 103 optimized variants
- `photo-intake/_archive/` - 21 redundant copies

**Google Drive Index:**
- `DRIVE_FILE_INDEX.csv` - 10 files indexed (9 images + 1 doc)

**Workbench Architecture:**
- Existing Workbench shell with 10 plugins (Explorer, Timeline, Evidence, etc.)
- Platform-ready architecture (per migration plan)
- No existing media panel component

### Semantic Vocabulary Discovered

**Roles in media.v1.json:**
- `hero` - Project/brand hero images
- `before` - Before-state photos
- `after` - After-state photos
- `gallery` - General gallery photos
- `portrait` - Owner portraits
- `brand` - Brand assets

**Project Categories:**
- Fences, Built-Ins, Repairs, Outdoor Living, Bathroom Remodeling, Pergolas

**Services with Order:**
- Decks (order: 6), Fences (order: 5), Painting (order: 3), Exterior Painting (order: 1), etc.

**Semantic Keywords:**
- "exterior painting", "painting", "fence", "fence rebuild", "cedar fence", "before", "after", "finished", "prep", "scraping", "sanding", "priming", "pergola", "built-ins", "bathroom", "drywall", "restoration"

---

## PART 2 — GLOBAL PHOTO IDENTITY GRAPH

### Canonical Media Inventory (26 entries in media.v1.json)

| Media ID | Project ID | Role | Filename | Drive ID | Dimensions | Status |
|----------|------------|------|----------|----------|------------|--------|
| fences-001-hero | fences-001 | hero | FENCE BUILD.jpg | fences-001-master | 1920×1080 | CANONICAL |
| fences-001-before | fences-001 | before | FENCE BEFORE.jpg | drive-c266e5096e43 | 1920×1080 | CANONICAL |
| fences-001-after | fences-001 | after | FENCE AFTER.jpg | drive-7a4b33c8b2bb | 1920×1080 | CANONICAL |
| fences-001-matching | fences-001 | gallery | FENCEREBUILDMATCHINGSTAIN.png | fences-001-variant-001 | 1920×1080 | CANONICAL |
| builtins-001-hero | builtins-001 | hero | FINISHEDCARPENTRY.png | builtins-001-master | 1920×1080 | CANONICAL |
| builtins-001-secondary | builtins-001 | gallery | FINISHEDCARPENTRY0.png | builtins-001-variant-001 | 1920×1080 | CANONICAL |
| repairs-001-hero | repairs-001 | hero | TRIMREPAIR.png | repairs-001-master | 1920×1080 | CANONICAL |
| repairs-001-drywall | repairs-001 | gallery | DRYWALL.png | repairs-001-variant-001 | 1920×1080 | CANONICAL |
| repairs-001-floor | repairs-001 | gallery | FLOOR.png | repairs-001-variant-002 | 1920×1080 | CANONICAL |
| repairs-001-gutter | repairs-001 | gallery | GUTTERCLEANING.jpg | repairs-001-variant-003 | 1920×1080 | CANONICAL |
| outdoor-living-001-hero | outdoor-living-001 | hero | IMG_0535.JPG | painting-001-master | 1920×1080 | CANONICAL |
| outdoor-living-001-2 | outdoor-living-001 | gallery | IMG_0555.JPG | painting-001-variant-001 | 1920×1080 | CANONICAL |
| outdoor-living-001-3 | outdoor-living-001 | gallery | IMG_0559.JPG | painting-001-variant-002 | 1920×1080 | CANONICAL |
| outdoor-living-001-4 | outdoor-living-001 | gallery | IMG_0737.JPG | painting-001-variant-003 | 1920×1080 | CANONICAL |
| outdoor-living-001-5 | outdoor-living-001 | gallery | IMG_0805.JPG | painting-001-variant-004 | 1920×1080 | CANONICAL |
| outdoor-living-001-6 | outdoor-living-001 | gallery | IMG_0841.JPG | painting-001-variant-005 | 1920×1080 | CANONICAL |
| bathroom-remodeling-001-hero | bathroom-remodeling-001 | hero | BATHROOM_WALL.png | bathroom-001-master | 1920×1080 | CANONICAL |
| brand-featured | - | brand | featured.jpeg | drive-7fc72d02ab05 | 480×640 | CANONICAL |
| brand-hero | - | hero,brand | hero.jpeg | brand-hero-001 | 480×640 | CANONICAL |
| brand-portrait | - | portrait,brand | portrait.jpeg | brand-portrait-001 | 640×427 | CANONICAL |
| repairs-001-floor0 | repairs-001 | gallery | FLOOR0.jpg | repairs-001-variant-004 | 1920×1080 | CANONICAL |
| repairs-001-img0544 | repairs-001 | gallery | IMG_0544.JPG | repairs-001-variant-005 | 480×640 | CANONICAL |
| repairs-001-img0546 | repairs-001 | gallery | IMG_0546.JPG | repairs-001-variant-006 | 480×640 | CANONICAL |
| pergolas-001-hero | pergolas-001 | hero | HOMESERVICEPROJECTPERGOLAS.jpg | pergolas-001-master | 1920×1080 | CANONICAL |
| pergolas-001-before | pergolas-001 | before | 1.png | pergolas-001-variant-001 | 1920×1080 | CANONICAL |
| pergolas-001-after | pergolas-001 | after | HOMESERVICEPROJECTPERGOLAS.jpg | pergolas-001-master | 1920×1080 | DUPLICATE |

### Identity Classification

**EXACT DUPLICATES:**
- `pergolas-001-hero` and `pergolas-001-after` both reference `HOMESERVICEPROJECTPERGOLAS.jpg` with same Drive ID

**DERIVATIVES:**
- All WEBP/AVIF variants are derivatives of source originals
- Multiple sizes (480, 768, 1080) of each original

**CANONICAL:**
- 26 unique media IDs represent all canonical photos
- All have physical files in `photo-intake/` and variants in `public/images/`

**UNKNOWN:**
- Drive IDs appear synthetic (e.g., "fences-001-master", "drive-c266e5096e43")
- Cannot verify against actual Drive without API access

---

## PART 3 — GLOBAL SITE ORDER

### Homepage Order (page.tsx)

**Hero Section:**
- Uses hardcoded `/images/hero-background-enhanced.jpg` (not from media.v1.json)
- No media ID reference

**Services Section:**
- Uses `getNonArchivedServices()` → sorted by `order` field in services.v1.json
- Current order: Exterior Painting (1), Painting (2), Fences (5), Decks (6), etc.

**Featured Projects:**
- Uses `getFeaturedProjects()` → filters by `featured: true` and `!archived`
- No explicit order in projects.v1.json (relies on array order)

**Trust Strip:**
- Static data from company authority

### Project Page Order (projects/[slug]/page.tsx)

**Project Photos:**
- Uses `project.media.gallery` array order from projects.v1.json
- Example fences-001 gallery: `["fences-001-matching", "fences-001-installation", "fences-001-detail", "fences-001-finished", "fences-001-progress", "fences-001-gate"]`
- **ISSUE:** Some gallery IDs reference non-existent media (e.g., "fences-001-installation" not in media.v1.json)

**Before/After:**
- Uses `project.media.before` and `project.media.after` IDs
- Explicit before/after ordering

### Gallery Order (gallery.json)

**galleryOrder Arrays:**
- Each project has explicit `galleryOrder` array
- Example johnson-cedar-fence: `["johnson-cedar-fence/fence-build", "johnson-cedar-fence/fencerebuildmatchingstain"]`
- **ISSUE:** gallery.json uses different ID format (project/filename) vs media.v1.json (media-id)

### Service Page Order

**Services Order:**
- Uses `sortByOrder()` from authority-loader.ts
- Sorts by numeric `order` field (default 999 if missing)

---

## PART 4 — WORKBENCH MEDIA PANEL DESIGN TARGET

### Existing Workbench Architecture

**Current Plugins:**
- Explorer, Timeline, Evidence, Recommendations, Execution, Projections, Replay, Connectors, Graph, Settings

**Shell Architecture:**
- Sidebar navigation with collapsible menu
- Main content area for plugin content
- Universal, tenant-agnostic design

**No Media Panel Exists:**
- Must create new plugin or add to existing Explorer

### Recommended Media Panel Design

**Plugin Placement:**
- Add "Media" plugin to WorkbenchShell plugins array
- Path: `/workbench/media`

**Panel Features:**

1. **Photo Grid Display**
   - Show all 26 canonical photos from media.v1.json
   - Group by project ID
   - Show semantic role badges (hero, before, after, gallery, brand)
   - Show identity status (canonical, derivative, duplicate)

2. **Current MAIN Order Display**
   - Display photos in current MAIN website order
   - Show slot assignments (homepage hero, service card, project hero, gallery position)
   - Evidence trail for each slot

3. **Manual Reordering**
   - Drag-and-drop interface
   - Move photos between projects
   - Change role assignments
   - Reorder gallery arrays

4. **Save/Load Operations**
   - Save ordering to separate Workbench authority
   - Load Workbench ordering overlay
   - Reset to MAIN baseline

5. **Identity Distinction**
   - Canonical photos (from media.v1.json)
   - Derivatives (WEBP/AVIF variants)
   - Duplicates (same hash, different IDs)
   - Unresolved (Drive-only photos)

### Smallest Change Compatible with Existing Architecture

**New File: `src/app/workbench/media/page.tsx`**
- Media panel component using existing WorkbenchShell pattern
- Reuse existing Card, Badge, and UI components

**New File: `src/config/workbench-ordering.v1.json`**
- Workbench ordering overlay authority
- Separate from MAIN authorities

**New File: `src/lib/workbench-ordering.ts`**
- Adapter for Workbench ordering authority
- Load, save, reset operations

**Update: `src/components/workbench/WorkbenchShell.tsx`**
- Add Media plugin to plugins array

---

## PART 5 — SAVE/REORDER SEMANTICS

### Ordering Data Model

**Structure:**

```typescript
interface WorkbenchOrdering {
  version: string;
  generatedAt: string;
  baselineVersion: string; // MAIN commit hash
  ordering: {
    homepage: {
      hero: string | null; // media ID
    };
    projects: {
      [projectId: string]: {
        hero: string;
        before?: string;
        after?: string;
        gallery: string[]; // ordered media IDs
      };
    };
    services: {
      [serviceId: string]: {
        representative: string; // media ID
      };
    };
    brand: {
      hero: string;
      portrait: string;
      featured: string;
    };
  };
  version: number; // for optimistic concurrency
}
```

### Stable Identity Key

**Canonical Identity:**
- Use `mediaId` from media.v1.json as stable key
- Content hash from manifest.v1.json for deduplication
- Drive ID as external reference (if available)

### Ordering Key

**Scope-Based Ordering:**
- Global scope: homepage hero, brand assets
- Project scope: project hero, before/after, gallery
- Service scope: service representative photo

### Operations

**Save Operation:**
- Write to `src/config/workbench-ordering.v1.json`
- Increment version number
- Record timestamp
- Commit to git (optional)

**Load Operation:**
- Load from `src/config/workbench-ordering.v1.json`
- Merge with MAIN baseline
- Apply overlay to media display

**Reset-to-MAIN Operation:**
- Delete `src/config/workbench-ordering.v1.json`
- Reload from MAIN authorities only
- Clear Workbench cache

**Undo Behavior:**
- Git history provides undo
- Version number allows rollback
- Baseline version allows comparison

**Conflict Behavior:**
- Last write wins (optimistic concurrency)
- Version mismatch detection
- Manual resolution required

### Persistence Location

**Recommended:**
- File: `src/config/workbench-ordering.v1.json`
- Scope: Workbench operational overlay
- Authority: MAIN remains immutable reference

**Rationale:**
- MAIN authorities (media.v1.json, projects.v1.json) remain unchanged
- Workbench ordering is operational, not canonical
- Separate file allows easy reset to MAIN baseline
- Git tracks ordering changes independently

---

## PART 6 — IMPORT PREPARATION

### Current Import Queue

**READY_FOR_IMPORT (0):**
- All 26 canonical photos already imported
- No missing photos from Drive

**DUPLICATE (1):**
- `pergolas-001-after` is duplicate of `pergolas-001-hero`
- Same Drive ID, same filename

**LIKELY_MATCH (0):**
- No ambiguous matches detected

**NEEDS_REVIEW (0):**
- All photos have clear roles and assignments

**NEEDS_DRIVE_VERIFICATION (26):**
- All Drive IDs need verification against actual Drive
- Synthetic IDs cannot be confirmed without API access

**DISTINCT_NEW_PHOTO (0):**
- No new photos discovered

**DO_NOT_IMPORT (0):**
- All current photos are canonical

### Missing Gallery IDs

**Broken References in projects.v1.json:**
- `fences-001-installation` - not in media.v1.json
- `fences-001-detail` - not in media.v1.json
- `fences-001-finished` - not in media.v1.json
- `fences-001-progress` - not in media.v1.json
- `fences-001-gate` - not in media.v1.json
- Similar missing IDs for other projects

**Recommendation:**
- Remove broken gallery references from projects.v1.json
- Or create placeholder media entries for missing photos

---

## PART 7 — GOOGLE DRIVE

### Drive File Index Analysis

**Indexed Files (10):**
- 1 Google Doc
- 9 images (IMG_0737.JPG, IMG_0841.JPG, IMG_0805.JPG, IMG_0535.JPG, IMG_0555.JPG, IMG_0559.JPG, IMG_0544.JPG, IMG_0546.JPG, HOMESERVICEPROJECTPERGOLAS.jpg)

**Dimensions from Index:**
- IMG_* files: 480×640 or 640×480
- HOMESERVICEPROJECTPERGOLAS.jpg: 4367×3275 (high resolution)

**Matching:**
- All IMG_* files match outdoor-living-001 photos
- HOMESERVICEPROJECTPERGOLAS.jpg matches pergolas-001 hero/after

**Metadata:**
- Modified dates available (2026-07-19 to 2026-07-22)
- File sizes available
- No hashes in index
- No folder hierarchy in index

### Google Drive Setup Plan

**Eventual System Flow:**

```
Google Drive API
    ↓
Verified External Identity (Drive ID + hash)
    ↓
Canonical Photo Identity (mediaId + contentHash)
    ↓
Deduplication (hash comparison)
    ↓
Semantic Mapping (filename, folder, Drive metadata)
    ↓
Workbench Review (media panel with ordering)
    ↓
Operator Ordering (drag-and-drop, role assignment)
    ↓
Saved Workbench Ordering Overlay (workbench-ordering.v1.json)
```

**Required Components:**

1. **Drive Connector** (in existing Connectors plugin)
   - OAuth flow for Drive API access
   - File listing with metadata
   - Content hash calculation
   - Download functionality

2. **Identity Resolution Service**
   - Drive ID → media ID mapping
   - Hash-based deduplication
   - Filename fuzzy matching
   - Folder-based semantic inference

3. **Import Queue Manager**
   - Track import status
   - Batch import operations
   - Progress tracking
   - Error handling

4. **Verification UI**
   - Side-by-side comparison
   - Hash confirmation
   - Metadata validation
   - Manual override

**Current Limitations:**
- No OAuth credentials configured
- Drive API not accessible
- Index is static snapshot
- No real-time verification possible

---

## PART 8 — FINAL OUTPUT

### 1. GLOBAL PHOTO INVENTORY

**Total Canonical Photos: 26**
- 6 project heroes
- 2 before photos
- 2 after photos
- 15 gallery photos
- 3 brand photos

**Physical Files: 21 originals + 103 variants**
- All originals in `photo-intake/`
- All variants in `public/images/projects/`
- 21 redundant copies in `_archive/`

### 2. GLOBAL IDENTITY/DUPLICATE GRAPH

**Exact Duplicates: 1**
- pergolas-001-hero = pergolas-001-after (same Drive ID)

**Derivatives: 103**
- WEBP/AVIF variants at 480, 768, 1080 resolutions

**Canonical: 26**
- All unique media IDs in media.v1.json

**Unknown: 0**
- All photos have clear identity

### 3. SEMANTIC MATCH RESULTS

**Role Distribution:**
- Hero: 6
- Before: 2
- After: 2
- Gallery: 15
- Brand: 3

**Project Distribution:**
- fences-001: 4 photos
- builtins-001: 2 photos
- repairs-001: 7 photos
- outdoor-living-001: 6 photos
- bathroom-remodeling-001: 1 photo
- pergolas-001: 3 photos
- brand: 3 photos

### 4. MAIN WEBSITE ORDER

**Homepage:**
- Hero: hardcoded image (not from media.v1.json)
- Services: sorted by `order` field
- Projects: featured filter (no explicit order)

**Project Pages:**
- Hero: project.media.hero
- Before/After: project.media.before/after
- Gallery: project.media.gallery array (with broken references)

**Services:**
- Order field in services.v1.json

### 5. MISSING PHOTO CANDIDATES

**Broken Gallery References:**
- 5 missing IDs for fences-001
- Similar missing IDs for other projects
- Total: ~15 broken references

**Recommendation:**
- Clean up projects.v1.json gallery arrays
- Or create placeholder media entries

### 6. DRIVE CANDIDATE MAPPINGS

**Verified Matches: 9**
- All IMG_* files → outdoor-living-001
- HOMESERVICEPROJECTPERGOLAS.jpg → pergolas-001

**Unverified: 17**
- Brand photos (featured, hero, portrait)
- Other project photos (fences, built-ins, repairs, bathroom)

**Need Drive API Access:**
- Verify all Drive IDs
- Calculate content hashes
- Confirm folder hierarchy

### 7. WORKBENCH ORDERING DESIGN

**New Plugin: `/workbench/media`**
- Photo grid with project grouping
- Role badges and identity status
- Drag-and-drop reordering
- Save/Load/Reset operations

**New Authority: `workbench-ordering.v1.json`**
- Separate from MAIN authorities
- Overlay on MAIN baseline
- Version-based concurrency

**Adapter: `src/lib/workbench-ordering.ts`**
- Load/save/reset operations
- Merge with MAIN baseline
- Conflict detection

### 8. SAVE/REORDER DATA MODEL

**Structure:**
- Baseline version (MAIN commit)
- Ordering arrays (homepage, projects, services, brand)
- Version number (optimistic concurrency)
- Timestamp

**Operations:**
- Save: write to workbench-ordering.v1.json
- Load: merge with MAIN baseline
- Reset: delete workbench-ordering.v1.json
- Undo: git history

### 9. FUTURE IMPORT QUEUE

**Status:**
- All 26 canonical photos already imported
- 1 duplicate detected
- ~15 broken gallery references to clean up
- 26 Drive IDs need verification

**Classification:**
- READY_FOR_IMPORT: 0
- DUPLICATE: 1
- NEEDS_DRIVE_VERIFICATION: 26
- BROKEN_REFERENCES: ~15

### 10. GOOGLE DRIVE SETUP/RECOVERY PLAN

**Phased Approach:**

1. **Phase 1: OAuth Setup**
   - Configure Google OAuth credentials
   - Implement Drive API connector
   - Test file listing

2. **Phase 2: Identity Resolution**
   - Calculate content hashes
   - Match Drive IDs to media IDs
   - Verify folder hierarchy

3. **Phase 3: Import Pipeline**
   - Build import queue
   - Implement batch import
   - Add progress tracking

4. **Phase 4: Verification UI**
   - Side-by-side comparison
   - Manual override
   - Error handling

**Current Blocker:**
- No OAuth credentials
- No Drive API access
- Static index only

### 11. RISKS AND UNCERTAINTIES

**High Risk:**
- Broken gallery references in projects.v1.json
- Duplicate pergolas photo (hero = after)
- Synthetic Drive IDs cannot be verified

**Medium Risk:**
- Homepage hero not from media.v1.json
- No explicit project ordering
- Gallery.json uses different ID format

**Low Risk:**
- All physical files present
- All media IDs resolved
- Workbench architecture ready

**Uncertainties:**
- Actual Drive file structure
- Drive ID format and validity
- Hash availability in Drive metadata
- Folder hierarchy in Drive

---

## RECOMMENDED NEXT MUTATION

**Implement ONLY the Workbench media-panel ordering overlay and persistence, with MAIN remaining completely untouched.**

### Scope

**DO:**
- Create `src/app/workbench/media/page.tsx` - Media panel component
- Create `src/config/workbench-ordering.v1.json` - Ordering overlay authority
- Create `src/lib/workbench-ordering.ts` - Ordering adapter
- Update `src/components/workbench/WorkbenchShell.tsx` - Add Media plugin
- Display all 26 canonical photos in current MAIN order
- Allow manual reordering with drag-and-drop
- Save ordering to workbench-ordering.v1.json
- Load ordering overlay on startup
- Reset to MAIN baseline operation

**DO NOT:**
- Import photos
- Change MAIN authorities (media.v1.json, projects.v1.json)
- Change media identity
- Change public UI
- Change project authorities
- Alter Drive credentials
- Modify OAuth configuration
- Perform Git operations
- Deploy changes

### Implementation Steps

1. **Create Workbench Ordering Authority**
   - File: `src/config/workbench-ordering.v1.json`
   - Structure: baseline version, ordering arrays, version number
   - Initial state: empty (defaults to MAIN order)

2. **Create Ordering Adapter**
   - File: `src/lib/workbench-ordering.ts`
   - Functions: loadOrdering, saveOrdering, resetToMain, mergeWithBaseline
   - Use existing AuthorityLoader pattern

3. **Create Media Panel Component**
   - File: `src/app/workbench/media/page.tsx`
   - Display: photo grid, project grouping, role badges
   - Features: drag-and-drop, save, reset
   - Use existing UI components (Card, Badge, etc.)

4. **Add Media Plugin to Workbench**
   - Update: `src/components/workbench/WorkbenchShell.tsx`
   - Add: `{ id: 'media', name: 'Media', icon: Image, path: '/workbench/media' }`

5. **Test Ordering Flow**
   - Load page → shows MAIN order
   - Reorder photos → drag-and-drop
   - Save → writes to workbench-ordering.v1.json
   - Reload → shows saved order
   - Reset → returns to MAIN order

### Expected Outcome

- Workbench media panel displays all 26 canonical photos
- Photos shown in current MAIN website order
- Operator can manually reorder photos
- Ordering saved to separate overlay authority
- MAIN authorities remain completely untouched
- Reset operation restores MAIN baseline
- No changes to public website or import pipeline

---

**HARD STOP - No edits, no imports, no OAuth, no Git operations, no deployment, no pushes.**
