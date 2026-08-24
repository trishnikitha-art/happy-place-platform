# CEO MODE — BRUTAL FORENSIC AUDIT REPORT

**Date:** 2026-08-21
**Commit:** 364745d
**Status:** UNDER INVESTIGATION

---

## 1. GIT FORENSIC VERIFICATION

### Current State
- **HEAD:** 364745d4b6b8a023e2a54675d2a7dac91528c1fb
- **origin/main:** 364745d4b6b8a023e2a54675d2a7dac91528c1fb
- **Ancestry:** 94b7f31 → 5e656d5 → 364745d
- **Status:** ✅ Synchronized

### Files Changed (94b7f31 → 364745d)
- `website/src/lib/assignment-store.ts`: +719, -151
- `website/scripts/collect-assignment-evidence.mjs`: +227 (new file)

### Commit Inspection
- **Secret scan:** ✅ No credentials, tokens, or secrets in commit
- **Untracked files:** Audit reports intentionally uncommitted (not in commit)
- **Working tree:** Clean
- **Verification:** ✅ Commit contains only intended changes

### Diff Analysis
- Large single-file change (assignment-store.ts) is architectural boundary repair
- Evidence collector is new file, not modification of existing runtime
- No unrelated refactors detected
- No Sharp/scroll changes in this commit

---

## 2. IMPLEMENTATION AUDIT — CLAIM VERIFICATION

### Claim: "CAS-safe"
**Evidence:**
```typescript
// CAS-SAFE: Re-read current state before mutation
const currentAssignment = await client.get<ServiceCardAssignment>(key);

// Verify expected revision (CAS check)
if (currentAssignment && currentAssignment.revision !== originalAssignment.revision) {
  concurrentlyChangedCount++;
  continue;
}

// Remove from active namespace (CAS-safe: already verified revision)
await client.del(key);
```

**Verdict:** 🔴 **FALSE / OVERCLAIMED**

**Reason:**
- This is re-read-before-delete, NOT atomic CAS
- Race window exists between GET and DELETE
- Example:
  - A: GET revision 7
  - B: writes revision 8
  - A: sees revision 7, deletes
  - Result: newer record deleted by stale writer
- Correct classification: re-read-before-delete protection
- Atomic CAS would require conditional delete: `DEL key IF revision == 7`

---

### Claim: "Atomic"
**Evidence:**
```typescript
await client.set(quarantineKey, quarantineRecord);
await client.del(key);
```

**Verdict:** 🔴 **FALSE**

**Reason:**
- Two separate operations, not atomic
- Failure modes:
  - quarantine write succeeds, delete fails → record exists in both places
  - quarantine write fails, delete succeeds → evidence lost
  - process crashes between operations → indeterminate state
- Correct classification: two-phase mutation with recovery needed

---

### Claim: "Safe cleanup"
**Evidence:**
- Authorization boundary checks post-gate poison
- Authorization boundary checks chronology inconclusive
- Dry-run mode available

**Verdict:** 🟡 **PARTIALLY PROVEN**

**Reason:**
- Authorization checks are guards, not true access control
- Anyone who can invoke `quarantinePoisonedAssignments(poisonList, false)` has authorization
- No operator identity, approval token, or audit trail
- Correct classification: guard-based safety, not authorization system

---

### Claim: "Deterministic quarantine"
**Evidence:**
```typescript
const evidenceHash = await generateEvidenceHash(originalAssignment);
const quarantineKey = `${ASSIGNMENT_QUARANTINE_PREFIX}${evidenceHash}`;
```

**Verdict:** 🟡 **PARTIALLY PROVEN**

**Reason:**
- Evidence hash is deterministic (SHA-256 of selected fields)
- But evidence hash is INCOMPLETE:
  - Only hashes: serviceSlug, mediaId, revision, updatedAt
  - Missing: original Redis key, complete payload, schema version, namespace
  - Two materially different records could theoretically collapse to same hash
- Correct classification: partially deterministic, incomplete evidence identity

---

