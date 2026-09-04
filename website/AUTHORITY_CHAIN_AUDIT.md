# Authority Chain Integration Audit

**Date**: 2025-01-06
**Scope**: End-to-end authority chain verification for Happy Place Platform Drive integration
**Commit**: ace064b

## Executive Summary

The authority chain has **multiple alternative paths** that bypass the canonical authority flow. This creates security and consistency risks where operations can resolve credentials through different mechanisms, potentially leading to TOCTOU (time-of-check-time-of-use) vulnerabilities and inconsistent state.

## Critical Findings

### 🔴 CRITICAL: Two Drive Client Construction Paths

**Problem**: The system has two separate paths for constructing Drive API clients, creating a split authority boundary.

**Path A (Canonical)**:
```
oauth-manager.getDriveClient()
  → session resolution
  → authorization resolution
  → decrypt
  → explicit refresh if needed
  → persist refreshed credentials
  → Drive client
```

**Path B (Alternative)**:
```
driveSession.getDriveClient()
  → session resolution
  → authorization resolution
  → decrypt
  → new OAuth2()
  → setCredentials()
  → Drive client
```

**Key Difference**: Path B does NOT use the explicit refresh/persistence mechanism from oauth-manager. It constructs a fresh OAuth2 client with credentials but does not handle refresh or persistence.

**Current Usage**:
- ✅ `drive-discovery.ts` uses `getDriveClient()` from oauth-manager (Path A)
- ✅ `corpus-authorization.ts` uses `getDriveClient()` from oauth-manager (Path A)
- ❌ `/api/admin/diagnostic/shared-drives` uses `driveSession.getDriveClient()` (Path B)
- ❌ `/api/admin/oauth/verification` uses `driveSession.getDriveClient()` (Path B)

**Risk**: Path B can be used with stale/expired credentials that Path A would have refreshed. This creates inconsistent authority states.

**Fix Required**: Eliminate Path B. All Drive API access MUST resolve through oauth-manager.

---

### 🟠 HIGH: Drive Auth Race Condition (PARTIALLY FIXED)

**Problem**: connectors/page.tsx previously launched `loadConnectors()` and `checkDriveAuth()` concurrently, creating a race where both could modify the same authorization/session.

**Current State**: Lines 38-41 show the page now does:
```typescript
useEffect(() => {
  // P0 FIX: Single authoritative auth-status check first, then discovery
  checkDriveAuth();
}, []);
```

And `checkDriveAuth()` only calls `loadConnectors()` if authenticated (line 134).

**Status**: ✅ FIXED - The race condition has been eliminated by making auth status the gate for discovery.

---

### 🟠 HIGH: Storage Repair Logic Executes Writes Without Validation

**Problem**: `/api/admin/diagnostic/media-storage-repair` claims to be diagnostic but executes writes to production KV without forensic validation.

**Current Logic**:
```typescript
if (correctStorage) {
  const repairedMedia = { ...media, storage: correctStorage };
  await saveMedia(repairedMedia); // Immediately writes to production
  repaired.push(mediaId);
}
```

**Risk**: "No Blob found" does not prove an asset is static. This could misclassify blob-backed media whose Blob lookup failed as static, hiding a real storage defect.

**Fix Required**: Make the endpoint diagnostic-first:
1. Classify records into categories (definitely static, definitely blob, ambiguous)
2. Report classification counts
3. Only repair unambiguous records (definitely static with no contentHash, definitely blob with Blob metadata)
4. Require explicit confirmation for ambiguous records

---

### 🟡 MEDIUM: Direct media.v1.json Reads (ACCEPTABLE)

**Finding**: Direct reads of `media.v1.json` exist in:
- `/api/admin/deploy` (bootstrap operations)
- `/api/admin/media/reconcile` (reconciliation operations)

**Assessment**: These are legitimate admin/bootstrap operations that need access to the static authority file for recovery and reconciliation. They are NOT bypassing the authority chain for production runtime.

**Status**: ✅ ACCEPTABLE - These are intentional bootstrap operations, not runtime bypasses.

---

### 🟡 MEDIUM: Assignment Validation at Write Time (GOOD)

**Finding**: `assignment-store.ts` has proper validation at write time (lines 387-395):
```typescript
if (assignment.mediaId.startsWith('drive-') || assignment.mediaId.startsWith('drive-ref-')) {
  throw new Error(`Drive-prefixed IDs cannot be assigned to public presentation: ${assignment.mediaId}`);
}
```

And resolves the media before assignment (lines 400-411):
```typescript
const resolvedMedia = await resolvePublicMedia(assignment.mediaId);
if (!resolvedMedia) {
  throw new Error(`Media ID does not resolve to a valid PublishedMediaAsset: ${assignment.mediaId}`);
}
```

**Status**: ✅ GOOD - Drive references cannot become public assignments without materialization.

---

### 🟡 MEDIUM: Explorer Shows Both My Drive and Shared Drives (GOOD)

**Finding**: `drive/page.tsx` lines 62-85 show both My Drive and Shared Drives are displayed at the top level:
```typescript
if (structure.myDrive) {
  items.push({ /* My Drive */ });
}
if (structure.sharedDrives && structure.sharedDrives.length > 0) {
  items.push(...structure.sharedDrives.map(/* Shared Drives */));
}
```

