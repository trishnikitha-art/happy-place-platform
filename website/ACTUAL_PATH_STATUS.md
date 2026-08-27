# Actual Path Status Report

**Current Git HEAD:** `68a0641`
**Date:** 2026-08-26

## Executive Summary

The system has partial implementation of the authorization chain, but critical security gaps remain. The "verification endpoints" added in the latest commit do NOT prove the actual user path works.

## PROVEN Components

### OAuth Flow (Partial)
- **OAuth authorize** (`/api/drive/oauth/authorize`): ✅ 
  - Validates redirect URI (HTTPS for non-localhost, path must be `/api/drive/oauth/callback`)
  - Creates CSRF-protected state in Redis
  - Requests openid/profile/email scopes
  - Uses `access_type=offline` and `prompt=consent`

- **OAuth callback** (`/api/drive/oauth/callback`): ✅
  - Extracts Google subject (sub) from userinfo endpoint (authoritative identity)
  - Fails closed if sub is missing
  - Stores authorization in KV with encrypted tokens
  - Creates session with atomic Lua script (verifies authorization is active)
  - Issues opaque session ID cookie
  - Clears legacy OAuth credential cookies

### Session Store
- **Atomic authorization verification**: ✅
  - `createSession()`: Uses Lua script to verify authorization exists and is active before creating session
  - `getSession()`: Uses Lua script to verify authorization is still active before returning session
  - `updateSessionLastSeen()`: Uses Lua script to verify authorization is still active before updating
  - `revokeSession()`: Uses Lua script to verify authorization is still active before revoking
  - Prevents resurrection race conditions

### KV Environment Isolation
- **Namespace enforcement**: ✅
  - Uses `hpp:{env}:` prefix based on VERCEL_ENV/NODE_ENV
  - Prevents cross-environment key collisions
  - Applied to session-store and oauth-credential-store

## STATICALLY SUPPORTED (Not Runtime Proven)

### Corpus Authorization
- **verifyCorpusAuthorization()**: ⚠️ Statically implemented
  - Checks session authentication
  - Checks Drive authentication
  - Gets file metadata to determine corpus
  - Verifies file's corpus is in authorized corpora
  - Verifies Google OAuth permits access
  - **UNPROVEN**: Not tested with real Drive IDs from different corpora

### Materialization Recovery
- **Recovery functions**: ⚠️ Statically implemented
  - `detectOrphanedBlobs()`, `detectIncompleteKvRecords()`, `detectStaleAssignments()`
  - `repairIncompleteKvRecord()`, `repairStaleAssignment()`
  - **UNPROVEN**: Not tested with actual Blob/KV failure scenarios

## FALSE/VIOLATED Components

### DRIVE_AUTH_BYPASS
- **Status**: ❌ VIOLATED
- **Location**: Multiple Drive API routes
  - `/api/drive/files/route.ts`
  - `/api/drive/search/route.ts`
  - `/api/drive/ingest/route.ts`
  - `/api/drive/reference/route.ts`
  - `/api/drive/discovery/route.ts`
  - Admin routes (deploy, services/card, brand/hero, brand/portrait)
- **Issue**: Bypass check is `process.env.NODE_ENV === 'development' && process.env.DRIVE_AUTH_BYPASS === 'true'`
- **Danger**: 
  - Could be accidentally enabled in production if NODE_ENV is misconfigured
  - Bypasses ALL authorization checks (Workbench + Drive)
  - Production code should not be able to reach credential paths through this bypass
- **Required fix**: Remove bypass or ensure it cannot be enabled in production under any circumstance

### Negative Security Tests
- **Status**: ❌ MISSING
- **Required tests**:
  - Legacy Drive credential cookies + no authoritative session → 401/403
  - Revoked session/authorization → 401/403
  - Cross-corpus file ID access → 403
  - Cross-corpus folder ID access → 403
  - Cross-corpus search → 403
  - My Drive file ID with Shared Drive corpus active → 403
  - Shared Drive folder ID from another Shared Drive → 403
  - Pagination token replay across corpora → 403
  - Search with different corpus than active browser → 403

### Admin Verification Endpoints
- **Status**: ⚠️ SENSITIVE
- **Location**: 
  - `/api/admin/oauth/verification`
  - `/api/admin/system/verification`