### Claim: "Evidence-preserving"
**Evidence:**
```typescript
interface QuarantineRecord {
  originalKey: string;
  originalAssignment: ServiceCardAssignment;
  quarantineReason: string;
  quarantinedAt: string;
  quarantinedBy: string;
  originalUpdatedAt?: string;
  originalRevision?: number;
  evidenceHash: string;
  gateClassification?: 'PRE_GATE' | 'POST_GATE' | 'UNKNOWN';
}
```

**Verdict:** 🟢 **PROVEN (with limitations)**

**Reason:**
- Preserves original assignment, key, timestamps, revision
- Preserves quarantine metadata (reason, timestamp, operator)
- Missing: raw payload bytes, schema version, original Redis namespace, complete original key
- Correct classification: evidence-preserving for business fields, incomplete for raw forensic reconstruction

---

### Claim: "Read-only" (evidence collector)
**Evidence:**
```typescript
let effectiveToken = readOnlyToken || token;
let isReadOnly = !!readOnlyToken;
```

**Verdict:** 🔴 **FALSE**

**Reason:**
- Falls back to writable credential
- Warns but does not fail closed
- Script can mutate if using writable credential
- Correct classification: read-only preferred, not enforced

---

### Claim: "Authorization boundary"
**Evidence:**
```typescript
if (postGatePoison.length > 0) {
  throw new Error('AUTHORIZATION_DENIED: Cannot quarantine post-gate poison');
}
```

**Verdict:** 🟡 **GUARD, NOT AUTHORIZATION**

**Reason:**
- No identity/access control
- No approval token or audit trail
- Boolean parameter, not authorization record
- Correct classification: guard-based safety, not authorization system

---

### Claim: "Canonical media authority"
**Evidence:**
```typescript
// Forensic script:
if (mediaId.startsWith('drive-') || mediaId.startsWith('drive-ref-')) {
  mediaLifecycleClassification = 'DRIVE_REFERENCE';
}
```

**Verdict:** 🔴 **FALSE**

**Reason:**
- Script duplicates classification logic
- Does not invoke canonical authority from media.ts
- Violates single-source-of-truth principle
- Correct classification: local duplicate, not canonical authority

---

### Claim: "Single writer"
**Evidence:**
- Only `storeServiceCardAssignment()` writes to `service-card-assignment:` namespace
- All known callers route through canonical gate

**Verdict:** 🟢 **PROVEN (current code only)**

**Reason:**
- Verified for current source code
- Does NOT prove historical causality
- Historical writer paths not investigated
- Correct classification: current single writer, historical causality unknown

---

### Claim: "No bypasses"
**Evidence:**
- Repository-wide search for `service-card-assignment:` writers
- Found only canonical writer

**Verdict:** 🟡 **CURRENT CODE ONLY**

**Reason:**
- Current source code verified
- Historical deployments not investigated
- Old API versions, scripts, cron jobs, admin tooling not investigated
- Correct classification: no current bypasses, historical bypasses unknown

---

### Claim: "Reconciliation"
**Evidence:**
```typescript
const expectedAfter = beforeCount - quarantinedCount - concurrentlyChangedCount;
const reconciliation = afterCount === expectedAfter;
```

**Verdict:** 🔴 **INCORRECT FORMULA**

**Reason:**
- Formula uses `quarantinedCount`, not actual successful deletes
- If quarantine write succeeds but delete fails:
  - quarantinedCount = 1
  - deletedFromActiveCount = 0
  - Formula predicts 1 fewer active record, but nothing was deleted
- Should reason from: beforeActiveCount - actualSuccessfulDeletes = expectedActiveCount
- Correct classification: reconciliation formula is mathematically incorrect

---

### Claim: "Chronology correctness"
**Evidence:**
```typescript
if (updatedAtDate < gateDate) {
  chronologyClassification = 'PRE_GATE_RECORDED';
}
```

**Verdict:** 🔴 **FALSE INTERPRETATION**

**Reason:**
- updatedAt < gate does NOT prove record existed before gate
- Only proves stored timestamp predates gate
- Timestamp provenance can be wrong (clock skew, migration, imports, manual repair)
- Correct classification: timestamp analysis, not chronology proof

