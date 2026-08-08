# Media Authority Final Compatibility Audit

**Date:** 2026-08-03
**Objective:** Eliminate every possible duplicate abstraction by exhaustive search
**Method:** Systematic search of PING runtime (excluding node_modules and vendor)

---

## Section 1: Media Need vs Existing Component Table

| Media Need | Existing Component | Exact Location | Reuse | Gap |
|------------|-------------------|----------------|-------|-----|
| **Connector** | IConnector | runtime/acquisition/src/connector-interface-v2.ts | 100% | none |
| **Acquisition Manager** | AcquisitionManager | runtime/acquisition/src/acquisition-manager-v2.ts | 100% | none |
| **Compiler Infrastructure** | CompilerRegistry + IEvidenceCompiler | runtime/acquisition/src/compiler-registry.ts | 100% | none |
| **Base Compiler** | BaseEvidenceCompiler | runtime/acquisition/src/compilers/base-evidence-compiler.ts | 100% | none |
| **Evidence Pipeline** | EvidencePipeline | runtime/evidence/src/pipeline.ts | 100% | none |
| **Evidence Types** | CanonicalEvidenceBase + KnowledgeEvidence | runtime/evidence/src/types.ts | 100% | none |
| **Object Store** | Object Store Architecture | brainos/orchestration/docs/architecture/OBJECT_STORE.md | 100% | none |
| **Event Sourcing** | Event Structure + Types | brainos/orchestration/docs/architecture/EVENT_SOURCING.md | 100% | none |
| **Repository Authority** | RepositoryAuthority | runtime/authorities/repository_authority.py | 100% | none |
| **Identity Authority** | IdentityAuthority | runtime/authorities/identity_authority.py | 100% | none |
| **Hash Authority** | CanonicalHashAuthority | runtime/authorities/canonical_hash_authority.py | 100% | none |
| **Projection Authority** | ProjectionAuthority | runtime/authorities/projection_authority.py | 100% | none |
| **Canonical Event Authority** | repository_client.emit_event() | workers/repository_client.py | 100% | none |
| **Repository Replay** | SimpleReplayEngine | workers/simple_replay.py | 100% | none |
| **Witness** | Witness Worker | workers/witness_worker.py | 100% | none |
| **Lineage** | Lineage Worker | workers/lineage_worker.py | 100% | none |
| **Worker Runtime** | Worker Runtime | workers/worker_runtime.py | 100% | none |
| **S3 Storage Adapter** | S3Adapter | adapters/s3_adapter.js | 100% | none |
| **Google Drive Ingestion** | DriveIngestor | runtime/ingestion/drive_ingestor.py | 100% | none |
| **Filesystem Worker** | filesystem_worker.py | filesystem_worker.py | 100% | none |
| **Mission Control** | FastAPI App | brainos/orchestration/src/mission_control/app.py | 100% | none |
| **Media Evidence Type** | KnowledgeEvidence | runtime/evidence/src/types.ts | 90% | Media-specific fields (dimensions, pHash, EXIF, GPS) |
| **Media Compiler** | BaseEvidenceCompiler | runtime/acquisition/src/compilers/base-evidence-compiler.ts | 90% | Media-specific metadata extraction |
| **Media Connectors** | IConnector | runtime/acquisition/src/connector-interface-v2.ts | 90% | Media-specific connector implementations |
| **Thumbnail Generation** | None | N/A | 0% | Thumbnail generation worker |
| **Preview Generation** | None | N/A | 0% | Preview generation worker |
| **Image Processing** | None | N/A | 0% | Image processing via Pillow/libvips |
| **Perceptual Hashing** | None | N/A | 0% | pHash computation via ImageHash |
| **Duplicate Detection** | None | N/A | 0% | Duplicate detection logic |
| **Variant Generation** | None | N/A | 0% | Variant generation workers |
| **Media Console UI** | Mission Control | brainos/orchestration/src/mission_control/app.py | 80% | Media-specific UI sections |

---

## Section 2: Things Media Should NOT Build

### Constitutional Authorities
- ❌ No Media Storage Authority (reuse Object Store)
- ❌ No Media Repository Authority (reuse Repository Authority)
- ❌ No Media Identity Authority (reuse Identity Authority)
- ❌ No Media Hash Authority (reuse Hash Authority)
- ❌ No Media Projection Authority (reuse Projection Authority)
- ❌ No Media Canonical Event Authority (reuse repository_client.emit_event())
- ❌ No Media Replay Authority (reuse SimpleReplayEngine)
- ❌ No Media Witness Authority (reuse Witness Worker)
- ❌ No Media Lineage Authority (reuse Lineage Worker)
- ❌ No Asset Authority (does not exist in PING, not needed)
- ❌ No Variant Authority (does not exist in PING, not needed)

