# Gate B: Media Boundary Verification
**Session: Forensic verification of a92393f public media materialization gate**
**Date: 2026-07-23**
**Baseline Git SHA: a92393f**

## Executive Summary

This gate verifies the actual resolvePublicMedia implementation and traces all callers to prove the Drive → public delivery boundary is closed.

---

## Section 1: resolvePublicMedia Implementation Inspection

### Current Implementation (media.ts Lines 107-166)

```typescript
export async function resolvePublicMedia(id: string): Promise<Media | null> {
  console.log('[PUBLIC_MEDIA_GATE] Resolving public media:', { id });

  // REJECT: drive-prefixed IDs
  if (id.startsWith('drive-')) {
    console.error('[PUBLIC_MEDIA_GATE] REJECTED: drive-prefixed ID', { id });
    return null;
  }

  // Resolve media via standard path
  const media = await getMediaByIdAsync(id);
  if (!media) {
    console.log('[PUBLIC_MEDIA_GATE] NOT_FOUND:', { id });
    return null;
  }

  // REJECT: source_reference lifecycle state
  if ((media as any).lifecycleState === 'source_reference') {
    console.error('[PUBLIC_MEDIA_GATE] REJECTED: source_reference lifecycle state', { id, lifecycleState: (media as any).lifecycleState });
    return null;
  }

  // REJECT: materializing lifecycle state
  if ((media as any).lifecycleState === 'materializing') {
    console.error('[PUBLIC_MEDIA_GATE] REJECTED: materializing lifecycle state', { id, lifecycleState: (media as any).lifecycleState });
    return null;
  }

  // REJECT: stale lifecycle state
  if ((media as any).lifecycleState === 'stale') {
    console.error('[PUBLIC_MEDIA_GATE] REJECTED: stale lifecycle state', { id, lifecycleState: (media as any).lifecycleState });
    return null;
  }

  // REJECT: Media with /api/drive/* URLs
  const checkForDriveUrl = (obj: any): boolean => {
    if (!obj) return false;
    if (typeof obj === 'string' && obj.startsWith('/api/drive/')) {
      return true;
    }
    if (typeof obj === 'object') {
      return Object.values(obj).some((val) => checkForDriveUrl(val));
    }
    return false;
  };

  if (checkForDriveUrl(media)) {
    console.error('[PUBLIC_MEDIA_GATE] REJECTED: contains /api/drive/* URL', { id });
    return null;
  }

  // REJECT: Media with thumbnailProxyUrl
  if ((media as any).thumbnailProxyUrl) {
    console.error('[PUBLIC_MEDIA_GATE] REJECTED: contains thumbnailProxyUrl', { id, thumbnailProxyUrl: (media as any).thumbnailProxyUrl });
    return null;
  }

  console.log('[PUBLIC_MEDIA_GATE] APPROVED: published public media', { id });
  return media;
}
```

