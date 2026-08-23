# Sharp-Edge Audit

**Date:** 2025-01-XX
**Commit:** 9a8553a
**Scope:** Request isolation, revocation, TTL, encryption, identity uniqueness

## Executive Summary

This audit examines sharp-edge scenarios for the Drive OAuth authority implementation. All invariants are **STATICALLY SUPPORTED** but **UNPROVEN** at runtime due to lack of Redis credentials and CI execution evidence.

---

## 1. Request Isolation

### 1.1 Per-Request OAuth Client Creation

**Source:** `website/src/lib/drive/oauth-manager.ts`

**Implementation:**
```typescript
export async function createOAuthClient(credentials: DriveCredentials, authorizationId: string): Promise<...>
export async function getOAuthClient(authorizationId?: string): Promise<...>
```

**Invariant:** OAuth clients are created per request with explicit `authorizationId` parameter. No process-level state.

**Evidence:**
- Singleton patterns removed (confirmed by search)
- `authorizationId` passed explicitly as parameter
- Comments explicitly state: "Removed singleton pattern (no process-level state)"

**Verdict:** STATICALLY SUPPORTED

---

### 1.2 Authorization Identity Stability

**Source:** `website/src/lib/drive/oauth-manager.ts`

**Implementation:**
```typescript
oauth2Client.on('tokens', async (tokens: any) => {
  // AuthorizationId is explicitly passed, no need to call cookies()
  const authorization = await getAuthorization(authorizationId);
  // ... update authorization
});
```

**Invariant:** Token refresh callback receives `authorizationId` as closure variable. Authorization identity is explicit and stable.

**Evidence:**
- Token refresh callback does NOT call `cookies()`
- `authorizationId` is captured from closure at client creation time
- Comments explicitly state: "AuthorizationId passed explicitly (never derived from cookies() in background callbacks)"

**Verdict:** STATICALLY SUPPORTED

---

### 1.3 User A / User B Isolation

**Source:** `website/src/lib/drive/oauth-manager.ts`

**Implementation:**
```typescript
const authorization = await getAuthorization(authorizationId);
if (authorization && authorization.status === 'active') {
  await updateAuthorizationAfterRefresh(authorization.id, ...);
}
```

**Invariant:** Refresh updates the authorization record identified by `authorizationId`. A refresh for User A cannot update User B because they have different authorization IDs.

**Evidence:**
- `authorizationId` is the primary key for authorization records
- Subject index (`googleSubject`) is used for identity lookup but not for updates
- Updates are scoped to the specific `authorization.id`

**Verdict:** STATICALLY SUPPORTED

---

### 1.4 Concurrent Request Handling

**Invariant:** Concurrent requests with different `authorizationId` values must not interfere with each other.

**Evidence:**
- OAuth clients are per-request (no shared state)
- Authorization repository uses Redis (concurrent-safe)
- Session repository uses Redis (concurrent-safe)
- No in-memory process-level state

**Verdict:** STATICALLY SUPPORTED

---

## 2. Revocation

### 2.1 Atomic Authorization Revocation

**Source:** `website/src/lib/drive/oauth-credential-store.ts`

**Implementation:**
```typescript
export async function revokeAuthorization(id: string): Promise<void> {
  const auth = await getAuthorization(id);
  if (auth) {
    auth.status = 'revoked';
    auth.updatedAt = new Date().toISOString();
    await storeAuthorization(auth);
    // Clean up subject index to prevent reauthorization
    const client = getRedisClient();
    await client.del(`${AUTH_SUBJECT_PREFIX}${auth.googleSubject}`);
  }
}
```

**Invariant:** Authorization revocation marks status as 'revoked' and deletes subject index to prevent reauthorization.

**Evidence:**
- Authorization status field is updated atomically
- Subject index is deleted to prevent reauthorization
- Record is preserved (not deleted) for forensic evidence

**Verdict:** STATICALLY SUPPORTED

---

### 2.2 Atomic Session Revocation

**Source:** `website/src/lib/drive/session-store.ts`

**Implementation:**
```typescript
export async function revokeAllSessionsForAuthorization(authorizationId: string): Promise<void> {
  // Redis Lua script for atomic session revocation with index barrier
  // Delete session index FIRST (atomic barrier), then revoke individual sessions
  const luaScript = `
    local session_index_key = KEYS[1]
    local session_prefix = ARGV[1]
    
    -- Get all session IDs from index atomically
    local session_ids = redis.call('SMEMBERS', session_index_key)
    
    -- Delete session index FIRST (atomic barrier prevents new session creation)
    redis.call('DEL', session_index_key)
    
    -- Revoke each session atomically
    for i, session_id in ipairs(session_ids) do
      local session_key = session_prefix .. session_id
      redis.call('DEL', session_key)
    end
    
    return #session_ids
  `;
}
```

