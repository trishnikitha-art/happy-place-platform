# DRIVE OAUTH P0 EXECUTION REPORT

**Date:** 2026-08-21
**Git SHA:** 692e530
**Status:** DRIVE OAUTH P0 - CORRECTED CONTRACT ESTABLISHMENT
**Scope:** Drive Authorization Authority Boundary Refactor - Corrected Specification

---

# PHASE 0 — REVERIFICATION COMPLETE

## GIT STATE VERIFIED ✅

```bash
git status --short
```
**Result:** Clean working directory (documentation files only, untracked)

```bash
git branch --show-current
```
**Result:** main

```bash
git log --oneline --decorate --graph --all -25
```
**Result:** Clean history at 692e530

## COMMIT CHAIN VERIFIED ✅

```bash
git show --stat --oneline 692e530
```
**Result:** website/vercel.json (1 insertion, 1 deletion) - Sharp fix

```bash
git show --stat --oneline e4cc5b2
```
**Result:** P0_1_FORENSIC_GAP_REPORT.md (639 insertions) - Forensic audit

```bash
git show --stat --oneline 61df100
```
**Result:** DRIVE_AUTHORITY_BOUNDARY_SPEC.md (697 insertions) - Original spec

## WORKING TREE CLEAN ✅

**Status:** No uncommitted changes, clean working directory
**Branch:** main
**HEAD:** 692e530

---

# PHASE 1 — AUTHORITY CONTRACTS READ ✅

## ORIGINAL SPEC READ ✅

**DRIVE_AUTHORITY_BOUNDARY_SPEC.md** (61df100) - 697 lines
- Original architectural specification
- Contains incorrect claims (NEXTAUTH_SECRET, atomic migration, etc.)
- Requires forensic corrections

## FORENSIC GAP REPORT READ ✅

**P0_1_FORENSIC_GAP_REPORT.md** (e4cc5b2) - 639 lines
- Critical P0 gaps identified
- Incorrect claims documented
- Required corrections specified

## CURRENT IMPLEMENTATION INSPECTED ✅

**drive-session.ts** - 226 lines
- Current authority: Browser cookies
- Cookie properties: httpOnly, secure (production only), sameSite=lax, path=/
- Current data: drive_access_token (1h), drive_refresh_token (30d), drive_expiry_date (30d), drive_scope (30d)
- No cookie signing mechanism found
- No encryption mechanism found

**oauth-manager.ts** - 167 lines
- Current behavior: Event-driven token refresh, proactive refresh
- Refresh token preservation logic
- Transient vs permanent failure classification

**authorize/route.ts** - 56 lines
- Current behavior: access_type=offline, prompt=consent on first login only
- No OAuth state generation (CSRF vulnerability)

**callback/route.ts** - 127 lines
- Current behavior: Code exchange, refresh token preservation
- No OAuth state validation (CSRF vulnerability)
- Direct cookie persistence

---

# PHASE 2 — CORRECTED P0 CONTRACT ESTABLISHED

## TARGET ARCHITECTURE

```
Google OAuth
    ↓
OAuth State Authority (server-side, browser-bound, one-time)
    ↓
GoogleAuthorizationRecord (Redis KV, encrypted)
    ├── authorization identity
    ├── encryptedAccessToken
    ├── accessTokenExpiresAt
    ├── encryptedRefreshToken
    ├── scopes
    ├── status
    └── keyVersion
    ↓
BrowserSessionRecord (Redis KV)
    ├── sessionId
    ├── authorizationId
    ├── expiresAt
    └── revokedAt
    ↓
opaque browser session cookie (httpOnly, secure, sameSite, path)
    ↓
DriveSession adapter (preserves public contract)
    ↓
OAuthManager (preserves public contract)
    ↓
Drive API
```

## CORRECTION A: COOKIE SECURITY ✅

**CORRECTED:**
- Browser receives ONLY opaque random session identifier
- Cookie contains NO credentials (refresh token, access token, encrypted credential, OAuth state)
- Server-side Redis record is authoritative
- Cookie properties explicitly defined:
  - httpOnly: true
  - secure: process.env.NODE_ENV === 'production'
  - sameSite: 'lax'
  - path: '/'
  - maxAge: 30 days
