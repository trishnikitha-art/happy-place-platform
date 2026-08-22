# DRIVE OAUTH ARCHITECTURAL AUDIT

**Date:** 2026-08-21
**Git SHA:** deb9788
**Status:** ARCHITECTURAL SPECIFICATION PHASE
**Purpose:** Design long-lived Drive authorization architecture for HPP/PING90

---

# PHASE A — CURRENT ARCHITECTURE MAP

## ACTUAL GIT STATE

**Current HEAD:** deb9788
**Branch:** main
**Remote:** origin/main

## CURRENT CREDENTIAL STORAGE MECHANISM

**Location:** Browser cookies (httpOnly, secure, sameSite=lax)
**Files:**
- `website/src/lib/drive/drive-session.ts` (authority)
- `website/src/lib/drive/oauth-manager.ts` (automatic refresh)
- `website/src/app/api/drive/oauth/callback/route.ts` (token exchange)
- `website/src/app/api/drive/oauth/authorize/route.ts` (OAuth initiation)

**Cookie Schema:**
```
drive_access_token (1 hour maxAge)
drive_refresh_token (30 day maxAge)
drive_expiry_date (30 day maxAge)
drive_scope (30 day maxAge)
```

## CURRENT AUTHENTICATION FLOW

```
Browser
  ↓
GET /api/drive/oauth/authorize
  ↓
Google OAuth (access_type=offline, prompt=consent first time only)
  ↓
GET /api/drive/oauth/callback?code=...
  ↓
Exchange code for tokens
  ↓
Store tokens in httpOnly cookies
  ↓
Browser cookie contains refresh_token
  ↓
DriveSession.isAuthenticated() (checks refresh_token only)
  ↓
DriveSession.getCredentials() (requires refresh_token only)
  ↓
OAuthManager.initialize() (uses credentials, auto-refresh)
  ↓
Drive API calls
```

## CURRENT STATE MACHINE

**Authentication Predicate:**
```typescript
isAuthenticated(): refresh_token present
```

**Credential Acquisition:**
```typescript
getCredentials(): refresh_token present (access_token optional)
```

**Token Refresh:**
```typescript
OAuthManager.initialize():
  - Proactive refresh if < 5 minutes to expiry
  - Event-driven refresh on token events
  - Preserve refresh_token if Google doesn't return new one
```

**Failure Classification:**
```typescript
Transient failures: keep credentials, retry
Permanent failures (invalid_grant, revoked): clear credentials, reauth
```

## EXISTING INFRASTRUCTURE

**Redis (Upstash KV):**
- `website/src/lib/media-kv-store.ts` (media metadata storage)
- `website/src/lib/blob-storage.ts` (blob metadata index)
- `website/src/lib/assignment-store.ts` (service card assignments)

**Vercel Blob Storage:**
- `website/src/lib/blob-storage.ts` (actual media file storage)

**No dedicated OAuth credential storage exists currently.**

---

# PHASE B — PERSISTENCE BOUNDARY ANALYSIS

## CURRENT COOKIE PERSISTENCE

**What makes it persistent:**
1. Browser cookie storage (30-day maxAge)
2. httpOnly flag (prevents JavaScript access)
3. secure flag (HTTPS only in production)
4. sameSite=lax (CSRF protection)

**What it lacks:**
1. Encryption at rest (plaintext refresh token in browser)
2. Deployment independence (browser-bound)
3. Device independence (single browser)
4. Centralized revocation
5. Audit trail
6. Secret rotation mechanism

## COOKIE SIGNING/ENCRYPTION

**Current State:**
- Next.js cookies are signed using NEXTAUTH_SECRET
- No evidence of encryption beyond signing
- Refresh token stored in plaintext (though httpOnly)

**Secret Stability:**
- NEXTAUTH_SECRET environment variable
- Secret stability across deployments: NOT VERIFIED
- If secret changes, cookies become invalid

