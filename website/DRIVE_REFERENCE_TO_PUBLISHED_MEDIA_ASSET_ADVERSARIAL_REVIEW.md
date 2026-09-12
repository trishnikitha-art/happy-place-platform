# DriveReference → PublishedMediaAsset Conversion: Adversarial Review

## Executive Summary

The Drive ingest path automatically converts Drive source material into PublishedMediaAsset records. This review examines whether this conversion can create security vulnerabilities, data corruption, or race conditions.

## Conversion Path

**Location:** `website/src/app/api/drive/ingest/route.ts`

**Flow:**
```
Drive file (source)
  ↓
Download bytes
  ↓
Compute SHA-256 content hash
  ↓
Check for existing record by content hash (deduplication)
  ↓
If exists + complete → return existing (reconciliation optional)
  ↓
If exists + incomplete → upgrade (needsUpgrade = true)
  ↓
If not exists or needs upgrade → materialize
  ↓
Upload Blob variants (original, webp, avif, thumbnail, blur, responsive)
  ↓
Create PublishedMediaAsset record
  ↓
Store in KV with storage: 'blob'
  ↓
Run assignment reconciliation (optional)
```

## Adversarial Attack Surface Analysis

### 1. Concurrent Ingestion Race Condition

**Attack Scenario:** Two users ingest the same Drive file simultaneously.

**Current Protection:**
- Content hash deduplication at line 618: `const existingMedia = await findMediaByContentHash(contentHash);`
- If record exists and is complete, returns existing (lines 630-704)
- If record exists but incomplete, sets `needsUpgrade = true` (lines 705-711)

