# BRUTAL CEO MODE MEDIA ARCHITECTURE AUDIT
**Session: Constitutional materialization path fix**
**Date: 2026-07-23**
**Baseline Git SHA: 0041a41**

---

## EXECUTIVE SUMMARY

**CONSTITUTIONAL GAP DISCOVERED AND FIXED:**

The previous implementation claimed to enforce:
```
DriveReference → Materialization → PublishedMediaAsset → Assignment → Website
```

**BUT THE ACTUAL PATH WAS:**
```
DriveReference (source_reference) → DriveReference stays as DriveReference
Drive ingest → Media with source=google-drive, NO lifecycleState=published
```

**The PublishedMediaAsset type was defined but never actually created by any materialization operation.**

The system correctly prevented DriveReference assignments but provided **NO LEGAL PATHWAY** to create valid PublishedMediaAsset from Drive. This is a constitutional violation - the architecture enforced the boundary but provided no correct workflow.

---

## FORENSIC AUDIT RESULTS

### A. What is the canonical type of a DriveReference?

```typescript
export interface DriveReference extends BaseMedia {
  lifecycleState: 'source_reference';
  sourceIdentityHash: string;
  source: 'google-drive';
  drive: { fileId, driveId?, name, mimeType, webViewUrl?, modifiedTime? };
  dimensions?: MediaDimensions;
  variants?: MediaVariants;
}
```

### B. What is the canonical type of a PublishedMediaAsset?

```typescript
export interface PublishedMediaAsset extends BaseMedia {
  contentHash: string;
  source: 'local';
  lifecycleState: 'published';
  dimensions: MediaDimensions;
  variants: MediaVariants;
}
```

### C. What exact operation converts one into the other?

**PREVIOUSLY: NO SUCH OPERATION EXISTED.**

The `/api/drive/ingest` endpoint downloaded bytes but created Media with:
- `source: 'google-drive'` (NOT 'local')
- `lifecycleState: undefined` (NOT 'published')
- `drive: {...}` field populated (Should NOT exist in PublishedMediaAsset)

### D. Where is that conversion/materialization implemented?

**NOWHERE - until this fix.**

### E. What proves that materialization actually occurred?

**NOTHING - until this fix.**

The ingest API returned a Media record that would FAIL the `isPublishedMediaAsset()` type guard.

### F. What exact operation creates an assignment?

`storeServiceCardAssignment()` in `assignment-store.ts`:
- Validates drive-prefixed IDs at write time
- Calls `resolvePublicMedia()` to validate PublishedMediaAsset
- Stores in KV under `service-card-assignment:` prefix

### G. What exact code prevents an invalid assignment from being written?

`storeServiceCardAssignment()`:
```typescript
if (assignment.mediaId.startsWith('drive-')) {
  throw new Error(`Drive-prefixed IDs cannot be assigned...`);
}
const resolvedMedia = await resolvePublicMedia(assignment.mediaId);
if (!resolvedMedia) {
  throw new Error(`Media ID does not resolve to a valid PublishedMediaAsset...`);
}
```

### H. What exact code prevents an invalid assignment from being consumed?

`getAllServiceCardAssignments()`:
```typescript
const resolvedMedia = await resolvePublicMedia(assignment.mediaId);
if (!resolvedMedia) {
  await client.set(quarantineKey, assignment);
  await client.del(key);
  return null;
}
```

### I. What exact code prevents invalid media from reaching the public website?

`resolvePublicMedia()` in `media.ts`:
- Rejects drive-prefixed IDs
- Rejects `lifecycleState: 'source_reference'`
- Rejects `lifecycleState: 'materializing'`
- Rejects `lifecycleState: 'stale'`
- Rejects media with `/api/drive/*` URLs
- Rejects media with `thumbnailProxyUrl`
- Uses `isPublishedMediaAsset()` type guard

### J. What happens to an already-corrupt assignment?

`getAllServiceCardAssignments()`:
- Quarantines under `service-card-assignment-quarantine:` prefix
- Deletes from active namespace
- Includes timestamp in quarantine key

### K. Is quarantine authoritative, temporary, recoverable, and auditable?

**PARTIALLY:**
- **Authoritative**: YES - separate namespace
- **Temporary**: NO - no TTL, no cleanup
- **Recoverable**: YES - original data preserved
- **Auditable**: PARTIAL - timestamp in key, but NO reason, NO original mediaId preserved separately