---

## 3. CONCURRENCY INVESTIGATION

### Current Implementation
```
GET revision
  ↓
compare revision
  ↓
DELETE
```

### Race Window Analysis
**Scenario 1: Concurrent write**
```
T1: GET revision 7
T2: writes revision 8
T1: sees revision 7
T1: DELETE revision 8 (NEWER RECORD DELETED)
```

**Scenario 2: Concurrent quarantine**
```
A: GET revision 7, generate hash H
B: GET revision 7, generate hash H
A: write quarantine H
B: write quarantine H (overwrites)
A: DELETE
B: DELETE (second delete, idempotent but wasteful)
```

**Scenario 3: Quarantine + write**
```
A: GET revision 7
B: writes revision 8
A: sees revision 7, writes quarantine
A: DELETE (deletes revision 8, quarantine evidence for revision 7)
```

### Redis Operations Available
- @upstash/redis client does not expose WATCH/MULTI/EXEC
- No Lua scripting exposed
- No conditional delete primitive
- Cannot implement true atomic CAS with current client

### Smallest Correct Improvement
**Option 1: Accept re-read-before-delete as best effort**
- Document limitation explicitly
- Add monitoring for concurrent changes
- Accept that stale writer can delete newer record
- Status: ⚪ Requires risk acceptance

**Option 2: Implement application-level locking**
- Add Redis-based distributed lock
- Acquire lock before GET
- Release lock after DELETE
- Adds complexity, timeout handling
- Status: ⚪ Adds complexity, may be overkill

**Option 3: Add expectedRevision to delete operation**
- Check revision immediately before delete
- If changed, abort and report
- Still not atomic, but reduces window
- Status: ✅ Minimal improvement, already implemented

**Recommendation:** Current re-read-before-delete is best effort given client limitations. Document limitation explicitly. Do not claim "CAS-safe."

---

## 4. EVIDENCE INTEGRITY

### Current Evidence Hash
```typescript
const canonical = JSON.stringify({
  serviceSlug: payload.serviceSlug,
  mediaId: payload.mediaId,
  revision: payload.revision,
  updatedAt: payload.updatedAt,
});
```

### Missing Evidence Fields
- Original Redis key (only serviceSlug extracted)
- Complete raw payload (only ServiceCardAssignment fields)
- Schema version
- Original Redis namespace
- Exact serialized bytes
- Source environment
- Capture timestamp
- Gate metadata at capture time
- Operator/process identity

### Problem
Two materially different records could collapse to same hash if selected fields are identical but other fields differ.

### Smallest Correct Improvement
```typescript
async function generateEvidenceHash(key: string, payload: unknown): Promise<string> {
  const crypto = await import('crypto');
  const canonical = JSON.stringify({
    key,
    fullPayload: payload,
    schemaVersion: '1',
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}
```

**Status:** ⚪ Requires change to evidence hash algorithm

---

## 5. CHRONOLOGY — RUTHLESS ANALYSIS

### Current Model
```typescript
if (updatedAt < gateDate) {
  chronologyClassification = 'PRE_GATE_RECORDED';
}
```

### What This Actually Proves
- The stored updatedAt value is earlier than the gate timestamp
- NOTHING MORE

### What This Does NOT Prove
- Record creation time
- First observed time
- First write time
- Historical causality

### Timestamp Provenance Issues
- Application clock skew
- Migration scripts
- Imported records
- Old serialization logic
- Manual repair
- Replay
- Redis restore
- Test fixtures
- Deployment/environment differences

### Correct Classification
**Current:** PRE_GATE_RECORDED / POST_GATE_RECORDED
**Correct:** TIMESTAMP_PRE_GATE / TIMESTAMP_POST_GATE / TIMESTAMP_MISSING / TIMESTAMP_INVALID

**Critical distinction:**
- TIMESTAMP_PRE_GATE ≠ CREATION_PRE_GATE
- updatedAt is last-update time, not creation time