## DEPLOYMENT BEHAVIOR

**Unknowns:**
1. Does cookie survive Vercel deployment?
2. Does NEXTAUTH_SECRET change between deployments?
3. Does same hostname across deployments preserve cookies?
4. Preview deployment behavior (different hostname)

**Failure Modes:**
1. Secret rotation → cookies invalid → forced reauth
2. Deployment changes → different secret → cookies invalid
3. 30-day expiry → forced reauth regardless of Google authorization

---

# PHASE C — RESEARCH FINDINGS

## AUTHORITATIVE SOURCES

| Source | Pattern | Evidence | Applicability to HPP | Risk |
|--------|---------|----------|---------------------|------|
| Google OAuth Web Server Guide | Server-side refresh token storage | "require secure storage system appropriate to your platform" | HIGH - Google authoritative | LOW |
| Google Authorization Model Guide | Authorization code flow for offline access | "backend platform needed to store per-user refresh tokens" | HIGH - Requires backend storage | LOW |
| Google Best Practices | Encrypt tokens at rest | "encrypt them at rest for server-side applications" | HIGH - Security requirement | LOW |
| Vercel Connect OAuth | Centralized token storage | "Vercel Connect centralizes token storage" | MEDIUM - Vercel-native solution | MEDIUM |
| OWASP Session Management | Secure session storage | "use secure session mechanisms" | HIGH - Security authority | LOW |

## ESTABLISHED PRACTICES

| Source | Pattern | Evidence | Applicability to HPP | Risk |
|--------|---------|----------|---------------------|------|
| Nango OAuth | Server-side credential store | "backend OAuth service + user-specific connection identity" | HIGH - Established pattern | LOW |
| Redis Token Stores | Redis as token store | "Google::Auth::Stores::RedisTokenStore" | HIGH - Already have Redis | LOW |
| Encrypted Credential Records | Encrypt refresh tokens | Standard SaaS practice | HIGH - Security requirement | LOW |

## COMMUNITY PATTERNS

| Source | Pattern | Evidence | Applicability to HPP | Risk |
|--------|---------|----------|---------------------|------|
| Serverless OAuth | KV/storage for credentials | "Store tokens in database/KV for serverless" | HIGH - Vercel context | LOW |
| Refresh Token Rotation | Handle token rotation | "Preserve existing refresh token if not returned" | HIGH - Already implemented | LOW |
| OAuth State Validation | CSRF protection | "Use state parameter for CSRF protection" | HIGH - Security requirement | LOW |

---

# PHASE D — ARCHITECTURE OPTIONS

## OPTION A — BROWSER COOKIE REMAINS AUTHORITY

### Architecture
```
Google
  ↓
refresh token
  ↓
httpOnly cookie (30 days)
  ↓
DriveSession
```

### Advantages
- Simple (no new infrastructure)
- Already implemented
- Low operational complexity

### Disadvantages
- Browser-bound (not deployment-independent)
- 30-day expiry regardless of Google authorization
- No centralized revocation
- No device independence
- Cookie secret rotation breaks sessions
- Refresh token in browser (security concern)

### Security
- Medium (httpOnly + secure, but plaintext in browser)

### Deployment Durability
- LOW (depends on cookie secret stability)

### Multi-Device Behavior
- POOR (single browser session)

### Complexity
- LOW (current implementation)

### Migration Difficulty
- N/A (already implemented)

### Recommendation
- **REJECT** - Not suitable for long-lived authorization

---

## OPTION B — SERVER-SIDE ENCRYPTED CREDENTIAL STORE

### Architecture
```
Google
  ↓
refresh token
  ↓
encrypted credential record (Redis KV)
  ↓
credential ID/session reference
  ↓
browser cookie (opaque session ID)
  ↓
DriveSession
```

### Advantages
- Deployment-independent
- Device-independent possible
- Centralized revocation
- Audit trail
- Refresh token encrypted at rest
- No secrets in browser
- Longer-lived than 30 days

