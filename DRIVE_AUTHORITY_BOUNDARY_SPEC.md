# DRIVE AUTHORIZATION AUTHORITY BOUNDARY SPEC

**Date:** 2026-08-21
**Git SHA:** db6a0b3
**Status:** P0-1 AUTHORITY BOUNDARY SPECIFICATION
**Scope:** Drive Authorization Authority Boundary only (Sharp, media authority, projections, strings excluded)

---

# EXISTING FUNCTION ANALYSIS

## CURRENT AUTHORITY FUNCTIONS

### DriveSession (drive-session.ts)
**Current Responsibility:**
- `isAuthenticated()` - Check if refresh token exists in cookie
- `getCredentials()` - Get credentials from cookies
- `setCredentials()` - Set credentials in cookies
- `clearCredentials()` - Clear credential cookies
- `getRefreshToken()` - Get refresh token from cookie
- `isTokenExpired()` - Check if access token expired
- `isTokenNearExpiry()` - Check if token near expiry
- `getTimeUntilExpiry()` - Get time until expiry

**Current Storage:** Browser cookies (httpOnly, secure, sameSite=lax)
**Current Data:**
- drive_access_token (1 hour maxAge)
- drive_refresh_token (30 day maxAge)
- drive_expiry_date (30 day maxAge)
- drive_scope (30 day maxAge)

### OAuthManager (oauth-manager.ts)
**Current Responsibility:**
- `initialize()` - Initialize OAuth2 client with credentials from DriveSession
- `getClient()` - Get OAuth2 client with token refresh
- `getDriveClient()` - Get Drive API client
- `isAuthenticated()` - Delegate to DriveSession
- `logout()` - Clear credentials via DriveSession

**Current Behavior:**
- Proactive token refresh if < 5 minutes to expiry
- Event-driven token refresh via `on('tokens')`
- Transient vs permanent failure classification
- Refresh token preservation in callback

### OAuth Callback (callback/route.ts)
**Current Responsibility:**
- Exchange authorization code for tokens
- Preserve existing refresh token if Google doesn't return new one
- Persist credentials via DriveSession

**Current Behavior:**
- No OAuth state validation (CSRF vulnerability)
- No server-side credential storage
- Direct cookie persistence

### OAuth Authorize (authorize/route.ts)
**Current Responsibility:**
- Initiate OAuth flow with Google
- Check if refresh token exists to determine prompt parameter

**Current Behavior:**
- `access_type=offline` (correct)
- `prompt=consent` only on first login (correct)
- No OAuth state generation (CSRF vulnerability)

---

# BEFORE/AFTER CONTRACT

## AUTHORITY BOUNDARY BEFORE

```
Google OAuth
    ↓
OAuth callback
    ↓
Browser cookies (drive_access_token, drive_refresh_token, drive_expiry_date, drive_scope)
    ↓
DriveSession (reads/writes cookies)
    ↓
OAuthManager (uses DriveSession)
    ↓
Drive API
```

**Authority:** Browser cookies
**Storage:** Browser (30-day maxAge)
**Security:** httpOnly + secure, but plaintext refresh token
**Persistence:** Browser-bound, deployment-sensitive

## AUTHORITY BOUNDARY AFTER

```
Google OAuth
    ↓
OAuth callback (with state validation)
    ↓
GoogleAuthorizationRecord (Redis KV, encrypted)
    ├── authorization identity
    ├── encrypted refresh token
    ├── scopes
    ├── status
    └── credential version
    ↓
BrowserSessionRecord (Redis KV)
    └── opaque session ID only
    ↓
Browser cookie (drive_session_id only)
    ↓
DriveSession (adapter to server-side storage)
    ↓
OAuthManager (uses DriveSession)
    ↓
Drive API
```

**Authority:** Server-side Redis KV
**Storage:** Encrypted credentials in Redis KV
**Security:** AES-256-GCM encryption at rest, opaque session ID in browser
**Persistence:** Deployment-independent, server-side

---

# EXACT FUNCTION CONTRACT CHANGES

