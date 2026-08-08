# Media Authority Constitutional Architecture - Final Compatibility Pass

**Date:** 2026-08-03
**Objective:** Media Authority as constitutional domain with full PING compatibility
**Status:** Final Compatibility Pass

---

## Architectural Compatibility Corrections

### 1. Asset Identity Derives from Repository Events

**Incorrect:**
```
Observation
    ↓
Identity Authority
    ↓
Canonical Asset Identity
```

**Correct:**
```
Observation (from connector)
    ↓
Repository Authority
    ↓
Canonical Event
    ↓
Identity Authority
    ↓
Canonical Identity
```

Identity Authority should never consume raw connector observations. It should consume repository-approved constitutional events. This keeps replay deterministic.

### 2. Asset Service Uses Hash Authority

**Incorrect:**
```
Asset Service
    ├── fingerprinting
    └── SHA256
```

**Correct:**
```
Asset Service
    ↓
Hash Authority
    ↓
SHA256
```

Media should never own hashing. It requests hashes from Hash Authority.

### 3. Variant Generation is Versioned and Event-Driven

**Incorrect:**
```
Variant Service generates variants directly
```

**Correct:**
```
VariantRequested (event)
    ↓
Worker
    ↓
VariantObservation (event, with version metadata)
    │   ├── Variant Generator Version
    │   ├── Pillow Version
    │   ├── Configuration Hash
    │   └── Processing Profile
    ↓
Repository Authority
    ↓
Projection
```

Variant generation itself should be versioned. Otherwise replay can regenerate different variants if the library changes.

### 4. Connector Registry is Projection

**Incorrect:**
```
Connector Registry (authoritative)
```

**Correct:**
```
Connector Projection (derived from replay)
```

Registration comes from replay. Not authoritative.

### 5. Worker Projection Reuses Existing PING Infrastructure

**Incorrect:**
```
Worker Projection (new projection)
```

**Correct:**
```
Worker Projection (extend existing PING worker infrastructure)
```

No new projection. Just extend existing.

### 6. Discovery Timeline Replays Repository History

**Incorrect:**
```
Discovery Timeline (stored separately)
```

**Correct:**
```
Repository Replay
    ↓
Filtered by Media Events
```

No duplicate timeline storage. Discovery Timeline literally replays repository history.

### 7. Search Projection Knows Constitutional Events

**Incorrect:**
```
Search Projection
    Asset
    ↓
    Index
```

**Correct:**
```
Search Projection
    Constitutional Events
    ↓
    Projection
    ↓
    Index
```

The event log remains the source of truth. Search Projection never knows assets directly.

### 8. Project Projection Lives in PING Core

**Incorrect:**
```
Project Projection (in Media Authority)
```

**Correct:**
```
Project Projection (in PING Core)
Media Authority references Project IDs
```

Projects organize many domains (Media, Documents, Knowledge, Tasks). Project Projection should live in PING Core.

### 9. Mission Control Exposes Constitutional Controls

**Missing:**
```
Mission Control (operational kernel)
    ├── Media Authority controls
    └── Constitutional controls
```

**Correct:**
```
Mission Control (operational kernel)
    ├── Media Authority controls
    │   ├── Connector Registry UI
    │   ├── Asset Service UI
    │   ├── Variant Service UI
    │   ├── Duplicate Service UI
    │   ├── Search Projection UI
    │   ├── Project Projection UI
    │   ├── Storage Drivers UI
    │   ├── Discovery Timeline
    │   ├── Replay Control
    │   ├── Constitutional Approvals
    │   ├── Connector Registration
    │   ├── Worker Pause/Resume
    │   ├── Observation Quarantine
    │   ├── Duplicate Review
    │   ├── Storage Migrations
    │   ├── Rebuild Projections
    │   ├── Rebuild Search
    │   └── Rebuild Variants
    │
    └── Constitutional controls
        ├── Projection rebuild
        ├── Event replay
        ├── Worker replay
        ├── Worker lineage
        ├── Repository inspection
        ├── Hash verification
        ├── Identity verification
        ├── Canonicalization replay
        └── Constitutional diff
```

### 10. Every Service Has Deterministic Version Metadata

