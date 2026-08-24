# OAuth Authority Adversarial Audit

**Date:** 2025-01-XX
**Commit:** 9a8553a
**Scope:** Drive OAuth authority, token refresh, client lifecycle

## Executive Summary

This audit traces the actual OAuth flow through the codebase to verify the authority path. The audit is **statically supported** but **unproven** at runtime because Redis credentials are unavailable locally and CI execution evidence has not been obtained.

## 1. OAuth Flow Trace

### 1.1 Authorize → State Creation

**Source:** `website/src/app/api/drive/oauth/authorize/route.ts`

**Implementation:**
```typescript
const state = await createState(); // Line 50
```

**Caller:** GET request to `/api/drive/oauth/authorize`

**Test:** `oauth-state-concurrency.test.ts` (BLOCKED by Redis), `oauth-browser-binding.test.ts` (BLOCKED by Redis)

**Runtime evidence:** UNPROVEN - requires Redis

**Finding:** The `createState()` call does not pass a `cookieStore` parameter. This means it will fall back to calling `cookies()` from `oauth-state-manager.ts`:

```typescript
const actualCookieStore = cookieStore || await cookies();
```

Since this is a Next.js API route handler with `export const dynamic = 'force-dynamic'`, the `cookies()` call is within request scope and should work correctly.

**Verdict:** STATICALLY SUPPORTED

---

### 1.2 State → Google Redirect

**Source:** `website/src/app/api/drive/oauth/authorize/route.ts`

**Implementation:**
```typescript
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.append('state', state);
// ... other params
return NextResponse.redirect(authUrl.toString());
```

**Caller:** The authorize route

**Test:** No direct test for redirect URL construction

**Runtime evidence:** UNPROVEN

**Redirect validation:** The route validates the redirect URI:
- Must be localhost (127.0.0.1) OR HTTPS
- Path must be `/api/drive/oauth/callback`

**Finding:** Redirect URI validation is present and correct.

**Verdict:** STATICALLY SUPPORTED

---

### 1.3 Google → Callback

**Source:** `website/src/app/api/drive/oauth/callback/route.ts`

**Implementation:**
```typescript
const state = searchParams.get('state');
const stateConsumed = await consumeState(state);
if (!stateConsumed) {
  // Redirect to workbench
}
```

**Caller:** Google OAuth redirect after user consent

**Test:** `oauth-state-concurrency.test.ts` (BLOCKED by Redis)

**Runtime evidence:** UNPROVEN

**Finding:** State consumption is atomic (Redis Lua script). State is consumed exactly once. If consumption fails, flow redirects to workbench without proceeding.

**Verdict:** STATICALLY SUPPORTED

---

### 1.4 Callback → Identity Extraction

**Source:** `website/src/app/api/drive/oauth/callback/route.ts`

**Implementation:**
```typescript
const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
  headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
});
const userInfo = await userInfoResponse.json();
googleSubject = userInfo.sub;
email = userInfo.email || `user-${googleSubject}@gmail.com`;
```

**Caller:** After token exchange succeeds

**Test:** No direct test for identity extraction

**Runtime evidence:** UNPROVEN

**Finding:** Identity is extracted from Google's userinfo endpoint using the access token. Falls back to hash-based subject if extraction fails.

**Verdict:** STATICALLY SUPPORTED

---

### 1.5 Identity → Authorization Persistence

**Source:** `website/src/app/api/drive/oauth/callback/route.ts`

**Implementation:**
```typescript
const authorization = await upsertAuthorization(
  googleSubject,
  email,
  tokenData.scope ? tokenData.scope.split(' ') : [],
  tokenData.access_token,
  expiryDate,
  tokenData.refresh_token || ''
);
```

**Caller:** After identity extraction

**Test:** `oauth-atomic-identity.test.ts` (BLOCKED by Redis)

**Runtime evidence:** UNPROVEN

**Finding:** Authorization is persisted through `oauth-credential-store.ts` using atomic Redis operations. Identity (subject) is the primary key, ensuring one authorization per Google identity.

**Verdict:** STATICALLY SUPPORTED

---

### 1.6 Authorization → Session Creation

**Source:** `website/src/app/api/drive/oauth/callback/route.ts`

**Implementation:**
```typescript
const session = await createSession(authorization.id, userAgent);
```

**Caller:** After authorization persistence

**Test:** No direct session creation test in OAuth test suite

**Runtime evidence:** UNPROVEN

**Finding:** Session is created with explicit `authorizationId` binding.

**Verdict:** STATICALLY SUPPORTED

---

### 1.7 Session → Session Cookie

**Source:** `website/src/app/api/drive/oauth/callback/route.ts`

**Implementation:**
```typescript
cookieStore.set('drive_session_id', session.id, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 30, // 30 days
  path: '/',
});
```

