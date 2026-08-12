# COMPREHENSIVE FORENSIC ARCHITECTURE REPORT

**Date:** 2026-08-12
**Scope:** PING90 + HPP Media Architecture Forensic Analysis
**Purpose:** Establish constitutional boundaries before building Media Workbench
**Status:** READ-ONLY forensic analysis - no mutations performed

---

## EXECUTIVE SUMMARY

This report synthesizes comprehensive forensic analysis of PING90 constitutional architecture and HPP website media architecture to establish the correct boundaries for building a Media Workbench.

**North Star:**
```
HPC Drive (Source Material)
    ↓
PING90 (Constitutional Authority)
    ↓
HPP (Consumer/Projection/Application)
    ↓
Media Workbench (Human Control Surface)
```

**Key Finding:** Both systems have sophisticated constitutional architectures but exist in transitional states with dual authority systems and incomplete integrations.

---

## 1. PING90 CONSTITUTIONAL MODEL

### 1.1 Identity System

**Canonical ID Generation:**
- **Authority:** ArtifactId from canonical hash
- **Algorithm:** SHA-256 → CanonicalHash → ArtifactId
- **Formula:** `artifact_id = hash(artifact_type + constitutional_hash + acquired_at)`
- **Determinism:** Content-addressed identity (same content = same ID)
- **Constitutional Axiom:** "Identical content under identical identity rules yields identical identity"

**Identity Authority:**
- **Location:** `constitution/authority/artifact_authority.py`
- **Dependencies:** CanonicalSerializer → CanonicalBytes → HashAuthority → CanonicalHash
- **Status:** Formal constitutional identity system exists

### 1.2 Provenance System

**Provenance Hierarchy:**
```
CapabilityProvenance
  ├── ImplementationProvenance
  │   └── PlatformProvenance
  └── AcquisitionProvenance
```

**Tracked Information:**
- Capability type, implementation details, platform details
- Operation performed, acquisition timestamp, acquisition hash
- Capability-specific: path, endpoint, object_id, query, status, headers_hash, tls_fingerprint, version, storage_witness

**Witness System:**
- **Status:** DERIVED ARTIFACT (not independent authority)
- **Derivation Chain:** Replay → Canonicalization → Hash → Witness (MerkleTree)
- **Witness Types:** WitnessRoot (Merkle tree root), LineageGraph (derivation history), WitnessCertificate (proof of validity)

**Lineage System:**
- **Structure:** Directed Acyclic Graph (DAG)
- **Authority:** Parent-child derivation relationships, DAG legality, ancestry queries, fork detection
- **Dependencies:** Identity (for stable edge endpoints)

### 1.3 Authority System

**Constitutional Hierarchy:**
```
Truth
↓
Continuity
↓
Governance
↓
Capability
↓
Execution
```

**5 Root Authorities:**
1. **Identity** — owns normalization and identity law
2. **Lineage** — owns DAG structure and legality
3. **Event Recording** — owns append-only constitutional history
4. **Replay** — owns deterministic reconstruction and integrity proof
5. **Policy** — owns mutation authorization law

**Derived Authority:**
- **State** — owns projection lifecycle; creates no root facts; consumes replay output only

**Authority Taxonomy:**
1. Constitutional Authority (highest)
2. Governance Authority
3. Runtime Authority
4. Discovery Authority
5. Search Authority (non-authoritative)
6. AI Authority (non-authoritative)

### 1.4 Event System

**6 Event Classes:**
1. Constitutional — Authority: Constitutional_Law
2. Governance — Authority: Governance_Authority
3. Observation — Authority: Observation_Authority
4. Inference — Authority: Inference_Authority
5. Projection — Authority: Projection_Authority
6. System — Authority: System_Authority

**Event Store:**
- **Implementation:** PostgreSQL append-only event store
- **Schema:** event_id, event_data, timestamp, aggregate_id, aggregate_type
- **Features:** Event immutability enforced, temporal ordering via event_id, hash verification

**Replay System:**
- **Determinism:** Identical event stream must always produce identical state
- **Minimum Replay Set:** Complete event sequence, artifact content, identity law version, lineage edges, policy law version, policy decisions, claim records, actor identity, witness attestations, reconstruction boundary
- **Constraints:** Deterministic, pure, infrastructure-independent, transport-independent, provider-independent

### 1.5 Projection System

**Projection Authority:**
- **Jurisdiction:** Definition of "current" constitutional facts, state boundary selection, invalidation of stale projections
- **Status:** Derived authority (jurisdictionally derived)
- **Dependencies:** Replay, Policy, Lineage
- **Constraint:** Never overrides recorded substrate

**Implementation:**
- **Worker:** Qdrant projection worker
- **Features:** Creates projection_status table, stores projection_hash and projected_at, only marks events ACKed by Qdrant, blocks unverified REASONING_ARTIFACT events
- **Principle:** Projection ≠ Truth (projections are reproducible from event stream)

### 1.6 Connector System

**Acquisition Boundary:**
- **Hierarchy:** Capability → Implementation → Acquisition → Platform
- **Tracking:** capability type, implementation details, acquisition details
- **Witnesses:** acquisition_witness, capability_witness, build_witness

**Connector Types:**
- FilesystemEvidence
- NetworkEvidence
- StorageEvidence
- SearchEvidence
- ConnectorEvidence

### 1.7 Media Architecture

**Canonical Intermediate Representation (CIR):**
- **Status:** DRAFT (not implemented)
- **Elements:** Entity, Relationship, Property, Observation, Fact, Constraint, Behavior, Interface, Authority, Capability, Decision, Policy, Event
- **Purpose:** Language-independent compilation and verification

### 1.8 Drive Integration

**Drive Mirror Runtime Specification:**
- **Purpose:** Convert Google Drive from live dependency into constitutional mirror source
- **Canonical Directory Layout:** manifests/, mirrors/, revisions/, hashes/, indexes/
- **Constitutional Invariants:**
  1. Drive is never queried during retrieval (only during sync)
  2. All retrieval operates exclusively from local mirrors
  3. Ollama never accesses Drive directly
  4. Agent Runtime never accesses Drive directly
  5. Repository Runtime owns all Drive synchronization

