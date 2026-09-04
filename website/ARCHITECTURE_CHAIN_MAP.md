# Architecture Chain Map - FINAL INTEGRATION AUDIT

## GIT STATE - VERIFIED ✅

- **Branch:** main
- **HEAD:** 414f22c (Create missing Workbench Drive materialization bridge endpoints)
- **Origin:** 414f22c (matches HEAD)
- **Working Tree:** Clean (uncommitted docs/scripts ignored)
- **Required Commits Present:**
  - ✅ 414f22c - Workbench materialization bridge
  - ✅ 77c4593 - Shared Drive root representation
  - ✅ All preceding OAuth/Drive work

---

## OAUTH CHAIN MAP

```
/workbench/connectors
  ↓
window.location.href = '/api/drive/oauth/authorize'
  ↓
GET /api/drive/oauth/authorize
  ↓
createState(cookieStore) → Redis state authority
  ↓
redirect to Google OAuth
  ↓
Google consent screen
  ↓
callback to /api/drive/oauth/callback
  ↓
consumeState(cookieStore) → validates CSRF
  ↓
exchange code for tokens → Google
  ↓
fetch userinfo → Google identity (sub)
  ↓
upsertAuthorization() → Redis credential store
  - googleSubject (authoritative identity)
  - email (display)
  - scopes
  - access_token
  - expiry_date
  - refresh_token (encrypted)
  ↓
createSession(authorizationId, userAgent) → Redis session store
  ↓
delete legacy credential cookies (drive_access_token, drive_refresh_token, etc.)
  ↓
set cookie: drive_session_id (opaque, httpOnly, secure)
  ↓
redirect to /workbench/media
```

**Authentication Boundaries:**
- State authority: Redis-backed, browser-bound, one-time use
- Credential store: Redis, encrypted refresh_token
- Session store: Redis, authorization binding
- Browser: opaque session ID only (no tokens)

**Identity Carried:**
- googleSubject (authoritative)
- authorizationId
- sessionId
- userAgent

**Storage:**
- Redis (state, credentials, sessions)
- Browser cookies (session ID only)

---

## DRIVE BROWSING CHAIN MAP

```
/workbench/explorer/drive or /workbench/media
  ↓
GET /api/drive/auth/status
  ↓
driveSession.isAuthenticated()
  ↓
workbenchSession.getSessionIdentity()
  ↓
GET /api/drive/discovery
  ↓
driveDiscovery.listDrives()
  ↓
corpusAuthorization.getAuthorizedCorpora()
  - HPP_AUTHORIZED_MY_DRIVE=true
  - HPP_AUTHORIZED_SHARED_DRIVES
  ↓
Returns: { myDrive, sharedDrives[] }
  ↓
User selects corpus
  ↓
GET /api/drive/files?folderId=<id>&driveId=<optional>
  ↓
corpusAuthorization.verifyCorpusAuthorization(folderId, driveId)
  ↓
driveDiscovery.listChildren({ parentId, driveId })
  ↓
Google Drive API
  - corpora: 'user' or 'drive'
  - driveId: <sharedDriveId>
  - q: '<parentId> in parents and trashed = false'
  - supportsAllDrives: true
  - includeItemsFromAllDrives: true
  ↓
Returns: DriveFile[] | DriveFolder[]
  ↓
GET /api/drive/files/<fileId>/thumbnail?driveId=<optional>
  ↓
driveDiscovery.getThumbnail(fileId, driveId)
  ↓
Google Drive API
  ↓
Returns thumbnail image bytes
```

**Authentication Boundaries:**
- Every Drive API call requires authenticated session
- Every Drive API call requires corpus authorization
- Object-level authorization via verifyCorpusAuthorization

**Identity Carried:**
- sessionId (via cookie)
- driveId (corpus context)
- folderId (current location)

**Storage:**
- Redis (sessions, credentials)
- Google Drive API (source data)

**Expected Response:**
- Discovery: { myDrive, sharedDrives[] }
- Files: { files: DriveFile[] | DriveFolder[], nextPageToken }
- Thumbnail: image bytes

**Failure Behavior:**
- No session: 401
- No corpus authorization: 403
- Invalid folder/file: 404
- Google error: 500

---

## MATERIALIZATION CHAIN MAP

