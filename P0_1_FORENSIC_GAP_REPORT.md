# P0-1 FORENSIC GAP REPORT

**Date:** 2026-08-21
**Git SHA:** 61df100
**Status:** FORENSIC AUDIT - DO NOT IMPLEMENT YET
**Scope:** Brutal audit of P0-1 Drive Authorization Authority Boundary spec against actual repository

---

# A. EXECUTIVE VERDICT

**APPROVE ONLY AFTER SPEC CORRECTIONS**

The P0-1 specification has good structure but contains CRITICAL GAPS and INCORRECT CLAIMS that must be resolved before implementation.

---

# B. CRITICAL P0 GAPS

## P0-1: COOKIE SIGNING MECHANISM UNVERIFIED

**Spec Claim:** "Next.js cookies use default Next.js signing"
**Actual Evidence:** No NEXTAUTH_SECRET in codebase, no evidence of cookie signing mechanism
**Repo Search:** `grep -r "NEXTAUTH_SECRET|cookie signing|cookie encryption"` returned no relevant results in Drive auth code
**Consequence:** Spec assumes security mechanism that may not exist
**Required Correction:** Verify actual Next.js cookie signing mechanism before assuming security
**Files Affected:** drive-session.ts, entire spec

## P0-2: ACCESS-TOKEN LIFECYCLE MISSING FROM NEW ARCHITECTURE

**Spec Claim:** GoogleAuthorizationRecord only contains encrypted refresh token
**Actual Evidence:** Current DriveSession has `drive_access_token` (1 hour maxAge), `drive_expiry_date` (30 days maxAge)
**Gap:** New architecture doesn't specify where access token and expiry live after server-side migration
**Consequence:** Cannot reproduce current DriveSession contract without access token storage
**Required Correction:** Add access token storage to GoogleAuthorizationRecord or add separate AccessTokenRecord
**Files Affected:** GoogleAuthorizationRecord schema, DriveSession adapter, OAuthManager

## P0-3: OAUTH STATE THREAT MODEL UNPROVEN

**Spec Claim:** "Redis state exists = CSRF solved"
**Actual Evidence:** No OAuth state validation exists currently; spec doesn't prove browser-binding
**Gap:** State may be replayable if not tied to browser session nonce; PKCE not considered
**Consequence:** CSRF vulnerability may not be fully mitigated
**Required Correction:** Prove state threat model, consider PKCE, tie state to browser session
**Files Affected:** OAuth state manager, authorize route, callback route

## P0-4: STATE CONSUMPTION ORDERING DANGEROUS

**Spec Claim:** "Mark state as consumed before code exchange"
**Actual Evidence:** No implementation exists yet; spec claims atomicity without mechanism
**Gap:** Failed token exchange burns state; read/check/write sequence not atomic
**Consequence:** CSRF protection weakened by state exhaustion
**Required Correction:** Implement atomic one-time consume primitive (Redis Lua or conditional SET)
**Files Affected:** OAuth state manager, callback route

## P0-5: MIGRATION ATOMICITY FALSE

**Spec Claim:** "Migration is atomic"
**Actual Evidence:** Redis records + cookie mutations are separate systems; no cross-system atomicity mechanism
**Gap:** Cannot guarantee atomicity across Redis and browser cookies
**Consequence:** Migration can leave system in inconsistent state
**Required Correction:** Replace "atomic" with precise state-machine/idempotency design with recovery
**Files Affected:** Migration logic, DriveSession adapter

## P0-6: AUTHORIZATION LIFETIME UNJUSTIFIED

**Spec Claim:** "drive:auth:{authorizationId} TTL = 365 days"
**Actual Evidence:** No justification for 365 days; Google refresh token validity unknown
**Gap:** Confusing Redis retention with authorization validity
**Consequence:** May violate security policy or retain credentials longer than necessary
**Required Correction:** Define explicit retention policy separate from Google refresh token validity
**Files Affected:** GoogleAuthorizationRecord TTL specification

## P0-7: IDENTITY DEDUPLICATION STRATEGY MISSING

