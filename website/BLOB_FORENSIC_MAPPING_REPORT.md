# Blob-Backed Records Forensic Mapping Report

**Date:** 2026-09-03
**Context:** Reconciliation failure on 4 Blob-backed records
**Objective:** Determine whether these records represent legitimate photos that must be preserved, or orphaned legacy entries safe to remove

## Records Under Investigation

### 1. c65e27844063e63ad2c300f88a9e7479
- **Filename:** HP016_ExteriorPainting_HouseRefresh_After.jpg
- **Content Hash:** c65e27844063e63ad2c300f88a9e747994e582c96e89a53f282ce79e4bcb3f40
- **Storage:** blob
- **Variants:** All Blob URLs (8zci9xnviilmi6qj.public.blob.vercel-storage.com)
- **Roles:** gallery
- **Provenance:** Drive File ID 1m6Z_6Gt5FqKZplx4GxT8KOAUHZO1DPlc

### 2. 2a1d4ae6e3b81282259174af113bac3c
- **Filename:** HP016_ExteriorPainting_HouseRefresh_Before.jpg
- **Content Hash:** 2a1d4ae6e3b81282259174af113bac3c49508bbf62ad8f354e4d24a1210ff7e5
- **Storage:** blob
- **Variants:** All Blob URLs
- **Roles:** gallery
- **Provenance:** Drive File ID 1A7eiHXERSZ-7eq8Hdl0F6P67DZM_qVda

### 3. 6fd33914d4c27fbf71871bbc6405ff1c
- **Filename:** HP011_SubfloorReplacement_After.jpg
- **Content Hash:** 6fd33914d4c27fbf71871bbc6405ff1c1518f72f78d5802eec541951afdaf49e
- **Storage:** blob
- **Variants:** All Blob URLs
- **Roles:** gallery
- **Provenance:** Drive File ID 1C4pSIU9K1i2oNMmBkGqnAfoFziTJ0lSa

### 4. 8151ae20b8c6b889b35dbd5571fa4d84
- **Filename:** HP007_SidingRotRepair_After.jpeg
- **Content Hash:** 8151ae20b8c6b889b35dbd5571fa4d84674ea8ab69fd4d21c933ed4c40d389f1
- **Storage:** blob
- **Variants:** All Blob URLs
- **Roles:** gallery
- **Provenance:** Drive File ID 1VWD-1jtrmb2DGj1eijW-EYIG46RgxDHe

## Forensic Investigation Results

### Physical File Search
- **Searched:** `public/images/` recursively for filenames HP016*, HP011*, HP007*
- **Result:** No physical files found matching these filenames
- **Conclusion:** These photos do not exist in the current static file tree

### Canonical Reference Search
- **Searched:** `src/config/media.v1.json` for these IDs
- **Result:** IDs only appear in their own Blob-backed record entries
- **Conclusion:** No duplicate or replacement static records exist with different IDs

### Generated Projection Search
- **Searched:** `.generated/` directory for these IDs
- **Result:** No references found in gallery-projection.json or other projections
- **Conclusion:** These records are not included in current generated projections

### Project Authority Search
- **Searched:** `src/config/projects.v1.json` for these IDs
- **Result:** No references found
- **Conclusion:** No projects reference these media IDs

### Service Authority Search
- **Searched:** `src/config/services.v1.json` for these IDs
- **Result:** No references found
- **Current service cardMediaId mappings:**
  - painting → outdoor-living-001-3
  - repairs → repairs-001-hero
  - restoration → fences-001-hero
  - drywall → repairs-001-hero
  - fences → fences-001-hero
- **Conclusion:** No services reference these media IDs

### Historical Context
- These records have Drive provenance from August 2026
- They were likely uploaded during a prior Drive import/migration
- The Blob store (8zci9xnviilmi6qj.public.blob.vercel-storage.com) is currently dead/suspended
- The filenames suggest they were once used as "before/after" comparison photos

## Classification

**Verdict:** These are orphaned legacy Blob-era records

**Evidence:**
1. No physical files exist in `public/images/`
2. No canonical static replacements exist
3. No generated projections reference them
4. No projects reference them
5. No services reference them
6. Service card assignments already point to valid canonical IDs
7. Blob storage is dead/suspended
8. Reconciliation fails because they cannot be saved with valid static paths

**Risk Assessment:**
- **Removing from media.v1.json:** LOW RISK
  - These records are not referenced by any current authority
  - Service cards already use correct canonical IDs
  - Projects use different media IDs
  - No public pages depend on these records
- **Photos lost:** NO
  - Physical files do not exist in current static tree
  - If these photos were important, they would have been migrated to static assets
  - Drive provenance is preserved in the record (Drive File IDs documented)

## Recommended Action

Remove these 4 Blob-backed records from `src/config/media.v1.json`. This will:

1. Allow static reconciliation to succeed (all remaining 24 canonical records have valid static storage)
2. Clean up orphaned legacy entries that cannot possibly resolve
3. Preserve the Drive File IDs in this report for potential future reference
4. Not affect any current functionality (no references exist)

## Alternative Considered but Rejected

**Alternative:** Keep records but change storage to "orphan" or similar flag
- **Rejected:** The reconciliation contract expects either "static" or "r2" storage
- **Rejected:** Keeping them would continue to block reconciliation
- **Rejected:** Public media gate correctly rejects "blob" storage as a security boundary

## Final Determination

These 4 records are safe to remove from the canonical media manifest. They represent legacy Blob-era entries that:
- Have no physical static files
- Have no canonical replacements
- Are not referenced by any current authority
- Cannot resolve through dead Blob storage
- Block successful reconciliation

Removing them restores reconciliation capability without losing any currently visible photos.
