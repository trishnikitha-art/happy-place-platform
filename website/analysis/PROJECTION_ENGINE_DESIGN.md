# Constitutional Projection Engine

**Date:** 2026-08-05  
**Status:** DESIGN  
**Objective:** Generate all v2 JSON artifacts from canonical-media-graph.json

---

## Phase A Status: FROZEN

**Decision:** No more architectural surgery on the graph schema.

**Rationale:**
- Image node compatibility fields are not hurting anything
- Removing them now creates risk with almost no user-visible value
- Graph schema is frozen until backend is actually driving the application

**Current State:**
- canonical-media-graph.json: 113 nodes, 193 edges
- Legacy fields preserved: service, project, room, job
- Assertions generated in parallel (dual representation)
- Constitutional layers defined

---

## Projection Engine Architecture

### Single Responsibility

**Input:** canonical-media-graph.json  
**Output:** Generated v2 JSON artifacts

### Generated Artifacts

```
canonical-media-graph.json
    ↓
Projection Engine
    ↓
media.v2.json
projects.v2.json
services.v2.json
hero.v2.json
gallery.v2.json
dashboard.v2.json
search-index.v2.json
```

### Principles

1. **Never Edited** - All v2 files are generated, never hand-authored
2. **Never Committed** - v2 files should be gitignored or generated at build time
3. **Deterministic** - Same graph → same v2 output (reproducible)
4. **Graph as Authority** - Graph is the single source of truth
5. **Incremental** - Add new projections without breaking existing ones

---

## Projection Definitions

### media.v2.json

**Projection Type:** List of all images with metadata

**Graph Query:**
```cypher
MATCH (i:Image)
RETURN i
```

**Output Schema:**
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

### projects.v2.json

**Projection Type:** List of all projects with hero and gallery

**Graph Query:**
```cypher
MATCH (p:Project)
OPTIONAL MATCH (i:Image)-[:belongs_to_project]->(p)
RETURN p, collect(i) as images
```

**Output Schema:**
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

### services.v2.json

**Projection Type:** List of all services with associated projects

**Graph Query:**
```cypher
MATCH (s:Service)
OPTIONAL MATCH (p:Project)-[:belongs_to_service]->(s)
RETURN s, collect(p) as projects
```

**Output Schema:**
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

### hero.v2.json

**Projection Type:** Homepage hero selection (computed ranking)

**Graph Query:**
```cypher
MATCH (i:Image)
WHERE i.scores.aspect_ratio > 1.5
RETURN i
ORDER BY
  i.scores.composition_score * 0.3 +
  i.scores.symmetry_score * 0.2 +
  i.scores.sharpness_score * 0.2 +
  i.scores.brightness_score * 0.1 +
  i.scores.entropy_score * 0.1 +
  i.scores.subject_score * 0.1 -
  i.scores.duplicate_penalty
DESC
LIMIT 1
```

**Output Schema:**
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

### gallery.v2.json

**Projection Type:** Gallery projection (all gallery-eligible images)

**Graph Query:**
```cypher
MATCH (i:Image)
WHERE i.scores.gallery_candidate = true
RETURN i
ORDER BY i.scores.subject_score DESC
```

**Output Schema:**
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

### dashboard.v2.json

**Projection Type:** Dashboard aggregation metrics

**Graph Query:**
```cypher
MATCH (df:DuplicateFamily)
RETURN df, size((df)-[:]) as member_count

MATCH (a:Assertion)
RETURN a.assertion_type, count(a) as count
```

**Output Schema:**
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

### search-index.v2.json

**Projection Type:** Search index for fast lookup

**Graph Query:**
```cypher
MATCH (i:Image)
RETURN {
  "id": i.id,
  "filename": i.original_filename,
  "service": i.legacy.service,
  "project": i.legacy.project,
  "tags": i.legacy.tags
}
```

**Output Schema:**
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

---

## Implementation Plan

### Step 1: Load Graph

```python
from canonical_media_graph import CanonicalMediaGraph

graph = CanonicalMediaGraph.load("metadata/canonical-media-graph.json")
```

### Step 2: Generate Projections

```python
projections = {
    "media.v2.json": generate_media_projection(graph),
    "projects.v2.json": generate_projects_projection(graph),
    "services.v2.json": generate_services_projection(graph),
    "hero.v2.json": generate_hero_projection(graph),
    "gallery.v2.json": generate_gallery_projection(graph),
    "dashboard.v2.json": generate_dashboard_projection(graph),
    "search-index.v2.json": generate_search_index_projection(graph)
}
```

### Step 3: Write v2 Files

```python
for filename, data in projections.items():
    with open(f"metadata/{filename}", 'w') as f:
        json.dump(data, f, indent=2)
```

### Step 4: Add Timestamp

Every projection includes:
- version: "2.0.0"
- generated_at: ISO timestamp

For reproducibility.

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
