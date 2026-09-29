# Runtime Authority Bootstrap Instructions

## Concrete Failure Identified

**Production Evidence:**
- GET /api/admin/projects/gallery?projectId=fences-001 returns HTTP 503
- Runtime log shows: `projectId: 'fences-001'`
- Error: "Runtime authority not initialized"

**Root Cause:**
- Runtime authority key `hpp:production:workbench-runtime-gallery:fences-001` does not exist
- Bootstrap endpoint created in commit `376ddd22` (2026-09-22) was never executed for existing projects
- Current filesystem shows `fences-001` has `galleryRevision: 3` with gallery `["fences-001-hero", "fences-001-after"]`

## Solution: Execute Bootstrap for fences-001

### Method 1: Direct Bootstrap Endpoint (Recommended)

Execute the existing bootstrap endpoint through authenticated Workbench:

```bash
# 1. Authenticate to Workbench
# Navigate to: https://happyplace-platform.vercel.app/workbench/media

# 2. Execute bootstrap for fences-001
POST /api/admin/projects/gallery/bootstrap
Content-Type: application/json

{
  "projectId": "fences-001"
}
```

**Expected Response:**
```json
{
  "success": true,
  "projectId": "fences-001",
  "gallery": ["fences-001-hero", "fences-001-after"],
  "galleryLength": 2,
  "currentRevision": 3,
  "source": "filesystem-bootstrap",
  "message": "Runtime authority initialized from filesystem projection"
}
```

### Method 2: Initialize-All Endpoint (After Fix Branch Deployment)

After deploying the fix branch `fix/runtime-authority-initialization`, execute:

```bash
POST /api/admin/projects/gallery/initialize-all
```

**Expected Response:**
```json
{
  "success": true,
  "results": {
    "totalProjects": 14,
    "initialized": 13,
    "skipped": 1,
    "failed": 0,
    "errors": []
  },
  "message": "Initialized 13 projects, skipped 1 (already initialized), failed 0"
}
```

## Verification Steps

After bootstrap execution:

### 1. Verify Runtime Authority Exists

```bash
GET /api/admin/projects/gallery?projectId=fences-001
```

**Expected Response:**
```json
{
  "success": true,
  "projectId": "fences-001",
  "gallery": ["fences-001-hero", "fences-001-after"],
  "galleryLength": 2,
  "currentRevision": 3,
  "state": "runtime",
  "hasStagedChanges": false,
  "source": "runtime-authority"
}
```

### 2. Verify Gallery Reorder Works

1. Open Workbench: https://happyplace-platform.vercel.app/workbench/media
2. Navigate to /our-work
3. Select a gallery item
4. Drag to reorder
5. Verify "Failed to queue gallery reorder" no longer appears
6. Verify pending order is created
7. Save and verify CAS succeeds

### 3. Verify Runtime Authority Key

Redis key: `hpp:production:workbench-runtime-gallery:fences-001`

Expected value:
```json
{
  "gallery": ["fences-001-hero", "fences-001-after"],
  "currentRevision": 3,
  "lastMutationTimestamp": "2026-09-23T...",
  "lastTransactionId": "BOOTSTRAP",
  "source": "filesystem-bootstrap"
}
```

## Why This Happened

The P0 runtime authority architecture was established in commit `376ddd22` (2026-09-22):
- Created bootstrap endpoint for one-time initialization
- Made runtime authority the sole CAS authority
- Added fail-closed semantics (503 if runtime authority missing)
- Never executed bootstrap for existing projects before production deployment

Historical evidence shows `fences-001` had runtime authority activity (revision 3), but the key is currently missing. This could be due to:
- Redis key namespace changes
- Redis data loss
- Deployment without bootstrap execution
- Manual intervention

## Preserved Architecture

The bootstrap operation preserves all P0 architectural guarantees:
- ✅ Runtime authority remains sole CAS authority
- ✅ No filesystem fallback in production mutations
- ✅ Fail-closed semantics when runtime authority is uninitialized
- ✅ Bootstrap only initializes from filesystem projection
- ✅ Bootstrap refuses to overwrite existing runtime authority
- ✅ Revision 3 is preserved (not reset to 0)
- ✅ Gallery IDs are preserved from filesystem

## Next Steps

1. Execute bootstrap for `fences-001` using Method 1 (immediate fix)
2. Verify gallery reorder works for `fences-001`
3. Deploy fix branch to enable Method 2 (bulk initialization)
4. Execute initialize-all for all projects
5. Verify gallery reorder works for all projects
6. Trace Steel-Frame media path (pergolas-001) separately
7. Investigate zero-height VisualSlot elements separately
