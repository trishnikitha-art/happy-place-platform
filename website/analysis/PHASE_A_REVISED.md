# Constitutional Media Graph — Phase A Revised

**Date:** 2026-08-05  
**Status:** IN PROGRESS  
**Objective:** Constitutional migration with zero runtime breakage

---

## Phase A Revised Objective

Preserve a working runtime while migrating to constitutional architecture.

The website, dashboard, API, and import pipeline must continue functioning throughout the migration.

---

## Rule 1: Never Break Existing Consumers

**Keep Legacy Fields Until Every Consumer Migrates:**

```typescript
ImageNode {
  // Immutable evidence
  sha256
  perceptual_hash
  dimensions
  file_size
  mime_type
  exif
  created_at
  modified_at
  
  // Legacy compatibility fields (read-only)
  service          // DO NOT REMOVE yet
  project          // DO NOT REMOVE yet
  room             // DO NOT REMOVE yet
  job              // DO NOT REMOVE yet
}
```

These fields become **legacy compatibility projections**, not constitutional authority.

They remain read-only. Nothing may update them except the migration layer.

---

## Rule 2: Dual Representation

For every legacy field, generate parallel Assertions:

```
Image.service = "Painting"
    ↓
Assertion
    type = "service"
    value = "Painting"
    confidence = 1.0
    source = "FolderInference"
```

Both representations must coexist during transition.

---

## Rule 3: Continuous Verification

Implement executable invariant:

```python
def verify_service_assertions():
    for image in images:
        legacy_service = image.service
        assertions = get_assertions(image.id, type="service")
        highest_confidence = max(assertions, key=lambda a: a.confidence)
        
        if legacy_service != highest_confidence.value:
            raise ValidationError(f"Assertion mismatch for {image.id}")
```

Run this validation continuously. Do not remove legacy field until every image passes.

---

## Rule 4: Folder Semantics Become Observations

Folders are NOT constitutional truth. Folders are also NOT discarded.

Create FolderObservation nodes:

```typescript
FolderObservationNode {
  id: UUID v5
  type: "folder_observation"
  folder_path: string
  folder_depth: number
  parent_hierarchy: string[]
  import_session_id: UUID
}
```

Inference consumes observations:

```
FolderObservation
    ↓
ProjectInference
    ↓
ProjectNode
```

Nothing consumes folders directly.

---

## Rule 5: Assertions Are Append-Only

Assertions are immutable. Never edit one.

Instead:

```
ClassifierRun
    ↓
Assertion
    ↓
HumanReview
    ↓
AssertionOverride
```

Current truth is computed. Never overwritten.

```typescript
AssertionOverrideNode {
  id: UUID v5
  type: "assertion_override"
  assertion_id: UUID
  original_value: string
  new_value: string
  reviewer: string
  reason: string
  timestamp: Date
}
```

---

## Rule 6: Duplicate Families

Use DuplicateFamily structure (already implemented in Phase A):

```
DuplicateFamily
    ├── representative → Image
    ├── member → Image
    ├── member → Image
    └── DuplicateEvidence
```

DuplicateEvidence must include:

```typescript
DuplicateEvidenceNode {
  id: UUID v5
  type: "duplicate_evidence"
  duplicate_family_id: UUID
  image_id: UUID
  algorithm: string
  version: string
  parameters: object
  confidence: number
  timestamp: Date
  feature_metrics: object
  distance_metrics: object
}
```

Adding better algorithms creates new evidence. Never mutates Image.

---

## Rule 7: Hero Selection

Delete hero_candidate as authority. Replace with measurable observations:

```typescript
ImageNode {
  // Remove: hero_candidate (boolean)
  
  // Add: measurable scores
  composition_score: number
  symmetry_score: number
  sharpness_score: number
  brightness_score: number
  entropy_score: number
  duplicate_penalty: number
  subject_score: number
  aspect_ratio: number
}
```

Homepage Hero becomes a generated ranking:

```python
def select_homepage_hero():
    images = get_all_images()
    scored = []
    for image in images:
        score = (
            image.composition_score * 0.3 +
            image.symmetry_score * 0.2 +
            image.sharpness_score * 0.2 +
            image.brightness_score * 0.1 +
            image.entropy_score * 0.1 +
            image.subject_score * 0.1 -
            image.duplicate_penalty
        )
        scored.append((image, score))
    return max(scored, key=lambda x: x[1])
```

Never stored. Always computed.

---

## Rule 8: Variants

Rename Variant to Transformation:

```typescript
TransformationNode {
  id: UUID v5
  type: "transformation"
  source_image_id: UUID
  transformation_type: "resize" | "crop" | "webp" | "avif" | "thumbnail" | "enhance"
  parameters: object
  output_path: string
  output_size: number
  output_dimensions: object
  quality: number
  created_at: Date
}
```

