# Drive API Path and Credential Resolution Audit

**Date:** 2025-01-XX
**Commit:** 9a8553a
**Scope:** Audit actual Drive API routes and credential resolution paths

## Executive Summary

This audit traces the credential resolution path for all important Drive API routes to verify they use the authoritative session → authorization → credential path and cannot silently fall back to legacy media behavior.

---

## 1. Route: `/api/drive/auth/status`

**File:** `website/src/app/api/drive/auth/status/route.ts`

### Implementation
```typescript
export async function GET() {
  try {
    const credentials = await driveSession.getCredentials();
    const authenticated = await driveSession.isAuthenticated();
    // ...
  }
}
```

### Credential Resolution Path
```
driveSession.getCredentials()
  → getSessionIdFromCookies() [reads drive_session_id cookie]
  → getSession(sessionId) [from session-store.ts]
  → getAuthorization(session.authorizationId) [from oauth-credential-store.ts]
  → decrypt(encryptedAccessToken) [from encryption.ts]
  → decrypt(encryptedRefreshToken) [from encryption.ts]
  → { access_token, refresh_token, expiry_date, scope }
```

### Legacy Fallback
**NONE** - This route only reads from the authoritative path.

### Verdict
**STATICALLY SUPPORTED** - Uses authoritative path only.

---

## 2. Route: `/api/drive/oauth/authorize`

**File:** `website/src/app/api/drive/oauth/authorize/route.ts`

### Implementation
```typescript
export async function GET(request: Request) {
  const state = await createState();
  // Redirect to Google OAuth
}
```

### Credential Resolution Path
**N/A** - This route initiates OAuth, it does not resolve credentials.

### Legacy Fallback
**NONE** - This route does not resolve credentials.

### Verdict
**STATICALLY SUPPORTED** - Initiates OAuth flow correctly.

---

## 3. Route: `/api/drive/oauth/callback`

**File:** `website/src/app/api/drive/oauth/callback/route.ts`

### Implementation
```typescript
export async function GET(request: Request) {
  const stateConsumed = await consumeState(state);
  // Exchange code for tokens
  const authorization = await upsertAuthorization(...);
  const session = await createSession(authorization.id, userAgent);
  cookieStore.set('drive_session_id', session.id, ...);
  // Delete legacy cookies
  cookieStore.delete('drive_access_token');
  cookieStore.delete('drive_refresh_token');
  cookieStore.delete('drive_expiry_date');
  cookieStore.delete('drive_scope');
}
```

### Credential Resolution Path
**N/A** - This route creates credentials (persists authorization), it does not resolve existing credentials.

### Legacy Fallback
**NONE** - This route deletes legacy cookies after successful OAuth.

### Verdict
**STATICALLY SUPPORTED** - Creates authoritative session and deletes legacy cookies.

---

## 4. Route: `/api/drive/discovery`

**File:** `website/src/app/api/drive/discovery/route.ts`

### Implementation
```typescript
export async function GET() {
  const structure = await driveDiscovery.discoverStructure();
}
```

### Credential Resolution Path
```
driveDiscovery.discoverStructure()
  → isAuthenticated() [from oauth-manager.ts]
    → getSessionIdFromCookies() [reads drive_session_id cookie]
    → getSession(sessionId) [from session-store.ts]
    → getAuthorization(session.authorizationId) [from oauth-credential-store.ts]
  → getDriveClient() [from oauth-manager.ts]
    → getOAuthClient(authorizationId)
      → getAuthorization(authorizationId) [from oauth-credential-store.ts]
      → decrypt(encryptedAccessToken)
      → decrypt(encryptedRefreshToken)
      → createOAuthClient(credentials, authorizationId)
```

### Legacy Fallback
**NONE** - This route uses the authoritative path through `oauth-manager.ts`.

### Verdict
**STATICALLY SUPPORTED** - Uses authoritative path only.

---

## 5. Route: `/api/drive/files`

**File:** `website/src/app/api/drive/files/route.ts`

### Implementation
```typescript
export async function GET(request: Request) {
  const result = await driveDiscovery.listChildren(
    { parentId: folderId, driveId },
    pageToken
  );
}
```

### Credential Resolution Path
```
driveDiscovery.listChildren()
  → isAuthenticated() [from oauth-manager.ts]
    → getSessionIdFromCookies()
    → getSession(sessionId)
    → getAuthorization(session.authorizationId)
  → getDriveClient() [from oauth-manager.ts]
    → getOAuthClient(authorizationId)
      → getAuthorization(authorizationId)
      → decrypt(encryptedAccessToken)
      → decrypt(encryptedRefreshToken)
      → createOAuthClient(credentials, authorizationId)
```

### Legacy Fallback
**NONE** - This route uses the authoritative path through `oauth-manager.ts`.

### Verdict
**STATICALLY SUPPORTED** - Uses authoritative path only.

---

## 6. Route: `/api/drive/folder/[folderId]`

**File:** `website/src/app/api/drive/folder/[folderId]/route.ts`

