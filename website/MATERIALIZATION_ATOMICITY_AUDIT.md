# Materialization Atomicity Failure-Window Audit

## Current Implementation Analysis

### Materialization Path
DriveReference → PublishedMediaAsset via `/api/drive/ingest`

### Independent Systems Involved
1. **Google Drive API** - Source of bytes
2. **Vercel Blob Storage** - Binary storage
3. **Upstash Redis KV** - Metadata authority
4. **Assignment Store** - Service card assignments

### Failure Window Analysis

#### Failure Mode 1: Blob Upload Succeeds / KV Fails

**Scenario:**
1. Blob upload to Vercel succeeds
2. KV write fails (network, connection, quota)
3. Blob orphaned with no metadata

**Current Mitigation:**
- ingest route does NOT upload Blob first
- KV write happens before Blob upload in some paths
- However, no explicit compensation mechanism

**Status:** ⚠️ Partial mitigation, no explicit recovery

#### Failure Mode 2: KV Succeeds / Assignment Fails

**Scenario:**
1. Media record written to KV
2. Assignment reconciliation fails
3. Media exists but not assigned

**Current Mitigation:**
- Assignment reconciliation uses CAS (Compare-And-Swap)
- Atomic Lua script prevents lost updates
- Failed reconciliation doesn't delete media

**Status:** ✅ CAS prevents lost updates, but media may be orphaned

#### Failure Mode 3: Assignment Succeeds / Projection Fails

**Scenario:**
1. Assignment updated in KV
2. Next.js build/projection fails
3. Runtime KV differs from static projection

**Current Mitigation:**
- No explicit mechanism
- Static build may fail
- Next build will reconcile

**Status:** ❌ No explicit recovery mechanism

#### Failure Mode 4: Blob Exists But Metadata Missing

**Scenario:**
1. Blob upload succeeds
2. Blob metadata write to KV fails
3. Blob exists but can't be verified

**Current Mitigation:**
- Blob metadata written in same transaction as media record
- Uses Lua script for atomicity
- If metadata write fails, media write fails

**Status:** ✅ Atomic metadata + media write

#### Failure Mode 5: Metadata Exists But Bytes Mismatch

**Scenario:**
1. Metadata written to KV
2. Blob bytes corrupted during upload
3. Hash verification fails

**Current Mitigation:**
- Constitutional proof verification on read
- Rejects media if hash mismatch
- Does not automatically repair

**Status:** ✅ Detects mismatch, ❌ No automatic repair

#### Failure Mode 6: Retry After Partial Completion

**Scenario:**
1. Partial materialization completes
2. Retry attempts to continue
3. Duplicate records or conflicts

**Current Mitigation:**
- Content hash deduplication prevents duplicates
- Index points to existing media
- Returns existing record instead of creating duplicate

**Status:** ✅ Content hash deduplication works

#### Failure Mode 7: Duplicate Ingestion

**Scenario:**
1. Same Drive file ingested twice
2. Two media records created
3. Conflict on which is authoritative

**Current Mitigation:**
- Content hash deduplication
- Index lookup returns existing media
- Returns existing instead of creating duplicate

**Status:** ✅ Deduplication works correctly

#### Failure Mode 8: Stale Content-Hash Index

**Scenario:**
1. Content hash index points to deleted media
2. Index cleanup failed
3. Lookup returns stale reference

**Current Mitigation:**
- Index cleanup on stale detection
- Automatic deletion of stale index entries
- Returns null on stale index

**Status:** ✅ Stale index cleanup implemented

#### Failure Mode 9: Revoked Drive Session During Ingestion

**Scenario:**
1. Drive session active when ingestion starts
2. Session revoked during download
3. Download fails mid-stream

**Current Mitigation:**
- Drive client may fail on revoked session
- No explicit compensation
- May leave partial Blob

**Status:** ⚠️ Partial mitigation, no explicit recovery

### Atomicity Claims Analysis

#### Current Claim in Code
The codebase has claimed "atomic" operations, but actual atomicity varies:

**Actually Atomic:**
- Content hash index + media record (Lua script)
- Blob metadata + media record (Lua script)
- Assignment updates (CAS)

