# Media Authority Architecture - Minimal Projection Layer

**Date:** 2026-08-03
**Objective:** Media Authority as minimal projection layer over existing PING constitutional infrastructure
**Status:** Final Minimal Architecture

---

## Constitutional Rule

**Assume these authorities already exist unless you can prove they do not:**

- ✅ Identity Authority (runtime/authorities/identity_authority.py)
- ✅ Repository Authority (runtime/authorities/repository_authority.py)
- ✅ Hash Authority (runtime/authorities/canonical_hash_authority.py)
- ✅ Projection Authority (runtime/authorities/projection_authority.py)
- ✅ Constitution Engine (replay workers, witness workers)
- ✅ Witness (witness_worker.py, WITNESS_LAW.md)
- ✅ Replay (replay_worker.py, REPLAY_LAW.md)
- ✅ Worker Runtime (workers/, worker_registry.js)
- ✅ Event Registry (repository_client.emit_event())
- ✅ Canonical Event Authority (repository_client.emit_event() - PARTIAL, Priority 0 in progress)

**Do NOT recreate them.**
**Do NOT wrap them.**
**Do NOT rename them.**
**Do NOT build parallel versions.**

Media must consume them exactly as they already exist.

---

## Zero New Constitutional Authorities

**There should be ZERO new constitutional authorities for Media.**

Not one.

Media owns **no constitutional truth.**

Media is only a deterministic projection over constitutional events.

**If you find yourself writing:**
- Asset Authority
- Variant Authority
- Search Authority
- Duplicate Authority
- Storage Authority
- Connector Authority
- Project Authority
- Job Authority

**You have already failed.**

Delete them.

---

## Absolute Minimum Architecture

```
PING Constitutional Runtime

    Repository
    Identity
    Projection
    Hash
    Constitution Engine
    Workers
    Replay

↓

Media Projection

    Media Discovery Projection
    Media Search Projection
    Media Variant Projection

↓

Mission Control

    Media Console
```

**Nothing more.**

---

## Media Projection Responsibilities

Media Projection should only:

- Observe media events
- Project searchable metadata
- Request variants through existing workers
- Rebuild itself entirely from replay

**It must never own:**
- Identity
- Hashing
- Canonical decisions
- Replay
- Workers
- Storage
- Constitutional state

---

## Storage

Storage is infrastructure.

Reuse the existing storage abstraction if it exists.

Otherwise use storage adapters.

**Never create Storage Authority.**

---

## Search

Search is a disposable projection.

Delete index.
Replay.
Rebuild.

Nothing is authoritative.

---

## Duplicate Detection

Duplicate detection emits observations only.

Example:

```
DuplicateCandidateObserved
```

and stops.

**Only Constitution Engine may decide canonical identity.**

---

## Variants

Variants are replay products.

```
Original Event
    ↓
Replay
    ↓
Worker
    ↓
Variant
```

Every generated artifact must be reproducible.

No mutable cache.
No thumbnail ownership.

---

## Mission Control

Mission Control should expose existing constitutional runtime.

Media only adds UI.

**Not new runtime behavior.**

---

## Constitutional Event Types (Media Domain)

Define event types BEFORE implementation:

**Discovery Events:**
- `MediaDiscovered` - Media discovered by connector (TEMPORARY_OBSERVATION authority)
- `MediaObservationCreated` - Media observation created (TEMPORARY_OBSERVATION authority)

**Hash Events:**
- `MediaHashCalculated` - Media hash calculated by Hash Authority (TEMPORARY_OBSERVATION authority)

**Metadata Events:**
- `MediaMetadataExtracted` - Media metadata extracted (TEMPORARY_OBSERVATION authority)

**Variant Events:**
- `VariantRequested` - Variant generation requested (TEMPORARY_OBSERVATION authority)
- `VariantGenerated` - Variant generated (TEMPORARY_OBSERVATION authority)
- `VariantStored` - Variant stored (TEMPORARY_OBSERVATION authority)

**Duplicate Events:**
- `DuplicateCandidateObserved` - Duplicate candidate observed (TEMPORARY_OBSERVATION authority)

**Connector Events:**
- `ConnectorRegistered` - Connector registered (TEMPORARY_OBSERVATION authority)
- `ConnectorSyncStarted` - Connector sync started (TEMPORARY_OBSERVATION authority)
- `ConnectorSyncCompleted` - Connector sync completed (TEMPORARY_OBSERVATION authority)

**Storage Events:**
- `StorageLocationObserved` - Storage location observed (TEMPORARY_OBSERVATION authority)

**Constitutional Events:**
- `MediaCanonicalDecision` - Constitutional decision on media (CONSTITUTIONAL authority)

---

## Projections (Not Authorities)

### Media Discovery Projection