### Disadvantages
- Requires Redis KV infrastructure
- Encryption key management
- Migration from current cookies
- Additional complexity

### Security
- HIGH (encrypted at rest, opaque session in browser)

### Deployment Durability
- HIGH (server-side storage survives deployments)

### Multi-Device Behavior
- GOOD (same authorization can support multiple sessions)

### Complexity
- MEDIUM (new storage layer, encryption)

### Migration Difficulty
- MEDIUM (migrate existing cookies to server-side records)

### Recommendation
- **ACCEPT** - Fits HPP requirements, uses existing Redis

---

## OPTION C — SERVER-SIDE CREDENTIAL STORE + PER-BROWSER SESSION

### Architecture
```
Google account
    ↓
GoogleAuthorization (server-side)
    ↓
encrypted refresh token
    ↓
BrowserSession (server-side)
    ↓
session cookie (opaque session ID)
    ↓
DriveSession
```

### Advantages
- Separates authorization from session
- Multiple browser sessions per authorization
- Better session management
- Clean separation of concerns

### Disadvantages
- Higher complexity
- Two-tier storage (authorization + session)
- More migration complexity
- Session expiration logic

### Security
- HIGH (encrypted credentials, session isolation)

### Deployment Durability
- HIGH (server-side storage)

### Multi-Device Behavior
- EXCELLENT (true multi-device support)

### Complexity
- HIGH (two-tier architecture)

### Migration Difficulty
- HIGH (complete architectural change)

### Recommendation
- **CONDITIONAL** - Best architecture but higher complexity

---

## OPTION D — EXISTING INFRASTRUCTURE REUSE

### Available Infrastructure
- Redis KV (Upstash) - already used for media metadata
- Vercel Blob Storage - used for media files
- Encryption utilities - need to verify
- Session system - need to verify

### Proposed Reuse
- Extend existing Redis KV for OAuth credentials
- Use same encryption as media (if exists)
- Leverage existing Redis client patterns

### Advantages
- No new infrastructure
- Consistent patterns
- Lower operational complexity
- Already proven in production

### Disadvantages
- Tightly coupled to media infrastructure
- May mix concerns
- Existing KV designed for media, not OAuth

### Security
- HIGH (leverages existing security)

### Deployment Durability
- HIGH (existing infrastructure)

### Multi-Device Behavior
- GOOD (server-side storage)

### Complexity
- LOW-MEDIUM (reuse existing patterns)

### Migration Difficulty
- MEDIUM (extend existing patterns)

### Recommendation
- **ACCEPT** - Best balance of reuse and separation

---

# PHASE E — PING90 / HPP CONSTITUTIONAL BOUNDARY

## AUTHORITY CLASSIFICATION

**Google OAuth Credentials:** Infrastructure/Adapter Layer
- NOT media authority
- NOT PING90 constitutional entity
- Infrastructure concern (like database, storage)

**Constitutional Boundary:**
```
Google Drive
    ↓
authorization/infrastructure boundary
    ↓
Drive adapter (uses OAuth credentials)
    ↓
media ingestion
    ↓
PING90 provenance/identity
    ↓
HPP projections/workbench
```

**Prohibited:**
- Do NOT place OAuth credentials in media.v1.json
- Do NOT place OAuth credentials in projections
- Do NOT place OAuth credentials in public metadata
- Do NOT create second media registry

**Allowed:**
- Store OAuth credentials in infrastructure layer (Redis KV)
- Use same infrastructure as media KV (separate namespace)
- Keep credentials separate from media records

---

# PHASE F — MEDIA SYSTEM INSPIRATION

## RESEARCH TARGETS

**Directus:**
- Metadata/storage separation
- Transformation presets
- File library organization

**Cloudinary:**
- Named transformations
- Derived assets
- Deterministic signed URLs