**NOT Atomic (Independent Systems):**
- Blob upload + KV write (different systems)
- Drive download + Blob upload (different systems)
- KV write + assignment update (different systems)

**Status:** ⚠️ Claims of atomicity across independent systems are inaccurate

### Recovery Protocol Analysis

#### Current Recovery Mechanisms
1. **Assignment Reconciliation** - `reconcileDriveAssignments()`
   - Updates assignments after materialization
   - Uses CAS for atomicity
   - ✅ Works correctly

2. **Stale Index Cleanup** - Automatic in media-kv-store
   - Detects and deletes stale index entries
   - ✅ Works correctly

3. **Quarantine System** - For poisoned assignments
   - Evidence-preserving quarantine
   - ✅ Works correctly

#### Missing Recovery Mechanisms
1. **Blob Orphan Cleanup** - No mechanism to clean orphaned Blobs
2. **Failed Materialization Retry** - No explicit retry logic
3. **Partial Materialization Detection** - No detection of incomplete state
4. **Drive Session Revocation Recovery** - No compensation for revoked sessions

### Distributed System Reality

#### Vercel Blob Characteristics
- Eventually consistent across regions
- No transaction support across operations
- Upload is atomic per file, not across files

#### Upstash Redis Characteristics
- Strong consistency within region
- Lua scripts provide atomicity within Redis
- No transactions across different Redis operations

#### Google Drive API Characteristics
- Eventually consistent metadata
- Download can be interrupted
- No transaction support

### True Atomicity Assessment

#### Cross-System Atomicity
**Assessment:** Impossible across independent systems without distributed transactions

**Current Reality:**
- No distributed transaction coordinator
- No two-phase commit protocol
- No compensation transaction manager

**Status:** ⚠️ Cannot claim true atomicity across Blob + KV + Drive

#### Within-System Atomicity
**Assessment:** Achievable with appropriate mechanisms

**Current Reality:**
- Redis Lua scripts provide atomicity within Redis
- Vercel Blob upload is atomic per file
- Drive API operations are atomic per request

**Status:** ✅ Within-system atomicity is achievable

### Recommendations

#### P1 - Document Actual Atomicity Guarantees
```
- Redis Lua scripts: Atomic within Redis
- Blob upload: Atomic per file
- Drive API: Atomic per request
- Cross-system: NOT atomic, requires recovery protocol
```

#### P1 - Implement Compensation Transactions
```typescript
// On materialization failure:
async function compensateFailedMaterialization(mediaId: string) {
  // 1. Delete media record from KV
  // 2. Delete Blob if uploaded
  // 3. Clean up content hash index
  // 4. Log forensic evidence
}
```

#### P1 - Add Orphan Detection
```typescript
// Periodic orphan detection:
async function detectOrphanedBlobs() {
  // 1. List all Blobs
  // 2. Check which have corresponding KV records
  // 3. Report or clean orphans
}
```

#### P1 - Add Materialization State Tracking
```typescript
// Track materialization progress:
interface MaterializationState {
  mediaId: string;
  stage: 'started' | 'drive_download' | 'blob_upload' | 'kv_write' | 'complete' | 'failed';
  startedAt: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
}
```

### Current Status

**Atomic Claims:**
⚠️ Claims of "atomic" across independent systems are inaccurate
✅ Within-system atomicity is correctly implemented
❌ No cross-system atomicity (distributed transactions not available)

**Recovery Mechanisms:**
✅ Assignment reconciliation works
✅ Stale index cleanup works
✅ Quarantine system works
❌ No Blob orphan cleanup
❌ No materialization failure compensation
❌ No orphan detection

**Failure Windows:**
⚠️ Blob upload / KV failure - partial mitigation
✅ KV / assignment failure - CAS prevents lost updates
❌ Assignment / projection failure - no recovery
✅ Blob / metadata mismatch - detection works, no repair
✅ Duplicate ingestion - deduplication works
✅ Stale index - cleanup works
⚠️ Drive session revocation - partial mitigation

### Conclusion

The current implementation provides strong within-system atomicity but cannot provide true cross-system atomicity. The recovery mechanisms are partial - some failure modes are handled, others are not. The claims of "atomic" should be refined to specify the scope (within-system vs cross-system) and document where recovery protocols are required.