**Status**: ✅ GOOD - The Explorer correctly shows both My Drive and Shared Drives. The earlier concern about hiding My Drive is not present in the current code.

---

### 🔴 CRITICAL: Missing Object-Level Authorization

**Problem**: The Drive API endpoints do not verify that requested objects belong to the authenticated user's authorized context.

**Current Model**: Relies on Google's API to reject inaccessible objects.

**Risk**: A user could supply an arbitrary Drive file ID that Google happens to permit (e.g., a file shared with them) and thereby bypass the application's corpus boundary.

**Affected Endpoints**:
- `/api/drive/files/[fileId]/thumbnail`
- `/api/drive/folder/[folderId]`
- `/api/drive/ingest`
- `/api/drive/reference`

**Fix Required**: Add explicit object-level authorization:
1. Resolve Drive context from session/authorization
2. Verify requested object belongs to that context
3. Only then proceed with Google API operation

---

### 🔴 CRITICAL: Shared Drive Search Contract Mismatch

**Problem**: Client sends `driveId` but server expects `corpusId`.

**Client** (drive/page.tsx):
```typescript
params.set('driveId', state.activeDriveId);
```

**Server** (drive/search/route.ts):
```typescript
const corpusId = searchParams.get('corpusId') || undefined;
```

**Result**: Shared Drive search context is lost. The server falls through to `corpora = 'user'` (My Drive), so search effectively becomes a My Drive search even when browsing a Shared Drive.

**Fix Required**: Unify the contract - use `driveId` everywhere or `corpusId` everywhere, and ensure context is preserved end-to-end.

---

## Authority Chain Map

### Intended Chain (Canonical)
```
Google OAuth identity
  → Authorization (oauth-credential-store)
  → Session (session-store)
  → oauth-manager.getDriveClient()
  → Drive API
  → Drive source/reference
  → materialization
  → PublishedMediaAsset (media-kv-store)
  → media authority (resolvePublicMedia)
  → assignment (assignment-store)
  → public site
```

### Actual Chain (With Bypasses)
```
Google OAuth identity
  → Authorization (oauth-credential-store)
  → Session (session-store)
  ├─→ oauth-manager.getDriveClient() ✅ (canonical)
  └─→ driveSession.getDriveClient() ❌ (alternative, no refresh)
  → Drive API
  → Drive source/reference
  → materialization
  → PublishedMediaAsset (media-kv-store)
  → media authority (resolvePublicMedia)
  → assignment (assignment-store)
  → public site
```

## Required Fixes

### P0: Eliminate Alternative Drive Client Path
1. Remove `driveSession.getDriveClient()` method
2. Update `/api/admin/diagnostic/shared-drives` to use `oauth-manager.getDriveClient()`
3. Update `/api/admin/oauth/verification` to use `oauth-manager.getDriveClient()`
4. Ensure all Drive API access resolves through oauth-manager

### P0: Add Object-Level Authorization
1. Create `verifyObjectInContext()` function in corpus-authorization.ts
2. Apply to `/api/drive/files/[fileId]/thumbnail`
3. Apply to `/api/drive/folder/[folderId]`
4. Apply to `/api/drive/ingest`
5. Apply to `/api/drive/reference`

### P0: Fix Shared Drive Search Contract
1. Unify client/server contract to use `driveId` everywhere
2. Ensure Explorer's `activeDriveId` is preserved through search
3. Add regression test for context preservation

### P0: Make Storage Repair Diagnostic-First
1. Add classification logic (definitely static, definitely blob, ambiguous)
2. Report classification counts without writing
3. Add separate repair endpoint for unambiguous records
4. Require explicit confirmation for ambiguous records

### P1: Add Negative Tests
1. Test: legacy credential cookies + no drive_session_id → 401/403
2. Test: revoked authorization + old session → 401/403
3. Test: User A session + User B authorization/file ID → denied
4. Test: Shared Drive A context + Shared Drive B object → denied
5. Test: DriveReference → public assignment without materialization → denied
6. Test: invalid OAuth state → denied
7. Test: same OAuth state consumed twice → second attempt denied
8. Test: expired/revoked authorization → Drive API denied

## Verification Sequence

After fixes are deployed, verify in this exact order:

1. `/workbench` → loads
2. Drive authentication status → shows correct state
3. Re-authenticate → OAuth flow completes
4. Google consent → scopes correct (openid/profile/email + drive.readonly)
5. OAuth callback → session issued
6. `/api/drive/auth/status` → authenticated: true
7. `/api/drive/discovery` → My Drive appears
8. `/api/drive/discovery` → Shared Drives appear
9. Enter Shared Drive → context preserved
10. Enter folder → context preserved
11. Paginate → context preserved
12. Context-scoped search → results from correct corpus
13. Thumbnail → loads
14. Select asset → DriveReference created
15. Materialize → PublishedMediaAsset created
16. Assignment → assignment migrated
17. Public media resolves → shows materialized asset
18. Public site displays it → shows correctly

## Conclusion

The authority chain has **structural problems** that must be fixed before declaring the Drive integration complete. The system currently has alternative paths that bypass the canonical authority flow, missing object-level authorization, and a contract mismatch that causes context loss.

The good news is that the assignment validation and Explorer UI are correct. The bad news is that the core Drive API access has a split authority boundary that needs to be unified.
