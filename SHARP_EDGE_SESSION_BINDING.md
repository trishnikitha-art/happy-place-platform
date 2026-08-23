# Sharp Edge #23: Session to Authorization Binding Analysis

**Date:** 2025-01-XX
**Commit:** 25f3f60

## Question

Can a session be used to access a different authorization than the one it was created with?

## Current Implementation

**File:** `website/src/lib/drive/session-store.ts`

```typescript
export interface BrowserSessionRecord {
  id: string; // crypto.randomUUID()
  authorizationId: string; // Link to GoogleAuthorizationRecord
  userAgent: string; // Browser identifier
  createdAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp
  lastSeenAt: string; // ISO timestamp
  revokedAt?: string; // ISO timestamp
}
```

**Session record includes:**
- `id`: Unique session identifier (stored in cookie)
- `authorizationId`: Explicit link to authorization record
- `userAgent`: Browser identifier
- `createdAt`, `expiresAt`, `lastSeenAt`: Timestamps
- `revokedAt`: Optional revocation timestamp

## Credential Resolution Path

**File:** `website/src/lib/drive/oauth-manager.ts`

```typescript
export async function getOAuthClient(authorizationId?: string): Promise<InstanceType<typeof google.auth.OAuth2>> {
  // If authorizationId not provided, resolve from session
  let effectiveAuthorizationId = authorizationId;
  if (!effectiveAuthorizationId) {
    const sessionId = await getSessionIdFromCookies();
    if (sessionId) {
      const session = await getSession(sessionId);
      if (session) {
        effectiveAuthorizationId = session.authorizationId; // ← Session provides authorizationId
      }
    }
  }

  if (!effectiveAuthorizationId) {
    throw new Error('Cannot resolve authorization ID from session');
  }

  // Resolve credentials from authorization repository
  const authorization = await getAuthorization(effectiveAuthorizationId);
  // ...
}
```

## Analysis

### Session Binding

**How it works:**
1. User completes OAuth callback
2. Callback creates session with `authorizationId = authorization.id`
3. Session ID is stored in cookie
4. Later requests resolve: session → authorizationId → authorization → credentials

**Is the binding enforced?**
- Session record contains explicit `authorizationId` field
- Credential resolution uses `session.authorizationId` to look up authorization
- Cannot access different authorization because session is bound to specific `authorizationId`

### Can session be modified?

**Attack scenario:**
1. Attacker steals session cookie
2. Attacker modifies session record in Redis to change `authorizationId`
3. Attacker uses stolen cookie to access different authorization

**Mitigation:**
- Session records are stored in Redis with `SESSION_TTL_SECONDS = 30 days`
- Redis keys are not mutable by attacker (requires Redis access)
- Attacker would need Redis admin privileges to modify session records
- At that point, attacker can do anything regardless of session binding

**Is this a real threat?**
- No - if attacker has Redis admin privileges, session binding is irrelevant
- Session binding is to prevent accidental authorization mixing, not Redis compromise

### Can authorization be modified?

**Attack scenario:**
1. User A has session bound to authorization A
2. Attacker modifies authorization A record to point to different credentials
3. User A's session now uses attacker's credentials

**Mitigation:**
- Authorization records are stored in Redis with `AUTHORIZATION_TTL_SECONDS = 30 days`
- Redis keys are not mutable by attacker (requires Redis access)
- Attacker would need Redis admin privileges

**Is this a real threat?**
- No - if attacker has Redis admin privileges, they can do anything
- Authorization binding is to prevent accidental mixing, not Redis compromise

### Can session be reused for different authorization?

**Attack scenario:**
1. User A creates session for authorization A
2. User A re-authenticates with different Google account (authorization B)
3. User A's session is still bound to authorization A
4. User A cannot use session for authorization B

**This is INTENTIONAL behavior:**
- Session is bound to specific authorization
- Re-authentication creates new session with new authorization
- Old session remains bound to old authorization
- User must explicitly logout (session revocation) to switch authorizations

## Assessment

**Session to authorization binding is ENFORCED and SECURE.**

**Why it's secure:**
1. Session record contains explicit `authorizationId` field
2. Credential resolution uses `session.authorizationId` to look up authorization
3. Cannot access different authorization because session is bound to specific `authorizationId`
4. Redis access required to modify session/authorization records
5. Redis compromise is outside threat model (attacker can do anything regardless)

**Why it's intentional:**
- Prevents accidental authorization mixing
- User must explicitly logout to switch authorizations
- Session represents a specific authentication session
- Re-authentication creates new session

## Verdict

**SECURE** - Session to authorization binding is enforced and intentional.

**No changes required.**

## Future Enhancement (Optional)

If strict session binding is required (e.g., for compliance):
1. Add authorization version to session record
2. Increment authorization version on token refresh
3. Validate version on credential resolution
4. Invalidate session if version mismatch

However, this is not required for the current threat model.