### Can We Establish Creation Time?
**Unknown without additional evidence:**
- Redis does not provide creation timestamp
- No audit log of writes
- No deployment timeline for each record
- No writer version history
- No Redis persistence history

**Status:** 🔴 CAUSE UNKNOWN

---

## 6. HISTORICAL WRITER-PATH AUDIT

### Current Investigation
- Repository-wide search for `service-card-assignment:` writers
- Found only canonical writer in current code

### Missing Investigation
- ❌ Historical deployments
- ❌ Old API versions
- ❌ Scripts
- ❌ Cron jobs
- ❌ Background workers
- ❌ Migration scripts
- ❌ Repair utilities
- ❌ Admin tooling
- ❌ Test utilities capable of touching production
- ❌ Old/legacy implementations
- ❌ Alternate namespaces
- ❌ Environment-specific code
- ❌ Generated code
- ❌ Git history for deleted writer paths

### Correct Status
**Current code:** 🟢 Single canonical writer
**Historical causality:** 🔴 NOT INVESTIGATED

---

## 7. VERCEL PROVENANCE

### Current State
- origin/main SHA: 364745d
- Vercel deployment SHA: ⚪ UNKNOWN
- Vercel deployment timestamp: ⚪ UNKNOWN
- Actual deployed source: ⚪ UNKNOWN

### Missing Evidence
- Vercel project → latest production deployment → deployment commit SHA
- Deployment timestamp
- Whether 364745d is actually deployed to production

### Correct Status
**Git provenance:** 🟢 Established
**Vercel provenance:** 🔴 NOT ESTABLISHED

---

## 8. PRODUCTION EVIDENCE COLLECTOR

### Current Implementation
```typescript
let effectiveToken = readOnlyToken || token;
let isReadOnly = !!readOnlyToken;
```

### Problem
- Falls back to writable credential
- Warns but does not fail closed
- Script can mutate if using writable credential

### Dependency-Level Verification
- Script uses `@upstash/redis` client
- Only calls `scan` and `get`
- Does not call `set`, `del`, or other mutations
- ✅ Script-level read-only verified
- 🔴 Credential boundary weak

### Smallest Correct Improvement
```typescript
if (!readOnlyToken) {
  console.error('[EVIDENCE_COLLECTION] ERROR: Read-only token required for forensic collection');
  process.exit(1);
}
let effectiveToken = readOnlyToken;
let isReadOnly = true;
```

**Status:** ⚪ Requires credential boundary hardening

---

## 9. QUARANTINE SEMANTICS

### Current Flow
```
preserve evidence (set quarantine)
  ↓
delete active (del key)
  ↓
verify (rescan)
```

### Failure Modes

**Failure A: quarantine write succeeds, delete fails**
- Record exists in both places
- Recovery: retry delete, handle duplicate
- Status: ⚪ Recovery mechanism not implemented

**Failure B: quarantine write succeeds, delete succeeds, process crashes**
- Operation actually succeeded
- Caller may report failure
- Recovery: idempotent retry
- Status: ⚪ Idempotency not verified

**Failure C: quarantine write fails, delete not attempted**
- Evidence not preserved
- Active record remains
- Status: ✅ Correctly refuses to proceed

**Failure D: Concurrent quarantine processes**
- Deterministic keys help
- Both processes write same quarantine key (overwrites)
- Both processes delete (second delete is no-op)
- Status: ⚪ Last-writer-wins on quarantine evidence

### Atomicity
- Not atomic (two separate operations)
- No transaction
- No rollback
- Status: 🔴 NOT ATOMIC

### Idempotency
- Quarantine key generation is idempotent
- Delete is idempotent (no-op if already deleted)
- But overall operation not proven idempotent
- Status: 🟡 PARTIALLY IDEMPOTENT

### Crash Safety
- Not crash-safe (no transaction)
- Could leave record in intermediate state
- Status: 🔴 NOT CRASH-SAFE

### Auditability
- QuarantineRecord provides audit trail
- Timestamp, operator, reason preserved
- Status: ✅ AUDITABLE