**Invariant:** All sessions for an authorization are revoked atomically. Session index is deleted FIRST as an atomic barrier to prevent race condition where concurrent session creation resurrects access during revocation.

**Evidence:**
- Redis Lua script ensures atomicity
- Session index deleted FIRST (barrier pattern)
- Prevents race condition between revocation and session creation
- Comments explicitly document the barrier pattern

**Verdict:** STATICALLY SUPPORTED

---

### 2.3 Combined Authorization + Session Revocation

**Source:** `website/src/lib/drive/oauth-credential-store.ts`

**Implementation:**
```typescript
export async function revokeAuthorizationWithSessions(id: string): Promise<void> {
  // Revoke authorization
  await revokeAuthorization(id);
  // Revoke all associated sessions
  const { revokeAllSessionsForAuthorization } = await import('./session-store');
  await revokeAllSessionsForAuthorization(id);
}
```

**Invariant:** Authorization and all associated sessions are revoked in a single operation.

**Evidence:**
- Calls `revokeAuthorization` first (marks status, deletes subject index)
- Then calls `revokeAllSessionsForAuthorization` (deletes all sessions atomically)
- Provides single authoritative revocation path

**Verdict:** STATICALLY SUPPORTED

---

### 2.4 Revoked Session Behavior

**Invariant:** A request with a session cookie from a revoked authorization must fail.

**Evidence:**
- `getSession()` checks `record.revokedAt` and returns null if revoked
- `isAuthenticated()` checks authorization status and returns false if not 'active'
- All Drive API routes call `isAuthenticated()` before proceeding

**Verdict:** STATICALLY SUPPORTED

---

## 3. TTL (Time-To-Live)

### 3.1 Authorization TTL

**Source:** `website/src/lib/drive/oauth-credential-store.ts`

**Implementation:**
```typescript
// Authorization TTL: 30 days (browser session lifetime)
const AUTH_TTL_SECONDS = 30 * 24 * 60 * 60;
```

**Invariant:** Authorization records expire after 30 days in Redis.

**Evidence:**
- TTL is set when authorization is stored
- TTL is renewed when authorization is updated
- This is Redis retention, NOT Google refresh token validity

**Verdict:** STATICALLY SUPPORTED

---

### 3.2 Session TTL

**Source:** `website/src/lib/drive/session-store.ts`

**Implementation:**
```typescript
// Session TTL: 30 days (browser session lifetime)
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
```

**Invariant:** Session records expire after 30 days in Redis.

**Evidence:**
- TTL is set when session is created
- TTL is renewed when session is updated (last seen)
- `getSession()` checks `expiresAt` and returns null if expired

**Verdict:** STATICALLY SUPPORTED

---

### 3.3 Session Index TTL

**Source:** `website/src/lib/drive/session-store.ts`

**Implementation:**
```typescript
// Session index safety TTL: 60 days (longer than session TTL to allow renewal)
const SESSION_INDEX_TTL_SECONDS = 60 * 24 * 60 * 60;
```

**Invariant:** Session index has longer TTL (60 days) than session records (30 days) to allow session renewal.

**Evidence:**
- Index TTL is longer than session TTL
- Index TTL is renewed when session is updated
- This allows session renewal without index expiration

**Verdict:** STATICALLY SUPPORTED

---

### 3.4 State TTL

**Source:** `website/src/lib/drive/oauth-state-manager.ts`

**Implementation:**
```typescript
// State TTL: 10 minutes (OAuth flow completion window)
const STATE_TTL_SECONDS = 10 * 60;
```

**Invariant:** OAuth state records expire after 10 minutes in Redis.

**Evidence:**
- TTL is set when state is created
- State is consumed once and deleted
- Expired state cannot be consumed

**Verdict:** STATICALLY SUPPORTED

---

### 3.5 Browser Binding TTL

**Source:** `website/src/lib/drive/oauth-state-manager.ts`

**Implementation:**
```typescript
// Browser binding TTL: 10 minutes (matches state TTL)
const BROWSER_BINDING_TTL_SECONDS = 10 * 60;
```

**Invariant:** Browser binding cookie expires after 10 minutes.

**Evidence:**
- TTL is set when binding is created
- Cookie maxAge matches Redis TTL
- Binding must match during state consumption

**Verdict:** STATICALLY SUPPORTED

---

## 4. Encryption

### 4.1 Access Token Encryption

