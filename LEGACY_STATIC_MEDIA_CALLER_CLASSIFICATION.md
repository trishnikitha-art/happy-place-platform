# Legacy Static Media Caller Classification

**Classification Date:** 2026-09-06
**Purpose:** Audit callers of legacy static media helpers to ensure no public rendering paths bypass KV authority

## Legacy Static Media Helpers (Definitions)

### src/lib/media.ts
**Functions:**
- `getProjectMedia(projectId)` - Returns all media for a project from static manifest
- `getProjectHero(projectId)` - Returns hero image from static manifest
- `getProjectThumbnail(projectId)` - Returns thumbnail from static manifest
- `getProjectMediaByRole(projectId, role)` - Returns media by role from static manifest
- `getProjectBeforeAfter(projectId)` - Returns before/after pair from static manifest

**Classification:** LEGACY DEFINITION - Original static media authority helpers

**Current Usage:** 
- **Test scripts only** (see below)
- **No public rendering paths** use these helpers

---

## Caller Classification

### 1. Diagnostic/Test Callers (LEGITIMATE)

#### src/scripts/test-media-authority.ts
**Functions Called:**
- `getProjectHero('pergola-001')`
- `getFeaturedServiceMedia('pergolas')`
- `getMediaById('pergola-001-hero')`

**Classification:** DIAGNOSTIC/TEST - Legitimate testing use

**Reason:** This is a manual test script for verifying the media authority pipeline. Test scripts are allowed to use legacy helpers for comparison/validation.

#### src/scripts/media-authority-constitutional-test.ts
**Functions Called:**
- `getProjectHero('pergola-001')`
- `getProjectHero('nonexistent-project')`

**Classification:** DIAGNOSTIC/TEST - Legitimate testing use

**Reason:** Constitutional test script verifying media authority integrity. Test scripts are allowed to use legacy helpers for validation.

---

### 2. Duplicate Legacy Definition (DEAD CODE)

#### src/app/workbench/preview/main-media.ts
**Functions Defined:**
- `getProjectMedia(projectId)` - Duplicate definition
- `getProjectHero(projectId)` - Duplicate definition
- `getProjectThumbnail(projectId)` - Duplicate definition
- `getProjectMediaByRole(projectId, role)` - Duplicate definition
- `getProjectBeforeAfter(projectId)` - Duplicate definition

**Classification:** DEAD LEGACY CODE - No imports found anywhere

**Evidence:** `grep` for "from.*main-media" returned zero results. No files import from this module.

**Recommendation:** DELETE - This is dead duplicate code from the old preview architecture. The new preview architecture uses the actual website pages directly.

---

### 3. Public Rendering Paths (CORRECT AUTHORITY)

#### src/app/page.tsx
**Functions Called:**
- `resolvePublicMedia()` ✅
- `getProjectWithResolvedMedia()` ✅
- `getProjectsWithResolvedMedia()` ✅

**Classification:** CORRECT - Uses KV/public authority

**Reason:** Homepage correctly uses the constitutional public media gate through KV authority.

#### src/app/services/page.tsx
**Functions Called:**
- `resolvePublicMedia()` ✅
- `getServiceCardAssignment()` ✅

**Classification:** CORRECT - Uses KV/public authority

**Reason:** Services page correctly uses the constitutional public media gate through KV authority.

#### src/app/about/page.tsx
**Functions Called:**
- `resolvePublicMedia()` ✅
- `getServiceCardAssignment()` ✅

**Classification:** CORRECT - Uses KV/public authority

**Reason:** About page correctly uses the constitutional public media gate through KV authority.

---

## Summary

### ✅ Public Rendering Paths
All public rendering paths correctly use KV/public authority:
- Homepage → `resolvePublicMedia()` → KV
- Services page → `resolvePublicMedia()` → KV
- About page → `resolvePublicMedia()` → KV

### ✅ Diagnostic/Test Callers
Test scripts legitimately use legacy helpers for validation:
- test-media-authority.ts
- media-authority-constitutional-test.ts

### ❌ Dead Legacy Code
- src/app/workbench/preview/main-media.ts - Duplicate definitions with no imports

---

## Recommendations

### P0 - Remove Dead Legacy Code
**Action:** Delete `src/app/workbench/preview/main-media.ts`

**Reason:**
- No files import from this module
- Contains duplicate definitions of legacy helpers
- Remnant of old preview architecture
- New preview architecture uses actual website pages directly

### P1 - Keep Legacy Helpers in src/lib/media.ts
**Action:** KEEP the legacy helper definitions in `src/lib/media.ts`

**Reason:**
- Used by legitimate test scripts
- Test scripts need comparison/validation against static authority
- No public rendering paths use these helpers
- Safe to keep for diagnostic purposes

### P1 - Document Legacy Helper Usage
**Action:** Add JSDoc comments to legacy helpers indicating they are for test/diagnostic use only

**Reason:**
- Prevents future accidental use in public rendering paths
- Documents the authority boundary clearly

---

## Authority Boundary Verification

**Constitutional Rule:** KV is the only runtime PublishedMediaAsset authority

**Verification:**
- ✅ All public rendering paths use `resolvePublicMedia()` → KV
- ✅ Legacy static helpers are used only by test scripts
- ✅ No static authority bypass in public rendering
- ❌ Dead duplicate code exists (non-blocking)

**Conclusion:** The authority boundary is intact. Public rendering correctly uses KV authority. Legacy helpers are safely isolated to test scripts only.
