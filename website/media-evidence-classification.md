# MEDIA EVIDENCE CLASSIFICATION REPORT

**Date:** 2026-08-12  
**Repository:** C:\Users\nolan\CascadeProjects\happy-place-platform\website  
**Scope:** All media-related files across metadata, config, generated, archive, analysis, docs, and scripts  
**Classification System:** AUTHORITATIVE, DERIVED, HISTORICAL, DISCOVERY, PROJECTION, CACHE, LEGACY, UNKNOWN

---

## CLASSIFICATION SUMMARY

**Total Files Classified:** 46  
**AUTHORITATIVE:** 10  
**DERIVED:** 8  
**HISTORICAL:** 10  
**DISCOVERY:** 15  
**PROJECTION:** 3  
**CACHE:** 0  
**LEGACY:** 0  
**UNKNOWN:** 0

---

## CRITICAL FINDINGS

### Existing Solved Infrastructure

**1. Identity System (REUSABLE)**
- **Implementation:** UUID v5 from SHA-256 content hash
- **Location:** `scripts/image-pipeline.mjs` (generateStableId function)
- **Location:** `src/config/manifest.v1.json` (uuid, stableId, contentHash fields)
- **Namespace:** DNS namespace "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
- **Determinism:** Same content = same ID
- **Status:** READY TO USE

**2. Duplicate Detection (REUSABLE)**
- **Implementation:** SHA-256 content hashing
- **Location:** `src/config/manifest.v1.json` (contentHash field)
- **Location:** `generated/golden-manifest.json` (imageHashes with SHA-256)
- **Location:** `analysis/DUPLICATE_DETECTION_REPORT.md` (6-metric detection)
- **Status:** READY TO USE

**3. Drive Connector (REUSABLE)**
- **Implementation:** Complete Drive API adapter
- **Location:** `scripts/image-source/drive-image-source.mjs`
- **Location:** `scripts/drive-sync.mjs` (stub implementation)
- **OAuth Config:** `src/config/oauth.v1.json`
- **Status:** NEEDS CREDENTIALS ONLY

**4. Golden Manifest (REUSABLE)**
- **Implementation:** Canonical SHA-256 hash references
- **Location:** `generated/golden-manifest.json`
- **Coverage:** 12 images
- **Purpose:** Regression test baseline
- **Status:** READY TO USE

**5. August 3 Baseline (COMPLETE)**
- **Implementation:** Full August 3 baseline documentation
- **Location:** `HPP_PUBLIC_MEDIA_BASELINE_2026-08-03.md`
- **Location:** `archive/legacy-runtime/media.v1.json`
- **Coverage:** 21 assets, 6 projects, full Drive IDs, full variant paths
- **Status:** COMPLETE EVIDENCE

**6. Drive Reorganization (COMPLETE)**
- **Implementation:** Drive folder structure reorganization
- **Location:** `generated/DRIVE-REORGANIZATION-COMPLETE.md`
- **Coverage:** 26 images, 6 projects, MASTER/Variants organization
- **Status:** COMPLETE EVIDENCE

### Critical Gaps

**1. No PING90 → HPP Identity Mapping**
- **Issue:** Two separate identity systems exist (PING90 ArtifactId vs HPP UUID v5)
- **Gap:** No bridge/mapping between the two systems
- **Impact:** Cannot leverage PING90 constitutional identity system
- **Recommendation:** Create identity mapping document

**2. Drive IDs Removed from Current State**
- **Issue:** August 3 baseline had Drive IDs in all 21 assets
- **Gap:** Current media.v1.json has 4 assets with NO Drive IDs
- **Impact:** Lost connection to Drive source material
- **Recommendation:** Restore Drive IDs from legacy-runtime/media.v1.json

**3. Brand MediaIds Are Null**
- **Issue:** logo.mediaId and office.mediaId are null in brand.v1.json
- **Gap:** Missing brand assets in registry
- **Impact:** Logo and office portrait not rendered
- **Recommendation:** Map brand assets to media.v1.json

**4. Dual Drive Structures**
- **Issue:** Personal Drive (H:\My Drive\Happy Place Media\) and Shared Drive (H:\Shared drives\Happy Place Carpentry Website) both exist
- **Gap:** Authority unclear which is the source of truth
- **Impact:** Confusion about which Drive to use
- **Recommendation:** Clarify authority (per DRIVE_SOURCE_FORENSIC_MAP.md, Shared Drive is constitutional authority)

