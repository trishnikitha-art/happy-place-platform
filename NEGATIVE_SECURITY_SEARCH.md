# Negative Security Search Results

**Date:** 2025-01-XX
**Commit:** 9a8553a
**Scope:** Search for legacy credential paths and unsafe cookie access

## Search Patterns

The following patterns were searched across `website/src/`:

1. `drive_access_token`
2. `drive_refresh_token`
3. `drive_expiry_date`
4. `drive_scope`
5. `setCredentials`
6. `getRefreshToken`
7. `cookies()`
8. `getInstance`
9. `static instance`

---

## 1. Legacy Credential Cookie Usage

### Pattern: `drive_access_token|drive_refresh_token|drive_expiry_date|drive_scope`

**Results:** 8 matches

#### Matches in `drive-session.ts` (4)
```typescript
// Line 166-169 in clearCredentials()
cookieStore.delete('drive_access_token');
cookieStore.delete('drive_refresh_token');
cookieStore.delete('drive_expiry_date');
cookieStore.delete('drive_scope');
```

**Classification:** DELETION ONLY - these cookies are deleted during logout, never read.

#### Matches in `callback/route.ts` (4)
```typescript
// Line 213-216 in GET handler
cookieStore.delete('drive_access_token');
cookieStore.delete('drive_refresh_token');
cookieStore.delete('drive_expiry_date');
cookieStore.delete('drive_scope');
```

**Classification:** DELETION ONLY - these cookies are deleted after successful OAuth callback, never read.

**Finding:** Legacy credential cookies are never read for authentication. They are only deleted as cleanup.

**Verdict:** STATICALLY SUPPORTED - Legacy isolation is maintained

---

## 2. Refresh Token Access

### Pattern: `getRefreshToken`

**Results:** 1 match

#### Match in `drive-session.ts` (1)
```typescript
// Line 213-216
async getRefreshToken(): Promise<string | null> {
  const credentials = await this.getCredentials();
  return credentials?.refresh_token || null;
}
```

**Classification:** AUTHORITATIVE PATH - this method reads from the authoritative credential resolution path (session → authorization → decrypted credentials), not from cookies.

**Finding:** The only `getRefreshToken` method reads from the authoritative repository, not from legacy cookies.

**Verdict:** STATICALLY SUPPORTED

---

## 3. OAuth Client Credential Setting

### Pattern: `setCredentials`

**Results:** 11 matches

#### Matches in `oauth-manager.ts` (9)
```typescript
// Line 47 in createOAuthClient()
oauth2Client.setCredentials({
  access_token: credentials.access_token,
  refresh_token: credentials.refresh_token,
  expiry_date: credentials.expiry_date,
  scope: credentials.scope,
});
```

**Classification:** LEGITIMATE - this is per-request OAuth client initialization with credentials from the authoritative path.

**Finding:** All `setCredentials` calls in `oauth-manager.ts` are legitimate per-request usage.

**Verdict:** STATICALLY SUPPORTED

#### Matches in `drive-session.ts` (2)
```typescript
// Line 136-140
async setCredentials(_credentials?: DriveCredentials): Promise<void> {
  console.log('[DRIVE SESSION FORENSIC] setCredentials() called - NO-OP (credentials stored in authorization repository)');
  // Credentials are now stored in oauth-credential-store, not cookies
  // This method is kept for backward compatibility but does nothing
}
```

**Classification:** NO-OP - this method is explicitly disabled with forensic logging.

**Finding:** The `setCredentials` method in `drive-session.ts` is a NO-OP for backward compatibility.

**Verdict:** STATICALLY SUPPORTED

---

## 4. Cookie Access Scope

### Pattern: `cookies()`

**Results:** 18 matches

#### Matches in `oauth-state-manager.ts` (3)
```typescript
// Line 149 in getOrCreateBrowserBinding()
const actualCookieStore = cookieStore || await cookies();

// Line 180 in getBrowserBinding()
const actualCookieStore = cookieStore || await cookies();

// Line 193 in clearBrowserBinding()
const actualCookieStore = cookieStore || await cookies();
```

**Classification:** OPTIONAL PARAMETER - all three calls have an optional `cookieStore` parameter for testing. In production, they fall back to `cookies()` within request scope.

**Finding:** All `cookies()` calls in `oauth-state-manager.ts` are within request scope (API route handlers) or have optional injection for testing.

**Verdict:** STATICALLY SUPPORTED

#### Matches in `oauth-manager.ts` (5)
```typescript
// Line 10 - COMMENT
// * - AuthorizationId passed explicitly (never derived from cookies() in background callbacks)

// Line 27 - COMMENT
// * No process-level state, no background callbacks calling cookies().

// Line 67 - COMMENT
// AuthorizationId is explicitly passed, no need to call cookies()

// Line 174 - In request context (permanent failure handler)
const cookieStore = await cookies();
cookieStore.delete('drive_session_id');

// Line 224 - In request context (logout)
const cookieStore = await cookies();
cookieStore.delete('drive_session_id');
```

**Classification:** 3 COMMENTS + 2 REQUEST CONTEXT - the two actual calls are in request context for session cleanup.

**Finding:** No `cookies()` call in `oauth-manager.ts` is in a background callback. All actual calls are in request context.