### Implementation
```typescript
export async function GET(request: Request, { params }: { params: { folderId: string } }) {
  const result = await driveDiscovery.listChildren(
    { parentId: params.folderId, driveId },
    pageToken
  );
}
```

### Credential Resolution Path
```
driveDiscovery.listChildren()
  → isAuthenticated() [from oauth-manager.ts]
    → getSessionIdFromCookies()
    → getSession(sessionId)
    → getAuthorization(session.authorizationId)
  → getDriveClient() [from oauth-manager.ts]
    → getOAuthClient(authorizationId)
      → getAuthorization(authorizationId)
      → decrypt(encryptedAccessToken)
      → decrypt(encryptedRefreshToken)
      → createOAuthClient(credentials, authorizationId)
```

### Legacy Fallback
**NONE** - This route uses the authoritative path through `oauth-manager.ts`.

### Verdict
**STATICALLY SUPPORTED** - Uses authoritative path only.

---

## 7. Route: `/api/drive/files/[fileId]/thumbnail`

**File:** `website/src/app/api/drive/files/[fileId]/thumbnail/route.ts`

### Implementation
```typescript
export async function GET(request: Request, { params }: { params: { fileId: string } }) {
  const driveFile = await driveDiscovery.getFile(params.fileId, driveId);
  const thumbnailLink = driveFile.thumbnailLink;
  // Fetch thumbnail from Drive
}
```

### Credential Resolution Path
```
driveDiscovery.getFile()
  → isAuthenticated() [from oauth-manager.ts]
    → getSessionIdFromCookies()
    → getSession(sessionId)
    → getAuthorization(session.authorizationId)
  → getDriveClient() [from oauth-manager.ts]
    → getOAuthClient(authorizationId)
      → getAuthorization(authorizationId)
      → decrypt(encryptedAccessToken)
      → decrypt(encryptedRefreshToken)
      → createOAuthClient(credentials, authorizationId)
```

### Legacy Fallback
**NONE** - This route uses the authoritative path through `oauth-manager.ts`.

### Verdict
**STATICALLY SUPPORTED** - Uses authoritative path only.

---

## 8. Route: `/api/drive/ingest`

**File:** `website/src/app/api/drive/ingest/route.ts`

### Implementation
```typescript
export async function POST(request: Request) {
  const isDriveAuthenticated = await driveSession.isAuthenticated();
  const driveFile = await driveDiscovery.getFile(driveId, driveIdParameter);
  const fileBuffer = await driveDiscovery.downloadFile(driveId, driveIdParameter);
  // Process and store media
}
```

### Credential Resolution Path
```
driveSession.isAuthenticated()
  → getSessionIdFromCookies()
  → getSession(sessionId)
  → getAuthorization(session.authorizationId)

driveDiscovery.getFile()
  → isAuthenticated() [from oauth-manager.ts]
    → getSessionIdFromCookies()
    → getSession(sessionId)
    → getAuthorization(session.authorizationId)
  → getDriveClient() [from oauth-manager.ts]
    → getOAuthClient(authorizationId)
      → getAuthorization(authorizationId)
      → decrypt(encryptedAccessToken)
      → decrypt(encryptedRefreshToken)
      → createOAuthClient(credentials, authorizationId)

driveDiscovery.downloadFile()
  → isAuthenticated() [from oauth-manager.ts]
    → getSessionIdFromCookies()
    → getSession(sessionId)
    → getAuthorization(session.authorizationId)
  → getDriveClient() [from oauth-manager.ts]
    → getOAuthClient(authorizationId)
      → getAuthorization(authorizationId)
      → decrypt(encryptedAccessToken)
      → decrypt(encryptedRefreshToken)
      → createOAuthClient(credentials, authorizationId)
```

### Legacy Fallback
**NONE** - This route uses the authoritative path through `driveSession` and `oauth-manager`.

### Verdict
**STATICALLY SUPPORTED** - Uses authoritative path only.

---

## 9. Route: `/api/drive/reference`

**File:** `website/src/app/api/drive/reference/route.ts`

### Implementation
```typescript
export async function POST(request: Request) {
  const isDriveAuthenticated = await driveSession.isAuthenticated();
  // Create DriveReference record
}
```

### Credential Resolution Path
```
driveSession.isAuthenticated()
  → getSessionIdFromCookies()
  → getSession(sessionId)
  → getAuthorization(session.authorizationId)
```

### Legacy Fallback
**NONE** - This route uses the authoritative path through `driveSession`.

### Verdict
**STATICALLY SUPPORTED** - Uses authoritative path only.

---

## 10. Summary of Credential Resolution Paths

All Drive API routes follow the same authoritative credential resolution path:

```
drive_session_id cookie
  → Session Repository (session-store.ts)
    → Authorization ID
      → Authorization Repository (oauth-credential-store.ts)
        → Encrypted Access Token
        → Encrypted Refresh Token
          → Decryption (encryption.ts)
            → OAuth Client (oauth-manager.ts)
              → Drive API (googleapis)
```

### Key Invariants Verified