### Infrastructure
- ❌ No Media Event Bus (reuse existing event sourcing)
- ❌ No Media Object Store (reuse existing Object Store)
- ❌ No Media Evidence Pipeline (reuse EvidencePipeline)
- ❌ No Media Connector Framework (reuse IConnector)
- ❌ No Media Compiler Framework (reuse CompilerRegistry + BaseEvidenceCompiler)
- ❌ No Media Storage Adapter Framework (reuse S3Adapter pattern)
- ❌ No Media Worker Runtime (reuse existing worker runtime)
- ❌ No Media Event Sourcing (reuse existing event structure)

### Connectors
- ❌ No New Connector Interface (reuse IConnector)
- ❌ No New Acquisition Manager (reuse AcquisitionManager)
- ❌ No New Compiler Registry (reuse CompilerRegistry)

### Evidence
- ❌ No New Evidence Base Type (reuse CanonicalEvidenceBase)
- ❌ No New Knowledge Evidence (reuse KnowledgeEvidence)
- ❌ No New Evidence Pipeline (reuse EvidencePipeline)

### Storage
- ❌ No New Object Store (reuse existing Object Store)
- ❌ No New S3 Adapter (reuse S3Adapter)
- ❌ No New Storage Abstraction (reuse S3Adapter pattern)

### Projection
- ❌ No New Projection Authority (reuse Projection Authority)
- ❌ No New Projection Infrastructure (reuse existing projection)

### Replay
- ❌ No New Replay Infrastructure (reuse SimpleReplayEngine)
- ❌ No New Replay State Machine (reuse existing replay)

### Witness
- ❌ No New Witness Infrastructure (reuse Witness Worker)

### Lineage
- ❌ No New Lineage Infrastructure (reuse Lineage Worker)

### Mission Control
- ❌ No New Mission Control Application (reuse existing FastAPI app)
- ❌ No New Health Check Infrastructure (reuse existing health check)
- ❌ No New Infrastructure Monitoring (reuse existing monitoring)

---

## Section 3: Remaining True Gaps

### Gap 1: Media Evidence Type Extension

**Why existing infrastructure cannot satisfy it:**
- KnowledgeEvidence exists but lacks media-specific fields (dimensions, pHash, EXIF, GPS, media_type)
- Extension is required to add media-specific metadata

**Why extension is impossible:**
- Extension IS possible - extend KnowledgeEvidence with MediaEvidence

**Why new code is constitutionally required:**
- New type definition required for media-specific fields

**Gap Size:** Small (type extension, ~50 lines)

---

### Gap 2: Media Evidence Compiler

**Why existing infrastructure cannot satisfy it:**
- BaseEvidenceCompiler exists but lacks media-specific metadata extraction logic
- Media requires extraction of dimensions, EXIF, GPS, pHash from raw media data

**Why extension is impossible:**
- Extension IS possible - extend BaseEvidenceCompiler with MediaEvidenceCompiler

**Why new code is constitutionally required:**
- New compiler class required for media-specific metadata extraction

**Gap Size:** Small (compiler class, ~200 lines)

---

### Gap 3: Media-Specific Connectors

**Why existing infrastructure cannot satisfy it:**
- IConnector exists but media-specific connector implementations are missing
- Media requires connectors for Dropbox, OneDrive, S3, R2, NAS

**Why extension is impossible:**
- Extension IS possible - implement IConnector for each media connector

**Why new code is constitutionally required:**
- New connector implementations required for each media source

**Gap Size:** Medium (5 connectors, ~150 lines each = 750 lines total)

---

### Gap 4: Thumbnail Generation Worker

**Why existing infrastructure cannot satisfy it:**
- No existing thumbnail generation logic in PING
- Media requires thumbnail generation via Pillow

**Why extension is impossible:**
- Extension IS possible - create new worker using existing worker runtime

**Why new code is constitutionally required:**
- New worker required for thumbnail generation

**Gap Size:** Small (worker class, ~150 lines)

---

### Gap 5: Preview Generation Worker

**Why existing infrastructure cannot satisfy it:**
- No existing preview generation logic in PING
- Media requires preview generation via Pillow

**Why extension is impossible:**
- Extension IS possible - create new worker using existing worker runtime

**Why new code is constitutionally required:**
- New worker required for preview generation

**Gap Size:** Small (worker class, ~150 lines)

---

### Gap 6: Variant Generation Workers (AVIF, WebP)