**Caller:** After session creation

**Test:** No direct cookie test

**Runtime evidence:** UNPROVEN

**Finding:** Opaque session ID is issued as HTTP-only cookie. Legacy OAuth credential cookies are deleted.

**Verdict:** STATICALLY SUPPORTED

---

## 2. Token Refresh Audit

### 2.1 Refresh Callback Location

**Source:** `website/src/lib/drive/oauth-manager.ts`

**Implementation:**
```typescript
oauth2Client.on('tokens', async (tokens: any) => {
  // AuthorizationId is explicitly passed, no need to call cookies()
  const authorization = await getAuthorization(authorizationId);
  // ... update authorization
});
```

**Finding:** Token refresh callback receives `authorizationId` as a closure variable from `createOAuthClient()`. The callback does NOT call `cookies()`.

**Verdict:** STATICALLY SUPPORTED - No background cookie access

---

### 2.2 Authorization Identity Stability

**Source:** `website/src/lib/drive/oauth-manager.ts`

**Implementation:**
```typescript
export async function createOAuthClient(credentials: DriveCredentials, authorizationId: string): Promise<...>
```

**Finding:** `authorizationId` is passed explicitly as a parameter. It is not derived from cookies in the callback.

**Verdict:** STATICALLY SUPPORTED

---

### 2.3 User A / User B Isolation

**Source:** `website/src/lib/drive/oauth-manager.ts`

**Implementation:**
```typescript
const authorization = await getAuthorization(authorizationId);
if (authorization && authorization.status === 'active') {
  await updateAuthorizationAfterRefresh(authorization.id, ...);
}
```

**Finding:** Refresh updates the authorization record identified by `authorizationId`. A refresh for User A cannot update User B because they have different authorization IDs.

**Verdict:** STATICALLY SUPPORTED

---

### 2.4 Concurrent Refresh Tests

**Finding:** No concurrent refresh tests exist in the OAuth test suite.

**Verdict:** UNPROVEN

---

### 2.5 Refresh with/without refresh_token

**Finding:** No explicit tests for behavior when `refresh_token` is missing vs present.

**Verdict:** UNPROVEN

---

### 2.6 Permanent vs Transient Failure Classification

**Source:** `website/src/lib/drive/oauth-manager.ts`

**Implementation:**
```typescript
const isPermanentFailure = errorMessage.includes('invalid_grant') || 
                            errorMessage.includes('revoked') ||
                            errorMessage.includes('Token has been revoked');

if (isPermanentFailure) {
  await revokeAuthorizationWithSessions(effectiveAuthorizationId);
  // ... clear session cookie
  throw new Error('OAuth authorization failed. Please re-authenticate with Google Drive.');
} else {
  throw new Error(`Token refresh failed (transient) for authorization ${effectiveAuthorizationId}: ${errorMessage}`);
}
```

**Finding:** Permanent failures trigger authoritative revocation. Transient failures are explicit but do not revoke.

**Verdict:** STATICALLY SUPPORTED

---

## 3. OAuth Client Lifecycle Audit

### 3.1 Singleton Pattern Removal

**Source:** Multiple files

**Evidence:**
- `oauth-manager.ts` line 8: "Removed singleton pattern (no process-level state)"
- `drive-session.ts` line 45: "Singleton removed - per-request instance creation"
- `drive-discovery.ts` line 43: "Singleton removed - per-request instance creation"

**Finding:** Process-global singleton patterns have been removed.

**Verdict:** STATICALLY SUPPORTED

---

### 3.2 Per-Request Client Creation

**Source:** `website/src/lib/drive/oauth-manager.ts`

**Implementation:**
```typescript
export async function createOAuthClient(credentials: DriveCredentials, authorizationId: string): Promise<...>
export async function getOAuthClient(authorizationId?: string): Promise<...>
```

**Finding:** OAuth clients are created per request with explicit `authorizationId` parameter.

**Verdict:** STATICALLY SUPPORTED

---

### 3.3 Process-Level State Search

**Search pattern:** `singleton|getInstance|static instance`

**Results:**
- 3 matches found, all in comments indicating removal of singleton pattern
- No actual singleton implementations found

**Verdict:** STATICALLY SUPPORTED

---

### 3.4 setCredentials Usage

**Search pattern:** `setCredentials`

**Results:**
- 9 matches in `oauth-manager.ts` (legitimate per-request usage)
- 2 matches in `drive-session.ts` (NO-OP with forensic logging)

**Finding:** All `setCredentials` calls are either legitimate per-request OAuth client initialization or explicit NO-OP with logging.

**Verdict:** STATICALLY SUPPORTED

---

## 4. Race Handling