**imgproxy:**
- Signed transformation URLs
- Cache busting
- Deterministic processing

**Applicable Patterns for HPP:**
- Metadata/storage separation (already have)
- Transformation presets (future enhancement)
- Signed URLs (consider for public resolver)
- Deterministic processing (important for provenance)

**North Star Preservation:**
```
Drive source asset
      ↓
download/materialize
      ↓
immutable source
      ↓
content identity
      ↓
Sharp transformation
      ↓
derived variants
      ↓
PublishedMediaAsset
      ↓
Workbench
```

---

# PHASE G — SHARP SEPARATE WORKSTREAM

**Current Sharp Status:**
- Diagnostic probe deployed (deb9788)
- Runtime capability: UNPROVEN
- Materialization: UNPROVEN

**CEO Directive:**
- Do NOT mix OAuth architecture with Sharp changes
- Keep Sharp probe separate
- One variable at a time

**Sharp Status During OAuth Design:**
- Paused at diagnostic probe
- No Sharp implementation changes
- Sharp probe decoupled from Drive auth

---

# PHASE H — RECOMMENDED TARGET ARCHITECTURE

## PROPOSED ARCHITECTURE

```
Google Drive
    ↓
Google OAuth
    ↓
refresh token
    ↓
Encrypted Credential Record (Redis KV)
    ↓
Opaque Session ID (httpOnly cookie)
    ↓
DriveSession Authority
    ↓
OAuthManager (automatic refresh)
    ↓
Drive Adapter
    ↓
Media Ingestion
    ↓
PING90 Provenance
    ↓
HPP Projections
```

## DATA MODEL

### GoogleAuthorizationRecord
```typescript
interface GoogleAuthorizationRecord {
  id: string; // Authorization ID
  provider: 'google';
  googleSubject: string; // Google account ID
  email: string; // User email
  scopes: string[]; // Granted scopes
  encryptedRefreshToken: string; // Encrypted refresh token
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  lastRefreshAt: string; // ISO timestamp
  lastUsedAt: string; // ISO timestamp
  status: 'active' | 'revoked' | 'expired';
  credentialVersion: number; // For rotation
}
```

### BrowserSessionRecord
```typescript
interface BrowserSessionRecord {
  id: string; // Session ID
  authorizationId: string; // Link to GoogleAuthorizationRecord
  userAgent: string; // Browser identifier
  createdAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp
  lastSeenAt: string; // ISO timestamp
  revokedAt?: string; // ISO timestamp
}
```

## REDIS NAMESPACE

```
drive:auth:{authorizationId} -> GoogleAuthorizationRecord
drive:session:{sessionId} -> BrowserSessionRecord
drive:session:by:user:{googleSubject} -> Set of session IDs
drive:auth:by:email:{email} -> Authorization ID
```

## COOKIE SCHEMA

```
drive_session_id (opaque session ID, 30 days)
```

## ENCRYPTION

**Key Management:**
- Use ENCRYPTION_KEY environment variable
- AES-256-GCM encryption
- Separate from NEXTAUTH_SECRET
- Key rotation strategy required

---

# PHASE I — TOKEN LIFECYCLE STATE MACHINE

## STATE TRANSITIONS

```
UNAUTHORIZED
    ↓
[User initiates OAuth]
AUTHORIZING
    ↓
[Google consent received]
EXCHANGING_CODE
    ↓
[Token exchange success]
AUTHORIZED
    ↓
[Access token expiry]
REFRESHING
    ↓
[Refresh success]
AUTHORIZED
    ↓
[invalid_grant/revoked]
REAUTH_REQUIRED
    ↓
[User re-authenticates]
AUTHORIZED
```

## FAILURE SEMANTICS

