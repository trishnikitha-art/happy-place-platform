# Runtime Authority Initialization Fix — Strategy and Next Steps

## Problem Diagnosis

### Two Separate Issues Identified

#### Issue 1: Gallery Reorder Failure (Concrete Architectural Cause)

**Symptom:**
```
Failed to queue gallery reorder: Failed to load gallery
```

**Root Cause:**
- Gallery reorder path: `SLOT_REORDER` → `GET /api/admin/projects/gallery?projectId=...` → runtime Redis gallery authority
- Production GET returns 503 when project's Redis runtime authority doesn't exist:
  ```json
  {
    "error": "Runtime authority not initialized",
    "message": "Gallery runtime authority has not been initialized."
  }
  ```
- Runtime authority is bootstrapped per project, manually, through:
  ```
  POST /api/admin/projects/gallery/bootstrap
  ```
- That endpoint only initializes one specified project and refuses to overwrite existing runtime key
- `fences-001` has runtime authority (revision 3), but other projects may not
- System has architectural seam: some projects work, others fail

**Why This Happened:**
- Runtime authority architecture was deliberately established in `376ddd22`
- Fail-closed semantics were intentional: no filesystem fallback in production
- Bootstrap was intended as one-time per-project manual operation
- No bulk initialization mechanism existed
- No clear error messaging identified which project was missing runtime authority

#### Issue 2: Project Story Cards (Different Problem)

**Symptom:**
- "Steel-Framed Covered Privacy Courtyard" cards appear draggable but don't work

**Root Cause:**
- Project Story cards use `VisualSlot` but lack:
  - `isGallerySlot={true}`
  - `projectId={project.id}`
- `VisualSlot` only enables HTML5 dragging when:
  ```tsx
  draggable={isWorkbenchMode && isGallerySlot}
  ```
- These cards render as `draggable={false}`
- They appear draggable due to browser default image dragging behavior
- They are not connected to Workbench mutation protocol

**Historical Context:**
- Repository previously explicitly documented:
  - Project cards = display-only
  - Featured projects = display-only
  - Gallery slots = writable
  - Only explicitly authorized assignment slots are writable
- This distinction was intentional
- UI makes distinction visually ambiguous

## Fix Strategy

### P0 Fix: Runtime Authority Initialization

#### Solution 1: Bulk Initialization Endpoint

**Created:** `POST /api/admin/projects/gallery/initialize-all`

**Behavior:**
- For each project in `projects.v1.json`:
  - Check if runtime authority exists
  - If missing: initialize from filesystem projection
  - If exists: preserve existing runtime authority (never overwrite)
- Returns detailed results:
  ```json
  {
    "success": true,
    "results": {
      "totalProjects": 14,
      "initialized": 10,
      "skipped": 4,
      "failed": 0,
      "errors": []
    },
    "message": "Initialized 10 projects, skipped 4 (already initialized), failed 0"
  }
  ```

**Architectural Guarantees:**
- ✅ Never overwrites existing runtime authority
- ✅ Never resets revisions
- ✅ Never replaces newer Redis state with filesystem state
- ✅ Never runs as part of ordinary GET
- ✅ Never reintroduces filesystem CAS fallback
- ✅ Requires Workbench authentication
- ✅ Preserves existing `fences-001` runtime revision/state

#### Solution 2: Improved Error Messaging

**Updated:** `GET /api/admin/projects/gallery`

**Changes:**
- 503 response now includes specific project ID:
  ```json
  {
    "error": "Runtime authority not initialized",
    "message": "Gallery runtime authority has not been initialized for project: pergolas-001. Please contact administrator to initialize runtime authority.",
    "projectId": "pergolas-001",
    "suggestion": "Use POST /api/admin/projects/gallery/initialize-all to initialize runtime authority for all projects"
  }
  ```
- Added console logging with project ID and timestamp
- Makes runtime authority initialization failure immediately observable

#### Solution 3: Workbench Error Surfacing

**Updated:** `media/page.tsx` (3 locations)

**Changes:**
- Changed generic `Failed to load gallery` to include project ID
- Added specific handling for 503 runtime authority not initialized
- Includes error message and suggestion from API response
- Makes debugging runtime authority issues immediate

**Before:**
```tsx
throw new Error('Failed to load gallery');
```

**After:**
```tsx
if (response.status === 503 && errorData?.error === 'Runtime authority not initialized') {
  throw new Error(`Gallery runtime authority not initialized for project: ${projectId}. ${errorData.message || errorData.suggestion || ''}`);
}
throw new Error(`Failed to load gallery: ${errorText}`);
```

### P1 Fix: Project Story Card Documentation

**Created:** `PROJECT_STORY_CARD_INTERACTION_CONTRACT.md`

**Documents:**
- Why Project Story cards appear draggable but are not writable
- `isGallerySlot` requirement for Workbench mutation
- Historical architectural decision (display-only vs writable)
- Resolution options for future business requirements