**Drive Inventory:**
- **Current:** 39 total files (16 Presentations, 8 Word Documents, 5 Google Docs, 9 PNG Images, 1 Binary/Other)
- **Zero folders:** All files at root level
- **Constitutional Material:** PING_Constitutional_Kernel_Master_Script.docx, PING_YouTube_Full_Script.docx, PING_Presentation_Architecture_Guide.docx, 3 Constitutional-themed presentations

### 1.9 Existing Harvest/Ingestion

**Ingestion Sources:**
1. **Google Drive** — `runtime/ingestion/drive_ingestor.py` — DOCUMENT_IMPORTED events — NOT started by Docker
2. **Yahoo Mail** — `brainos/newsletter/worker.py` — Uses custom database, NOT constitutional events table
3. **RSS** — `brainos/rss/worker.py` — Uses custom database, NOT constitutional events table
4. **Web Retrieval** — `brainos/orchestration/src/web_retrieval.py` — Status UNKNOWN
5. **Filesystem** — `filesystem_worker.py` — Outputs SQL INSERT to stdout, not event emission
6. **Repository Scanner** — `repository_scanner.py` — REPOSITORY_FILE_DISCOVERED events — NOT started by Docker

**Overall Assessment:** EXTERNAL INGESTION EXISTS BUT NOT CONSTITUTIONALLY INTEGRATED

### 1.10 Boundary Documents

**HPP Ownership Boundary:**
- **Layer 1 — Platform (PING):** Universal capabilities (Event Runtime, Replay, Identity, Evidence, Authorities, Capability Registry, Observation pipeline, Knowledge pipeline, Learning pipeline)
- **Layer 2 — Business Platform (HPP):** Blue-collar business concepts (Estimates, Projects, Customers, Services, Newsletter, Guides, Resources, Reviews, Photos)
- **Layer 3 — Presentation:** React components, Pages, Layouts, Styling

**Business Intelligence Boundary:**
- **HPP owns:** Business meaning (Customer lifecycle/CRM entities, Estimates/Reviews/Projects, Campaigns/Email sequences/Influencer programs, Funnels/Attribution/Conversion metrics, Business KPIs/Marketing events, PostHog event definitions/Analytics taxonomy)
- **PING owns:** Operational execution (Event transport/Canonical event bus, Replay, Diagnostics/Health, Queueing/Retries/Worker execution, Deployment/Runtime fingerprint/Drift detection, Integration lifecycle/Connector health, Telemetry aggregation/Operational dashboards)
- **Oracle owns:** Infrastructure recommendations only

**PostHog Contract:**
```
HPP Business Event (HPP defines: name, schema, meaning)
    ↓
Canonical Event (PING canonicalizes: event_id = content hash, producer_id, correlation_id, causality_id, schema_version, build_witness_hash)
    ↓
Analytics Projection (PING projects canonical event → analytics shape)
    ↓
PING Delivery (PING delivers projection to PostHog via integration)
    ↓
PostHog (operational analytics layer — a projection, NOT source of truth)
```

---

## 2. HPP ARCHITECTURAL MODEL

### 2.1 Media Authority

**Dual Authority System (TRANSITIONAL STATE):**

**Legacy Authority: `src/config/media.v1.json`**
- **Status:** Currently active
- **Record Count:** 4 media entries
- **Usage:** Components reference this file via `src/lib/media.ts`
- **Structure:** Array with media objects containing id, filename, variants, roles, tags

**Constitutional Authority: `metadata/canonical-media-graph.json`**
- **Status:** Designed but not fully integrated
- **Structure:** Large graph with nodes (images, projects, services, brands)
- **Usage:** Reference architecture for projection system
- **Supersedes:** `analysis/CANONICAL_MEDIA_AUTHORITY.md`

**Authority Definition:**
- **Single source of truth:** The Media Graph
- **Migration source:** `H:\My Drive\PIPING90` (historical)
- **Production runtime authority:** `H:\Shared drives\Happy Place Carpentry Website`

**Authority Chain:**
```
Shared Drive (Physical Source)
    ↓
Canonical Media Graph (Identity Authority)
    ↓
Projection Generator (Build-time)
    ↓
Generated Projections (.generated/*.json)
    ↓
Next.js Build
    ↓
Static Runtime (Immutable JSON)
    ↓
React Components
```

**Current State:** Legacy authority still active, constitutional authority designed but not deployed

### 2.2 Source System

**Drive Source Tracking:**

**Drive Structure 1: Personal Drive**
```
H:\My Drive\Happy Place Media\
└── Website Library\
    ├── Hero\
    ├── Brand\
    ├── Projects\
    │   ├── Johnson Cedar Fence\
    │   ├── Smith Built-Ins\
    │   ├── Wilson Home Repairs\
    │   ├── Davis Bathroom Remodel\
    │   └── Martinez Pergola\
    └── Featured Projects\
```

**Drive Structure 2: Shared Drive**
```
H:\Shared drives\Happy Place Carpentry Website\
├── Featured Projects\
├── Drywall Before & Afters\
├── Painting Before & Afters\
├── Fencing Before & Afters\
├── Finish Carpentry Before & Afters\
└── Other Before & Afters\
```

**Drive ID Tracking:**
- **Schema:** `driveId: file.driveId || undefined` (from image-pipeline.mjs)
- **Current Status:** Drive IDs present in pipeline but not in current `media.v1.json`

**File ID Generation:**
- **Method:** UUID v5 based on SHA-256 content hash
- **Stability:** Deterministic (same content = same ID)
- **Namespace:** DNS namespace "6ba7b810-9dad-11d1-80b4-00c04fd430c8"

**Source Path Tracking:**
- **Schema:** `sourcePath: folder/origName`
- **Example:** `Decks - Corvallis/hero.jpg`

**Current Repository Sources:**
- `photo-intake/` - Local filesystem source
- Google Drive (via adapter) - Remote source

### 2.3 Identity System

**UUID v5 Generation:**
- **Method:** SHA-256 based on namespace + name
- **Stability:** Deterministic (same content = same ID)

