# Post-Commit Idempotency Failure Semantics Analysis

## Sequence

The current sequence in `use-drive-asset/route.ts` (lines 1260-1290):

1. **Atomic promotion** (via deploy route, line 1168-1227)
   - Assignment written to KV service-card-assignment store
   - Transaction committed → consumed
   - Git commit created
   - Vercel deployment triggered

2. **Assignment readback** (line 1230)
   - Read assignment from authoritative store
   - Verify media ID matches canonical media ID
   - If mismatch → return 500 error

3. **Consume transaction** (line 1262)
   - Mark transaction as consumed
   - Cleanup staging keys

4. **Record idempotency** (line 1288)
   - Write successful result to Redis cache
   - **Throws if Redis unavailable** (line 435)

5. **Release lock** (finally block, line 1292)
   - Always executes

6. **Return success** (line 1290)

## Failure Scenario: Idempotency Write Fails

If step 4 (`recordIdempotency`) fails:

1. `recordIdempotency` throws `REDIS_ERROR: Idempotency record failed - cannot proceed without durable completion record` (line 435)
2. Error propagates to catch block (line 1297)
3. Catch block returns 500 error with `TRANSACTION_ERROR` (line 1305-1312)
4. Finally block releases lock (line 1291-1295)
5. **Client receives 500 error**

However:
- Assignment WAS written to KV (step 1 succeeded)
- Transaction WAS consumed (step 3 succeeded)
- Git commit WAS created
- Vercel deployment WAS triggered
- **The actual mutation is live**

## Retry Behavior

On client retry (same idempotency key):

1. **Idempotency check** (line 296-327)
   - Cache miss (because write failed)
   - Proceeds to acquire lock

2. **Lock acquisition** (line 337-363)
   - Lock acquired (previous lock released in finally block)

3. **Drive metadata fetch** (lines 780-900)
   - Re-fetches Drive file
   - Re-ingests media
   - **May produce different canonical media ID** (if file changed)

4. **Staging write** (line 1135)
   - Writes NEW staging value

5. **Deploy transaction** (line 1168-1227)
   - **CAS check in deploy route will FAIL**
   - Assignment revision advanced from previous successful promotion
   - Expected revision from current attempt is stale
   - Deploy returns `CAS_MISMATCH` or similar error

6. **Transaction failure**
   - Deploy route marks transaction as failed
   - No duplicate mutation (CAS prevented it)

## Semantics Summary

### What actually happens:
- First request: Mutation succeeds, client sees error
- Retry: CAS prevents duplicate, client sees CAS error
- Net result: No duplicate mutation, but poor UX (client never sees success)

### What's protected:
- ✅ No duplicate assignment (CAS enforcement)
- ✅ No corrupted assignment (CAS prevents write with stale revision)
- ✅ Transaction state machine integrity (deploy route owns lifecycle)
- ✅ Lock cleanup (finally block ensures release)

### What's problematic:
- ❌ Client receives 500 on successful mutation
- ❌ Retry fails with CAS error (client never sees success)
- ❌ Idempotency cache is not authoritative (mutation can succeed without cache entry)

## Is This Acceptable?

**Arguments for acceptance:**
1. Existing transaction machinery already provides CAS protection
2. No data corruption possible
3. No duplicate mutation possible
4. Redis unavailability is rare in production
5. User requirement: "if existing transaction/readback machinery already handles this safely, document and test it rather than redesigning it"

**Arguments against acceptance:**
1. Poor UX - client never sees success when mutation actually succeeded
2. Idempotency cache is not truly authoritative
3. Retry path is guaranteed to fail (CAS mismatch)
4. No recovery mechanism for this edge case

## Recommendation

**Do not redesign** per user instruction. The current semantics are:
- Safe (no data corruption, no duplicates)
- Suboptimal (poor UX in Redis failure edge case)
- Acceptable given user preference to avoid redesign

**Document the behavior** in code comments and tests so future maintainers understand the tradeoff.

**Test the failure path** to verify CAS actually prevents duplicate on retry.

## Alternative (Rejected per User Instruction)

If redesign were allowed, the fix would be:
1. Record idempotency BEFORE mutation (optimistic cache)
2. On failure, clear cache to allow retry
3. Or use Redis transaction to atomically write both mutation and cache

But this requires significant redesign and the user explicitly requested to avoid that if existing machinery handles it safely.
