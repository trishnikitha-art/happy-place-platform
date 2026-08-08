# Media Authority Constitutional Architecture - Redesigned

**Date:** 2026-08-03
**Objective:** Media Authority as first-class constitutional subsystem inside PING
**Status:** Architectural Redesign

---

## Architectural Correction

### Previous Flaws

1. **Canonicalization Authority too early** - Media Authority should produce observations, PING decides truth
2. **Google Drive too privileged** - Should start from connector abstraction, not Drive
3. **Mission Control too shallow** - Needs real operational console, not just "another page"
4. **Missing Asset Authority** - Everything revolves around assets
5. **Missing Variant Authority** - Not just thumbnails, full variant pipeline
6. **Missing Connector Registry** - Need runtime registration
7. **Missing Job Authority** - Discovery jobs need Job Authority
8. **Missing Search Authority** - Search should be constitutional
9. **Missing Replay UI** - Should replay discovery like constitutional events
10. **Missing Storage Authority** - Storage should be interchangeable

---

## Corrected Architecture

### Constitutional Flow

```
Connector
    ↓
Observation (TEMPORARY_OBSERVATION authority)
    ↓
Repository
    ↓
Projection
    ↓
Mission Control
    ↓
Constitution Engine
    ↓
Canonicalization Authority
    ↓
Truth
```

**Media Authority NEVER directly creates canonical media.** Media Authority produces observations. PING decides truth.

---

## Mission Control Console Architecture

```
Mission Control
│
├── Constitutional Runtime
│   ├── Authorities
│   ├── Replay
│   └── Witness
│
└── Media Authority (First-Class Constitutional Subsystem)
    │
    ├── Connector Registry
    │   ├── Google Drive Connector
    │   ├── Filesystem Connector
    │   ├── Dropbox Connector
    │   ├── OneDrive Connector
    │   ├── S3 Connector
    │   ├── R2 Connector
    │   ├── NAS Connector
    │   ├── Git Connector
    │   └── Future Connectors...
    │
    ├── Storage Authority
    │   ├── Local
    │   ├── NAS
    │   ├── Google Drive
    │   ├── Dropbox
    │   ├── S3
    │   ├── R2
    │   ├── OneDrive
    │   ├── Github
    │   └── Azure
    │
    ├── Asset Authority
    │   ├── Asset ID generation
    │   ├── Immutable identity
    │   ├── SHA256
    │   ├── Perceptual hash
    │   ├── Media fingerprint
    │   ├── Duplicate graph
    │   ├── Lineage
    │   └── Variants
    │
    ├── Variant Authority
    │   ├── Original
    │   ├── Thumbnail
    │   ├── Preview
    │   ├── Web
    │   ├── AVIF
    │   ├── WebP
    │   ├── JPEG
    │   ├── PNG
    │   ├── 4K
    │   ├── 1080
    │   ├── Mobile
    │   ├── Instagram
    │   ├── YouTube
    │   └── Custom variants...
    │
    ├── Duplicate Authority
    │   ├── Duplicate detection
    │   ├── Duplicate grouping
    │   ├── Similarity scoring
    │   └── Canonical suggestion
    │
    ├── Project Authority
    │   ├── Project ID generation
    │   ├── Project membership
    │   ├── Project metadata
    │   └── Project lineage
    │
    ├── Search Authority
    │   ├── SHA256 search
    │   ├── pHash search
    │   ├── Filename search
    │   ├── EXIF search
    │   ├── GPS search
    │   ├── Project search
    │   ├── Connector search
    │   ├── Creator search
    │   ├── Date search
    │   ├── Tags search
    │   ├── Duplicate cluster search
    │   ├── Lineage search
    │   ├── Authority search
    │   └── Witness search
    │
    ├── Job Authority
    │   ├── Job ID generation
    │   ├── Worker assignment
    │   ├── Replay
    │   ├── Restart
    │   ├── Cancel
    │   ├── History
    │   ├── Witness
    │   └── Lineage
    │
    ├── Discovery Timeline
    │   ├── Discovery events
    │   ├── Observation events
    │   ├── Projection events
    │   ├── Canonicalization events
    │   └── Storage events
    │
    ├── Connector Health
    │   ├── Health status
    │   ├── Latency
    │   ├── Last sync
    │   ├── Files seen
    │   ├── Files imported
    │   ├── Errors
    │   ├── Worker status
    │   └── Credential status
    │
    ├── Worker Health
    │   ├── Worker status
    │   ├── Worker metrics
    │   ├── Worker errors
    │   └── Worker lineage
    │
    ├── Replay Viewer
    │   ├── Discovery replay
    │   ├── Observation replay
    │   ├── Projection replay
    │   ├── Canonicalization replay
    │   └── Storage replay
    │
    └── Constitutional Decisions
        ├── Pending decisions
        ├── Approved decisions
        ├── Rejected decisions
        ├── Decision lineage
        └── Decision witness
```