### 4.1 State Consumption Race

**Source:** `website/src/lib/drive/oauth-state-manager.ts`

**Implementation:** Redis Lua script for atomic state consumption

**Test:** `oauth-state-concurrency.test.ts` (BLOCKED by Redis)

**Runtime evidence:** UNPROVEN

**Verdict:** STATICALLY SUPPORTED

---

### 4.2 Identity Acquisition Race

**Source:** `website/src/lib/drive/oauth-credential-store.ts`

**Implementation:** Atomic Redis operations for `upsertAuthorization`

**Test:** `oauth-atomic-identity.test.ts` (BLOCKED by Redis)

**Runtime evidence:** UNPROVEN

**Verdict:** STATICALLY SUPPORTED

---

### 4.3 Revocation Race

**Source:** `website/src/lib/drive/oauth-credential-store.ts`

**Implementation:** Atomic Redis Lua script for `revokeAuthorizationWithSessions`

**Test:** `oauth-authority-revocation.test.ts` (BLOCKED by Redis)

**Runtime evidence:** UNPROVEN

**Verdict:** STATICALLY SUPPORTED

---

## 5. TTL Behavior

**Finding:** TTL is configured in Redis for state, authorization, and session records. No explicit TTL expiry tests exist.

**Verdict:** UNPROVEN

---

## 6. Revocation Barriers

**Source:** `website/src/lib/drive/oauth-credential-store.ts`

**Implementation:** Atomic revocation of authorization and all associated sessions in a single Redis Lua transaction.

**Test:** `oauth-authority-revocation.test.ts` (BLOCKED by Redis)

**Runtime evidence:** UNPROVEN

**Verdict:** STATICALLY SUPPORTED

---

## 7. Scope and Redirect Validation

### 7.1 Scope Restriction

**Source:** `website/src/app/api/drive/oauth/authorize/route.ts`

**Implementation:**
```typescript
const scopes = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
];
```

**Finding:** Only read-only Drive scopes are requested.

**Verdict:** STATICALLY SUPPORTED

---

### 7.2 Redirect Validation

**Source:** `website/src/app/api/drive/oauth/authorize/route.ts`

**Implementation:**
```typescript
const isLocalhost = redirectUriUrl.hostname === 'localhost' || redirectUriUrl.hostname === '127.0.0.1';
const isHttps = redirectUriUrl.protocol === 'https:';
const expectedPath = '/api/drive/oauth/callback';
const hasExpectedPath = redirectUriUrl.pathname === expectedPath;

if (!isLocalhost && !isHttps) {
  return NextResponse.json({ error: 'Invalid redirect URI: non-localhost must use HTTPS' }, { status: 500 });
}
if (!hasExpectedPath) {
  return NextResponse.json({ error: 'Invalid redirect URI: path must be /api/drive/oauth/callback' }, { status: 500 });
}
```

**Finding:** Redirect URI validation is present and correct.

**Verdict:** STATICALLY SUPPORTED

---

## 8. Origin Validation

**Source:** `website/src/app/api/drive/oauth/callback/route.ts`

**Implementation:**
```typescript
const origin = request.headers.get('origin');
const referer = request.headers.get('referer');
const expectedOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

const isSameOrigin = origin === expectedOrigin;
const isFromGoogle = referer?.startsWith('https://accounts.google.com/');

if (!isSameOrigin && !isFromGoogle) {
  return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
}
```

**Finding:** Origin validation allows callbacks from same origin or from Google OAuth.

**Verdict:** STATICALLY SUPPORTED

---

## 9. Legacy Credential Cookie Cleanup

**Source:** `website/src/app/api/drive/oauth/callback/route.ts`

**Implementation:**
```typescript
cookieStore.delete('drive_access_token');
cookieStore.delete('drive_refresh_token');
cookieStore.delete('drive_expiry_date');
cookieStore.delete('drive_scope');
```

**Finding:** Legacy OAuth credential cookies are deleted after successful callback.

**Verdict:** STATICALLY SUPPORTED

---

## 10. Credential Resolution Path

### 10.1 Drive API Routes Credential Resolution

**Routes audited:**
- `/api/drive/auth/status` → `driveSession.getCredentials()` → `getSession()` → `getAuthorization()` → decrypted credentials
- `/api/drive/discovery` → `driveDiscovery.discoverStructure()` → `getDriveClient()` → `getOAuthClient()` → `getAuthorization()` → decrypted credentials
- `/api/drive/files` → `driveDiscovery.listChildren()` → `getDriveClient()` → `getOAuthClient()` → `getAuthorization()` → decrypted credentials
- `/api/drive/ingest` → `driveDiscovery.getFile()` → `driveDiscovery.downloadFile()` → both use `getDriveClient()` → authoritative path