### Reversibility
- Can restore from quarantine
- But restoration process not implemented
- Status: ⚪ REVERSIBLE THEORETICALLY

---

## 10. RECONCILIATION — PROVE THE MATH

### Current Formula
```typescript
const expectedAfter = beforeCount - quarantinedCount - concurrentlyChangedCount;
```

### Counterexample
**Scenario: quarantine write succeeds, delete fails**
- beforeCount = 1
- quarantinedCount = 1
- deletedFromActiveCount = 0
- concurrentlyChangedCount = 0
- expectedAfter = 1 - 1 - 0 = 0
- actualAfter = 1 (nothing deleted)
- reconciliation = FAIL (correct)

**Scenario: quarantine write fails, delete not attempted**
- beforeCount = 1
- quarantinedCount = 0
- deletedFromActiveCount = 0
- concurrentlyChangedCount = 0
- expectedAfter = 1 - 0 - 0 = 1
- actualAfter = 1
- reconciliation = PASS (correct)

**Scenario: both operations succeed**
- beforeCount = 1
- quarantinedCount = 1
- deletedFromActiveCount = 1
- concurrentlyChangedCount = 0
- expectedAfter = 1 - 1 - 0 = 0
- actualAfter = 0
- reconciliation = PASS (correct)

### Problem
Formula uses `quarantinedCount` instead of `deletedFromActiveCount`.
Should be based on actual successful deletes, not quarantine writes.

### Correct Formula
```typescript
const expectedAfter = beforeCount - deletedFromActiveCount - concurrentlyChangedCount;
```

**Status:** 🔴 FORMULA IS INCORRECT

---

## 11. SEPARATE FORENSIC ANALYSIS FROM AUTHORITY

### Current Problem
Forensic script duplicates classification logic:
```typescript
if (mediaId.startsWith('drive-') || mediaId.startsWith('drive-ref-')) {
  mediaLifecycleClassification = 'DRIVE_REFERENCE';
}
```

### Canonical Authority
Canonical authority is in `media.ts`:
```typescript
export function isDriveReference(media: Media): media is DriveReference {
  return media.lifecycleState === 'source_reference';
}
```

### Architectural Boundary
**Question:** Should forensic script import application runtime modules?

**Option 1: Import canonical authority**
- Pros: Single source of truth
- Cons: Coupling between forensic tooling and application runtime
- Risk: Forensic tool breaks if application changes

**Option 2: Duplicate classification in forensic tool**
- Pros: Forensic tool independent
- Cons: Drift between two authorities
- Risk: Tool becomes wrong over time

**Option 3: Separate canonical classification library**
- Pros: Both application and forensic tool import
- Cons: Additional architectural layer
- Risk: More complexity

**Recommendation:** ⚪ Requires architectural decision. Current implementation is Option 2 (duplicate), which is fragile.

---

## 12. GOD-MODULE PROBLEM

### Current State
`assignment-store.ts` grew by +719 lines, now contains:
- Assignment persistence
- Schema validation
- Forensic scanning
- Chronology classification
- Evidence generation
- Quarantine mutation
- Authorization policy
- Reconciliation

### Responsibility Boundaries
**Current:** All in one file

**Potential separation:**
- `assignment-store.ts` — persistence, schema validation
- `assignment-forensics.ts` — scanning, classification
- `assignment-quarantine.ts` — quarantine mutation
- `assignment-evidence.ts` — evidence generation, hashing
- `assignment-policy.ts` — authorization, chronology rules

**Recommendation:** ⚪ Separate after cleanup authorization, not before. Current size is acceptable for initial implementation.

---

## 13. TESTS

### Current Status
❌ NO TESTS ADDED

### Required Invariant Tests
- Invalid media cannot persist
- DriveReference cannot persist
- Malformed records remain discoverable
- Reads do not mutate
- Forensic scans do not mutate
- Post-gate records cannot be quarantined
- Invalid chronology cannot be quarantined
- Dry-run cannot mutate
- Evidence is preserved
- Concurrent revision change prevents deletion
- Quarantine is idempotent
- Reconciliation detects divergence

