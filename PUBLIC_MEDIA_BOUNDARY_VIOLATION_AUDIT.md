# PUBLIC MEDIA BOUNDARY VIOLATION AUDIT

## CRITICAL FINDING: Services Page Uses Unsafe Media Resolution

### 🚨 VIOLATION: Public Services Page Resolves Drive-Prefixed IDs

**Location:** `src/app/services/page.tsx` (lines 33-37)

**Code:**
```typescript
// Resolve media object - use async KV lookup for drive-prefixed IDs
let mediaObject: Media | null = null;
if (assignment.mediaId.startsWith('drive-')) {
  mediaObject = await getMediaByIdAsync(assignment.mediaId);
} else {
  mediaObject = getMediaById(assignment.mediaId);
}
```

**Problem:**
- The services page is a **public page** (no authentication required)
- It explicitly checks for `drive-` prefixed IDs and resolves them via `getMediaByIdAsync()`
- This **bypasses the constitutional public media gate** (`resolvePublicMedia()`)
- Drive references (`drive-*` and `drive-ref-*`) can leak into public presentation

**Comparison with Homepage (Correct Implementation):**
```typescript
// src/app/page.tsx (lines 93-94)
// Resolve media object through public media gate (rejects Drive references)
const mediaObject = await resolvePublicMedia(assignment.mediaId);
```

**Impact:**
- Drive references (which have Drive URLs in variants) can be displayed on the public services page
- This violates the constitutional rule that published media must not have Drive dependencies
- The assignment gate works correctly, but the public resolver is bypassed

---

## DRIVE URL EXPOSURE AUDIT

### Drive URL Fields in Type Definitions

**Location:** `src/types/media.ts`

**Fields:**
```typescript
drive?: {
  fileId: string;
  driveId?: string;
  name: string;
  mimeType: string;
  webViewUrl: string;      // ← Drive URL
  modifiedTime: string;
};
```

**Exposure Points:**

#### 1. Workbench UI (ALLOWED)
- `src/app/workbench/media/page.tsx` - Multiple Drive URL references
- `src/app/workbench/explorer/drive/page.tsx` - Drive URL references
- These are behind Workbench authentication (in production)

#### 2. Drive Thumbnail Proxy (ALLOWED)
- `src/app/api/drive/files/[fileId]/thumbnail/route.ts` - Drive proxy route
- Authentication protected (bypassed in development)
- Cache-Control: public, max-age=3600 (potential issue)

#### 3. Drive Reference Creation (ALLOWED)
- `src/app/api/drive/reference/route.ts` - Creates Drive references
- Authentication protected (bypassed in development)
- Intentionally creates Drive URL-bearing records

#### 4. Drive Materialization (ALLOWED)
- `src/app/api/drive/ingest/route.ts` - Converts Drive to local
- Authentication protected (bypassed in development)
- Provenance tracks Drive origin without creating dependency

#### 5. Services Page (VIOLATION)
- `src/app/services/page.tsx` - Resolves drive-prefixed IDs publicly
- No authentication required
- Bypasses `resolvePublicMedia()` gate

#### 6. Service Detail Page (POTENTIAL VIOLATION)
- `src/app/services/[slug]/page.tsx` - Comment mentions drive-prefixed IDs
- Need to verify actual implementation

---

## DRIVE PREFIX ID AUDIT

### Occurrences of `drive-` Pattern

#### 1. Ingest Route (Constitutional)
- `src/app/api/drive/ingest/route.ts` - Lines 333-338
- Comment: "PublishedMediaAsset must NOT use drive- prefix"
- Implementation: Content-based ID without drive- prefix

#### 2. Reference Route (Constitutional)
- `src/app/api/drive/reference/route.ts` - Line 119
- Creates `drive-ref-{sourceIdentityHash}` IDs
- Intentional: Drive references use drive-ref- prefix

#### 3. Assignment Store (Constitutional)
- `src/lib/assignment-store.ts` - Line 114
- Rejects drive-prefixed IDs at write time
- "drive- and drive-ref- prefixes are reserved for DriveReference only"

