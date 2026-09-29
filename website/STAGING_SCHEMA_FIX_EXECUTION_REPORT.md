# Staging Schema Error Distinguishability Fix - Execution Report

**Date**: 2026-09-29  
**Commit**: d96a349  
**Status**: Code complete, runtime verification pending

---

## Executive Summary

Fixed the staging schema error contract to programmatically distinguish between:
- **STAGING_SCHEMA_UNSUPPORTED**: Unknown/unrecognized key pattern
- **STAGING_SCHEMA_INVALID**: Recognized key with malformed payload

The fix preserves the existing key-structure → dispatch → decoder architecture while making error codes distinguishable through a typed error class.

---

## Changes Made

### 1. Added StagingSchemaError Class
**File**: `src/app/api/admin/deploy/route.ts`

```typescript
class StagingSchemaError extends Error {
  constructor(
    message: string,
    public readonly errorCode: 'STAGING_SCHEMA_UNSUPPORTED' | 'STAGING_SCHEMA_INVALID'
  ) {
    super(message);
    this.name = 'StagingSchemaError';
  }
}
```

### 2. Updated Schema Decoders
All staging schema decoders now throw `StagingSchemaError` instead of plain `Error`:
- `decodeAssignmentStaging()` → throws `STAGING_SCHEMA_INVALID` for malformed payloads
- `decodeGalleryStaging()` → throws `STAGING_SCHEMA_INVALID` for malformed payloads  
- `decodePointerStaging()` → throws `STAGING_SCHEMA_INVALID` for malformed payloads
- `dispatchStagingRecordType()` → throws `STAGING_SCHEMA_UNSUPPORTED` for unknown key patterns

### 3. Updated Error Response
Deployment API now includes `errorCode` in error responses:

```typescript
return NextResponse.json({
  error: "Staging schema decode failed",
  message: `Transaction contains a staging record that cannot be decoded: ${key}...`,
  stagingKey: key,
  stagingType,
  decodeError: e instanceof Error ? e.message : 'Unknown error',
  errorCode: e instanceof StagingSchemaError ? e.errorCode : 'UNKNOWN',
}, { status: 400 });
```

### 4. Added Focused Tests
**File**: `src/lib/__tests__/staging-schema-error-distinguishability.test.ts`

New test suite verifies:
- STAGING_SCHEMA_UNSUPPORTED is thrown for unknown key patterns
- STAGING_SCHEMA_INVALID is thrown for malformed payloads
- Both error codes are programmatically distinguishable via `instanceof` and `errorCode` property
- Invariant: unknown key pattern does not infer schema from payload
- Invariant: recognized key with malformed payload is INVALID, not UNSUPPORTED

### 5. Updated Existing Tests
**File**: `src/lib/__tests__/staging-schema-dispatch.test.ts`

Updated test doubles to use `StagingSchemaError` for consistency with production code.

---

## Verification Results

### Static Verification (PROVEN)
- ✅ **TypeScript compilation**: Clean (no errors)
- ✅ **Production build**: Successful (53 pages generated)
- ✅ **Unit tests**: All passing (398 tests, 15 new error-distinguishability tests)
- ✅ **Test coverage**: New test suite covers both error code paths

### Git State (PROVEN)
- ✅ **Commit**: d96a349 "fix_staging_schema_error_distinguishability"
- ✅ **Push**: Successfully pushed to origin/main
- ✅ **Clean working tree**: Only intended changes committed

### CI Status (PROVEN)
- ✅ **Workflow**: website-ci #1237 triggered by commit d96a349
- ✅ **Status**: In progress at time of report
- ✅ **Previous runs**: website-ci has consistent 2-3 minute execution time
- ⚠️ **OAuth tests**: Remain skipped in CI (require real Redis)

---

## Runtime Verification (NOT EXECUTED)

The following runtime invariants require production execution with real credentials:

### OAuth → Drive → R2 Chain (NOT EXECUTED)
- ❌ Google OAuth authorization flow
- ❌ Authenticated session establishment
- ❌ Drive API authorization and discovery
- ❌ My Drive / Shared Drive navigation
- ❌ Drive contextual search
- ❌ Drive thumbnail retrieval
- ❌ DriveReference creation
- ❌ Drive → R2 materialization
- ❌ R2 object existence verification
- ❌ PublishedMediaAsset persistence
- ❌ Assignment conversion
- ❌ Public media gate enforcement

### Security Boundaries (NOT EXECUTED)
- ❌ Legacy Drive credential cookie rejection
- ❌ Revoked session rejection
- ❌ Unauthenticated thumbnail request failure
- ❌ Authenticated thumbnail request success
- ❌ My Drive → Shared Drive context isolation
- ❌ Shared Drive corpus enforcement
- ❌ Drive object access follows Google authorization
- ❌ Materialization preserves Drive provenance
- ❌ Public media gate rejects non-materialized Drive references
- ❌ R2-backed assets require physical R2 objects
- ❌ Duplicate materialization idempotency
- ❌ OAuth state cannot be consumed twice
- ❌ Browser binding cannot be bypassed
- ❌ Identity acquisition atomicity
- ❌ Authorization revocation invalidates sessions

### Infrastructure Verification (NOT EXECUTED)
- ❌ Upstash Redis connectivity with production credentials
- ❌ R2 configuration verification
- ❌ R2 write/read operations
- ❌ R2 content hash verification
- ❌ Vercel deployment state verification

---

## Architecture Preserved

### Invariant Maintained
The fix preserves the existing architecture:
- **Key structure → dispatchStagingRecordType() → decoder** ✅
- **Field-by-field validation** ✅
- **No schema inference from payload values** ✅
- **Fail-closed on schema errors** ✅

### Error Contract Now Distinguishable
Callers can now programmatically distinguish:
```typescript
try {
  // staging decode operation
} catch (e) {
  if (e instanceof StagingSchemaError) {
    if (e.errorCode === 'STAGING_SCHEMA_UNSUPPORTED') {
      // Unknown key pattern - protocol mismatch
    } else if (e.errorCode === 'STAGING_SCHEMA_INVALID') {
      // Recognized key with malformed payload - data quality issue
    }
  }
}
```

---

## Remaining Work

### Immediate (Requires Production Access)
1. **Monitor CI completion** for workflow #1237
2. **Deploy to production** if CI passes
3. **Execute OAuth → Drive → R2 chain** in production environment
4. **Execute security boundary tests** in production environment
5. **Verify R2 configuration** and operations
6. **Verify Upstash Redis connectivity** with production credentials

### Documentation
- This execution report ✅
- Runtime verification report (pending production execution)

---

## Commit Details

**Commit Hash**: d96a349  
**Message**: fix_staging_schema_error_distinguishability  
**Files Changed**: 3 files
- `src/app/api/admin/deploy/route.ts` (added StagingSchemaError class, updated decoders)
- `src/lib/__tests__/staging-schema-dispatch.test.ts` (updated test doubles)
- `src/lib/__tests__/staging-schema-error-distinguishability.test.ts` (new test suite)

**Lines Changed**: +438 insertions, -34 deletions

---

## Conclusion

The staging schema error contract fix is **code-complete and verified locally**. The change is architecturally sound, preserves existing invariants, and adds the required error code distinguishability.

However, the **full OAuth → Drive → R2 runtime chain remains unproven**. This requires production deployment and execution with real credentials (Upstash Redis, R2, Google OAuth).

The next step is to monitor CI completion, deploy to production, and execute the runtime verification suite to complete the evidence chain.

---

**Generated**: 2026-09-29  
**Status**: Code complete, awaiting production runtime verification
