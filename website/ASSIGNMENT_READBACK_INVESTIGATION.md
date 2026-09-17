# Assignment Readback Mismatch Investigation

## Production Evidence

Vercel production logs show `ASSIGNMENT_READBACK_MISMATCH` twice:

1. **expectedRevision: 15, actualRevision: 14**
2. **expectedRevision: 14, actualRevision: 13**

This indicates the readback barrier is correctly catching a real state discrepancy: the authoritative assignment store is not being updated as expected.

## Current Flow Analysis

### Write Path (atomicPromoteAssignments)

**Location**: `src/lib/deployment-transaction.ts`

```lua
-- Phase 1: Validate all expected revisions
for i, assignment in ipairs(assignmentsData) do
  local assignmentKey = namespace .. 'service-card-assignment:' .. assignment.serviceSlug
  local current = redis.call('GET', assignmentKey)
  
  if current then
    local parsed = cjson.decode(current)
    local expectedRevision = assignment.expectedRevision
    
    -- Check if current revision matches expected
    if parsed.revision ~= expectedRevision then
      return {err = 'CAS_FAILURE', serviceSlug = assignment.serviceSlug, expectedRevision = expectedRevision, actualRevision = parsed.revision}
    end
  end
end

-- Phase 2: Atomically write all assignments
for i, assignment in ipairs(assignmentsData) do
  local assignmentKey = namespace .. 'service-card-assignment:' .. assignment.serviceSlug
  -- Increment revision for write
  assignment.revision = assignment.expectedRevision + 1
  local assignmentValue = cjson.encode(assignment)
  
  redis.call('SET', assignmentKey, assignmentValue)
end
```

**Namespace**: From `getKvNamespace()` via `environment.ts`
- Production: `hpp:production:`
- Key format: `hpp:production:service-card-assignment:{serviceSlug}`

### Read Path (use-drive-asset/route.ts)

**Location**: `src/app/api/workbench/use-drive-asset/route.ts`

```typescript
// Step 1: Read assignment after promotion
const readbackAssignment = await getServiceCardAssignment(serviceSlug);

// Step 2: Independent readback after deploy
const independentAssignment = await getServiceCardAssignment(serviceSlug);

// Step 3: Verify revision advanced
if (independentAssignment.revision !== (readbackAssignment?.revision || 0) + 1) {
  console.error('[USE_DRIVE_ASSET] ASSIGNMENT_READBACK_MISMATCH', {
    reason: 'Assignment revision does not match expected CAS advancement',
    expectedRevision: (readbackAssignment?.revision || 0) + 1,
    actualRevision: independentAssignment.revision,
  });
}
```

**Namespace**: From `getKvNamespace()` via `assignment-store.ts`
- Production: `hpp:production:`
- Key format: `hpp:production:service-card-assignment:{serviceSlug}`

## Potential Root Causes

### 1. Namespace Mismatch Between Write and Read

**Check**: Does `atomicPromoteAssignments` use the same namespace as `getServiceCardAssignment`?

- `atomicPromoteAssignments`: Uses `getKvNamespace()` from `environment.ts`
- `getServiceCardAssignment`: Uses `getKvNamespace()` from `assignment-store.ts`

Both should resolve to the same namespace, but there could be a subtle difference in how they detect the environment.

### 2. atomicPromoteAssignments Not Actually Called

**Check**: Does the deploy route actually call `atomicPromoteAssignments`?

Looking at the deploy route, it imports `atomicPromoteAssignments` but we need to verify it's actually invoked in the POST handler.

### 3. Redis Write Failing Silently

**Check**: Does the Lua script return success but the write doesn't persist?

The script returns `{ok = 'PROMOTED', count = #assignmentsData}` on success, but we need to verify Redis actually persisted the writes.

### 4. Readback Happening Before Write

**Check**: Is there a race condition where the readback happens before the Redis write completes?

The deploy route should be synchronous, but if there's any async operation between the write and readback, this could cause the mismatch.

### 5. Stale Read from Different Environment

**Check**: Is the readback accidentally reading from a different environment's namespace?

If the environment detection is inconsistent, the write could go to `hpp:production:` but the readback could go to `hpp:development:`.

## Investigation Steps

1. Verify deploy route actually calls `atomicPromoteAssignments`
2. Add forensic logging to confirm the exact namespace used in write vs read
3. Verify Redis write actually persisted by adding a readback inside the deploy route
4. Check if there's any async operation between write and readback
5. Verify environment detection is consistent between the two modules

## Fix Approach

Once the root cause is identified:

- If namespace mismatch: Unify namespace detection across all modules
- If async race: Make readback wait for write confirmation
- If write failure: Add explicit verification that write succeeded before proceeding
- If environment detection issue: Fix environment detection logic

The fix must preserve:
- CAS semantics
- Atomic promotion
- Readback barrier integrity
- Git/Redis split-brain recovery capability
