# PHASE 1H: SHARP ROOT CAUSE INVESTIGATION

## CEO MODE — PHOTO PIPELINE FORENSICS

**Status:** ⚠️ SHARP_UNAVAILABLE ROOT CAUSE IDENTIFIED

---

## GIT STATE

**Current HEAD:** `d8ef6bd` (Revert of c69dc8f)
**Working Tree:** Modified .generated files only (normal after graph generation)
**Status:** ✅ Clean for new work

---

## SHARP_ROOT CAUSE INVESTIGATION

### A. Where is Sharp Required?

**Location:** `src/app/api/drive/ingest/route.ts`

**Required For:**
1. **IMAGE_VALIDATION stage** (line 255-269)
   - Validates image is valid
   - Extracts actual dimensions
   - Returns `SHARP_UNAVAILABLE` if Sharp fails to load

2. **VARIANT_GENERATION stage** (line 346-360)
   - Generates WebP/AVIF variants
   - Generates thumbnails
   - Returns `SHARP_UNAVAILABLE` if Sharp fails to load

**Sharp Loading Attempt:**
```typescript
let sharp: any = null;
let sharpAvailable = false;
try {
  sharp = require('sharp');
  sharpAvailable = true;
} catch (e) {
  console.error('[MEDIA_INGEST] WARNING: Sharp failed to load');
  // Falls back to original-only mode
}
```

**Current Behavior:** Sharp is **required** for Drive ingestion route

---

### B. Is Sharp Actually a Required Production Dependency?

**Package.json:** Sharp IS installed as direct dependency
```json
"sharp": "^0.35.3"
```

**Vercel Config:** `SHARP_IGNORE_GLOBAL_LIBVIPS=1` is set

**Issue:** Sharp is installed but failing to load in the production environment

**Possible Causes:**
1. Native module not compatible with Vercel Node 24.x runtime
2. Prebuilt binaries not available for target platform
3. SHARP_IGNORE_GLOBAL_LIBVIPS is preventing Sharp from finding libvips
4. Sharp requires native compilation that Vercel cannot provide

---

### C. Is Sharp Only Used for Optional Transformation?

**NO** — Sharp is **required** for:
- Image validation (rejecting invalid images)
- Variant generation (WebP/AVIF thumbnails)
- Dimension extraction

**Without Sharp:** Drive ingestion route **fails completely** with `SHARP_UNAVAILABLE`

---

### D. Is Materialization Incorrectly Making Sharp Mandatory?

**YES** — The Drive ingestion route makes Sharp mandatory for ALL Drive media ingestion

**Problem:** This assumes ALL media must go through Sharp validation and variant generation

**Reality:** Existing static images in `public/images/` already exist with variants and don't need Sharp

---

### E. Where Does This Failure Occur?

**Environment:** Production Vercel runtime
**Route:** `/api/drive/ingest`
**Stage:** IMAGE_VALIDATION and VARIANT_GENERATION
**Trigger:** When Drive media is ingested via Workbench

**NOT occurring:**
- Static image serving from `public/images/`
- Build-time image processing
- Next.js Image component optimization

---

### F. Why Did the Old Working Pipeline Work?

**Old Pipeline:**
1. Static images in `public/images/projects/`
2. Direct paths in `media.v1.json`
3. No Sharp required
4. Images served directly by Next.js static file serving

**Evidence:** 100+ .webp files exist in `public/images/projects/` with variants (480, 768, 1080, thumb)

**New Pipeline:**
1. Drive source media
2. Sharp validation required
3. Sharp variant generation required
4. Blob storage required
5. KV persistence required

**Conflict:** New pipeline assumes ALL media must go through Drive+Sharp, but existing static media already works without it

---

## ACTUAL PHOTO PIPELINE TRACE

### Current Working Path (Static Images)

```
public/images/projects/*.webp (already exists)
        ↓
media.v1.json (static authority)
        ↓
getMediaById() (synchronous lookup)
        ↓
Next.js Image component
        ↓
Browser
```

**Sharp Required:** NO
**Works:** YES (photos previously worked beautifully)

---

### New Drive Materialization Path (Broken)

```
Drive source media
        ↓
/api/drive/ingest (requires Sharp validation)
        ↓
SHARP_UNAVAILABLE (fails here)
        ↓
No variant generation
        ↓
No Blob upload
        ↓
No PublishedMediaAsset
        ↓
FAILURE
```

**Sharp Required:** YES
**Works:** NO (SHARP_UNAVAILABLE error)

---

## CURRENT MEDIA AUTHORITY

**Static Authority:** `src/config/media.v1.json`
- Contains 21 media records
- All use local paths: `/images/projects/fences/FENCE BUILD-1080.webp`
- All have variants (webp, avif, responsive, thumbnail)
- No Drive IDs in static authority

**Dynamic Authority:** KV store (for Drive records)
- Empty or contains DriveReference records
- Sharp required for materialization
- Currently failing due to SHARP_UNAVAILABLE

**Conflict:** System has TWO media authorities (static + dynamic), but only one is working

---

## ROOT CAUSE

**CONFIRMED:** The Drive materialization route requires Sharp, but Sharp is failing to load in the Vercel production environment

**Why This Breaks Photos:**
1. The system was designed to require Drive materialization for ALL media
2. Sharp is mandatory for Drive materialization
3. Sharp is failing to load in production
4. This blocks ALL media ingestion
5. Existing static images still work, but NEW media cannot be added

**Architectural Issue:** The system does not have a fallback for when Sharp is unavailable
- Old assumption: Sharp will always be available
- New reality: Sharp may not be available in certain environments
- Missing: Graceful degradation to use original images without Sharp

---

## NEXT STEPS

**Option 1: Fix Sharp in Production**
- Investigate why Sharp is failing to load on Vercel Node 24.x
- Check if prebuilt binaries are available
- Verify SHARP_IGNORE_GLOBAL_LIBVIPS is not the problem
- May require different Sharp version or build configuration

**Option 2: Add Sharp Fallback**
- Allow Drive ingestion to proceed without Sharp
- Use original image without validation/variants
- Store as PublishedMediaAsset with minimal metadata
- Accept limitation: no WebP/AVIF variants, no dimension validation

**Option 3: Preserve Static Images Only**
- Keep existing static images working
- Disable Drive materialization until Sharp is fixed
- Allow users to add images via manual file upload instead of Drive

**Recommended Path:** Option 1 first (fix Sharp), then Option 2 (add fallback)

---

## PRESERVED ARCHITECTURE

**Drive Architecture:** ✅ Intact
- OAuth, Drive session, Drive discovery preserved
- Workbench preserved
- Provenance tracking preserved

**Scroll Work:** ✅ Preserved at diagnostic baseline
- LenisProvider diagnostics intact
- ScrollToTop diagnostics intact
- No scroll regression

**Static Images:** ✅ Preserved
- public/images/ files intact
- media.v1.json intact
- Static authority intact

---

## SHARP STATUS

**Package:** Installed (sharp@0.35.3)
**Vercel Config:** SHARP_IGNORE_GLOBAL_LIBVIPS=1
**Production Status:** FAILING to load
**Error:** SHARP_UNAVAILABLE in /api/drive/ingest

**Required Investigation:**
- Why is Sharp failing to load on Vercel Node 24.x?
- Are prebuilt binaries available for this platform?
- Is SHARP_IGNORE_GLOBAL_LIBVIPS preventing Sharp from working?
- Does Sharp need different configuration for Vercel?
