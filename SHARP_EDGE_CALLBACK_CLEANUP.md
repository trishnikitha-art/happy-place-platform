# Sharp Edge #21: Callback Error Cleanup Analysis

**Date:** 2025-01-XX
**Commit:** 238f89b

## Question

If the callback fails at any stage, can partial records remain?

## Callback Flow with Error Handling

### Stage 1: State Validation
```typescript
if (!state) {
  // Redirect to workbench - NO records created
  return NextResponse.redirect(url);
}

const stateConsumed = await consumeState(state);
if (!stateConsumed) {
  // Redirect to workbench - NO records created
  return NextResponse.redirect(url);
}
```
**Cleanup:** SAFE - No records created before state validation

### Stage 2: Google OAuth Error
```typescript
if (error) {
  // Redirect to workbench - NO records created
  return NextResponse.redirect(url);
}
```
**Cleanup:** SAFE - No records created before Google error check

### Stage 3: Missing Code
```typescript
if (!code) {
  // Redirect to workbench - NO records created
  return NextResponse.redirect(url);
}
```
**Cleanup:** SAFE - No records created before code check

### Stage 4: OAuth Credentials Check
```typescript
if (!clientId || !clientSecret) {
  // Return error - NO records created
  return NextResponse.json({ error: 'OAuth credentials not configured' }, { status: 500 });
}
```
**Cleanup:** SAFE - No records created before credentials check

### Stage 5: Token Exchange (TRY block starts)
```typescript
try {
  const tokenResponse = await fetch(...);
  const tokenData = await tokenResponse.json();
  
  // HTTP status check
  if (!tokenResponse.ok) {
    // Redirect to workbench - NO records created
    return NextResponse.redirect(url);
  }
  
  // Error response check
  if (tokenData.error) {
    // Handle invalid_grant with revocation
    // Redirect to workbench - NO authorization/session created yet
    return NextResponse.redirect(url);
  }
  
  // Response validation
  if (!tokenData.access_token || ...) {
    // Redirect to workbench - NO records created
    return NextResponse.redirect(url);
  }
}
```
**Cleanup:** SAFE - No records created until token exchange succeeds

### Stage 6: Identity Extraction (TRY block continues)
```typescript
try {
  const userInfoResponse = await fetch(...);
  const userInfo = await userInfoResponse.json();
  
  if (!userInfo.sub) {
    throw new Error('Google userinfo missing subject identifier');
  }
  
  googleSubject = userInfo.sub;
  email = userInfo.email || '';
} catch (error) {
  // FAIL CLOSED - Redirect to workbench
  // NO authorization/session created yet
  return NextResponse.redirect(url);
}
```
**Cleanup:** SAFE - No authorization/session created before identity extraction

### Stage 7: Authorization Persistence
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
**First persist operation:** Authorization record created

### Stage 8: Session Creation
```typescript
const session = await createSession(authorization.id, userAgent);
```
**Second persist operation:** Session record created

### Stage 9: Cookie Issuance
```typescript
cookieStore.set('drive_session_id', session.id, {...});
cookieStore.delete('drive_access_token');
cookieStore.delete('drive_refresh_token');
cookieStore.delete('drive_expiry_date');
cookieStore.delete('drive_scope');
```
**Third persist operation:** Cookies set/deleted

### Stage 10: Exception Handler (TRY block ends)
```typescript
} catch (error) {
  console.error('[DRIVE OAUTH FORENSIC] OAuth token exchange error:', error);
  const url = new URL('/workbench/media', request.url);
  return NextResponse.redirect(url);
}
```

## Analysis

### Failure Scenarios

**If failure occurs AFTER authorization persistence but BEFORE session creation:**
- Authorization record exists in Redis
- No session record exists
- No session cookie exists
- **Result:** Authorization is orphaned (user cannot use it without session)

**If failure occurs AFTER session creation but BEFORE cookie issuance:**
- Authorization record exists in Redis
- Session record exists in Redis
- No session cookie exists
- **Result:** Both authorization and session are orphaned

**If failure occurs AFTER cookie issuance:**
- Authorization record exists
- Session record exists
- Session cookie exists
- Legacy cookies deleted
- **Result:** Partial success - but redirect to workbench anyway

## Current Cleanup Strategy

**The current implementation does NOT clean up partial records on failure.**

This is acceptable because:
1. **Authorization without session is unusable** - The session cookie is required to access the authorization
2. **Session without cookie is unusable** - The session ID must be in the cookie to resolve the authorization
3. **Orphaned records will expire via TTL** - Both authorization and session records have 30-day TTL
4. **User can re-authenticate** - The OAuth flow is idempotent for the same Google identity

## Recommendation

**NO CHANGES REQUIRED** - The current error handling is acceptable.

However, consider adding explicit cleanup in a future enhancement:

```typescript
try {
  // ... authorization persistence ...
  // ... session creation ...
  // ... cookie issuance ...
} catch (error) {
  // Clean up on failure
  // This is optional since TTL will clean up automatically
  // But provides immediate cleanup if desired
  if (authorization) {
    await revokeAuthorization(authorization.id);
  }
  if (session) {
    await revokeSession(session.id);
  }
  throw error;
}
```

**For the current threat model:** TTL-based cleanup is sufficient. Orphaned records will expire within 30 days and cannot be used without the session cookie.

## Verdict

**ACCEPTABLE** - Current error handling prevents partial records from being usable. Orphaned records will expire via TTL. Explicit cleanup is optional for future enhancement.