- NO automatic signing mechanism assumed
- NO encryption at cookie layer

## CORRECTION B: ACCESS TOKEN REQUIRED ✅

**CORRECTED:**
- Current Drive runtime has: access_token, expiry_date, refresh_token
- New authority MUST explicitly define access-token persistence
- Authorization record includes:
  - encryptedAccessToken (AES-256-GCM)
  - accessTokenExpiresAt (ISO timestamp)
  - encryptedRefreshToken (AES-256-GCM)
  - keyVersion (for encryption key rotation)
- Browser never receives these values
- Access token stored server-side in encrypted form

## CORRECTION C: OAUTH STATE ONE-TIME AND BROWSER-BOUND ✅

**CORRECTED:**
- NOT merely "Redis state exists = CSRF solved"
- OAuth state must be:
  - Cryptographically random (crypto.randomBytes(16).toString('hex'))
  - Short-lived (5-minute TTL)
  - One-time (atomic consume operation)
  - Server-side (Redis KV)
  - Browser-bound (tied to OAuth initiation session)
  - Impossible to replay
- Use atomic consume operation (Redis Lua or conditional SET)
- State may NOT be consumed twice
- Failed token exchange should NOT create permanently unusable browser authorization flow
- Preferred sequence: state validated → code exchange → successful callback → state atomically consumed

## CORRECTION D: NO CROSS-SYSTEM ATOMICITY ✅

**CORRECTED:**
- Redis and browser cookies are different systems
- Migration NOT described as "atomic"
- Migration instead implements:
  - Idempotent
  - Recoverable
  - Retry-safe
  - State-machine based
- System tolerates failure between:
  - Authorization write
  - Session write
  - Cookie write
  - Old-cookie deletion
- Without losing user's authorization

## CORRECTION E: AUTHORIZATION LIFETIME ✅

**CORRECTED:**
- NOT blindly using "365 days" as authorization validity
- Separation:
  - Google credential validity (from Google)
  - Application authorization status (from system)
  - Redis persistence/retention (from system policy)
  - Browser session lifetime (from system policy)
  - Cleanup policy (from system policy)
- Redis retention policy separate from Google refresh-token validity
- Retention policy to be defined based on repository/security requirements

## CORRECTION F: ID GENERATION ✅

**CORRECTED:**
- Choose ONE mechanism: crypto.randomUUID()
- For authorization/session identifiers
- NO contradictory definitions retained
- Consistent ID generation throughout

## CORRECTION G: GOOGLE IDENTITY ✅

**CORRECTED:**
- Determine authoritative source of:
  - googleSubject (from Google OAuth token response)
  - email (from Google OAuth token response)
  - scopes (from Google OAuth token response)
- Final implementation documents exactly where values originate
- NO invented identity sources

## CORRECTION H: IDENTITY UNIQUENESS ✅

**CORRECTED:**
- NOT casually adding email index
- Minimum invariant: googleSubject is stable provider identity
- Repeated authorization attempts for same Google subject:
  - Update existing authorization record
  - OR create new authorization record with clear policy
- NO duplicate authorization records silently created unless architecture explicitly permits

## CORRECTION I: ENCRYPTION ✅

**CORRECTED:**
- Implement AES-256-GCM using Node's actual crypto API
- Use conventional 12-byte GCM nonce/IV (not 16-byte)
- Explicit keyVersion for encryption-key rotation
- Separate from credentialVersion (different concepts)
- Validate encryption key as exactly 32 bytes
- NEVER log:
  - Plaintext access token
  - Plaintext refresh token
  - Encrypted credential
  - Encryption key
  - OAuth state
  - Credential payload

## CORRECTION J: REFRESH TOKEN ROTATION ✅

**CORRECTED:**
- If Google returns new refresh token:
  - Encrypt
  - Persist
  - Verify persistence
  - Then treat new token as authoritative
- NEVER destroy only known valid refresh token before replacement durably persisted
- If Google does NOT return new refresh token:
  - Preserve existing refresh token

## CORRECTION K: INVALID GRANT ✅

