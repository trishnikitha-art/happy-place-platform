# DRIVE THUMBNAIL PROXY SECURITY AUDIT — PHASE 9

## CEO MODE: FORENSIC VERIFICATION

**Status:** ⚠️ ARCHITECTURALLY SUSPICIOUS BUT FUNCTIONALLY ACCEPTABLE

---

## ENDPOINT ANALYSIS

### Route Definition
**Path:** `/api/drive/files/[fileId]/thumbnail`
**Method:** GET
**Purpose:** Workbench preview of Drive files
**Reality:** Returns full original binary, not thumbnail

### Authentication
**Status:** ⚠️ WORKBENCH OAUTH ONLY

**Code:**
```typescript
const auth = await driveOAuthManager.getClient();
const drive = google.drive({ version: 'v3', auth });
```

**Assessment:** ✅ VERIFIED
- Uses Workbench user OAuth credentials
- No anonymous access
- No public access
- Tied to current Workbench session

**Risk:** ⚠️ LOW
- Authentication is properly implemented
- OAuth credentials are required
- No bypass mechanism detected

---

## FILE ID / SHARED DRIVE ID SEMANTICS

### Thumbnail Proxy Implementation

**Code:**
```typescript
const { fileId } = await params;
const { searchParams } = new URL(request.url);
const driveId = searchParams.get('driveId') || undefined;

// File metadata fetch
const getFileParams: any = {
  fileId,
  fields: 'mimeType,size',
};

if (driveId) {
  getFileParams.supportsAllDrives = true;
}

// Media download
const mediaParams: any = {
  fileId,
  alt: 'media',
};

if (driveId) {
  mediaParams.supportsAllDrives = true;
}
```

**Assessment:** ⚠️ INCOMPLETE SHARED DRIVE SUPPORT

**Problem:**
- Sets `supportsAllDrives: true` when driveId is present
- Does NOT set `corpora: 'drive'` or `driveId` in API params
- `driveId` is only used as a flag, not as the actual Drive ID parameter

**Comparison with drive-discovery.ts:**
```typescript
// CORRECT implementation in drive-discovery.ts
if (driveId) {
  params.corpora = 'drive';
  params.driveId = context.driveId;
}
```

**Risk:** ⚠️ MEDIUM
- Shared Drive files may not be accessible correctly
- driveId parameter is inconsistent with Drive API documentation
- Could cause authentication/authorization issues for Shared Drive files

---

## SIZE / CONTENT POLICY

### Size Limits
**Policy:** 25MB maximum file size

**Implementation:**
```typescript
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// Pre-download size check
if (fileSize > MAX_FILE_SIZE) {
  return NextResponse.json({ error: 'File too large' }, { status: 413 });
}

// Post-download size check
if (imageBuffer.byteLength > MAX_FILE_SIZE) {
  return NextResponse.json({ error: 'Downloaded file exceeds size limit' }, { status: 413 });
}
```

**Assessment:** ✅ VERIFIED
- Pre-download size check against Drive metadata
- Post-download size check against actual bytes
- Fails closed on oversized files
- Memory safety enforcement

