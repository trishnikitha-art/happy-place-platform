# Phase B Complete — Constitutional Projection Engine

**Date:** 2026-08-05  
**Status:** COMPLETE  
**Objective:** Generate all v2 JSON artifacts from canonical-media-graph.json

---

## Executive Summary

The Constitutional Projection Engine has been successfully implemented. All v2 JSON artifacts are now generated deterministically from the canonical media graph.

**Result:** The graph is now the single source of truth for all projections.

---

## Deliverables

### Generated Artifacts

All v2 files generated from canonical-media-graph.json:

1. **media.v2.json** - List of all 43 images with metadata
2. **projects.v2.json** - List of all 6 projects with hero and gallery
3. **services.v2.json** - List of all 5 services with associated projects
4. **hero.v2.json** - Homepage hero selection (computed ranking)
5. **gallery.v2.json** - Gallery projection (all gallery-eligible images)
6. **dashboard.v2.json** - Dashboard aggregation metrics
7. **search-index.v2.json** - Search index for fast lookup

### Files Created

- **analysis/PROJECTION_ENGINE_DESIGN.md** - Architecture and projection definitions
- **analysis/projection_engine.py** - Projection engine implementation

---

## Projection Definitions

### media.v2.json

**Structure:**
```json
{
  "version": "2.0.0",
  "generated_at": "ISO timestamp",
  "media": [
    {
      "id": "UUID",
      "original_filename": "string",
      "shared_drive_path": "string",
      "sha256": "string",
      "dimensions": {"width": number, "height": number},
      "file_size": number,
      "mime_type": "string",
      "exif": {...},
      "legacy": {
        "service": "string",
        "project": "string",
        "room": "string",
        "job": "string"
      },
      "scores": {
        "composition_score": number,
        "symmetry_score": number,
        "sharpness_score": number,
        "brightness_score": number,
        "entropy_score": number,
        "duplicate_penalty": number,
        "subject_score": number,
        "aspect_ratio": number
      }
    }
  ]
}
```

**Source:** Direct graph query (all Image nodes)

### projects.v2.json

**Structure:**
```json
{
  "version": "2.0.0",
  "generated_at": "ISO timestamp",
  "projects": [
    {
      "id": "UUID",
      "name": "string",
      "slug": "string",
      "service": "string",
      "hero_image_id": "UUID",
      "gallery_image_ids": ["UUID"],
      "total_images": number,
      "before_after_pairs": number
    }
  ]
}
```

**Source:** Project nodes + belongs_to_project edges

### services.v2.json

**Structure:**
```json
{
  "version": "2.0.0",
  "generated_at": "ISO timestamp",
  "services": [
    {
      "id": "UUID",
      "name": "string",
      "slug": "string",
      "project_ids": ["UUID"],
      "total_projects": number,
      "total_images": number
    }
  ]
}
```

**Source:** Service nodes + belongs_to_service edges

### hero.v2.json

**Structure:**
```json
{
  "version": "2.0.0",
  "generated_at": "ISO timestamp",
  "hero": {
    "image_id": "UUID",
    "ranking_score": number,
    "filename": "string",
    "dimensions": {"width": number, "height": number}
  }
}
```

**Source:** Computed ranking (landscape images only, weighted score algorithm)

**Algorithm:**
```
ranking_score = composition_score * 0.3 +
                symmetry_score * 0.2 +
                sharpness_score * 0.2 +
                brightness_score * 0.1 +
                entropy_score * 0.1 +
                subject_score * 0.1 -
                duplicate_penalty
```

### gallery.v2.json

**Structure:**
```json
{
  "version": "2.0.0",
  "generated_at": "ISO timestamp",
  "gallery": [
    {
      "image_id": "UUID",
      "filename": "string",
      "project_id": "UUID",
      "score": number
    }
  ]
}
```

**Source:** Query-based (subject_score > 0.5 threshold, sorted by score)

### dashboard.v2.json

**Structure:**
```json
{
  "version": "2.0.0",
  "generated_at": "ISO timestamp",
  "metrics": {
    "total_images": 43,
    "total_projects": 6,
    "total_services": 5,
    "duplicate_families": 6,
    "total_duplicates": 8,
    "assertions_by_type": {
      "service": 43,
      "room": 0
    }
  }
}
```

**Source:** Graph aggregations (node counts, edge counts)

### search-index.v2.json

**Structure:**
```json
{
  "version": "2.0.0",
  "generated_at": "ISO timestamp",
  "index": [
    {
      "id": "UUID",
      "filename": "string",
      "service": "string",
      "project": "string",
      "tags": ["string"]
    }
  ]
}
```

**Source:** All Image nodes with legacy metadata

---

## Success Criteria

- ✅ canonical-media-graph.json frozen (no schema changes)
- ✅ All v2 files generated deterministically from graph
- ✅ v2 files never edited by hand
- ✅ v2 files can be regenerated at any time
- ✅ Hero selection is computed ranking, not stored boolean
- ✅ Gallery projection is query-based, not stored list
- ✅ Dashboard metrics are graph aggregations

---

## Architectural Principles

### Deterministic Generation

Same graph → same v2 output (reproducible)

### Never Edited

All v2 files are generated, never hand-authored

### Never Committed

v2 files should be gitignored or generated at build time

### Graph as Authority

Graph is the single source of truth

### Incremental

Add new projections without breaking existing ones

---

## Next Phase

**Phase C: REST API**

Build API endpoints that consume graph projections:

```
GET /api/media → reads media.v2.json
GET /api/projects → reads projects.v2.json
GET /api/services → reads services.v2.json
GET /api/hero → reads hero.v2.json
GET /api/gallery → reads gallery.v2.json
GET /api/dashboard → reads dashboard.v2.json
GET /api/search → reads search-index.v2.json
```

Every endpoint is generated from the graph.

Only then delete v1 files.

---

## Files Modified

- **metadata/media.v2.json** - Generated (new)
- **metadata/projects.v2.json** - Generated (new)
- **metadata/services.v2.json** - Generated (new)
- **metadata/hero.v2.json** - Generated (new)
- **metadata/gallery.v2.json** - Generated (new)
- **metadata/dashboard.v2.json** - Generated (new)
- **metadata/search-index.v2.json** - Generated (new)
- **analysis/PROJECTION_ENGINE_DESIGN.md** - Architecture document (new)
- **analysis/projection_engine.py** - Implementation (new)

---

## Success

**Phase B Complete.** The graph is now the single source of truth for all projections. v2 files are generated deterministically and can be regenerated at any time.