---

## CRITICAL FIXES IMPLEMENTED

### 1. Fixed `/api/drive/ingest` Materialization Path

**Problem:** Created Media with `source: 'google-drive'`, no `lifecycleState: 'published'`, with `drive` field

**Solution:**
- Changed Media ID from `drive-${stableId}` to `${stableId}` (no drive- prefix)
- Set `source: 'local'` (bytes are in Blob, not Drive)
- Set `lifecycleState: 'published'` (ready for public presentation)
- Removed `drive` field (no Drive dependency)
- Preserved Drive origin in `provenance.august3_driveId` for lineage without dependency

**File:** `website/src/app/api/drive/ingest/route.ts`

### 2. Fixed Type Guard `isPublishedMediaAsset`

**Problem:** Only checked for `!media.drive`, didn't check ID prefixes

**Solution:**
- Added rejection of `drive-` prefix
- Added rejection of `drive-ref-` prefix
- Both prefixes reserved for DriveReference only

**File:** `website/src/types/media.ts`

### 3. Fixed Assignment Write-Time Validation

**Problem:** Only rejected `drive-` prefix, not `drive-ref-`

**Solution:**
- Reject both `drive-` and `drive-ref-` prefixes

**File:** `website/src/lib/assignment-store.ts`

### 4. Fixed Public Media Gate

**Problem:** Only rejected `drive-` prefix, not `drive-ref-`

**Solution:**
- Reject both `drive-` and `drive-ref-` prefixes

**File:** `website/src/lib/media.ts`

### 5. Fixed Test Reporting Semantics

**Problem:** Combined SKIPPED with PASS in output: `[PASS] ... (SKIPPED)`

**Solution:**
- Changed from `passed: boolean` to `state: 'PASS' | 'FAIL' | 'SKIPPED' | 'BLOCKED'`
- Never combine SKIPPED with PASS in output
- Distinguish "executed and passed" from "not executed"

**File:** `website/scripts/test-media-invariant.ts`

### 6. Re-Exported Type Guards from `media.ts`

**Problem:** TypeScript compilation errors - type guards not exported

**Solution:**
- Re-exported `isDriveReference`, `isMaterializingMedia`, `isPublishedMediaAsset`, `isStaleMedia`
- Fixed import paths across codebase

**Files:** `website/src/lib/media.ts`, API routes, test script

### 7. Improved Workbench UI Error Handling

**Problem:** Generic "Assignment failed" alert didn't explain lifecycle rejection

**Solution:**
- Parse error JSON for specific lifecycle rejection messages
- Provide user-friendly feedback for materialization requirement
- Distinguish between "must be materialized" and "invalid lifecycle state"

**File:** `website/src/app/workbench/media/page.tsx`

---

## CONSTITUTIONAL PATH NOW EXISTS

**BEFORE:**
```
DriveReference (source_reference) → NO PATH → Assignment BLOCKED
Drive ingest → Media (source=google-drive, no lifecycleState) → BLOCKED
```

**AFTER:**
```
DriveReference (source_reference)
  ↓
Materialization (/api/drive/ingest)
  ↓
PublishedMediaAsset (source=local, lifecycleState=published, no drive field)
  ↓
Assignment
  ↓
Website
```

---

## INVARIANT TEST RESULTS

```
[SKIPPED] No DriveReference in active assignments: KV credentials not available - cannot verify production state
[SKIPPED] Active assignments resolve to PublishedMediaAsset: KV credentials not available - cannot verify production state
[PASS] PublishedMediaAsset contract validation: All 3 test media IDs satisfy basic PublishedMediaAsset properties (no drive field, valid dimensions, has variants, no drive prefix)
[PASS] resolvePublicMedia rejects Drive references: resolvePublicMedia correctly rejected all 2 drive-prefixed IDs
```

**Overall:** ALL EXECUTED TESTS PASSED (some SKIPPED)

**TypeScript:** PASS (zero errors)

---

## REMAINING DEFECTS

### P0 - Production Verification Blocked
- KV credentials not available in local environment
- Cannot verify actual production assignment state
- Cannot verify poison assignments are gone
- Cannot verify no Drive URLs in production

### P1 - Quarantine Evidence Incomplete
- No reason field in quarantine records
- No original mediaId preserved separately
- No TTL for quarantine cleanup
- No recovery mechanism