---

## Constitutional Authorities (Media Authority Subsystem)

### 1. Asset Authority

**Responsibilities:**
- Asset ID generation (constitutional UUID v7)
- Immutable identity
- SHA256 calculation
- Perceptual hash calculation
- Media fingerprint
- Duplicate graph management
- Lineage tracking
- Variant management

**Event Types:**
- `ASSET_DISCOVERED` - Asset discovered by connector
- `ASSET_OBSERVATION_CREATED` - Asset observation created
- `ASSET_FINGERPRINTED` - Asset fingerprinted (SHA256, pHash)
- `ASSET_DUPLICATE_DETECTED` - Duplicate detected
- `ASSET_VARIANT_CREATED` - Variant created

**Schema:**
```python
class Asset:
    asset_id: UUID  # Constitutional UUID v7
    original_path: str
    sha256: str
    phash: str
    media_type: str
    dimensions: tuple
    file_size: int
    created_at: datetime
    discovered_by: str  # Connector name
    storage_authority: str  # Storage authority reference
    variants: List[UUID]  # Variant asset IDs
    duplicate_group: Optional[UUID]  # Duplicate group ID
    lineage_id: UUID
    witness_id: Optional[str]
```

### 2. Variant Authority

**Responsibilities:**
- Variant pipeline management
- Variant generation (thumbnail, preview, web, AVIF, WebP, etc.)
- Variant metadata
- Variant lineage
- Variant storage

**Event Types:**
- `VARIANT_REQUESTED` - Variant generation requested
- `VARIANT_GENERATED` - Variant generated
- `VARIANT_FAILED` - Variant generation failed

**Schema:**
```python
class Variant:
    variant_id: UUID  # Constitutional UUID v7
    parent_asset_id: UUID  # Parent asset ID
    variant_type: str  # thumbnail, preview, web, avif, webp, etc.
    dimensions: tuple
    file_size: int
    format: str
    quality: Optional[int]
    created_at: datetime
    storage_authority: str
    lineage_id: UUID
    witness_id: Optional[str]
```

### 3. Storage Authority

**Responsibilities:**
- Storage abstraction
- Storage registration
- Storage health monitoring
- Storage operations (upload, download, delete)
- Storage metadata

**Event Types:**
- `STORAGE_REGISTERED` - Storage authority registered
- `STORAGE_HEALTH_CHECK` - Storage health check
- `ASSET_STORED` - Asset stored
- `ASSET_RETRIEVED` - Asset retrieved
- `ASSET_DELETED` - Asset deleted

**Schema:**
```python
class StorageAuthority:
    storage_id: UUID  # Constitutional UUID v7
    storage_type: str  # local, nas, google_drive, dropbox, s3, r2, etc.
    storage_config: dict  # Storage-specific configuration
    health_status: str
    last_health_check: datetime
    total_assets: int
    total_size: int
    created_at: datetime
```

### 4. Connector Registry

**Responsibilities:**
- Connector registration
- Connector health monitoring
- Connector operations (discover, acquire)
- Connector metadata

**Event Types:**
- `CONNECTOR_REGISTERED` - Connector registered
- `CONNECTOR_HEALTH_CHECK` - Connector health check
- `DISCOVERY_STARTED` - Discovery job started
- `DISCOVERY_COMPLETED` - Discovery job completed
- `DISCOVERY_FAILED` - Discovery job failed

