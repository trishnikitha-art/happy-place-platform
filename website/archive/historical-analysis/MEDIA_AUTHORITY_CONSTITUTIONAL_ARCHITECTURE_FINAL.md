# Media Authority Constitutional Architecture - Final Pass

**Date:** 2026-08-03
**Objective:** Media Authority as constitutional domain with minimal authorities
**Status:** Final Architectural Pass

---

## Architectural Corrections

### 1. Reduce Authorities to Constitutional Truth Only

**Constitutional Authorities (own immutable constitutional truth):**
- Identity Authority (already exists in PING)
- Repository Authority (already exists in PING)
- Projection Authority (already exists in PING)
- Hash Authority (already exists in PING)
- Canonicalization Authority (missing in PING, FORBIDDEN until Priority 0 complete)

**Media Domain Services (deterministic projections over constitutional events):**
- Asset Service
- Variant Service
- Duplicate Service
- Connector Registry
- Search Projection
- Worker Projection
- Storage Drivers

**Mission Control (operational console):**
- Operational Console

### 2. Asset Identity Derives from Constitutional Identity

**Incorrect:**
```
Asset Authority generates Asset IDs
```

**Correct:**
```
Observation
    ↓
Repository
    ↓
Identity Authority (constitutional UUID v7)
    ↓
Canonical Asset Identity
```

Asset IDs derive from constitutional identity, ensuring replay-deterministic IDs.

### 3. Duplicate Detection Emits Observations Only

**Incorrect:**
```
Duplicate Authority
    ↓
Canonical Suggestion
```

**Correct:**
```
Duplicate Service
    ↓
DuplicateCandidateObserved (event)
    ↓
Constitution Engine (decides)
    ↓
Canonical Decision
```

Duplicate detection emits observations, Constitution Engine decides canonical selection.

### 4. Storage is Infrastructure, Not Authority

**Incorrect:**
```
Storage Authority
```

**Correct:**
```
Storage Drivers
    ├── Local Storage Driver
    ├── NAS Storage Driver
    ├── Google Drive Storage Driver
    ├── Dropbox Storage Driver
    ├── S3 Storage Driver
    ├── R2 Storage Driver
    ├── OneDrive Storage Driver
    ├── Github Storage Driver
    └── Azure Storage Driver
```

Storage is replaceable infrastructure, not constitutional authority.

### 5. Variant Generation is Replay-Deterministic

**Incorrect:**
```
Variants treated like media
Mutable thumbnail cache
```

**Correct:**
```
Original Observation
    ↓
Canonical Asset
    ↓
Variant Requested (event)
    ↓
Variant Generated (event)
    ↓
Variant Stored (event)
```

Every thumbnail is replay-reproducible. No mutable thumbnail cache.

### 6. Search is Projection, Not Authority

**Incorrect:**
```
Search Authority owns index
```

**Correct:**
```
Replay
    ↓
Projection
    ↓
Search Index (rebuildable)
```

Search never owns data. Search index rebuilds from replay.

### 7. Job Authority Disappears

**Incorrect:**
```
Job Authority
```

**Correct:**
```
Worker Projection (PING already has workers)
```

Jobs are worker state. Workers already have replay. Use Worker Projection.

### 8. Project is Metadata, Not Authority

**Incorrect:**
```
Project Authority
```

**Correct:**
```
Project Projection (user organization metadata)
```

Projects are user organization, not constitutional truth.

### 9. Constitutional Engine Integration is Central Pipeline

**Missing:**
```
Observation
    ↓
Inference
    ↓
Constitution Engine
    ↓
Canonical Decision
    ↓
Projection
```

**Correct:**
```
Observation (TEMPORARY_OBSERVATION authority)
    ↓
Repository
    ↓
Inference (if needed)
    ↓
Constitution Engine
    ↓
Canonical Decision (CONSTITUTIONAL authority)
    ↓
Projection
    ↓
Witness
```

Constitution Engine is the central pipeline for canonical decisions.

### 10. Mission Control is Operational Kernel

**Incorrect:**
```
Mission Control is passive viewer
```

**Correct:**
```
Mission Control (Operational Kernel)
    ├── Replay control
    ├── Connector registration
    ├── Worker pause/resume
    ├── Observation quarantine
    ├── Duplicate review
    ├── Constitutional approvals
    ├── Storage migrations
    ├── Rebuild projections
    ├── Rebuild search
    └── Rebuild variants
```

Mission Control is the operational kernel, not just a viewer.

---

## Final Architecture

### Constitutional Authorities (PING)

