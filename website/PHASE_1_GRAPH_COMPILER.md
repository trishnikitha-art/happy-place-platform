# Phase 1 — Finish Media Pipeline

**Priority:** Execute Now  
**Objective:** Extend graph compiler to emit constitutional belongsTo edges

---

## Current Blocker

**Gallery Projection Uses Filename Heuristics:**
```javascript
const match = filename.match(/^(HP\d+|Featured)/);
```

**Required Fix:** Graph compiler should emit `Image belongsTo Project` edges

---

## Graph Compiler Enhancement

### Required Edge Types

**Image → Project:**
```json
{
  "from": "image-uuid",
  "to": "project-uuid",
  "kind": "belongsTo",
  "properties": {
    "role": "gallery"
  }
}
```

**Image → Service:**
```json
{
  "from": "image-uuid",
  "to": "service-uuid",
  "kind": "supports",
  "properties": {
    "role": "example"
  }
}
```

**Project → RepresentativeEvidence → Image:**
```json
{
  "from": "project-uuid",
  "to": "image-uuid",
  "kind": "hasRepresentative",
  "properties": {
    "type": "gallery"
  }
}
```

---

## Implementation Approach

**Option A: Enhance Existing Graph Compiler**
- Modify existing graph generation to add these edges
- Parse filenames to determine project membership
- Create project nodes if they don't exist
- Emit constitutional edges

**Option B: Post-Process Existing Graph**
- Take existing canonical-media-graph.json
- Add missing edges based on filename analysis
- Regenerate graph with constitutional edges
- Keep IDs stable

**Recommendation:** Option B - safer, doesn't break existing graph generation

---

## Implementation Plan

1. **Edge Generator Script**
   - Load existing canonical-media-graph.json
   - Create project nodes from filename patterns
   - Generate belongsTo edges
   - Generate supports edges
   - Regenerate graph with constitutional edges

2. **Remove Filename Heuristics**
   - Remove filename matching from projection generator
   - Remove transitional fallback
   - Fail build if belongsTo edges missing

3. **Validation**
   - Verify all images have project membership
   - Verify projections use only graph edges
   - Test regeneration consistency

---

## Success Criteria

- ✅ Graph contains belongsTo edges
- ✅ Gallery projection uses only graph edges
- ✅ Filename heuristics removed from generator
- ✅ Build fails if constitutional edges missing
- ✅ Projections deterministic from graph

---

## Status

**Current:** Graph has 0 belongsTo edges  
**Target:** Graph has constitutional belongsTo edges  
**Priority:** High (Phase 1 execution)

This is the shortest path to delivering value for HPP deployment.
