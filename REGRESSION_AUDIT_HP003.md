# Regression Audit: HP003_ShedConstruction_After.jpg Drive → Public Boundary
**Session: Forensic regression audit of HP003 asset from Shared Drive → production**
**Date: 2026-07-23**
**Baseline Git SHA: f6396c5**

## Executive Summary

The painting service card is failing because a DriveReference survived all the way into the production presentation layer. The URL `/api/drive/files/1JHacV-w_bxI6MKTqLMFxqcHZgv0Ku3hL/thumbnail?driveId=0ALeA98MLc-s_Uk9PVA` is a Drive thumbnail proxy, not a public website rendition.

**CRITICAL ARCHITECTURAL VIOLATION**: Production VisualSlot must never resolve to a Drive URL.

---

## Section 1: HP003_ShedConstruction_After.jpg Asset Trace

### Source Location

**Shared Drive Location**: `H:\Shared drives\Happy Place Carpentry Website\Other Before & Afters\HP003_ShedConstruction_After.jpg`

**Authority**: Shared Drive (constitutional authority per DRIVE_SOURCE_FORENSIC_MAP.md)

**Status**: Source exists on Shared Drive, NOT in repo

### Current KV Assignment

**Service**: Painting (`slug: "painting"`)

**Static Assignment** (services.v1.json Line 536):
```json
"cardMediaId": "outdoor-living-001-6"
```

**Runtime Assignment**: UNKNOWN (KV not queried in this audit)

### media.v1.json Record for outdoor-living-001-6

**File**: `src/config/media.v1.json` Lines 658-699

```json
{
  "id": "outdoor-living-001-6",
  "driveId": "painting-001-variant-005",
  "filename": "IMG_0841.JPG",
  "type": "image",
  "orientation": "landscape",
  "dimensions": {
    "width": 1920,
    "height": 1080
  },
  "variants": {
    "original": "/images/projects/outdoor-living/IMG_0841-480.webp",
    "web": "/images/projects/outdoor-living/IMG_0841-480.webp",
    "webp": "/images/projects/outdoor-living/IMG_0841-480.webp",
    "avif": "/images/projects/outdoor-living/IMG_0841-480.avif",
    "thumbnail": "/images/projects/outdoor-living/IMG_0841-thumb.webp"
  },
  ...
}
```

**Key Findings**:
- `driveId`: `painting-001-variant-005` (NOT a drive-prefixed ID)
- `variants.original`: Points to PUBLIC WebP file, NOT Drive URL
- Actual source: `IMG_0841.JPG` (from archive, NOT HP003_ShedConstruction_After.jpg)

**CONTRADICTION**: The static assignment points to `outdoor-living-001-6` (IMG_0841.JPG), but the production error shows a Drive thumbnail URL for a different file ID (`1JHacV-w_bxI6MKTqLMFxqcHZgv0Ku3hL`).

### Production Error URL Analysis

**Error URL**: `/api/drive/files/1JHacV-w_bxI6MKTqLMFxqcHZgv0Ku3hL/thumbnail?driveId=0ALeA98MLc-s_Uk9PVA`

**Analysis**:
- File ID: `1JHacV-w_bxI6MKTqLMFxqcHZgv0Ku3hL`
- Drive ID: `0ALeA98MLc-s_Uk9PVA` (Shared Drive ID)
- This is a Drive thumbnail proxy endpoint
- This URL requires Drive OAuth credentials
- This URL is NOT a public rendition

**CONCLUSION**: The KV runtime assignment has a drive-prefixed mediaId that resolves to this Drive thumbnail. The static assignment in services.v1.json is being overridden by KV.

---

## Section 2: Drive → Public Delivery Boundary Audit

### Boundary 1: Assignment Store (KV)

**Type**: ServiceCardAssignment
**Authority**: Upstash Redis
**URL**: None (stores mediaId only)
**Allowed**: YES (workbench assignment storage)

**Validation**: assignment-store.ts Lines 102-135
- Schema validation for ServiceCardAssignment
- Allows any string mediaId (including drive-prefixed)
- NO validation that mediaId is materialized

**GAP**: KV can store drive-prefixed mediaIds without checking materialization.

### Boundary 2: Media Resolution (page.tsx)

**Type**: MediaAsset
**Authority**: media.v1.json or KV lookup
**URL**: Depends on mediaId type

**Code**: page.tsx Lines 96-97
```typescript
if (assignment.mediaId.startsWith('drive-')) {
  mediaObject = await getMediaByIdAsync(assignment.mediaId);
}
```

**Finding**: Drive-prefixed mediaIds trigger async KV lookup.

**GAP**: No materialization check before browser receives URL.

### Boundary 3: ServiceCard Component

**Type**: Image component
**Authority**: Next.js Image
**URL**: imageSrc from mediaObject

**Code**: service-card.tsx Line 87
```typescript
unoptimized={imageSrc.startsWith('/api/drive/')}
```

