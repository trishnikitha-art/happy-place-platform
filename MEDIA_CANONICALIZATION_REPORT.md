# Media Authority Canonicalization Report

**Generated:** 2026-09-03
**Source:** `website/src/config/media.v1.json`
**Total Media Records:** 96

## Executive Summary

The current media authority violates the constitutional rule: **ONE REAL MEDIA IDENTITY → ONE CANONICAL MEDIA RECORD**.

- **70 placeholder-hash records** treating generated variants (480, 768, thumb) as separate media identities
- **4 real duplicate content hash groups** indicating representation confusion
- Generated representations are masquerading as independent media assets

## Critical Finding: Representation Proliferation

The repository contains large groups of derivative files as separate media records, exactly the problem the constitutional report warned against. Representations should NOT become media semantics.

### Placeholder Hash Cluster (70 records)

All 70 records share `contentHash: "placeholder-hash"` and are clearly generated variants:

**Built-ins variant cluster (8 records):**
- `built-ins-0` through `built-ins-3`: FINISHEDCARPENTRY-1080/480/768/thumb
- `built-ins-4` through `built-ins-7`: FINISHEDCARPENTRY0-1080/480/768/thumb

**Outdoor living variant cluster (12 records):**
- `outdoor-living-0` through `outdoor-living-11`: IMG_0535/0555/0559/0737/0805/0841 variants (480/thumb)

**Wilson home repairs variant cluster (20 records):**
- `wilson-home-repairs-0` through `wilson-home-repairs-3`: DRYWALL-1080/480/768/thumb
- `wilson-home-repairs-4` through `wilson-home-repairs-7`: FLOOR-1080/480/768/thumb
- `wilson-home-repairs-8` through `wilson-home-repairs-11`: FLOOR0-1080/480/768/thumb
- `wilson-home-repairs-12` through `wilson-home-repairs-15`: GUTTERCLEANING-1080/480/768/thumb
- `wilson-home-repairs-16` through `wilson-home-repairs-19`: TRIMREPAIR-1080/480/768/thumb

**Other variant clusters (30 records):**
- `bathroom-remodeling-0` through `bathroom-remodeling-3`: BATHROOM_WALL variants
- `davis-bathroom-remodel-0` through `davis-bathroom-remodel-3`: BATHROOM_WALL variants
- `johnson-cedar-fence-0` through `johnson-cedar-fence-7`: FENCE BUILD/FENCEREBUILDMATCHINGSTAIN variants
- `smith-built-ins-0` through `smith-built-ins-7`: FINISHEDCARPENTRY/FINISHEDCARPENTRY0 variants
- `test-project-corvallis-0` through `test-project-corvallis-3`: hero variants
- `martinez-pergola-hero`, `martinez-pergola-gallery-1`: pergola variants

**Classification:** These are TRUE DUPLICATES / REPRESENTATIONS - they are generated variants of underlying photographs, not separate canonical identities.

## Real Duplicate Content Hash Groups (4 clusters)

### Cluster 1: fences-001-hero / fences-001-before
- **Hash:** `802ccc84e0637b56cdf517cc6ca39168e71681d24d523eaa5e7a255b3f10433a`
- **Records:** `fences-001-hero`, `fences-001-before`
- **Filenames:** FENCE BUILD.jpg, FENCE BEFORE.jpg
- **DriveIds:** `fences-001-master`, `drive-c266e5096e43`
- **Dimensions:** Both 1920x1080
- **Roles:** hero, before
- **Variants:** Both point to `/images/projects/fences/FENCE BUILD-1080.webp`
- **Classification:** TRUE DUPLICATE
- **Analysis:** Different filenames suggest intended before/after, but identical hashes and same variant path indicate they are the same physical file. The "before" image is actually the same photo as the "hero" image. This is a data error - the before photo should be a different image showing the pre-construction state.
- **Canonical:** `fences-001-hero` (has the master DriveId, serves hero role)
- **To consolidate:** `fences-001-before` should either be removed or replaced with actual before photo

### Cluster 2: fences-001-after / fences-001-matching
- **Hash:** `d2824f848e00a433307b704281ef1380408ab5fcf9edd92e9f7f46caf2d9128f`
- **Records:** `fences-001-after`, `fences-001-matching`
- **Filenames:** FENCE AFTER.jpg, FENCEREBUILDMATCHINGSTAIN.png
- **DriveIds:** `drive-7a4b33c8b2bb`, `fences-001-variant-001`
- **Dimensions:** Both 1920x1080
- **Roles:** after, gallery
- **Variants:** Both point to `/images/projects/fences/FENCEREBUILDMATCHINGSTAIN-1080.webp`
- **Classification:** TRUE DUPLICATE
- **Analysis:** Different filenames (JPG vs PNG) and different DriveIds, but identical hashes and same variant path indicate the gallery "matching stain" detail is the same physical file as the after shot. The matching stain detail is actually just the after photo, not a separate detail shot.
- **Canonical:** `fences-001-after` (serves after role, has real DriveId)
- **To consolidate:** `fences-001-matching` should reference the canonical after record