```
/workbench/media (Drive browser)
  ↓
User selects Drive file
  ↓
handleDragStart(e, existingAsset, file)
  ↓
DND dataTransfer: { source: 'google-drive', fileId, sharedDriveId, name, mimeType, ... }
  ↓
Drop to slot
  ↓
handleDrop(slot, asset, mediaId, requestId)
  ↓
if applicationData.source === 'google-drive':
  ↓
Check existingAsset by drive.fileId
  ↓
if existingAsset:
  verifyMediaMaterializationComplete(existingAsset.id)
  - GET /api/workbench/verify-materialization?assetId=<id>
  ↓
if incomplete:
  materializeDriveFile(applicationData, slot, requestId)
else:
  handleDriveDropToSlot(slot, existingAsset, ...)
else:
  materializeDriveFile(applicationData, slot, requestId)
  ↓
POST /api/workbench/materialize-drive
  - Body: { fileId, sharedDriveId, fileName, mimeType }
  ↓
workbenchSession.isAuthenticated()
  ↓
POST /api/drive/ingest
  - Body: { driveId, driveIdParameter, roles }
  ↓
driveSession.isAuthenticated()
  ↓
workbenchSession.isAuthenticated()
  ↓
verifyCorpusAuthorization(driveId, driveIdParameter)
  ↓
driveDiscovery.getFile(driveId)
  ↓
driveDiscovery.downloadFile(driveId)
  ↓
Compute content hash (SHA-256)
  ↓
Sharp metadata extraction (dimensions, format, etc.)
  ↓
Generate variants:
  - original
  - webp (RESPONSIVE_WIDTHS)
  - avif (RESPONSIVE_WIDTHS)
  - thumbnail (THUMBNAIL_WIDTH)
  - blur placeholder
  ↓
uploadToBlob(variants[])
  ↓
Generate stable media ID from content hash
  ↓
Create PublishedMediaAsset:
  - id: stable media ID
  - source: 'local' (Blob, not Drive)
  - lifecycleState: 'published'
  - contentHash
  - variants: { original, webp[], avif[], thumbnail, blur }
  - storage: { type: 'blob', path, ... }
  - provenance: { source: 'google-drive', driveFileId, ... }
  ↓
storeMedia(media) → KV
  ↓
findMediaByContentHash(contentHash) → KV (idempotency check)
  ↓
reconcileDriveAssignments(publishedMediaId, driveFileId, contentHash)
  - Find assignments with drive-<fileId> or drive-ref-<hash>
  - Update to point to publishedMediaId
  - CAS semantics
  ↓
Return: { success: true, media: PublishedMediaAsset }
  ↓
addDriveAssetToRegistry(result.asset)
  ↓
loadCanonicalData() → reload KV media
  ↓
handleDriveDropToSlot(slot, asset, ...)
  ↓
assignMediaToSlot(slot, asset)
  ↓
POST /api/media/reconciliation
  ↓
Update assignment in KV
  ↓
iframe reload → preview updated
```

**Authentication Boundaries:**
- /api/workbench/materialize-drive: Workbench auth
- /api/drive/ingest: Drive auth + Workbench auth + corpus authorization
- /api/media/reconciliation: Workbench auth

**Identity Carried:**
- sessionId (via cookie)
- fileId (Drive source)
- contentHash (stable identity)
- mediaId (PublishedMediaAsset)
- slotId (assignment target)

**Storage:**
- Redis (sessions, credentials, assignments, media)
- Vercel Blob (variants)
- Google Drive (source bytes)

**Expected Response:**
- materialize-drive: { success: true, asset: PublishedMediaAsset }
- verify-materialization: { complete: boolean, details: {...} }
- reconciliation: { reconciled: boolean, updated: string[] }

**Failure Behavior:**
- No auth: 401
- No corpus authorization: 403
- File not found: 404
- Sharp unavailable: 503
- Blob upload failure: 500
- KV failure: 500

---

## BROKEN EDGE IDENTIFIED ✅ FIXED

**Problem:** /api/workbench/materialize-drive did not exist
**Impact:** Drive file selection → 404 → materialization fails
**Fix:** Created bridge endpoint that wraps /api/drive/ingest
**Commit:** 414f22c

---

## NEXT STEPS IN AUDIT

1. ✅ GIT STATE - Verified
2. ✅ ARCHITECTURE MAPS - Built
3. ⏳ TRACE ONE REAL PHOTO - In progress
4. ⏳ WORKBENCH API CONTRACT CHECK - Pending
5. ⏳ OBJECT-LEVEL AUTHORIZATION - Pending
6. ⏳ SHARED DRIVE NAVIGATION - Pending
7. ⏳ MY DRIVE NAVIGATION - Pending
8. ⏳ MATERIALIZATION BOUNDARY AUDIT - Pending
9. ⏳ MEDIA AUTHORITY VERIFICATION - Pending
10. ⏳ PROVENANCE CHAIN - Pending
11. ⏳ BYPASS SEARCH - Pending
12. ⏳ FAILURE PATHS - Pending
13. ⏳ CI VERIFICATION - Pending
14. ⏳ DEPLOYMENT VERIFICATION - Pending