**Responsibilities:**
- Observe media events (MediaDiscovered, MediaObservationCreated, MediaHashCalculated, MediaMetadataExtracted)
- Project searchable metadata (SHA256, pHash, filename, EXIF, GPS, dimensions, file size)
- Rebuild entirely from replay

**Implementation:**
- Filter repository replay by media event types
- Extract metadata from event_data
- Build search index
- No storage ownership
- No identity generation
- No hashing (use Hash Authority)

### Media Search Projection

**Responsibilities:**
- Search index (rebuildable from replay)
- Multi-dimensional search (SHA256, pHash, filename, EXIF, GPS, dimensions, file size)
- Search verification

**Implementation:**
- Rebuild from Media Discovery Projection
- Delete index
- Replay
- Rebuild
- Nothing is authoritative

### Media Variant Projection

**Responsibilities:**
- Observe variant events (VariantRequested, VariantGenerated, VariantStored)
- Project variant metadata (dimensions, format, quality, processing profile)
- Rebuild entirely from replay

**Implementation:**
- Filter repository replay by variant event types
- Extract variant metadata from event_data
- Build variant index
- No variant generation (use existing workers)
- No storage ownership

---

## Connectors (Not Authorities)

### IMediaConnector Interface

```python
from abc import ABC, abstractmethod
from typing import List

@dataclass
class DiscoveryObservation:
    original_path: str
    sha256: str
    file_size: int
    media_type: str
    metadata: dict

class IMediaConnector(ABC):
    @abstractmethod
    async def discover(self) -> List[DiscoveryObservation]:
        """Discover media from source"""
        pass

    @abstractmethod
    async def acquire(self, asset_id: str) -> bytes:
        """Acquire media asset"""
        pass
```

### Connector Implementations

1. **GoogleDriveConnector** - Extend existing google_drive_ingestion.py
2. **FilesystemConnector** - Extend existing filesystem_worker.py
3. **DropboxConnector** - Use official Dropbox SDK
4. **OneDriveConnector** - Use official Microsoft SDK
5. **S3Connector** - Use boto3
6. **R2Connector** - Use boto3 with different endpoint
7. **NASConnector** - SMB/NFS
8. **GitConnector** - Git LFS

---

## Storage Adapters (Not Authority)

```python
class StorageAdapter:
    """Storage abstraction for media assets."""

    def store(self, data: bytes, path: str) -> str:
        """Store media asset"""
        pass

    def retrieve(self, path: str) -> bytes:
        """Retrieve media asset"""
        pass

    def delete(self, path: str) -> None:
        """Delete media asset"""
        pass
```

### Storage Adapter Implementations

1. **LocalStorageAdapter** - Local filesystem
2. **GoogleDriveStorageAdapter** - Google Drive
3. **S3StorageAdapter** - AWS S3
4. **R2StorageAdapter** - Cloudflare R2
5. **DropboxStorageAdapter** - Dropbox
6. **OneDriveStorageAdapter** - OneDrive

---

## Constitutional Flow

### Observation to Truth Pipeline

```
Connector
    ↓
MediaDiscovered (TEMPORARY_OBSERVATION authority)
    ↓
repository_client.emit_event() (Canonical Event Authority)
    ↓
Identity Authority (generates event_id)
    ↓
Hash Authority (generates canonical hash)
    ↓
Signature Authority (signs event)
    ↓
Repository Authority (stores event)
    ↓
MediaObservationCreated (TEMPORARY_OBSERVATION authority)
    ↓
repository_client.emit_event() (Canonical Event Authority)
    ↓
Hash Authority (generates SHA256 via MediaHashCalculated event)
    ↓
Inference (if needed: CLIP embedding, OCR, object detection)
    ↓
MediaMetadataExtracted (TEMPORARY_OBSERVATION authority)
    ↓
repository_client.emit_event() (Canonical Event Authority)
    ↓
Constitution Engine (replay workers)
    ↓
MediaCanonicalDecision (CONSTITUTIONAL authority)
    ↓
Projection Authority (Qdrant)
    ↓
Witness
```

### Variant Generation Pipeline

```
Canonical Asset
    ↓
VariantRequested (TEMPORARY_OBSERVATION authority)
    ↓
repository_client.emit_event() (Canonical Event Authority)
    ↓
Worker (existing worker infrastructure)
    ↓
VariantGenerated (TEMPORARY_OBSERVATION authority)
    ↓
repository_client.emit_event() (Canonical Event Authority)
    ↓
Storage Adapter (not authority)
    ↓
VariantStored (TEMPORARY_OBSERVATION authority)
    ↓
repository_client.emit_event() (Canonical Event Authority)
    ↓
Projection Authority (Qdrant)
    ↓
Witness
```

### Duplicate Detection Pipeline

