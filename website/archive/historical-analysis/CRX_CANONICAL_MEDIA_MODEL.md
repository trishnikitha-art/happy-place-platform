# CRX Canonical Media Model - Preliminary Analysis

## PRIMARY OBJECTIVE

Build the canonical media authority for Happy Place Carpentry based on forensic evidence across all discovered locations.

---

## EVIDENCE-BASED CANONICAL MODEL

### CURRENT ASSET INVENTORY

**Total Discovered Assets**: 120+ across all locations

**By Location**:
- H:\ My Drive (Happy Place Media): 47 assets
- H:\ Shared Drive: 33 assets  
- Repository photo-intake: 21 assets
- Additional C:\Users\nolan\ analysis data: 19 CSV inventories

**By Classification**:
- Original Photos: 17 (per system design)
- Derivatives: 51+ (duplicates by workflow design)
- Before/After Series: 33 (Shared Drive)
- Analysis Data: 19 CSV files

---

## CANONICAL ORIGINAL DETERMINATION

### EVIDENCE HIERARCHY (Based on forensic data)

**Tier 1: EXIF-Preserving Assets**
- **Definition**: Assets with original iPhone capture metadata
- **Evidence**: client_iPhone_metadata.csv shows 20 files with iPhone EXIF
- **Canonical Status**: These are TRUE canonical originals
- **Count**: 20 assets identified

**Tier 2: System-Designated Canonicals**
- **Definition**: Assets in _System\Originals\ per workflow design
- **Evidence**: H:\ drive structure follows finalize-safe-structure.mjs design
- **Canonical Status**: Designated canonical by system architecture
- **Count**: 17 assets in _System\Originals\

**Tier 3: Repository Originals**
- **Definition**: Assets in photo-intake folder
- **Evidence**: Repository has 21 source originals
- **Canonical Status**: Repository source of truth
- **Count**: 21 assets

**Tier 4: Shared Drive Assets**
- **Definition**: Professional Before/After series
- **Evidence**: 33 assets with HP#### naming convention
- **Canonical Status**: Independent canonical set
- **Count**: 33 assets

---

## DUPLICATE ANALYSIS (From forensic data)

### CROSS-DRIVE VALIDATION (final_validation.csv)

**4 Potential Matches Identified**:

1. **HOMESERVICEPROJECTPERGOLAS.jpg ↔ Feature-Fence-Photo.jpg**
   - Confidence: 70%
   - Match: Exact dimensions (4367 x 3275)
   - Hash: Different (processed version)
   - Status: Picasa-processed derivative

2. **FLOOR.png ↔ HP006_ExteriorPainting_House_After.jpg**
   - Confidence: 30%
   - Match: Size similarity only
   - Status: Low confidence, requires visual review

3. **BATHROOM_WALL.png ↔ HP002_ExteriorPainting_House_After.jpg**
   - Confidence: 30%
   - Match: Size similarity only
   - Status: Low confidence, requires visual review

4. **FENCE BUILD.jpg ↔ HP009_DrywallRepair_After_Primed.jpg**
   - Confidence: 30%
   - Match: Size similarity only
   - Status: Low confidence, requires visual review

### SYSTEM DUPLICATION (From H: drive analysis)

**64% Duplication Rate by Design**:
- Every project photo exists in 3-4 locations
- Workflow: Incoming Uploads → System Originals → Website Library → Archive
- 51 duplicate files identified
- Storage waste: ~100MB

---

## DERIVATION GRAPH

### ASSET LINEAGE (Based on forensic evidence)

```
[CLIENT DRIVE - iPhone Originals]
    ↓ (upload)
[INCOMING UPLOADS - Staging]
    ↓ (COPY, NOT MOVE)
[SYSTEM ORIGINALS - Canonical]
    ↓ (processing)
[WEBSITE LIBRARY - Published]
    ↓ (archival)
[ARCHIVE - Historical]
```

### TRANSFORMATION EVIDENCE

**From master_asset_inventory.csv**:
- **Software Processing**: Picasa detected in multiple files
- **Format Changes**: PNG ↔ JPEG conversions detected
- **Metadata Loss**: EXIF stripped during processing
- **Dimension Changes**: Some resizing detected

**From client_iPhone_metadata.csv**:
- **100% iPhone Capture**: All 20 client files are iPhone photos
- **Device Distribution**: iPhone 17 Pro (5), iPhone 14 Pro (11), iPhone 16 Pro Max (1), iPhone 12 (1), iPhone 12 Pro Max (2)
- **EXIF Integrity**: Full iPhone metadata preserved on client drive
- **Metadata Loss**: Development files stripped EXIF during Picasa processing