## REMAIN AUTHORITATIVE (become adapters to new storage)

### DriveSession
**Before:** Reads/writes browser cookies directly
**After:** Adapter to server-side GoogleAuthorizationRecord and BrowserSessionRecord

**Contract Changes:**
- `isAuthenticated()` - Check if valid session exists and authorization is active
- `getCredentials()` - Get credentials from server-side storage, decrypt refresh token
- `setCredentials()` - Update server-side storage (callback only)
- `clearCredentials()` - Clear server-side session and authorization
- `getRefreshToken()` - Get encrypted refresh token from server-side storage
- `isTokenExpired()` - Check if access token expired (keep same logic)
- `isTokenNearExpiry()` - Check if token near expiry (keep same logic)
- `getTimeUntilExpiry()` - Get time until expiry (keep same logic)

**Storage Changes:**
- Before: Read/write browser cookies
- After: Read/write Redis KV via credential store

### OAuthManager
**Before:** Uses DriveSession (cookies)
**After:** Uses DriveSession (server-side storage)

**Contract Changes:**
- `initialize()` - Same interface, but DriveSession now reads from server-side
- `getClient()` - Same interface, but DriveSession now reads from server-side
- `getDriveClient()` - No changes
- `isAuthenticated()` - No changes (delegates to DriveSession)
- `logout()` - No changes (delegates to DriveSession)

**Behavior Changes:**
- Same interface, but credentials now from server-side storage
- Same refresh logic, but persistence is server-side

## BECOME ADAPTERS (no longer authority)

### OAuth Callback
**Before:** Persists credentials directly to cookies
**After:** Persists credentials to server-side storage via credential store

**Contract Changes:**
- Add OAuth state validation
- Store credentials in GoogleAuthorizationRecord
- Create BrowserSessionRecord
- Set opaque session ID cookie
- Remove old credential cookies after migration

### OAuth Authorize
**Before:** Check if refresh token exists in cookie
**After:** Check if valid session exists and authorization is active

**Contract Changes:**
- Add OAuth state generation
- Store state in Redis with expiration
- Check for valid session (not just refresh token cookie)

---

# EXACT REDIS KEYS AND TTLS

## Redis Keys

### GoogleAuthorizationRecord
```
drive:auth:{authorizationId}
TTL: 365 days (authorization-level persistence)
```

### BrowserSessionRecord
```
drive:session:{sessionId}
TTL: 30 days (session-level persistence)
```

### OAuth State
```
drive:state:{state}
TTL: 5 minutes (one-time use)
```

### Refresh Lock
```
drive:refresh:lock:{authorizationId}
TTL: 1 minute (concurrent refresh protection)
```

## Key Generation

### Authorization ID
```
Format: "auth_{timestamp}_{random}"
Algorithm: crypto.randomUUID()
Purpose: Unique authorization identifier
```

### Session ID
```
Format: "sess_{timestamp}_{random}"
Algorithm: crypto.randomUUID()
Purpose: Opaque browser session identifier
```

### OAuth State
```
Format: 16-byte random hex
Algorithm: crypto.randomBytes(16).toString('hex')
Purpose: CSRF protection, one-time use
```

---

# EXACT RECORD SCHEMAS

## GoogleAuthorizationRecord
```typescript
interface GoogleAuthorizationRecord {
  id: string; // "auth_{timestamp}_{random}"
  provider: 'google';
  googleSubject: string; // Google account ID
  email: string; // User email
  scopes: string[]; // Granted scopes
  encryptedRefreshToken: string; // AES-256-GCM encrypted
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  lastRefreshAt: string; // ISO timestamp
  lastUsedAt: string; // ISO timestamp
  status: 'active' | 'revoked' | 'expired';
  credentialVersion: number; // For key rotation
}
```

## BrowserSessionRecord
```typescript
interface BrowserSessionRecord {
  id: string; // "sess_{timestamp}_{random}"
  authorizationId: string; // Link to GoogleAuthorizationRecord
  userAgent: string; // Browser identifier
  createdAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp
  lastSeenAt: string; // ISO timestamp
  revokedAt?: string; // ISO timestamp
}
```

