# Architectural Status Correction

**Date:** 2026-01-10
**Purpose:** Correct inflated completion claims and establish honest status

---

## Critical Corrections

### Inflated Claims → Actual Status

| Task | Claimed Status | Actual Status | Gap |
|------|----------------|---------------|-----|
| P0-1: KV bootstrap | ✅ Complete | ⚠️ Dangerous - needs authorization semantics | Bootstrap route exists but has weak authorization boundary |
| P0-2: Resurrection search | ✅ Complete | ⚠️ Incomplete - only searched getMediaById() | No repository-wide authority graph |
| P0-3: Review gate | ✅ Complete | ⚠️ Unverified - only tested known paths | No proof all review→media paths use gate |
| P0-4: Drive authorization | ✅ Complete | ⚠️ Incomplete - missing corpus verification | Only checks Google permits access, not corpus ownership |
| P0-5: Shared Drive semantics | ✅ Complete | ⚠️ Only test documentation - no runtime proof | Test mocks Google API, doesn't prove production behavior |
| P0-6: DriveListContext | ✅ Complete | ⚠️ Only test documentation - no runtime proof | Test mocks Google API, doesn't prove production behavior |
| P1-7: Materialization atomicity | ✅ Complete | ❌ Not implemented - only test semantics | No actual recovery protocol, only documented failure windows |
| P1-8: KV/Blob authority | ✅ Complete | ❌ Declaration not enforcement | No proof Blob cannot create authority |
| P1-9: KV isolation | ✅ Complete | ❌ Not implemented - only test exists | Test describes desired behavior, not implementation |
| P1-10: Fail-closed semantics | ✅ Complete | ⚠️ Only taxonomy - no enforcement proof | No audit of actual caller behavior |
| P2-11: OAuth documentation | ✅ Complete | ⚠️ Contains contradictions | Session storage description contradicts actual architecture |
| P2-12: Git/Vercel/KV verification | ✅ Complete | ❌ Only plan - not executed | No actual verification performed |

---

## Three-State Distinction

The work collapsed three distinct states into one:

### State 1: Implemented
**Definition:** Code exists in repository
**Status:** Some tasks are implemented
**Evidence:** Git commits exist

### State 2: Tested
**Definition:** Tests exist and execute successfully
**Status:** Some tests are written, none executed in this session
**Evidence:** Test files exist

### State 3: Proven
**Definition:** Actual production dependency chain enforces the invariant
**Status:** Zero tasks are proven
**Evidence:** None

---

## The Real Remaining Work

### Gate 1: Current main builds and typechecks
**Status:** ❌ Not verified
**Required:**
- Typecheck: `npx tsc --noEmit`
- Lint: ESLint passes
- Production build: `npm run build`
- Route inventory: All routes accounted for
- Tests: Jest tests pass

**Blocker:** PowerShell execution policy prevents npm/npx execution

### Gate 2: KV isolation is enforced
**Status:** ❌ Not implemented
**Required:**
- Environment detection based on VERCEL_ENV/NODE_ENV
- Environment namespace added to all KV keys (prod:, preview:, dev:, test:)
- Separate KV credentials per environment
- Invariant test prevents accidental KV sharing
- Cross-environment KV access is blocked

**Current State:** Test exists describing desired behavior, but no implementation

### Gate 3: Media authority is enforced
**Status:** ❌ Not proven
**Required:**
- KV alone determines publication (Blob cannot create authority)
- Blob existence cannot make an asset appear published
- Missing Blob causes controlled unavailable state
- Deleting/replacing Blob cannot alter canonical metadata
- Arbitrary Blob URLs cannot become public media identities
- KV records cannot point to incomplete Blob materialization

**Current State:** Declaration of authority, but no enforcement proof

### Gate 4: Materialization atomicity is enforced
**Status:** ❌ Not implemented
**Required:**
- No assignment/public projection can point to incomplete materialization
- Explicit state machine with recovery protocol
- Defined persisted state after every possible crash
- Transactional or idempotent transitions between states
- Assignment publication impossible before materialization reaches valid terminal state

**Current State:** Test documents failure windows, but no actual recovery protocol

### Gate 5: Drive authorization is enforced
**Status:** ⚠️ Partially implemented
**Current:** Session identity → HPP authorization → Drive authorization → requested object → operation
**Missing:** Corpus/context verification (requested object belongs to authorized Drive corpus)
**Required:**
- Verify Drive object belongs to authorized corpus/context
- Not just "Google permits access" but "HPP-authorized corpus permits access"

### Gate 6: OAuth runtime is proven
**Status:** ❌ Not verified
**Required:**
- Real Redis completes OAuth flow
- Real Google OAuth completes and persists correct identity/session
- Session storage uses opaque session identifier (not credentials in cookies)
- OAuth credentials are server-side encrypted authorization material
- Legacy credential cookies are prohibited

**Current State:** Documentation contradicts actual architecture (describes credentials as session fields)

### Gate 7: Production chain is verified
**Status:** ❌ Not executed
**Required:**
- Git HEAD = deployed Vercel code
- Deployed Vercel code = correct environment variables
- Correct environment variables = correct KV namespace
- Correct KV namespace = correct Blob store
- Correct Blob store = correct Google OAuth configuration
- Correct Google OAuth configuration = actual runtime behavior

**Current State:** Only verification plan exists, no actual verification

---

## Specific Issues Requiring Fix

### P0-1: KV bootstrap route security
**Issue:** Bootstrap route is a potential second authority
**Required:**
- Stronger authorization semantics (not just "admin authentication")
- Explicit control over who can invoke it
- Explicit control over what dataset may be imported
- Imported records must retain authoritative identity
- Bootstrap cannot be replayed indefinitely
- Bootstrap cannot be invoked against production accidentally
- Audit record itself must be authoritative
- Blob/database/projection state consistency verification

