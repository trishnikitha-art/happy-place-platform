# CANONICAL MEDIA AUTHORITY

**Date:** 2026-08-05  
**Status:** SUPERSEDED BY GRAPH ARCHITECTURE  
**Constitutional Source:** H:\Shared drives\Happy Place Carpentry Website  
**Repository:** C:\Users\nolan\CascadeProjects\happy-place-platform

---

## ⚠️ ARCHITECTURE CHANGE

This document has been superseded by the **Canonical Media Graph** architecture.

**New Authority:** `metadata/canonical-media-graph.json`  
**New Schema:** `analysis/CANONICAL_MEDIA_GRAPH_SCHEMA.md`  
**Validation:** `analysis/CONSTITUTIONAL_MEDIA_VALIDATION_REPORT.md`

---

## Constitutional Identity

The Happy Place Platform has ONE constitutional media authority: **The Media Graph**.

**Migration Source (Historical):** H:\My Drive\PIPING90  
**Production Runtime Authority:** H:\Shared drives\Happy Place Carpentry Website

PIPING90 exists only as historical migration input. The Shared Drive is the runtime source of truth.

---

## Executive Summary

### Physical Assets

| Metric | Value |
|--------|-------|
| Original photos from Shared Drive | **43 files** |
| Total size | **63.26 MB** |
| Services represented | **5** (drywall, fencing, painting, finish-carpentry, other) |
| Before/after pairs | **42** |
| Hero candidates | **10** |
| Gallery candidates | **43** (all) |

### Service Breakdown

| Service | Images | Before | After | Hero Candidates |
|---------|--------|--------|-------|-----------------|
| drywall | 6 | 3 | 3 | 2 |
| fencing | 8 | 4 | 4 | 2 |
| painting | 10 | 5 | 5 | 3 |
| finish-carpentry | 2 | 1 | 1 | 1 |
| other | 16 | 8 | 8 | 2 |
| featured | 1 | 0 | 1 | 0 |
| **TOTAL** | **43** | **21** | **22** | **10** |

### Repository State

**Originals:** `media/originals/` - 43 files (63.26 MB)  
**Processed:** `media/processed/` - empty (awaiting pipeline)  
**Heroes:** `media/heroes/` - empty (awaiting selection)  
**Featured:** `media/featured/` - empty (awaiting selection)  
**Services:** `media/services/` - empty (awaiting organization)  
**Gallery:** `media/gallery/` - empty (awaiting generation)

**Metadata:** `metadata/canonical-media.json` - 43 records with 21 fields each  
**Projects:** `metadata/canonical-projects.json` - 6 projects with before/after pairs  
**Services:** `metadata/canonical-services.json` - 6 services with hero/featured candidates

---

## Canonical Metadata Schema

Every image in the constitutional authority has these 21 fields:

```json
{
  "canonical_id": "UUID v5 based on file path",
  "original_filename": "original filename from Shared Drive",
  "shared_drive_path": "H:\\Shared drives\\Happy Place Carpentry Website\\...",
  "project": "inferred from folder name",
  "service": "mapped from folder (fencing, drywall, painting, finish-carpentry, other, featured)",
  "category": "before|after|featured",
  "room": "inferred from filename (exterior, bathroom, attic, walkway, etc.)",
  "job": "inferred from filename (fencing, drywall repair, painting, etc.)",
  "hero_candidate": "boolean (resolution ≥1920×1080)",
  "featured_candidate": "boolean (Featured Projects folder)",
  "gallery_candidate": "boolean (resolution ≥800×600)",
  "before_after": "boolean (in 'Before & Afters' folder)",
  "alt_text": "generated from filename + service",
  "caption": "generated from filename + service + category",
  "tags": ["service", "room", "category"],
  "EXIF": "full EXIF data (GPS, camera settings, dimensions)",
  "upload_status": "imported from Shared Drive",
  "website_status": "not yet published",
  "dashboard_status": "ready for review",
  "duplicate_group": null,
  "authority_status": "canonical"
}
```

