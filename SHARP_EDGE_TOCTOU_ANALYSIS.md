# Sharp Edge #6: Session Authorization TOCTOU Analysis

**Date:** 2025-01-XX
**Commit:** 79524ff

## The Issue

The credential resolution path has multiple steps:

```
1. read session (getSessionIdFromCookies → getSession)
2. read authorization (getAuthorization)
3. check authorization status (status !== 'active')
4. decrypt credentials
5. create OAuth client
6. Drive API request
```

**TOCTOU (Time-of-Check-Time-of-Use) Question:**
If revocation occurs between step 3 (status check) and step 6 (Drive API call), can the request still succeed?

## Current Implementation

**File:** `website/src/lib/drive/oauth-manager.ts`

```typescript
// Step 1-2: Resolve authorization ID
const authorization = await getAuthorization(effectiveAuthorizationId);

// Step 3: Check status
if (!authorization || authorization.status !== 'active') {
  throw new Error('Authorization not found or inactive');
}

// Step 4-5: Decrypt and create client
const credentials = { ... decrypted ... };
const oauth2Client = await createOAuthClient(credentials, effectiveAuthorizationId);

// Step 6: Drive API call (happens after this function returns)
```

## Analysis

**If revocation occurs AFTER step 3:**
- The authorization status check already passed
- Credentials are already decrypted in memory
- OAuth client is already created with valid tokens
- The Drive API call will use the valid tokens
- **Result: The request will succeed**

**This is INTENTIONAL behavior in the current architecture.**

## Security Boundary

The current architecture treats revocation as:

> **"Revocation prevents FUTURE requests from using this authorization."**

It does NOT guarantee:

> **"Revocation immediately terminates all IN-FLIGHT requests using this authorization."**

## Rationale

This design choice is reasonable because:

1. **In-flight requests are already valid** - They have valid OAuth tokens that were authorized before revocation
2. **Distributed locking is expensive** - Preventing TOCTOU would require distributed locks or versioned authorizations
3. **Practical threat model** - Revocation is typically for account compromise or permission changes, not for canceling specific in-flight API calls
4. **Google OAuth tokens remain valid** - Even if we revoke our local authorization, the Google OAuth token remains valid until its expiry

## Alternative Approaches (Rejected)

### Option 1: Re-check authorization status before every Drive API call
```typescript
// Before each Drive API call:
const auth = await getAuthorization(authorizationId);
if (auth.status !== 'active') {
  throw new Error('Authorization revoked during request');
}
```
**Rejected:** Adds unnecessary round-trips to Redis for every Drive API call. The performance cost is high for minimal security benefit.

### Option 2: Versioned authorizations with sequence numbers
```typescript
// Include version in authorization record
const authVersion = await getAuthorizationVersion(authorizationId);
// ... resolve credentials ...
// Before Drive API call:
const currentVersion = await getAuthorizationVersion(authorizationId);
if (currentVersion !== authVersion) {
  throw new Error('Authorization version changed');
}
```
**Rejected:** Adds complexity to authorization model without clear security benefit. Google OAuth tokens remain valid regardless of our local revocation.

### Option 3: Short-lived tokens with immediate revocation
```typescript
// Use very short-lived access tokens (e.g., 5 minutes)
// Force refresh on every request
```
**Rejected:** Google OAuth token expiry is controlled by Google, not us. We cannot force immediate token invalidation.

## Current Architecture Assessment

**The current TOCTOU behavior is ACCEPTABLE given:**

1. **Authorization status is checked at credential resolution time** - This prevents NEW requests from using revoked authorizations
2. **Google OAuth tokens have their own expiry** - Even if our local authorization is revoked, the Google token remains valid until its natural expiry
3. **In-flight requests are a bounded window** - The TOCTOU window is milliseconds to seconds, not hours
4. **Revocation is for future access** - The primary security goal is preventing FUTURE access, not canceling in-flight operations

## Recommendation

**DOCUMENT the boundary explicitly** in code comments:

```typescript
// SECURITY NOTE: Authorization status is checked at credential resolution time.
// If revocation occurs after this check but before the Drive API call, the request
// may still succeed because valid credentials are already in memory.
//
// This is intentional: revocation prevents FUTURE requests, not in-flight requests.
// The Google OAuth token remains valid regardless of our local revocation.
//
// To revoke in-flight access, revoke the Google OAuth token directly via Google Admin Console.
```

**NO CODE CHANGE REQUIRED** - The current behavior is acceptable and well-understood.

## Future Enhancement (Optional)

If stricter TOCTOU guarantees are required in the future:

1. Add authorization version tracking
2. Re-check version before critical operations
3. Use Redis pub/sub to notify running requests of revocation
4. Consider using Google's token revocation API (if available)

However, these are not required for the current threat model.