**Finding:** All Drive API routes resolve credentials through the authoritative session → authorization → credential path. No route reads legacy credential cookies directly.

**Verdict:** STATICALLY SUPPORTED

---

## 11. Security Invariant: Legacy Cookie Isolation

**Search pattern:** `drive_access_token|drive_refresh_token|drive_expiry_date|drive_scope`

**Results:**
- 4 matches in `drive-session.ts` (deletion in `clearCredentials()`)
- 4 matches in `callback/route.ts` (deletion after successful OAuth)

**Finding:** Legacy credential cookies are only deleted, never read. No Drive API route reads these cookies.

**Verdict:** STATICALLY SUPPORTED

---

## Summary Table

| Invariant | Source | Caller | Test | Runtime | Verdict |
|---|---|---|---|---|---|
| State creation | oauth-state-manager.ts | authorize/route.ts | oauth-state-concurrency.test.ts | UNPROVEN (Redis) | STATICALLY SUPPORTED |
| Browser binding | oauth-state-manager.ts | authorize/route.ts | oauth-browser-binding.test.ts | UNPROVEN (Redis) | STATICALLY SUPPORTED |
| Identity uniqueness | oauth-credential-store.ts | callback/route.ts | oauth-atomic-identity.test.ts | UNPROVEN (Redis) | STATICALLY SUPPORTED |
| Authorization persistence | oauth-credential-store.ts | callback/route.ts | oauth-atomic-identity.test.ts | UNPROVEN (Redis) | STATICALLY SUPPORTED |
| Session creation | session-store.ts | callback/route.ts | NO TEST | UNPROVEN | STATICALLY SUPPORTED |
| Credential secrecy | oauth-credential-store.ts | oauth-manager.ts | NO TEST | UNPROVEN | STATICALLY SUPPORTED |
| Refresh (no cookies) | oauth-manager.ts | googleapis | NO TEST | UNPROVEN | STATICALLY SUPPORTED |
| Refresh identity isolation | oauth-manager.ts | googleapis | NO TEST | UNPROVEN | STATICALLY SUPPORTED |
| Revocation | oauth-credential-store.ts | callback/route.ts, oauth-manager.ts | oauth-authority-revocation.test.ts | UNPROVEN (Redis) | STATICALLY SUPPORTED |
| TTL | Redis config | oauth-state-manager.ts, oauth-credential-store.ts, session-store.ts | NO TEST | UNPROVEN | STATICALLY SUPPORTED |
| Redirect validation | authorize/route.ts | authorize/route.ts | NO TEST | UNPROVEN | STATICALLY SUPPORTED |
| Scope restriction | authorize/route.ts | authorize/route.ts | NO TEST | UNPROVEN | STATICALLY SUPPORTED |
| Legacy isolation | drive-session.ts, callback/route.ts | clearCredentials, callback | NO TEST | UNPROVEN | STATICALLY SUPPORTED |
| Request isolation | oauth-manager.ts | All Drive routes | NO TEST | UNPROVEN | STATICALLY SUPPORTED |
| Drive discovery | drive-discovery.ts | discovery/route.ts | NO TEST | UNPROVEN | STATICALLY SUPPORTED |
| Shared Drive | drive-discovery.ts | discovery/route.ts, files/route.ts | NO TEST | UNPROVEN | STATICALLY SUPPORTED |
| Media provenance | ingest/route.ts | ingest/route.ts | NO TEST | UNPROVEN | STATICALLY SUPPORTED |

---

## Required Runtime Evidence

All invariants are **STATICALLY SUPPORTED** but **UNPROVEN** at runtime. The following evidence is required:

1. **Redis-backed OAuth tests** in CI environment with actual Redis credentials:
   - oauth-state-concurrency.test.ts
   - oauth-browser-binding.test.ts
   - oauth-atomic-identity.test.ts
   - oauth-authority-revocation.test.ts

2. **End-to-end OAuth flow** with real Google credentials:
   - authorize → Google consent → callback → session → auth status
   - Drive discovery → file listing → ingestion → provenance

3. **Sharp-edge runtime tests**:
   - Concurrent refresh behavior
   - TTL expiry behavior
   - Revocation from revoked session
   - User A/User B isolation

4. **Negative security test**:
   - Request with legacy credential cookies but no session → must fail
   - Request with session from revoked authorization → must fail

---

## Conclusion

The OAuth authority implementation is **architecturally sound** based on static analysis. All critical invariants have code-level support. However, **no invariant is PROVEN** because:

- Redis credentials are unavailable locally
- CI has been configured but actual execution results have not been obtained
- No end-to-end runtime evidence exists

The finish line remains: **a functioning Drive → authority → session → Drive API → Media Workbench path that can actually be used.**