**Vulnerability Analysis:**
- **Race window:** Between content hash check (line 618) and KV write (line 869)
- **Scenario:**
  1. Request A checks for existing record → none found
  2. Request B checks for existing record → none found
  3. Request A uploads Blob variants
  4. Request B uploads Blob variants (duplicate Blob uploads)
  5. Request A writes KV record
  6. Request B writes KV record (overwrites A's record)

**Impact:**
- Duplicate Blob storage (waste, not corruption)
- Last writer wins on KV record (but content hash is identical, so identity is preserved)
- Assignment reconciliation may run twice (idempotent by design)

**Mitigation:**
- Content hash deduplication prevents creating different IDs for same content
- Both requests create records with identical content hash and media ID
- Last writer wins but identity is stable (deterministic from content hash)
- Blob uploads are idempotent (same content hash = same Blob key)

**Conclusion:** LOW RISK - Identity is preserved, but duplicate Blob uploads occur. Acceptable tradeoff given complexity of distributed locking.

---

### 2. Assignment Overwrite During Deduplication

**Attack Scenario:** User A ingests content that already exists and is assigned to User B's slot.

**Current Protection:**
- Line 645-652: Reconciliation only runs if `!skipReconciliation && fileId`
- Line 647-652: Calls `reconcileDriveAssignments(existingMedia.id, fileId, contentHash, requestId)`
- Reconciliation logic (not shown in ingest route) should only update assignments where Drive file ID matches

**Vulnerability Analysis:**
- **Risk:** If reconciliation updates ALL assignments pointing to any Drive reference with this content hash, it could overwrite User B's assignment.

**Required Verification:**
- Check `reconcileDriveAssignments` implementation
- Verify it only updates assignments where `provenance.driveFileId === fileId`
- Verify it respects CAS (expectedRevision)

**Conclusion:** REQUIRES CODE INSPECTION - Cannot verify without seeing reconciliation implementation.

---

### 3. Malformed Drive Source Materialization

**Attack Scenario:** Attacker ingests malformed Drive file (e.g., corrupted bytes, invalid MIME).

**Current Protection:**
- Line 594-606: MIME/corpus validation before materialization
- Line 610: SHA-256 hash computation (will succeed even for corrupted bytes)
- Line 751-783: Sharp processing (may fail on corrupted images)
- Line 824-869: KV storage with validation (media-kv-store.ts)

**Vulnerability Analysis:**
- **Risk:** Corrupted bytes that Sharp can process will be materialized as valid PublishedMediaAsset
- **Impact:** Invalid images stored in Blob and KV, wasting storage and potentially breaking rendering

**Mitigation:**
- Sharp will reject many corrupted images
- Public media gate validates variants before rendering
- Workbench UI allows manual deletion of malformed assets

**Conclusion:** LOW RISK - Sharp processing catches most corruption, manual cleanup available for edge cases.

---

### 4. Blob Upload Failure Before KV Write

**Attack Scenario:** Blob upload succeeds, KV write fails (Redis unavailable).

**Current Protection:**
- Line 746-819: All Blob uploads happen sequentially
- Line 869: KV write happens AFTER all Blob uploads
- No transaction wrapping Blob + KV writes

**Vulnerability Analysis:**
- **Risk:** Orphaned Blob objects if KV write fails
- **Scenario:**
  1. Original Blob upload succeeds
  2. WebP Blob upload succeeds
  3. AVIF Blob upload succeeds
  4. KV write fails (Redis error)
  5. Blob objects remain in storage with no KV record

**Impact:**
- Storage waste (orphaned Blob objects)
- No way to reclaim Blob objects without manual cleanup
- Content hash index not created, so content cannot be deduplicated

**Mitigation:**
- Blob objects are content-addressed (named by content hash)
- Re-ingesting same content will reuse Blob objects (same content hash = same Blob key)
- Orphaned cleanup script could be added to find Blob objects without KV records

**Conclusion:** MEDIUM RISK - Orphaned Blob storage possible, but content-addressed design allows reuse on re-ingest.

---

### 5. Drive Provenance Loss During Materialization

**Attack Scenario:** Drive file is deleted after materialization but before provenance is stored.

**Current Protection:**
- Line 850-854: Provenance stored in media record before KV write
- Line 850: `provenance: { driveFileId: fileId, sharedDriveId: sharedDriveId, preserved_at: new Date().toISOString() }`
- Drive file ID is captured from request parameters, not from Drive API

**Vulnerability Analysis:**
- **Risk:** None - Drive file ID is captured from request, not dependent on Drive API availability
- Even if Drive file is deleted, provenance is preserved in KV

**Conclusion:** NO RISK - Provenance is captured before materialization.

---

### 6. Public Media Gate Bypass

**Attack Scenario:** Attacker tries to publish DriveReference (source_reference) as PublishedMediaAsset.

**Current Protection:**
- Line 845-848: Explicitly sets `lifecycleState: 'published'` and `source: 'local'`
- Drive references have `source: 'google-drive'` and `lifecycleState: 'source_reference'`
- Ingest route only creates `source: 'local'` records
- Public media gate (`resolvePublicMedia`) rejects non-local sources

**Vulnerability Analysis:**
- **Risk:** None - Ingest route cannot create DriveReference records
- DriveReference records are created by `/api/drive/reference` route (separate endpoint)
- Public media gate rejects DriveReference IDs

**Conclusion:** NO RISK - Source field prevents DriveReference from being published.

---

### 7. Content Hash Collision Attack

**Attack Scenario:** Attacker crafts two different files with same SHA-256 hash (collision).

**Current Protection:**
- SHA-256 is cryptographically secure
- Collision attacks are theoretically possible but computationally infeasible for 256-bit hash
- No known practical SHA-256 collisions exist

**Vulnerability Analysis:**
- **Risk:** THEORETICAL - SHA-256 collision would allow different content to masquerade as same asset
- **Impact:** Attacker could replace an image with malicious content while preserving ID

**Mitigation:**
- SHA-256 collision is computationally infeasible (requires 2^128 operations)
- In practice, this is not a realistic attack vector

**Conclusion:** NEGLIGIBLE RISK - Cryptographically infeasible.

---

### 8. Idempotency Failures

**Attack Scenario:** Client retries ingestion due to network error, creates duplicate records.

**Current Protection:**
- Line 618: Content hash deduplication
- Line 630-704: Returns existing record if complete
- Media ID is deterministic from content hash (line 824: `const mediaId = generateStableId(contentHash);`)

**Vulnerability Analysis:**
- **Risk:** None - Content hash deduplication prevents duplicate records
- Retries are safe

**Conclusion:** NO RISK - Idempotent by design.

---

## Summary of Findings

| Vulnerability | Risk Level | Mitigation | Status |
|---------------|------------|------------|--------|
| Concurrent ingestion race | LOW | Content hash deduplication preserves identity | ACCEPTABLE |
| Assignment overwrite during deduplication | UNKNOWN | Requires reconciliation code inspection | REQUIRES INVESTIGATION |
| Malformed Drive source materialization | LOW | Sharp processing + public gate validation | ACCEPTABLE |
| Blob upload failure before KV write | MEDIUM | Content-addressed Blob design allows reuse | ACCEPTABLE |
| Drive provenance loss | NONE | Provenance captured before materialization | NO RISK |
| Public media gate bypass | NONE | Source field prevents DriveReference publication | NO RISK |
| Content hash collision | NEGLIGIBLE | SHA-256 cryptographic security | ACCEPTABLE |
| Idempotency failures | NONE | Content hash deduplication | NO RISK |

## Required Follow-Up

1. **Investigate reconciliation implementation** - Verify `reconcileDriveAssignments` only updates assignments matching the specific Drive file ID, not all assignments with this content hash.

2. **Consider Blob orphan cleanup** - Add diagnostic to find Blob objects without corresponding KV records.

3. **Consider distributed locking** - If concurrent ingestion of same content becomes a problem, add Redis-based locking around content hash check + KV write.

## Conclusion

The DriveReference → PublishedMediaAsset conversion is **generally well-designed** with:
- Strong idempotency via content hash deduplication
- Proper source field separation (DriveReference vs PublishedMediaAsset)
- Provenance preservation before materialization
- Fail-closed public media gate

The **primary gap** is unknown behavior of the reconciliation function, which requires code inspection. Otherwise, the conversion path is secure and robust.

## Production Acceptance Recommendation

Before declaring this path production-ready:
1. Inspect `reconcileDriveAssignments` implementation
2. Test concurrent ingestion of same content
3. Test assignment reconciliation with multiple users
4. Verify Blob orphan cleanup if needed
