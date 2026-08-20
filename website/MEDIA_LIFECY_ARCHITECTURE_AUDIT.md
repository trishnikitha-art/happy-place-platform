# MEDIA LIFECY ARCHITECTURE AUDIT

## CURRENT EXISTING-PHOTO PATH

**Source:** Files in `public/images/projects/` (already on disk)

1. **GraphReconstructor** → `src/lib/media/graph-reconstructor.ts`
   - Scans `public/images/projects/` for image files
   - Groups files by base name (e.g., FENCE BUILD-480.webp, FENCE BUILD-768.webp)
   - Finds original (largest or .jpg/.jpeg)
   - Computes SHA-256 hash of original file
   - Generates stable ID from content hash + base name
   - Builds variant manifest (webp, avif, thumbnail, sizes)
   - Creates CanonicalAsset with id, contentHash, variantManifest, status
   - Infers projectId, serviceId, placement from folder structure
   - Returns CanonicalAsset[]

2. **Media Authority** → `src/config/media.v1.json`
   - Stores Media records with:
     - id, driveId, filename, type, orientation, dimensions
     - variants: { original, web, webp, avif, thumbnail }
     - metadata: alt, description, service, city, county, state, projectId, tags, roles
     - provenance: drive_canonical, current_authority, status
   - Components access via getMediaById(), getProjectMedia(), getProjectHero(), etc.
   - Intent-based adapters for UI components

3. **Media Workbench** → `src/app/workbench/media/page.tsx`
   - Can view and map existing media to website slots
   - Shows VisualSlot registry from iframe preview
   - Can select assets and assign to slots
   - Loads canonical data from media.v1.json

## CURRENT NEW-DRIVE-PHOTO PATH

**Source:** Google Drive (remote)

1. **Drive Discovery** → `src/lib/drive/drive-discovery.ts`
   - Discovers Drive structure (My Drive, Shared Drives)
   - Lists files and folders
   - Returns DriveFile objects with: id, name, mimeType, size, modifiedTime, parents, thumbnailLink, webViewLink, webContentLink

2. **Drive Reference API** → `src/app/api/drive/reference/route.ts`
   - POST /api/drive/reference with { driveId }
   - Gets Drive file metadata from DriveDiscovery
   - Checks for existing record with matching drive.fileId in media.v1.json
   - Creates/updates Media record:
     - id: generated from filename + timestamp (NOT content hash-based)
     - source: 'google-drive'
     - drive: { fileId, name, mimeType, webViewUrl, modifiedTime }
     - variants: { web: `/api/drive/files/${driveId}/thumbnail` } (proxy, not actual file)
     - provenance: { drive_canonical: true, current_authority: true, status: 'referenced' }
   - Writes to media.v1.json
   - **STOPS HERE** - No original asset download, no WebP conversion, no content hash, no canonical graph entry

3. **Media Workbench**
   - Can select Drive file and click "Use This Asset"
   - Calls /api/drive/reference
   - Reloads canonical data
   - New media record appears in Workbench list
   - BUT it's a lightweight reference-only record

## FIRST BROKEN/MISSING TRANSITION

**Missing transition:** Drive file → original asset → content hash → canonical graph entry → WebP variants → full Media record

**Breakdown:**
- Drive files are NOT downloaded as original assets
- No SHA-256 content hash computation for Drive files
- No stable ID generation (uses filename + timestamp instead of content hash)
- No entry in canonical graph (graph-reconstructor only scans local files)
- No WebP/AVIF/thumbnail variants generated
- Only thumbnail proxy via `/api/drive/files/${driveId}/thumbnail`
- Media record exists but is lightweight (no original asset, no proper variants)

## CANONICAL MEDIA ENTITY

**Canonical media entity = Media record in media.v1.json**

**Evidence:**
- All UI components access media via getMediaById() from media.v1.json
- Intent-based adapters (getProjectMedia, getProjectHero, etc.) query media.v1.json
- Media records have complete metadata, variants, provenance, roles
- GraphReconstructor produces CanonicalAsset but this is a separate system not currently integrated with the primary media.v1.json authority

**Prerequisite for media adjustment:**
- A Media record must exist in media.v1.json
- The Media record must have variants (original, web, webp, avif, thumbnail)
- The Media record must have proper projectId, roles, and placement metadata

## DRIVE INTEGRATION BOUNDARY

**Drive is currently:**
- **INGESTION SOURCE + ADAPTER** - Drive files can be discovered and referenced into the media.v1.json system, but as lightweight references rather than full canonical media objects

**Evidence:**
- /api/drive/reference creates Media records from Drive files
- Drive files get driveId, webViewLink, but no original asset download
- No integration with GraphReconstructor's canonical graph system
- Drive is NOT the media authority - media.v1.json is

**Preferred future:**
- Drive should remain ingestion source, but Drive files should become full canonical media objects through the same pipeline as local files

## EXISTING ADJUSTMENT PREREQUISITES

**Before a photo can be adjusted by the media-management system:**

1. **Media record must exist in media.v1.json** with:
   - id (stable identifier)
   - variants: { original, web, webp, avif, thumbnail }
   - projectId, roles, placement metadata
   - provenance metadata

