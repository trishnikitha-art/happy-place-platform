# OAuth Execution Guide

## Current State

**Commit:** `6ae8afd` - concurrent OAuth identity convergence fix
**Deployment:** `dpl_GLwHuN9a1JoHciDK5FYsSnGzK3QX` - READY
**CI Status:** ✅ All tests passing (Redis integration + HTTP security)

**Code Architecture:** ✅ Complete and CI-proven
- OAuth authorize route returns JSON `{ authUrl }` (506e154)
- Concurrent identity convergence (6ae8afd)
- Principal binding enforcement
- Session resolution with authorization verification
- Corpus authorization enforcement
- Public media gate enforcement

**Blocking Issues:**
1. Production media record `07c0eae184dc5a375f943a3ac2b67e95` has missing `storage` field
2. No live Drive session (no OAuth flow completed yet)

## Execution Steps

### Step 1: Log into Workbench

```
https://happy-place-platform.vercel.app/workbench/login
```

Enter Workbench credentials to establish authenticated session.

### Step 2: Connect Google Drive

In the Media Workbench, click "Connect Google Drive" button.

This calls:
```
GET /api/drive/oauth/authorize
```

Returns:
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

Workbench redirects browser to the authUrl.

### Step 3: Complete Google OAuth Consent

1. Google OAuth page loads
2. Select Google account
3. Grant permissions (Drive read-only scopes)
4. Google redirects to callback with authorization code

### Step 4: Verify Callback

Callback URL:
```
GET /api/drive/oauth/callback?code=...&state=...
```

Expected behavior:
- Validates OAuth state
- Exchanges code for access + refresh tokens
- Extracts Google `sub` (authoritative identity)
- Calls `upsertAuthorization(googleSubject, ...)`
- Calls `createSession(authorization.id, userAgent)`
- Issues `drive_session_id` cookie
- Redirects to `/workbench/media`

### Step 5: Verify Drive Session

Test:
```
GET /api/drive/auth/status
```

Expected response:
```json
{
  "authenticated": true,
  "has_access_token": true,
  "has_refresh_token": true,
  "has_expiry_date": true,
  "has_scope": true
}
```

### Step 6: Test Drive Discovery

Test:
```
GET /api/drive/discovery
```

Expected response:
```json
{
  "myDrive": { ... },
  "sharedDrives": [ ... ]
}
```

### Step 7: Test Drive Corpus API

Test:
```
POST /api/workbench/drive-corpus
{
  "action": "getStructure"
}
```

Expected response:
```json
{
  "success": true,
  "structure": {
    "myDrive": { ... },
    "sharedDrives": [ ... ]
  }
}
```

### Step 8: Test Folder Navigation

Test:
```
POST /api/workbench/drive-corpus
{
  "action": "getFiles",
  "folderId": "...",
  "driveId": "..."
}
```

Expected response:
```json
{
  "success": true,
  "items": [ ... ],
  "nextPageToken": "..."
}
```

### Step 9: Test Thumbnail

Test:
```
GET /api/drive/thumbnail?fileId=...
```

Expected: Binary image data (thumbnail)

### Step 10: Test Ingestion

Select an image in Workbench and click "Materialize".

This calls:
```
POST /api/workbench/materialize-drive
{
  "driveFileId": "...",
  "driveReference": { ... }
}
```

Expected:
- Creates DriveReference
- Materializes to PublishedMediaAsset
- Creates assignment

### Step 11: Verify Public Rendering

Test:
```
GET /api/...
```

Expected: Image renders on public website

## Post-OAuth: Repair Malformed Media Record

After OAuth is working, repair the malformed KV record:

```bash
cd website
node scripts/repair-malformed-media-record.mjs
```

This will:
- Read record `07c0eae184dc5a375f943a3ac2b67e95`
- Set `storage: "static"`
- Verify repair
- Eliminate PUBLIC_GATE_REJECTED error

## Negative Security Tests

After OAuth is working, verify:

1. **Legacy cookie rejection** - Old OAuth credential cookies cannot authenticate
2. **Revoked session rejection** - Revoked authorization + old session → FAIL
3. **Cross-session isolation** - User/session A cannot resolve authorization B
4. **Wrong corpus rejection** - Shared Drive A cannot be accessed with corpus ID B
5. **Unauthenticated thumbnail** - Thumbnail access requires authentication
6. **Unauthenticated Drive API** - Drive API requires drive_session_id

## Completion Criteria

The Drive → Media → rendered website path is complete when:

✅ Workbench login succeeds
✅ OAuth authorize returns JSON authUrl
✅ Google consent completes
✅ Callback creates authorization + session + drive_session_id
✅ Drive auth status shows authenticated
✅ Drive discovery returns My Drive + Shared Drives
✅ Folder navigation works
✅ Search within corpus works
✅ Thumbnail authentication works
✅ Ingestion creates PublishedMediaAsset
✅ Assignment creates visual slot assignment
✅ Public site renders the asset
✅ Malformed KV record is repaired
✅ Negative security tests pass

## What NOT To Do

❌ Do not merge DEPLOY back into main (main is 828 commits ahead)
❌ Do not modify security controls
❌ Do not weaken principal binding
❌ Do not add fallbacks to public media gate
❌ Do not delete KV records
❌ Do not mutate static authority to match KV
❌ Do not declare completion without browser evidence