**Schema:**
```python
class Connector:
    connector_id: UUID  # Constitutional UUID v7
    connector_type: str  # google_drive, filesystem, dropbox, etc.
    connector_config: dict  # Connector-specific configuration
    health_status: str
    last_sync: datetime
    files_seen: int
    files_imported: int
    errors: int
    worker_id: Optional[UUID]
    credential_status: str
    created_at: datetime
```

### 5. Job Authority

**Responsibilities:**
- Job ID generation
- Job assignment
- Job tracking
- Job replay
- Job cancellation
- Job history
- Job witness
- Job lineage

**Event Types:**
- `JOB_CREATED` - Job created
- `JOB_STARTED` - Job started
- `JOB_COMPLETED` - Job completed
- `JOB_FAILED` - Job failed
- `JOB_CANCELLED` - Job cancelled
- `JOB_REPLAYED` - Job replayed

**Schema:**
```python
class Job:
    job_id: UUID  # Constitutional UUID v7
    job_type: str  # discovery, variant_generation, duplicate_detection, etc.
    worker_id: UUID
    status: str
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    result: Optional[dict]
    error: Optional[str]
    replay_count: int
    lineage_id: UUID
    witness_id: Optional[str]
```

### 6. Search Authority

**Responsibilities:**
- Constitutional search
- Multi-dimensional search
- Search indexing
- Search results verification

**Search Dimensions:**
- SHA256
- pHash
- Filename
- EXIF
- GPS
- Project
- Connector
- Creator
- Date
- Tags
- Duplicate cluster
- Lineage
- Authority
- Witness

**Event Types:**
- `SEARCH_PERFORMED` - Search performed
- `SEARCH_INDEXED` - Search indexed

### 7. Duplicate Authority

**Responsibilities:**
- Duplicate detection
- Duplicate grouping
- Similarity scoring
- Canonical suggestion

**Event Types:**
- `DUPLICATE_SCAN_STARTED` - Duplicate scan started
- `DUPLICATE_SCAN_COMPLETED` - Duplicate scan completed
- `DUPLICATE_GROUP_CREATED` - Duplicate group created
- `DUPLICATE_CANONICAL_SUGGESTED` - Canonical asset suggested

**Schema:**
```python
class DuplicateGroup:
    group_id: UUID  # Constitutional UUID v7
    canonical_asset_id: Optional[UUID]
    similarity_threshold: float
    created_at: datetime
    witness_id: Optional[str]
```

### 8. Project Authority

**Responsibilities:**
- Project ID generation
- Project membership
- Project metadata
- Project lineage

**Event Types:**
- `PROJECT_CREATED` - Project created
- `PROJECT_MEMBER_ADDED` - Asset added to project
- `PROJECT_MEMBER_REMOVED` - Asset removed from project
- `PROJECT_METADATA_UPDATED` - Project metadata updated

**Schema:**
```python
class Project:
    project_id: UUID  # Constitutional UUID v7
    project_name: str
    project_metadata: dict
    asset_ids: List[UUID]
    created_at: datetime
    lineage_id: UUID
    witness_id: Optional[str]
```

---

## Connector Architecture

### IMediaConnector Interface