```
Constitutional Authorities
    ├── Identity Authority (existing)
    ├── Repository Authority (existing)
    ├── Projection Authority (existing)
    ├── Hash Authority (existing)
    └── Canonicalization Authority (missing, FORBIDDEN until Priority 0 complete)
```

### Media Domain Services

```
Media Domain
    ├── Asset Service
    │   ├── Asset identity derivation (from Identity Authority)
    │   ├── Asset fingerprinting (SHA256, pHash)
    │   ├── Asset metadata
    │   └── Asset lineage
    │
    ├── Variant Service
    │   ├── Variant request handling
    │   ├── Variant generation (replay-deterministic)
    │   ├── Variant storage
    │   └── Variant lineage
    │
    ├── Duplicate Service
    │   ├── Duplicate detection (ImageHash)
    │   ├── Duplicate grouping
    │   ├── Similarity scoring
    │   └── DuplicateCandidateObserved events
    │
    ├── Connector Registry
    │   ├── Connector registration
    │   ├── Connector health monitoring
    │   ├── Connector operations
    │   └── Connector metadata
    │
    ├── Search Projection
    │   ├── Search index (rebuildable from replay)
    │   ├── Multi-dimensional search
    │   └── Search verification
    │
    ├── Worker Projection
    │   ├── Worker state projection
    │   ├── Worker health monitoring
    │   └── Worker lineage
    │
    ├── Project Projection
    │   ├── Project metadata
    │   ├── Project membership
    │   └── Project organization
    │
    └── Storage Drivers
        ├── Local Storage Driver
        ├── NAS Storage Driver
        ├── Google Drive Storage Driver
        ├── Dropbox Storage Driver
        ├── S3 Storage Driver
        ├── R2 Storage Driver
        ├── OneDrive Storage Driver
        ├── Github Storage Driver
        └── Azure Storage Driver
```

### Mission Control (Operational Console)

```
Mission Control (Operational Kernel)
    ├── Constitutional Runtime
    │   ├── Authorities
    │   ├── Replay
    │   └── Witness
    │
    └── Media Authority Console
        ├── Connector Registry UI
        ├── Asset Service UI
        ├── Variant Service UI
        ├── Duplicate Service UI
        ├── Search Projection UI
        ├── Worker Projection UI
        ├── Project Projection UI
        ├── Storage Drivers UI
        ├── Discovery Timeline
        ├── Replay Control
        ├── Constitutional Approvals
        ├── Connector Registration
        ├── Worker Pause/Resume
        ├── Observation Quarantine
        ├── Duplicate Review
        ├── Storage Migrations
        ├── Rebuild Projections
        ├── Rebuild Search
        └── Rebuild Variants
```

---

## Constitutional Flow

### Observation to Truth Pipeline

```
Connector
    ↓
Observation (TEMPORARY_OBSERVATION authority)
    ↓
Repository
    ↓
Identity Authority (constitutional UUID v7)
    ↓
Canonical Asset Identity
    ↓
Inference (if needed: CLIP embedding, OCR, object detection)
    ↓
Constitution Engine
    ↓
Canonical Decision (CONSTITUTIONAL authority)
    ↓
Projection
    ↓
Witness
```

### Variant Generation Pipeline

```
Canonical Asset
    ↓
Variant Requested (event)
    ↓
Variant Service
    ↓
Variant Generated (event, replay-deterministic)
    ↓
Variant Stored (event)
    ↓
Storage Driver
    ↓
Witness
```

### Duplicate Detection Pipeline

```
Canonical Asset
    ↓
Duplicate Service
    ↓
DuplicateCandidateObserved (event)
    ↓
Constitution Engine
    ↓
Canonical Decision (CONSTITUTIONAL authority)
    ↓
Projection
    ↓
Witness
```

### Search Pipeline

```
Replay
    ↓
Projection
    ↓
Search Index (rebuildable)
    ↓
Search Results
```

---

## Event Types (Constitutional)

### Asset Events
- `ASSET_DISCOVERED` - Asset discovered by connector (TEMPORARY_OBSERVATION authority)
- `ASSET_FINGERPRINTED` - Asset fingerprinted (SHA256, pHash) (TEMPORARY_OBSERVATION authority)
- `ASSET_CANONICAL_DECISION` - Constitutional decision on asset (CONSTITUTIONAL authority)

### Variant Events
- `VARIANT_REQUESTED` - Variant generation requested (TEMPORARY_OBSERVATION authority)
- `VARIANT_GENERATED` - Variant generated (TEMPORARY_OBSERVATION authority)
- `VARIANT_STORED` - Variant stored (TEMPORARY_OBSERVATION authority)

