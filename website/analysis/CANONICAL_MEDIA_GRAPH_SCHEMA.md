# Canonical Media Graph Schema

**Date:** 2026-08-05  
**Status:** COMPLETE  
**Authority:** Shared Drive → Canonical Media Graph

---

## Constitutional Principle

**The Media Graph is the single source of truth.**

All metadata (projects, services, heroes, gallery, dashboard, API) are generated projections from the graph.

No parallel metadata files. No manual inventory maintenance.

---

## Graph Structure

### Node Types

#### ImageNode (Immutable)

```typescript
{
  id: UUID v5 (based on file path)
  type: "image"
  canonical: boolean
  original_path: string (Shared Drive path)
  sha256: string (byte hash)
  perceptual_hash: string (ImageHash)
  dimensions: { width: number, height: number }
  file_size: number
  mime_type: string
  exif: EXIFData
  created_at: Date
  modified_at: Date
}
```

#### ProjectNode

```typescript
{
  id: UUID v5
  type: "project"
  name: string
  slug: string
  hero_image_id: UUID | null
  timeline: DateRange
  location: Location
  created_at: Date
}
```

#### ServiceNode

```typescript
{
  id: UUID v5
  type: "service"
  name: string
  slug: string
  description: string
  created_at: Date
}
```

#### VariantNode

```typescript
{
  id: UUID v5
  type: "variant"
  original_image_id: UUID
  format: "webp" | "avif" | "jpg" | "png"
  width: number
  height: number
  quality: number
  file_size: number
  path: string
  created_at: Date
}
```

---

## Edge Types

### belongs_to_project

Image → Project

```typescript
{
  from: UUID (image)
  to: UUID (project)
  type: "belongs_to_project"
  role: "hero" | "gallery" | "before" | "after" | "detail"
}
```

### belongs_to_service

Image → Service

```typescript
{
  from: UUID (image)
  to: UUID (service)
  type: "belongs_to_service"
}
```

### before_after_pair

Image → Image

```typescript
{
  from: UUID (before image)
  to: UUID (after image)
  type: "before_after_pair"
  similarity: number
}
```

### duplicate_of

Image → Image

```typescript
{
  from: UUID (duplicate)
  to: UUID (canonical)
  type: "duplicate_of"
  duplicate_type: "byte_identical" | "perceptual" | "filename" | "exif"
  confidence: number
}
```

### derived_variant

Variant → Image

```typescript
{
  from: UUID (variant)
  to: UUID (original)
  type: "derived_variant"
  transformation: string
}
```

### depicts_room

Image → string

```typescript
{
  from: UUID (image)
  to: string (room name)
  type: "depicts_room"
  confidence: number
}
```

### depicts_material

Image → string

```typescript
{
  from: UUID (image)
  to: string (material name)
  type: "depicts_material"
  confidence: number
}
```

### featured_on_page

Image → string

```typescript
{
  from: UUID (image)
  to: string (page path)
  type: "featured_on_page"
  role: "hero" | "featured" | "gallery"
}
```

---

## Service Normalization

### Constitutional Services

```
Drywall
Painting
Finish Carpentry
Fencing
Outdoor Living
Bathroom Remodeling
Repairs
Built-ins
Decks
Pergolas
Pole Barns
Kitchens
ADUs
Restoration
```

### Migration Mapping

| Legacy Service | Constitutional Service |
|----------------|----------------------|
| drywall | Drywall |
| painting | Painting |
| finish-carpentry | Finish Carpentry |
| fencing | Fencing |
| other | Restoration (default) |
| featured | (hero selection, not a service) |

---

## Projection Generation

### Projects Projection

```cypher
MATCH (i:Image)-[:belongs_to_project]->(p:Project)
RETURN p, collect(i) as images
```

### Services Projection

```cypher
MATCH (i:Image)-[:belongs_to_service]->(s:Service)
RETURN s, collect(i) as images
```

### Heroes Projection

```cypher
MATCH (i:Image)-[:belongs_to_project]->(p:Project)
WHERE i.hero_candidate = true
RETURN p, i
```