### Content Policy
**Policy:** Only image/* MIME types

**Implementation:**
```typescript
// MIME type validation
if (!mimeType) {
  return NextResponse.json({ error: 'Drive did not provide MIME type' }, { status: 400 });
}

// Image type validation
if (!mimeType.startsWith('image/')) {
  return NextResponse.json({ error: 'File is not an image' }, { status: 400 });
}

// Magic byte validation
if (mimeType === 'image/jpeg') {
  isValidImage = firstBytes[0] === 0xFF && firstBytes[1] === 0xD8 && firstBytes[2] === 0xFF;
} else if (mimeType === 'image/png') {
  isValidImage = firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47;
} else if (mimeType === 'image/webp') {
  const riff = firstBytes.slice(0, 4).toString('ascii');
  const webp = firstBytes.slice(8, 12).toString('ascii');
  isValidImage = riff === 'RIFF' && webp === 'WEBP';
}
```

**Assessment:** ✅ VERIFIED
- MIME type validation (fails closed on missing MIME)
- Image type validation (rejects non-images)
- Magic byte validation (lightweight preflight for common formats)
- Empty response validation

**Note:** Magic byte validation is incomplete (only JPEG, PNG, WebP)
- Other formats are accepted without magic byte validation
- Comprehensive validation deferred to Sharp in materialization path

---

## CACHE POLICY

### Current Implementation
**Cache-Control:** `private, max-age=3600`

**Assessment:** ✅ VERIFIED (fixed in previous commit)
- Changed from `public` to `private`
- Not publicly cacheable
- Respects authorization boundary
- 1-hour cache for performance

**Recommendation:** ⚠️ CONSIDER `no-store`
- For authenticated Workbench content, `no-store` is more conservative
- Prevents any caching that could survive auth boundary
- Trade-off: performance vs security

---

## AUTHORIZATION TIED TO WORKBENCH SESSION

### Session Validation
**Implementation:** Uses `driveOAuthManager.getClient()`

**Assessment:** ✅ VERIFIED
- Tied to Workbench OAuth session
- No anonymous access
- No public access
- Session-scoped authorization

**Risk:** ⚠️ LOW
- Authorization is properly implemented
- No cross-user access detected
- No session hijacking detected

---

## ARBITRARY DRIVE FILE PROBING

### File ID Access
**Implementation:** Direct fileId parameter

**Assessment:** ⚠️ POTENTIAL RISK
- No validation that fileId belongs to current user
- No validation that fileId is accessible by current session
- Relies on Drive API authorization

**Risk:** ⚠️ MEDIUM
- Drive API should enforce access control
- But explicit validation would be defense-in-depth
- Consider adding user-specific Drive ID validation

---

## CROSS-USER ACCESS PROTECTION

### Drive API Authorization
**Implementation:** OAuth credentials + Drive API

**Assessment:** ⚠️ RELIES ON DRIVE API
- Relies on Drive API to enforce access control
- No explicit cross-user access validation
- Drive API should prevent cross-user access

**Risk:** ⚠️ LOW
- Drive API access control is generally robust
- OAuth credentials are user-scoped
- But explicit validation would be defense-in-depth

---

## THUMBNAIL VS MEDIA PROXY ARCHITECTURE

### Naming vs Reality
**Route Name:** `/api/drive/files/[fileId]/thumbnail`
**Reality:** Returns full original binary

**Assessment:** ⚠️ ARCHITECTURALLY MISLEADING
- Name suggests thumbnail generation
- Reality is full media proxy
- Could cause confusion about purpose

**CEO Directive Concern:**
"The current route is suspiciously named 'thumbnail' while returning the full original Drive binary."

**Recommendation:** ⚠️ RENAME OR DOCUMENT
- Rename to `/api/drive/files/[fileId]/media` OR
- Add explicit documentation that this is NOT a thumbnail endpoint
- Consider adding actual thumbnail generation

---

## ARCHITECTURAL ASSESSMENT

### Should This Be a True Thumbnail Endpoint?

**Current State:** Full media proxy
**Desired State:** True thumbnail generation

**Trade-offs:**
- **Full Media Proxy:** Simpler, but downloads entire file
- **True Thumbnail:** More complex, but reduces bandwidth/memory

**Recommendation:** ⚠️ CONSIDER THUMBNAIL GENERATION
- For large files, full download is wasteful
- For Workbench preview, thumbnail is sufficient
- Consider adding thumbnail generation via Sharp

---

## DRIVE ID SEMANTICS AUDIT

### Thumbnail Proxy vs Drive Discovery

**Thumbnail Proxy:**
```typescript
if (driveId) {
  getFileParams.supportsAllDrives = true;
  // Missing: corpora and driveId params
}
```

**Drive Discovery (CORRECT):**
```typescript
if (driveId) {
  params.corpora = 'drive';
  params.driveId = context.driveId;
}
```

**Assessment:** ⚠️ INCONSISTENT IMPLEMENTATION
- Thumbnail proxy has incomplete Shared Drive support
- Drive discovery has correct Shared Drive support
- Should align implementations

---

## CEO MODE ASSESSMENT

**Drive Thumbnail Proxy Status:** ⚠️ ARCHITECTURALLY SUSPICIOUS BUT FUNCTIONALLY ACCEPTABLE

**Evidence:**
- Authentication is properly implemented
- Size limits are enforced
- Content policy is enforced
- Cache policy is now private (fixed)
- Shared Drive support is incomplete
- Naming is misleading (thumbnail vs media proxy)
- Arbitrary file probing relies on Drive API

**Architectural Concerns:**
1. Name is misleading (suggests thumbnail, returns full binary)
2. Shared Drive support is incomplete
3. Relies on Drive API for cross-user access protection
4. No explicit thumbnail generation

**Functional Acceptability:**
- Works correctly for Workbench preview
- Enforces memory safety
- Enforces content policy
- Authentication is proper

---

## REMEDIATION PLAN

### P1: Fix Shared Drive Support
**File:** `src/app/api/drive/files/[fileId]/thumbnail/route.ts`
**Change:** Add `corpora: 'drive'` and `driveId` params when driveId is present

### P1: Rename or Document
**File:** `src/app/api/drive/files/[fileId]/thumbnail/route.ts`
**Option A:** Rename to `/api/drive/files/[fileId]/media`
**Option B:** Add explicit documentation that this is NOT a thumbnail endpoint

### P2: Consider Thumbnail Generation
**File:** `src/app/api/drive/files/[fileId]/thumbnail/route.ts`
**Action:** Add Sharp-based thumbnail generation for preview
**Benefit:** Reduce bandwidth/memory for large files

### P2: Strengthen Cache Policy
**File:** `src/app/api/drive/files/[fileId]/thumbnail/route.ts`
**Change:** Use `Cache-Control: private, no-store` for maximum security

### P2: Add Cross-User Validation
**File:** `src/app/api/drive/files/[fileId]/thumbnail/route.ts`
**Action:** Validate fileId is accessible by current session
**Benefit:** Defense-in-depth against cross-user access

---

## VERIFICATION CHECKLIST

After remediation:

- [ ] Shared Drive support includes corpora and driveId params
- [ ] Endpoint is renamed or explicitly documented
- [ ] Thumbnail generation is considered (optional)
- [ ] Cache policy is reviewed (private vs no-store)
- [ ] Cross-user access validation is considered (optional)
- [ ] fileId accessibility validation is considered (optional)

---

## NEXT PHASE

**PHASE 10 — NODE/SHARP/VERCEL COMPATIBILITY VERIFICATION**
- Compare local Node vs Vercel Node
- Compare local Sharp vs lockfile Sharp vs Vercel Sharp
- Verify SHARP_IGNORE_GLOBAL_LIBVIPS=1 necessity
- Decide on deliberate Node runtime pinning
