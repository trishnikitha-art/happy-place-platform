# Media Authority Failure Analysis

## Production Runtime Evidence

### Current Failures
Vercel production runtime shows repeated failures involving:
- `brand-hero` - MEDIA_KV REJECTED: Synthetic content identity
- `fences-001-hero` - PUBLIC_MEDIA_GATE REJECTED: Missing Blob metadata

## Root Cause Analysis

### Issue 1: brand-hero Does Not Exist in Media Authority

**Observation:**
- `brand.v1.json` references `mediaId: "brand-hero"` for homepage hero
- `media.v1.json` does NOT contain any media record with `id: "brand-hero"`

**Current Media Records:**
- `fences-001-hero` - exists with contentHash `802ccc84e0637b56cdf517cc6ca39168e71681d24d523eaa5e7a255b3f10433a`
- `builtins-001-hero` - exists with contentHash `ae917cfeb9ceb14394c7632e6073d3cd26ee6593029481c43cba785e005691ed`
- `repairs-001-hero` - exists with contentHash `dc88f6260c4ea3830894f17e7933cdc145a10b0ecdde018cfe71ed56c7db767a`
- `outdoor-living-001-hero` - exists with contentHash `0d412c4c9b40d5416cde4681b7f9df706c0354b1518609527ee0c31ac07a4aa7`

**Problem:**
- Brand authority points to non-existent media ID
- This causes resolution to fail at the KV layer
- The error "Synthetic content identity" suggests the content hash may not be computed from actual bytes

### Issue 2: Content Hashes May Be Synthetic

**Observation:**
- All media records have `source: "local"` and `lifecycleState: "published"`
- This should indicate they are PublishedMediaAssets with Blob backing
- However, runtime errors suggest synthetic content identity

**Hypothesis:**
- Content hashes in media.v1.json may not be computed from actual file bytes
- They may be fabricated hashes from a previous incomplete materialization
- Blob metadata records may be missing in KV
- Physical Blob files may not match the recorded content hashes

### Issue 3: Missing Blob Metadata in KV

**Observation:**
- Error: "PUBLIC_MEDIA_GATE REJECTED: Missing Blob metadata"
- This suggests media-kv-store.ts cannot find `blob_metadata:${contentHash}` records
- Without Blob metadata, the constitutional proof gate rejects the media

**Verification Required:**
1. Check if Blob metadata records exist in KV for each content hash
2. Verify physical Blob files exist and match content hashes
3. Verify content hashes are computed from actual bytes, not synthetic

## Resolution Path

### Immediate Fix: brand-hero

**Option A: Create brand-hero media record**
- Add "brand-hero" to media.v1.json with proper content hash
- Ensure Blob metadata exists in KV
- Ensure physical Blob file exists and matches hash

**Option B: Reassign brand hero to existing media**
- Update brand.v1.json to point to an existing hero (e.g., fences-001-hero)
- This provides immediate fix while long-term solution is implemented

**Recommendation:** Option B for immediate fix, Option A for long-term correctness

### Content Hash Verification

**Required Steps:**
1. Download physical Blob files for each media record
2. Compute actual SHA256 hashes from bytes
3. Compare with recorded content hashes
4. Identify which hashes are synthetic vs real
5. Re-materialize media with synthetic hashes

### Blob Metadata Verification

**Required Steps:**
1. Check KV for `blob_metadata:${contentHash}` records
2. Verify metadata structure matches expected format
3. Create missing Blob metadata records where needed
4. Ensure KV namespace is correctly applied

## Architectural Issues

### Static vs Runtime Authority Mismatch

**Problem:**
- media.v1.json is a static build artifact
- KV is the runtime authority
- There's no reconciliation mechanism between static and runtime
- Changes to static files don't automatically update KV

**Consequence:**
- Static media records can become stale or out of sync with KV
- Brand authority points to media IDs that don't exist in runtime
- No automatic synchronization mechanism

### Recommended Long-term Fix

1. **Bootstrap Mechanism:**
   - Implement admin API to bootstrap KV from static media.v1.json
   - Compute real content hashes from physical files during bootstrap
   - Create Blob metadata records
   - Only allow bootstrap with explicit authorization

2. **Reconciliation:**
   - Implement periodic reconciliation between static and runtime
   - Detect mismatches and log warnings
   - Provide admin interface to review and approve changes

3. **Media Authority Consistency:**
   - Ensure brand.v1.json only references media IDs that exist in media.v1.json
   - Add validation step during build to detect orphaned references
   - Fail build if brand authority points to non-existent media

## Current Status

**P0 Issues:**
- brand-hero does not exist in media authority
- Content hashes may be synthetic (not verified)
- Blob metadata may be missing in KV
- No reconciliation between static and runtime authority

**Next Steps:**
1. Immediate: Reassign brand hero to existing media (fences-001-hero)
2. Short-term: Verify content hashes and Blob metadata
3. Long-term: Implement bootstrap and reconciliation mechanisms