### Gallery Projection

```cypher
MATCH (i:Image)-[:belongs_to_project]->(p:Project)
WHERE i.gallery_candidate = true
RETURN p, collect(i) as gallery
```

### Duplicate Families Projection

```cypher
MATCH (i:Image)-[:duplicate_of]->(c:Image)
RETURN c as canonical, collect(i) as duplicates
```

---

## API Architecture

### Media API

```
GET /api/media/:id
→ Resolve mediaId → ImageNode → Variant selection → Delivery

GET /api/media/project/:projectId
→ ProjectNode → belongs_to_project edges → ImageNodes → Variant selection

GET /api/media/service/:serviceSlug
→ ServiceNode → belongs_to_service edges → ImageNodes → Variant selection

GET /api/media/hero/:projectId
→ ProjectNode → hero_image_id → ImageNode → Variant selection

GET /api/media/gallery/:projectId
→ ProjectNode → belongs_to_project edges → filter gallery → ImageNodes → Variant selection
```

### Dashboard API

```
GET /api/dashboard/images
→ All ImageNodes → Projection

GET /api/dashboard/projects
→ All ProjectNodes → Projection

GET /api/dashboard/services
→ All ServiceNodes → Projection

GET /api/dashboard/duplicates
→ duplicate_of edges → Group by canonical → Projection

GET /api/dashboard/orphans
→ ImageNodes without belongs_to_project edges → Projection
```

---

## Processing Pipeline

```
Shared Drive (Watcher)
    ↓
Importer (detects new files)
    ↓
Metadata Extraction (EXIF, dimensions, hash)
    ↓
Duplicate Detection (perceptual hash, byte hash)
    ↓
Semantic Classification (service, room, material)
    ↓
Graph Update (ImageNode + edges)
    ↓
Variant Generation (webp, avif, thumbnails)
    ↓
VariantNode creation + derived_variant edges
    ↓
Website Update (projections regenerated)
    ↓
Dashboard Update (projections regenerated)
```

---

## Implementation Plan

### Phase 1: Graph Schema Definition
- ✅ Define node types
- ✅ Define edge types
- ✅ Define service normalization
- ✅ Define projection queries

### Phase 2: Graph Storage
- Choose graph database (Neo4j, Memgraph, or in-memory)
- Implement graph persistence layer
- Implement graph query layer

### Phase 3: Import Migration
- Import canonical-media.json into graph
- Create ImageNodes
- Create ProjectNodes
- Create ServiceNodes
- Create edges

### Phase 4: Duplicate Detection
- Run duplicate detection algorithm
- Create duplicate_of edges
- Mark canonical vs derivative

### Phase 5: Variant Generation
- Implement processing pipeline
- Generate webp, avif, thumbnails
- Create VariantNodes
- Create derived_variant edges

### Phase 6: API Implementation
- Implement Media API
- Implement Dashboard API
- Implement variant selection logic

### Phase 7: Website Migration
- Update components to use Media API
- Remove file path references
- Use mediaId everywhere

### Phase 8: Dashboard Implementation
- Implement image browser (graph query)
- Implement project browser (graph query)
- Implement duplicate review (graph query)

---

## Success Criteria

- ✅ Single media graph authority
- ✅ No parallel metadata files
- ✅ Services normalized to constitutional list
- ✅ Duplicates detected and grouped
- ✅ Projections generated from graph
- ✅ API consumes graph, not files
- ✅ Website consumes API, not files
- ✅ Dashboard consumes graph, not files
- ✅ Legacy runtime archived
- ✅ Shared Drive is sole input

---

## Definition of Done

```
Shared Drive
    ↓
Importer
    ↓
Canonical Media Graph
    ↓
Generated Metadata
    ↓
Generated Website
    ↓
Generated Dashboard
    ↓
Generated API
```

No handwritten inventories. No handwritten galleries. No handwritten hero lists. No duplicated metadata.

Everything derives from one constitutional media graph.