**5. Variant Key Mismatch**
- **Issue:** Components access variants.web, media.v1.json uses variants.webp
- **Gap:** Variant key naming mismatch
- **Impact:** Images don't render even if mediaIds are set
- **Recommendation:** Standardize variant key naming

---

## DETAILED CLASSIFICATION

### AUTHORITATIVE FILES (10)

#### metadata/canonical-media-graph.json
- **Media identities:** yes (UUID v5-based IDs)
- **Content hashes:** no
- **Drive IDs:** yes (shared_drive_path field)
- **PING90 ArtifactId:** no
- **HPP UUID v5:** yes
- **Identity mappings:** yes (id → filename → shared_drive_path)
- **Duplicate detection:** no
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Canonical media graph authority with 11,699 lines of image metadata, EXIF data, GPS coordinates, camera settings, Drive path references

#### metadata/constitutional-authorities.json
- **Media identities:** no
- **Content hashes:** no
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** no
- **Duplicate detection:** no
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Defines constitutional authorities for projection system (ProjectionManager, ProjectionGenerator, etc.)

#### metadata/constitutional-scoring.json
- **Media identities:** no
- **Content hashes:** no
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** no
- **Duplicate detection:** no
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Defines scoring factors and thresholds for image ranking (composition, sharpness, brightness, resolution, visibility)

#### src/config/media.v1.json
- **Media identities:** yes (4 entries)
- **Content hashes:** no
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** yes (UUID format in some IDs)
- **Identity mappings:** yes (id → filename → variants)
- **Duplicate detection:** no
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Current runtime authority with only 4 media assets (down from 21 in August 3 baseline). Missing Drive IDs

#### src/config/brand.v1.json
- **Media identities:** yes (brand-hero-001, brand-owner-001, brand-logo-001, brand-office-001)
- **Content hashes:** no
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (mediaId references to media.v1.json)
- **Duplicate detection:** no
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Brand asset authority. Note: logo.mediaId and office.mediaId are null

#### src/config/projects.v1.json
- **Media identities:** yes (media.hero, media.before, media.after as filenames)
- **Content hashes:** no
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (project → media filenames)
- **Duplicate detection:** no
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Current project authority with only 3 projects (down from 6 in August 3 baseline). Media references are filenames, not UUIDs

#### src/config/manifest.v1.json
- **Media identities:** yes (12 assets with UUID v5, contentHash, stableId)
- **Content hashes:** yes (SHA256 contentHash field)
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** yes (uuid field, stableId field)
- **Identity mappings:** yes (uuid → contentHash → stableId → id)
- **Duplicate detection:** yes (via contentHash)
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Machine-generated image manifest with UUID v5 identity system and SHA256 content hashing. Source of truth for 12 canonical images

#### src/config/oauth.v1.json
- **Media identities:** no
- **Content hashes:** no
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** no
- **Duplicate detection:** no
- **Drive connector:** yes (Google Drive OAuth scopes)
- **August 3 references:** no
- **Notes:** OAuth configuration for Google services including Drive, Contacts, Gmail, Calendar, Maps, Business Profile

#### generated/golden-manifest.json
- **Media identities:** yes (12 image IDs in imageHashes)
- **Content hashes:** yes (SHA256 hashes for all 12 images)
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (image ID → SHA256 hash)
- **Duplicate detection:** yes (canonical hash references)
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Regression test baseline with canonical SHA256 hashes for 12 images. Golden reference for detecting image changes

#### analysis/CANONICAL_MEDIA_GRAPH_SCHEMA.md
- **Media identities:** yes (UUID v5 based on file path)
- **Content hashes:** yes (sha256 byte hash)
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** yes (UUID v5 for all node types)
- **Identity mappings:** yes (graph edges define relationships)
- **Duplicate detection:** yes (via sha256)
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Constitutional schema for media graph architecture. Defines node types (ImageNode, ProjectNode, ServiceNode, VariantNode) and edge types

---

### DERIVED FILES (8)

#### generated/drive-mapping-final.json
- **Media identities:** yes (mediaId fields)
- **Content hashes:** no
- **Drive IDs:** yes (folder structure references)
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (website mediaId → Drive folder structure)
- **Duplicate detection:** no
- **Drive connector:** yes (Drive folder mappings)
- **August 3 references:** no
- **Notes:** Final Drive mapping with 6 projects, 23 media files, 100% completion status