| Failure | Retain Credentials? | Retry? | Invalidate Session? | Require Google Login? | HTTP Error | Audit Event | User Behavior |
|---------|---------------------|--------|---------------------|----------------------|------------|-------------|--------------|
| Network timeout | YES | YES | NO | NO | 503 | RETRY_TIMEOUT | Automatic retry |
| Google 5xx | YES | YES | NO | NO | 502 | GOOGLE_5XX | Automatic retry |
| Rate limit | YES | YES (backoff) | NO | NO | 429 | RATE_LIMIT | Delayed retry |
| Concurrent refresh | YES | NO (serialize) | NO | NO | 409 | CONCURRENT_REFRESH | Automatic handling |
| Refresh token rotation | YES | YES | NO | NO | N/A | TOKEN_ROTATION | Automatic |
| Missing refresh token | NO | NO | YES | YES | 401 | MISSING_TOKEN | Require login |
| Malformed credential | NO | NO | YES | YES | 500 | MALFORMED_CREDENTIAL | Require login |
| Encryption failure | NO | NO | YES | YES | 500 | ENCRYPTION_FAILURE | Require login |
| Storage unavailable | YES | YES | NO | NO | 503 | STORAGE_UNAVAILABLE | Automatic retry |
| invalid_grant | NO | NO | YES | YES | 401 | INVALID_GRANT | Require login |
| revoked | NO | NO | YES | YES | 401 | TOKEN_REVOKED | Require login |

---

# PHASE J — SECURITY MODEL

## ENCRYPTION AT REST

**Algorithm:** AES-256-GCM
**Key Source:** ENCRYPTION_KEY environment variable
**Key Rotation:** Planned support for credentialVersion field
**Key Storage:** Vercel environment variables

## COOKIE SECURITY

**Cookie:** drive_session_id (opaque session ID)
**Attributes:** httpOnly, secure, sameSite=lax, 30-day maxAge
**Contents:** Session ID only (no credentials)

## CSRF PROTECTION

**OAuth State Validation:**
- Generate cryptographically random state
- Store state in Redis with expiration
- Validate state on callback
- Reject mismatched/expired/reused state

## SECRET ROTATION

**Strategy:**
- credentialVersion field supports key rotation
- Decrypt with old key, encrypt with new key
- Support multiple active key versions during transition
- Audit trail of key rotations

## LOGS

**Prohibited:**
- No refresh tokens in logs
- No access tokens in logs
- No raw state values in logs
- No credential payloads in logs

**Allowed:**
- Session IDs
- Authorization IDs
- Event types
- Safe metadata
- Error codes

---

# PHASE K — VERCEL DEPLOYMENT MODEL

## PERSISTENCE CHOICE

**Selected:** Redis KV (Upstash)
**Rationale:**
- Already in production for media metadata
- Deployment-independent
- Vercel-native integration
- Consistent with existing patterns
- Low latency
- High durability

## DEPLOYMENT SURVIVAL

**What Persists:**
- Redis KV data (survives deployments)
- Encrypted credential records (survives deployments)
- Session records (survives deployments)

**What Does NOT Persist:**
- Process memory (serverless ephemeral)
- In-memory caches

## COOKIE BEHAVIOR

**Same Hostname:** Cookies survive deployments
**Different Hostname:** Cookies do not persist (expected)
**Preview Deployments:** Separate session space (expected)

## ROLLBACK BEHAVIOR

**Rollback Safe:** Yes
- Server-side storage unaffected by code rollback
- Cookies remain valid
- Authorization continues working

---

# PHASE L — MEDIA INGESTION TARGET

## CURRENT ARCHITECTURE

```
Drive authorization
        ↓
Drive metadata
        ↓
download stream/buffer
        ↓
source integrity/hash
        ↓
immutable materialization
        ↓
Sharp processing
        ↓
variants
        ↓
provenance
        ↓
PublishedMediaAsset
        ↓
slot binding
        ↓
HPP projection
```

## AUTHORITY BOUNDARIES