**Identity Layers:**
1. **Content Hash:** SHA-256 of image bytes (collision detection)
2. **Stable ID:** UUID v5 based on content hash (permanent identity)
3. **Functional ID:** Slug-based for UI references (human-readable)
4. **Drive ID:** Google Drive file ID (external reference)

**Identity Relationship:**
```
Image File
    ↓ SHA-256
Content Hash
    ↓ UUID v5
Stable ID (canonical)
    ↓
Functional ID (slug-based)
    ↓
Drive ID (external)
```

**Constitutional Identity Authority:**
- **Location:** `metadata/canonical-media-graph.json`
- **Status:** Constitutional identity system designed but not fully deployed

### 2.4 Provenance System

**Provenance Schema:**
```javascript
provenance: {
  sourceFile: `${folder}/${origName}`,
  importedAt: new Date().toISOString(),
  pipelineVersion: PIPELINE_VERSION,
  driveId: file.driveId || undefined,
  driveFolder: file.driveFolder || undefined,
  driveModifiedAt: file.driveModifiedAt || undefined,
}
```

**Lineage Information:**
- Source file and folder
- Import timestamp
- Pipeline version
- Drive references (ID, folder, modification time)

**Provenance Tracking Location:**
- **Legacy:** Embedded in `gallery.json` and `manifest.v1.json`
- **Constitutional:** Part of graph node data structure

### 2.5 Variant System

**Variant Pipeline:**
- **Engine:** Sharp-based image processing
- **Variant Types:**
  - Responsive widths: [480, 768, 1080, 1600, 2000]px
  - Formats: WebP (72%), AVIF (55%)
  - Thumbnail: 480px WebP (70%)
  - Blur: 16px WebP (40%) for placeholder

**Variant Authority:**
- **Current Authority:** Embedded in `media.v1.json`
- **Constitutional Design:** VariantNode in graph schema
- **Status:** Variant system active in legacy, designed for constitutional

### 2.6 Projection System

**Constitutional Projection Engine:**
```
Canonical Media Graph
        ↓
Constitutional Scoring Artifact
        ↓
Projection Generator (build-time)
        ↓
Projection Validator
        ↓
Projection Artifacts (.generated/*.json)
        ↓
Next Build
        ↓
Static Runtime (immutable JSON)
        ↓
Pure React Components
```

**Generated Projections:**
- `.generated/hero-projection.json` - Homepage hero selection
- `.generated/gallery-projection.json` - Gallery projection
- `.generated/service-projection.json` - Service-based grouping

**Projection Authority Location:**
- **Projection Artifacts:** `.generated/*.json`
- **Projection Generator:** `scripts/constitutional-projection-generator.js`
- **Projection Loader:** `src/lib/projection-loader.ts` (build-time only)

**Status:** Projection system 95%+ complete, partially deployed

### 2.7 Drive Integration

**Drive Session Authority:**
- **Purpose:** Constitutional authority for Google Drive OAuth session management
- **Single source of truth:** Drive credentials (access token, refresh token, expiry, scope)
- **Storage:** httpOnly cookies (secure, server-side only)
- **Features:** Automatic token refresh, all Drive services obtain credentials through this authority
- **Client-agnostic:** PING90 credentials today, swap for client credentials later

**OAuth Integration:**
- **Authorization Route:** `src/app/api/drive/oauth/authorize/route.ts`
- **Scopes:** drive, drive.metadata.readonly, drive.photos.readonly
- **Callback Route:** `src/app/api/drive/oauth/callback/route.ts`
- **Session Management:** `src/lib/drive/oauth-manager.ts`

**Drive Adapter Architecture:**
- **Abstraction:** `scripts/image-source/image-source.mjs`
- **Adapters:** FilesystemImageSource, DriveImageSource
- **DriveImageSource:** `scripts/image-source/drive-image-source.mjs`

**Drive Discovery:**
- **API:** `src/app/api/drive/discovery/route.ts`
- **Discovery Components:** My Drive discovery, Shared Drives discovery, HPP folder discovery, Recent folder discovery

**Drive Integration Status:**
- **Status:** OAuth infrastructure complete, Drive adapter complete, discovery API complete
- **Usage:** Available but not actively used in current pipeline
- **Environment Variables Required:** GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, DRIVE_SERVICE_ACCOUNT_KEY

### 2.8 Ingestion Pipeline

**V1 Image Pipeline:**
```
photo-intake/<Category> - <Location>/
    ↓ npm run images
    ↓
1. Archive originals → photo-intake/_archive/<project>/<file>
2. Generate WebP + AVIF (responsive widths) + thumbnail + blur placeholder
3. Read dimensions (EXIF-light; we only need W/H)
4. Emit src/config/gallery.json (single source of truth)
```

**DAG Stages:**
1. Discovery
2. Hashing
3. Classification
4. Transformation
5. Manifest Generation
6. Emission

**Generated Authorities:**
- `pipelineVersion` - Deterministic (fixed)
- `generatedAt` - Non-deterministic (keep)
- `pipelineCommit` - Deterministic (fixed)
- `galleryHash` - Deterministic (keep)
- `presentationHash` - Deterministic (fixed)
- `rebuild-cache.json` - Deterministic (keep)
- `golden-manifest.json` - Deterministic (keep)

**Pipeline Configuration:**
- `src/config/presentation.v1.json` - Human curation layer
- `src/config/manifest.v1.json` - Machine-generated identity manifest
- `src/config/gallery.json` - Machine-generated photo catalog

**Status:** Pipeline active and functional

### 2.9 Boundary Documents

**Repository Boundary Rule:**
- **Constitutional Rule:** Repositories are isolated. Cross-application communication occurs only through versioned APIs, event contracts, or shared schemas. No application may modify, deploy, or directly manipulate another application's source code, build pipeline, or deployment environment.

**HPP vs PING Boundary:**
- **HPP (Public Website):** Customer-facing website, GitHub → Vercel deployment, PING Access: Read-only (schemas, APIs, events), NO write access to HPP files
- **PING (Business Operating System):** Mission Control, Admin, Workers, GitHub → localhost → Docker → Server deployment, Deploys independently