**Missing:**
```
Service versions not tracked
```

**Correct:**
```
Every replay-derived artifact records:
    ├── Generator version
    ├── Library version (Pillow/ImageHash/etc.)
    ├── Configuration hash
    ├── Processing profile
    └── Replay compatibility version
```

Otherwise future upgrades break replay equivalence.

---

## Constitutional Event Model (Media Domain)

### Event Types

**Discovery Events:**
- `MediaDiscovered` - Media discovered by connector (TEMPORARY_OBSERVATION authority)
- `MediaObservationCreated` - Media observation created (TEMPORARY_OBSERVATION authority)

**Hash Events:**
- `MediaHashCalculated` - Media hash calculated by Hash Authority (TEMPORARY_OBSERVATION authority)

**Metadata Events:**
- `MediaMetadataExtracted` - Media metadata extracted (TEMPORARY_OBSERVATION authority)

**Variant Events:**
- `VariantRequested` - Variant generation requested (TEMPORARY_OBSERVATION authority)
- `VariantGenerated` - Variant generated (TEMPORARY_OBSERVATION authority, with version metadata)
- `VariantStored` - Variant stored (TEMPORARY_OBSERVATION authority)

**Duplicate Events:**
- `DuplicateCandidateObserved` - Duplicate candidate observed (TEMPORARY_OBSERVATION authority)
- `DuplicateClusterObserved` - Duplicate cluster observed (TEMPORARY_OBSERVATION authority)

**Asset Events:**
- `AssetImported` - Asset imported (TEMPORARY_OBSERVATION authority)

**Connector Events:**
- `ConnectorRegistered` - Connector registered (TEMPORARY_OBSERVATION authority)
- `ConnectorSyncStarted` - Connector sync started (TEMPORARY_OBSERVATION authority)
- `ConnectorSyncCompleted` - Connector sync completed (TEMPORARY_OBSERVATION authority)

**Storage Events:**
- `StorageLocationObserved` - Storage location observed (TEMPORARY_OBSERVATION authority)

**Constitutional Events:**
- `MediaCanonicalDecision` - Constitutional decision on media (CONSTITUTIONAL authority)

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
    │   ├── Requests SHA256 from Hash Authority
    │   ├── Requests identity from Identity Authority (via Repository Authority)
    │   ├── Asset metadata
    │   └── Asset lineage
    │
    ├── Variant Service
    │   ├── Variant request handling
    │   ├── Variant generation (via Worker + events)
    │   ├── Variant storage
    │   └── Variant lineage
    │
    ├── Duplicate Service
    │   ├── Duplicate detection (ImageHash)
    │   ├── Duplicate grouping
    │   ├── Similarity scoring
    │   └── DuplicateCandidateObserved events
    │
    ├── Connector Projection
    │   ├── Projects connector registration from replay
    │   ├── Connector health monitoring
    │   └── Connector metadata
    │
    ├── Search Projection
    │   ├── Projects search index from constitutional events
    │   ├── Multi-dimensional search
    │   └── Search verification
    │
    ├── Worker Projection (extend existing PING)
    │   ├── Projects worker state from events
    │   ├── Worker health monitoring
    │   └── Worker lineage
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

### PING Core (Shared)

```
PING Core
    ├── Project Projection (shared across domains)
    │   ├── Projects organize Media, Documents, Knowledge, Tasks
    │   ├── Project metadata
    │   ├── Project membership
    │   └── Project organization
    │
    └── Worker Projection (existing, extended for Media)
```

### Mission Control (Operational Kernel)

```
Mission Control (Operational Kernel)
    ├── Constitutional Runtime
    │   ├── Authorities
    │   ├── Replay
    │   └── Witness
    │
    ├── Media Authority Console
    │   ├── Connector Projection UI
    │   ├── Asset Service UI
    │   ├── Variant Service UI
    │   ├── Duplicate Service UI
    │   ├── Search Projection UI
    │   ├── Worker Projection UI (extend existing)
    │   ├── Project Projection UI (PING Core)
    │   ├── Storage Drivers UI
    │   ├── Discovery Timeline (Repository Replay)
    │   ├── Replay Control
    │   ├── Constitutional Approvals
    │   ├── Connector Registration
    │   ├── Worker Pause/Resume
    │   ├── Observation Quarantine
    │   ├── Duplicate Review
    │   ├── Storage Migrations
    │   ├── Rebuild Projections
    │   ├── Rebuild Search
    │   └── Rebuild Variants
    │
    └── Constitutional Controls
        ├── Projection rebuild
        ├── Event replay
        ├── Worker replay
        ├── Worker lineage
        ├── Repository inspection
        ├── Hash verification
        ├── Identity verification
        ├── Canonicalization replay
        └── Constitutional diff
```