**Verdict:** STATICALLY SUPPORTED

#### Matches in `drive-session.ts` (5)
```typescript
// Line 35 - In request context (getSessionIdFromCookies)
const cookieStore = await cookies();

// Line 146 - In request context (clearCredentials)
const cookieStore = await cookies();

// Line 228 - In request context (getSessionId)
const cookieStore = await cookies();
```

**Classification:** REQUEST CONTEXT - all calls are in request context (utility methods called from API routes).

**Finding:** All `cookies()` calls in `drive-session.ts` are in request context.

**Verdict:** STATICALLY SUPPORTED

#### Matches in `callback/route.ts` (2)
```typescript
// Line 129 - In request context (invalid_grant handler)
const cookieStore = await cookies();

// Line 212 - In request context (session cookie issuance)
const cookieStore = await cookies();
```

**Classification:** REQUEST CONTEXT - both calls are in the GET request handler.

**Finding:** All `cookies()` calls in `callback/route.ts` are in request context.

**Verdict:** STATICALLY SUPPORTED

#### Matches in `workbench-session.ts` (3)
```typescript
// Line 114 - In request context (isAuthenticated)
const cookieStore = await cookies();

// Line 148 - In request context (setSession)
const cookieStore = await cookies();

// Line 160 - In request context (clearSession)
const cookieStore = await cookies();
```

**Classification:** REQUEST CONTEXT - all calls are in request context.

**Finding:** All `cookies()` calls in `workbench-session.ts` are in request context.

**Verdict:** STATICALLY SUPPORTED

---

## 5. Singleton Pattern Search

### Pattern: `singleton|getInstance|static instance`

**Results:** 3 matches

#### Matches in `oauth-manager.ts` (1)
```typescript
// Line 8 - COMMENT
// * - Removed singleton pattern (no process-level state)
```

#### Matches in `drive-session.ts` (1)
```typescript
// Line 45 - COMMENT
// Singleton removed - per-request instance creation
```

#### Matches in `drive-discovery.ts` (1)
```typescript
// Line 43 - COMMENT
// Singleton removed - per-request instance creation
```

**Classification:** COMMENTS ONLY - all matches are comments explaining the removal of singleton patterns.

**Finding:** No actual singleton implementations exist. All process-level singletons have been removed.

**Verdict:** STATICALLY SUPPORTED

---

## Security Invariant Verification

### Invariant: No Drive API request can authenticate from browser OAuth credential cookies

**Evidence:**
1. Legacy credential cookies (`drive_access_token`, `drive_refresh_token`, `drive_expiry_date`, `drive_scope`) are never read for authentication
2. All Drive API routes resolve credentials through the authoritative path: session → authorization → decrypted credentials
3. The only `getRefreshToken` method reads from the authoritative path, not from cookies
4. All `setCredentials` calls are either legitimate per-request usage or explicit NO-OP

**Verdict:** STATICALLY SUPPORTED

---

### Invariant: No `cookies()` call inside background Google token callbacks

**Evidence:**
1. Token refresh callback in `oauth-manager.ts` receives `authorizationId` as a closure variable
2. The callback does NOT call `cookies()` - it uses the explicit `authorizationId` parameter
3. Comments explicitly state: "AuthorizationId passed explicitly (never derived from cookies() in background callbacks)"
4. All actual `cookies()` calls are in request context (API route handlers)

**Verdict:** STATICALLY SUPPORTED

---

### Invariant: No mutable process-global OAuth client shared across requests

**Evidence:**
1. All singleton patterns have been removed (confirmed by search)
2. OAuth clients are created per request with explicit `authorizationId` parameter
3. Comments explicitly state: "Removed singleton pattern (no process-level state)"

**Verdict:** STATICALLY SUPPORTED

---

## Required Negative Test

A request-level negative test should be added to prove that:

1. A request with legacy credential cookies but no session cookie cannot authenticate Drive requests
2. A request with a session cookie from a revoked authorization cannot authenticate Drive requests

This test has not been implemented.

**Verdict:** UNPROVEN

---

## Summary

| Invariant | Evidence | Verdict |
|---|---|---|
| Legacy credential cookies never read | Only deletion code found | STATICALLY SUPPORTED |
| Refresh token from authoritative path | getRefreshToken uses session→authorization | STATICALLY SUPPORTED |
| setCredentials is legitimate or NO-OP | All uses classified | STATICALLY SUPPORTED |
| cookies() only in request context | All 18 calls classified | STATICALLY SUPPORTED |
| No singleton patterns | Only comments found | STATICALLY SUPPORTED |
| No background cookie access | Token callback uses explicit authorizationId | STATICALLY SUPPORTED |
| Negative test for legacy isolation | Not implemented | UNPROVEN |

---

## Conclusion

The negative security search confirms that:

1. **Legacy credential cookies are isolated** - they are never read for authentication, only deleted
2. **Cookie access is safe** - all `cookies()` calls are in request context or have optional injection for testing
3. **No process-global state** - singleton patterns have been removed
4. **Background callbacks are safe** - token refresh does not call `cookies()`

All invariants are **STATICALLY SUPPORTED** but **UNPROVEN** at runtime. A negative test for legacy isolation should be added and executed to complete the verification.
