# Constitutional Media Graph — Phase A: Freeze Evidence

**Date:** 2026-08-05  
**Status:** IN PROGRESS  
**Objective:** Make Image nodes immutable constitutional evidence

---

## Phase A Objective

Images become immutable constitutional evidence.

Nothing edits them again.

Everything else references them.

This gives a stable constitutional substrate.

---

## Current ImageNode (Too Many Responsibilities)

```typescript
{
  id: UUID v5
  type: "image"
  canonical: boolean              // ❌ Decision, not evidence
  original_path: string
  sha256: string
  perceptual_hash: string
  dimensions: { width, height }
  file_size: number
  mime_type: string
  exif: EXIFData
  created_at: Date
  modified_at: Date
  project: string                 // ❌ Inference, not evidence
  service: string                 // ❌ Classification, not evidence
  room: string                    // ❌ Classification, not evidence
  job: string                     // ❌ Classification, not evidence
  hero_candidate: boolean         // ❌ Policy, not evidence
  featured_candidate: boolean     // ❌ Policy, not evidence
  gallery_candidate: boolean      // ❌ Policy, not evidence
  before_after: boolean           // ❌ Inference, not evidence
  alt_text: string                // ❌ Generated, not evidence
  caption: string                 // ❌ Generated, not evidence
  tags: string[]                  // ❌ Classification, not evidence
  upload_status: string           // ❌ Process state, not evidence
  website_status: string          // ❌ Process state, not evidence
  dashboard_status: string        // ❌ Process state, not evidence
  duplicate_group: string         // ❌ Decision, not evidence
  authority_status: string        // ❌ Policy, not evidence
}
```

---

## Target ImageNode (Pure Evidence)

```typescript
{
  id: UUID v5
  type: "image"
  original_path: string
  sha256: string                 // ✅ Immutable evidence
  perceptual_hash: string         // ✅ Immutable evidence
  dimensions: { width, height }   // ✅ Immutable evidence
  file_size: number              // ✅ Immutable evidence
  mime_type: string              // ✅ Immutable evidence
  exif: EXIFData                 // ✅ Immutable evidence
  created_at: Date               // ✅ Immutable evidence
  modified_at: Date               // ✅ Immutable evidence
}
```

---

## New Constitutional Entities

### AssertionNode (Layer 2: Knowledge)

```typescript
{
  id: UUID v5
  type: "assertion"
  image_id: UUID
  classifier_run_id: UUID
  assertion_type: "service" | "room" | "material" | "activity"
  value: string
  confidence: number
  created_at: Date
}
```

### SelectionPolicyNode (Layer 2: Knowledge)

```typescript
{
  id: UUID v5
  type: "selection_policy"
  policy_type: "hero" | "featured" | "gallery"
  ranking_algorithm: string
  scoring_factors: string[]
  created_at: Date
}
```

### DuplicateFamilyNode (Layer 2: Knowledge)

```typescript
{
  id: UUID v5
  type: "duplicate_family"
  representative_id: UUID
  created_at: Date
}
```

### DuplicateEvidenceNode (Layer 2: Knowledge)

```typescript
{
  id: UUID v5
  type: "duplicate_evidence"
  duplicate_family_id: UUID
  image_id: UUID
  algorithm: string
  confidence: number
  timestamp: Date
}
```

### ImportSessionNode (Layer 1: Observations)

```typescript
{
  id: UUID v5
  type: "import_session"
  source: "Shared Drive"
  import_timestamp: Date
  total_files: number
  total_size: number
  created_at: Date
}
```

### ClassifierRunNode (Layer 1: Observations)

```typescript
{
  id: UUID v5
  type: "classifier_run"
  model: string
  version: string
  run_timestamp: Date
  total_assertions: number
  created_at: Date
}
```

---

## Edge Types (Updated)

### belongs_to_import_session

Image → ImportSession

```typescript
{
  from: UUID (image)
  to: UUID (import_session)
  type: "belongs_to_import_session"
}
```

### has_assertion

Image → Assertion

```typescript
{
  from: UUID (image)
  to: UUID (assertion)
  type: "has_assertion"
}
```

### belongs_to_duplicate_family

Image → DuplicateFamily

```typescript
{
  from: UUID (image)
  to: UUID (duplicate_family)
  type: "belongs_to_duplicate_family"
  role: "representative" | "member"
}
```

### has_duplicate_evidence

DuplicateFamily → DuplicateEvidence

```typescript
{
  from: UUID (duplicate_family)
  to: UUID (duplicate_evidence)
  type: "has_duplicate_evidence"
}
```

---

## Migration Strategy

### Step 1: Extract Evidence

Keep ImageNode with only immutable fields:
- sha256
- perceptual_hash
- dimensions
- file_size
- mime_type
- exif
- created_at
- modified_at

### Step 2: Create ImportSession

Create one ImportSession for the current import:
- source: "Shared Drive"
- import_timestamp: 2026-08-05
- total_files: 43
- total_size: 63.26 MB

Connect all 43 images to this ImportSession.

### Step 3: Create ClassifierRun

Create one ClassifierRun for the current classification:
- model: "folder-based-inference"
- version: "1.0.0"
- run_timestamp: 2026-08-05
- total_assertions: 43

### Step 4: Extract Assertions

For each image, create Assertion nodes:
- service assertion (from current service field)
- room assertion (from current room field)
- material assertion (inferred from job field)
- activity assertion (inferred from service field)

Connect images to assertions via has_assertion edges.

### Step 5: Extract Duplicate Families

Replace duplicate_of edges with:
- DuplicateFamily node (one per group)
- DuplicateEvidence nodes (one per duplicate detection)
- belongs_to_duplicate_family edges (role: representative/member)
- has_duplicate_evidence edges

### Step 6: Remove Stored Decisions

Remove from ImageNode:
- canonical
- hero_candidate
- featured_candidate
- gallery_candidate
- before_after
- alt_text
- caption
- tags
- upload_status
- website_status
- dashboard_status
- duplicate_group
- authority_status

These will become projections later.

---

## Constitutional Layers

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
  └── modified_at
```

### Layer 1: Observations

```
ImportSessionNode
  ├── source
  ├── import_timestamp
  ├── total_files
  └── total_size

ClassifierRunNode
  ├── model
  ├── version
  ├── run_timestamp
  └── total_assertions
```

### Layer 2: Knowledge

```
AssertionNode
  ├── image_id
  ├── classifier_run_id
  ├── assertion_type
  ├── value
  └── confidence

DuplicateFamilyNode
  ├── representative_id
  └── created_at

DuplicateEvidenceNode
  ├── duplicate_family_id
  ├── image_id
  ├── algorithm
  ├── confidence
  └── timestamp
```

### Layer 3: Projections

```
Website Projection
Dashboard Projection
Search Projection
API Projection
Reports Projection
```

---

## Never Mutate Upward

**Constitutional Rule:**

- Evidence (Layer 0) cannot change
- Knowledge (Layer 2) can only reference evidence
- Projections (Layer 3) can never write knowledge

This prevents accidental authority inversion.

---

## Success Criteria

- ✅ ImageNode contains only immutable evidence
- ✅ All decisions moved to separate entities
- ✅ ImportSession created for current import
- ✅ ClassifierRun created for current classification
- ✅ Assertions extracted from image metadata
- ✅ Duplicate families as separate entities
- ✅ Constitutional layers defined
- ✅ No upward mutation possible

---

## Next Phase

After Phase A is complete:

**Phase B: Add Provenance**
- Ensure every inference has ClassifierRun
- Every decision has history
- Graph becomes explainable