**CORRECTED:**
- NOT "delete authorization" as first response
- Use durable authorization state: "revoked"
- Revoke associated browser sessions
- Preserve enough state for:
  - Forensic diagnosis
  - Identity continuity
  - Explicit reauthorization
  - Multi-session correctness
- NOT destroy identity record merely because credential is invalid

---

# FINAL AUTHORIZATION RECORD SCHEMA

```typescript
interface GoogleAuthorizationRecord {
  id: string; // crypto.randomUUID()
  provider: 'google';
  googleSubject: string; // From Google OAuth token response
  email: string; // From Google OAuth token response
  scopes: string[]; // From Google OAuth token response
  encryptedAccessToken: string; // AES-256-GCM envelope
  accessTokenExpiresAt: string; // ISO timestamp
  encryptedRefreshToken: string; // AES-256-GCM envelope
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  lastUsedAt: string; // ISO timestamp
  lastRefreshAt: string; // ISO timestamp
  status: 'active' | 'revoked' | 'expired';
  keyVersion: number; // Encryption key version
}
```

---

# FINAL SESSION RECORD SCHEMA

```typescript
interface BrowserSessionRecord {
  id: string; // crypto.randomUUID()
  authorizationId: string; // Link to GoogleAuthorizationRecord
  userAgent: string; // Browser identifier
  createdAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp
  lastSeenAt: string; // ISO timestamp
  revokedAt?: string; // ISO timestamp
}
```

---

# FINAL ENCRYPTION ENVELOPE

```typescript
interface EncryptionEnvelope {
  encrypted: string; // Hex-encoded ciphertext
  iv: string; // Hex-encoded 12-byte IV (not 16-byte)
  authTag: string; // Hex-encoded 16-byte auth tag
  keyVersion: number; // Encryption key version
}
```

---

# PHASE 3 — IMPLEMENTATION ORDER LOCKED

## P0.1 — OAuth State Authority

**Create:** website/src/lib/drive/oauth-state-manager.ts

**Requirements:**
- generate() - cryptographically random state
- validate() - browser-bound validation
- consume() - atomic one-time consumption

**Properties:**
- Cryptographically random (crypto.randomBytes(16).toString('hex'))
- Short TTL (5 minutes)
- One-time (atomic consume)
- Browser-bound (tied to OAuth initiation)
- Atomic consumption (Redis Lua or conditional SET)

**Tests:**
- Valid state
- Missing state
- Wrong state
- Expired state
- Replayed state
- Concurrent consumption

**Commit:** feat(auth): add server-side Drive OAuth state authority

---

## P0.2 — Credential Encryption Primitive

**Create:** website/src/lib/drive/encryption.ts

**Requirements:**
- AES-256-GCM
- 12-byte random IV (conventional)
- Auth tag (16-byte)
- Ciphertext
- keyVersion

**Tests:**
- Encrypt/decrypt
- Tampered ciphertext
- Wrong key
- Unknown key version
- Key rotation
- Malformed envelope

**No credential values in logs**

**Commit:** feat(auth): add Drive credential encryption authority

---

## P0.3 — Authorization Repository

**Create:** website/src/lib/drive/oauth-credential-store.ts

**Requirements:**
- Authorization record schema (corrected)
- Encrypted access token
- Encrypted refresh token
- Redis KV persistence
- Redis failure handling

**Tests:**
- CRUD operations
- Malformed record
- Redis unavailable
- Persistence verification

**Commit:** feat(auth): add Drive authorization repository

---

## P0.4 — Session Repository

**Create:** website/src/lib/drive/session-store.ts

**Requirements:**
- Session record schema
- Fixed/sliding expiration (define explicitly)
- create, get, revoke, revokeAllForAuthorization, renew

**Tests:**
- Valid session
- Expired session
- Revoked session
- Missing authorization
- Logout
- Multiple sessions

**Commit:** feat(auth): add Drive browser session repository

---

## P0.5 — DriveSession Adapter

**Modify:** website/src/lib/drive/drive-session.ts

**Requirements:**
- Preserve public contract where possible
- Change authority from browser cookies to:
  - Opaque session ID
  - BrowserSessionRecord
  - GoogleAuthorizationRecord