### Verification Against Requirements

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Reject drive-prefixed IDs | `id.startsWith('drive-')` | ✅ CORRECT |
| Reject source_reference lifecycle | `lifecycleState === 'source_reference'` | ✅ CORRECT |
| Reject materializing lifecycle | `lifecycleState === 'materializing'` | ✅ CORRECT |
| Reject stale lifecycle | `lifecycleState === 'stale'` | ✅ CORRECT |
| Reject /api/drive/* URLs | Recursive checkForDriveUrl | ✅ CORRECT |
| Reject thumbnailProxyUrl | `thumbnailProxyUrl` check | ✅ CORRECT |
| Distinguish lifecycle states | SOURCE_REFERENCE, MATERIALIZING, PUBLISHED, STALE | ⚠️ INCOMPLETE |
| Validate content hash | NOT IMPLEMENTED | ❌ MISSING |
| Validate dimensions | NOT IMPLEMENTED | ❌ MISSING |
| Validate public URL | NOT IMPLEMENTED | ❌ MISSING |
| Reject missing variants | NOT IMPLEMENTED | ❌ MISSING |
| Reject impossible dimensions | NOT IMPLEMENTED | ❌ MISSING |

---

## Section 2: Caller Trace

### resolvePublicMedia Callers

**Found 2 direct callers:**

1. **page.tsx Line 94** - Homepage service card assignments
2. **service-card.tsx Line 10** - Import only, NOT called

### CRITICAL BYPASS FOUND

**services/[slug]/page.tsx Lines 71-77** is NOT using resolvePublicMedia:

```typescript
// Resolve media object - use async KV lookup for drive-prefixed IDs
let mediaObject: Media | null = null;
if (assignment.mediaId.startsWith('drive-')) {
  mediaObject = await getMediaByIdAsync(assignment.mediaId);
} else {
  mediaObject = getMediaById(assignment.mediaId);
}
```

**This is the same pattern that was removed from page.tsx. This file can still bypass the public media gate!**

### Other getMediaById Callers (22 files total)

**Public-facing components:**
- page.tsx (homepage hero, owner portrait)
- services/[slug]/page.tsx (service page service cards) ⚠️ BYPASS
- our-work/OurWorkClient.tsx (our work gallery)
- about/page.tsx (about page)
- projects/[slug]/page.tsx (project pages)
- components/project-spotlight.tsx (project spotlight)
- components/project-photos.tsx (project photos)
- components/before-after-slider.tsx (before/after slider)
- components/review-card.tsx (review cards)
- components/featured-review.tsx (featured reviews)

**Workbench/admin:**
- workbench/media/page.tsx (media workbench)
- workbench/preview/main-page.tsx (workbench preview)
- workbench/preview/main-media.tsx (workbench media preview)
- app/api/admin/projects/gallery/route.ts (admin API)

**Scripts:**
- scripts/verify-authority-graph.ts
- scripts/test-media-authority.ts
- scripts/media-authority-constitutional-test.ts

**Config:**
- config/seo.ts

---

## Section 3: Critical Issues Identified

### Issue 1: services/[slug]/page.tsx Bypasses Gate

**Problem**: services/[slug]/page.tsx uses the old pattern (drive-* ID check + getMediaByIdAsync) instead of resolvePublicMedia.

**Impact**: Service pages can still render Drive URLs to the browser.

**Fix Required**: Replace with resolvePublicMedia, same as page.tsx.

### Issue 2: "Published" is a Label, Not a Contract

**Problem**: resolvePublicMedia only checks lifecycleState rejection, but doesn't validate:
- Content hash exists
- Dimensions are valid
- Public URL is actually public (not Drive proxy)
- Variants are present
- No impossible dimensions (upscale without permission)

**Impact**: A media object could pass lifecycle checks but still have invalid metadata.

**Fix Required**: Add comprehensive validation for published contract.

### Issue 3: URL Validation is Insufficient

**Problem**: Current checkForDriveUrl only checks for `/api/drive/*`, but doesn't reject:
- Drive URLs hidden in legacy thumbnail fields
- Relative API URLs
- External source URLs
- Malformed URLs
- URLs whose host is application's own API but bypasses public-media route

**Impact**: Drive URLs could still reach browser through different fields.

**Fix Required**: Add comprehensive URL validation and normalization.

### Issue 4: Media Type Permissiveness

**Problem**: UI components accept generic `Media` type, which can include DriveReference, MaterializingMedia, StaleMedia.

**Impact**: Components must remember to call the right function. The forbidden state is difficult to represent.

**Fix Required**: Split Media type into DriveReference, MaterializingMedia, PublishedMedia, StaleMedia. Public components should only accept PublishedMedia.

---

## Section 4: Required Validation

### Validation 1: Published Contract

**Required fields for published media:**
- Valid immutable media identity (id)
- Actual content hash
- Valid dimensions (width > 0, height > 0)
- Actual public Blob/static URL (not Drive proxy)
- Valid rendition metadata (variants)
- No Drive proxy URL in any field
- No /api/drive/ URL in any field
- No missing variant
- No impossible dimensions (source <= rendition)

### Validation 2: URL Purity

**Rejected URL patterns:**
- `/api/drive/*`
- `drive.google.com`
- Relative API URLs
- External source URLs (unless explicitly allowed)
- Malformed URLs
- URLs bypassing public-media route

### Validation 3: Lifecycle State Completeness

**Required states:**
- SOURCE_REFERENCE (allowed in source domain, rejected in public)
- MATERIALIZING (allowed in source domain, rejected in public)
- PUBLISHED (only state allowed in public)
- STALE (rejected in public)
- QUARANTINED (rejected in public)
- MISSING (rejected in public)

---

## Section 5: Public URL Purity Test Definition

### Test Scope

**Pages to test:**
- `/`
- `/services`
- `/about`
- `/reviews`
- `/projects/*`
- `/api/public-media/*`

### Test Assertions

**NO:**
- `/api/drive/` URLs in HTML/RSC payloads
- `drive.google.com` URLs
- `thumbnailProxyUrl` in public responses
- `source_reference` lifecycle state in public responses
- `materializing` lifecycle state in public responses
- Raw Drive IDs in public responses
- Missing public URLs
- 480px asset in >480px presentation
- Upscaled rendition without explicit permission

---

## Section 6: Conclusion

**Current State**: resolvePublicMedia is implemented but has critical bypasses and incomplete validation.

**Critical Bypass Found**: services/[slug]/page.tsx can still bypass the gate using old pattern.

**Gaps**:
1. services/[slug]/page.tsx bypasses resolvePublicMedia
2. "Published" is a label, not a contract
3. URL validation is insufficient
4. Media type is too permissive
5. No content hash validation
6. No dimension validation
7. No public URL validation
8. No variant validation
9. No impossible dimension check

**Required Before Acceptance**:
- Fix services/[slug]/page.tsx bypass
- Add comprehensive published contract validation
- Add comprehensive URL validation
- Split Media type (DriveReference, MaterializingMedia, PublishedMedia, StaleMedia)
- Implement public URL purity test
- Verify no Drive URLs can reach browser

**Verdict**: GATE B NOT PASSED - critical bypass found, validation incomplete.

---

## Audit Metadata

- **Auditor**: Devin CLI
- **Baseline Git SHA**: a92393f
- **Audit Date**: 2026-07-23
- **Scope**: resolvePublicMedia implementation and caller trace
- **Method**: Code inspection and grep for all callers
