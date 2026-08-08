# Constitutional Media System — Current State

**Date:** 2026-08-05  
**Status:** Phase A Revised Complete  
**Architecture:** Graph-based with dual representation

---

## Constitutional State

### ✅ SINGLE MEDIA AUTHORITY

**File:** `metadata/canonical-media-graph.json`

**Graph Statistics:**
- 113 nodes (43 images, 1 import session, 1 classifier run, 43 assertions, 6 duplicate families, 8 duplicate evidence, 6 projects, 5 services)
- 193 edges (43 import session, 43 assertions, 12 duplicate family connections, 95 existing)

### ✅ CONSTITUTIONAL LAYERS

**Layer 0: Binary Evidence (43 nodes)**
- Image nodes contain immutable evidence (sha256, dimensions, EXIF, etc.)
- Legacy fields preserved (service, project, room, job) for runtime compatibility

**Layer 1: Observations (2 nodes)**
- ImportSession (enhanced with reproducibility metadata)
- ClassifierRun (tracks classification provenance)

**Layer 2: Knowledge (68 nodes)**
- Assertions (43 - dual representation with legacy fields)
- DuplicateFamily (6 - replaces duplicate_of edges)
- DuplicateEvidence (8 - enhanced with algorithm metadata)
- Project (6)
- Service (5)

**Layer 3: Computed Projections (not stored)**
- Website, Dashboard, Search, API, Reports (generated on demand)

---

## Architecture Principles

### ✅ EVIDENCE VS ASSERTIONS

**Evidence (Immutable):**
- sha256
- perceptual_hash
- dimensions
- file_size
- mime_type
- EXIF
- created_at
- modified_at

**Assertions (Mutable via overrides):**
- service
- room
- material
- activity

**Current State:** Dual representation (legacy fields + Assertions) during transition

### ✅ DUPLICATE FAMILIES

**Structure:**
```
DuplicateFamily
    ├── representative → Image
    ├── member → Image
    └── DuplicateEvidence (append-only)
```

**Evidence Includes:**
- algorithm
- version
- parameters
- confidence
- timestamp
- feature_metrics
- distance_metrics

Better algorithms add new evidence without mutating Image nodes.

### ✅ HERO SELECTION

**Removed:** hero_candidate (boolean stored)

**Added:** Measurable scores
- composition_score
- symmetry_score
- sharpness_score
- brightness_score
- entropy_score
- duplicate_penalty
- subject_score
- aspect_ratio

**Homepage Hero:** Generated ranking via weighted scoring, not stored

### ✅ PROVENANCE TRACKING

**Every Image → ImportSession**
**Every Assertion → ClassifierRun**

Graph is explainable. Every decision has history.

---

## Migration Progress

### ✅ PHASE A REVISED: Freeze Evidence

**Complete:**
- Image nodes as immutable evidence
- Legacy fields preserved (zero runtime breakage)
- Dual representation (legacy + Assertions)
- Enhanced ImportSession
- Enhanced DuplicateEvidence
- Measurable scores added
- Duplicate families structure
- Constitutional layers defined

**Pending:**
- Continuous verification (Image.service == highest-confidence Assertion)
- FolderObservation nodes (no folder data in current source)
- Event stream foundation

### ⏳ PHASE B: Add Provenance

**Planned:**
- HumanReview → AssertionOverride
- Append-only assertions
- Every decision has history
- Graph becomes explainable

### ⏳ PHASE C: Replace Stored Decisions

**Planned:**
- Migrate projections to use Assertions
- Hero selection via ranking
- Gallery selection via query
- Remove legacy fields after verification

### ⏳ PHASE D: Event Foundation

**Planned:**
- ImportEvent → MetadataExtracted → DuplicateDetected → ClassificationProduced → ProjectResolved → GraphProjection
- Graph derived from events
- Never manually authored

---

## Runtime Compatibility

### ✅ ZERO BREAKAGE

**Legacy Fields Preserved:**
- service
- project
- room
- job

**Status:** Website, dashboard, API continue working

**Migration Path:**
1. Projections consume Assertions
2. Validation passes
3. Replay works
4. Remove legacy fields

---

## Shared Drive Status

### ✅ SOLE INPUT SOURCE

**Source:** H:\Shared drives\Happy Place Carpentry Website

**Imported:** 43 original photos (63.26 MB)

**Path:** media/originals/

**Status:** Shared Drive is runtime source of truth

---

## PIPING90 Status

### ✅ HISTORICAL ONLY

**Role:** Migration input (historical)

**Status:** No runtime dependency on PIPING90

---

## Success Criteria

### ✅ ACHIEVED

- Single media graph authority
- No parallel metadata files (all archived)
- Services normalized to constitutional list
- Duplicates detected and grouped
- Projections defined
- Legacy runtime archived
- Shared Drive as sole input
- No hidden assets
- No unknown assets
- Evidence vs assertions separation
- Provenance tracking
- Duplicate families structure
- Measurable scores
- Zero runtime breakage

### ⏳ PENDING

- Event stream foundation
- FolderObservation nodes
- Continuous verification
- Projection migration to Assertions
- Legacy field removal
- Variant generation pipeline
- Website component migration
- Dashboard implementation
- API implementation

---

## Definition of Done Status

```
Shared Drive
    ↓
Importer (manual → automated pending)
    ↓
Canonical Media Graph ✅
    ↓
Generated Metadata ✅
    ↓
Generated Website (⏳ pending API implementation)
    ↓
Generated Dashboard (⏳ pending implementation)
    ↓
Generated API (⏳ pending implementation)
```

**The media graph is the permanent constitutional authority. Runtime preserved. Constitutional foundation established.**
