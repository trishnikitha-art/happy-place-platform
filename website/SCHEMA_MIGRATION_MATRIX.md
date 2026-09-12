# Media Schema Migration Matrix

## Purpose
Document all schema changes to Media/DriveReference types and identify migration gaps that created malformed production records.

## Schema Evolution Timeline

### 2026-08-18: Commit `dc53f2d` - Initial Drive Ingest
**Schema State:**
- No `storage` field
- No `lifecycleState` field
- `drive` field present for Drive-backed records
- No discriminated union types

**Records Created:**
- Drive ingest created `lifecycleState: 'published'`, `source: 'local'` records
- **No storage field set** (field did not exist in schema)
- These records persisted to KV with content hash but no storage

**Migration Performed:** N/A (first version)

**Current Compatibility:** INCOMPATIBLE
- Current schema requires `storage` field for published local media
- Records from this window are malformed

---

### 2026-08-27: Commit `558ded3` - Lifecycle State Machine
**Schema Changes:**
- Added `lifecycleState` field with states: `source_reference`, `materializing`, `materialized`, `rendition_ready`, `published`, `stale`
- Added `sourceIdentityHash` for source references
- Added `provenance` with `august3_driveId`
- Still NO `storage` field

**Records Created:**
- Drive ingest now sets `lifecycleState: 'published'`
- Still no storage field

**Migration Performed:** NO

**Current Compatibility:** INCOMPATIBLE
- Records from this window lack storage field

---

### 2026-08-28: Commit `e2409e8` - Type-Safe Lifecycle Boundaries
**Schema Changes:**
- Introduced discriminated union types
- BaseMedia, DriveReference, MaterializingMedia, PublishedMediaAsset, StaleMedia
- Type guards for lifecycle states
- Still NO `storage` field

**Records Created:**
- Drive ingest creates PublishedMediaAsset (via union)
- Still no storage field

**Migration Performed:** NO

**Current Compatibility:** INCOMPATIBLE
- Records from this window lack storage field

---

### 2026-09-01: Commit `cc2e3b4` - Storage Field Added (CRITICAL GAP)
**Schema Changes:**
- Added `storage?: 'static' | 'blob'` to BaseMedia
- Updated isPublishedMediaAsset() to require storage field
- Updated verifyMaterializationState() to check storage
- Updated verifyPublicMediaAuthority() to check storage
- Updated resolvePublicMedia() to check storage

**Records Created:**
- New ingestions set `storage: 'blob'`
- **EXISTING RECORDS NOT MIGRATED**

**Migration Performed:** NO
- Commit message: "Added storage: 'static' to all 120 media records"
- This only updated static JSON authority, NOT KV records
- KV records from previous window remain without storage field

**Current Compatibility:** INCOMPATIBLE
- Records from 2026-08-18 to 2026-09-01 lack storage field
- These are the malformed records (e.g., `07c0eae184dc5a375f943a3ac2b67e95`)

**Impact:** CRITICAL
- Production KV contains records violating current schema
- Public media gate rejects these records
- This is the root cause of "one photo works, others disappear"

---

### 2026-09-01: Commit `3fc0974` - Reverted Storage Field
**Schema Changes:**
- Reverted storage field addition

**Migration Performed:** N/A (revert)

**Current Compatibility:** INCOMPATIBLE (but consistent with old records)

---

### 2026-09-01: Commit `38265fc` - Re-Added Storage Field
**Schema Changes:**
- Re-added `storage: 'static' | 'blob'` to BaseMedia
- Added reconciliation endpoint for static media

**Migration Performed:** PARTIAL
- Reconciliation endpoint added to repair missing storage
- BUT existing malformed records were NOT automatically migrated
- Requires manual diagnostic + repair

**Current Compatibility:** INCOMPATIBLE for old records
- Records from 2026-08-18 to 2026-09-01 still lack storage field
- Repair mechanism exists but requires manual execution

---

### 2026-09-04: Commit `ffc7d43` - Drive Ingest Storage Contract
**Schema Changes:**
- Drive ingest now explicitly sets `storage: 'blob'`
- Properly declares Blob storage for all Drive-ingested assets