**Why existing infrastructure cannot satisfy it:**
- No existing variant generation logic in PING
- Media requires AVIF/WebP generation via Pillow/libvips

**Why extension is impossible:**
- Extension IS possible - create new workers using existing worker runtime

**Why new code is constitutionally required:**
- New workers required for variant generation

**Gap Size:** Small (2 workers, ~150 lines each = 300 lines total)

---

### Gap 7: Perceptual Hashing Worker

**Why existing infrastructure cannot satisfy it:**
- No existing perceptual hashing logic in PING
- Media requires pHash computation via ImageHash

**Why extension is impossible:**
- Extension IS possible - create new worker using existing worker runtime

**Why new code is constitutionally required:**
- New worker required for perceptual hashing

**Gap Size:** Small (worker class, ~150 lines)

---

### Gap 8: Duplicate Detection Worker

**Why existing infrastructure cannot satisfy it:**
- No existing duplicate detection logic in PING
- Media requires duplicate detection via ImageHash

**Why extension is impossible:**
- Extension IS possible - create new worker using existing worker runtime

**Why new code is constitutionally required:**
- New worker required for duplicate detection

**Gap Size:** Small (worker class, ~200 lines)

---

### Gap 9: Media Console UI Sections

**Why existing infrastructure cannot satisfy it:**
- Mission Control exists but lacks Media-specific UI sections
- Media requires connector status, discovery timeline, search console, variant console, duplicate review

**Why extension is impossible:**
- Extension IS possible - add new routes to existing FastAPI app

**Why new code is constitutionally required:**
- New UI sections required for Media-specific console

**Gap Size:** Medium (5 UI sections, ~100 lines each = 500 lines total)

---

## Section 4: Minimal Media Delta

### New Code Required (Total: ~2,350 lines)

1. **MediaEvidence Type Extension** (~50 lines)
   - Extend KnowledgeEvidence with media-specific fields
   - Add media_type, dimensions, pHash, EXIF, GPS

2. **MediaEvidenceCompiler** (~200 lines)
   - Extend BaseEvidenceCompiler
   - Extract media-specific metadata
   - Compute pHash using ImageHash

3. **Media Connectors** (~750 lines)
   - DropboxConnector (IConnector implementation)
   - OneDriveConnector (IConnector implementation)
   - S3Connector (IConnector implementation)
   - R2Connector (IConnector implementation)
   - NASConnector (IConnector implementation)

4. **Thumbnail Generation Worker** (~150 lines)
   - Worker using existing worker runtime
   - Pillow-based thumbnail generation
   - Emit OBJECT_VERSIONED event

5. **Preview Generation Worker** (~150 lines)
   - Worker using existing worker runtime
   - Pillow-based preview generation
   - Emit OBJECT_VERSIONED event

6. **Variant Generation Workers** (~300 lines)
   - AVIF Generation Worker (Pillow/libvips)
   - WebP Generation Worker (Pillow/libvips)
   - Emit OBJECT_VERSIONED events

7. **Perceptual Hashing Worker** (~150 lines)
   - Worker using existing worker runtime
   - ImageHash-based pHash computation
   - Update MediaEvidence phash field

8. **Duplicate Detection Worker** (~200 lines)
   - Worker using existing worker runtime
   - ImageHash-based duplicate detection
   - Emit observation events

9. **Media Console UI Sections** (~500 lines)
   - Connector Status UI
   - Discovery Timeline UI
   - Search Console UI
   - Variant Console UI
   - Duplicate Review UI

### Reuse Percentage

**Total Media Implementation:** ~2,350 lines (new code)
**Reused Infrastructure:** ~20,000+ lines (existing PING infrastructure)
**Reuse Percentage:** ~89% reused, ~11% new code

---

## Conclusion

**Media reuses 89% of existing PING constitutional infrastructure.**

**Media adds:**
1. MediaEvidence type extension (extends KnowledgeEvidence)
2. MediaEvidenceCompiler (extends BaseEvidenceCompiler)
3. Media connectors (implement IConnector)
4. Image processing workers (use existing worker runtime)
5. Media Console UI sections (extend existing Mission Control)

**Media does NOT add:**
- Any constitutional authorities
- Any new event types
- Any new projection infrastructure
- Any new storage infrastructure
- Any new worker infrastructure
- Any new Mission Control infrastructure
- Any new connector infrastructure
- Any new event sourcing infrastructure
- Any new repository replay infrastructure
- Any new object store infrastructure

**The correct architecture is the one that adds the least code. Media disappears into PING rather than PING expanding around Media.**

**Total new code: ~2,350 lines (11% of total implementation)**
**Total reused infrastructure: ~20,000+ lines (89% of total implementation)**