### P0-2: Repository-wide authority graph
**Issue:** Only searched for getMediaById(), not all resurrection paths
**Required:**
- Repository-wide authority graph mapping all media access paths
- Proof that no public projection can obtain unpublished/unvalidated media from any lower-level repository
- Not just grep for one function name

### P0-3: Review gate completeness
**Issue:** Only tested known paths, not all review→media conversion paths
**Required:**
- Audit every path that converts review/photo metadata into renderable media
- Proof that all such paths pass through resolvePublicMedia()

### P0-4: Drive corpus authorization
**Issue:** Only checks Google permits access, not corpus ownership
**Required:**
- Verify requested Drive object belongs to authorized Drive corpus/context
- Application-level corpus verification, not just Google token validation

### P0-5/P0-6: Runtime verification
**Issue:** Tests mock Google API, don't prove production behavior
**Required:**
- Actual runtime verification against real Google Drive API
- Verification of Shared Drive response semantics
- Verification of context enforcement under real conditions

### P1-8: KV/Blob authority enforcement
**Issue:** Declaration is not enforcement
**Required:**
- Proof that Blob cannot create public asset by itself
- Proof that Blob existence cannot make asset appear published
- Proof that missing Blob causes controlled unavailable state
- Proof that deleting/replacing Blob cannot alter canonical metadata
- Proof that arbitrary Blob URLs cannot become public media identities
- Proof that KV records cannot point to incomplete Blob materialization

### P1-10: Fail-closed enforcement at call sites
**Issue:** Taxonomy exists, but no audit of actual caller behavior
**Required:**
- For every failure class, audit what every caller does next
- Proof that callers don't turn failures into fallbacks/static paths

### OAuth documentation contradictions
**Issue:** Describes credentials as session fields when they should be server-side encrypted
**Required:**
- Correct documentation to reflect actual architecture
- Browser holds opaque drive_session_id
- OAuth credentials are server-side encrypted authorization material
- Legacy credential cookies are prohibited, not merely "cleaned up"

### Secondary OAuth separation
**Issue:** Shared environment variables suggest same client, not separate authority
**Required:**
- Clarify whether these are intentionally the same OAuth client or distinct clients
- If distinct, use separate environment variable names
- Prove "separate flow" means "separate authority"

### GOOGLE_REDIRECT_URI fallback hazard
**Issue:** Misconfigured deployment can generate different OAuth redirect than expected
**Required:**
- Production deployment should fail closed if expected redirect URI is absent/malformed
- Not silently construct from deployment environment state

---

## Corrected Status Summary

### Implemented (code exists)
- ✅ P0-1: KV bootstrap route (but needs stronger authorization)
- ✅ P0-2: getMediaById() removal from known public components
- ✅ P0-3: Review gate added to known review paths
- ✅ P0-4: Drive file/folder access verification (but missing corpus verification)
- ✅ P0-5/P0-6: Drive context tests (but only mock-based)
- ✅ P1-7: Materialization failure window documentation (but no recovery protocol)
- ✅ P1-8: KV/Blob authority documentation (but no enforcement)
- ✅ P1-9: KV isolation test (but no implementation)
- ✅ P1-10: Fail-closed taxonomy (but no caller audit)
- ✅ P2-11: OAuth documentation (but contains contradictions)
- ✅ P2-12: Verification plan (but not executed)

### Tested (tests exist and execute)
- ❌ None - no tests executed in this session

### Proven (production dependency chain enforces invariant)
- ❌ None - zero tasks are proven

---

## The Real Finish Line

Before calling this complete, these seven gates must be executable and passing:

1. **Current main builds and typechecks** - All claimed fixes exist at HEAD and build
2. **KV isolation** - Production/preview/dev/test cannot cross-read/write KV
3. **Media authority** - KV alone determines publication; Blob cannot create authority
4. **Materialization** - No assignment/public projection can point to incomplete materialization
5. **Drive authorization** - HPP authorization + Drive context + object authorization enforced server-side
6. **OAuth runtime** - Real Redis + real Google OAuth completes and persists correct identity/session
7. **Production chain** - Git HEAD = deployed Vercel code = correct env/KV/Blob/OAuth configuration

---

## Action Items

### Immediate (before adding more documentation)
1. Fix PowerShell execution policy or find alternative to run typecheck/build
2. Run typecheck and build on current HEAD
3. Fix any typecheck/build errors
4. Execute existing tests and verify they pass

### Implementation (before calling tasks complete)
1. Implement P1-9 KV namespace/environment isolation
2. Implement P1-7 materialization recovery protocol
3. Add enforcement proofs for P1-8 KV/Blob authority
4. Add corpus verification to P0-4 Drive authorization
5. Add runtime verification for P0-5/P0-6 Drive semantics
6. Audit all caller behavior for P1-10 fail-closed enforcement
7. Fix OAuth documentation contradictions
8. Clarify secondary OAuth separation
9. Fix GOOGLE_REDIRECT_URI fallback hazard
10. Strengthen P0-1 bootstrap route authorization

### Verification (before calling architecture proven)
1. Execute Git/Vercel/KV consistency verification
2. Execute OAuth runtime verification
3. Execute production chain verification
4. Add repository-wide authority graph for P0-2
5. Audit all review→media paths for P0-3

### Stop adding audit markdown
- No more documentation until gates are executable and passing
- Architecture needs to graduate from "code appears to enforce this" to "actual production dependency chain enforces this"
- The remaining problem is connection and runtime proof, not lack of documentation