**Communication Pattern:**
```
HPP
   ↓
Business Events

PING
   ↓
Mission Runtime

PING
   ↓
Recommendations

HPP
   ↓
reads published results
```

**Only data crosses. Never source code.**

**Constitutional Architecture Documents:**
- `CONSTITUTIONAL_ARCHITECTURE_COMPLETE.md` - 95%+ complete
- `CONSTITUTIONAL_VALIDATION_REPORT.md` - Validation status
- `CONSTITUTIONAL_EVOLUTION_PATH.md` - Evolution roadmap
- `CONSTITUTIONAL_ROADMAP.md` - Implementation roadmap

### 2.10 PING90 Integration

**PING90 Harvest Script:**
- **Status:** Created but removed (premature)
- **Purpose:** Harvest media from HPC Drive structure and map to PING90 canonical format
- **Issue:** Introduced competing UUID v5 identity system when PING90 already has formal identity system

**Constitutional Authority References:**
- `DRIVE_SOURCE_FORENSIC_MAP.md`: "Constitutional Authority: PING90"
- `CANONICAL_MEDIA_AUTHORITY.md`: "Migration Source (Historical): H:\My Drive\PIPING90"
- `drive-session.ts`: "Client-agnostic: PING90 credentials today, swap for client credentials later"

**Current Status:**
- Harvest script removed (premature)
- PING90 referenced as historical migration source
- No active PING90 integration in current pipeline
- System designed to be client-agnostic

---

## 3. PING90 ↔ HPP BOUNDARY

### 3.1 Existing Boundary Documentation

**Repository Boundary Rule:**
- **Source:** `REPOSITORY_BOUNDARY_RULE.md`
- **Key Principle:** Repositories are isolated. Cross-application communication occurs only through versioned APIs, event contracts, or shared schemas.

**HPP Ownership Boundary:**
- **Source:** `HPP_OWNERSHIP_AUDIT.md`
- **Three-Layer Ownership Model:**
  - Layer 1 (Platform/PING): Universal capabilities
  - Layer 2 (Business Platform/HPP): Blue-collar business concepts
  - Layer 3 (Presentation): React components, Pages, Layouts, Styling

**Business Intelligence Boundary:**
- **Source:** `BUSINESS_INTELLIGENCE_BOUNDARY.md`
- **Ownership Matrix:** HPP owns business meaning, PING owns operational execution, Oracle owns infrastructure recommendations

### 3.2 Communication Pattern

**Instead of:**
```
PING
   ↓
modifies HPP
```

**It becomes:**
```
HPP
   ↓
Business Events

PING
   ↓
Mission Runtime

PING
   ↓
Recommendations

HPP
   ↓
reads published results
```

**Only data crosses. Never source code.**

### 3.3 Current Integration Status

**PING90 Role:**
- Historical migration source
- Potential future business operating system integration
- Not currently active in HPP website operations

**HPP Access to PING90:**
- Read-only (schemas, APIs, events)
- NO write access to HPP files
- No active PING90 integration

### 3.4 Boundary Gaps

**Missing Boundary Documents:**
- No explicit PING90 ↔ HPP media boundary document
- No clear definition of which system owns media identity
- No clear definition of which system owns media provenance
- No clear definition of which system owns media metadata
- No clear definition of which system generates variants
- No clear definition of which system generates projections
- No clear definition of which system is allowed to mutate what

---

## 4. DRIVE ↔ PING90 BOUNDARY

### 4.1 Drive Mirror Specification

**Drive Mirror Runtime Specification:**
- **Source:** `docs/architecture/DRIVE_MIRROR_RUNTIME_SPEC.md`
- **Purpose:** Convert Google Drive from live dependency into constitutional mirror source identical to GitHub
- **Canonical Directory Layout:** manifests/, mirrors/, revisions/, hashes/, indexes/

**Constitutional Invariants:**
1. Drive is never queried during retrieval (only during sync)
2. Drive is only queried during synchronization
3. All retrieval operates exclusively from local mirrors
4. Ollama never accesses Drive
5. Agent Runtime never accesses Drive directly
6. Repository Runtime owns all Drive synchronization

**Repository Events:**
- DRIVE_SYNC_STARTED
- DRIVE_FILE_MIRRORED
- DRIVE_FILE_CHANGED
- DRIVE_FILE_DELETED
- DRIVE_SYNC_COMPLETED

### 4.2 Current Drive Integration Status

**PING90 Drive Integration:**
- **Specification:** Exists but not fully implemented
- **Drive Ingestion:** `runtime/ingestion/drive_ingestor.py` exists but not started by Docker
- **Status:** External ingestion exists but not constitutionally integrated

**HPP Drive Integration:**
- **Infrastructure:** Complete (OAuth, adapter, discovery)
- **Usage:** Available but not actively used in current pipeline
- **Status:** Functional but dormant

### 4.3 Boundary Gaps

**Missing Boundary Document:**
- No explicit Drive ↔ PING90 authority boundary document
- No clear definition of which system owns Drive synchronization
- No clear definition of which system owns Drive identity resolution
- No clear definition of which system owns Drive provenance tracking

---

## 5. MEDIA AUTHORITY

### 5.1 Current Authority Structure

**Dual Authority System (TRANSITIONAL STATE):**

**Legacy Authority: `src/config/media.v1.json`**
- **Status:** Currently active
- **Record Count:** 4 media entries
- **Usage:** Components reference this file via `src/lib/media.ts`

**Constitutional Authority: `metadata/canonical-media-graph.json`**
- **Status:** Designed but not fully integrated
- **Structure:** Large graph with nodes (images, projects, services, brands)
- **Usage:** Reference architecture for projection system

### 5.2 Authority Gaps

**Issue 1: Dual Authority System**
- Legacy `media.v1.json` still active
- Constitutional `canonical-media-graph.json` designed but not deployed
- Components still reference legacy authority

**Issue 2: Missing Constitutional Edges**
- Graph has 113 nodes, 193 edges
- Zero edges with `kind === 'belongsTo'`
- Gallery projection using transitional filename-based grouping