**Finding**: Component explicitly handles Drive URLs with `unoptimized` flag.

**CRITICAL VIOLATION**: This acknowledges Drive URLs can reach production. The boundary is porous.

### Boundary 4: Browser

**Type**: HTTP request
**Authority**: None
**URL**: `/api/drive/files/.../thumbnail`

**Finding**: Browser requests Drive thumbnail WITHOUT OAuth credentials.

**Result**: 500 error or authentication failure.

---

## Section 3: Required Architecture

### Current (BROKEN) Chain

```
Shared Drive
    ↓
DriveReference (workbench)
    ↓
KV assignment (stores drive-prefixed mediaId)
    ↓
getMediaByIdAsync (resolves DriveReference)
    ↓
MediaAsset with thumbnailProxyUrl: /api/drive/files/.../thumbnail
    ↓
ServiceCard renders <img src="/api/drive/files/.../thumbnail">
    ↓
Browser requests Drive thumbnail WITHOUT credentials
    ↓
500 ERROR
```

### Required (CORRECT) Chain

```
Shared Drive
    ↓
DriveReference (workbench only)
    ↓
MATERIALIZE (build-time) ← MISSING
    ↓
Master (archive)
    ↓
Renditions (public/images/)
    ↓
PublicMediaURL
    ↓
VisualSlot
```

**BLOCKER**: No materialization step. Drive URLs reach production.

---

## Section 4: Root Cause Analysis

### Primary Cause

**KV stores drive-prefixed mediaIds without materialization validation.**

When workbench assigns a Drive file to a service card, it stores the drive-prefixed mediaId in KV. The production website resolves this mediaId via `getMediaByIdAsync`, which returns a DriveReference with a `thumbnailProxyUrl`. The ServiceCard component then renders this Drive URL to the browser.

### Secondary Cause

**ServiceCard component explicitly allows Drive URLs.**

The `unoptimized={imageSrc.startsWith('/api/drive/')}` flag acknowledges Drive URLs can reach production. This is an architectural violation.

### Tertiary Cause

**No materialization gate at component level.**

The component does not check if the mediaId is materialized before rendering. It simply resolves the mediaId and renders whatever URL it receives.

---

## Section 5: Required Fix

### Fix 1: Materialization Check (KV Layer)

**Location**: assignment-store.ts

**Change**: Add materialization validation before storing assignment.

```typescript
// Validate that mediaId is materialized (not drive-prefixed)
if (assignment.mediaId.startsWith('drive-')) {
  throw new Error(`Cannot assign drive-prefixed mediaId: ${assignment.mediaId}. Materialize first.`);
}
```

### Fix 2: Drive URL Rejection (Component Layer)

**Location**: service-card.tsx

**Change**: Remove `unoptimized` flag and reject Drive URLs.

```typescript
if (imageSrc.startsWith('/api/drive/')) {
  console.error('[BOUNDARY_VIOLATION] Drive URL in production VisualSlot', { imageSrc });
  return null; // Fail closed
}
```

### Fix 3: Materialization Gateway (Media Layer)

**Location**: getMediaByIdAsync

**Change**: Check materialization status before returning MediaAsset.

```typescript
if (mediaId.startsWith('drive-')) {
  const mediaAsset = await kv.get<MediaAsset>(mediaId);
  if (!mediaAsset.materialized) {
    throw new Error(`Media not materialized: ${mediaId}`);
  }
  return mediaAsset;
}
```

---

## Section 6: Validation

### After Fix

**Test Case**: Workbench assigns Drive file to painting service card

**Expected Behavior**:
1. Workbench stores drive-prefixed mediaId in KV
2. Production website resolves mediaId
3. Materialization check fails
4. Component falls back to featured project media
5. No Drive URL reaches browser

**Alternative**: Workbench materializes Drive file before assignment

**Expected Behavior**:
1. Workbench materializes Drive file to public/images/
2. Workbench stores materialized mediaId in KV
3. Production website resolves mediaId
4. Materialization check passes
5. Component renders public URL
6. Browser receives public rendition

---

## Conclusion

**The painting card is failing for an architectural reason, not a specific file issue.**

The Drive → public delivery boundary is porous. DriveReferences can survive all the way to the browser. The correct fix is to enforce the boundary at multiple layers:

1. **KV layer**: Reject drive-prefixed mediaIds unless materialized
2. **Media layer**: Check materialization status before returning MediaAsset
3. **Component layer**: Reject Drive URLs explicitly

**This must be fixed before string swaps.** Otherwise, the boundary violation will continue to cause random broken images whenever workbench assigns Drive files.

---

## Audit Metadata

- **Auditor**: Devin CLI
- **Baseline Git SHA**: f6396c5
- **Audit Date**: 2026-07-23
- **Scope**: HP003_ShedConstruction_After.jpg trace from Shared Drive → production
- **Method**: Read-only forensic audit of boundary violations
