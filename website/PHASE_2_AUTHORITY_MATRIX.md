# PHASE 2: Authority Matrix and Execution Graph

## Executive Summary
**STATUS:** ❌ CRITICAL PARALLEL AUTHORITIES CONFIRMED

The system has **5 competing authority paths** instead of one constitutional chain:

1. **Static JSON authorities** (media.v1.json, projects.v1.json, brand.v1.json)
2. **Runtime assignment authority** (KV-based service card assignments)
3. **Generated projections** (orphaned - not consumed)
4. **Drive API proxy** (Workbench-only preview)
5. **Hardcoded static paths** (header/footer logo)

---

## Machine-Verifiable Authority Matrix

| Visual Slot | Current Source | Intended Authority | Actual Authority | Classification | Bypass | Required Fix |
| ----------- | -------------- | ------------------ | ---------------- | -------------- | ------ | ------------ |
| homepage-hero | getHomepageHero() → brand.v1.json + runtime assignment | Runtime assignment | Dual path (static + runtime) | COMPETING AUTHORITIES | Yes | Eliminate static path, enforce runtime-only |
| homepage-owner-portrait | getOwnerPortrait() → brand.v1.json + runtime assignment | Runtime assignment | Dual path (static + runtime) | COMPETING AUTHORITIES | Yes | Eliminate static path, enforce runtime-only |
| service-card-* | getServiceCardAssignment() → KV | Runtime assignment | KV assignment | CORRECT | No | None |
| project-hero | projects.v1.json → KV | Runtime assignment | Static JSON authority | STATIC AUTHORITY | Yes | Move to runtime assignments |
| project-gallery | projects.v1.json → KV | Runtime assignment | Static JSON authority | STATIC AUTHORITY | Yes | Move to runtime assignments |
| project-before | projects.v1.json → KV | Runtime assignment | Static JSON authority | STATIC AUTHORITY | Yes | Move to runtime assignments |
| project-after | projects.v1.json → KV | Runtime assignment | Static JSON authority | STATIC AUTHORITY | Yes | Move to runtime assignments |
| site-header-logo | Hardcoded /brand/logo.png | Runtime assignment | Hardcoded path | HARDCODED | Yes | Create runtime assignment slot |
| site-footer-logo | Hardcoded /brand/logo.png | Runtime assignment | Hardcoded path | HARDCODED | Yes | Create runtime assignment slot |
| workbench-drive-thumbnail | /api/drive/files/{fileId}/thumbnail | Drive API proxy | Drive API (authenticated) | WORKBENCH ONLY | No | None (intentional) |

---

## Static JSON Constitutional Classification

| File | Current Usage | Intended Classification | Actual Classification | Required Action |
|------|---------------|----------------------|----------------------|-----------------|
| `media.v1.json` | Media Authority KV source, static helpers | EVIDENCE/BOOTSTRAP only | COMPETING AUTHORITY (static helpers) | Remove static helpers, keep as evidence |
| `brand.v1.json` | Brand Authority + runtime fallback | EVIDENCE/BOOTSTRAP only | COMPETING AUTHORITY (fallbacks) | Remove fallbacks, keep as evidence |
| `projects.v1.json` | Project Authority media IDs | CONTENT AUTHORITY (slots) | COMPETING AUTHORITY (media IDs) | Move media IDs to runtime assignments |
| `services.v1.json` | Service configuration | CONTENT AUTHORITY (slots) | CORRECT | None |
| `cities.v1.json` | Service area configuration | CONTENT AUTHORITY (metadata) | CORRECT | None |

---

## Generated Projections Analysis

### Current State:
- **Files exist:** `.generated/hero-projection.json`, `.generated/gallery-projection.json`, `.generated/service-projection.json`
- **Loader exists:** `projection-loader.ts` can load them
- **Adapter exists:** `projection-adapter.js` references `metadata/projection/*.json` (DOES NOT EXIST)
- **Consumption:** Homepage (`page.tsx`) **DOES NOT** consume generated projections
- **Status:** ORPHANED AUTHORITY

### Intended Chain (BROKEN):
```
canonical authority (metadata/canonical-media-graph.json)
    ↓
projection generation
    ↓
.generated/*.json
    ↓
projection-loader.ts
    ↓
projection-adapter.js (metadata/projection/*.json - MISSING)
    ↓
consumer (homepage)
```