### Duplicate Events
- `DUPLICATE_CANDIDATE_OBSERVED` - Duplicate candidate observed (TEMPORARY_OBSERVATION authority)
- `DUPLICATE_CANONICAL_DECISION` - Constitutional decision on duplicate (CONSTITUTIONAL authority)

### Connector Events
- `CONNECTOR_REGISTERED` - Connector registered (TEMPORARY_OBSERVATION authority)
- `CONNECTOR_HEALTH_CHECK` - Connector health check (TEMPORARY_OBSERVATION authority)
- `DISCOVERY_STARTED` - Discovery job started (TEMPORARY_OBSERVATION authority)
- `DISCOVERY_COMPLETED` - Discovery job completed (TEMPORARY_OBSERVATION authority)
- `DISCOVERY_FAILED` - Discovery job failed (TEMPORARY_OBSERVATION authority)

### Storage Events
- `STORAGE_DRIVER_REGISTERED` - Storage driver registered (TEMPORARY_OBSERVATION authority)
- `ASSET_STORED` - Asset stored (TEMPORARY_OBSERVATION authority)
- `ASSET_RETRIEVED` - Asset retrieved (TEMPORARY_OBSERVATION authority)
- `ASSET_DELETED` - Asset deleted (TEMPORARY_OBSERVATION authority)

---

## Services (Not Authorities)

### Asset Service

**Responsibilities:**
- Asset identity derivation (from Identity Authority)
- Asset fingerprinting (SHA256, pHash)
- Asset metadata extraction
- Asset lineage tracking

**Implementation:**
- Uses Identity Authority for asset IDs
- Uses Hash Authority for SHA256
- Uses ImageHash for pHash
- Emits constitutional events

### Variant Service

**Responsibilities:**
- Variant request handling
- Variant generation (replay-deterministic)
- Variant storage
- Variant lineage

**Implementation:**
- Uses Pillow/libvips for generation
- Emits constitutional events
- No mutable cache

### Duplicate Service

**Responsibilities:**
- Duplicate detection (ImageHash)
- Duplicate grouping
- Similarity scoring
- Emits DuplicateCandidateObserved events

**Implementation:**
- Uses ImageHash for perceptual hashing
- Emits observations only
- Constitution Engine decides canonical selection

### Connector Registry

**Responsibilities:**
- Connector registration
- Connector health monitoring
- Connector operations
- Connector metadata

**Implementation:**
- Runtime registration
- Health monitoring
- Emits constitutional events

### Search Projection

**Responsibilities:**
- Search index (rebuildable from replay)
- Multi-dimensional search
- Search verification

**Implementation:**
- Rebuilds from replay
- Never owns data
- Projection over constitutional events

### Worker Projection

**Responsibilities:**
- Worker state projection
- Worker health monitoring
- Worker lineage

**Implementation:**
- Projects worker state from events
- Uses PING's existing worker infrastructure

### Project Projection

**Responsibilities:**
- Project metadata
- Project membership
- Project organization

**Implementation:**
- User organization metadata
- Projection over constitutional events

### Storage Drivers

**Responsibilities:**
- Storage abstraction
- Storage operations (upload, download, delete)
- Storage health monitoring

**Implementation:**
- Replaceable infrastructure
- OSS SDKs for each provider
- Not constitutional authority

---

## Mission Control Console (Operational Kernel)

### Connector Registry UI
- List all connectors
- Register new connector
- Unregister connector
- View connector health
- Trigger connector sync
- View connector errors

### Asset Service UI
- List all assets
- View asset details
- View asset fingerprint
- View asset lineage
- View asset witness

### Variant Service UI
- List all variants
- Request variant generation
- View variant details
- View variant lineage
- Rebuild variants

### Duplicate Service UI
- List duplicate groups
- View duplicate group details
- Trigger duplicate scan
- Review duplicate candidates
- Approve canonical selection

### Search Projection UI
- Search across all dimensions
- View search results
- Rebuild search index
- Verify search results

### Worker Projection UI
- View worker state
- View worker health
- View worker lineage
- Pause/resume workers

### Project Projection UI
- List all projects
- View project details
- Add/remove assets from project
- Edit project metadata

### Storage Drivers UI
- List all storage drivers
- Register new storage driver
- View storage driver health
- View storage driver capacity
- Migrate storage

### Discovery Timeline
- View discovery events
- View observation events
- View projection events
- View canonicalization events
- View storage events

### Replay Control
- Replay discovery
- Replay observation
- Replay projection
- Replay canonicalization
- Replay storage
- Replay variants

### Constitutional Approvals
- View pending decisions
- Approve decisions
- Reject decisions
- View decision lineage
- View decision witness

