# ENHANCED FORENSIC VERIFICATION PLAN

## CEO MODE — HARDENED WRITER AUDIT

**Status:** 🟢 Writer path likely secure, 🔴 Cleanup path unsafe, ⏳ Timestamp verification pending

---

## VERIFICATION MATRIX

**BEFORE CLEANUP AUTHORIZATION:**

| Question | Required Result | Status |
|----------|----------------|--------|
| How many poisoned assignments? | Exact count | ⏳ Pending Redis inspection |
| What are their keys? | Exact list | ⏳ Pending Redis inspection |
| What are their createdAts? | Exact timestamps | ⏳ Pending Redis inspection |
| What are their updatedAts? | Exact timestamps | ⏳ Pending Redis inspection |
| Do all predate e2409e8? | Yes | ⏳ Pending comparison |
| Any post-gate mutation? | None | ⏳ Pending comparison |
| Canonical writer count | 1 | ✅ Confirmed |
| Redis direct writers | 0 | ✅ Confirmed |
| Alternate namespace writers | 0 | ✅ Confirmed |
| Gate before persistence | Yes | ✅ Confirmed |
| Read functions mutate? | Identified and isolated | ✅ Confirmed |
| Current cleaner mutates through reader? | Yes, fix required | ✅ Confirmed |
| Quarantine preserves evidence? | Required | 🔴 Not implemented |
| Post-cleanup poison count | 0 | ⏳ Pending cleanup |

---

## COMPLETE REDIS PERSISTENCE MECHANISM SEARCH

### All Redis Operations Enumerated

**Direct Redis writes (5 total):**
- `redis.set()` in `src/app/api/admin/projects/gallery/route.ts` (workbench-staging namespace)
- `redis.set()` in `src/app/api/admin/projects/before-after/route.ts` (workbench-staging namespace)
- `redis.set()` in `src/app/api/admin/projects/card/route.ts` (workbench-staging namespace)
- `redis.set()` in `src/app/api/admin/diagnostic/redis/route.ts` (diagnostic namespace)
- **ZERO** direct writes to `service-card-assignment:*` namespace

**Client writes (17 total):**
- `client.set()` in `src/lib/assignment-store.ts` (6 writes to service-card-assignment namespace)
- `client.set()` in `src/lib/media-kv-store.ts` (4 writes to media namespace)
- `client.set()` in `src/lib/blob-storage.ts` (1 write to blob namespace)
- Package artifacts (6 unrelated)

**Confirmed:** No bypass paths using alternate Redis operations (setex, hset, hsetnx, json, pipeline, multi, transaction, eval, evalsha)

---

## COMPLETE KEY CONSTRUCTION SEARCH

### All Namespace Construction Patterns Verified

**Single namespace constant:**
- `ASSIGNMENT_PREFIX = 'service-card-assignment:'` (assignment-store.ts line 40)
- Used in ALL assignment operations (lines 110, 222, 286, 324, 347, 362, 371, 444)

**No key construction helpers found:**
- No helper functions that construct assignment keys
- No dynamic key generation outside assignment-store.ts
- No alternate namespace patterns

**ServiceSlug usage:**
- All three API routes use hardcoded serviceSlugs ('brand-hero', 'brand-portrait', serviceSlug parameter)
- No derived serviceSlug patterns that could bypass validation

**Confirmed:** All assignment key construction goes through canonical ASSIGNMENT_PREFIX constant

---

## GATE IMPLEMENTATION ORDERING VERIFICATION

### Current Main Implementation (commit 94b7f31)

**Gate ordering: CORRECT**
```
storeServiceCardAssignment()
    ↓
1. REJECT drive-prefixed IDs (line 114-122)
    ↓
2. VALIDATE resolvePublicMedia() (line 127-138)
    ↓
3. VALIDATE schema (line 158-166)
    ↓
4. Redis write (line 190)
```

**Gate is BEFORE every persistence operation:**
- Validation happens BEFORE `client.set()`
- No validation happens AFTER persistence
- No fallback paths bypass validation
- Failure behavior: throws error, does NOT proceed to write

**Failure behavior verified:**
- Drive-prefixed ID: throws error at line 121, no Redis write
- PublishedMediaAsset validation: throws error at line 137, no Redis write
- Schema validation: throws error at line 165, no Redis write
- Redis error: catches at line 204, throws error