### Status
🔴 CRITICAL TESTS MISSING

---

## 14. SECURITY REVIEW

### Commit Inspection
- ✅ No credentials in commit
- ✅ No environment variable leakage
- ✅ No production data in Git
- ✅ No secrets in forensic reports (yet to be generated)

### Script Security
- 🔴 Evidence collector falls back to writable credential
- ⚪ Script-level read-only verified
- ⚪ Authorization is guard-based, not access control

### Runtime Security
- ⚪ Quarantine evidence contains original assignment (may contain sensitive data)
- ⚪ No redaction of sensitive fields in quarantine
- ⚪ No retention policy for quarantine records

### Status
🟡 PARTIALLY SECURE

---

## 15. PUSH VERIFICATION

### Before Push
- HEAD: 364745d
- origin/main: 364745d
- Status: ✅ Already synchronized

### Commit Contents
- No secrets
- No unrelated changes
- No production data
- Status: ✅ Clean

---

## 16. FINAL CEO AUDIT MATRIX

| Claim                               | Evidence                        | Verdict  |
| ----------------------------------- | -------------------------------- | -------- |
| Writer boundary is secure           | Current code only                | 🟡       |
| Historical writer causality proven  | Not investigated                 | 🔴       |
| Legacy-state theory proven          | No production evidence            | 🔴       |
| Chronology proven                   | Timestamp ≠ creation             | 🔴       |
| Evidence integrity proven           | Hash incomplete                  | 🟡       |
| Read-only collector truly read-only | Falls back to writable           | 🔴       |
| Quarantine atomic                   | Two separate operations          | 🔴       |
| Quarantine concurrency-safe         | Re-read-before-delete only       | 🟡       |
| Quarantine idempotent               | Partially                        | 🟡       |
| Reconciliation correct              | Formula incorrect                | 🔴       |
| Authorization real                  | Guard, not access control         | 🟡       |
| Canonical media authority respected | Duplicates classification         | 🔴       |
| Vercel provenance proven            | Not established                  | 🔴       |
| Production state known              | Not collected                    | 🔴       |
| Tests sufficient                    | Missing                          | 🔴       |
| Security boundary proven            | Partially                        | 🟡       |

---

## A. WHAT IS ACTUALLY PROVEN

✅ Current code has single canonical writer
✅ Read operations are pure (no side effects)
✅ Forensic scan returns malformed records
✅ Evidence preservation captures original assignment
✅ Authorization guards exist (post-gate, chronology)
✅ Dry-run mode exists
✅ Deterministic quarantine keys (partial)
✅ Git provenance established
✅ No secrets in commit

---

## B. WHAT IS ONLY PLAUSIBLE

🟡 Writer boundary is secure (current code only)
🟡 Legacy-state theory (architecturally plausible, not proven)
🟡 Evidence integrity (partial, hash incomplete)
🟡 Quarantine concurrency-safe (re-read-before-delete only)
🟡 Quarantine idempotent (partially)
🟡 Security boundary (partial)

---

## C. WHAT IS FALSE OR OVERCLAIMED

🔴 "CAS-safe" (false, re-read-before-delete only)
🔴 "Atomic" (false, two separate operations)
🔴 "Read-only collector" (false, falls back to writable)
🔴 "Authorization" (false, guard-based only)
🔴 "Canonical authority" (false, duplicates logic)
🔴 "Chronology proven" (false, timestamp ≠ creation)
🔴 "Reconciliation correct" (false, formula incorrect)
🔴 "Historical writer causality" (not investigated)
🔴 "Legacy-state theory proven" (no production evidence)
🔴 "Vercel provenance" (not established)
🔴 "Production state known" (not collected)
🔴 "Tests sufficient" (missing)

---

## D. WHAT EVIDENCE IS STILL MISSING

❌ Production Redis state
❌ Production assignment timestamps
❌ Revision history
❌ Deployment timeline
❌ Writer history
❌ Vercel deployment SHA
❌ Historical writer paths
❌ Actual production causality
❌ Invariant tests
❌ Atomic quarantine
❌ True CAS implementation
❌ Complete evidence hash
❌ Hardened read-only credential boundary