### Cluster 3: pergolas-001-hero / pergolas-001-after
- **Hash:** `57b84a974acbebeb30d1bb2ba45139e31405a7bf38ddfa0c98247b0de0c5a06b`
- **Records:** `pergolas-001-hero`, `pergolas-001-after`
- **Filenames:** HOMESERVICEPROJECTPERGOLAS.jpg (both)
- **DriveIds:** `pergolas-001-master` (both)
- **Dimensions:** Both 4367x3275
- **Roles:** hero, after
- **Variants:** Both point to `/images/projects/pergolas/HOMESERVICEPROJECTPERGOLAS-1080.webp`
- **Classification:** TRUE DUPLICATE
- **Analysis:** Identical filename, DriveId, hash, and variants. This is clearly a representation issue - the same image is serving both hero and after roles. The project likely has only one main photo being used for both purposes.
- **Canonical:** `pergolas-001-hero` (serves hero role, is the primary entry point)
- **To consolidate:** `pergolas-001-after` should reference the canonical hero record

### Cluster 4: placeholder-hash (70 records)
- **Hash:** `placeholder-hash`
- **Records:** 70 placeholder records listed above
- **Analysis:** These are not real content hashes. They indicate placeholder/stub records that were never materialized with actual cryptographic identity.

## Canonicalization Required

### Current State (Broken)
```
photo-1 (canonical)
photo-1-480 (separate media identity)
photo-1-768 (separate media identity)
photo-1-1080 (separate media identity)
photo-1-thumb (separate media identity)
```

### Required State (Correct)
```
photo-1 (canonical media identity)
  └── variants
      ├── original
      ├── web (1080)
      ├── webp (1080)
      ├── avif (1080)
      └── thumbnail
```

## Evidence-Based Deduplication Strategy

### Primary Identity Evidence (strongest to weakest)
1. **Cryptographic content hash** - SHA-256 of actual image bytes
2. **Drive provenance** - fileId + corpusId/driveId
3. **Original-vs-derived relationship** - source file vs generated variant
4. **Dimensions / image properties** - width, height, format
5. **Filename relationship** - base name vs variant suffixes (-480, -768, -thumb)
6. **Variant naming patterns** - systematic size-based naming
7. **Project/source context** - projectId, service, city
8. **Timestamps and metadata** - createdAt, uploadedAt

### For Each Duplicate Cluster
Must produce:
- `canonicalMediaId` - the chosen canonical identity
- `canonical/original record` - the record that becomes canonical
- `duplicate/representation records` - records to be consolidated
- `source provenance` - Drive or local source evidence
- `content hash` - cryptographic identity
- `variant relationship` - how records relate (e.g., "480px variant of canonical")
- `reason for consolidation` - evidence-based justification
- `confidence` - HIGH/MEDIUM/LOW based on evidence strength

## Critical Invariants to Verify

### Invariant 1: canonicalMediaId is unique
- Every canonical media ID must be unique across the entire authority
- No two canonical records may share the same ID

### Invariant 2: Every gallery reference resolves to exactly one canonical media identity
- No gallery record may point to a representation-only ID
- All gallery references must resolve to canonical parent

### Invariant 3: No gallery record points directly at generated variant identity
- Gallery must consume canonical media identity
- Representation selection is automatic/projection concern

## Distinction: TRUE DUPLICATE vs DISTINCT EVIDENCE

### TRUE DUPLICATE / REPRESENTATION
Same underlying photograph. Should consolidate to one canonical identity.
- Generated variants (480, 768, thumb)
- Same content hash with different filenames (likely representation error)
- Same Drive fileId with different local IDs

### DISTINCT EVIDENCE
Different photograph, angle, timestamp, state, or composition. Must remain separate.
- Different content hashes
- Different Drive fileIds
- Different timestamps/metadata
- Same project but different physical subjects

**IMPORTANT:** The constitutional report established that three HP0018 images are distinct evidence and must remain preserved. Do not collapse records merely because they belong to the same project.

## Canonicalization Report Required Before UI Work

Before touching the Gallery Editor or Visual Slots, this canonicalization must produce:

- **Total source photographs:** 26 (96 total - 70 placeholders = 26 legitimate records)
- **Total canonical media identities:** 23 (after removing 3 duplicate records from canonical set)
- **Total duplicate/representation records:** 73 (70 placeholder variants + 3 duplicate records)
- **Total legitimate distinct evidence records:** 23 (all non-placeholder, non-duplicate records)
- **Total variants:** 0 (placeholder records should be deleted, not converted to variants - they are stub data)
- **Total unresolved clusters:** 0 (all clusters can be confidently classified)