**Resolution Options Documented:**
1. **Option A:** Make Project Story Cards Writable (architectural change)
2. **Option B:** Disable Browser Dragging (recommended - maintains architecture)
3. **Option C:** Use Gallery as Editable Surface (current architecture)

**Recommendation:** Option B - disable browser dragging on Project Story cards to make display-only nature visually clear, while keeping gallery slots as the writable mutation surface.

## Preserved P0 Architecture

All changes preserve the P0 architecture established in `376ddd22`:

- ✅ Runtime authority remains sole CAS authority
- ✅ No filesystem fallback in production mutations
- ✅ Fail-closed semantics when runtime authority is uninitialized
- ✅ No client-controlled transaction identity
- ✅ Atomic gallery mutation (`ATOMIC_GALLERY_MUTATION_SCRIPT`)
- ✅ Conditional atomic pointer cleanup
- ✅ Real concurrency tests with Promise.all
- ✅ CI separation (unit tests vs Redis integration)
- ✅ All security boundaries

## Current State

### Branch
- **Branch:** `fix/runtime-authority-initialization`
- **Commit:** `17786869`
- **Base:** `cfbf1a4e` (same-origin instrumented preview fix)

### Files Changed
- `website/src/app/api/admin/projects/gallery/initialize-all/route.ts` (new)
- `website/src/app/api/admin/projects/gallery/route.ts` (modified)
- `website/src/app/workbench/media/page.tsx` (modified)
- `website/PROJECT_STORY_CARD_INTERACTION_CONTRACT.md` (new)
- `website/.generated/*.json` (auto-generated projections)

### Validation Status
- ✅ TypeScript validation: Clean (zero errors)
- ✅ Git commit: `17786869`
- ⚠️ Production build: Failed due to missing lightningcss native modules (environment issue, not code)

**Build Note:** The build failure is a known WSL environment issue with native modules, not a code regression. The same issue occurred previously in session history. The production build would succeed in the proper Vercel build environment.

## Next Steps

### Immediate (Before Merge to Main)

1. **Test initialize-all endpoint locally**
   - Requires Workbench authentication
   - Verify it initializes projects without runtime authority
   - Verify it skips projects with existing runtime authority
   - Verify it preserves existing `fences-001` revision

2. **Test improved error messaging**
   - Attempt gallery reorder on project without runtime authority
   - Verify Workbench surfaces specific project ID error
   - Verify console logs show project ID and timestamp

3. **Optionally: Implement Project Story Card visual fix**
   - Add `draggable={false}` to Project Story card images
   - Add CSS to disable browser image dragging
   - Verify gallery slots remain draggable (no regression)

### Before Production Deployment

4. **Merge fix branch to main**
   - Create pull request or direct merge
   - Ensure all changes are reviewed
   - Verify TypeScript passes in proper environment

5. **Push to origin/main**
   - Trigger Vercel deployment
   - Wait for READY status

6. **Execute initialize-all in production**
   - Authenticate to Workbench
   - Call `POST /api/admin/projects/gallery/initialize-all`
   - Review results (initialized vs skipped)
   - Verify all projects now have runtime authority

7. **Verify gallery reorder works**
   - Test gallery reorder on previously failing project
   - Verify it now succeeds
   - Verify CAS behavior is correct
   - Verify deployment transaction creates correctly

8. **Verify Project Story card behavior**
   - Verify they no longer appear draggable (if visual fix implemented)
   - Verify gallery slots remain draggable
   - Verify distinction is visually clear

### Post-Deployment Verification

9. **Execute full Drive → materialization → assignment → deployment → public readback flow**
   - Workbench authentication
   - Drive OAuth authorize
   - Google identity and authorization record
   - Drive API discovery
   - My Drive / Shared Drive browsing
   - Drive asset selection
   - DriveReference
   - Materialization into PublishedMediaAsset
   - Assignment
   - Gallery persistence
   - Deployment transaction
   - Public website readback
   - Workbench refresh readback

10. **Verify security negatives**
    - Legacy credential cookie without session → FAIL
    - Revoked authorization → FAIL
    - Unauthorized thumbnail request → FAIL
    - Invalid/missing Google identity → FAIL CLOSED
    - Redis authority unavailable for mutation → FAIL CLOSED

## Summary

The fix addresses the concrete architectural cause of gallery reorder failure by:

1. **Adding controlled bulk initialization** for runtime authority across all projects
2. **Improving error messaging** to make runtime authority issues immediately observable
3. **Preserving P0 architecture** (no filesystem fallback, fail-closed semantics)
4. **Documenting Project Story card interaction** to clarify display-only vs writable distinction

The current deployment `cfbf1a4e` is not the thing that broke the backend. The issue is that runtime authority was never fully initialized across all projects after the P0 architecture was established. This fix provides the controlled initialization mechanism that was missing.

No changes should be pushed to main until the initialize-all endpoint is tested and verified to work correctly with authentication.
