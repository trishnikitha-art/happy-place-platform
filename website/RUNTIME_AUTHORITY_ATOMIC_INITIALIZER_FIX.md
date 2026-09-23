# Runtime Authority Atomic Initializer Fix

## Problem Diagnosis

**Production Failure:** GET /api/admin/projects/gallery?projectId=fences-001 returns HTTP 503

**Root Cause:** Runtime authority key `hpp:production:workbench-runtime-gallery:fences-001` does not exist

**Architectural Context:**
- P0 runtime authority architecture established in commit `376ddd22` (2026-09-22)
- Per-project bootstrap endpoint exists but is not race-safe (GET → check → SET)
- Production correctly fails closed when runtime authority is missing
- Missing bridge: canonical projects → reliable runtime authority initialization

## Implementation Design

### P0 Architectural Guardrails

1. **Never overwrite existing runtime authority**
   - Initialize only if authority absent
   - Preserve existing revision/state untouched
   - Never reset revision from N to 0

2. **Atomic create-if-absent semantics**
   - Use Redis SET with NX (set if not exists)
   - Prevent race conditions: two simultaneous requests cannot both overwrite
   - Idempotent: safe to retry

3. **Single responsibility**
   - Initialize only from filesystem projection
   - Do not modify projects.v1.json
   - Do not modify staging, transactions, assignments, media authority, or deployments
   - Do not become a migration/reconciliation engine

4. **Observable initialization**
   - Report initialized, skipped, and failed projects individually
   - Require Workbench authentication
   - Provide audit trail

### Changes Made

#### 1. Bootstrap Endpoint - Atomic Create-If-Absent
**File:** `src/app/api/admin/projects/gallery/bootstrap/route.ts`

**Before (Race-Unsafe):**
```typescript
// Check if runtime authority already exists
const existingRuntime = await redis.get(runtimeKey);
if (existingRuntime) {
  return 409 Conflict;
}
// Initialize
await redis.set(runtimeKey, runtimePayload);
```

**After (Race-Safe):**
```typescript
// Read filesystem projection first
const runtimePayload = { /* ... */ };
// Use atomic create-if-absent (SET with NX)
const setResult = await redis.set(runtimeKey, runtimePayload, { nx: true });
if (!setResult) {
  // Key already exists - return existing authority
  return 200 OK with existingRuntime;
}
```

**Guarantee:** Two simultaneous bootstrap requests cannot both overwrite. Exactly one succeeds, other sees existing.

#### 2. Initialize-All Endpoint
**File:** `src/app/api/admin/projects/gallery/initialize-all/route.ts` (new)

**Behavior:**
- Enumerate all canonical projects from projects.v1.json
- For each project:
  - Use atomic create-if-absent (SET with NX)
  - If authority exists: skip (preserve existing revision/state)
  - If authority absent: initialize from filesystem projection
- Return detailed results: initialized, skipped, failed, errors

**Idempotency:**
```
Run once:  missing → initialize, existing → skip
Run ten times: same result (no state changes)
```

**Guardrails:**
- ✅ Never overwrites existing runtime authority
- ✅ Atomic create-if-absent prevents race conditions
- ✅ Existing revision/state survives untouched
- ✅ Missing authority gets initialized from deployed canonical projection
- ✅ Idempotent and safely retryable
- ✅ Reports initialized, skipped, and failed projects individually
- ✅ Requires Workbench authentication
- ✅ Does not become a migration/reconciliation engine

#### 3. Improved Error Messaging
**File:** `src/app/api/admin/projects/gallery/route.ts`

**Before:**
```json
{
  "error": "Runtime authority not initialized",
  "message": "Gallery runtime authority has not been initialized. Please contact administrator.",
  "projectId": "fences-001"
}
```

**After:**
```json
{
  "error": "Runtime authority not initialized",
  "message": "Gallery runtime authority has not been initialized for project: fences-001. Please contact administrator to initialize runtime authority.",
  "projectId": "fences-001",
  "suggestion": "Use POST /api/admin/projects/gallery/initialize-all to initialize runtime authority for all projects"
}
```

**Console Logging:**
```javascript
console.error('[GALLERY GET] RUNTIME_AUTHORITY_NOT_INITIALIZED', {
  projectId,
  message: 'Gallery runtime authority has not been initialized for this project',
  suggestion: 'Use POST /api/admin/projects/gallery/initialize-all to initialize runtime authority for all projects',
  timestamp: new Date().toISOString(),
});
```

#### 4. Workbench Error Surfacing
**File:** `src/app/workbench/media/page.tsx` (3 locations)

**Before:**
```typescript
throw new Error('Failed to load gallery');
```

**After:**
```typescript
if (response.status === 503 && errorData?.error === 'Runtime authority not initialized') {
  throw new Error(`Gallery runtime authority not initialized for project: ${projectId}. ${errorData.message || errorData.suggestion || ''}`);
}
throw new Error(`Failed to load gallery: ${errorText}`);
```

**Result:** User sees specific project ID and actionable suggestion instead of generic error.

#### 5. Adversarial Concurrency Tests
**File:** `src/lib/__tests__/runtime-initialization-concurrency.test.ts` (new)