#### generated/production-image-identities.json
- **Media identities:** yes (stable_id fields)
- **Content hashes:** no
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (stable_id → current_original → location)
- **Duplicate detection:** no
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Production identity system with version history and rollback workflow

#### generated/human-centered-mapping.json
- **Media identities:** yes (mediaId fields)
- **Content hashes:** no
- **Drive IDs:** yes (Drive folder structure with emoji-based UI)
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (website → Drive with human-friendly folder names)
- **Duplicate detection:** no
- **Drive connector:** yes (Drive folder structure)
- **August 3 references:** no
- **Notes:** Human-centered Drive mapping with emoji-based folder names

#### generated/drive-mapping-table.json
- **Media identities:** yes (mediaId fields)
- **Content hashes:** no
- **Drive IDs:** yes (Drive folder references)
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (website → Drive with match status)
- **Duplicate detection:** no
- **Drive connector:** yes (Drive folder structure)
- **August 3 references:** no
- **Notes:** Drive mapping table with match status (FULL_MATCH, PARTIAL_MATCH, NOT_FOUND_IN_DRIVE)

#### generated/ai-confidence-system.json
- **Media identities:** no
- **Content hashes:** no
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** no
- **Duplicate detection:** no
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** AI confidence thresholds and detection types for project detection, hero candidate assessment, gallery suitability, image quality

#### generated/dry-run-system.json
- **Media identities:** no
- **Content hashes:** no
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** no
- **Duplicate detection:** no
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Dry-run system for previewing changes before deployment

#### generated/review-required-policy.json
- **Media identities:** no
- **Content hashes:** no
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** no
- **Duplicate detection:** no
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Review-required policy preventing silent AI publishing

#### generated/enhanced-version-analysis.json
- **Media identities:** yes (project names and filenames)
- **Content hashes:** no
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (project → master → variants)
- **Duplicate detection:** yes (file size comparison for version detection)
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Analysis of file sizes and formats to identify potential enhanced versions

---

### HISTORICAL FILES (10)

#### archive/legacy-runtime/canonical-media-graph.json
- **Media identities:** yes (UUID v5-based IDs)
- **Content hashes:** no
- **Drive IDs:** yes (shared_drive_path field)
- **PING90 ArtifactId:** no
- **HPP UUID v5:** yes
- **Identity mappings:** yes (id → filename → shared_drive_path)
- **Duplicate detection:** no
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Legacy canonical media graph with full EXIF data and Drive path references

#### archive/legacy-runtime/canonical-media.json
- **Media identities:** yes (canonical_id field with UUID v5)
- **Content hashes:** no
- **Drive IDs:** yes (shared_drive_path field)
- **PING90 ArtifactId:** no
- **HPP UUID v5:** yes (canonical_id format)
- **Identity mappings:** yes (canonical_id → original_filename → shared_drive_path)
- **Duplicate detection:** no
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Legacy canonical media authority with 21 fields per image including EXIF, GPS, camera settings

#### archive/legacy-runtime/media.v1.json
- **Media identities:** yes (id fields)
- **Content hashes:** no
- **Drive IDs:** yes (driveId field)
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (id → driveId → filename)
- **Duplicate detection:** no
- **Drive connector:** yes (driveId references)
- **August 3 references:** no
- **Notes:** Legacy media.v1.json with Drive IDs that were removed in current version. Contains full variant paths (original, web, webp, avif, thumbnail). AUGUST 3 BASELINE STATE

#### archive/legacy-runtime/projects.v1.json
- **Media identities:** yes (media.hero, media.before, media.after as media IDs)
- **Content hashes:** no
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (project → media IDs)
- **Duplicate detection:** no
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Legacy projects.v1.json with 6 projects (vs current 3). Media references use media IDs (not filenames)

#### archive/legacy-gallery/gallery.json
- **Media identities:** yes (uuid, contentHash, stableId fields)
- **Content hashes:** yes (SHA256 contentHash)
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** yes (uuid, stableId)
- **Identity mappings:** yes (uuid → contentHash → stableId → id)
- **Duplicate detection:** yes (via contentHash)
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Legacy gallery authority with UUID v5 identity system and SHA256 content hashing

