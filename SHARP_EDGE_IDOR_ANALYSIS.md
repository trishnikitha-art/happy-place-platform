# Sharp Edge #10: Object-Level Authorization / IDOR Analysis

**Date:** 2025-01-XX
**Commit:** 238f89b

## The IDOR Question

**Question:** If User A authenticates with their Google Drive, can User A submit User B's `fileId`, `folderId`, or `driveId` and access User B's data?

## Current Implementation

### Drive Discovery (`listChildren`)

**File:** `website/src/lib/drive/drive-discovery.ts`

```typescript
async listChildren(context: DriveListContext, pageToken?: string): Promise<DriveListResult> {
  if (!(await isAuthenticated())) {
    throw new Error('Not authenticated with Drive');
  }

  const drive = await getDriveClient();

  // Caller provides: context.parentId, context.driveId
  if (context.driveId) {
    params.corpora = 'drive';
    params.driveId = context.driveId;
    // ...
  }
}
```

**Analysis:**
- The function accepts caller-supplied `parentId` and `driveId`
- These are passed directly to Google Drive API
- No validation that the caller has access to the specified Drive/folder

### Google Drive API Access Control

**How Google Drive API works:**
- Access control is enforced by Google based on the OAuth token
- If User A's token tries to access User B's file/folder/Drive, Google rejects it
- The API returns `403 Forbidden` or `404 Not Found` for unauthorized access

**Current architecture relies on Google's access control.**

## IDOR Risk Assessment

### Scenario 1: User A submits User B's fileId

**Current behavior:**
- User A's OAuth token is used
- Google Drive API checks if User A has access to User B's file
- If User A does NOT have access, Google rejects the request
- **Result: SAFE (relies on Google's access control)**

### Scenario 2: User A submits User B's Shared Drive ID

**Current behavior:**
- User A's OAuth token is used
- Google Drive API checks if User A has access to User B's Shared Drive
- If User A does NOT have access, Google rejects the request
- **Result: SAFE (relies on Google's access control)**

### Scenario 3: User A has access to User B's Shared Drive (shared permission)

**Current behavior:**
- User A's OAuth token is used
- Google Drive API allows access because User A has permission
- User A can browse User B's Shared Drive
- **Result: CORRECT (User A has legitimate access)**

### Scenario 4: Pagination token from different context

**Current behavior:**
- Pagination token is passed directly to Google Drive API
- Google validates the token against the Drive context
- If token is invalid or from different context, Google rejects it
- **Result: SAFE (relies on Google's validation)**

## Assessment

**Current architecture relies on Google Drive API's access control.**

This is acceptable because:
1. **Google is the authoritative access control** - Google Drive's permissions are the source of truth
2. **OAuth tokens are scoped to the user** - User A's token cannot access User B's private data
3. **Reimplementing access control would be redundant** - We would need to mirror Google's permission system
4. **Complex permission models** - Google Drive has complex sharing permissions that would be difficult to replicate

## Potential Issue: Drive ID Validation

**Question:** Should we validate that the caller-supplied `driveId` is one the user has access to, before making the API call?

**Analysis:**
- The current approach relies on Google to reject invalid `driveId`
- A pre-validation would require calling `drive.drives.list()` to get the user's accessible drives
- This adds an extra API call for every Drive operation
- The security benefit is minimal (Google would reject anyway)

**Recommendation:** Current approach is acceptable. Pre-validation is not required.

## Missing Validation: None Required

The current implementation correctly:
1. Authenticates the user via OAuth
2. Uses the user's OAuth token for all Drive API calls
3. Relies on Google Drive API's access control
4. Does not implement custom access control (which would be redundant)

## Verdict

**SAFE - Relies on Google Drive API's authoritative access control.**

The IDOR risk is mitigated because:
- All Drive API calls use the authenticated user's OAuth token
- Google Drive API enforces access control based on the token
- User A cannot access User B's private data via User A's token
- Shared access requires explicit sharing permissions in Google Drive

**No additional validation required.**

## Note on Pagination Tokens

Pagination tokens are passed directly to Google Drive API. Google validates these tokens. If a caller attempts to use a pagination token from a different Drive context, Google will reject it. This is safe.

## Future Enhancement (Optional)

If custom access control is required in the future (e.g., to restrict users to specific Shared Drives regardless of Google permissions), then:
1. Add validation that the caller-supplied `driveId` is in an allowlist
2. Call `drive.drives.list()` to get the user's accessible drives
3. Validate the requested `driveId` is in the list

However, this is not required for the current Media Workbench use case.