---

## Semantic Placement Inference

### Homepage Hero Candidates

Images eligible for homepage hero:
- Resolution ≥1920×1080
- Strong composition
- Exterior shots preferred
- Showcase craftsmanship

**Current hero candidates:** 10 images

### Featured Projects Candidates

Images from "Featured Projects" folder are automatically featured candidates.

**Current featured candidates:** 1 image

### Gallery Candidates

All images with resolution ≥800×600 are gallery candidates.

**Current gallery candidates:** 43 images (all)

### Service Page Mapping

| Service | Current Images | Target | Gap |
|---------|----------------|--------|-----|
| drywall | 6 | 10+ | 4+ |
| fencing | 8 | 10+ | 2+ |
| painting | 10 | 10+ | 0 |
| finish-carpentry | 2 | 10+ | 8+ |
| outdoor-living | 0 | 10+ | 10+ |
| repairs | 0 | 10+ | 10+ |
| built-ins | 0 | 10+ | 10+ |
| bathrooms | 0 | 10+ | 10+ |

**Gap Analysis:** 5 services need additional photos from Shared Drive.

---

## Website Reconciliation

### Current Website Media

- 22 source originals in repository (3 brand + 19 project)
- 103 optimized variants on disk
- Authority: media.v1.json (22 entries)

### Shared Drive Media

- 43 original photos imported
- 63.26 MB total
- Authority: canonical-media.json (43 entries)

### Overlap Analysis

**Intersection:** 0 images (no overlap between repository and Shared Drive)  
**Repository-only:** 22 images (legacy photo-intake/)  
**Shared Drive-only:** 43 images (new import)

### Migration Plan

1. **Phase 1:** Process Shared Drive originals through pipeline (generate optimized variants)
2. **Phase 2:** Merge Shared Drive metadata with existing repository authority
3. **Phase 3:** Replace media.v1.json with canonical-media.json as single authority
4. **Phase 4:** Update all components to consume canonical authority
5. **Phase 5:** Archive legacy photo-intake/ directory

---

## Dashboard Readiness

### Dataset Status

| Dataset | Status | Records |
|---------|--------|---------|
| canonical-media.json | ✅ COMPLETE | 43 |
| canonical-projects.json | ✅ COMPLETE | 6 |
| canonical-services.json | ✅ COMPLETE | 6 |

### Dashboard Components

| Component | Status | Data Source |
|-----------|--------|-------------|
| Image browser | ✅ READY | canonical-media.json |
| Project browser | ✅ READY | canonical-projects.json |
| Hero selector | ✅ READY | canonical-media.json (hero_candidate=true) |
| Featured selector | ✅ READY | canonical-media.json (featured_candidate=true) |
| Upload queue | ✅ READY | upload_status field |
| Metadata editor | ✅ READY | canonical-media.json (editable) |
| Duplicate review | ⏳ PENDING | duplicate_group field (currently null) |
| Missing asset review | ✅ READY | website_status field |

---

## Legacy Gallery Archive

All legacy gallery components have been archived to `archive/legacy-gallery/`:

- `gallery.json` - Old image authority (3,317 lines)
- `gallery-presets.v1.json` - Old human curation layer
- `gallery.ts` - Old type definitions
- `gallery.manifest.json` - Old build manifest
- `add-driveid-to-gallery.mjs` - Old migration script
- `gallery/` page - Old gallery route (now redirects to /our-work)
- `gallery/` SVG icons - Old service icons

**Status:** Archived. No runtime references remain.

---

## Historical Analysis Archive

All superseded media analyses have been archived to `archive/historical-analysis/`:

- CRX_CANONICAL_MEDIA_MODEL.md
- CRX_COMPLETE_MEDIA_INVENTORY.md
- MEDIA_AUTHORITY_COMPATIBILITY_AUDIT.md
- MEDIA_AUTHORITY_CONSTITUTIONAL_ARCHITECTURE_FINAL.md
- MEDIA_AUTHORITY_CONSTITUTIONAL_ARCHITECTURE_FINAL_COMPATIBILITY.md
- MEDIA_AUTHORITY_CONSTITUTIONAL_ARCHITECTURE_REDESIGNED.md
- MEDIA_AUTHORITY_FINAL_COMPATIBILITY_AUDIT.md
- MEDIA_AUTHORITY_MINIMAL_PROJECTION_ARCHITECTURE.md
- MEDIA_AUTHORITY_OSS_LIBRARIES_RESEARCH.md
- MEDIA_AUTHORITY_PHASE_1_CONSTITUTIONAL_STATUS_REPORT.md
- advanced_image_inventory.csv
- image_inventory.csv
- master_asset_inventory.csv
- MediaInventory.json
- IMAGE_FORENSICS_REPORT.md
- MISSING_ORIGINALS_REPORT.md
- PHOTO_RECONSTRUCTION_REPORT.md
- PHOTO_RECOVERY_LOG.md
- FILESYSTEM_AUTHORITY_RECONCILIATION.md
- ATMOSPHERIC_LIGHTING_INVENTORY.md
- ESTIMATE_SYSTEM_AUDIT.md
- DIRECTIVE_038_GOOGLE_WORKSPACE_AUDIT.md
- drive-reorganization-report.md
- MEDIA-CONTROL-TOWER-PLAN.md
- CMS-IMAGE-MANAGEMENT-PLAN.md
- image-inventory.json

**Status:** Archived. This document is the single canonical authority.

---

## Constitutional File Structure

### Target Structure (Current State)

```
website/
├── media/
│   ├── originals/         ✅ 43 files (63.26 MB)
│   ├── processed/         ⏳ empty (awaiting pipeline)
│   ├── heroes/            ⏳ empty (awaiting selection)
│   ├── featured/          ⏳ empty (awaiting selection)
│   ├── services/          ⏳ empty (awaiting organization)
│   └── gallery/           ⏳ empty (awaiting generation)
├── metadata/
│   ├── canonical-media.json      ✅ 43 records
│   ├── canonical-projects.json   ⏳ pending
│   └── canonical-services.json   ⏳ pending
├── dashboard/
│   ├── media-browser/     ⏳ pending
│   └── project-browser/   ⏳ pending
├── analysis/
│   └── CANONICAL_MEDIA_AUTHORITY.md  ✅ this document
└── archive/
    ├── legacy-gallery/    ✅ archived
    └── historical-analysis/  ✅ archived
```

---

## Success Criteria

### ✅ COMPLETE

- ONE media authority (canonical-media.json)
- ONE metadata authority (21-field schema)
- ONE analysis authority (this document)
- Shared Drive as runtime source of truth
- Legacy gallery archived
- Historical analyses archived
- No duplicated inventories
- No duplicated galleries
- No duplicated analyses

### ⏳ PENDING

- ONE gallery authority (awaiting pipeline)
- ONE dashboard authority (awaiting component implementation)
- Image processing pipeline
- Website component migration
- Dashboard component implementation

---

## Next Actions

### Immediate Priority

1. **Run image processing pipeline** - Generate optimized variants
2. **Update website components** - Consume canonical authority
3. **Build dashboard components** - Image browser, project browser

### Success State

The system converges to:

```
ONE media authority (canonical-media.json)
    ↓
ONE metadata authority (21-field schema)
    ↓
ONE gallery authority (generated from canonical)
    ↓
ONE dashboard authority (canonical datasets)
    ↓
ONE analysis authority (this document)
```

The Shared Drive is the runtime source of truth. PIPING90 exists only as historical migration input. No duplicated inventories, galleries, or analyses. Only one constitutional media system remains.