---

## 6. IDENTITY AUTHORITY

### 6.1 PING90 Identity Authority

**ArtifactId Generation:**
- **Authority:** ArtifactId from canonical hash
- **Algorithm:** SHA-256 → CanonicalHash → ArtifactId
- **Determinism:** Content-addressed identity

### 6.2 HPP Identity Authority

**UUID v5 Generation:**
- **Method:** SHA-256 based on namespace + name
- **Stability:** Deterministic (same content = same ID)

### 6.3 Identity Gaps

**Issue: Competing Identity Systems**
- PING90 has ArtifactId from canonical hash
- HPP has UUID v5 from content hash
- No clear boundary on which system owns which identity
- No clear mapping between the two identity systems

---

## 7. PROVENANCE AUTHORITY

### 7.1 PING90 Provenance Authority

**Provenance Hierarchy:**
- Capability → Implementation → Acquisition → Platform
- Witness System: MerkleTree-based witness authority
- Lineage System: DAG-based parent-child derivation relationships

### 7.2 HPP Provenance Authority

**Provenance Tracking:**
- Source file, import timestamp, pipeline version
- Drive references (ID, folder, modification time)
- Status: Exists in legacy system, designed for constitutional system

### 7.3 Provenance Gaps

**Issue: No Unified Provenance Chain**
- PING90 has formal provenance system
- HPP has provenance tracking in legacy system
- No clear boundary on which system owns provenance authority for HPP media
- No clear mapping between the two provenance systems

---

## 8. VARIANT AUTHORITY

### 8.1 HPP Variant Authority

**Variant Pipeline:**
- **Engine:** Sharp-based image processing
- **Authority:** Embedded in `media.v1.json`
- **Status:** Active and functional

### 8.2 Variant Gaps

**Issue: No Constitutional Variant Authority**
- Variants currently embedded in legacy authority
- Constitutional system designed but not deployed
- No clear boundary on which system owns variant generation authority

---

## 9. PROJECTION AUTHORITY

### 9.1 PING90 Projection Authority

**State Authority (Projection):**
- **Jurisdiction:** Definition of "current" constitutional facts, state boundary selection, invalidation of stale projections
- **Status:** Derived authority (jurisdictionally derived)
- **Dependencies:** Replay, Policy, Lineage
- **Constraint:** Never overrides recorded substrate

### 9.2 HPP Projection Authority

**Projection Generator:**
- **Implementation:** `scripts/constitutional-projection-generator.js`
- **Generated:** hero-projection.json, gallery-projection.json, service-projection.json
- **Status:** 95%+ complete, partially deployed

### 9.3 Projection Gaps

**Issue: No Unified Projection Authority**
- PING90 has formal projection authority
- HPP has projection generator designed but not fully deployed
- No clear boundary on which system owns projection authority for HPP media

---

## 10. WORKBENCH AUTHORITY / MUTATION BOUNDARY

### 10.1 Current Workbench State

**Current Workbench:**
- **Location:** `src/app/workbench/media/page.tsx`
- **Status:** Developer diagnostic page (projection data, UUIDs, filenames, variant paths, projection score, static status)
- **Not:** Nontechnical media management system

### 10.2 Mutation Boundary

**Existing Approval/Execution Path:**
- **Status:** Not clearly defined
- **Missing:** Execution gate, approval workflow, diff visualization, rollback mechanism

### 10.3 Boundary Gaps

**Issue: No Workbench Authority Definition**
- No clear boundary on what Workbench can mutate
- No clear boundary on approval workflow
- No clear boundary on execution path
- No clear boundary on rollback mechanism

---

## 11. EXISTING BOUNDARY DOCUMENTS DISCOVERED

### 11.1 PING90 Boundary Documents

1. **CONSTITUTIONAL_PATCH_20_AUTHORITY_SOURCE.md** - Authority hierarchy and principles
2. **HPP_OWNERSHIP_AUDIT.md** - Three-layer ownership model
3. **BUSINESS_INTELLIGENCE_BOUNDARY.md** - Business intelligence ownership matrix
4. **REPOSITORY_BOUNDARY_RULE.md** - Repository isolation principle

### 11.2 HPP Boundary Documents

1. **CONSTITUTIONAL_ARCHITECTURE_COMPLETE.md** - 95%+ complete constitutional architecture
2. **CONSTITUTIONAL_VALIDATION_REPORT.md** - Validation status
3. **CONSTITUTIONAL_EVOLUTION_PATH.md** - Evolution roadmap
4. **CONSTITUTIONAL_ROADMAP.md** - Implementation roadmap

### 11.3 Drive Boundary Documents

1. **DRIVE_MIRROR_RUNTIME_SPEC.md** - Drive mirror specification (not implemented)
2. **DRIVE_SOURCE_FORENSIC_MAP.md** - Drive source forensic map

---

## 12. MISSING BOUNDARY DOCUMENTS

### 12.1 Critical Missing Documents

1. **PING90 ↔ HPP Media Boundary Document** - No explicit definition of media authority boundary
2. **Drive ↔ PING90 Authority Boundary Document** - No explicit definition of Drive integration boundary
3. **Workbench Authority/Mutation Boundary Document** - No explicit definition of Workbench mutation authority
4. **Media Identity Authority Boundary Document** - No explicit definition of which system owns media identity
5. **Media Provenance Authority Boundary Document** - No explicit definition of which system owns media provenance
6. **Media Variant Authority Boundary Document** - No explicit definition of which system owns variant generation
7. **Media Projection Authority Boundary Document** - No explicit definition of which system owns projection authority

---

## 13. AUGUST 3 COMPLETE PUBLIC MEDIA INVENTORY

### 13.1 August 3 Baseline State

**Commit:** `5ba201c` (fix: remove internal workflow cards from public project pages)
**Date:** August 3, 2026

**Media.v1.json (August 3):**
- **Total Assets:** 21
- **Total Projects:** 6
- **Drive IDs:** Present in all 21 assets
- **Full Variants:** original, web, webp, avif, thumbnail