**Spec Claim:** "Defer email index"
**Actual Evidence:** No mechanism to prevent multiple GoogleAuthorizationRecord for same Google account
**Gap:** System doesn't know if two authorizations belong to same Google identity
**Consequence:** Duplicate authorizations, identity confusion, session management issues
**Required Correction:** Define minimum correct identity mechanism (googleSubject lookup or email index)
**Files Affected:** GoogleAuthorizationRecord, OAuth callback

## P0-8: AUTHORIZATION ID GENERATION CONTRADICTION

**Spec Claim:** `auth_{timestamp}_{random}` AND `crypto.randomUUID()`
**Actual Evidence:** These are mutually exclusive generation methods
**Gap:** Spec contradicts itself on ID generation strategy
**Consequence:** Implementation confusion
**Required Correction:** Choose one generation method and update spec consistently
**Files Affected:** GoogleAuthorizationRecord schema

---

# C. P1 GAPS

## P1-1: AES-GCM IV SIZE NEEDS REVIEW

**Spec Claim:** "16-byte IV can work with GCM"
**Actual Evidence:** 12 bytes is conventional/recommended nonce size for GCM
**Gap:** 16-byte IV may be non-standard; Node crypto implementation not verified
**Consequence:** Potential compatibility/security issues
**Required Correction:** Verify Node crypto implementation, use 12-byte IV if recommended
**Files Affected:** Encryption primitive specification

## P1-2: CREDENTIAL VERSION VS KEY VERSION AMBIGUOUS

**Spec Claim:** Used interchangeably in places
**Actual Evidence:** These represent different concepts (key rotation vs record version)
**Gap:** Ambiguity leads to implementation confusion
**Consequence:** Key rotation bugs, version tracking issues
**Required Correction:** Define precise difference and usage for each field
**Files Affected:** Encryption envelope, key rotation strategy

## P1-3: REFRESH TOKEN ROTATION SEMANTICS UNPRE

**Spec Claim:** "Replace in storage, update metadata"
**Actual Evidence:** No atomic write strategy for rotation
**Gap:** Old refresh token must not be discarded until new encrypted record is durably written and verified
**Consequence:** Loss of refresh token on write failure
**Required Correction:** Define atomic rotation strategy with verification
**Files Affected:** Credential repository, OAuthManager token event handler

## P1-4: INVALID-GRANT BEHAVIOR TOO DESTRUCTIVE

**Spec Claim:** "Delete authorization record"
**Actual Evidence:** Destroys forensic evidence, identity continuity, multi-session state
**Gap:** Too destructive; violates forensic requirements
**Consequence:** Loss of audit trail, recovery information
**Required Correction:** Use tombstoned/revoked state instead of deletion
**Files Affected:** Credential repository, OAuthManager error handling

## P1-5: REFRESH LOCKING UNDERSPECIFIED

**Spec Claim:** "Acquire lock → refresh → reuse result"
**Actual Evidence:** No lock ownership token, crash detection, stale lock recovery
**Gap:** Lock expiration alone insufficient for production use
**Consequence:** Stale locks, deadlocks, starvation
**Required Correction:** Define precise state machine with ownership, expiry, recovery
**Files Affected:** Refresh single-flight implementation

## P1-6: SESSION SEMANTICS INCOMPLETE

**Spec Claim:** Fixed 30-day expiration
**Actual Evidence:** No consideration for sliding expiration, renewal, logout-one-device, logout-all-devices
**Gap:** Session model too simple for production use
**Consequence:** Poor user experience, session management issues
**Required Correction:** Define comprehensive session semantics
**Files Affected:** BrowserSessionRecord, session repository

## P1-7: AUTHORIZE ROUTE BEHAVIOR UNCLEAR

**Spec Claim:** "Check valid session instead of refresh token cookie"
**Actual Evidence:** Current behavior not fully traced; spec assumes simplified model
**Gap:** Authorize route may need different behavior for different scenarios
**Consequence:** Incorrect OAuth flow, user confusion
**Required Correction:** Trace exact authorize route behavior, define desired behavior for each scenario
**Files Affected:** Authorize route