---

## PROJECT MAPPING

### CURRENT PROJECT ASSOCIATIONS

**From H: drive structure**:
- Johnson Cedar Fence: 2 assets
- Smith Built-Ins: 2 assets
- Wilson Home Repairs: 5 assets
- Davis Bathroom Remodel: 1 asset
- Martinez Pergola: 2 assets
- Thompson Exterior Painting: 0 assets (empty)
- Hero: 1 asset
- Brand: 2 assets

**From Shared Drive**:
- Before/After series organized by project type
- HP#### naming convention suggests systematic organization
- 33 assets across multiple project types

**From Repository**:
- 21 assets in photo-intake folder
- Mapped to projects.v1.json authority objects

### ORPHAN ASSETS

**Identified Orphans**:
- 33F73891-D9B4-4836-A00B-C671D6E599FC.jpeg (UUID-named, unclassified)
- IMG_5240.jpeg (iPhone photo, unclassified)
- IMG_5325.jpeg (iPhone photo, unclassified)
- paint.jpg (unclassified)
- test-project-corvallis/hero.png (archived test asset)

---

## HASH AUTHORITY FRAMEWORK

### CURRENT HASH EVIDENCE

**From master_asset_inventory.csv**:
- **SHA256 Hashes**: All 17 canonical assets have SHA256 hashes
- **MD5 Hashes**: All 17 canonical assets have MD5 hashes
- **Hash Collision Detection**: No collisions detected in current inventory

**From final_validation.csv**:
- **Cross-Drive Hash Comparison**: 4 potential matches analyzed
- **Hash Mismatch**: All 4 matches have different hashes (processing evidence)
- **Hash Authority**: SHA256 used for content verification

### PROPOSED HASH AUTHORITY

**Canonical Hash Strategy**:
- **Primary Hash**: SHA256 for content verification
- **Secondary Hash**: MD5 for legacy compatibility
- **Perceptual Hash**: Future implementation for near-duplicate detection
- **Hash Storage**: Metadata JSON files alongside assets

---

## MISSING AUTHORITIES (Constitutional Gap Analysis)

### REQUIRED AUTHORITIES (Not Yet Implemented)

**1. Canonicalization Authority**
- **Status**: MISSING
- **Purpose**: Single canonical original selection
- **Current State**: Embedded in individual workers
- **Requirement**: Centralized canonicalization logic

**2. Canonical Event Authority**
- **Status**: PARTIAL (repository_client.emit_event exists)
- **Purpose**: Asset ingestion events with constitutional authority
- **Current State**: Partial implementation in repository
- **Requirement**: Extend with Identity and Hash authorities

**3. Replay Authority**
- **Status**: BLOCKED until canonical event complete
- **Purpose**: Asset processing history
- **Current State**: Multiple scattered implementations
- **Requirement**: Single constitutional replay authority

**4. Witness Authority**
- **Status**: BLOCKED until canonical event complete
- **Purpose**: Asset verification chain
- **Current State**: Partial TypeScript implementation
- **Requirement**: Complete constitutional witness authority

**5. Lineage Authority**
- **Status**: PARTIAL (lineage_worker exists)
- **Purpose**: Asset derivation graph
- **Current State**: Worker exists but not constitutional
- **Requirement**: Constitutional lineage authority

---

## FOLDER TAXONOMY RECOMMENDATION

### PROPOSED CANONICAL STRUCTURE

```
H:\My Drive\Happy Place Media\
├── 📥 Incoming Uploads\          (STAGING - auto-cleanup)
├── _System\                      (CANONICAL)
│   ├── Originals\                (Single canonical copy)
│   ├── Metadata\                 (JSON files per asset)
│   ├── History\                  (Version manifests)
│   ├── Queue\                    (Processing workflow)
│   └── Generated\                (Processed variants)
├── Website Library\              (SYMLINKS to originals)
└── Archive\                     (Cold storage)
```

### MIGRATION STRATEGY

**Phase 1**: Integrate Shared Drive assets
**Phase 2**: Consolidate canonical originals
**Phase 3**: Replace copies with symlinks
**Phase 4**: Archive cleanup
**Phase 5**: Processing integration

---

## SAFE DEDUPLICATION PLAN