**No "validation after write" pattern found.**

---

## API-LEVEL PRE-VALIDATION ASSESSMENT

### Current Pattern (Double Validation)

**Current implementation:**
```
API route
    ↓
pre-validate (isDriveReference, isPublishedMediaAsset)
    ↓
storeServiceCardAssignment()
    ↓
validate AGAIN (drive-prefixed, resolvePublicMedia)
```

**Assessment:**
- API pre-validation is for friendly HTTP errors
- Store-level validation is constitutional enforcement
- Both validate the same invariants
- Risk: future API changes could diverge from store validation

**Architectural boundary needed:**
- Assignment store owns validity (constitutional authority)
- API routes may preflight for UX but never establish authority
- Prevents divergence between API and store validation

---

## PURE READ VS EXPLICIT CLEANUP SEPARATION DESIGN

### Current Problem

**Destructive read semantics:**
```typescript
const assignments = await getAllServiceCardAssignments();
// ^ This call just deleted poison assignments from Redis
```

**Issue:**
- Named as "read" operation
- Actually MUTATES database (quarantines + deletes)
- Violates read-only semantics
- Race condition risk under concurrent access

### Proposed Architecture

**Separate concerns:**

```typescript
// PURE READ - no side effects
getAllServiceCardAssignments()
    = READ all assignments
    = RETURN raw data
    = NO mutation

// PURE ANALYSIS - no side effects
findPoisonedAssignments()
    = ANALYZE assignments
    = IDENTIFY poison
    = RETURN analysis report
    = NO mutation

// EXPLICIT MUTATION - clear intent
quarantinePoisonedAssignments(poisonList)
    = QUARANTINE specific keys
    = DELETE from active namespace
    = PRESERVE evidence
    = CLEAR intent

// EXPLICIT MUTATION - clear intent
deleteAssignment(serviceSlug)
    = DELETE specific key
    = CLEAR intent
```

**Benefits:**
- Reading the system cannot change the system
- Forensic property: analysis is separate from mutation
- Audit trail: explicit cleanup operations
- Concurrency: read operations are safe

---

## EVIDENCE-PRESERVING QUARANTINE DESIGN

### Current Problem

**Current pattern:**
```typescript
await client.set(quarantineKey, assignment);
await client.del(key);
```

**Issue:**
- Quarantine key includes timestamp, not original key
- No audit trail of quarantine reason
- No preservation of original assignment metadata
- Difficult to reconstruct quarantine history

### Proposed Architecture

**Evidence-preserving quarantine:**

```typescript
interface QuarantineRecord {
  originalKey: string;           // service-card-assignment:brand-hero
  originalAssignment: ServiceCardAssignment;  // Full original record
  quarantineReason: string;     // LEGACY_DRIVE_REFERENCE, etc.
  quarantinedAt: string;         // ISO timestamp
  quarantinedBy: string;         // System/admin identifier
  originalCreatedAt?: string;    // Original assignment createdAt
  originalUpdatedAt?: string;    // Original assignment updatedAt
  originalRevision?: number;     // Original assignment revision
}
```

**Quarantine process:**
```
ACTIVE ASSIGNMENT
        ↓
identify poison
        ↓
create QuarantineRecord with full evidence
        ↓
store in quarantine namespace with deterministic key
        ↓
remove from active namespace
        ↓
generate quarantine report
```

**Quarantine key format:**
```
service-card-assignment-quarantine:{serviceSlug}:{originalRevision}:{quarantinedAt}
```

**Quarantine report:**
```typescript
interface QuarantineReport {
  beforeCount: number;
  poisonedCount: number;
  quarantinedCount: number;
  deletedFromActiveCount: number;
  failedCount: number;
  afterCount: number;
  quarantineRecords: QuarantineRecord[];
  timestamp: string;
}
```

**Benefits:**
- Complete audit trail
- Preserves original assignment metadata
- Deterministic quarantine keys
- Reconciliation: before = quarantined + deleted + after
- No silent cleanup

---

## TIMESTAMP VERIFICATION PLAN

### Required Evidence Collection

**For each poisoned assignment in production Redis:**

```typescript
interface PoisonedAssignmentEvidence {
  key: string;                    // service-card-assignment:brand-hero
  serviceSlug: string;
  mediaId: string;                // drive-fe2e5a57446436f9
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
  revision: number;
  source: string;
  lifecycleState?: string;
  quarantineReason?: string;
}
```