#### archive/legacy-gallery/gallery.manifest.json
- **Media identities:** no
- **Content hashes:** yes (galleryHash SHA256)
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** no
- **Duplicate detection:** yes (galleryHash for change detection)
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Legacy gallery manifest with pipeline metadata (pipelineVersion, pipelineCommit, stats)

#### archive/historical-analysis/MediaInventory.json
- **Media identities:** no (assetId: null for all entries)
- **Content hashes:** yes (SHA256 for all 43 files)
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** no
- **Duplicate detection:** yes (via SHA256)
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Historical inventory of 43 files from Shared Drive with SHA256 hashes, dimensions, file sizes, EXIF data

#### archive/historical-analysis/MISSING_ORIGINALS_REPORT.md
- **Media identities:** yes (21 originals documented)
- **Content hashes:** no
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (source files → canonical media IDs)
- **Duplicate detection:** no
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Documents recovery of 22 unique photographic originals (21 from repo + 1 from Drive). Git archaeology evidence proving zero photographs lost from git

#### archive/historical-analysis/PHOTO_RECONSTRUCTION_REPORT.md
- **Media identities:** yes (21 canonical mappings)
- **Content hashes:** no
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (physical originals → media records → projects)
- **Duplicate detection:** yes (duplicate TRIMREPAIR entry fixed)
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Cross-referenced 3 authority sources to produce canonical mapping of 21 photos

#### HPP_PUBLIC_MEDIA_BASELINE_2026-08-03.md
- **Media identities:** yes (21 assets from August 3 baseline)
- **Content hashes:** no
- **Drive IDs:** yes (August 3 had full Drive IDs)
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (21 assets across 6 projects)
- **Duplicate detection:** no
- **Drive connector:** yes (August 3 Drive ID references)
- **August 3 references:** yes (entire document is August 3 baseline)
- **Notes:** Documents August 3 baseline state at commit 5ba201c. 21 media assets with full Drive IDs, 6 projects, full variant paths

---

### DISCOVERY FILES (15)

#### analysis/DUPLICATE_DETECTION_REPORT.md
- **Media identities:** yes (43 images analyzed)
- **Content hashes:** yes (SHA256 byte hash)
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** no
- **Duplicate detection:** yes (perceptual hash, SHA256, filename similarity, EXIF similarity, dimension comparison, timestamp clustering)
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Comprehensive duplicate detection using 6 metrics. Found 6 duplicate groups with 14 images, 35 unique images

#### analysis/CANONICAL_MEDIA_AUTHORITY.md
- **Media identities:** yes (canonical_id described)
- **Content hashes:** no
- **Drive IDs:** yes (shared_drive_path described)
- **PING90 ArtifactId:** no
- **HPP UUID v5:** yes (canonical_id is UUID v5 based on file path)
- **Identity mappings:** yes (canonical_id → shared_drive_path)
- **Duplicate detection:** no
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** SUPERSEDED BY GRAPH ARCHITECTURE. Documents canonical media authority before migration to graph architecture

#### scripts/drive-sync.mjs
- **Media identities:** yes (Drive file ID as canonical identity)
- **Content hashes:** yes (MD5 checksum from Drive API)
- **Drive IDs:** yes (Drive file ID field)
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (driveId → checksum)
- **Duplicate detection:** yes (via MD5 checksum)
- **Drive connector:** yes (full Drive API integration)
- **August 3 references:** no
- **Notes:** Drive sync module with stub implementation. Uses Drive File ID as canonical identity

#### scripts/image-source/drive-image-source.mjs
- **Media identities:** yes (driveId field)
- **Content hashes:** yes (md5Checksum from Drive API)
- **Drive IDs:** yes (driveId field)
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (driveId → md5Checksum)
- **Duplicate detection:** yes (via md5Checksum)
- **Drive connector:** yes (full Drive API client with googleapis)
- **August 3 references:** no
- **Notes:** DriveImageSource adapter for ImageSource interface. Complete Drive API integration

#### scripts/image-source/filesystem-image-source.mjs
- **Media identities:** yes (filename-based)
- **Content hashes:** no
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (filename → path)
- **Duplicate detection:** no
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** FilesystemImageSource adapter for local filesystem. Default adapter for development

#### scripts/image-source/image-source.mjs
- **Media identities:** no (interface definition)
- **Content hashes:** no
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** no
- **Duplicate detection:** no
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Abstract interface for photo ingestion. Defines constitutional invariant: repository never owns original photography