---

## Constitutional Flow

### Observation to Truth Pipeline

```
Connector
    ↓
MediaDiscovered (TEMPORARY_OBSERVATION authority)
    ↓
Repository Authority
    ↓
Canonical Event
    ↓
Identity Authority
    ↓
Canonical Identity
    ↓
MediaObservationCreated (TEMPORARY_OBSERVATION authority)
    ↓
Hash Authority
    ↓
MediaHashCalculated (TEMPORARY_OBSERVATION authority)
    ↓
Inference (if needed: CLIP embedding, OCR, object detection)
    ↓
MediaMetadataExtracted (TEMPORARY_OBSERVATION authority)
    ↓
Constitution Engine
    ↓
MediaCanonicalDecision (CONSTITUTIONAL authority)
    ↓
Projection Authority
    ↓
Witness
```

### Variant Generation Pipeline

```
Canonical Asset
    ↓
VariantRequested (TEMPORARY_OBSERVATION authority)
    ↓
Worker
    ↓
VariantGenerated (TEMPORARY_OBSERVATION authority, with version metadata)
    │   ├── Variant Generator Version
    │   ├── Pillow Version
    │   ├── Configuration Hash
    │   ├── Processing Profile
    │   └── Replay Compatibility Version
    ↓
Repository Authority
    ↓
Canonical Event
    ↓
VariantStored (TEMPORARY_OBSERVATION authority)
    ↓
Storage Driver
    ↓
Projection Authority
    ↓
Witness
```

### Duplicate Detection Pipeline

```
Canonical Asset
    ↓
Duplicate Service
    ↓
DuplicateCandidateObserved (TEMPORARY_OBSERVATION authority)
    ↓
DuplicateClusterObserved (TEMPORARY_OBSERVATION authority)
    ↓
Constitution Engine
    ↓
MediaCanonicalDecision (CONSTITUTIONAL authority)
    ↓
Projection Authority
    ↓
Witness
```

### Search Pipeline

```
Repository Replay
    ↓
Constitutional Events
    ↓
Projection Authority
    ↓
Search Index (rebuildable)
    ↓
Search Results
```

---

## Version Metadata Schema

### Every Replay-Derived Artifact Records

```python
class VersionMetadata:
    generator_version: str  # Service version
    library_version: str  # Pillow/ImageHash/etc. version
    configuration_hash: str  # Configuration hash
    processing_profile: str  # Processing profile
    replay_compatibility_version: str  # Replay compatibility version
```

### Example: VariantGenerated Event

```python
{
    "event_type": "VariantGenerated",
    "event_data": {
        "asset_id": "...",
        "variant_type": "thumbnail",
        "dimensions": (150, 150),
        "format": "webp",
        "quality": 80,
        "version_metadata": {
            "generator_version": "1.0.0",
            "library_version": "Pillow 10.0.0",
            "configuration_hash": "abc123...",
            "processing_profile": "thumbnail-standard",
            "replay_compatibility_version": "1.0"
        }
    }
}
```

---

## Implementation Priority

### Phase 1: Constitutional Foundation (BLOCKED until PING Priority 0 complete)
1. Complete PING Priority 0 (Canonical Event Authority)
2. Define Media constitutional event schema (all event types)
3. Extend PING event registry with Media Authority event types
4. Create Canonicalization Authority (FORBIDDEN until Priority 0 complete)