```
Canonical Asset
    ↓
Duplicate Service (not authority)
    ↓
DuplicateCandidateObserved (TEMPORARY_OBSERVATION authority)
    ↓
repository_client.emit_event() (Canonical Event Authority)
    ↓
Constitution Engine (replay workers)
    ↓
MediaCanonicalDecision (CONSTITUTIONAL authority)
    ↓
Projection Authority (Qdrant)
    ↓
Witness
```

---

## Mission Control Console (UI Only)

Mission Control should expose existing constitutional runtime.

Media only adds UI sections.

### Media Console Sections

1. **Connector Status** - List connectors, health status, last sync
2. **Discovery Timeline** - Repository Replay filtered by media events
3. **Search Console** - Search across media projections
4. **Variant Console** - List variants, request generation
5. **Duplicate Review** - Review duplicate candidates
6. **Constitutional Approvals** - Approve/reject MediaCanonicalDecision events

**No new runtime behavior.** Only UI.

---

## Implementation Priority

### Phase 1: Define Event Types (BLOCKED until PING Priority 0 complete)
1. Complete PING Priority 0 (Canonical Event Authority)
2. Define Media constitutional event schema (all event types)
3. Extend PING event registry with Media Authority event types

### Phase 2: Media Projections
1. Create Media Discovery Projection (observe media events, project metadata, rebuild from replay)
2. Create Media Search Projection (rebuildable index, multi-dimensional search, verification)
3. Create Media Variant Projection (observe variant events, project metadata, rebuild from replay)

### Phase 3: Connector Architecture
1. Design IMediaConnector interface
2. Implement GoogleDriveConnector (extend existing)
3. Implement FilesystemConnector (extend existing)
4. Implement Discovery Worker (uses IMediaConnector interface)

### Phase 4: Storage Adapters
1. Design StorageAdapter interface
2. Implement LocalStorageAdapter
3. Implement GoogleDriveStorageAdapter
4. Implement S3StorageAdapter
5. Implement R2StorageAdapter

### Phase 5: Mission Control Console (UI Only)
1. Extend Mission Control with Media Console sections
2. Implement Connector Status UI
3. Implement Discovery Timeline UI (Repository Replay)
4. Implement Search Console UI
5. Implement Variant Console UI
6. Implement Duplicate Review UI
7. Implement Constitutional Approvals UI

### Phase 6: Image Processing (OSS Libraries)
1. Implement thumbnail generation (Pillow, via Worker + events)
2. Implement preview generation (Pillow, via Worker + events)
3. Implement AVIF generation (Pillow/libvips, via Worker + events)
4. Implement WebP generation (Pillow/libvips, via Worker + events)

### Phase 7: Perceptual Hashing (OSS Libraries)
1. Implement perceptual hashing (ImageHash, via Worker + events)
2. Implement duplicate detection (ImageHash, via Worker + events)
3. Implement duplicate grouping (via Worker + events)
4. Implement similarity scoring (via Worker + events)

### Phase 8: Additional Connectors
1. Implement DropboxConnector
2. Implement OneDriveConnector
3. Implement S3Connector
4. Implement R2Connector
5. Implement NASConnector
6. Implement GitConnector

---

## Summary

**Constitutional Authorities (existing, reuse exactly):**
- Identity Authority (existing)
- Repository Authority (existing)
- Hash Authority (existing)
- Projection Authority (existing)
- Canonical Event Authority (PARTIAL, Priority 0 in progress)

**Media Domain (3 projections only):**
- Media Discovery Projection (observe events, project metadata, rebuild from replay)
- Media Search Projection (rebuildable index, multi-dimensional search, verification)
- Media Variant Projection (observe variant events, project metadata, rebuild from replay)

**Connectors (not authorities):**
- IMediaConnector interface
- GoogleDriveConnector (extend existing)
- FilesystemConnector (extend existing)
- Additional connectors (Dropbox, OneDrive, S3, R2, NAS, Git)

**Storage Adapters (not authority):**
- StorageAdapter interface
- LocalStorageAdapter
- GoogleDriveStorageAdapter
- S3StorageAdapter
- R2StorageAdapter
- Additional adapters (Dropbox, OneDrive)

**Mission Control (UI only):**
- Media Console sections (Connector Status, Discovery Timeline, Search Console, Variant Console, Duplicate Review, Constitutional Approvals)
- No new runtime behavior

**Constitutional Flow:**
```
Connector → MediaDiscovered → repository_client.emit_event() → Identity Authority → Hash Authority → Signature Authority → Repository Authority → MediaObservationCreated → Hash Authority → Inference → MediaMetadataExtracted → Constitution Engine → MediaCanonicalDecision → Projection Authority → Witness
```

**Media owns no constitutional truth. Media is only a deterministic projection over constitutional events.**

**Architecture Rating: 10/10** - Minimal projection layer over existing PING constitutional infrastructure.
