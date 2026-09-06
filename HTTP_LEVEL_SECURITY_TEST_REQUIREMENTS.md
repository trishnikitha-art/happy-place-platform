# HTTP-Level Security Test Requirements

**Status:** Placeholder tests require actual HTTP client implementation
**Date:** 2026-09-06

## Current State

The OAuth security boundary integration tests include three placeholder tests that log "requires HTTP client implementation" without actually proving the security invariant at the route boundary:

1. **Legacy Credential Isolation** (`oauth-security-boundaries.integration.test.ts`)
2. **Revoked Session Rejection** (`oauth-security-boundaries.integration.test.ts`)
3. **Cross-Session Isolation** (`oauth-security-boundaries.integration.test.ts`)

These tests currently pass trivially because they only log a message without executing any HTTP requests.

## Security Invariants to Prove

### 1. Legacy Credential Isolation

**Invariant:** Legacy credential cookies without active session must be rejected at the route boundary.

**Test Requirements:**
```typescript
// 1. Create HTTP request with legacy cookies
const request = {
  headers: {
    cookie: 'drive_access_token=legacy-token; drive_refresh_token=legacy-refresh'
  }
};

// 2. NO drive_session_id cookie present

// 3. Call /api/drive/discovery or /api/drive/files

// 4. Expect 401 Unauthorized or 403 Forbidden
expect(response.status).toBe(401);
expect(response.body.error).toBe('Unauthorized');
```

**Implementation Requirements:**
- HTTP client library (e.g., node-fetch, axios, or Next.js API route testing)
- Ability to set arbitrary cookie headers
- Ability to call API routes in test environment
- Test environment must have Redis connectivity

---

### 2. Revoked Session Rejection

**Invariant:** A revoked authorization must reject subsequent Drive requests at the route boundary.

**Test Requirements:**
```typescript
// 1. Create valid authorization via OAuth flow
const authorization = await upsertAuthorization(...);
const session = await createSession(authorization.id);

// 2. Verify session works with Drive API
const validResponse = await driveRequest(session);
expect(validResponse.status).toBe(200);

// 3. Revoke the authorization
await deleteAuthorization(authorization.id);

// 4. Attempt Drive request with same session
const revokedResponse = await driveRequest(session);

// 5. Expect 401 Unauthorized or 403 Forbidden
expect(revokedResponse.status).toBe(401);
expect(revokedResponse.body.error).toMatch(/unauthorized|session.*invalid/i);
```

**Implementation Requirements:**
- HTTP client library
- Ability to drive full OAuth flow in tests
- Test environment must have Redis connectivity
- Test environment must have Google OAuth credentials (or mock)

---

### 3. Cross-Session Isolation

**Invariant:** Session A cannot use Authorization B at the route boundary.

**Test Requirements:**
```typescript
// 1. Create Authorization A and Session A
const authA = await upsertAuthorization('subject-a', 'user-a@example.com', ...);
const sessionA = await createSession(authA.id);

// 2. Create Authorization B and Session B
const authB = await upsertAuthorization('subject-b', 'user-b@example.com', ...);
const sessionB = await createSession(authB.id);

// 3. Verify each session works with its own authorization
const responseA = await driveRequest(sessionA);
const responseB = await driveRequest(sessionB);
expect(responseA.status).toBe(200);
expect(responseB.status).toBe(200);

// 4. Attempt cross-session attack: Session A with Authorization B
// This requires tampering with session data or cookie manipulation
const crossSessionRequest = {
  headers: {
    cookie: `drive_session_id=${sessionA.id}` // But somehow pointing to authB
  }
};

// 5. Expect 401 Unauthorized or 403 Forbidden
expect(crossSessionResponse.status).toBe(401);
```

**Implementation Requirements:**
- HTTP client library
- Ability to manipulate session cookies
- Test environment must have Redis connectivity
- Understanding of session-authorization binding mechanism

---

## Implementation Options

### Option 1: Next.js API Route Testing Library
Use `@jest/next` or similar library to test API routes directly without HTTP overhead.

**Pros:**
- No HTTP client dependency
- Faster execution
- Direct access to request/response objects

**Cons:**
- May not exercise actual middleware
- May not exercise actual cookie parsing
- Tests route handlers in isolation

### Option 2: HTTP Client Library
Use `node-fetch`, `axios`, or `supertest` to make actual HTTP requests.

**Pros:**
- Tests full HTTP stack
- Exercises middleware
- Exercises cookie parsing
- More realistic production simulation

**Cons:**
- Requires HTTP client dependency
- Slower execution
- Requires test server to be running

### Option 3: Next.js Integration Testing
Use Next.js built-in integration testing capabilities.

**Pros:**
- Official Next.js testing approach
- Designed for API route testing
- Good documentation

**Cons:**
- May require Next.js version compatibility
- Learning curve for team

---

## Recommended Implementation Path

**Phase 1: Choose Testing Library**
- Evaluate `supertest` (popular, well-maintained)
- Evaluate `@jest/next` (official Next.js approach)
- Evaluate custom HTTP client with `node-fetch`

**Phase 2: Implement Test Infrastructure**
- Create test helper for authenticated requests
- Create test helper for cookie manipulation
- Set up test environment with Redis
- Ensure test isolation (unique test namespaces)

**Phase 3: Implement Placeholder Tests**
- Replace placeholder logs with actual HTTP requests
- Add assertions for security invariants
- Add error handling for network failures

**Phase 4: Run CI Integration**
- Add tests to CI workflow
- Ensure Redis secrets are available in CI
- Verify tests pass consistently

---

## Current Limitations

The current placeholder tests admit they do not prove the actual route-level security boundary. The underlying Redis operations are tested, but the HTTP layer where attackers interact is not proven.

This means:
- ✅ Redis revocation is tested
- ✅ Session-authorization binding is tested in Redis
- ❌ HTTP request with revoked session is NOT tested
- ❌ HTTP request with legacy cookies is NOT tested
- ❌ HTTP request with cross-session tampering is NOT tested

## Conclusion

These three security invariants are **NOT YET PROVEN** at the production security boundary. The placeholder tests should be replaced with actual HTTP-level assertions before declaring the system production-secure for these invariants.
