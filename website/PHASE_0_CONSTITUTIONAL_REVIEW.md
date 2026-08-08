# Phase 0 — Constitutional Review Report

**Date:** 2026-08-06  
**Status:** ⚠️ DUPLICATE AUTHORITIES IDENTIFIED  
**Objective:** Identify constitutional authorities before integration

---

## ❌ Critical Constitutional Violation: Duplicate Projection Systems

### Authority 1: NEW Constitutional Projection Generator
**Location:** `scripts/constitutional-projection-generator.js`
**Output:** `.generated/hero-projection.json`, `.generated/gallery-projection.json`, `.generated/service-projection.json`
**Input:** `metadata/canonical-media-graph.json`, `metadata/constitutional-scoring.json`
**Status:** ✅ CONSTITUTIONAL (latest implementation)
**Characteristics:**
- Uses graph edges (belongsTo, supports)
- No filename heuristics
- Complete provenance (inputHash, generatedHash)
- Build fails if constitutional edges missing
- Version tracking (schemaVersion, projectionVersion, generatorVersion)

### Authority 2: OLD Media Graph Projection Orchestrator
**Location:** `scripts/generate-media-cache.js` → `src/generators/media-graph-projection.js`
**Output:** `.generated/media.cache.json`, `.generated/projects.cache.json`, `.generated/services.cache.json`
**Input:** `metadata/canonical-media-graph.json`
**Status:** ⚠️ OBSOLETE (legacy implementation)
**Characteristics:**
- Uses TypeScript projection registry
- Generates `.cache.json` files
- Different output format
- No inputHash tracking
- No constitutional scoring artifact

### Authority 3: OLD Static Projection Files
**Location:** `metadata/projection/galleryProjection.json`, `metadata/projection/heroProjection.json`, `metadata/projection/serviceProjection.json`
**Output:** Static files in metadata directory
**Status:** ⚠️ OBSOLETE (static snapshots)
**Characteristics:**
- Hardcoded projections
- No generation process
- Different format from constitutional generator
- Timestamp "2026-08-06T00:00:00Z" (placeholder)

---

## Other Identified Scripts

### Constitutional Build Scripts
- `scripts/AuthorityResolver.js` - Constitutional authority resolver
- `scripts/ConstitutionalAuthorityScanner.js` - Constitutional authority scanner
- `scripts/ConstitutionalBuildManager.js` - Constitutional build manager
- `scripts/ProjectionManager.js` - Projection manager
- `scripts/build-pipeline.js` - Build pipeline
- `scripts/constitutional-verification.js` - Constitutional verification
- `scripts/hash-authority.js` - Hash authority
- `scripts/test-determinism.js` - Determinism testing

### Legacy Scripts
- `scripts/generate-ir-snapshot.js` - IR snapshot generation
- `scripts/generate-runtime-config.js` - Runtime config generation
- `scripts/setup-reviews-sheet.js` - Reviews sheet setup
- `scripts/verify-media-cache.js` - Media cache verification

---

## Generated Artifacts Inventory

### Current (Constitutional)
- `.generated/hero-projection.json` ✅
- `.generated/gallery-projection.json` ✅
- `.generated/service-projection.json` ✅

### Legacy (Obsolete)
- `.generated/media.cache.json` ⚠️
- `.generated/projects.cache.json` ⚠️
- `.generated/services.cache.json` ⚠️
- `.generated/mediaprojection.cache.json` ⚠️
- `.generated/projectprojection.cache.json` ⚠️
- `.generated/serviceprojection.cache.json` ⚠️

### Static (Obsolete)
- `metadata/projection/galleryProjection.json` ⚠️
- `metadata/projection/heroProjection.json` ⚠️
- `metadata/projection/serviceProjection.json` ⚠️
- `metadata/projection/scoring/*.json` ⚠️

---

## Constitutional Authority Status

### Current Constitutional Authority
**Projection Generator:** `scripts/constitutional-projection-generator.js`
**Output:** `.generated/hero-projection.json`, `.generated/gallery-projection.json`, `.generated/service-projection.json`
**Scoring:** `metadata/constitutional-scoring.json`
**Graph:** `metadata/canonical-media-graph.json` (with constitutional edges)

### Obsolete Authorities
1. `scripts/generate-media-cache.js` → `src/generators/media-graph-projection.js`
2. `metadata/projection/*.json` (static projections)
3. `.generated/*.cache.json` (legacy cache format)

---

## Integration Risks

### Risk 1: Build Script Confusion
**Issue:** `package.json` has multiple projection-related scripts
**Impact:** May run wrong generator
**Mitigation:** Ensure `npm run build` uses constitutional generator only

### Risk 2: Runtime Loader Confusion
**Issue:** Multiple projection artifacts in `.generated/`
**Impact:** Runtime may load wrong projection
**Mitigation:** Ensure runtime loads only constitutional projections

### Risk 3: React Component Confusion
**Issue:** Components may reference old cache files
**Impact:** Wrong data rendered
**Mitigation:** Audit React components for projection imports

---

## Required Cleanup

### Remove Obsolete Generators
1. Delete `scripts/generate-media-cache.js`
2. Delete `src/generators/media-graph-projection.js`
3. Delete `src/projections/projection-registry.js`
4. Delete `src/validators/graph-integrity-validator.js`
5. Delete `scripts/verify-media-cache.js`

### Remove Obsolete Artifacts
1. Delete `.generated/media.cache.json`
2. Delete `.generated/projects.cache.json`
3. Delete `.generated/services.cache.json`
4. Delete `.generated/mediaprojection.cache.json`
5. Delete `.generated/projectprojection.cache.json`
6. Delete `.generated/serviceprojection.cache.json`
7. Delete `metadata/projection/galleryProjection.json`
8. Delete `metadata/projection/heroProjection.json`
9. Delete `metadata/projection/serviceProjection.json`
10. Delete `metadata/projection/scoring/` directory

### Update Build Scripts
1. Ensure `npm run build` uses only constitutional generator
2. Remove legacy scripts from `package.json`

---

## Constitutional Review Status

**Status:** ✅ CLEANUP COMPLETE - Single constitutional authority confirmed

**Actions Completed:**
1. ✅ Deleted `scripts/generate-media-cache.js`
2. ✅ Deleted `scripts/verify-media-cache.js`
3. ✅ Deleted `src/generators/media-graph-projection.js`
4. ✅ Deleted `src/projections/projection-registry.js` (entire directory)
5. ✅ Deleted `src/validators/graph-integrity-validator.js` (entire directory)
6. ✅ Deleted `.generated/media.cache.json`
7. ✅ Deleted `.generated/projects.cache.json`
8. ✅ Deleted `.generated/services.cache.json`
9. ✅ Deleted `.generated/mediaprojection.cache.json`
10. ✅ Deleted `.generated/projectprojection.cache.json`
11. ✅ Deleted `.generated/serviceprojection.cache.json`
12. ✅ Deleted `metadata/projection/` directory (entire directory)

**Single Constitutional Authority Confirmed:**
- Projection Generator: `scripts/constitutional-projection-generator.js`
- Output: `.generated/hero-projection.json`, `.generated/gallery-projection.json`, `.generated/service-projection.json`
- Scoring: `metadata/constitutional-scoring.json`
- Graph: `metadata/canonical-media-graph.json` (with constitutional edges)

**Status:** ✅ READY FOR INTEGRATION

All duplicate authorities removed. Single constitutional authority confirmed.