## P1-8: MIGRATION TRIGGER QUESTIONABLE

**Spec Claim:** "Migration only happens during OAuth callback"
**Actual Evidence:** No investigation of all Drive entry points
**Gap:** May miss migration opportunities or trigger at wrong time
**Consequence:** Migration never happens, happens at wrong time, or duplicates
**Required Correction:** Inspect all Drive entry points, determine actual bootstrap trigger
**Files Affected:** Migration trigger logic

## P1-9: FALLBACK CONTRADICTION

**Spec Claim:** "No fallback indefinitely" but also "Fallback to cookies on failure"
**Actual Evidence:** These are contradictory requirements
**Gap:** Migration failure handling unclear
**Consequence:** Inconsistent behavior, potential fallback loophole
**Required Correction:** Define explicit bounded migration state and failure/retry semantics
**Files Affected:** Migration logic

## P1-10: GOOGLE IDENTITY ACQUISITION UNSPECIFIED

**Spec Claim:** `googleSubject` and `email` in schema
**Actual Evidence:** No investigation of where these come from (ID token? UserInfo? Drive about.get?)
**Gap:** Identity source unknown, may not be available with current scopes
**Consequence:** Cannot populate identity fields
**Required Correction:** Investigate actual Google OAuth client behavior, specify authoritative source
**Files Affected:** GoogleAuthorizationRecord schema, OAuth callback

## P1-11: SCOPE SEMANTICS UNSPECIFIED

**Spec Claim:** Preserve existing scopes
**Actual Evidence:** No scope normalization, comparison, or update logic
**Gap:** Scope handling not defined for authorization updates
**Consequence:** Scope drift, permission issues
**Required Correction:** Define scope semantics and update logic
**Files Affected:** GoogleAuthorizationRecord, OAuth callback

## P1-12: ACCESS-TOKEN REFRESH PERSISTENCE MISSING

**Spec Claim:** No specification of where token updates go
**Actual Evidence:** OAuthManager has event-driven token updates that write to DriveSession
**Gap:** Event-driven token updates must write to server-side storage
**Consequence:** Token updates lost or inconsistent
**Required Correction:** Define where event-driven token updates persist
**Files Affected:** OAuthManager token event handler, credential repository

## P1-13: DEPLOYMENT PERSISTENCE UNVERIFIED

**Spec Claim:** Deployment persistence tests
**Actual Evidence:** Vercel environment/Redis binding not verified
**Gap:** Cannot claim deployment persistence without infrastructure proof
**Consequence:** Tests may not actually prove deployment survival
**Required Correction:** Verify Vercel environment, Redis binding, deployment behavior first
**Files Affected:** Deployment persistence tests

## P1-14: SECRET ROTATION STRATEGY INSUFFICIENT

**Spec Claim:** Environment variable names
**Actual Evidence:** No Vercel environment strategy, no rotation mechanism
**Gap:** Key rotation not operationally feasible
**Consequence:** Cannot actually rotate keys in production
**Required Correction:** Define actual Vercel environment rotation strategy
**Files Affected:** Encryption key management

## P1-15: LOGGING EMAIL POLICY UNAUDITED

**Spec Claim:** Email "safe for debugging"
**Actual Evidence:** Repository logging conventions not inspected
**Gap:** Email may be sensitive operational data
**Consequence:** Privacy/security violation
**Required Correction:** Inspect existing logging conventions, define safe logging policy
**Files Affected:** Logging throughout codebase

## P1-16: TEST ARCHITECTURE MISSING

**Spec Claim:** Test matrix
**Actual Evidence:** No test infrastructure investigation
**Gap:** No test framework defined, no test organization
**Consequence:** Tests may not be implementable or useful
**Required Correction:** Investigate existing test infrastructure, define test architecture
**Files Affected:** Test files and organization

## P1-17: FAILURE RECOVERY/IDEMPOTENCY MATRIX MISSING

**Spec Claim:** "Migration is atomic"
**Actual Evidence:** No failure scenarios defined for each step
**Gap:** No recovery strategy for partial failures
**Consequence:** System cannot recover from failures, data loss possible
**Required Correction:** Define exact failure recovery/idempotency matrix for each step
**Files Affected:** Migration logic, callback logic, refresh logic