#### scripts/image-pipeline.mjs
- **Media identities:** yes (generateStableId function using UUID v5)
- **Content hashes:** yes (SHA-256 content hashing)
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** yes (generateStableId creates UUID v5 from contentHash)
- **Identity mappings:** yes (contentHash → UUID v5 stableId)
- **Duplicate detection:** yes (via contentHash)
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** V1 Image Pipeline with deterministic UUID v5 identity generation. Constitutional pipeline with no AI, no cloud

#### scripts/generate-drive-ids.mjs
- **Media identities:** yes (filename-based driveId generation)
- **Content hashes:** no
- **Drive IDs:** yes (driveId field generation)
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (filename → driveId)
- **Duplicate detection:** no
- **Drive connector:** yes (Drive ID mappings)
- **August 3 references:** no
- **Notes:** Script to populate driveId fields in media.v1.json. Maps each media entry to canonical MASTER file location in Drive

#### scripts/inventory-images.mjs
- **Media identities:** yes (mediaId, filename)
- **Content hashes:** no
- **Drive IDs:** yes (driveId field)
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (homepage → brand → projects)
- **Duplicate detection:** no
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Image inventory script crawling all pages and components. Creates comprehensive mapping table for Drive reorganization

#### scripts/reorganize-drive.mjs
- **Media identities:** yes (filename-based)
- **Content hashes:** no
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (DRIVE_STRUCTURE defines project organization)
- **Duplicate detection:** no
- **Drive connector:** yes (Drive folder reorganization)
- **August 3 references:** no
- **Notes:** Drive reorganization script to mirror website structure. Creates project-based folder structure with MASTER/Variants organization

#### scripts/pipeline/context.mjs
- **Media identities:** no (context object)
- **Content hashes:** no
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** no
- **Duplicate detection:** yes (duplicates array in context)
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Pipeline context constitutional state object. Contains duplicates array for duplicate detection

#### scripts/pipeline/stages.mjs
- **Media identities:** no (stage definitions)
- **Content hashes:** no
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** no
- **Duplicate detection:** no
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Pipeline stages constitutional execution units. Each stage has single responsibility

#### COMPREHENSIVE_FORENSIC_ARCHITECTURE_REPORT.md
- **Media identities:** yes (PING90 ArtifactId system documented)
- **Content hashes:** yes (PING90 SHA-256 canonical hash)
- **Drive IDs:** no
- **PING90 ArtifactId:** yes (full PING90 identity system)
- **HPP UUID v5:** yes (HPP UUID v5 system)
- **Identity mappings:** yes (PING90 → HPP identity mapping)
- **Duplicate detection:** yes (PING90 canonical hash)
- **Drive connector:** no
- **August 3 references:** yes (section 13 documents August 3 baseline)
- **Notes:** Comprehensive forensic analysis of PING90 constitutional architecture and HPP media architecture

#### DRIVE_SOURCE_FORENSIC_MAP.md
- **Media identities:** yes (27 files in Personal Drive, 31 in Shared Drive)
- **Content hashes:** yes (SHA256 from MediaInventory.json)
- **Drive IDs:** yes (Drive path references)
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (two Drive structures mapped)
- **Duplicate detection:** no
- **Drive connector:** yes (Drive structure documentation)
- **August 3 references:** yes (section documents August 3 baseline vs current state)
- **Notes:** Documents TWO DRIVE STRUCTURES: Personal Drive (27 files) and Shared Drive (31 files)

#### generated/DRIVE-REORGANIZATION-COMPLETE.md
- **Media identities:** yes (26 images organized)
- **Content hashes:** no
- **Drive IDs:** yes (Drive ID mappings generated)
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (images → Drive structure)
- **Duplicate detection:** no
- **Drive connector:** yes (Drive organization)
- **August 3 references:** no
- **Notes:** Drive reorganization project complete. 26 images organized into Drive structure with MASTER/Variants organization

---

### PROJECTION FILES (3)

#### .generated/gallery-projection.json
- **Media identities:** yes (projectIds, galleryRepresentative filenames)
- **Content hashes:** no
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (projectId → galleryRepresentative → supportingGalleryEvidence)
- **Duplicate detection:** no
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Gallery projection with 21 projects, coverage analysis, gallery ordering

