# Constitutional Architecture — Evolution Path to 10/10

**Date:** 2026-08-06  
**Status:** Architecture Evaluation Complete  
**Objective:** Document the path from current 9.5/10 to full 10/10 constitutional architecture

---

## Current Architecture Score

| Area | Current Score | Target |
|------|---------------|--------|
| Canonical evidence model | 10/10 | 10/10 |
| Runtime purity | 10/10 | 10/10 |
| Projection architecture | 9.5/10 | 10/10 |
| Provenance | 9.5/10 | 10/10 |
| Replayability | 9/10 | 10/10 |
| Separation of authorities | 8.5/10 | 10/10 |

**Overall:** ~9.5/10 constitutional completion

---

## Remaining Architectural Improvements

### 1. Generator Contains Business Policy ⚠️

**Current Issue:**
```javascript
switch (factorName) {
  case 'composition':
    factorScore = image.data.composition_score || 0.5;
    break;
  // ...
}
```

**Problem:** Generator is simultaneously:
- Orchestration
- Scoring engine
- Projection engine

**Required Evolution:**
```
Graph
    ↓
Scoring Plugins (composition-score.ts, sharpness-score.ts, etc.)
    ↓
Scoring Artifact
    ↓
Projection Generator (boring orchestrator)
    ↓
Projection JSON
```

**Target:** Generator should never contain another switch statement

---

### 2. Filename Grouping Should Fail Production Builds ⚠️

**Current:**
```javascript
console.log('Warning: Graph missing belongsTo edges, using filename-based grouping (transitional)');
```

**Required:**
```javascript
if (!hasBelongsToEdges) {
  throw new Error('FAIL BUILD: Graph missing belongsTo edges. Filename heuristics not allowed in production.');
}
```

**Impact:** Guarantees graph is always authoritative

---

### 3. Project IDs from Graph Identities ⚠️

**Current:** `HP0017` derived from filenames

**Required Evolution:**
```
Project
├── UUID (canonical identity)
├── displayName
├── legacyProjectNumber (HP0017)
├── customer
└── service
```

**Impact:** Filenames become irrelevant

---

### 4. Representative Evidence in Graph ⚠️

**Current:** `highest score → representative`

**Required Evolution:**
```
Project
    ↓
RepresentativeEvidence edge
    ↓
Image
```

**Impact:** Projections simply serialize, no ranking or decisions

---

### 5. Expanded inputHash ✅

**Current:**
```javascript
inputHash = hash(graphHash + scoringHash + generatorVersion)
```

**Required:**
```javascript
inputHash = hash(
  schemaVersion +
  projectionVersion +
  generatorVersion +
  graphHash +
  scoringHash
)
```

**Impact:** Schema evolution invalidates replay

---

### 6. Stronger Constitutional Validation ⚠️

**Current:** Existence validation

**Required:** Constitutional invariants
- Every project has exactly one representative
- Every representative belongsTo exactly one project
- Every image belongsTo one project
- Every projection references immutable IDs
- No duplicate gallery order
- Replay regenerates identical hash

---

### 7. Decision Artifacts ⚠️

**Current:** Generator decides hero

**Required Evolution:**
```
HeroDecision Artifact
    ↓
Projection Generator
    ↓
Hero Projection
```

**Replay Path:**
```
Graph
    ↓
Decision Artifact
    ↓
Projection
```

---

### 8. Three-Phase Pipeline ⚠️

**Current:** Single phase (Graph → Projections)

**Required Evolution:**
```
Phase 1: Graph Compilation
    Filesystem
        ↓
    Canonical Graph

Phase 2: Constitutional Evaluation
    ↓
    Scoring
    ↓
    Hero Selection
    ↓
    Representative Selection
    ↓
    Coverage Classification
    ↓
    Decision Artifacts

Phase 3: Projection Generation
    Decision Artifacts
        ↓
    Projection Generator (deterministic serializer)
        ↓
    Static JSON
```

**Impact:** Generator no longer decides anything, only materializes decisions

---

## Target Architecture