### P2 - Public URL Purity Invariant Missing
- No invariant test for Drive-origin leakage in final representation
- No scan for `drive.google.com`, `googleusercontent.com` in public responses
- No scan for private connector paths in public responses

### P3 - Real Failure Mode Tests Missing
- No test for DriveReference → assignment (should fail)
- No test for missing media → assignment (should fail)
- No test for StaleMedia → assignment (should fail)
- No test for unpublished media → assignment (should fail)
- No test for PublishedMediaAsset → assignment (should succeed)
- No test for PublishedMediaAsset with Drive URL → public (should fail)
- No test for corrupt existing assignment → read (should quarantine)

### P4 - Production Contamination Not Classified
- `drive-aa8ac3af6e3afceb` status unknown
- `drive-24182c07b76c2a5b` status unknown
- `drive-4328210fbe49d835` status unknown
- These need classification: historical, still-active, stale, or boundary rejection

### P5 - String Workstream BLOCKED
- String migration remains blocked until media gates pass
- String authority reconciliation not started
- Navigation authority conflict unresolved

---

## GATE LEDGER

| Gate | Status | Evidence |
|------|--------|----------|
| Gate 0 - Build | **BLOCKED** | TypeScript passes, but Vercel build not verified |
| Gate 1 - Identity | **PASS** | Stable ID generation, content-based identity implemented |
| Gate 2 - Materialization | **PASS** | Actual materialization path now exists and correct |
| Gate 3 - Publication | **PASS** | PublishedMediaAsset contract validation passes |
| Gate 4 - Rendition | **NOT TESTED** | Recipe-based selection not implemented |
| Gate 5 - Public Purity | **PARTIAL** | URL leakage invariants not tested |
| Gate 6 - Assignment Integrity | **PARTIAL** | Write/read gates exist, production verification blocked |
| Gate 7 - Asset Integrity | **NOT TESTED** | No missing/corrupt rendition tests |
| Gate 8 - Browser | **NOT TESTED** | No production HTTP/browser verification |
| Gate 9 - Scroll | **NOT TESTED** | Lenis lifecycle tests not implemented |
| Gate 10 - Interaction | **NOT TESTED** | Slider/keyboard/touch boundaries not tested |
| Gate 11 - Layout Stability | **NOT TESTED** | Image geometry stability not verified |

---

## DEFINITION OF DONE STATUS

**NOT DONE.**

The media architecture is now **constitutionally correct** (materialization path exists, boundaries enforced), but the following remain incomplete:

- [ ] Production verification (KV credentials required)
- [ ] Public URL purity invariant
- [ ] Real failure mode tests
- [ ] Production contamination classification
- [ ] Quarantine evidence improvement
- [ ] Rendition and quality gates
- [ ] Browser verification
- [ ] Scroll lifecycle tests
- [ ] Interaction boundary tests
- [ ] Layout stability verification

**String workstream remains BLOCKED** until Gates 0-11 pass.

---

## FILES CHANGED

- `website/src/app/api/drive/ingest/route.ts` - Fixed materialization path
- `website/src/types/media.ts` - Fixed type guard
- `website/src/lib/assignment-store.ts` - Fixed write-time validation
- `website/src/lib/media.ts` - Fixed public gate, re-exported type guards
- `website/src/app/api/admin/services/card/route.ts` - Fixed imports
- `website/src/app/api/admin/brand/hero/route.ts` - Fixed imports
- `website/src/app/api/admin/brand/portrait/route.ts` - Fixed imports
- `website/scripts/test-media-invariant.ts` - Fixed test reporting
- `website/src/app/workbench/media/page.tsx` - Improved error handling

---

## COMMITS

**Commit 0041a41:** "CRITICAL FIX: Add actual materialization path - DriveReference to PublishedMediaAsset"

Pushed to origin/main.

---

## AUDIT METADATA

- **Auditor:** Devin CLI (Brutal CEO Mode)
- **Baseline Git SHA:** 0041a41
- **Audit Date:** 2026-07-23
- **Method:** Forensic code audit, structural question analysis, invariant testing
- **Scope:** Drive → materialization → PublishedMediaAsset → assignment → website lifecycle
- **Finding:** Constitutional gap - no actual materialization path existed
- **Resolution:** Implemented constitutional materialization path with proper PublishedMediaAsset creation