1. **No route reads legacy credential cookies** - All routes use `drive_session_id` cookie only.
2. **No route has legacy fallback** - All routes fail if the authoritative path fails.
3. **All routes use encryption** - Credentials are encrypted at rest in the authorization repository.
4. **All routes use per-request OAuth clients** - No process-global OAuth client state.
5. **All routes use explicit authorizationId** - Authorization identity is explicit and stable.

---

## 11. Token Refresh Path

When a Drive API call encounters an expired token, the refresh path is:

```
OAuth Client (googleapis)
  → Token Refresh Event
    → oauth-manager.ts token callback
      → authorizationId (from closure, not cookies)
        → getAuthorization(authorizationId)
          → Encrypted Refresh Token
            → Decryption
              → Refresh Token Exchange with Google
                → New Access Token
                  → updateAuthorizationAfterRefresh(authorizationId, ...)
                    → Encrypt new tokens
                      → Update Authorization Repository
```

### Key Invariants Verified

1. **No background cookie access** - Token refresh callback uses explicit `authorizationId` from closure.
2. **Authorization identity is stable** - Refresh updates the same authorization record.
3. **User A/User B isolation** - Refresh for User A cannot update User B (different authorization IDs).
4. **Permanent failure handling** - `invalid_grant` triggers authoritative revocation.

---

## 12. Revocation Path

When an authorization is revoked, the revocation path is:

```
revokeAuthorizationWithSessions(authorizationId)
  → Atomic Redis Lua Script
    → Delete Authorization Record
    → Delete All Session Records for this Authorization
    → Delete Index Entries
      → Clear drive_session_id cookie (in request context)
```

### Key Invariants Verified

1. **Atomic revocation** - Authorization and all sessions are revoked in a single Redis transaction.
2. **No orphaned sessions** - All sessions are removed when authorization is revoked.
3. **Index consistency** - Index entries are deleted atomically with authorization.

---

## 13. Media Provenance Path

When media is ingested from Drive, the provenance path is:

```
Drive File Download
  → Content Hash Computation
    → Stable Media ID (content-based)
      → Variant Generation (Sharp)
        → Upload to Blob Storage
          → PublishedMediaAsset Record
            → source: 'local' (not 'google-drive')
            → lifecycleState: 'published' (not 'source_reference')
            → provenance.august3_driveId: <original Drive ID>
              → Media KV Store (canonical authority)
```

### Key Invariants Verified

1. **No Drive dependency after materialization** - PublishedMediaAsset has `source: 'local'`, not `source: 'google-drive'`.
2. **Provenance tracking** - Original Drive ID is preserved in `provenance.august3_driveId` for lineage.
3. **Content-based identity** - Media ID is derived from content hash, not filename.
4. **Idempotent materialization** - Same content produces same media ID and reuses Blob uploads.

---

## 14. Verdict Summary

| Route | Credential Path | Legacy Fallback | Verdict |
|---|---|---|---|
| `/api/drive/auth/status` | Session → Authorization → Decrypt | NONE | STATICALLY SUPPORTED |
| `/api/drive/oauth/authorize` | N/A (initiates OAuth) | N/A | STATICALLY SUPPORTED |
| `/api/drive/oauth/callback` | N/A (creates session) | NONE (deletes legacy) | STATICALLY SUPPORTED |
| `/api/drive/discovery` | Session → Authorization → Decrypt | NONE | STATICALLY SUPPORTED |
| `/api/drive/files` | Session → Authorization → Decrypt | NONE | STATICALLY SUPPORTED |
| `/api/drive/folder/[folderId]` | Session → Authorization → Decrypt | NONE | STATICALLY SUPPORTED |
| `/api/drive/files/[fileId]/thumbnail` | Session → Authorization → Decrypt | NONE | STATICALLY SUPPORTED |
| `/api/drive/ingest` | Session → Authorization → Decrypt | NONE | STATICALLY SUPPORTED |
| `/api/drive/reference` | Session → Authorization → Decrypt | NONE | STATICALLY SUPPORTED |

---

## 15. Runtime Evidence Required

All credential resolution paths are **STATICALLY SUPPORTED** but **UNPROVEN** at runtime. The following evidence is required:

1. **End-to-end OAuth flow** with real Google credentials:
   - authorize → Google consent → callback → session → auth status
   - Verify session cookie is issued
   - Verify legacy cookies are deleted

2. **Drive API calls** with authenticated session:
   - `/api/drive/discovery` → verify My Drive and Shared Drives are discovered
   - `/api/drive/files` → verify folder navigation works
   - `/api/drive/ingest` → verify media ingestion preserves provenance

3. **Token refresh** scenario:
   - Wait for token expiry or simulate expiry
   - Verify refresh succeeds and updates authorization
   - Verify no background cookie access occurs

4. **Revocation** scenario:
   - Revoke authorization
   - Verify all sessions are deleted
   - Verify subsequent Drive API calls fail

---

## Conclusion

All Drive API routes use the authoritative credential resolution path. No route has a legacy fallback. The architecture is **STATICALLY SUPPORTED** but **UNPROVEN** at runtime.

The finish line remains: **a functioning Drive → authority → session → Drive API → Media Workbench path that can actually be used.**