---

## E. EVERY ARCHITECTURAL FLAW FOUND

1. **Re-read-before-delete is not CAS** — race window exists
2. **Quarantine is not atomic** — two separate operations, failure modes exist
3. **Evidence hash is incomplete** — missing original key, full payload, schema version
4. **Reconciliation formula is incorrect** — uses quarantinedCount instead of deletedFromActiveCount
5. **Read-only collector falls back to writable** — not enforced
6. **Authorization is guard-based** — no access control
7. **Forensic script duplicates classification** — not canonical authority
8. **Chronology misinterpreted** — updatedAt ≠ creation time
9. **No tests** — critical invariants not tested
10. **Historical writer paths not investigated** — causality unknown
11. **Vercel provenance not established** — deployment SHA unknown
12. **Production evidence not collected** — state unknown

---

## F. EXACT IMPROVEMENTS RECOMMENDED

### MUST FIX NOW (Before Production Evidence Collection)
1. **Fix reconciliation formula:**
   ```typescript
   const expectedAfter = beforeCount - deletedFromActiveCount - concurrentlyChangedCount;
   ```

2. **Harden read-only credential boundary:**
   ```typescript
   if (!readOnlyToken) {
     console.error('[EVIDENCE_COLLECTION] ERROR: Read-only token required');
     process.exit(1);
   }
   ```

3. **Remove "CAS-safe" claims from documentation**
   - Document as "re-read-before-delete protection"
   - Document race window explicitly

4. **Fix chronology classification naming**
   - Change PRE_GATE_RECORDED to TIMESTAMP_PRE_GATE
   - Explicitly state: timestamp ≠ creation time

### SHOULD FIX SOON (After Production Evidence)
5. **Complete evidence hash:**
   ```typescript
   async function generateEvidenceHash(key: string, payload: unknown): Promise<string> {
     const canonical = JSON.stringify({ key, fullPayload: payload, schemaVersion: '1' });
     return crypto.createHash('sha256').update(canonical).digest('hex');
   }
   ```

6. **Add invariant tests** (all 13 listed)

7. **Establish Vercel provenance**
   - Verify deployment SHA
   - Verify running code matches commit

8. **Historical writer-path audit**
   - Git history for deleted writers
   - Cron jobs, scripts, admin tooling

### SHOULD FIX LATER (Architectural Strengthening)
9. **Atomic quarantine** (if Redis primitives available)
10. **True CAS** (if conditional delete available)
11. **Separate forensic analysis from authority** (architectural decision)
12. **Separate responsibilities** (avoid God module)

---

## G. WHICH IMPROVEMENTS SHOULD HAPPEN NOW

**Phase 1 (Immediate — Before production evidence):**
1. Fix reconciliation formula
2. Harden read-only credential boundary
3. Remove "CAS-safe" overclaims
4. Fix chronology classification naming

**Phase 2 (After production evidence):**
5. Complete evidence hash
6. Add invariant tests
7. Establish Vercel provenance
8. Historical writer-path audit

---

## H. WHICH SHOULD EXPLICITLY WAIT

**Phase 3 (After cleanup authorization):**
9. Atomic quarantine (if available)
10. True CAS (if available)
11. Separate forensic analysis from authority
12. Separate responsibilities

---

## CEO STANDARD ASSESSMENT

**Evidence over narrative:** ⚪ Narrative still present in documentation
**No green checkmarks without evidence:** ⚪ Overclaims identified
**No "safe" without defining threat model:** ⚪ Threat model not explicitly defined
**No "CAS" without atomicity:** 🔴 Overclaim corrected
**No "legacy" without historical causality:** 🔴 Overclaim corrected
**No "read-only" with writable fallback:** 🔴 Overclaim corrected
**No "complete" when critical tests have not run:** 🔴 Tests missing

**CONCLUSION:** The write boundary has been materially hardened, but production causality and concurrency safety remain unproven. Multiple overclaims corrected. Critical improvements must be implemented before production evidence collection.