---

# D. INCORRECT CLAIMS

## INCORRECT CLAIM 1: NEXTAUTH_SECRET INVOLVEMENT

**Spec Claim:** "Next.js cookies use default Next.js signing"
**Why Wrong:** No NEXTAUTH_SECRET in codebase; no evidence of any signing mechanism
**Repository Evidence:** `grep -r "NEXTAUTH_SECRET"` returned no relevant results in Drive auth code
**Security Consequence:** Assuming security mechanism that may not exist
**Required Correction:** Verify actual Next.js cookie signing mechanism or implement explicit signing

## INCORRECT CLAIM 2: MIGRATION IS ATOMIC

**Spec Claim:** "Migration is atomic"
**Why Wrong:** Redis records + cookie mutations are separate systems; no cross-system atomicity mechanism
**Repository Evidence:** No Redis transaction or atomic cross-system mechanism in codebase
**Reliability Consequence:** Cannot guarantee atomicity across Redis and browser cookies
**Required Correction:** Replace "atomic" with precise state-machine/idempotency design

## INCORRECT CLAIM 3: 365-DAY TTL IS CORRECT

**Spec Claim:** "drive:auth:{authorizationId} TTL = 365 days"
**Why Wrong:** No justification for 365 days; confusing Redis retention with authorization validity
**Repository Evidence:** No existing retention policy or justification in codebase
**Security Consequence:** May retain credentials longer than necessary or required
**Required Correction:** Define explicit retention policy separate from Google refresh token validity

---

# E. UNPROVEN CLAIMS

## UNPROVEN CLAIM 1: NEXTJS COOKIES ARE SIGNED

**Spec Claim:** "Next.js cookies use default Next.js signing"
**Repository Evidence:** No evidence of signing mechanism in codebase
**Required Proof:** Next.js documentation or code investigation

## UNPROVEN CLAIM 2: OAUTH STATE SOLVES CSRF

**Spec Claim:** "Redis state exists = CSRF solved"
**Repository Evidence:** No state validation exists currently
**Required Proof:** Threat model analysis, attack vectors considered

## UNPROVEN CLAIM 3: AES-256-GCM 16-BYTE IV WORKS

**Spec Claim:** "16-byte IV can work with GCM"
**Repository Evidence:** Node crypto implementation not verified
**Required Proof:** Node crypto documentation, security review

## UNPROVEN CLAIM 4: DEPLOYMENT PERSISTENCE WORKS

**Spec Claim:** Deployment persistence tests
**Repository Evidence:** Vercel environment/Redis binding not verified
**Required Proof:** Vercel infrastructure investigation, actual deployment testing

## UNPROVEN CLAIM 5: GOOGLE IDENTITY AVAILABLE

**Spec Claim:** `googleSubject` and `email` in schema
**Repository Evidence:** No investigation of where these come from
**Required Proof:** Google OAuth client behavior investigation, token inspection

---

# F. MISSING CONTRACTS

## MISSING CONTRACT 1: ACCESS-TOKEN STORAGE

**Required:** Where access token and expiry live after server-side migration
**Gap:** GoogleAuthorizationRecord only contains refresh token
**Files Affected:** GoogleAuthorizationRecord schema, DriveSession adapter

## MISSING CONTRACT 2: ATOMIC STATE CONSUMPTION

**Required:** Atomic one-time consume primitive for OAuth state
**Gap:** Current spec assumes read/check/write is atomic
**Files Affected:** OAuth state manager

## MISSING CONTRACT 3: MIGRATION IDEMPOTENCY

**Required:** Precise state-machine/idempotency design for migration
**Gap:** "Atomic migration" is false; need recovery strategy
**Files Affected:** Migration logic

## MISSING CONTRACT 4: REFRESH LOCK OWNERSHIP

**Required:** Lock ownership token, crash detection, stale lock recovery
**Gap:** Only TTL specified, no ownership mechanism
**Files Affected:** Refresh single-flight