#### 4. Public Resolver (Constitutional)
- `src/lib/media.ts` - `resolvePublicMedia()` function
- Rejects drive-prefixed IDs

#### 5. Services Page (VIOLATION)
- `src/app/services/page.tsx` - Line 33
- Explicitly checks for drive-prefixed IDs
- Bypasses constitutional gate

---

## CACHE-CONTROL AUDIT

### Drive Thumbnail Proxy Cache

**Location:** `src/app/api/drive/files/[fileId]/thumbnail/route.ts`

**Cache Header:**
```typescript
Cache-Control: public, max-age=3600
```

**Analysis:**
- This is an authenticated Workbench Drive proxy
- The URL itself is not exposed publicly
- However, if the URL were leaked, the response would be publicly cacheable
- This could bypass the intended authorization boundary

**Recommendation:**
- Change to `Cache-Control: private, max-age=3600` or `no-store`
- Or add authentication-specific cache keys

---

## WORKBENCH API EXPOSURE AUDIT

### Drive API Routes (All Under /api/drive/)

**Routes:**
- `/api/drive/files/[fileId]/thumbnail` - Drive proxy
- `/api/drive/ingest` - Materialization
- `/api/drive/reference` - Reference creation
- `/api/drive/files` - File listing
- `/api/drive/folder/[folderId]` - Folder listing
- `/api/drive/discovery` - Drive discovery
- `/api/drive/oauth/authorize` - OAuth
- `/api/drive/oauth/callback` - OAuth callback
- `/api/drive/auth/status` - Auth status

**Authentication Status:**
- All routes have authentication checks
- All routes have development bypass: `if (process.env.NODE_ENV === 'development')`

**Public Exposure:**
- None of these routes are exposed in public-facing pages
- They are only used in Workbench UI (behind authentication)

---

## PUBLIC RESOLVER AUDIT

### resolvePublicMedia() Function

**Location:** `src/lib/media.ts`

**Implementation:**
```typescript
export async function resolvePublicMedia(mediaId: string): Promise<Media | null> {
  // Implementation rejects drive-prefixed IDs
  // Implementation validates PublishedMediaAsset contract
}
```

**Constitutional Gate:**
- Rejects drive-prefixed IDs
- Validates lifecycleState === 'published'
- Validates source === 'local'
- Validates no Drive field
- Validates no Drive URLs in variants

**Where Used:**
- `src/app/page.tsx` (homepage) - ✅ Correct usage
- `src/app/services/page.tsx` - ❌ NOT USED (bypassed)
- `src/app/services/[slug]/page.tsx` - Need to verify

---

## ROOT CAUSE ANALYSIS

### Why the Services Page Bypass Exists

**Hypothesis:**
The services page was written before the constitutional public media gate was established. The comment "For drive-prefixed IDs, resolve via async KV lookup" suggests this was intentional at the time, but now violates the constitutional architecture.

**Timeline:**
1. Drive references were created for Workbench browsing
2. Assignment system was built to support Drive references
3. Services page was written to resolve Drive references
4. Constitutional gate (`resolvePublicMedia()`) was established
5. Homepage was updated to use the gate
6. Services page was NOT updated to use the gate

**Impact:**
- There is a **public-facing constitutional violation**
- Drive references can leak into public presentation
- The assignment gate works, but the public resolver is bypassed

---

## EXPOSURE CLASSIFICATION TABLE

| Location | Drive URL Fields | Drive Prefix IDs | /api/drive/ URLs | Authentication | Public Exposure | Constitutional |
|----------|------------------|------------------|------------------|----------------|-----------------|----------------|
| Workbench UI | YES | YES | YES | Required (dev bypass) | NO | ✅ ALLOWED |
| Drive Thumbnail Proxy | YES | NO | YES | Required (dev bypass) | NO | ✅ ALLOWED |
| Drive Reference API | YES | YES | YES | Required (dev bypass) | NO | ✅ ALLOWED |
| Drive Ingest API | NO | NO | YES | Required (dev bypass) | NO | ✅ ALLOWED |
| Homepage | NO | NO | NO | None | YES | ✅ CONSTITUTIONAL |
| Services Page | POTENTIAL | YES | NO | None | YES | ❌ VIOLATION |
| Service Detail Page | POTENTIAL | POTENTIAL | NO | None | YES | ⚠️ NEEDS VERIFICATION |
| Public Resolver | NO | NO | NO | None | YES | ✅ CONSTITUTIONAL |