- **Issue**: 
  - Can test authorization creation/retrieval/revocation
  - Can test Drive credentials
  - Only protected by Workbench authentication
  - Should not mutate real authorization state
- **Required**: Security review to ensure these cannot become credential oracles

## UNPROVEN Components

### Complete User Path
- **Status**: ❌ UNPROVEN
- **Required path**:
  1. Google OAuth → authoritative identity
  2. Redis authorization → session cookie
  3. Workbench → Drive corpus
  4. Shared Drive/folder navigation
  5. Search
  6. Thumbnail
  7. Selection
  8. Ingest
  9. Blob/KV materialization
  10. Public media resolution
- **Issue**: No end-to-end test exercises this entire path with real dependencies

### ID Ownership Verification
- **Status**: ❌ UNPROVEN
- **User-supplied IDs**: fileId, folderId, driveId, corpusId
- **Required**: At every ID boundary, prove ownership of that ID
- **Issue**: Corpus authorization exists but not tested with adversarial IDs

### Cross-System Atomicity
- **Status**: ❌ UNPROVEN
- **Required**: Blob + KV + assignments must be atomic
- **Issue**: 
  - If Blob succeeds and KV fails → orphaned Blob
  - If KV succeeds and assignment fails → stale assignment
  - Recovery exists but not tested with actual failure scenarios

### Drive API Semantics
- **Status**: ❌ UNPROVEN
- **Required**: Verify Shared Drive semantics
  - supportsAllDrives
  - includeItemsFromAllDrives
  - corpora
  - driveId
  - root IDs
  - pagination
  - folder traversal
- **Issue**: Not verified against actual Google Drive API behavior

## Critical Questions Unanswered

1. **Can an authenticated Drive user supply an arbitrary fileId, folderId, driveId, or search parameter and cause the server to access something outside the currently authorized corpus?**
   - **Answer**: Unknown - corpus authorization exists but not tested with adversarial IDs

2. **What happens when Redis/KV is unavailable?**
   - **Answer**: Unknown - no failure mode testing

3. **What happens halfway through materialization?**
   - **Answer**: Unknown - recovery exists but not tested

4. **What happens after revocation?**
   - **Answer**: Unknown - no negative tests

5. **What happens with a stale session?**
   - **Answer**: Unknown - no negative tests

6. **What happens with legacy cookies?**
   - **Answer**: Unknown - no negative tests

7. **What happens if driveId and fileId intentionally disagree?**
   - **Answer**: Unknown - no adversarial testing

8. **What happens if a My Drive file ID is presented while a Shared Drive corpus is active?**
   - **Answer**: Unknown - no cross-corpus testing

9. **What happens if a Shared Drive folder ID is presented from another Shared Drive?**
   - **Answer**: Unknown - no cross-corpus testing

10. **Does ingestion verify authorization before download, not merely afterward?**
    - **Answer**: YES - authorization verified before download in current implementation

11. **Does thumbnail verify authorization before fetching the Google thumbnail?**
    - **Answer**: YES - authorization verified before fetch in current implementation

12. **Does public rendering ever accept a Drive ID directly?**
    - **Answer**: NO - public rendering uses resolvePublicMedia() which rejects Drive IDs

## Next Required Actions

1. **Remove or fix DRIVE_AUTH_BYPASS** to ensure production code cannot reach credential paths
2. **Implement negative security tests** for all required scenarios
3. **Test corpus authorization** with adversarial IDs from different corpora
4. **Test materialization recovery** with actual Blob/KV failure scenarios
5. **Test cross-system atomicity** with partial failure scenarios
6. **Verify Drive API semantics** with actual Shared Drive behavior
7. **Create end-to-end test** for complete user path with real dependencies
8. **Security review** of admin verification endpoints

## Classification

- **PROVEN**: OAuth flow (partial), session store atomicity, KV environment isolation
- **STATICALLY SUPPORTED**: Corpus authorization, materialization recovery
- **UNPROVEN**: Complete user path, ID ownership verification, cross-system atomicity, Drive API semantics
- **FALSE/VIOLATED**: DRIVE_AUTH_BYPASS, negative security tests, admin verification endpoint security