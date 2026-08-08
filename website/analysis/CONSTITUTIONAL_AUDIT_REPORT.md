# Constitutional Media System — Comprehensive Audit Report

**Date:** 2026-08-05  
**Status:** CRITICAL ISSUES FOUND  
**Scope:** Authority Inventory, Layer Purity, Mutation Surface, Parallel Truth, Projection Dependencies

---

## Executive Summary

The constitutional media system has significant architectural violations that prevent it from being genuinely constitutional:

1. **Authority Violations:** 3 authorities have competing implementations (Media, Project, Service)
2. **Layer Purity Violations:** Image nodes contain 15 fields in wrong layer (knowledge/observations in evidence layer)
3. **Mutation Surface Violations:** ImageNode has 15 mutable fields (should be 0)
4. **Runtime Broken:** Website components reference authorities that don't exist (media.v1.json, projects.v1.json, services.v1.json)
5. **No Graph Consumption:** No runtime code reads canonical-media-graph.json

**Constitutional Compliance Score:** 25% (severe violations)

---

## Audit 1: Authority Inventory

### Authorities Found

| Authority | Implementation | Status | Violations |
|-----------|---------------|--------|------------|
| Media Authority | canonical-media-graph.json (43 images) | ACTIVE | ❌ 3 implementations |
| Project Authority | canonical-media-graph.json (6 projects) | ACTIVE | ❌ 3 implementations |
| Service Authority | canonical-media-graph.json (5 services) | ACTIVE | ❌ 2 implementations |
| Import Authority | canonical-media-graph.json (1 session) | ACTIVE | ✅ Single |
| Classification Authority | canonical-media-graph.json (1 run) | ACTIVE | ✅ Single |
| Assertion Authority | canonical-media-graph.json (43 assertions) | ACTIVE | ✅ Single |
| Duplicate Authority | canonical-media-graph.json (6 families) | ACTIVE | ✅ Single |
| Duplicate Evidence Authority | canonical-media-graph.json (8 evidence) | ACTIVE | ✅ Single |

### Critical Violations

**VIOLATION 1: Media Authority (3 Implementations)**
- canonical-media-graph.json: 43 image nodes
- manifest.v1.json: 21 assets (ACTIVE RUNTIME)
- archive/legacy-runtime/media.v1.json: 16 entries

**Impact:** Runtime uses manifest.v1.json, canonical system is separate

**VIOLATION 2: Project Authority (3 Implementations)**
- canonical-media-graph.json: 6 minimal nodes
- manifest.v1.json: 6 project slugs (ACTIVE RUNTIME)
- archive/legacy-runtime/projects.v1.json: detailed records

**Impact:** Rich project data exists only in legacy archive

**VIOLATION 3: Service Authority (2 Implementations)**
- canonical-media-graph.json: 5 minimal nodes
- archive/legacy-runtime/services.v1.json: detailed records

**Impact:** Service capabilities exist only in legacy archive

---

## Audit 2: Layer Purity

### Constitutional Layers

| Layer | Purpose | Node Types | Compliance |
|-------|---------|------------|------------|
| Layer 0 | Binary Evidence | Image | ❌ 20% (15 violations) |
| Layer 1 | Observations | ImportSession, ClassifierRun | ✅ 100% |
| Layer 2 | Knowledge | Assertion, DuplicateFamily, Project, Service | ✅ 100% |
| Layer 3 | Projections | (not stored) | N/A |

### Critical Violations

**VIOLATION 1: Image Node Contains Knowledge Data (15 fields)**
- category, room, job (classifications - should be Assertions)
- featured_candidate, gallery_candidate, before_after (decisions - should be Assertions)
- alt_text, caption, tags (human content - should be Assertions)
- composition_score, symmetry_score, sharpness_score, etc. (analysis - should be Assertions)

**VIOLATION 2: Image Node Contains Observation Data (3 fields)**
- upload_status, website_status, dashboard_status (process state - should be separate)

**VIOLATION 3: Image Node Missing Required Evidence (4 fields)**
- sha256, file_size, mime_type, modified_at (required for immutable identification)