---

## REMEDIATION PLAN

### P0: Fix Services Page Constitutional Violation

**File:** `src/app/services/page.tsx`

**Change:**
```typescript
// BEFORE (lines 31-37)
let mediaObject: Media | null = null;
if (assignment.mediaId.startsWith('drive-')) {
  mediaObject = await getMediaByIdAsync(assignment.mediaId);
} else {
  mediaObject = getMediaById(assignment.mediaId);
}

// AFTER
const mediaObject = await resolvePublicMedia(assignment.mediaId);
```

**Rationale:**
- Use the constitutional public media gate
- Drive references will be rejected at the gate
- Consistent with homepage implementation
- Removes public Drive URL exposure

### P0: Verify Service Detail Page

**File:** `src/app/services/[slug]/page.tsx`

**Action:**
- Read the full implementation
- Verify if it uses `resolvePublicMedia()` or bypasses the gate
- Fix if bypass exists

### P1: Fix Drive Thumbnail Proxy Cache

**File:** `src/app/api/drive/files/[fileId]/thumbnail/route.ts`

**Change:**
```typescript
// BEFORE
Cache-Control: public, max-age=3600

// AFTER
Cache-Control: private, max-age=3600
```

**Rationale:**
- Prevents publicly cacheable responses from surviving beyond auth boundary
- Defense in depth for Drive proxy route

### P1: Remove Development Authentication Bypass

**Files:**
- `src/app/api/drive/reference/route.ts`
- `src/app/api/drive/ingest/route.ts`
- `src/app/api/admin/services/card/route.ts`

**Action:**
- Remove or restrict the `NODE_ENV === 'development'` bypass
- Even in development, require some form of authentication
- Consider using a development-only API key

---

## VERIFICATION CHECKLIST

After remediation:

- [ ] Services page uses `resolvePublicMedia()` for all media resolution
- [ ] Service detail page uses `resolvePublicMedia()` for all media resolution
- [ ] No public page uses `getMediaByIdAsync()` for drive-prefixed IDs
- [ ] Drive thumbnail proxy uses `Cache-Control: private`
- [ ] Development authentication bypass is removed or restricted
- [ ] Test services page with drive-prefixed assignment (should resolve to null)
- [ ] Test services page with PublishedMediaAsset assignment (should resolve correctly)
- [ ] Test homepage still works correctly (regression test)

---

## CURRENT ASSESSMENT

### Constitutional Validity: 🔴 VIOLATION FOUND

**Evidence:**
- Services page bypasses constitutional public media gate
- Drive-prefixed IDs can leak into public presentation
- Drive URLs can be exposed on public pages

### Severity: P0 CRITICAL

**Reasoning:**
- This is a public-facing constitutional violation
- The constitutional architecture is designed to prevent Drive URL exposure
- The violation bypasses the entire gate system

### Assignment Gates: ✅ WORKING

**Evidence:**
- Assignment store rejects drive-prefixed IDs at write time
- Assignment store validates mediaId resolves to PublishedMediaAsset
- Gates are working correctly

### Public Resolver: ✅ WORKING BUT NOT USED EVERYWHERE

**Evidence:**
- `resolvePublicMedia()` correctly rejects Drive references
- Homepage uses the gate correctly
- Services page bypasses the gate

---

## CEO VERDICT REQUIRED

This audit found a **P0 CRITICAL** constitutional violation:
- The services page bypasses the constitutional public media gate
- Drive references can leak into public presentation
- This violates the constitutional rule that published media must not have Drive dependencies

The fix is straightforward (use `resolvePublicMedia()` instead of direct KV lookup), but this represents a significant architectural oversight that needs immediate attention.