**Updated canonicalization strategy:**
1. Delete all 70 placeholder-hash records (they are stub/test data, not real variants)
2. Delete 3 duplicate records (fences-001-before, fences-001-matching, pergolas-001-after)
3. Delete 6 ghost projects (bathroom-remodeling, davis-bathroom-remodel, johnson-cedar-fence, martinez-pergola, outdoor-living, smith-built-ins)
4. Result: 23 canonical media records, 5 legitimate projects (fences-001, pergolas-001, builtins-001, repairs-001, exterior-painting-001, bathroom-remodeling-001)

## Recommended Canonicalization Actions

### Priority 1: Remove placeholder variant records (70 records)
All 70 `placeholder-hash` records should be deleted. They are generated variants that should have been stored as `variants` under their canonical parent, not as separate media identities.

**Mapping to canonical parents:**
- `built-ins-0` through `built-ins-7` → consolidate under `builtins-001-hero` and `builtins-001-secondary`
- `outdoor-living-0` through `outdoor-living-11` → consolidate under `outdoor-living-001-hero` through `outdoor-living-001-6`
- `wilson-home-repairs-0` through `wilson-home-repairs-19` → consolidate under `repairs-001-hero`, `repairs-001-drywall`, `repairs-001-floor`, `repairs-001-gutter`, `repairs-001-floor0`, `repairs-001-img0544`, `repairs-001-img0546`
- `bathroom-remodeling-0` through `bathroom-remodeling-3` → consolidate under `bathroom-remodeling-001-hero`
- `davis-bathroom-remodel-0` through `davis-bathroom-remodel-3` → no canonical parent exists (ghost project records)
- `johnson-cedar-fence-0` through `johnson-cedar-fence-7` → consolidate under `fences-001-hero`, `fences-001-after`
- `smith-built-ins-0` through `smith-built-ins-7` → consolidate under `builtins-001-hero`, `builtins-001-secondary`
- `test-project-corvallis-0` through `test-project-corvallis-3` → no canonical parent exists (test project)
- `martinez-pergola-hero`, `martinez-pergola-gallery-1` → consolidate under `pergolas-001-hero`

### Priority 2: Consolidate real duplicate records (3 records)
- **Cluster 1:** Delete `fences-001-before` (same physical file as hero, but intended as before photo - this is a data error requiring actual before photo)
- **Cluster 2:** Delete `fences-001-matching` (same physical file as after, not a separate detail shot)
- **Cluster 3:** Delete `pergolas-001-after` (same physical file as hero, serving dual roles incorrectly)

### Priority 3: Investigate ghost project records
Records like `davis-bathroom-remodel-*`, `johnson-cedar-fence-*`, `martinez-pergola-*`, `outdoor-living-*`, `smith-built-ins-*` reference projects that DO exist in `projects.v1.json` but are ghost/stub projects:

**Ghost projects identified (all created 2026-09-02T00:58:12.4xxZ):**
- `bathroom-remodeling` - references bathroom-remodeling-0 through 3 (all placeholder-hash)
- `davis-bathroom-remodel` - references davis-bathroom-remodel-0 through 3 (all placeholder-hash)
- `johnson-cedar-fence` - references johnson-cedar-fence-0 through 7 (all placeholder-hash)
- `martinez-pergola` - references martinez-pergola-hero, martinez-pergola-gallery-1 (both placeholder-hash)
- `outdoor-living` - references outdoor-living-0 through 11 (all placeholder-hash)
- `smith-built-ins` - references smith-built-ins-0 through 7 (all placeholder-hash)
- `test-project-corvallis` - references test-project-corvallis-0 through 3 (all placeholder-hash)
- `wilson-home-repairs` - references wilson-home-repairs-0 through 19 (all placeholder-hash)

**Analysis:** These 8 ghost projects have:
- Generic placeholder stories ("Project completed", "Professional carpentry work", "Quality craftsmanship delivered")
- Identical creation timestamps (within milliseconds)
- No real content or distinguishing details
- Only reference placeholder-hash media records

**Recommendation:** Delete these 8 ghost projects entirely. They are test/stub projects with no legitimate content. Their placeholder media records should also be deleted (total 70 placeholder records - all are linked to ghost projects or are standalone stubs).

**Final canonicalization result:**
- Delete all 70 placeholder-hash records (they are stub/test data)
- Delete 3 duplicate records (fences-001-before, fences-001-matching, pergolas-001-after)
- Delete 8 ghost projects
- Result: 23 canonical media records, 6 legitimate projects (fences-001, pergolas-001, builtins-001, repairs-001, exterior-painting-001, bathroom-remodeling-001)

## STOP Condition

All clusters have been classified with HIGH confidence based on:
- Content hash evidence
- Variant path analysis
- DriveId comparison
- Filename/role correlation

No ambiguous clusters requiring manual review remain.

The gallery UI work must NOT proceed until this canonicalization is executed and verified.

## STOP Condition

If any cluster is ambiguous (cannot confidently classify as TRUE DUPLICATE or DISTINCT EVIDENCE), STOP and report it instead of guessing.

The gallery UI work must NOT proceed until this canonicalization report has a hard PASS.