2. **Original asset must exist** (for content hash and conversion source)

3. **WebP/AVIF variants must exist** (for responsive delivery)

4. **Content hash must exist** (for stable ID generation)

**Evidence:**
- GraphReconstructor requires original file to compute content hash
- Media workbench assumes variants exist (variants.webp, variants.original, variants.avif)
- Components access variants.mediaId, variants.web, variants.thumbnail
- Media Authority defines the canonical schema with variants object

## WEBP/MAPPING STATUS

**WebP/mapping is DOWNSTREAM of photo creation, NOT responsible for creating canonical media representation**

**Evidence:**
- GraphReconstructor builds variant manifest from existing files on disk
- It scans `public/images/projects/` and groups variants by base name
- It assumes original file and variants already exist
- No WebP conversion happens in GraphReconstructor - it only catalogs existing variants
- The WebP/mapping work is a separate downstream enhancement that operates on already-created media

**Answer:** YES - WebP/mapping is downstream. It assumes media records and original assets already exist. It does not create the canonical media representation.

## SMALLEST ARCHITECTURAL GAP

**Gap:** Drive files are referenced but not processed into full canonical media objects

**Specific missing transitions:**
1. Drive file → original asset download (no file download from Drive)
2. Original asset → content hash computation (no SHA-256 hash of Drive file)
3. Content hash → stable ID generation (Drive uses filename + timestamp)
4. Stable ID → canonical graph entry (GraphReconstructor only scans local files)
5. File → WebP/AVIF/thumbnail generation (only thumbnail proxy via Drive API)

**Surgical implementation candidate:**
Add a pipeline step in /api/drive/reference that:
1. Downloads the Drive file as original asset
2. Computes SHA-256 content hash
3. Generates stable ID from content hash + base name
4. Generates WebP/AVIF/thumbnail variants
5. Creates full Media record with proper variants
6. Optionally adds entry to canonical graph

This would connect new Drive photos to the existing canonical media lifecycle.

## RISKS

1. **Bandwidth/storage cost:** Downloading all Drive files would consume bandwidth and storage
2. **Performance:** Variant generation for many files could be slow
3. **Duplicate detection:** Need to avoid re-importing files already in media.v1.json
4. **Drive API limits:** Drive API rate limits for large file downloads
5. **Provenance preservation:** Must maintain Drive provenance (drive_canonical: true, current_authority: true)
6. **Id stability:** Must use content hash-based IDs for stability, not timestamp-based

## NEXT READ-ONLY VERIFICATION

**Verification results:**

1. ✓ **Existing photos in media.v1.json have full variants:** All 21 existing media records have variants with keys: original, web, webp, avif, thumbnail. Example from fences-001-hero:
   - original: "/images/projects/fences/FENCE BUILD-1080.webp"
   - web: "/images/projects/fences/FENCE BUILD-1080.webp"
   - webp: "/images/projects/fences/FENCE BUILD-1080.webp"
   - avif: "/images/projects/fences/FENCE BUILD-1080.avif"
   - thumbnail: "/images/projects/fences/FENCE BUILD-thumb.webp"

2. ✓ **Components access variants via media.variants.*:** Components use variants.web, variants.original, variants.avif, variants.thumbnail in:
   - before-after-slider.tsx
   - project-photos.tsx
   - workbench/media/page.tsx
   - workbench/media/page-ordering.tsx
   - our-work/OurWorkClient.tsx
   - validation-engine.ts (validates presence of web, thumbnail, blur)

3. ✓ **GraphReconstructor only processes local files:** GraphReconstructor scans `public/images/projects/` and builds CanonicalAsset from files on disk. It does not integrate with Drive or process Drive files.

4. ✓ **/api/drive/reference creates lightweight reference-only records:** The Drive reference API creates Media records with:
   - source: 'google-drive'
   - drive: { fileId, name, mimeType, webViewUrl, modifiedTime }
   - variants: { web: `/api/drive/files/${driveId}/thumbnail` } (proxy, not actual file)
   - No original asset download
   - No WebP/AVIF/thumbnail generation
   - No content hash computation
   - **No current media.v1.json records have source: 'google-drive'** (verified via grep)

5. ✓ **No WebP conversion in current Drive integration:** Drive reference API only creates a thumbnail proxy. No image processing library (sharp, etc.) is used. No WebP/AVIF generation happens for Drive files.

6. ✓ **media.v1.json is the single canonical media authority:** All components access media via getMediaById(), getProjectMedia(), getProjectHero() from media.v1.json. Intent-based adapters are defined in src/lib/media.ts. GraphReconstructor produces CanonicalAsset but this is a separate parallel system not integrated with the primary media.v1.json authority.

7. ✓ **Media Workbench only works with media.v1.json records:** Workbench loads canonical data via loadCanonicalData() which loads VisualAsset registry derived from media.v1.json. It can browse Drive but creates entries in media.v1.json via /api/drive/reference.

8. ✓ **Adjustment system requires full Media records with variants:** The media-management system requires:
   - Media record in media.v1.json
   - variants object with original, web, webp, avif, thumbnail keys
   - Proper projectId, roles, placement metadata
   - Current Drive reference records only have a single 'web' variant pointing to a proxy URL

**HARD STOP**
