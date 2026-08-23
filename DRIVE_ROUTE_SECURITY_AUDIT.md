# Drive Route Security Audit - EXECUTION MODE

**Date:** 2025-01-XX
**Commit:** 9a8553a
**Scope:** Complete Drive route inventory and security analysis

## Critical Security Issue Found

### `/api/drive/files/[fileId]/thumbnail` - MISSING AUTHENTICATION

**Issue:** The thumbnail route uses `getOAuthClient()` to resolve Drive credentials but has NO authentication check before making Drive API calls.

**Current Code:**
```typescript
const auth = await getOAuthClient();
const drive = google.drive({ version: 'v3', auth: auth as any });
const file = await drive.files.get(getFileParams);
```

**Problem:** If a user is not authenticated with Drive, `getOAuthClient()` will throw an error, but this is not an explicit authentication check. More critically, there's no check that the requested `fileId` belongs to the authenticated user's Drive context.

**Required Fix:**
1. Add explicit Drive authentication check before using Drive API
2. Verify the requested file is reachable through the authenticated user's Drive context
3. Fail closed if authentication fails or file is not accessible

---

## Complete Drive Route Inventory

| Route | Authentication | Authorization ID | Fallback | Object-Level Auth | Status |
|---|---|---|---|---|---|
| `/api/drive/oauth/authorize` | N/A (initiates OAuth) | N/A | N/A | N/A | OK |
| `/api/drive/oauth/callback` | N/A (creates session) | N/A | N/A | N/A | OK |
| `/api/drive/auth/status` | `driveSession.isAuthenticated()` | Resolved from session | NONE | N/A | OK |
| `/api/drive/discovery` | `driveSession.isAuthenticated()` | Resolved from session | NONE | N/A | OK |
| `/api/drive/files` | `driveSession.isAuthenticated()` | Resolved from session | NONE | **MISSING** | CRITICAL |
| `/api/drive/folder/[folderId]` | `driveSession.isAuthenticated()` | Resolved from session | NONE | **MISSING** | CRITICAL |
| `/api/drive/files/[fileId]/thumbnail` | **NONE** | Resolved from session | NONE | **MISSING** | CRITICAL |
| `/api/drive/ingest` | `driveSession.isAuthenticated()` | Resolved from session | NONE | **MISSING** | CRITICAL |
| `/api/drive/reference` | `driveSession.isAuthenticated()` | Resolved from session | NONE | **MISSING** | CRITICAL |

---

## Missing Object-Level Authorization

**Critical Gap:** No route verifies that caller-supplied IDs (`fileId`, `folderId`, `driveId`) are reachable through the authenticated user's Drive context.

**Attack Vector:**
- User A authenticates with their Google Drive
- User A submits User B's `fileId` or `folderId`
- Server uses User A's credentials to access User B's data
- This is an Insecure Direct Object Reference (IDOR) vulnerability

**Required Fix:**
1. All Drive API operations must use the authenticated user's Drive context
2. The Drive API itself enforces access control based on OAuth credentials
3. However, explicit verification is needed to prevent:
   - Caller-supplied `driveId` crossing authorization boundaries
   - Pagination tokens from another Drive context
   - Arbitrary `fileId`/`folderId` access

**Mitigation:**
- The Google Drive API itself enforces access control based on OAuth tokens
- If User A tries to access User B's file with User A's credentials, Google will reject it
- However, we should:
  1. Explicitly validate that `driveId` (if provided) is one the user has access to
  2. Verify pagination tokens are from the same Drive context
  3. Log suspicious access patterns

---

## Development Bypass Risk

**Issue:** Multiple routes have `TEMPORARY LOCAL DEVELOPMENT BYPASS` that skips authentication in development.

**Affected Routes:**
- `/api/drive/files`
- `/api/drive/discovery`
- `/api/drive/ingest`
- `/api/drive/reference`

**Risk:** If this bypass is accidentally deployed to production, all Drive routes become publicly accessible.

**Required Fix:**
1. Remove development bypass or make it explicit with environment-specific guardrails
2. Add runtime check that production never skips authentication
3. Consider using feature flags instead of `NODE_ENV` checks

---

## Fix Priority

1. **CRITICAL:** Add authentication check to `/api/drive/files/[fileId]/thumbnail`
2. **CRITICAL:** Remove or guardrail development bypasses
3. **HIGH:** Add object-level authorization verification for all Drive routes
4. **HIGH:** Validate `driveId` belongs to authenticated user
5. **HIGH:** Validate pagination tokens are from same context