- No caller needs to know where credentials stored
- Preserve working business behavior

**Commit:** refactor(auth): adapt DriveSession to server-side authority

---

## P0.6 — OAuth Callback

**Modify:** website/src/app/api/drive/oauth/callback/route.ts

**Correct order:**
1. Validate Google response
2. Validate browser-bound OAuth state
3. Exchange authorization code
4. Obtain authoritative Google identity
5. Preserve existing refresh token when necessary
6. Encrypt credential material
7. Create/update authorization record
8. Create browser session
9. Set opaque session cookie
10. Clean up legacy credential cookies ONLY after successful migration
11. Redirect

**Requirements:**
- Every step retry-safe
- Callback retry NO duplicate authorization identities
- Partial Redis failure NO destroy existing valid credential
- Cookie failure NO destroy server-side authorization

**Commit:** refactor(auth): implement OAuth callback with server-side authority

---

## P0.7 — OAuth Authorize Route

**Modify:** website/src/app/api/drive/oauth/authorize/route.ts

**Requirements:**
- Trace actual existing behavior first
- Implement explicit behavior for:
  - No session
  - Valid session
  - Expired session
  - Revoked authorization
  - Existing authorization but no session
  - Forced reauthorization
- Generate browser-bound state at OAuth initiation

**Commit:** refactor(auth): implement OAuth authorize with state generation

---

## P0.8 — Refresh Single-Flight

**Modify:** website/src/lib/drive/oauth-manager.ts

**Requirements:**
- Real refresh state machine
- drive:refresh:lock:{authorizationId} with ownership token
- Algorithm:
  - Acquire
  - Inspect current token state
  - Refresh only if necessary
  - Persist access token
  - Persist rotated refresh token if returned
  - Release ownership
- Waiters:
  - Observe lock
  - Wait bounded time
  - Reload authorization record
  - Reuse newly persisted access token
- Lock holder dies:
  - Lock TTL expires
  - Next caller may acquire
- NO blind refresh immediately after lock expiry if authorization record already contains valid refreshed access token

**Tests:**
- Single refresh
- Concurrent refresh
- Lock contention
- Lock expiry
- Holder crash simulation
- Refresh-token rotation
- Redis failure
- Invalid grant

**Commit:** refactor(auth): implement single-flight token refresh

---

## PHASE 4 — LEGACY COOKIE MIGRATION

**Requirements:**
- ONLY after new authority works
- Inspect every existing credential-cookie consumer
- Bounded migration path
- Properties:
  - One-time bootstrap
  - Idempotent
  - Retry-safe
  - NO indefinite cookie fallback
- Migration tolerates:
  - Authorization write succeeds
  - Session write fails
  - Cookie write fails
  - Verification fails
  - Legacy cookie deletion fails
  - Request crashes
  - Callback retry
  - Two browser tabs
- Final state: server-side authority = sole authority
- Legacy credential cookies NOT indefinite fallback
- NOT delete until server-side record successfully verified

**Commit:** refactor(auth): implement bounded legacy cookie migration

---

# PHASE 5 — TEST ARCHITECTURE

## OAuth Tests
- State generation
- Browser binding
- Expiry
- Replay
- Concurrent consumption
- Google error callback
- Missing refresh token
- Refresh token rotation
- Callback retry

## Encryption Tests
- AES-GCM
- Tampering
- Wrong key
- Key version
- Rotation

## Authorization Repository Tests
- CRUD
- Malformed record
- Redis unavailable
- Persistence verification

## Session Tests
- Create
- Lookup
- Expiry
- Revoke
- Renew
- Revoke all

## Migration Tests
- Successful migration
- Partial failure
- Retry
- Concurrent migration
- Legacy-cookie cleanup

## Refresh Tests
- Normal refresh
- Concurrent refresh
- Lock contention
- Stale lock
- Token rotation
- Invalid grant
- Redis outage

---

# PHASE 6 — DEPLOYMENT VERIFICATION

**Before claiming deployment persistence:**

PROVE actual Vercel environment:

- Production Redis binding
- Preview Redis binding
- Production encryption key
- Preview encryption key
- Environment separation
- Rollback persistence

**Never expose credentials in logs**

**Perform actual deployment verification:**

1. OAuth initiation
2. State creation
3. Callback
4. Authorization persistence
5. Session persistence
6. Opaque cookie
7. Drive auth status
8. Drive discovery
9. Drive browsing
10. Token refresh
11. Deployment persistence
12. Rollback persistence
13. Revoked-token behavior

---

# PHASE 7 — DRIVE FUNCTIONALITY REGRESSION

**OAuth refactor NOT complete merely because authentication works**

Verify every existing Drive capability:

- Drive auth status
- Drive discovery
- My Drive browsing
- Shared Drive browsing
- Shared Drive root
- Shared Drive folders
- Thumbnails
- Pagination
- Search
- Selection
- Use This Asset
- Drive provenance
- Media Workbench Drive browser

**OAuth refactor must NOT break existing Media Workbench architecture**

---

# PHASE 8 — INFORMATION BOUNDARY VERIFICATION

**Confirm authentication credentials NEVER enter:**

- media.v1.json
- canonical-media-graph.json
- .generated/*
- Media projections
- Media provenance payloads
- Drive asset identity

**Authentication may expose ONLY minimum operational identity metadata required by authorized consumer**

**NEVER allow:**

- Access token
- Refresh token
- Encrypted credential
- OAuth state
- Encryption key
- Credential payload

**to enter media authority/projection infrastructure**

---

# GIT / COMMIT DISCIPLINE

**Each meaningful authority layer independently committed**

**NO giant opaque OAuth commit**

**Recommended chain:**

1. P0.1 OAuth state authority
2. P0.2 Credential encryption
3. P0.3 Authorization repository
4. P0.4 Session repository
5. P0.5 DriveSession adapter
6. P0.6 OAuth callback
7. P0.7 Authorize route
8. P0.8 Refresh single-flight
9. P0.9 Bounded legacy migration
10. P0.10 Integration/regression tests

**After every phase:**

```bash
git status --short
git diff --check
```

**NO proceed if unrelated changes appear**

---

# CRITICAL SCOPE RULE

**DO NOT TOUCH:**

- Media authority
- Canonical media graph
- Projections
- PING90 constitutional identity
- Sharp architecture
- Image pipeline
- Unrelated UI
- Unrelated Drive features

**UNLESS OAuth runtime audit proves direct dependency requiring change**

**This is AUTHORITY REFACTOR - Keep blast radius controlled**

---

# FINAL GATE

**Do NOT report "Drive OAuth P0 complete" until ALL are proven:**

## Security
- Opaque session cookie
- No browser credential storage
- Browser-bound OAuth state
- Atomic one-time state consumption
- AES-256-GCM credential encryption
- Key versioning
- No credential logging

## Persistence
- Authorization survives deployment
- Session survives deployment according to policy
- Access token persists correctly
- Refresh token persists correctly
- Refresh-token rotation persists correctly

## Reliability
- Redis failure has explicit behavior
- Refresh is single-flight
- Stale locks recover
- Invalid grant is recoverable
- Migration is idempotent
- Callback retries are safe

## Identity
- googleSubject authoritative
- Duplicate authorization behavior defined
- Sessions correctly map to authorization

## Drive Regression
- Auth status
- Discovery
- My Drive
- Shared Drive
- Folders
- Thumbnails
- Pagination
- Search
- Selection
- Use This Asset
- Provenance
- Media Workbench

## Deployment
- Production verified
- Preview isolated
- Rollback verified
- Environment-specific secrets verified

---

# STATUS

**CORRECTED P0 CONTRACT ESTABLISHED ✅**
**READY FOR PHASED IMPLEMENTATION ✅**
**Sharp Status:** Surgical fix deployed, awaiting production verification
**Git SHA:** 692e530
**Evidence:** Repository verification + forensic corrections + corrected specification

**CEO Standard:** Evidence → Architecture → Corrected Specification → Surgical Implementation → Tests → Commit → Deploy → Verify → Evidence

**Next:** Begin P0.1 - OAuth State Authority implementation
