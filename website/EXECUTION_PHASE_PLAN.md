# Execution Phase Plan - Runtime Media Authority Restoration

## Current State
- **Git HEAD:** `95df2df` - "Add missing storage field validation in public gate"
- **Deployment:** Pushed to origin/main, awaiting Vercel deployment
- **Critical Fixes Applied:**
  - Production authentication bypass guard (absolute production protection)
  - Actor validation fail-closed logic
  - Production-safe canonical config loading via authority loaders
  - Separated static vs Blob verification in media gate
  - Added missing storage field validation

## Production Evidence
- Production site is asking MEDIA_KV for canonical media records that aren't there
- MEDIA_RESOLUTION_FAILED events for: pergolas-001-finished, outdoor-living-001-4, fences-001-progress, repairs-001-hero, fences-001-hero, etc.
- Blob verification model colliding with static /images/... URLs (now fixed)
- Evidence of stale/inconsistent media records (canonical IDs vs older IDs vs positional IDs)

## Execution Phase Plan

### Phase A: Prove Production Canonical Manifests
**Goal:** Verify canonical configuration authorities are accessible in production runtime

**Steps:**
1. Load canonical manifests via authority loaders:
   - `loadMediaManifest()` - 120 media records
   - `loadProjectsManifest()` - 17 project records  
   - `loadBrandManifest()` - brand configuration
2. Verify all manifests load without errors
3. Verify media IDs in projects.v1.json exist in media.v1.main.json
4. Verify project IDs are consistent (no stale old IDs like builtins-001-hero, pergolas-0)
5. Document any discrepancies between canonical authorities

**Acceptance Criteria:**
- All 3 canonical manifests load successfully
- All project media references resolve to valid media IDs
- No stale/inconsistent IDs detected
- Canonical authority mapping is complete

### Phase B: Run Static Media Reconciliation
**Goal:** Restore 120 canonical media records into MEDIA_KV with proper storage authority

**Steps:**
1. Call `/api/admin/diagnostic/reconcile-static-media` with Workbench authentication
2. Verify endpoint returns SUCCESS verdict
3. Verify evidence shows:
   - totalCanonical: 120
   - reconciled: ~120 (or actual missing count)
   - skipped: existing valid records
   - failed: 0
4. Verify storage field is correctly set: `storage: 'static'` for local assets
5. Verify environment namespace is production
6. Verify no deletions or replacements of valid records

**Acceptance Criteria:**
- All 120 canonical media records reconciled
- All local assets have `storage: 'static'`
- No failures or errors
- Production namespace confirmed
- Idempotent behavior verified

### Phase C: Run Assignment Reconciliation  
**Goal:** Restore all canonical assignments using authoritative assignment writer

**Steps:**
1. Call `/api/admin/diagnostic/reconcile-assignments` with Workbench authentication
2. Verify endpoint returns SUCCESS verdict
3. Verify evidence shows:
   - projects: 17
   - media: 120
   - reconciled: all missing assignments
   - skipped: existing valid assignments
   - failed: 0
4. Verify assignments use correct structure:
   - `source: 'workbench'`
   - `actor: 'reconciliation'`
   - `revision` incrementing properly
5. Verify no raw Redis writes occurred
6. Verify all project hero/before/after/gallery assignments reconciled
7. Verify brand assignments reconciled

**Acceptance Criteria:**
- All canonical assignments reconciled
- All assignments use correct schema
- CAS revision increment working
- No raw Redis writes
- Brand and project assignments complete

### Phase D: Read-After-Write Verification
**Goal:** Prove reconciled data is actually readable through real production readers

**Steps:**
1. For each reconciled media ID:
   - Call `getMedia(id)` via media reader
   - Verify record exists and is valid PublishedMediaAsset
   - Verify storage field is correctly set
   - Verify public-media gate passes
2. For each reconciled assignment:
   - Call `getServiceCardAssignment(slotKey)` via assignment reader
   - Verify assignment exists and matches canonical
   - Verify revision is correct
3. Verify canonical assignment = stored assignment = reader result

**Acceptance Criteria:**
- All reconciled media IDs resolve via `getMedia()`
- All reconciled assignments resolve via `getServiceCardAssignment()`
- Public-media gate passes for all static assets
- Read-after-write chain is complete