**SOURCE OF TRUTH:** Google Drive
**IDENTITY:** content hash + source identity hash
**PROVENANCE:** PublishedMediaAsset
**MATERIALIZATION:** Drive → Sharp → Blob Storage
**DERIVATION:** Variants (WebP, AVIF, thumbnail)
**PROJECTION:** HPP workbench slots
**UI STATE:** React components

## SHARP INTEGRATION

**Current State:** Diagnostic probe only
**Target:** Full materialization pipeline
**Separation:** Sharp changes separate from OAuth architecture

---

# PHASE M — WHOLE-FEATURE SWAP CANDIDATES

## EXISTING IMPLEMENTATIONS

**Redis KV Pattern:**
- media-kv-store.ts (mature pattern)
- blob-storage.ts (mature pattern)
- assignment-store.ts (mature pattern)

**Swap Candidate:** OAuth credential store
- Can reuse media-kv-store patterns
- Similar persistence requirements
- Similar validation patterns
- Similar error handling

**Recommendation:** Extend existing pattern rather than wholesale swap

---

# PHASE N — STRING-SWAP GATE

## CONDITIONS BEFORE STRING SWAPS

**Drive Identity Architecture:**
- [ ] Server-side credential storage implemented
- [ ] OAuth state validation implemented
- [ ] Token refresh serialization implemented
- [ ] Failure classification implemented

**OAuth Persistence Architecture:**
- [ ] Credential encryption implemented
- [ ] Session management implemented
- [ ] Cookie security hardened
- [ ] Secret rotation strategy defined

**Credential/Session Boundary:**
- [ ] Authorization records separate from session records
- [ ] Opaque session IDs in cookies
- [ ] No credentials in browser
- [ ] Revocation mechanism implemented

**Media Authority Boundary:**
- [ ] OAuth credentials separate from media records
- [ ] No credentials in media.v1.json
- [ ] No credentials in projections
- [ ] Infrastructure layer isolation proven

**Ingestion Boundary:**
- [ ] Drive → materialization → Sharp pipeline proven
- [ ] PublishedMediaAsset creation proven
- [ ] Provenance preservation proven
- [ ] Public resolver rejection of Drive references proven

**Sharp Runtime Capability:**
- [ ] Sharp import proven
- [ ] Native libvips proven
- [ ] Decode proven
- [ ] WebP proven
- [ ] AVIF proven
- [ ] Real Drive image processing proven

**Provenance Boundary:**
- [ ] Source identity hash correct
- [ ] Content hash correct
- [ ] Drive ID separation proven
- [ ] Published media separation proven

**Projection Boundary:**
- [ ] Workbench binding model correct
- [ ] Slot assignment correct
- [ ] Public projection correct
- [ ] No Drive ID leakage

---

# FINAL RECOMMENDATION

## SELECTED ARCHITECTURE

**Option D with Option B elements:**
- Server-side encrypted credential store (Redis KV)
- Opaque session ID in browser cookie
- Reuse existing Redis KV patterns
- Extend existing infrastructure

## IMPLEMENTATION PRIORITY

1. **Credential Storage Layer** (Redis KV)
2. **Encryption Layer** (AES-256-GCM)
3. **Session Management** (BrowserSessionRecord)
4. **OAuth State Validation** (CSRF protection)
5. **Token Refresh Serialization** (single-flight pattern)
6. **Migration from Cookies** (credential migration)
7. **Testing** (deployment persistence verification)

## NEXT STEPS

1. **Design Approval:** Review this architectural specification
2. **Implementation:** Build credential storage layer
3. **Migration:** Migrate existing cookie credentials
4. **Testing:** Verify deployment persistence
5. **Sharp Workstream:** Resume Sharp diagnostic work

---

**Status:** ARCHITECTURAL SPECIFICATION COMPLETE - AWAITING CEO APPROVAL
**Git SHA:** deb9788
**Evidence:** Git archaeology + code inspection + authoritative research