### Connector Registration
- Register new connector
- Configure connector
- Test connector
- View connector credentials

### Worker Pause/Resume
- Pause workers
- Resume workers
- View worker state
- View worker errors

### Observation Quarantine
- Quarantine observations
- Review quarantined observations
- Approve quarantine
- Reject quarantine

### Duplicate Review
- Review duplicate candidates
- Approve canonical selection
- Reject canonical selection
- View duplicate lineage

### Storage Migrations
- Migrate assets between storage drivers
- View migration status
- Cancel migration
- View migration errors

### Rebuild Projections
- Rebuild asset projections
- Rebuild variant projections
- Rebuild duplicate projections
- Rebuild project projections

### Rebuild Search
- Rebuild search index
- View rebuild status
- Cancel rebuild
- View rebuild errors

### Rebuild Variants
- Rebuild all variants
- Rebuild specific variants
- View rebuild status
- Cancel rebuild
- View rebuild errors

---

## Implementation Priority

### Phase 1: Constitutional Foundation (BLOCKED until PING Priority 0 complete)
1. Complete PING Priority 0 (Canonical Event Authority)
2. Extend PING event registry with Media Authority event types
3. Create Canonicalization Authority (FORBIDDEN until Priority 0 complete)

### Phase 2: Media Domain Services
1. Create Asset Service (identity derivation, fingerprinting, metadata, lineage)
2. Create Variant Service (request handling, generation, storage, lineage)
3. Create Duplicate Service (detection, grouping, scoring, observations)
4. Create Connector Registry (registration, health, operations, metadata)
5. Create Search Projection (rebuildable index, multi-dimensional search, verification)
6. Create Worker Projection (state projection, health monitoring, lineage)
7. Create Project Projection (metadata, membership, organization)
8. Create Storage Drivers (local, NAS, Google Drive, Dropbox, S3, R2, OneDrive, Github, Azure)

### Phase 3: Connector Architecture
1. Design IMediaConnector interface
2. Implement GoogleDriveConnector (extend existing)
3. Implement FilesystemConnector (extend existing)
4. Implement Discovery Worker (uses IMediaConnector interface)

### Phase 4: Mission Control Console (Operational Kernel)
1. Extend Mission Control with Media Authority section
2. Implement Connector Registry UI
3. Implement Asset Service UI
4. Implement Variant Service UI
5. Implement Duplicate Service UI
6. Implement Search Projection UI
7. Implement Worker Projection UI
8. Implement Project Projection UI
9. Implement Storage Drivers UI
10. Implement Discovery Timeline
11. Implement Replay Control
12. Implement Constitutional Approvals
13. Implement Connector Registration
14. Implement Worker Pause/Resume
15. Implement Observation Quarantine
16. Implement Duplicate Review
17. Implement Storage Migrations
18. Implement Rebuild Projections
19. Implement Rebuild Search
20. Implement Rebuild Variants

### Phase 5: Image Processing (OSS Libraries)
1. Implement thumbnail generation (Pillow)
2. Implement preview generation (Pillow)
3. Implement AVIF generation (Pillow/libvips)
4. Implement WebP generation (Pillow/libvips)

### Phase 6: Perceptual Hashing (OSS Libraries)
1. Implement perceptual hashing (ImageHash)
2. Implement duplicate detection (ImageHash)
3. Implement duplicate grouping
4. Implement similarity scoring

### Phase 7: Additional Connectors
1. Implement DropboxConnector
2. Implement OneDriveConnector
3. Implement S3Connector
4. Implement R2Connector
5. Implement NASConnector
6. Implement GitConnector

---

## Summary

**Constitutional Authorities (minimal, own immutable truth):**
- Identity Authority (existing in PING)
- Repository Authority (existing in PING)
- Projection Authority (existing in PING)
- Hash Authority (existing in PING)
- Canonicalization Authority (missing in PING, FORBIDDEN until Priority 0 complete)

**Media Domain Services (deterministic projections over constitutional events):**
- Asset Service
- Variant Service
- Duplicate Service
- Connector Registry
- Search Projection
- Worker Projection
- Project Projection
- Storage Drivers

**Mission Control (operational kernel):**
- Operational Console with full control (replay, registration, pause/resume, quarantine, approvals, migrations, rebuilds)

**Constitutional Flow:**
```
Connector → Observation → Repository → Identity Authority → Canonical Asset Identity → Inference → Constitution Engine → Canonical Decision → Projection → Witness
```

**Every identifier and every derived artifact is replay-deterministic.**

**Constitutional truth remains small. Media evolves without constitutional drift.**