**Records Created:**
- New ingestions have correct storage field

**Migration Performed:** NO (forward-only fix)

**Current Compatibility:** COMPATIBLE for new records
- New ingestions create schema-compliant records
- Old malformed records still exist

---

### 2026-09-07: Commit `acd88aa` - Storage Contract Enforcement
**Schema Changes:**
- saveMedia() now rejects published local media without storage field
- Storage must be 'static' or 'blob'
- Static storage requires valid /images/ path
- Blob storage requires content hash

**Records Created:**
- All new records must pass storage validation

**Migration Performed:** NO
- KV store now REJECTS malformed records
- Old malformed records remain in KV (created before validation)

**Current Compatibility:** COMPATIBLE for new records
- New ingestions cannot create malformed records
- Old malformed records persist (historical artifact)

**Impact:** CRITICAL GAP IDENTIFIED
- Production authority is inconsistent
- Contains both schema-compliant and schema-violating records
- Public gate correctly rejects malformed records
- System is NOT fully healthy until malformed records are remediated

---

## Migration Gaps Summary

| Date Range | Schema | Records Created | Migration | Current State |
|------------|--------|-----------------|-----------|---------------|
| 2026-08-18 to 2026-09-01 | No storage field | Published local without storage | N/A (field didn't exist) | MALFORMED |
| 2026-09-01 onward | Storage field required | None during gap | NOT PERFORMED | MALFORMED persists |
| 2026-09-04 onward | Ingest sets storage | Schema-compliant | N/A (forward fix) | COMPLIANT |
| 2026-09-07 onward | Validation enforces storage | Schema-compliant | NOT PERFORMED for old records | COMPLIANT new, MALFORMED old |

## Required Remediation

### Immediate Action Required
1. **Classify all malformed records** - Use `/api/admin/diagnostic/classify-storage-contract`
2. **Determine remediation strategy**:
   - Records in canonical static authority: Add `storage: 'static'`
   - Records with Blob metadata: Add `storage: 'blob'`
   - Records with no evidence: Delete or quarantine
3. **Execute repair** - Use existing repair endpoints
4. **Verify public gate acceptance** - Confirm all records now pass validation

### Malformed Record Evidence
- **ID**: `07c0eae184dc5a375f943a3ac2b67e95`
- **Creation window**: 2026-08-18 to 2026-09-01
- **Root cause**: Schema change without migration
- **Hash algorithm**: First 32 chars of SHA-256 (truncated, not MD5)
- **Status**: Historical schema migration artifact
- **Remediation**: Requires forensic classification + repair

## Hash Algorithm Clarification

**Finding:** `07c0eae184dc5a375f943a3ac2b67e95` is 32 hex characters

**Algorithm:** First 32 characters of SHA-256 hash (128 bits)

**Evidence:**
- Code at `website/src/app/api/drive/ingest/route.ts:276`:
  ```ts
  return contentHash.substring(0, 32); // First 32 hex chars = 128 bits
  ```
- Full SHA-256 is 64 hex characters (256 bits)
- Media ID is truncated to 32 chars for storage efficiency
- This is NOT MD5 (MD5 is also 32 chars but different algorithm)

**Implication:** The record ID is a truncated SHA-256, not a different hash algorithm. The "SHA256" label in the duplicate detection report is correct.

## Invariant Violation

**Current State:** Production KV authority is inconsistent
- Contains both schema-compliant and schema-violating records
- Violates the invariant: "All published local media must have valid storage field"

**Remediation Required:** YES
- Cannot declare system healthy until all records are schema-compliant
- Public gate correctly rejects malformed records (fail-closed behavior is correct)
- But authority itself must be consistent

## Conclusion

The malformed record `07c0eae184dc5a375f943a3ac2b67e95` is a historical schema migration artifact, not a bug in the current transaction path. However, the production authority remains inconsistent until all malformed records are classified and remediated.

The current transaction cannot reproduce this failure because:
1. Ingest explicitly sets `storage: 'blob'` (commit `ffc7d43`)
2. KV store validates storage field (commit `acd88aa`)

But the historical records from 2026-08-18 to 2026-09-01 persist and must be remediated.