## MISSING CONTRACT 5: SESSION EXPIRATION SEMANTICS

**Required:** Sliding expiration, renewal, logout-one-device, logout-all-devices
**Gap:** Only fixed 30-day expiration specified
**Files Affected:** BrowserSessionRecord, session repository

## MISSING CONTRACT 6: IDENTITY UNIQUENESS STRATEGY

**Required:** Mechanism to prevent duplicate authorizations for same Google account
**Gap:** No identity deduplication strategy
**Files Affected:** GoogleAuthorizationRecord, OAuth callback

## MISSING CONTRACT 7: GOOGLE IDENTITY SOURCE

**Required:** Authoritative source for googleSubject and email
**Gap:** Identity source not specified
**Files Affected:** GoogleAuthorizationRecord schema, OAuth callback

## MISSING CONTRACT 8: SCOPE UPDATE SEMANTICS

**Required:** Scope normalization, comparison, update logic
**Gap:** Scope handling not defined
**Files Affected:** GoogleAuthorizationRecord, OAuth callback

## MISSING CONTRACT 9: TOKEN UPDATE PERSISTENCE

**Required:** Where event-driven token updates go
**Gap:** Event-driven token updates not specified
**Files Affected:** OAuthManager token event handler

## MISSING CONTRACT 10: FAILURE RECOVERY MATRIX

**Required:** Exact failure recovery/idempotency for each step
**Gap:** No failure scenarios defined
**Files Affected:** Migration, callback, refresh logic

---

# G. REQUIRED SPEC CORRECTIONS

## CORRECTION 1: COOKIE SIGNING VERIFICATION

**Replace:** "Next.js cookies use default Next.js signing"
**With:** Verify actual Next.js cookie signing mechanism before assuming security
**Reason:** No evidence of signing mechanism in codebase

## CORRECTION 2: ACCESS-TOKEN STORAGE

**Replace:** GoogleAuthorizationRecord only contains encrypted refresh token
**With:** Add access token storage to GoogleAuthorizationRecord or add separate AccessTokenRecord
**Reason:** Cannot reproduce current DriveSession contract without access token storage

## CORRECTION 3: STATE CONSUMPTION

**Replace:** "Mark state as consumed before code exchange"
**With:** Implement atomic one-time consume primitive (Redis Lua or conditional SET)
**Reason:** Failed token exchange burns state; not atomic

## CORRECTION 4: MIGRATION ATOMICITY

**Replace:** "Migration is atomic"
**With:** Precise state-machine/idempotency design with recovery
**Reason:** Redis + cookies are separate systems; not atomic

## CORRECTION 5: AUTHORIZATION TTL

**Replace:** "drive:auth:{authorizationId} TTL = 365 days"
**With:** Define explicit retention policy separate from Google refresh token validity
**Reason:** 365 days unjustified; confusing retention with validity

## CORRECTION 6: IDENTITY DEDUPLICATION

**Replace:** "Defer email index"
**With:** Define minimum correct identity mechanism (googleSubject lookup or email index)
**Reason:** No mechanism to prevent duplicate authorizations for same Google account

## CORRECTION 7: AUTHORIZATION ID GENERATION

**Replace:** `auth_{timestamp}_{random}` AND `crypto.randomUUID()`
**With:** Choose one generation method consistently
**Reason:** Spec contradicts itself

## CORRECTION 8: AES-GCM IV SIZE

**Replace:** "16-byte IV can work with GCM"
**With:** Verify Node crypto implementation, use 12-byte IV if recommended
**Reason:** 12 bytes is conventional/recommended; 16-byte may be non-standard

## CORRECTION 9: CREDENTIAL VERSION VS KEY VERSION

**Replace:** Used interchangeably
**With:** Define precise difference and usage for each field
**Reason:** Ambiguity leads to implementation confusion

## CORRECTION 10: REFRESH TOKEN ROTATION

**Replace:** "Replace in storage, update metadata"
**With:** Define atomic rotation strategy with verification
**Reason:** Old refresh token must not be discarded until new record verified

## CORRECTION 11: INVALID-GRANT BEHAVIOR