#### .generated/hero-projection.json
- **Media identities:** yes (hero candidates)
- **Content hashes:** no
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (hero selection logic)
- **Duplicate detection:** no
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Hero projection for hero image selection across projects

#### .generated/service-projection.json
- **Media identities:** yes (service media assignments)
- **Content hashes:** no
- **Drive IDs:** no
- **PING90 ArtifactId:** no
- **HPP UUID v5:** no
- **Identity mappings:** yes (service → media assignments)
- **Duplicate detection:** no
- **Drive connector:** no
- **August 3 references:** no
- **Notes:** Service projection mapping media to service categories

---

## SUMMARY OF REUSABLE INFRASTRUCTURE

### 1. Identity System (READY TO USE)
- **Implementation:** UUID v5 from SHA-256 content hash
- **Location:** `scripts/image-pipeline.mjs`, `src/config/manifest.v1.json`
- **Namespace:** DNS namespace "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
- **Determinism:** Same content = same ID
- **Coverage:** 12 images in manifest.v1.json

### 2. Duplicate Detection (READY TO USE)
- **Implementation:** SHA-256 content hashing
- **Location:** `src/config/manifest.v1.json`, `generated/golden-manifest.json`
- **Additional:** 6-metric perceptual detection in `analysis/DUPLICATE_DETECTION_REPORT.md`
- **Coverage:** 12 images in golden-manifest.json

### 3. Drive Connector (NEEDS CREDENTIALS ONLY)
- **Implementation:** Complete Drive API adapter
- **Location:** `scripts/image-source/drive-image-source.mjs`
- **OAuth Config:** `src/config/oauth.v1.json`
- **Sync Module:** `scripts/drive-sync.mjs` (stub implementation)
- **Status:** READY, just needs credentials

### 4. Golden Manifest (READY TO USE)
- **Implementation:** Canonical SHA-256 hash references
- **Location:** `generated/golden-manifest.json`
- **Coverage:** 12 images
- **Purpose:** Regression test baseline

### 5. August 3 Baseline (COMPLETE EVIDENCE)
- **Implementation:** Full August 3 baseline documentation
- **Location:** `HPP_PUBLIC_MEDIA_BASELINE_2026-08-03.md`
- **Location:** `archive/legacy-runtime/media.v1.json`
- **Coverage:** 21 assets, 6 projects, full Drive IDs, full variant paths
- **Status:** COMPLETE EVIDENCE

### 6. Drive Reorganization (COMPLETE EVIDENCE)
- **Implementation:** Drive folder structure reorganization
- **Location:** `generated/DRIVE-REORGANIZATION-COMPLETE.md`
- **Coverage:** 26 images, 6 projects, MASTER/Variants organization
- **Status:** COMPLETE EVIDENCE

---

## RECOMMENDATIONS

### Immediate Actions

1. **Use Existing Identity System**
   - Do NOT create new UUID v5 scheme
   - Use existing UUID v5 from `scripts/image-pipeline.mjs`
   - Map existing UUID v5 to PING90 ArtifactId if needed

2. **Use Existing Duplicate Detection**
   - Use SHA-256 content hashing from `manifest.v1.json`
   - Use golden-manifest.json as regression baseline
   - Leverage 6-metric detection from DUPLICATE_DETECTION_REPORT.md

3. **Activate Existing Drive Connector**
   - Use `scripts/image-source/drive-image-source.mjs` (complete implementation)
   - Configure credentials via `src/config/oauth.v1.json`
   - Use existing Drive mappings from `DRIVE-REORGANIZATION-COMPLETE.md`

4. **Restore Drive IDs from August 3 Baseline**
   - Extract Drive IDs from `archive/legacy-runtime/media.v1.json`
   - Map to current media.v1.json entries
   - Re-establish connection to Drive source material

5. **Clarify Drive Authority**
   - Per `DRIVE_SOURCE_FORENSIC_MAP.md`, Shared Drive is constitutional authority
   - Personal Drive is working assets/photo intake
   - Document clear authority boundary

6. **Fix Brand MediaIds**
   - Map brand assets to media.v1.json
   - Set logo.mediaId and office.mediaId

7. **Standardize Variant Keys**
   - Align component variant access (variants.web) with media.v1.json (variants.webp)
   - Standardize variant key naming

---

**END OF MEDIA EVIDENCE CLASSIFICATION REPORT**