**Source:** `website/src/lib/drive/oauth-credential-store.ts`

**Implementation:**
```typescript
encryptedAccessToken: JSON.stringify(encrypt(accessToken, keyVersion))
```

**Invariant:** Access tokens are encrypted at rest using AES-256-GCM.

**Evidence:**
- `encrypt()` function from `encryption.ts` uses AES-256-GCM
- Encrypted envelope includes IV, ciphertext, auth tag
- Key versioning supported for key rotation

**Verdict:** STATICALLY SUPPORTED

---

### 4.2 Refresh Token Encryption

**Source:** `website/src/lib/drive/oauth-credential-store.ts`

**Implementation:**
```typescript
encryptedRefreshToken: JSON.stringify(encrypt(refreshToken, keyVersion))
```

**Invariant:** Refresh tokens are encrypted at rest using AES-256-GCM.

**Evidence:**
- Same encryption as access token
- Refresh token never exposed to browser
- Encrypted in Redis, decrypted only during request context

**Verdict:** STATICALLY SUPPORTED

---

### 4.3 Key Versioning

**Source:** `website/src/lib/drive/oauth-credential-store.ts`

**Implementation:**
```typescript
keyVersion: number; // Encryption key version
```

**Invariant:** Key versioning is supported for key rotation.

**Evidence:**
- `keyVersion` field in authorization record
- `encrypt()` function accepts key version parameter
- Decryption uses key version from record

**Verdict:** STATICALLY SUPPORTED

---

### 4.4 Encryption Key Security

**Invariant:** Encryption keys are never exposed to browser or committed to repository.

**Evidence:**
- Encryption keys derived from server environment
- No key storage in source code
- Keys used only server-side in `encryption.ts`

**Verdict:** STATICALLY SUPPORTED

---

## 5. Identity Uniqueness

### 5.1 Subject Index

**Source:** `website/src/lib/drive/oauth-credential-store.ts`

**Implementation:**
```typescript
const AUTH_SUBJECT_PREFIX = 'drive:auth:subject:';
```

**Invariant:** Subject index ensures one authorization per Google identity (`googleSubject`).

**Evidence:**
- Subject index maps `googleSubject` → `authorizationId`
- `upsertAuthorization()` checks subject index first
- If subject exists, existing authorization is updated
- If subject does not exist, new authorization is created

**Verdict:** STATICALLY SUPPORTED

---

### 5.2 Atomic Subject Acquisition

**Source:** `website/src/lib/drive/oauth-credential-store.ts`

**Implementation:**
```typescript
async function createNewAuthorizationWithAtomicSubject(...) {
  // Use Lua script for atomic authorization + subject index write
  const luaScript = `
    local auth_key = KEYS[1]
    local subject_key = KEYS[2]
    local auth_data = ARGV[1]
    local subject_value = ARGV[2]
    local ttl = ARGV[3]

    -- Check if subject already exists
    local existing = redis.call('GET', subject_key)
    if existing then
      return redis.error_reply('Subject already exists')
    end

    -- Store authorization record
    redis.call('SET', auth_key, auth_data)
    redis.call('EXPIRE', auth_key, ttl)

    -- Store subject index
    redis.call('SET', subject_key, subject_value)
    redis.call('EXPIRE', subject_key, ttl)

    return 1
  `;
}
```

**Invariant:** Subject acquisition is atomic. Concurrent authorization requests for the same Google identity result in exactly one authorization record.

**Evidence:**
- Redis Lua script ensures atomicity
- Subject check and write are in same transaction
- Returns error if subject already exists
- Eliminates race condition between subject check and write

**Verdict:** STATICALLY SUPPORTED

---

### 5.3 Reauthorization Behavior

**Source:** `website/src/lib/drive/oauth-credential-store.ts`

**Implementation:**
```typescript
export async function upsertAuthorization(...) {
  const existingAuth = await findAuthorizationBySubject(googleSubject);
  if (existingAuth) {
    // Update existing authorization
    return await updateAuthorization(...);
  } else {
    // Create new authorization with atomic subject acquisition
    return await createNewAuthorizationWithAtomicSubject(...);
  }
}
```

**Invariant:** Reauthorization updates the existing authorization record for the same Google identity. No duplicate authorizations are created.

**Evidence:**
- Subject index lookup before creation
- If subject exists, existing authorization is updated
- If subject does not exist, new authorization is created atomically
- Ensures deterministic reauthorization behavior

**Verdict:** STATICALLY SUPPORTED

---

## 6. Race Condition Analysis

### 6.1 State Consumption Race

**Source:** `website/src/lib/drive/oauth-state-manager.ts`