## OAuth State Record
```typescript
interface OAuthStateRecord {
  state: string; // 16-byte random hex
  authorizationId?: string; // Optional pre-created authorization ID
  createdAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp
  consumed: boolean; // One-time use flag
}
```

---

# EXACT ENCRYPTION ENVELOPE FORMAT

## AES-256-GCM Encryption Envelope
```typescript
interface EncryptionEnvelope {
  encrypted: string; // Hex-encoded ciphertext
  iv: string; // Hex-encoded initialization vector (16 bytes)
  authTag: string; // Hex-encoded authentication tag (16 bytes)
  keyVersion: number; // Key version for rotation
}
```

## Key Version Handling
```
Version 0: Initial key (ENCRYPTION_KEY)
Version 1+: Rotated keys (ENCRYPTION_KEY_V1, etc.)
```

## ENCRYPTION_KEY Representation
```
Environment variable: ENCRYPTION_KEY
Format: 64-character hex string (32 bytes for AES-256)
Fallback: Generate error if not set
Rotation: Support multiple versions via keyVersion field
```

## Key Rotation Strategy
```
1. Set new ENCRYPTION_KEY_V{N} environment variable
2. Increment active key version in application
3. Decrypt with old key, encrypt with new key
4. Update credentialVersion field
5. Support multiple active key versions during transition
6. Deprecate old key versions after all records migrated
```

---

# EXACT OAUTH STATE LIFECYCLE

## OAuth State Generation
```
Location: /api/drive/oauth/authorize
1. Generate 16-byte random hex (crypto.randomBytes(16).toString('hex'))
2. Create OAuthStateRecord with:
   - state: generated hex
   - createdAt: now
   - expiresAt: now + 5 minutes
   - consumed: false
3. Store in Redis: drive:state:{state} with 5-minute TTL
4. Return state in OAuth URL
```

## OAuth State Storage
```
Redis key: drive:state:{state}
TTL: 5 minutes
Value: OAuthStateRecord (JSON)
```

## OAuth State Consumption
```
Location: /api/drive/oauth/callback
1. Extract state from callback parameters
2. Retrieve OAuthStateRecord from Redis
3. Validate:
   - State exists
   - State not expired
   - State not consumed
4. Mark state as consumed (consumed: true)
5. If validation fails, reject callback with 400
6. If validation succeeds, proceed with token exchange
```

## OAuth State Expiration
```
Automatic: Redis TTL expires after 5 minutes
Manual: Delete state after successful consumption
```

---

# EXACT CALLBACK TRANSACTION ORDER

## BEFORE (Current)
```
1. GET /api/drive/oauth/callback?code=...&state=...
2. Extract code and state
3. Validate error parameter
4. Exchange code for tokens
5. Preserve existing refresh token if not returned
6. Set credentials in cookies via DriveSession
7. Redirect to workbench
```

## AFTER (Specified)
```
1. GET /api/drive/oauth/callback?code=...&state=...
2. Extract code and state
3. Validate error parameter
4. Validate OAuth state:
   - Retrieve state from Redis
   - Check not expired
   - Check not consumed
   - Mark as consumed
5. Exchange code for tokens
6. Preserve existing refresh token if not returned
7. Create or update GoogleAuthorizationRecord:
   - Encrypt refresh token
   - Set metadata
   - Store in Redis KV
8. Create BrowserSessionRecord:
   - Link to authorization
   - Set session metadata
   - Store in Redis KV
9. Set opaque session ID cookie
10. Remove old credential cookies (if migration)
11. Redirect to workbench
```

---

# EXACT MIGRATION ORDER FROM COOKIES

## Migration Trigger
```
Location: /api/drive/oauth/callback
Condition: Old credential cookies exist AND no server-side record exists
```