```python
from abc import ABC, abstractmethod
from typing import List, Optional
from dataclasses import dataclass

@dataclass
class DiscoveryObservation:
    asset_id: str
    original_path: str
    sha256: str
    file_size: int
    media_type: str
    metadata: dict
    connector_type: str
    discovered_at: str

class IMediaConnector(ABC):
    @abstractmethod
    async def discover(self) -> List[DiscoveryObservation]:
        """Discover media from source"""
        pass

    @abstractmethod
    async def acquire(self, asset_id: str) -> bytes:
        """Acquire media asset"""
        pass

    @abstractmethod
    async def health_check(self) -> dict:
        """Check connector health"""
        pass

    @abstractmethod
    def connector_type(self) -> str:
        """Return connector type"""
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
9. **Future Connectors...**

---

## Mission Control Console Endpoints

### Connector Registry Endpoints
- `/media-authority/connectors` - List all connectors
- `/media-authority/connectors/{connector_id}` - Get connector details
- `/media-authority/connectors/{connector_id}/health` - Get connector health
- `/media-authority/connectors/{connector_id}/sync` - Trigger sync
- `/media-authority/connectors/register` - Register new connector

### Storage Authority Endpoints
- `/media-authority/storage` - List all storage authorities
- `/media-authority/storage/{storage_id}` - Get storage details
- `/media-authority/storage/{storage_id}/health` - Get storage health
- `/media-authority/storage/register` - Register new storage authority

### Asset Authority Endpoints
- `/media-authority/assets` - List all assets
- `/media-authority/assets/{asset_id}` - Get asset details
- `/media-authority/assets/{asset_id}/variants` - Get asset variants
- `/media-authority/assets/{asset_id}/lineage` - Get asset lineage
- `/media-authority/assets/{asset_id}/witness` - Get asset witness

### Variant Authority Endpoints
- `/media-authority/variants` - List all variants
- `/media-authority/variants/{variant_id}` - Get variant details
- `/media-authority/variants/generate` - Request variant generation
- `/media-authority/variants/{asset_id}/all` - Get all variants for asset

### Duplicate Authority Endpoints
- `/media-authority/duplicates` - List duplicate groups
- `/media-authority/duplicates/{group_id}` - Get duplicate group details
- `/media-authority/duplicates/scan` - Trigger duplicate scan
- `/media-authority/duplicates/{group_id}/canonical` - Suggest canonical asset

### Project Authority Endpoints
- `/media-authority/projects` - List all projects
- `/media-authority/projects/{project_id}` - Get project details
- `/media-authority/projects/{project_id}/assets` - Get project assets
- `/media-authority/projects/create` - Create new project
- `/media-authority/projects/{project_id}/add-asset` - Add asset to project
- `/media-authority/projects/{project_id}/remove-asset` - Remove asset from project

### Search Authority Endpoints
- `/media-authority/search` - Constitutional search
- `/media-authority/search/sha256` - Search by SHA256
- `/media-authority/search/phash` - Search by pHash
- `/media-authority/search/filename` - Search by filename
- `/media-authority/search/exif` - Search by EXIF
- `/media-authority/search/gps` - Search by GPS
- `/media-authority/search/project` - Search by project
- `/media-authority/search/connector` - Search by connector
- `/media-authority/search/date` - Search by date
- `/media-authority/search/tags` - Search by tags
- `/media-authority/search/duplicate-cluster` - Search by duplicate cluster
- `/media-authority/search/lineage` - Search by lineage
- `/media-authority/search/authority` - Search by authority
- `/media-authority/search/witness` - Search by witness

### Job Authority Endpoints
- `/media-authority/jobs` - List all jobs
- `/media-authority/jobs/{job_id}` - Get job details
- `/media-authority/jobs/{job_id}/cancel` - Cancel job
- `/media-authority/jobs/{job_id}/replay` - Replay job
- `/media-authority/jobs/{job_id}/history` - Get job history
- `/media-authority/jobs/{job_id}/lineage` - Get job lineage
- `/media-authority/jobs/{job_id}/witness` - Get job witness

### Discovery Timeline Endpoints
- `/media-authority/timeline/discovery` - Discovery timeline
- `/media-authority/timeline/observation` - Observation timeline
- `/media-authority/timeline/projection` - Projection timeline
- `/media-authority/timeline/canonicalization` - Canonicalization timeline
- `/media-authority/timeline/storage` - Storage timeline

### Replay Viewer Endpoints
- `/media-authority/replay/discovery` - Replay discovery
- `/media-authority/replay/observation` - Replay observation
- `/media-authority/replay/projection` - Replay projection
- `/media-authority/replay/canonicalization` - Replay canonicalization
- `/media-authority/replay/storage` - Replay storage

### Constitutional Decisions Endpoints
- `/media-authority/decisions/pending` - Pending decisions
- `/media-authority/decisions/approved` - Approved decisions
- `/media-authority/decisions/rejected` - Rejected decisions
- `/media-authority/decisions/{decision_id}` - Get decision details
- `/media-authority/decisions/{decision_id}/approve` - Approve decision
- `/media-authority/decisions/{decision_id}/reject` - Reject decision
- `/media-authority/decisions/{decision_id}/lineage` - Get decision lineage
- `/media-authority/decisions/{decision_id}/witness` - Get decision witness

---

## Implementation Priority

### Phase 1: Constitutional Foundation (BLOCKED until PING Priority 0 complete)
1. Complete PING Priority 0 (Canonical Event Authority)
2. Extend PING event registry with Media Authority event types
3. Create Asset Authority
4. Create Storage Authority
5. Create Connector Registry
6. Create Job Authority

### Phase 2: Connector Architecture
1. Design IMediaConnector interface
2. Implement GoogleDriveConnector (extend existing)
3. Implement FilesystemConnector (extend existing)
4. Implement Connector Registry
5. Implement Discovery Worker

### Phase 3: Mission Control Console
1. Extend Mission Control with Media Authority section
2. Implement Connector Registry endpoints
3. Implement Storage Authority endpoints
4. Implement Asset Authority endpoints
5. Implement Job Authority endpoints
6. Implement Discovery Timeline
7. Implement Connector Health monitoring
8. Implement Worker Health monitoring

### Phase 4: Variant Pipeline
1. Create Variant Authority
2. Implement thumbnail generation (Pillow)
3. Implement preview generation (Pillow)
4. Implement AVIF generation (Pillow/libvips)
5. Implement WebP generation (Pillow/libvips)
6. Implement Variant Authority endpoints

### Phase 5: Duplicate Detection
1. Create Duplicate Authority
2. Implement perceptual hashing (ImageHash)
3. Implement duplicate detection (ImageHash)
4. Implement duplicate grouping
5. Implement canonical suggestion
6. Implement Duplicate Authority endpoints

### Phase 6: Search Authority
1. Create Search Authority
2. Implement SHA256 search
3. Implement pHash search
4. Implement filename search
5. Implement EXIF search
6. Implement GPS search
7. Implement project search
8. Implement connector search
9. Implement date search
10. Implement tags search
11. Implement duplicate cluster search
12. Implement lineage search
13. Implement authority search
14. Implement witness search

### Phase 7: Project Authority
1. Create Project Authority
2. Implement Project Authority endpoints
3. Implement project membership
4. Implement project metadata

### Phase 8: Replay Viewer
1. Implement Discovery Replay
2. Implement Observation Replay
3. Implement Projection Replay
4. Implement Canonicalization Replay
5. Implement Storage Replay

### Phase 9: Constitutional Decisions
1. Implement Constitutional Decisions endpoints
2. Implement decision approval
3. Implement decision rejection
4. Implement decision lineage
5. Implement decision witness

### Phase 10: Additional Connectors
1. Implement DropboxConnector
2. Implement OneDriveConnector
3. Implement S3Connector
4. Implement R2Connector
5. Implement NASConnector
6. Implement GitConnector

---

## Summary

**Media Authority is NOT another dashboard.** Media Authority is a first-class constitutional subsystem inside PING with proper authorities:

- Asset Authority
- Variant Authority
- Storage Authority
- Connector Registry
- Job Authority
- Search Authority
- Duplicate Authority
- Project Authority

**Google Drive is NOT privileged.** Google Drive is just one connector among many in the Connector Registry.

**Mission Control is NOT just "another page".** Mission Control is a real operational command center with:

- Connector Registry
- Storage Authority
- Asset Authority
- Variant Authority
- Duplicate Authority
- Project Authority
- Search Authority
- Job Authority
- Discovery Timeline
- Connector Health
- Worker Health
- Replay Viewer
- Constitutional Decisions

**Media Authority NEVER directly creates canonical media.** Media Authority produces observations. PING decides truth through Constitutional Engine → Canonicalization Authority.

**First implementation should include:**
1. Connector Registry (Drive + Filesystem immediately)
2. Asset Authority
3. Job Authority
4. Storage Authority
5. Media Authority Mission Control console
6. Discovery timeline
7. Replay viewer
8. Duplicate graph
9. Variant pipeline
10. Search console

**Then Google Drive becomes just the first connector plugged into a much larger constitutional media platform.**