### Classification:
- **Type:** Derivative projection
- **Status:** ORPHANED - generated but not consumed
- **Constitutional Violation:** Two competing "real" systems exist (generated projections vs runtime assignment resolution)

### Required Action:
Either:
1. **Eliminate** generated projections (dead infrastructure), OR
2. **Consume** generated projections in homepage (make them the rendering authority)

---

## Drive API Security Analysis

### Route: `/api/drive/files/[fileId]/thumbnail`

### Security Boundaries:
1. **Authentication check:** `isAuthenticated()` - validates Google OAuth session
2. **Session identity resolution:** `workbenchSession.getSessionIdentity()` - gets authenticated user email
3. **Drive corpus authorization:** `verifyCorpusAuthorization(fileId, driveId)` - verifies file is in authorized corpus
4. **MIME type validation:** Rejects non-image types
5. **Size validation:** Rejects files > 25MB
6. **Magic byte validation:** Lightweight preflight for JPEG/PNG/WebP

### Authorization Chain:
```
session identity
    ↓
HPP authorization (workbenchSession)
    ↓
Drive authorization (OAuth)
    ↓
requested object (corpus authorization)
    ↓
operation (thumbnail proxy)
```

### IDOR Protection:
- Application-level corpus authorization prevents cross-user access
- Even if Google technically permits the object, HPP verifies it's in the authorized corpus
- Prevents guessed Drive IDs from being proxied

### Classification:
- **Type:** Human control surface (Workbench-only)
- **Purpose:** Drive preview, NOT public delivery
- **Security:** CORRECT - proper authorization chain
- **Cache header:** `private, max-age=3600` - not publicly cacheable

### Constitutional Status:
- **Drive as source:** CORRECT
- **Drive as public authority:** PREVENTED by public media gate
- **Workbench preview:** ALLOWED (authenticated human control surface)
- **Required Action:** None (intentional design)

---

## Media Promotion Boundary Analysis

### Current Chain:
```
DriveReference
    ↓
/api/drive/ingest (materialization)
    ↓
content hash (SHA-256)
    ↓
stable media identity
    ↓
PublishedMediaAsset (KV)
    ↓
assignment (storeServiceCardAssignment)
    ↓
public projection (resolvePublicMedia)
    ↓
public website
```

### Boundary Enforcement:
1. **Write-time validation:** `storeServiceCardAssignment()` rejects Drive-prefixed IDs
2. **Public media gate:** `resolvePublicMedia()` rejects Drive-prefixed IDs
3. **Blob verification:** Drive assets require Blob metadata verification
4. **Synthetic hash rejection:** Drive assets with synthetic content hash rejected

### Classification:
- **Type:** Materialization boundary
- **Status:** CORRECT - Drive cannot skip materialization
- **Security:** DriveReference → Assignment is IMPOSSIBLE without PublishedMediaAsset

### Required Action:
- None (boundary is correctly enforced)

---

## Authority Execution Graph

### ACTUAL EXECUTION GRAPH (MULTIPLE PATHS):

```
HOMEPAGE HERO (COMPETING AUTHORITIES):
├─ brand.v1.json (static mediaId: "brand-hero")
└─ KV assignment (service-card-assignment:brand-hero-background)
   └─ resolvePublicMedia() → PublishedMediaAsset
      └─ public website

HOMEPAGE OWNER PORTRAIT (COMPETING AUTHORITIES):
├─ brand.v1.json (static mediaId: "brand-portrait")
└─ KV assignment (service-card-assignment:brand-portrait-homepage)
   └─ resolvePublicMedia() → PublishedMediaAsset
      └─ public website

SERVICE CARDS (CORRECT):
└─ KV assignment (service-card-assignment:{service.slug})
   └─ resolvePublicMedia() → PublishedMediaAsset
      └─ public website

PROJECT MEDIA (STATIC AUTHORITY):
└─ projects.v1.json (static media IDs)
   └─ resolvePublicMedia() → PublishedMediaAsset
      └─ public website

HEADER/FOOTER LOGO (HARDCODED):
└─ /brand/logo.png (hardcoded path)
   └─ public website

GENERATED PROJECTIONS (ORPHANED):
└─ metadata/canonical-media-graph.json
   └─ .generated/*.json (NOT CONSUMED)
   └─ projection-loader.ts (NOT CALLED)
      └─ homepage (DOES NOT USE)

WORKBENCH DRIVE PREVIEW (CORRECT):
└─ Drive file ID
   └─ /api/drive/files/{fileId}/thumbnail (authenticated)
      └─ Workbench preview (NOT public)
```