### Constitutional Evidence Model: 10/10
- Graph is sole authority
- All relationships encoded as edges
- UUID-based identities
- Metadata as graph properties

### Runtime Purity: 10/10
- No filesystem access in browser
- React consumes static JSON
- No runtime ranking or selection

### Projection Architecture: 10/10
- Generator is boring orchestrator
- Scoring in plugins
- Decisions in artifacts
- Only serialization

### Provenance: 10/10
- Complete input hash (schema + projection + generator + graph + scoring)
- Decision artifact provenance
- Immutable IDs only

### Replayability: 10/10
- Graph + Decision Artifacts → Projections
- Deterministic serialization
- Constitutional invariants validated

### Separation of Authorities: 10/10
- Graph compilation
- Constitutional evaluation
- Projection generation
- Each phase has single responsibility

---

## Implementation Priority

### Phase 1: Strengthen Validation (Quick)
1. Fail production builds without belongsTo edges
2. Add constitutional invariants validation
3. Expand inputHash with more versions

### Phase 2: Extract Scoring (Medium)
1. Create scoring plugins (composition-score.ts, etc.)
2. Generator orchestrates plugins
3. Scoring artifact references plugins

### Phase 3: Decision Artifacts (Medium)
1. Create HeroSelectionArtifact
2. Move representative selection to graph edges
3. Projections serialize decisions

### Phase 4: Graph Compiler (Major)
1. Generate belongsTo edges
2. Add UUID-based project identities
3. Add RepresentativeEvidence edges
4. Add service membership edges

### Phase 5: Three-Phase Pipeline (Major)
1. Separate graph compilation
2. Separate constitutional evaluation
3. Separate projection generation

---

## End State

### Projection Generator
```javascript
// Boring orchestrator - no business logic
function generateProjections(graph, decisions) {
  return {
    hero: serializeHero(decisions.hero),
    gallery: serializeGallery(decisions.gallery),
    service: serializeService(decisions.service)
  };
}
```

### Decision Artifact
```json
{
  "decisionId": "hero-v1",
  "schemaVersion": "1.0.0",
  "constitutionalVersion": "1.0.0",
  "chosenMediaId": "uuid-123",
  "reason": "highest_scoring_featured_candidate",
  "evidenceHash": "sha256:...",
  "scoringHash": "sha256:...",
  "inputHash": "sha256:..."
}
```

### Projection Artifact
```json
{
  "projectionId": "hero-v1",
  "schemaVersion": "1.0.0",
  "projectionVersion": "1.0.0",
  "decisionId": "hero-v1",
  "decisionHash": "sha256:...",
  "inputHash": "sha256:...",
  "generatedHash": "sha256:...",
  "hero": { /* serialized decision */ }
}
```

---

## Current vs Target

### Current (9.5/10)
- Generator contains business logic (switch statements)
- Filename heuristics as transitional fallback
- Generator makes decisions (hero selection, ranking)
- Projections contain data + metadata

### Target (10/10)
- Generator is boring orchestrator
- Filename heuristics forbidden (build failure)
- Generator serializes decisions (no logic)
- Projections serialize decision artifacts + metadata

---

## Deployment Readiness

### For Immediate HPP Deployment: ✅ READY
- Current 9.5/10 architecture is excellent
- Runtime is constitutional (10/10)
- Provenance is strong (9.5/10)
- Transitional issues documented and acceptable
- Filename heuristics can be phased out later

### For Full Constitutional Completion: Requires Work
- All 8 improvements above
- Major graph compiler evolution
- Plugin architecture for scoring
- Decision artifact system
- Three-phase pipeline separation

---

## Conclusion

**The current architecture is production-ready for HPP deployment at 9.5/10 constitutional completion.**

The remaining work is architectural evolution to reach 10/10, not blockers for deployment. The direction is clear: move decision-making out of the generator and into explicit constitutional artifacts and graph relationships, so the generator becomes a deterministic serializer.

This is exactly how a constitutional architecture should evolve: strong foundation first, then refine decision-making separation over time.