**Projects.v1.json (August 3):**
- **Total Projects:** 6
- **Hero Media:** Present for all projects
- **Gallery Media:** Present for all projects
- **Before/After:** Present for relevant projects

### 13.2 August 3 Media Inventory

**Homepage Hero:**
- **Source:** Hardcoded `/images/hero-background-enhanced.jpg`
- **Status:** Non-constitutional (hardcoded path)
- **Current Status:** Fixed to use constitutional path

**Brand Assets (3):**
- **brand-featured** - featured.jpeg (480x640)
- **brand-hero** - hero.jpeg (480x640)
- **brand-portrait** - portrait.jpeg (640x427)

**Project Media (18):**
- **Fences Project (4):** FENCE BUILD.jpg, FENCE BEFORE.jpg, FENCE AFTER.jpg, FENCEREBUILDMATCHINGSTAIN.png
- **Built-Ins Project (2):** FINISHEDCARPENTRY.png, FINISHEDCARPENTRY0.png
- **Repairs Project (7):** TRIMREPAIR.png, DRYWALL.png, FLOOR.png, GUTTERCLEANING.jpg, FLOOR0.jpg, IMG_0544.JPG, IMG_0546.JPG
- **Outdoor Living Project (7):** IMG_0535.JPG through IMG_0841.JPG
- **Bathroom Remodeling Project (1):** BATHROOM_WALL.png
- **Pergolas Project (3):** HOMESERVICEPROJECTPERGOLAS.jpg, 1.png (before), HOMESERVICEPROJECTPERGOLAS.jpg (after, same as hero)

### 13.3 Current State vs August 3

**Current State (December 11, 2026):**
- **Media.v1.json:** 4 assets only
- **Projects.v1.json:** 3 projects only
- **Drive IDs:** Removed
- **Variants:** Simplified (original + web only)

**Missing from Current:**
- 17 baseline media assets
- 3 baseline projects
- All Drive ID mappings
- Full variant structure

**Conclusion:** This is NOT a simplification. This is a DIFFERENT deployment state.

---

## 14. HISTORICAL/CURRENT RECONCILIATION

### 14.1 Authority Reconciliation

**August 3 Baseline:**
- Authority: media.v1.json (21 assets with Drive IDs)
- System: Single authority, full Drive integration

**Current State:**
- Authority: Dual authority (legacy + constitutional)
- System: Transitional state, Drive IDs removed

**Gap:** Authority simplified, Drive connection lost

### 14.2 Provenance Reconciliation

**August 3 Baseline:**
- Provenance: Drive IDs present in all 21 assets
- Source: H:\My Drive\Happy Place Media\

**Current State:**
- Provenance: Drive IDs removed
- Source: Unknown

**Gap:** Provenance tracking lost

### 14.3 Variant Reconciliation

**August 3 Baseline:**
- Variants: original, web, webp, avif, thumbnail
- Generation: Full variant pipeline

**Current State:**
- Variants: original, web only
- Generation: Simplified pipeline

**Gap:** Variant system simplified

---

## 15. HPC DRIVE SOURCE MAP

### 15.1 Drive Structure 1: Personal Drive

**Path:** `H:\My Drive\Happy Place Media\`

**Purpose:** Working assets, photo intake, project organization

**Structure:**
```
H:\My Drive\
└── Happy Place Media\
    └── Website Library\
        ├── Hero\
        ├── Brand\
        ├── Projects\
        │   ├── Johnson Cedar Fence\
        │   ├── Smith Built-Ins\
        │   ├── Wilson Home Repairs\
        │   ├── Davis Bathroom Remodel\
        │   └── Martinez Pergola\
        └── Featured Projects\
```

**Files:** 27 assets (hero-background-enhanced.jpg, FENCE BUILD.jpg, FINISHEDCARPENTRY.png, etc.)

### 15.2 Drive Structure 2: Shared Drive

**Path:** `H:\Shared drives\Happy Place Carpentry Website`

**Purpose:** Production media, before/after documentation

**Structure:**
```
H:\Shared drives\Happy Place Carpentry Website\
├── Featured Projects\
├── Drywall Before & Afters\
├── Painting Before & Afters\
├── Fencing Before & Afters\
├── Finish Carpentry Before & Afters\
└── Other Before & Afters\
```

**Files:** 31 assets (organized by HP001, HP002, etc. - project numbers)

### 15.3 Constitutional Authority

**Constitutional Authority:** H:\Shared drives\Happy Place Carpentry Website
**Migration Source (Historical):** H:\My Drive\PIPING90

### 15.4 Drive Reorganization Project

**Status:** COMPLETE
- **File:** `generated/DRIVE-REORGANIZATION-COMPLETE.md`
- **Completion:** 26 images organized into H:\My Drive\ structure
- **Drive ID Mappings:** Generated for all entries
- **Status:** Complete but not integrated into current media.v1.json

---

## 16. EXISTING CONNECTOR CAPABILITIES

### 16.1 HPP Drive Connector

**OAuth Infrastructure:**
- **Session Authority:** `src/lib/drive/drive-session.ts`
- **OAuth Manager:** `src/lib/drive/oauth-manager.ts`
- **Discovery:** `src/lib/drive/drive-discovery.ts`
- **Status:** Complete and functional

**OAuth Flow:**
- **Authorization:** `src/app/api/drive/oauth/authorize/route.ts`
- **Callback:** `src/app/api/drive/oauth/callback/route.ts`
- **Scopes:** drive, drive.metadata.readonly, drive.photos.readonly

**Drive Adapter:**
- **Abstraction:** `scripts/image-source/image-source.mjs`
- **Drive Adapter:** `scripts/image-source/drive-image-source.mjs`
- **Filesystem Adapter:** `scripts/image-source/filesystem-image-source.mjs`
- **Status:** Complete and functional

### 16.2 PING90 Drive Connector

**Drive Ingestion:**
- **Implementation:** `runtime/ingestion/drive_ingestor.py`
- **Events:** DOCUMENT_IMPORTED, DOCUMENT_UPDATED, DOCUMENT_DELETED
- **Status:** Not started by Docker, not constitutionally integrated

**Drive Mirror Specification:**
- **Document:** `docs/architecture/DRIVE_MIRROR_RUNTIME_SPEC.md`
- **Status:** Specification exists but not implemented

---

## 17. EXISTING INGESTION PIPELINE

### 17.1 HPP Image Pipeline

**V1 Image Pipeline:**
- **Script:** `scripts/image-pipeline.mjs`
- **DAG Stages:** Discovery, Hashing, Classification, Transformation, Manifest Generation, Emission
- **Output:** WebP, AVIF, thumbnail, blur placeholder
- **Status:** Active and functional

### 17.2 PING90 Ingestion

**Ingestion Sources:**
- Google Drive (not constitutionally integrated)
- Yahoo Mail (custom database, not constitutional)
- RSS (custom database, not constitutional)
- Web Retrieval (status unknown)
- Filesystem (SQL output, not event emission)
- Repository Scanner (not started by Docker)

**Overall Assessment:** EXTERNAL INGESTION EXISTS BUT NOT CONSTITUTIONALLY INTEGRATED

---

## 18. EXISTING AUTOMATION

### 18.1 Build Automation

**Build Flow:**
```
photo-intake/ → npm run images → public/images/ + gallery.json + generated/
                                        ↓
                                  npm run build → .next/ (gitignored)