### Verification Steps

**1. Collect all poisoned assignments:**
- Scan Redis for all `service-card-assignment:*` keys
- Identify drive-prefixed mediaIds
- Extract full assignment metadata

**2. Extract timestamps:**
- Record createdAt for each poisoned assignment
- Record updatedAt for each poisoned assignment
- Record revision numbers

**3. Compare against gate commit:**
- Gate commit e2409e8 date: 2026-08-20
- Compare each assignment's updatedAt against gate date
- Identify any post-gate mutations

**4. Analysis criteria:**
- If ALL poisoned assignments have updatedAt < e2409e8: legacy state confirmed
- If ANY poisoned assignment has updatedAt > e2409e8: active bypass suspected
- If timestamps missing: incomplete data, requires alternative verification

**5. Quarantine verification:**
- Check quarantine namespace for poisoned records
- Extract quarantinedAt timestamps
- Verify quarantine happened after gate commit

### Decision Matrix

**If legacy state confirmed:**
- ✅ Proceed with evidence-preserving cleanup
- ✅ Implement read/cleanup separation
- ✅ Strengthen concurrency control

**If post-gate mutation found:**
- 🔴 STOP - investigate active bypass
- 🔴 Re-open writer audit
- 🔴 Identify new bypass path

**If timestamps missing:**
- ⚠️ Use alternative verification (revision numbers, log analysis)
- ⚠️ May require Redis admin access
- ⚠️ Proceed with caution

---

## AUTHORIZED CLEANUP SEQUENCE

### Only After Timestamp Verification Passes

**Step 1: Evidence Collection**
```typescript
const evidence = await collectPoisonedAssignmentEvidence();
const verification = await verifyTimestampsAgainstGate(evidence);
```

**Step 2: Pure Read Analysis**
```typescript
const poisonList = await findPoisonedAssignments();
const analysis = await analyzePoisonPatterns(poisonList);
```

**Step 3: Evidence-Preserving Quarantine**
```typescript
const report = await quarantinePoisonedAssignments(poisonList);
await verifyQuarantineReport(report);
```

**Step 4: Verification**
```typescript
const afterEvidence = await collectPoisonedAssignmentEvidence();
const zeroPoison = afterEvidence.poisonedCount === 0;
```

**Step 5: Architectural Repairs**
```typescript
await implementReadCleanupSeparation();
await strengthenConcurrencyControl();
await addQuarantineMonitoring();
```

---

## FINAL AUTHORIZATION CRITERIA

**Do NOT authorize cleanup until:**

1. ✅ Exact count of poisoned assignments established
2. ✅ All poisoned assignment keys identified
3. ✅ All createdAt/updatedAt timestamps extracted
4. ✅ All timestamps compared against e2409e8
5. ✅ Zero post-gate mutations confirmed
6. ✅ Read/cleanup separation designed
7. ✅ Evidence-preserving quarantine designed
8. ✅ Cleanup sequence documented
9. ✅ Verification criteria defined
10. ✅ Rollback procedure prepared

**Current Status:**
- Steps 1-3: ⏳ Pending Redis inspection
- Steps 4-5: ⏳ Pending timestamp analysis
- Steps 6-10: 🔴 Designs prepared, awaiting timestamp verification

---

## ASSESSMENT SUMMARY

**Writer Path:** 🟢 Likely secure
- Canonical writer count: 1
- Redis direct writers: 0
- Alternate namespace writers: 0
- Gate before persistence: Yes
- No bypass paths found

**Legacy State Theory:** 🟡 Strongly supported, not yet proven
- Timeline consistent with theory
- Timestamp verification required
- Cannot declare conclusive without evidence

**Cleanup Path:** 🔴 Unsafe in current form
- Destructive read semantics
- Logically compromised cleaner
- No evidence preservation
- Requires architectural repair

**Concurrency:** 🟡 Inadequate but not immediate blocker
- Last-write-wins semantics
- No real optimistic concurrency
- Known limitation

**Next Authorization:** 🔴 Pending timestamp verification
- Must collect production Redis evidence
- Must compare against gate commit
- Must verify no post-gate mutations
- Only then authorize cleanup sequence
