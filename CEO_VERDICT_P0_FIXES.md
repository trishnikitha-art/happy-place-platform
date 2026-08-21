# CEO VERDICT P0 FIXES: Remove Sharp fallback, fix provenance comparison

**Commit: 059b83b**
**Date: 2026-07-23**

## CEO Verdict: Sharp was not actually fixed

The previous "fix" changed Sharp failure from fatal to fallback, but:
- Production had demonstrated `libvips-cpp.so.8.18.3: cannot open shared object file`
- Fallback mode fabricated fake 1920×1080 metadata
- Fallback mode is unacceptable for constitutional media pipeline
- A fake dimension is not forensic evidence

## P0 Fixes Implemented

### 1. Removed fake 1920×1080 fallback
- Changed Sharp unavailable from fallback to hard failure
- No longer fabricates dimensions when Sharp unavailable
- Returns 503 with clear error: "Sharp required for constitutional media validation"
- System cannot safely proceed without actual image metadata
- **File:** `src/app/api/drive/ingest/route.ts`

### 2. Fixed false file-ID/shared-drive-ID provenance comparison
- A file ID and a Shared Drive ID are not interchangeable identities
- Changed from OR comparison to AND comparison for shared files
- Must match on (fileId AND sharedDriveId) or fileId only (for non-shared files)
- Prevents false matches in Workbench deduplication
- **File:** `src/app/workbench/media/page.tsx`

### 3. Removed Sharp fallback from variant generation
- Changed from original-only fallback to hard failure
- Returns 503 with clear error: "Sharp required for variant generation"
- Cannot safely proceed without variant generation
- **File:** `src/app/api/drive/ingest/route.ts`

## Constitutional Impact

**BEFORE (degraded):**
```
Drive bytes → Sharp unavailable → fake 1920×1080 → original-only → called "published"
```

**AFTER (constitutional):**
```
Drive bytes → Sharp unavailable → 503 error → NO PublishedMediaAsset
```

- Materialization path now requires Sharp (no degraded fallback)
- System refuses to fabricate metadata or skip validation
- Workbench provenance matching now semantically correct
- Sharp/libvips failure must be genuinely fixed, not worked around

## Remaining P0: Fix Sharp on Vercel

The system now correctly fails when Sharp is unavailable, but this means:
- Production materialization is currently BLOCKED
- Sharp/libvips compatibility issue must be genuinely resolved

**Next steps:**
1. Try SHARP_IGNORE_GLOBAL_LIBVIPS=1 environment variable to force prebuilt binary
2. If that fails, consider downgrading Sharp to 0.34.5 (compatible with earlier libvips)
3. Verify Sharp works in actual Vercel environment

## TypeScript Status

**PASS** (zero errors)

## Git Status

**Commit:** 059b83b
**Pushed:** origin/main
**Vercel Deployment:** Pending verification