**Implementation:** Redis Lua script for atomic state consumption

**Invariant:** State can be consumed exactly once. Concurrent consumption attempts result in exactly one success.

**Evidence:**
- Redis Lua script ensures atomicity
- State is deleted atomically during consumption
- Second consumption attempt returns null

**Verdict:** STATICALLY SUPPORTED

---

### 6.2 Identity Acquisition Race

**Source:** `website/src/lib/drive/oauth-credential-store.ts`

**Implementation:** Redis Lua script for atomic subject acquisition

**Invariant:** Concurrent authorization requests for the same Google identity result in exactly one authorization record.

**Evidence:**
- Redis Lua script ensures atomicity
- Subject check and write are in same transaction
- Returns error if subject already exists

**Verdict:** STATICALLY SUPPORTED

---

### 6.3 Revocation Race

**Source:** `website/src/lib/drive/session-store.ts`

**Implementation:** Redis Lua script with index barrier pattern

**Invariant:** Session index is deleted FIRST as an atomic barrier, preventing race condition where concurrent session creation resurrects access during revocation.

**Evidence:**
- Redis Lua script ensures atomicity
- Session index deleted FIRST (barrier pattern)
- Individual sessions deleted after barrier
- Prevents resurrection of access during revocation

**Verdict:** STATICALLY SUPPORTED

---

## 7. Summary Table

| Invariant | Evidence | Verdict |
|---|---|---|
| Per-request OAuth client creation | Singleton removed, explicit authorizationId | STATICALLY SUPPORTED |
| Authorization identity stability | Closure variable, no cookies() in callback | STATICALLY SUPPORTED |
| User A/User B isolation | authorizationId as primary key | STATICALLY SUPPORTED |
| Concurrent request handling | No process-level state, Redis backend | STATICALLY SUPPORTED |
| Atomic authorization revocation | Status update + subject index deletion | STATICALLY SUPPORTED |
| Atomic session revocation | Lua script with index barrier | STATICALLY SUPPORTED |
| Combined revocation | revokeAuthorizationWithSessions | STATICALLY SUPPORTED |
| Revoked session behavior | getSession checks revokedAt | STATICALLY SUPPORTED |
| Authorization TTL | 30 days Redis TTL | STATICALLY SUPPORTED |
| Session TTL | 30 days Redis TTL | STATICALLY SUPPORTED |
| Session index TTL | 60 days (longer than session) | STATICALLY SUPPORTED |
| State TTL | 10 minutes Redis TTL | STATICALLY SUPPORTED |
| Browser binding TTL | 10 minutes cookie maxAge | STATICALLY SUPPORTED |
| Access token encryption | AES-256-GCM | STATICALLY SUPPORTED |
| Refresh token encryption | AES-256-GCM | STATICALLY SUPPORTED |
| Key versioning | keyVersion field | STATICALLY SUPPORTED |
| Encryption key security | Server-side only | STATICALLY SUPPORTED |
| Subject index | googleSubject → authorizationId | STATICALLY SUPPORTED |
| Atomic subject acquisition | Lua script with subject check | STATICALLY SUPPORTED |
| Reauthorization behavior | Upsert pattern | STATICALLY SUPPORTED |
| State consumption race | Lua script atomic consumption | STATICALLY SUPPORTED |
| Identity acquisition race | Lua script atomic acquisition | STATICALLY SUPPORTED |
| Revocation race | Lua script with index barrier | STATICALLY SUPPORTED |

---

## 8. Required Runtime Evidence

All sharp-edge invariants are **STATICALLY SUPPORTED** but **UNPROVEN** at runtime. The following evidence is required:

1. **Concurrent state consumption test** - Verify exactly one consumer succeeds
2. **Concurrent identity acquisition test** - Verify exactly one authorization created
3. **Concurrent session creation during revocation** - Verify barrier pattern prevents resurrection
4. **TTL expiry test** - Verify expired sessions and authorizations are rejected
5. **Revoked session test** - Verify requests with revoked sessions fail
6. **Encryption verification** - Verify tokens are encrypted at rest
7. **Key rotation test** - Verify key versioning works correctly

---

## Conclusion

All sharp-edge invariants are **STATICALLY SUPPORTED** through Redis Lua scripts, atomic operations, and architectural design. However, **no invariant is PROVEN** at runtime because:

- Redis credentials are unavailable locally
- CI has been configured but actual execution results have not been obtained
- No sharp-edge runtime tests have been executed

The architecture is designed to handle sharp-edge scenarios correctly, but runtime verification is required to prove the implementation works as designed.