```

**Build Script:**
- **Graph Edge Generator:** `scripts/graph-edge-generator.js`
- **Constitutional Projection Generator:** `scripts/constitutional-projection-generator.js`
- **Next.js Build:** Standard Next.js build

### 18.2 Projection Generation

**Automated Projections:**
- **hero-projection.json** - Homepage hero selection
- **gallery-projection.json** - Gallery projection
- **service-projection.json** - Service projection
- **Generation:** Build-time via npm run build

### 18.3 Drive Automation

**Drive Sync:**
- **Script:** `scripts/drive-sync.mjs`
- **Status:** Exists but not actively used

---

## 19. EXISTING APPROVAL/EXECUTION PATH

### 19.1 Current Status

**Status:** NOT CLEARLY DEFINED

**Missing Components:**
- Execution gate
- Approval workflow
- Diff visualization
- Rollback mechanism
- Change request system

### 19.2 PING90 Constitutional Approval

**PING90 has:**
- Event Recording Authority
- Policy Authority (mutation authorization)
- Replay System (deterministic reconstruction)
- Witness System (MerkleTree-based verification)

**Status:** Constitutional approval framework exists but not integrated with HPP media mutations

---

## 20. EXACT ARCHITECTURAL GAPS

### 20.1 Critical Gaps

1. **Dual Authority System** - Legacy + constitutional authorities both exist, unclear which is source of truth
2. **Missing Media Identity Boundary** - No clear definition of which system owns media identity (PING90 ArtifactId vs HPP UUID v5)
3. **Missing Provenance Boundary** - No clear definition of which system owns media provenance
4. **Missing Variant Authority Boundary** - No clear definition of which system owns variant generation
5. **Missing Projection Authority Boundary** - No clear definition of which system owns projection authority for HPP media
6. **Missing Workbench Authority Boundary** - No clear definition of what Workbench can mutate
7. **Missing Drive Integration Boundary** - No clear definition of which system owns Drive synchronization
8. **Missing Approval/Execution Path** - No clear definition of mutation approval workflow
9. **Drive IDs Removed** - 17 August 3 assets lost Drive ID references
10. **Full Variants Lost** - August 3 had 5 variant types, current has 2

### 20.2 Medium Gaps

1. **PING90 Integration** - Designed but not active
2. **Drive Mirror Implementation** - Specified but not implemented
3. **Constitutional Graph Edges** - Zero `belongsTo` edges, transitional filename-based grouping
4. **Media Registry Gaps** - 17 August 3 assets missing from current registry

### 20.3 Minor Gaps

1. **Documentation Consolidation** - Extensive but potentially overwhelming documentation
2. **PING90 External Ingestion** - Exists but not constitutionally integrated

---

## 21. RECOMMENDED FINAL MEDIA WORKBENCH ARCHITECTURE

### 21.1 Constitutional Architecture

```
HPC Drive (Source Material)
    ↓
PING90 (Constitutional Authority)
    │
    ├── Identity Authority (ArtifactId from canonical hash)
    ├── Provenance Authority (Capability → Implementation → Acquisition → Platform)
    ├── Lineage Authority (DAG-based parent-child derivation)
    ├── Event Recording Authority (append-only constitutional history)
    ├── Replay Authority (deterministic reconstruction)
    └── Policy Authority (mutation authorization)
    │
    ↓
CANONICAL MEDIA ASSET
    │
    ├── ONE ORIGINAL (canonical identity)
    ├── MULTIPLE VARIANTS (web, webp, avif, thumbnail, blur)
    └── PROVENANCE (Drive source, acquisition timestamp, pipeline version)
    │
    ↓