**Replace:** "Delete authorization record"
**With:** Use tombstoned/revoked state instead of deletion
**Reason:** Too destructive; violates forensic requirements

## CORRECTION 12: REFRESH LOCKING

**Replace:** "Acquire lock → refresh → reuse result"
**With:** Define precise state machine with ownership, expiry, recovery
**Reason:** TTL alone insufficient for production use

## CORRECTION 13: SESSION SEMANTICS

**Replace:** Fixed 30-day expiration
**With:** Comprehensive session semantics (sliding, renewal, logout-one-device, logout-all-devices)
**Reason:** Too simple for production use

## CORRECTION 14: AUTHORIZE ROUTE BEHAVIOR

**Replace:** "Check valid session instead of refresh token cookie"
**With:** Trace exact authorize route behavior, define desired behavior for each scenario
**Reason:** Current behavior not fully traced; spec assumes simplified model

## CORRECTION 15: MIGRATION TRIGGER

**Replace:** "Migration only happens during OAuth callback"
**With:** Inspect all Drive entry points, determine actual bootstrap trigger
**Reason:** May miss migration opportunities or trigger at wrong time

## CORRECTION 16: FALLBACK SEMANTICS

**Replace:** "No fallback indefinitely" and "Fallback to cookies on failure"
**With:** Define explicit bounded migration state and failure/retry semantics
**Reason:** Contradictory requirements

## CORRECTION 17: GOOGLE IDENTITY SOURCE

**Replace:** `googleSubject` and `email` in schema
**With:** Investigate actual Google OAuth client behavior, specify authoritative source
**Reason:** Identity source unknown

## CORRECTION 18: SCOPE SEMANTICS

**Replace:** Preserve existing scopes
**With:** Define scope normalization, comparison, update logic
**Reason:** Scope handling not defined

## CORRECTION 19: TOKEN UPDATE PERSISTENCE

**Replace:** No specification
**With:** Define where event-driven token updates persist
**Reason:** Event-driven token updates must write to server-side storage

## CORRECTION 20: DEPLOYMENT PERSISTENCE

**Replace:** Deployment persistence tests
**With:** Verify Vercel environment, Redis binding, deployment behavior first
**Reason:** Cannot claim deployment persistence without infrastructure proof

## CORRECTION 21: SECRET ROTATION

**Replace:** Environment variable names
**With:** Define actual Vercel environment rotation strategy
**Reason:** Key rotation not operationally feasible

## CORRECTION 22: LOGGING POLICY

**Replace:** Email "safe for debugging"
**With:** Inspect existing logging conventions, define safe logging policy
**Reason:** Email may be sensitive operational data

## CORRECTION 23: TEST ARCHITECTURE

**Replace:** Test matrix
**With:** Investigate existing test infrastructure, define test architecture
**Reason:** No test framework defined

## CORRECTION 24: FAILURE RECOVERY

**Replace:** "Migration is atomic"
**With:** Define exact failure recovery/idempotency matrix for each step
**Reason:** No failure scenarios defined

---

# H. REQUIRED TESTS

## TEST 1: COOKIE SIGNING VERIFICATION
**Proves:** Next.js cookie signing mechanism exists and works
**Gap:** P0-1 (Cookie signing mechanism unverified)

## TEST 2: OAUTH STATE CSRF PROTECTION
**Proves:** State validation prevents CSRF attacks
**Gap:** P0-3 (OAuth state threat model unproven)

## TEST 3: STATE CONSUMPTION ATOMICITY
**Proves:** State consumption is atomic and one-time
**Gap:** P0-4 (State consumption ordering dangerous)

## TEST 4: MIGRATION IDEMPOTENCY
**Proves:** Migration can recover from partial failures
**Gap:** P0-5 (Migration atomicity false)

## TEST 5: IDENTITY DEDUPLICATION
**Proves:** Duplicate authorizations prevented
**Gap:** P0-7 (Identity deduplication missing)

## TEST 6: ACCESS-TOKEN LIFECYCLE
**Proves:** Access token storage and refresh works
**Gap:** P0-2 (Access-token lifecycle missing)