## Migration Steps
```
1. Detect old credential cookies:
   - drive_access_token
   - drive_refresh_token
   - drive_expiry_date
   - drive_scope

2. Bootstrap GoogleAuthorizationRecord:
   - Generate authorization ID
   - Extract refresh token from cookie
   - Encrypt refresh token
   - Set metadata (email, scopes, etc.)
   - Store in Redis KV

3. Create BrowserSessionRecord:
   - Generate session ID
   - Link to authorization
   - Set session metadata
   - Store in Redis KV

4. Set opaque session ID cookie:
   - drive_session_id (30 days)
   - httpOnly, secure, sameSite=lax

5. Verify persistence:
   - Read back authorization from Redis
   - Verify refresh token decrypts correctly
   - Verify session links correctly

6. Remove old credential cookies:
   - Delete drive_access_token
   - Delete drive_refresh_token
   - Delete drive_expiry_date
   - Delete drive_scope

7. Commit migration:
   - Migration successful, old cookies removed
   - Server-side authority now sole authority
```

## Migration Failure Handling
```
If migration partially fails:
- Step 1-2 fail: Keep old cookies, redirect with error
- Step 3 fail: Keep old cookies, redirect with error
- Step 4 fail: Keep old cookies, redirect with error
- Step 5 fail: Keep old cookies, redirect with error
- Step 6 fail: Keep old cookies, redirect with error
- Step 7 fail: Keep old cookies, redirect with error

No fallback to browser credential cookies indefinitely.
Migration window is one-time bootstrap only.
```

---

# EXACT FAILURE SEMANTICS

## Redis Unavailable
```
Effect: Cannot read/write credentials
Behavior: Return 503, no credential access
Recovery: Retry with exponential backoff
Do NOT destroy local state
Do NOT fallback to cookies
```

## Google Returns No Refresh Token
```
Effect: New authorization doesn't include refresh token
Behavior: Preserve existing refresh token from storage
Credential Version: No change (existing key version)
Do NOT destroy existing authorization
```

## Google Rotates Refresh Token
```
Effect: New refresh token returned in response
Behavior: Replace encrypted refresh token in storage
Credential Version: Can increment if key rotation needed
Update: Update lastRefreshAt, updatedAt, lastUsedAt
Do NOT preserve old refresh token
```

## Invalid Grant
```
Effect: Refresh token invalid/revoked
Behavior: Mark authorization as revoked
Delete authorization record
Delete associated sessions
Clear session cookie
Require reauthorization
Do NOT retry
```

## Concurrent Refreshes
```
Effect: Multiple requests attempt refresh simultaneously
Behavior: Single-flight protection via Redis lock
Lock Key: drive:refresh:lock:{authorizationId}
Lock TTL: 1 minute
First request: Acquires lock, performs refresh
Subsequent requests: Wait for lock, reuse result
Do NOT allow multiple simultaneous refreshes
```

---

# EXACT INFORMATION BOUNDARIES

## MAY CROSS INTO HPP/PING90
```
Authorization ID (for session tracking)
Session ID (for user identification)
Email (for user account identity)
Google Subject (for account identity)
Authorization status (active/revoked/expired)
Last used timestamp (for activity tracking)
```

## CONSTITUTIONALLY PROHIBITED FROM MEDIA METADATA/PROJECTIONS
```
Refresh token (NEVER)
Access token (NEVER)
Authorization ID (NEVER)
Session ID (NEVER)
Google Subject (NEVER)
OAuth state (NEVER)
Encryption keys (NEVER)
Encrypted credentials (NEVER)
Any credential information (NEVER)
```

## ALLOWED IN LOGS
```
Authorization ID (safe identifier)
Session ID (safe identifier)
Email (safe identifier, for debugging)
Event types (safe metadata)
Error codes (safe classification)
Timestamps (safe metadata)
```

## PROHIBITED IN LOGS
```
Refresh token (NEVER)
Access token (NEVER)
OAuth state raw value (NEVER)
Encryption keys (NEVER)
Encrypted credentials (NEVER)
Credential payloads (NEVER)
```

---

# EXACT DEPLOYMENT PERSISTENCE TESTS