HPP PROJECTION LAYER
    │
    ├── Projection Generator (build-time)
    ├── Generated Projections (.generated/*.json)
    └── Static Runtime (immutable JSON)
    │
    ↓
    ↓
WEBSITE + WORKBENCH
```

### 21.2 Boundary Definitions

**Identity Authority Boundary:**
- **PING90 owns:** ArtifactId generation (canonical hash-based)
- **HPP owns:** Functional IDs (slug-based for UI references)
- **Mapping:** HPP maps functional IDs to PING90 ArtifactIds

**Provenance Authority Boundary:**
- **PING90 owns:** Constitutional provenance (Capability → Implementation → Acquisition → Platform)
- **HPP owns:** Business provenance (project/service usage mapping)
- **Mapping:** HPP maps business provenance to PING90 constitutional provenance

**Variant Authority Boundary:**
- **PING90 owns:** Variant generation authority (via media capability)
- **HPP owns:** Variant selection authority (web vs webp vs avif)
- **Mapping:** HPP requests variants from PING90 media capability

**Projection Authority Boundary:**
- **PING90 owns:** Constitutional projection authority (via State Authority)
- **HPP owns:** Build-time projection generation (specific to HPP needs)
- **Mapping:** HPP projections are HPP-specific, PING90 projections are constitutional

**Drive Authority Boundary:**
- **PING90 owns:** Drive synchronization authority (via Repository Runtime)
- **HPP owns:** Drive usage authority (which assets to use)
- **Mapping:** HPP requests Drive assets from PING90 mirror

**Workbench Authority Boundary:**
- **PING90 owns:** Constitutional mutation authority (via Policy Authority)
- **HPP owns:** Business mutation authority (which media to use where)
- **Mapping:** HPP business mutations request PING90 constitutional approval

### 21.3 Mutation/Approval Path

```
HUMAN INITIATES CHANGE (in Workbench)
    ↓
PROPOSED CHANGE (diff visualization)
    ↓
PING90 CONSTITUTIONAL VALIDATION
    ↓
HUMAN APPROVAL
    ↓
PING90 CONSTITUTIONAL EXECUTION (event emission)
    ↓
PING90 REPLAY (deterministic reconstruction)
    ↓
PING90 WITNESS (MerkleTree verification)
    ↓
NEW PROJECTION
    ↓
HPP BUILD
    ↓
DEPLOYMENT
```

### 21.4 Workbench UI Requirements

**North Star:**
- **NOT** developer diagnostic page
- **NOT** UUID soup, projection IDs, constitutional scoring numbers on primary UI
- **YES** beautiful media library with real images
- **YES** one card per canonical asset (not per variant)
- **YES** expandable technical details behind "Details" button

**Primary UI:**
```
┌────────────────────────────────────┐
│                                    │
│         ACTUAL HPP IMAGE           │
│                                    │
├────────────────────────────────────┤
│ Homepage Hero                      │
│                                    │
│ ● Canonical                        │
│ ● Google Drive                     │
│ ● Used on Homepage ✓               │
│ ● Variants healthy ✓              │
│                                    │
│ [Manage]  [Open in Drive]          │
└────────────────────────────────────┘
```

**Technical Details (expandable):**
- Projection ID
- Score
- Canonical ID
- Drive ID
- Content hash
- Variants list
- Usage mapping

### 21.5 Unmapped Queue

**Purpose:** Show assets that exist on website but not canonically mapped

**UI:**
```
17 MEDIA ITEMS NEED ATTENTION

[ IMAGE ]

Currently used:
Homepage / Service Card

Source:
/images/...

Suggested canonical match:
Google Drive / Happy Place Media / ...

Confidence:
98%

[ Accept Mapping ]
[ Choose Different ]
[ Ignore ]
```

---

## 22. NEXT STEPS

### Phase 1: Resolve Boundary Documents
1. Create PING90 ↔ HPP Media Boundary Document
2. Create Drive ↔ PING90 Authority Boundary Document
3. Create Workbench Authority/Mutation Boundary Document
4. Create Media Identity Authority Boundary Document
5. Create Media Provenance Authority Boundary Document
6. Create Media Variant Authority Boundary Document
7. Create Media Projection Authority Boundary Document

### Phase 2: Reconcile August 3 Baseline
1. Map all 21 August 3 assets to current physical files
2. Map all 21 August 3 assets to Drive sources
3. Map all 21 August 3 assets to current metadata
4. Identify which assets are lost, renamed, or unmapped
5. Determine canonical identity for each asset (use PING90 ArtifactId system)

### Phase 3: Reconcile Current State
1. Map current 4 assets to August 3 baseline
2. Map current 3 projects to August 3 baseline
3. Identify which August 3 assets should be restored
4. Identify which current assets should be deprecated
5. Determine Drive ID restoration strategy

### Phase 4: Implement Constitutional Integration
1. Complete constitutional graph edges (add `belongsTo` edges)
2. Migrate components to use constitutional authority
3. Deprecate legacy `media.v1.json`
4. Complete constitutional projection deployment

### Phase 5: Integrate PING90 Identity System
1. Map HPP UUID v5 to PING90 ArtifactId system
2. Remove competing identity systems
3. Establish single canonical identity authority

### Phase 6: Integrate Drive System
1. Implement Drive mirror per PING90 specification
2. Enable Drive ingestion in PING90
3. Establish Drive ↔ PING90 authority boundary
4. Restore Drive IDs to media registry

### Phase 7: Build Workbench
1. Design Workbench UI around actual images (not UUID soup)
2. Implement one card per canonical asset
3. Add expandable technical details
4. Add unmapped queue
5. Connect real Drive connector
6. Add approval/diff boundary
7. Add variant management

### Phase 8: Verification
1. Verify August 3 website visual baseline
2. Verify all public media preserved
3. Verify PING90 constitutional compliance
4. Verify HPP projection compliance
5. Verify Drive integration
6. Verify Workbench functionality

---

## CONCLUSION

The PING90 and HPP systems both have sophisticated constitutional architectures with extensive documentation, but they exist in transitional states with dual authority systems and incomplete integrations. The key gaps are:

1. **Missing boundary documents** defining the relationship between PING90, HPP, Drive, and media authority
2. **Dual authority system** in HPP (legacy + constitutional)
3. **Competing identity systems** (PING90 ArtifactId vs HPP UUID v5)
4. **Lost Drive ID mappings** from August 3 baseline
5. **No approval/execution path** for media mutations
6. **Workbench currently a developer diagnostic page**, not a nontechnical media management system

The recommended approach is to:
1. **First resolve boundary documents** to establish clear authority boundaries
2. **Reconcile August 3 baseline** to understand what was lost
3. **Integrate PING90 identity system** as the canonical identity authority
4. **Restore Drive ID mappings** through PING90 Drive mirror system
5. **Build Workbench** as a beautiful human control surface over the constitutional architecture

**North Star:**
```
HPC Drive (Source Material)
    ↓
PING90 (Constitutional Authority)
    ↓
HPP (Consumer/Projection/Application)
    ↓
Media Workbench (Human Control Surface)
```

**One Canonical Media Asset → Many Managed Variants → Many Website Uses**

---

**END OF FORENSIC ARCHITECTURE REPORT**