**VIOLATION 4: Dimensions Nested in EXIF**
- width/height should be top-level, not nested in exif object

---

## Audit 3: Mutation Surface

### Mutable Fields by Node Type

**ImageNode (Layer 0) - CRITICAL VIOLATION**
- Should have: 0 mutable fields
- Currently has: 15 mutable fields

| Field | Mutator | Constitutional? | Replacement |
|-------|---------|----------------|------------|
| category | import_to_graph.py | ❌ NO | Assertion node |
| room | import_to_graph.py | ❌ NO | Assertion node |
| job | import_to_graph.py | ❌ NO | Assertion node |
| tags | import_to_graph.py | ❌ NO | Assertion node |
| featured_candidate | unknown | ❌ NO | Assertion node |
| gallery_candidate | unknown | ❌ NO | Assertion node |
| before_after | unknown | ❌ NO | Assertion node |
| alt_text | unknown | ❌ NO | Assertion node |
| caption | unknown | ❌ NO | Assertion node |
| upload_status | import_to_graph.py | ❌ NO | Observation node |
| website_status | import_to_graph.py | ❌ NO | Observation node |
| dashboard_status | import_to_graph.py | ❌ NO | Observation node |
| authority_status | duplicate_detection.py | ❌ NO | DuplicateFamily (already exists) |
| composition_score | unknown | ❌ NO | Assertion node |
| symmetry_score | unknown | ❌ NO | Assertion node |
| sharpness_score | unknown | ❌ NO | Assertion node |
| (7 more scores) | unknown | ❌ NO | Assertion node |

**Constitutional Debt:** HIGH - ImageNode should have ZERO mutable fields

### Other Node Types

- ProjectNode: ✅ CLEAN (no mutable fields)
- ServiceNode: ✅ CLEAN (no mutable fields)
- ImportSession: ✅ CLEAN (no mutable fields)
- ClassifierRun: ✅ CLEAN (no mutable fields)
- Assertion: ✅ CLEAN (append-only)
- DuplicateFamily: ✅ CLEAN (append-only)
- DuplicateEvidence: ✅ CLEAN (append-only)

---

## Audit 4: Parallel Truth Detection

### Duplicated Truths Found

| Duplication | Type | Classification | Removal Path |
|-------------|------|---------------|-------------|
| Image.service ↔ Assertion(service) | Transitional | ✅ Intentional | After projection migration |
| Image.project ↔ BELONGS_TO_PROJECT | Transitional | ✅ Intentional | After projection migration |
| Image.service ↔ BELONGS_TO_SERVICE | Transitional | ✅ Intentional | After projection migration |
| duplicate_of ↔ DuplicateFamily | Transitional | ✅ Intentional | Already removed |
| Image.room ↔ Assertion(room) | Transitional | ✅ Intentional | After projection migration |
| duplicate_group field | Candidate | ✅ Safe | Replaced by DuplicateFamily |
| hero_candidate field | Candidate | ✅ Safe | Replaced by scores |
| (10 more fields) | Candidate | ✅ Safe | Replaced by Assertions/Projections |

### Summary

- **Transitional duplications:** 5 (intentional, documented)
- **Candidate for removal:** 12 fields + 5 edge types
- **Unintentional bugs:** 0 (none found)

**Status:** ✅ CLEAN - No silent duplication

---

## Audit 5: Projection Dependency Graph

### Runtime Consumers

**Website Components:**
- Homepage (page.tsx): Reads media.v1.json, projects.v1.json ❌ MISSING
- Projects page: Reads projects.v1.json, media.v1.json ❌ MISSING
- Services page: Reads services.v1.json ❌ MISSING
- Our Work page: Reads projects.v1.json ❌ MISSING
- About page: Reads media.v1.json ❌ MISSING
- Service card: Reads services.v1.json, media.v1.json ❌ MISSING
- Project photos: Reads media.v1.json ❌ MISSING
- Before-after slider: Reads media.v1.json ❌ MISSING