### Phase E: Fix Media Records That Fail Public-Media Gate
**Goal:** Address any remaining media records that fail the public-media gate

**Steps:**
1. Identify any media records that fail `verifyPublicMediaAuthority()`
2. Categorize failures:
   - Missing storage field
   - Invalid storage field
   - Static path format errors
   - Blob metadata errors (for Blob storage)
3. Fix each category:
   - Missing storage: add `storage: 'static'` for local assets
   - Invalid storage: correct to 'static' or 'blob'
   - Path format: fix /images/ paths
   - Blob metadata: restore Blob metadata for Blob assets
4. Re-run Phase D verification

**Acceptance Criteria:**
- All media records pass public-media gate
- No MEDIA_RESOLUTION_FAILED events
- Static assets properly distinguished from Blob assets

### Phase F: Verify Website Project ID Resolution
**Goal:** Verify the website's actual project IDs resolve correctly

**Steps:**
1. Load the website and inspect project pages
2. Verify project IDs match canonical authorities:
   - pergolas-001-finished (not pergolas-0)
   - outdoor-living-001-4 (not older IDs)
   - fences-001-progress (not builtins-001-hero)
3. Verify project hero images render
4. Verify before/after images render
5. Verify gallery images render
6. Verify brand images render (hero, portrait)

**Acceptance Criteria:**
- All 17 canonical projects resolve correctly
- No stale/inconsistent project IDs
- All project images render
- Brand images render

### Phase G: Verify Complete Media Authority Chain
**Goal:** Prove the complete chain: canonical media ID → MEDIA_KV record → valid PublishedMediaAsset → resolver → actual image

**Steps:**
1. Pick representative media IDs from each category:
   - Brand images (brand-hero, brand-portrait)
   - Project hero images (pergolas-001-finished, fences-001-progress)
   - Before/after images
   - Gallery images
2. For each ID, trace the complete chain:
   - Canonical authority (media.v1.main.json)
   - MEDIA_KV record (via getMedia)
   - Public-media gate (via verifyPublicMediaAuthority)
   - Resolver (via resolvePublicMedia)
   - Actual website image rendering
3. Verify no MEDIA_RESOLUTION_FAILED events in production logs

**Acceptance Criteria:**
- Complete chain verified for representative IDs
- No resolution failures
- All categories working
- Production logs clean

### Phase H: Drive OAuth and Materialization Chain
**Goal:** Prove Drive → materialization → Blob → PublishedMediaAsset → assignment

**Steps:**
1. This phase is deferred until static media restoration is complete
2. Will involve Drive OAuth setup and materialization testing
3. Will verify Drive assets can be materialized to Blob storage
4. Will verify Blob assets can become PublishedMediaAsset
5. Will verify Blob assets can be assigned to slots

**Deferred:** Only after static media chain is fully working

## Security Verification
**Before executing any mutation:**
1. Unauthorized request → 401
2. Malformed actor/schema → reject
3. Canonical config loading → succeed
4. Production bypass flag never honored in production
5. Inspect runtime logs for security events

## Idempotency Verification
**After initial restoration:**
1. Run reconciliation endpoints a second time
2. Verify first run creates/reconciles required state
3. Verify second run skips already-valid state
4. Verify no duplicate assignments
5. Verify no revision corruption
6. Verify no unnecessary writes

## Completion Criteria
The restoration is complete when:
1. All 120 canonical media records exist in MEDIA_KV
2. All canonical assignments exist in assignment KV
3. All media records pass public-media gate
4. All static assets have storage: 'static'
5. All Blob assets have storage: 'blob' with metadata
6. All project IDs are consistent and resolve
7. All website images render correctly
8. No MEDIA_RESOLUTION_FAILED events
9. Read-after-write chain verified
10. Idempotency verified
11. Production authentication working
12. Static vs Blob verification separated

## Next Immediate Steps
1. **Verify Vercel deployment** for commit `95df2df`
2. **Execute Phase A** - Prove production canonical manifests
3. **Execute Phase B** - Run static media reconciliation
4. **Execute Phase C** - Run assignment reconciliation
5. **Execute Phase D** - Read-after-write verification
6. **Continue through Phase G** - Complete media authority chain

**Status: ARCHITECTURAL FIXES COMPLETE, READY FOR EXECUTION PHASE**