**Test Scenarios:**
1. Single initialization - authority created correctly
2. Concurrent initialization - exactly one succeeds, other sees existing
3. Retry after initialization - second attempt skips (idempotent)
4. Existing authority preservation - revision/state never reset
5. Concurrent requests - exactly one succeeds with Promise.all
6. No overwrite - existing authority not replaced by filesystem projection
7. Missing authority - initialized with filesystem projection

**Purpose:** Prove atomic create-if-absent semantics prevent race conditions.

#### 6. CI Configuration
**Files:** `jest.oauth.integration.config.ts`, `jest.config.ts`

**Change:** Added `runtime-initialization-concurrency.test.ts` to Redis integration test configuration.

**Separation:** Unit test job (no Redis) vs integration test job (requires Redis credentials).

## Authority Architecture

### Preserved P0 Architecture

```
Filesystem / projects.v1
        │
        │ initialization ONLY
        ▼
POST /api/admin/projects/gallery/initialize-all
        │
        ├── enumerate canonical projects
        │
        ├── ENSURE(projectId)
        │      │
        │      ├── authority exists → SKIP
        │      │
        │      └── authority absent
        │             │
        │             └── atomic Redis create-if-absent
        │
        ▼
Redis runtime authority
        │
        └── all subsequent gallery mutation uses CAS
```

### Critical Boundaries

**Project Catalog (projects.v1):**
- Answers: Does this canonical project exist?
- Used for: Identity/existence only

**Runtime Authority (Redis):**
- Answers: What is the current mutable gallery state/revision?
- Used for: All subsequent mutation (CAS)

These are **not conflated**. The initialize-all endpoint only reads projects.v1 for identity, then creates runtime authority if absent.

## Deployment Sequence

### Current State
- GitHub main: `cfbf1a4e` (same-origin instrumented preview)
- Vercel production: Deployed from `cfbf1a4e`
- Runtime authority initialization: Missing bridge

### Deployment Steps

1. **Push branch to GitHub**
   - Branch: `fix/runtime-authority-atomic-initializer`
   - Verify diff against `cfbf1a4e`

2. **Review implementation**
   - Verify atomic initializer uses SET with NX
   - Verify cannot overwrite existing Redis authority
   - Verify adversarial tests pass

3. **CI execution**
   - Unit tests (no Redis required)
   - Redis integration tests (requires KV credentials)
   - TypeScript validation
   - Production build

4. **Merge to main**
   - Only after all checks pass
   - Commit with descriptive message

5. **Vercel deployment**
   - Automatic deployment from main
   - Wait for READY status

6. **Authenticated production initialize-all**
   - Authenticate to Workbench
   - Execute: `POST /api/admin/projects/gallery/initialize-all`
   - Review results (initialized vs skipped)
   - Verify all canonical projects now have runtime authority

7. **Verification**
   - Verify gallery reorder works for previously failing projects
   - Verify CAS behavior is correct
   - Verify existing revisions preserved (not reset)

## Execution Evidence Requirements

Before declaring success, report exact evidence for:

1. **Runtime authority key:** `hpp:production:workbench-runtime-gallery:{projectId}`
2. **Project ID:** Specific project being initialized
3. **Initial revision:** From filesystem projection
4. **Gallery IDs:** From filesystem projection
5. **Gallery GET status:** Should return 200 after initialization
6. **SLOT_REGISTER count:** Should register slots successfully
7. **SLOT_REORDER received:** Should reach parent successfully
8. **Pending order initialized:** Should create pending order
9. **PUT status:** Should return 200 with updated revision
10. **CAS revision transition:** Should increment exactly once
11. **Transaction ID:** Should be server-generated
12. **Deployment commit:** Should create Git commit
13. **Vercel deployment:** Should deploy successfully
14. **Final public gallery:** Should match Workbench state

## Security / Architectural Guardrails

**DO NOT:**
- ❌ Weaken runtime fail-closed semantics
- ❌ Restore filesystem CAS fallback
- ❌ Overwrite existing runtime authority
- ❌ Reset revisions from N to 0
- ❌ Make filesystem state authoritative
- ❌ Use staging as current CAS authority
- ❌ Create a second gallery authority
- ❌ Create a second drag/reorder mutation path
- ❌ Modify projects.v1.json
- ❌ Modify staging, transactions, assignments, media authority, or deployments

**DO:**
- ✅ Preserve P0 runtime authority architecture
- ✅ Use atomic create-if-absent semantics
- ✅ Make initialization idempotent and safely retryable
- ✅ Report initialization results individually
- ✅ Require Workbench authentication
- ✅ Maintain fail-closed semantics when runtime authority is uninitialized
- ✅ Preserve existing revisions and state
- ✅ Add adversarial concurrency tests

## Summary

This fix establishes the missing canonical → runtime-authority initialization bridge with atomic create-if-absent semantics, ensuring that two simultaneous initialization requests cannot overwrite each other. The implementation preserves all P0 architectural guardrails while providing a controlled, observable, and auditable initialization mechanism for all canonical projects.