---

## Constitutional Violations Summary

### Violation 1: Brand Authority Dual Path
**Location:** `brand.ts` (getHomepageHero, getOwnerPortrait)
**Problem:** Loads static brand.v1.json AND checks runtime assignments
**Impact:** Two competing authorities for same slots
**Severity:** HIGH
**Fix Required:** Eliminate static path, enforce runtime-only

### Violation 2: Project Authority Static JSON
**Location:** `projects.ts` (getProjectWithResolvedMedia)
**Problem:** Uses projects.v1.json for media IDs instead of runtime assignments
**Impact:** Static JSON competes with runtime assignments
**Severity:** HIGH
**Fix Required:** Move project media IDs to runtime assignments

### Violation 3: Generated Projections Orphaned
**Location:** `.generated/*.json`, `projection-loader.ts`
**Problem:** Generated but not consumed by homepage
**Impact:** Two competing "real" systems exist
**Severity:** MEDIUM
**Fix Required:** Either consume or eliminate

### Violation 4: Hardcoded Logo Paths
**Location:** `site-header.tsx`, `site-footer.tsx`
**Problem:** Hardcoded /brand/logo.png outranks authority
**Impact:** Hardcoded paths cannot be overridden by runtime assignments
**Severity:** MEDIUM
**Fix Required:** Create runtime assignment slots for logo

### Violation 5: Media Authority Static Helpers
**Location:** `media.ts` (getProjectMedia, getProjectHero, etc.)
**Problem:** Static manifest accessors compete with KV-based runtime authority
**Impact:** Static JSON silently participates in runtime public rendering
**Severity:** MEDIUM
**Fix Required:** Remove static helpers, keep as bootstrap/evidence only

---

## Security Analysis Results

### Drive API Security: ✅ CORRECT
- Authentication required
- Application-level corpus authorization
- IDOR protection via corpus verification
- Workbench-only (not public delivery)
- Private cache headers

### Media Promotion Boundary: ✅ CORRECT
- DriveReference → Assignment IMPOSSIBLE without PublishedMediaAsset
- Write-time validation rejects Drive IDs
- Public media gate rejects Drive IDs
- Blob verification required for Drive assets

### Public Media Gate: ✅ CORRECT
- Rejects Drive-prefixed IDs
- Rejects source_reference lifecycle state
- Rejects materializing lifecycle state
- Rejects stale lifecycle state
- Requires Blob metadata for Drive assets
- Rejects /api/drive/* URLs
- Rejects synthetic content identity

---

## Recommended Fix Priority

### Priority 1 (CRITICAL - Constitutional Violations):
1. **Eliminate brand authority dual path** - Remove static fallbacks in brand.ts
2. **Move project media to runtime assignments** - Eliminate static JSON authority for project media

### Priority 2 (HIGH - Authority Consolidation):
3. **Classify generated projections** - Either consume or eliminate orphaned projections
4. **Remove media authority static helpers** - Keep media.v1.json as evidence only

### Priority 3 (MEDIUM - Hardcoded Paths):
5. **Create logo assignment slots** - Move header/footer logos to runtime assignments

---

## PHASE 2 Conclusion

**STATUS:** ❌ FAILED - Multiple Parallel Authorities Confirmed

The system has **5 competing authority paths**:
1. Static JSON authorities (brand, projects, media)
2. Runtime assignment authority (KV)
3. Generated projections (orphaned)
4. Drive API proxy (Workbench-only - correct)
5. Hardcoded static paths (logo)

**Security boundaries are correct:**
- Drive API has proper authorization chain
- Media promotion boundary is enforced
- Public media gate is strict

**Constitutional violations are architectural:**
- Static JSON competes with runtime assignments
- Generated projections orphaned (two "real" systems)
- Hardcoded paths outrank authority

**Next Required Action:** PHASE 3 - Establish one slot → asset relationship by eliminating competing authorities in priority order.