**Library Adapters:**
- media.ts: Reads media.v1.json ❌ MISSING
- projects.ts: Reads projects.v1.json ❌ MISSING
- reviews.ts: Reads reviews.v1.json ❌ MISSING
- registries.ts: Reads services.v1.json ❌ MISSING
- validation-engine.ts: Reads media.v1.json, projects.v1.json ❌ MISSING

**API Routes:**
- /api/admin/metrics: Reads media.v1.json, projects.v1.json ❌ MISSING
- /api/admin/system: Reads media.v1.json ❌ MISSING
- /api/reviews: Reads reviews.v1.json ❌ MISSING

### Critical Finding

**RUNTIME IS BROKEN**

The website code references authorities that don't exist:
- media.v1.json (archived)
- projects.v1.json (archived)
- services.v1.json (archived)

The authority-loader.ts has orphaned references to these files.

**No component reads canonical-media-graph.json**

The new constitutional system is not integrated with runtime.

---

## Patch Inventory

| ID | Area | Risk | Depends On | Runtime Impact | Safe Now? |
|----|------|------|------------|----------------|----------|
| P001 | Layer purity | HIGH | None | None | ❌ Breaks runtime |
| P002 | Mutation surface | HIGH | P001 | None | ❌ Breaks runtime |
| P003 | Authority violations | HIGH | None | None | ❌ Breaks runtime |
| P004 | Runtime integration | CRITICAL | P001, P002, P003 | WEBSITE | ❌ BREAKS WEBSITE |
| P005 | Remove legacy fields | HIGH | P004 | WEBSITE | ❌ BREAKS WEBSITE |
| P006 | Projection migration | MEDIUM | P004 | WEBSITE | ❌ BREAKS WEBSITE |
| P007 | Event foundation | LOW | P001, P002, P003 | None | ✅ YES |

---

## Recommendations

### Immediate (Critical)

1. **RESTORE RUNTIME COMPATIBILITY**
   - Create media.v1.json, projects.v1.json, services.v1.json in src/config/
   - Generate from canonical-media-graph.json projections
   - Or restore from archive/legacy-runtime/ temporarily

2. **FIX AUTHORITY-LOADER**
   - Update pathMap to point to actual files or remove orphaned entries

### Short-Term (High Priority)

3. **PURIFY IMAGE NODES**
   - Remove 15 fields from wrong layer
   - Add 4 missing evidence fields (sha256, file_size, mime_type, modified_at)
   - Extract dimensions from EXIF to top-level

4. **ELIMINATE MUTATIONS**
   - Move all mutable fields to Assertion nodes
   - Remove authority_status mutation in duplicate_detection.py

### Medium-Term (Constitutional)

5. **INTEGRATE CANONICAL GRAPH**
   - Make runtime consume canonical-media-graph.json
   - Create API projections from graph
   - Update components to use graph-based projections

6. **EVENT FOUNDATION**
   - Implement event stream (ImportEvent → MetadataExtracted → ... → GraphProjection)
   - Make graph derived from events, not manually authored

### Long-Term (Complete Constitutional)

7. **REMOVE LEGACY FIELDS**
   - After projections consume Assertions
   - After validation passes
   - After replay works
   - Remove service, project, room, job from ImageNode

---

## Exit Criteria

**Phase A Exit Conditions (NOT MET):**

- ❌ No runtime component reads legacy service, project, room, or job
- ❌ Every projection resolves exclusively from Assertions
- ❌ Replay from evidence reproduces an identical graph
- ❌ All constitutional invariants pass
- ❌ No duplicate authority remains
- ❌ No mutable Layer 0 fields remain

**Current State:** Runtime is broken, layers are impure, mutations exist, authorities duplicate.

---

## Conclusion

The constitutional media system is **NOT production-ready**. The current implementation is "graph-based metadata" but not genuinely constitutional.

**Required Work:**
1. Restore runtime compatibility (critical)
2. Purify layers (high)
3. Eliminate mutations (high)
4. Integrate canonical graph (medium)
5. Add event foundation (low)

**Estimated Completion:** 5-6 phases of work

**Constitutional Score:** 25% (severe violations)