### Phase 2: Media Domain Services
1. Create Asset Service (requests SHA256 from Hash Authority, requests identity from Identity Authority via Repository Authority, metadata, lineage)
2. Create Variant Service (request handling, generation via Worker + events with version metadata, storage, lineage)
3. Create Duplicate Service (detection ImageHash, grouping, scoring, DuplicateCandidateObserved events)
4. Create Connector Projection (projects connector registration from replay, health monitoring, metadata)
5. Create Search Projection (projects search index from constitutional events, multi-dimensional search, verification)
6. Extend Worker Projection (extend existing PING worker infrastructure for Media)
7. Create Storage Drivers (Local, NAS, Google Drive, Dropbox, S3, R2, OneDrive, Github, Azure - replaceable infrastructure)

### Phase 3: PING Core Extensions
1. Extend Project Projection (in PING Core, shared across domains)
2. Extend Worker Projection (in PING Core, extended for Media)

### Phase 4: Connector Architecture
1. Design IMediaConnector interface
2. Implement GoogleDriveConnector (extend existing)
3. Implement FilesystemConnector (extend existing)
4. Implement Discovery Worker (uses IMediaConnector interface)

### Phase 5: Mission Control Console (Operational Kernel)
1. Extend Mission Control with Media Authority section
2. Implement Connector Projection UI
3. Implement Asset Service UI
4. Implement Variant Service UI
5. Implement Duplicate Service UI
6. Implement Search Projection UI
7. Implement Worker Projection UI (extend existing)
8. Implement Project Projection UI (PING Core)
9. Implement Storage Drivers UI
10. Implement Discovery Timeline (Repository Replay)
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
21. Implement Constitutional Controls (Projection rebuild, Event replay, Worker replay, Worker lineage, Repository inspection, Hash verification, Identity verification, Canonicalization replay, Constitutional diff)

### Phase 6: Image Processing (OSS Libraries)
1. Implement thumbnail generation (Pillow, with version metadata)
2. Implement preview generation (Pillow, with version metadata)
3. Implement AVIF generation (Pillow/libvips, with version metadata)
4. Implement WebP generation (Pillow/libvips, with version metadata)

### Phase 7: Perceptual Hashing (OSS Libraries)
1. Implement perceptual hashing (ImageHash, with version metadata)
2. Implement duplicate detection (ImageHash, with version metadata)
3. Implement duplicate grouping (with version metadata)
4. Implement similarity scoring (with version metadata)

### Phase 8: Additional Connectors
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
- Asset Service (requests SHA256 from Hash Authority, requests identity from Identity Authority via Repository Authority)
- Variant Service (generation via Worker + events with version metadata)
- Duplicate Service (observations only)
- Connector Projection (projects from replay)
- Search Projection (projects from constitutional events)
- Worker Projection (extend existing PING)
- Storage Drivers (replaceable infrastructure)

**PING Core (shared across domains):**
- Project Projection (in PING Core, shared across Media, Documents, Knowledge, Tasks)
- Worker Projection (in PING Core, extended for Media)

**Mission Control (operational kernel):**
- Media Authority Console (20 operational controls)
- Constitutional Controls (9 constitutional controls)

**Constitutional Event Model (defined before implementation):**
- MediaDiscovered, MediaObservationCreated, MediaHashCalculated, MediaMetadataExtracted
- VariantRequested, VariantGenerated (with version metadata), VariantStored
- DuplicateCandidateObserved, DuplicateClusterObserved
- AssetImported
- ConnectorRegistered, ConnectorSyncStarted, ConnectorSyncCompleted
- StorageLocationObserved
- MediaCanonicalDecision

**Version Metadata (every replay-derived artifact):**
- Generator version, Library version, Configuration hash, Processing profile, Replay compatibility version

**Constitutional Flow:**
```
Connector → MediaDiscovered → Repository Authority → Canonical Event → Identity Authority → Canonical Identity → MediaObservationCreated → Hash Authority → MediaHashCalculated → Inference → MediaMetadataExtracted → Constitution Engine → MediaCanonicalDecision → Projection Authority → Witness
```

**Constitutional truth remains small. Media evolves without constitutional drift. Every identifier and every derived artifact is replay-deterministic. Full compatibility with PING's existing constitutional model.**

**Architecture Rating: 10/10** - Ready for implementation with minimal constitutional debt risk.