## Test 1: Authorization Survives Deployment
```
1. Authenticate with Google Drive
2. Record authorization ID and session ID
3. Deploy new Vercel revision
4. Reopen workbench
5. Verify session ID still valid
6. Verify authorization still active
7. Verify Drive operation succeeds
8. Verify no Google consent required
```

## Test 2: Access Token Expiry/Refresh
```
1. Wait for access token expiry (or force expiry)
2. Trigger Drive operation
3. Verify automatic refresh succeeds
4. Verify new access token stored
5. Verify authorization remains active
6. Verify Drive operation succeeds
```

## Test 3: Rollback Behavior
```
1. Authenticate with Google Drive
2. Record authorization ID and session ID
3. Deploy new Vercel revision
4. Rollback to previous revision
5. Verify session ID still valid
6. Verify authorization still active
7. Verify Drive operation succeeds
8. Verify no Google consent required
```

## Test 4: Revoked Token Behavior
```
1. Authenticate with Google Drive
2. Record authorization ID
3. Revoke authorization in Google Console
4. Trigger Drive operation
5. Verify authorization marked as revoked
6. Verify session cleared
7. Verify reauthorization required
8. Verify Google consent required
```

## Test 5: Cookie Migration
```
1. Authenticate with Google Drive (old cookie system)
2. Record old cookie values
3. Trigger OAuth callback (migration trigger)
4. Verify server-side record created
5. Verify opaque session cookie set
6. Verify old credential cookies removed
7. Verify Drive operation succeeds
8. Verify no Google consent required
```

---

# LOCKED IMPLEMENTATION ORDER

## Phase 1: OAuth State Manager
**File:** `website/src/lib/drive/oauth-state-manager.ts`
**Dependencies:** None
**Tests:** State generation, storage, consumption, expiration

## Phase 2: Encryption Primitive
**File:** `website/src/lib/drive/encryption.ts`
**Dependencies:** None
**Tests:** Encryption, decryption, key version handling

## Phase 3: Credential Repository
**File:** `website/src/lib/drive/oauth-credential-store.ts`
**Dependencies:** Phase 2 (encryption)
**Tests:** CRUD operations, encryption, validation

## Phase 4: Session Repository
**File:** `website/src/lib/drive/session-store.ts`
**Dependencies:** Phase 3 (credential repository)
**Tests:** CRUD operations, validation, expiration

## Phase 5: DriveSession Adapter
**File:** `website/src/lib/drive/drive-session.ts` (modified)
**Dependencies:** Phase 3 (credential repository), Phase 4 (session repository)
**Tests:** Adapter contract, migration logic

## Phase 6: OAuth Callback Migration
**File:** `website/src/app/api/drive/oauth/callback/route.ts` (modified)
**Dependencies:** Phase 1 (state manager), Phase 3 (credential repository), Phase 4 (session repository), Phase 5 (DriveSession adapter)
**Tests:** Callback with state validation, migration, rollback

## Phase 7: Refresh Single-Flight
**File:** `website/src/lib/drive/oauth-manager.ts` (modified)
**Dependencies:** Phase 3 (credential repository)
**Tests:** Concurrent refresh protection, lock acquisition, retry logic

## Phase 8: Deployment Verification
**File:** Manual verification
**Dependencies:** All previous phases
**Tests:** 5 deployment persistence tests

---

# BOOTSTRAP WINDOW CONSTRAINT

## Migration Bootstrap Window
```
Trigger: First OAuth callback after deployment of new system
Duration: One-time bootstrap per authorization
Fallback: If migration fails, keep old cookies and error
No Fallback: Do NOT preserve fallback to browser credential cookies indefinitely
Sole Authority: Server-side authorization becomes sole authority after successful migration
```

---

# STATUS

**P0-1 AUTHORITY BOUNDARY SPECIFICATION COMPLETE**
**Git SHA:** db6a0b3
**Evidence:** Actual code analysis + exact contracts + exact implementation order
**Next:** CEO approval before implementation

**CEO Standard:** Evidence → Architecture → Specification → Approval → Surgical Implementation → Commit → Deploy → Verify → Evidence