### DEDUPLICATION CLASSIFICATION

**Exact Duplicates**: 51 files (64% by design)
- **Action**: Replace with symlinks
- **Risk**: LOW (by design, not error)

**Edited Derivatives**: 4 potential matches
- **Action**: Manual review required
- **Risk**: MEDIUM (uncertain lineage)

**Resized Derivatives**: Detected in processing evidence
- **Action**: Keep as Generated variants
- **Risk**: LOW (intentional derivatives)

**Unknown Lineage**: 5 orphan assets
- **Action**: Manual classification required
- **Risk**: MEDIUM (uncertain provenance)

### VERIFICATION REQUIREMENTS

**Before Any Deletion**:
1. Hash verification (SHA256)
2. EXIF comparison
3. Dimension analysis
4. Visual inspection (for low-confidence matches)
5. Lineage reconstruction

---

## ASSETS REQUIRING MANUAL REVIEW

### HIGH PRIORITY (Uncertain Lineage)

1. **HOMESERVICEPROJECTPERGOLAS.jpg ↔ Feature-Fence-Photo.jpg**
   - Reason: 70% confidence, processed version
   - Action: Visual inspection required

2. **FLOOR.png ↔ HP006_ExteriorPainting_House_After.jpg**
   - Reason: 30% confidence, size similarity only
   - Action: Visual inspection required

3. **BATHROOM_WALL.png ↔ HP002_ExteriorPainting_House_After.jpg**
   - Reason: 30% confidence, size similarity only
   - Action: Visual inspection required

4. **FENCE BUILD.jpg ↔ HP009_DrywallRepair_After_Primed.jpg**
   - Reason: 30% confidence, size similarity only
   - Action: Visual inspection required

### MEDIUM PRIORITY (Orphan Assets)

5. **33F73891-D9B4-4836-A00B-C671D6E599FC.jpeg**
   - Reason: UUID-named, unknown provenance
   - Action: Origin investigation required

6. **IMG_5240.jpeg, IMG_5325.jpeg**
   - Reason: iPhone photos, unclassified
   - Action: Project association required

7. **paint.jpg**
   - Reason: Unclassified
   - Action: Content review required

---

## CONSTITUTIONAL RECOMMENDATIONS

### FUTURE INGESTION RULES

**1. Single Entry Point**
- All uploads through 📥 Incoming Uploads
- Automatic metadata generation
- UUID-based canonical naming
- SHA256 hash calculation

**2. Canonicalization First**
- EXIF preservation priority
- Original capture detection
- Highest resolution selection
- Earliest timestamp tiebreaker

**3. Constitutional Authority Stack**
- Every asset must follow constitutional layering
- Identity Authority → Hash Authority → Canonical Event Authority
- No shortcuts, no embedded logic
- Full verification chain

**4. Reference-Based Deployment**
- Website Library uses symlinks, not copies
- Generated variants reference canonical originals
- No duplicate storage by design
- Clear separation of concerns

**5. Metadata-Driven Versioning**
- Version history via JSON manifests
- No full file copies for versioning
- Transformation tracking
- Complete audit trail

---

## STATUS

**Phase 1: Evidence Discovery**: 75% COMPLETE
- ✅ Root level scripts and CSV files discovered
- ✅ H: drive analysis complete
- ✅ Repository structure mapped
- ✅ Preliminary canonical model built
- ⏳ C: drive scan (background subagent in progress)
- ⏳ PING folder analysis pending
- ⏳ OneDrive analysis pending

**Phase 2: Canonical Model**: 60% COMPLETE
- ✅ Evidence hierarchy established
- ✅ Duplicate analysis complete
- ✅ Derivation graph built
- ✅ Project mapping started
- ⏳ Complete cross-reference pending
- ⏳ Hash all assets pending
- ⏳ Final canonical determination pending

**Phase 3: Constitutional Implementation**: 20% COMPLETE
- ✅ Authority gap analysis complete
- ✅ Folder taxonomy designed
- ✅ Deduplication plan outlined
- ⏳ Missing authorities implementation pending
- ⏳ Migration plan execution pending

---

## SAFETY CONFIRMATION

**READ-ONLY ANALYSIS ONLY**
- ❌ NO files modified
- ❌ NO files deleted
- ❌ NO files renamed
- ❌ NO files moved
- ❌ NO Drive modifications

All analysis is forensic and constitutional. No changes will be executed without explicit approval and constitutional validation.
