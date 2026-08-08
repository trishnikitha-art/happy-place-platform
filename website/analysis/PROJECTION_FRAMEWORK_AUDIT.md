# Existing Capability Audit — Projection Framework

**Date:** 2026-08-05  
**Status:** IN PROGRESS  
**Objective:** Determine if PING projection framework can replace custom projection engine

---

## Existing PING Projection Framework

### Found Components

**Generator:**
- `src/generators/projection.ts` - ProjectionGenerator class
- Generates projection skeletons from IR (Intermediate Representation)
- Auto-generates for aggregates/entities
- Creates ProjectionRegistry

**Projection Implementations:**
- `src/objects/project/projection/project-projection.ts` - Multi-source aggregation (Google Sheets, PostHog, Neo4j, Qdrant, Ollama)
- `src/objects/review/projection/review-projection.ts` - Review projections
- `src/objects/mission/projection/mission-projection.ts` - Mission projections
- `src/objects/mission-control/projection/business-projections.ts` - Business projections
- `src/objects/customer/projection/customer-projection.ts` - Customer projections
- `src/objects/estimate/projection/estimate-projection.ts` - Estimate projections
- `src/objects/artifact/projection/artifact-projection.ts` - Artifact projections
- `src/objects/analytics/projection/analytics-projection.ts` - Analytics projections
- `src/objects/agent/projection/*.ts` - Multiple agent projections

**Architecture (from PING):**
```
Multiple Sources (Google Sheets, PostHog, Neo4j, Qdrant, Ollama)
    ↓
Projection Classes
    ↓
Unified Read Models
    ↓
UI Components
```

---

## My Requirement (HPP Media Graph)

**Architecture (what I need):**
```
Canonical Media Graph (single source)
    ↓
Projection Engine
    ↓
Runtime Cache Files
    ↓
media.ts (runtime API)
    ↓
Components
```

---

## Analysis

### Can PING Framework Replace Custom Engine?

**Mismatch 1: Purpose**
- PING: Multi-source aggregation (different systems → unified view)
- HPP: Single-source projection (graph → cache)

**Mismatch 2: Input Format**
- PING: IRDocument (Intermediate Representation from compiler)
- HPP: canonical-media-graph.json (JSON graph structure)

**Mismatch 3: Output Format**
- PING: TypeScript classes in memory (read models)
- HPP: JSON files on disk (cache files)

**Mismatch 4: Use Case**
- PING: Real-time event projection (events → read models)
- HPP: Build-time generation (graph → static files)

---

## Assessment

**PING projection framework is not a direct replacement.**

The frameworks serve different purposes:
- PING: Event-driven multi-source aggregation
- HPP: Build-time single-source projection

**However:** The architectural principles from PING are applicable:
- Projection registry pattern
- Independent projection classes
- Policy separation
- Integrity validation

---

## Recommendation

Do NOT try to force the graph into the PING framework.

Instead:

1. **Adopt PING principles:**
   - Split monolithic projection_engine.py into independent projection classes
   - Create a projection registry
   - Separate policies from projections

2. **Fix architectural violations:**
   - Rename outputs to generated/*.cache.json (not v1)
   - Remove fabricated/default values
   - Add graph integrity validator
   - Separate build from projection (npm run sync-media)

3. **Keep as separate system:**
   - PING framework for event-driven multi-source aggregation
   - HPP projection engine for build-time graph-to-cache generation

Both can coexist as complementary systems serving different use cases.

---

## Next Action

Should I proceed with refactoring the custom projection engine to adopt PING principles (registry, independent classes, policy separation), or should I investigate whether the graph can be converted to IR format for PING framework compatibility?