Architecture:

```
Image
    ↓
Transformation
    ↓
Variant (cached output)
```

Transformations become replayable constitutional events.

---

## Rule 9: Import Sessions

Expand ImportSession:

```typescript
ImportSessionNode {
  id: UUID v5
  type: "import_session"
  source: "Shared Drive"
  import_timestamp: Date
  total_files: number
  total_size: number
  filesystem_snapshot_hash: string
  import_duration: number
  ignored_files: string[]
  warnings: string[]
  errors: string[]
  importer_version: string
  repository_commit: string
  machine_identity: string
}
```

Every import must be reproducible.

---

## Rule 10: Policies Stay in Code

Do NOT create SelectionPolicy graph nodes.

Projection algorithms remain:

- versioned
- deterministic
- replayable

The graph stores evidence. Runtime stores constitutional algorithms.

---

## Rule 11: Event Foundation

Begin introducing append-only event stream:

```typescript
ImportEvent {
  id: UUID v5
  type: "import_event"
  timestamp: Date
  import_session_id: UUID
}

MetadataExtractedEvent {
  id: UUID v5
  type: "metadata_extracted"
  timestamp: Date
  image_id: UUID
  metadata: object
}

DuplicateDetectedEvent {
  id: UUID v5
  type: "duplicate_detected"
  timestamp: Date
  duplicate_family_id: UUID
  image_id: UUID
}

ClassificationProducedEvent {
  id: UUID v5
  type: "classification_produced"
  timestamp: Date
  assertion_id: UUID
}

ProjectResolvedEvent {
  id: UUID v5
  type: "project_resolved"
  timestamp: Date
  project_id: UUID
}

GraphProjectionEvent {
  id: UUID v5
  type: "graph_projection"
  timestamp: Date
  graph_version: string
}
```

The graph becomes derived. Never manually authored.

---

## Rule 12: Migration Gates

Legacy fields may only be removed after:

- ✅ Every projection consumes Assertions
- ✅ Validation passes (Image.service == highest-confidence Assertion)
- ✅ Replay reproduces identical projections
- ✅ Runtime no longer imports legacy fields

Only then remove: service, project, room, job

---

## Constitutional Layers (Revised)

### Layer 0: Binary Evidence

```
ImageNode (immutable)
  ├── sha256
  ├── perceptual_hash
  ├── dimensions
  ├── file_size
  ├── mime_type
  ├── exif
  ├── created_at
  ├── modified_at
  └── legacy fields (service, project, room, job) - read-only during transition
```

### Layer 1: Observations

```
ImportSessionNode
FolderObservationNode
ClassifierRunNode
```

### Layer 2: Knowledge

```
AssertionNode
AssertionOverrideNode
DuplicateFamilyNode
DuplicateEvidenceNode
TransformationNode
ProjectNode
ServiceNode
```

### Layer 3: Computed Projections

```
Website Projection
Dashboard Projection
Search Projection
API Projection
Reports Projection
```

---

## Migration Steps

### Step 1: Update Graph Model

- Keep legacy fields in ImageNode
- Add FolderObservation node type
- Add AssertionOverride node type
- Rename Variant to Transformation
- Expand ImportSession fields
- Add measurable scores to ImageNode

### Step 2: Generate Dual Representation

- Keep legacy fields unchanged
- Generate Assertions in parallel
- Verify: legacy == assertion

### Step 3: Add Folder Observations

- Create FolderObservation nodes
- Link to ImportSession
- Inference consumes observations

### Step 4: Enhance Duplicate Evidence

- Add algorithm, version, parameters, feature metrics
- Make evidence append-only

### Step 5: Add Measurable Scores

- Remove hero_candidate boolean
- Add composition_score, symmetry_score, etc.
- Compute hero ranking instead of storing

### Step 6: Event Foundation

- Create event types
- Begin event stream
- Graph derived from events

### Step 7: Validation Invariants

- Implement continuous verification
- Check: Image.service == highest-confidence Assertion
- Check: Every Image belongs to exactly one ImportSession
- Check: Every Transformation belongs to exactly one Image

### Step 8: Migration Gates

- Wait for projections to consume Assertions
- Wait for validation to pass
- Wait for replay to work
- Only then remove legacy fields

---

## Success Criteria

- ✅ Zero runtime breakage
- ✅ Legacy fields preserved during transition
- ✅ Assertions generated in parallel
- ✅ Continuous verification passes
- ✅ Folder observations created
- ✅ Duplicate evidence enhanced
- ✅ Measurable scores added
- ✅ Event foundation established
- ✅ Validation invariants implemented
- ✅ Migration gates defined

---

## Next Phase

After Phase A Revised is complete:

**Phase B: Add Provenance**
- Ensure every inference has ClassifierRun
- Every decision has history
- Graph becomes explainable