## TEST 7: REFRESH LOCKING
**Proves:** Concurrent refresh protection works
**Gap:** P1-5 (Refresh locking underspecified)

## TEST 8: SESSION EXPIRATION
**Proves:** Session semantics work correctly
**Gap:** P1-6 (Session semantics incomplete)

## TEST 9: TOKEN ROTATION
**Proves:** Refresh token rotation is safe
**Gap:** P1-3 (Refresh token rotation semantics)

## TEST 10: INVALID-GRANT HANDLING
**Proves:** Invalid grant handled without destructive deletion
**Gap:** P1-4 (Invalid-grant behavior too destructive)

---

# I. IMPLEMENTATION BLOCKERS

## BLOCKER 1: COOKIE SIGNING MECHANISM
**Required:** Verify actual Next.js cookie signing mechanism
**Blocks:** All security assumptions about cookies

## BLOCKER 2: ACCESS-TOKEN STORAGE CONTRACT
**Required:** Define where access token lives in new architecture
**Blocks:** DriveSession adapter, OAuthManager compatibility

## BLOCKER 3: ATOMIC STATE CONSUMPTION
**Required:** Implement atomic one-time consume primitive
**Blocks:** OAuth state validation security

## BLOCKER 4: MIGRATION RECOVERY STRATEGY
**Required:** Define precise state-machine/idempotency design
**Blocks:** Migration reliability

## BLOCKER 5: IDENTITY UNIQUENESS STRATEGY
**Required:** Define minimum correct identity mechanism
**Blocks:** Duplicate authorization prevention

## BLOCKER 6: GOOGLE IDENTITY SOURCE
**Required:** Investigate Google OAuth client behavior
**Blocks:** Identity field population

## BLOCKER 7: REFRESH LOCK STATE MACHINE
**Required:** Define precise state machine with ownership, expiry, recovery
**Blocks:** Concurrent refresh protection

## BLOCKER 8: DEPLOYMENT INFRASTRUCTURE VERIFICATION
**Required:** Verify Vercel environment, Redis binding, deployment behavior
**Blocks:** Deployment persistence claims

## BLOCKER 9: TEST ARCHITECTURE
**Required:** Investigate existing test infrastructure, define test architecture
**Blocks:** Test implementation

---

# J. FINAL IMPLEMENTATION ORDER (AFTER CORRECTIONS)

1. **Cookie Signing Verification** (BLOCKER 1)
2. **Access-Token Storage Contract** (BLOCKER 2)
3. **Atomic State Consumption** (BLOCKER 3)
4. **Encryption Primitive** (with IV correction)
5. **OAuth State Manager** (with atomic consume)
6. **Credential Repository** (with access token storage)
7. **Session Repository** (with comprehensive semantics)
8. **Identity Deduplication Strategy** (BLOCKER 5)
9. **Google Identity Source Investigation** (BLOCKER 6)
10. **DriveSession Adapter** (with migration recovery)
11. **OAuth Callback Migration** (with idempotency)
12. **Refresh Single-Flight** (with state machine)
13. **Invalid-Grant Handling** (with tombstoning)
14. **Scope Semantics** (with normalization)
15. **Token Update Persistence** (with event updates)
16. **Deployment Infrastructure Verification** (BLOCKER 8)
17. **Test Architecture** (BLOCKER 9)
18. **Failure Recovery Matrix** (MISSING CONTRACT 10)
19. **Deployment Persistence Tests** (after infrastructure verification)
20. **Sharp Workstream** (separate workstream)

---

**Status:** FORENSIC GAP REPORT COMPLETE - SPEC NOT READY FOR IMPLEMENTATION
**Git SHA:** 61df100
**Evidence:** Repository archaeology + code inspection + brutal spec audit
**Verdict:** APPROVE ONLY AFTER SPEC CORRECTIONS

CEO standard: Evidence → Architecture → Specification → Approval → Surgical Implementation → Commit → Deploy → Verify → Evidence. P0-1 spec has CRITICAL GAPS and INCORRECT CLAIMS that must be resolved before implementation.
