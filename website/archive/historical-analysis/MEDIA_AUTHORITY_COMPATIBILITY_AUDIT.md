# Media Authority Compatibility Audit

**Date:** 2026-08-03
**Objective:** Determine what Media can reuse from existing PING constitutional infrastructure
**Status:** EXHAUSTIVE SEARCH COMPLETE

---

## Section 1: Everything Media Can Already Reuse from PING

### Constitutional Authorities (Reuse Exactly)

| Authority | Location | Status | Media Reuse |
|-----------|----------|--------|-------------|
| **Identity Authority** | runtime/authorities/identity_authority.py | COMPLETE | ✅ Media uses for all ID generation |
| **Repository Authority** | runtime/authorities/repository_authority.py | COMPLETE | ✅ Media uses for all event storage |
| **Hash Authority** | runtime/authorities/canonical_hash_authority.py | COMPLETE | ✅ Media uses for all hashing (SHA256, pHash) |
| **Projection Authority** | runtime/authorities/projection_authority.py | COMPLETE | ✅ Media uses for all projection (Qdrant) |
| **Canonical Event Authority** | workers/repository_client.py | PARTIAL (Priority 0 in progress) | ✅ Media uses for all event emission |

### Object Store (Reuse Exactly)

**Location:** brainos/orchestration/docs/architecture/OBJECT_STORE.md

**Capabilities:**
- Content-addressable identification (SHA256)
- Immutable objects (never modified or deleted)
- Git-style layout (first 2 chars of hash as directory)
- Path transparency (objects never referenced by path)
- Object identity model (object_id, content_hash, created_at, version, lineage_id, content_type, content_size, metadata)
- Deduplication (same content hash = same object)
- Storage migration support
- S3, MinIO, distributed filesystem support

**Media Reuse:**
- ✅ Media uses for all media file storage
- ✅ Media uses SHA256 as content hash (no new hashing)
- ✅ Media uses object_id for all media references
- ✅ Media uses lineage_id for variant tracking
- ✅ Media uses content_type for media type (image/jpeg, image/png, video/mp4, etc.)
- ✅ Media uses content_size for file size
- ✅ Media uses metadata for EXIF, GPS, dimensions, etc.

### Connector Interface v2 (Reuse Exactly)

**Location:** runtime/acquisition/src/connector-interface-v2.ts

**Capabilities:**
- IConnector interface (getProvider, initialize, collect, validate, disconnect)
- ConnectorConfig (provider, client_id, client_secret, additional_config)
- AuthenticatedSession (provider, access_token, expires_at, user_id, email)
- RawProviderData (provider, provider_id, data, collected_at, resource_type)
- CollectionParams (resources, since, limit, filters)
- CollectionResult (success, data, error, failure_code)
- BaseConnector abstract class

**Media Reuse:**
- ✅ Media uses IConnector interface for all media connectors
- ✅ Media uses ConnectorConfig for connector configuration
- ✅ Media uses AuthenticatedSession for OAuth sessions
- ✅ Media uses RawProviderData for raw media data from providers
- ✅ Media uses CollectionParams for discovery parameters
- ✅ Media uses CollectionResult for discovery results
- ✅ Media extends BaseConnector for all connector implementations

### Acquisition Manager v2 (Reuse Exactly)

**Location:** runtime/acquisition/src/acquisition-manager-v2.ts

**Capabilities:**
- Orchestrates evidence acquisition from multiple connectors
- Separates authentication from collection
- CompilerRegistry for evidence compilation
- Constitutional Pipeline for canonicalization
- Support for Google, GitHub, Microsoft compilers
- Batch collection from multiple providers
- Connector validation
- Provider discovery

**Media Reuse:**
- ✅ Media uses AcquisitionManager for all media acquisition
- ✅ Media uses CompilerRegistry for media evidence compilation
- ✅ Media uses Constitutional Pipeline for media canonicalization
- ✅ Media extends with MediaEvidenceCompiler for media-specific compilation

### Evidence Types (Reuse Exactly)

**Location:** runtime/evidence/src/types.ts

**Capabilities:**
- CanonicalEvidenceBase (evidence_id, content_id, evidence_type, provider_id, provider_evidence_id, acquired_at, acquired_by, confidence, verification_status, source_trust, schema_version, canonical_hash, replay_hash)
- IdentityEvidence (identity information)
- CapabilityEvidence (capability information)
- KnowledgeEvidence (knowledge information)

**Media Reuse:**
- ✅ Media extends CanonicalEvidenceBase with MediaEvidence
- ✅ Media uses knowledge evidence structure for media (content_id, content_type, content_format, title, description, content_url, content_path, container_id, container_name, author_id, author_name, size_bytes, word_count, line_count, access_level, access_url, parent_id, child_ids, related_ids, content_hash, content_preview, content_summary)
- ✅ Media adds media-specific fields (dimensions, pHash, EXIF, GPS, etc.) to metadata

### Evidence Pipeline (Reuse Exactly)

**Location:** runtime/evidence/src/pipeline.ts

**Capabilities:**
- Validation → Normalization → Canonicalization → Hash Generation
- Deterministic, replay-safe, constitutional
- Uses constitutional authorities (HashAuthority, FailureAuthority, ConstitutionalTimeAuthority)
- EvidencePipelineResult (success, evidence, errors, warnings)
- ID generation (evidence_id, content_id, canonical_hash, replay_hash)
- Content hash generation

**Media Reuse:**
- ✅ Media uses EvidencePipeline for all media evidence processing
- ✅ Media uses constitutional authorities (no new hashing, no new time)
- ✅ Media uses ID generation (no new ID generation)
- ✅ Media uses content hash generation (no new SHA256 computation)

### Event Sourcing (Reuse Exactly)

**Location:** brainos/orchestration/docs/architecture/EVENT_SOURCING.md

**Capabilities:**
- Append-only event log
- Immutable events
- Reconstructable state
- Ordered events
- Event structure (event_id, event_type, timestamp, aggregate_id, aggregate_type, event_data, causation_id, correlation_id, metadata)
- Event types (OBJECT_CREATED, OBJECT_UPDATED, OBJECT_VERSIONED, FILE_INGESTED, ENTITY_CREATED, RELATIONSHIP_CREATED, PROJECTION_REBUILT, SYSTEM_EVENT)
- Event replay
- Event handlers
- Temporal queries
- Event range queries
- Aggregate queries

**Media Reuse:**
- ✅ Media uses event sourcing for all media events
- ✅ Media uses event structure (no new event structure)
- ✅ Media uses FILE_INGESTED for media ingestion
- ✅ Media uses OBJECT_CREATED for media object creation
- ✅ Media uses OBJECT_VERSIONED for variant creation
- ✅ Media uses event replay for media projection rebuilding
- ✅ Media uses temporal queries for media history

### Repository Replay (Reuse Exactly)

**Location:** workers/simple_replay.py, REPLAY_LAW.md

**Capabilities:**
- Deterministic replay
- Reproducible replay
- Idempotent replay
- Replay state machine
- State verification
- Event verification
- Replay guarantees (determinism, reproducibility, idempotence)

**Media Reuse:**
- ✅ Media uses repository replay for all media projection rebuilding
- ✅ Media uses replay determinism (no new replay logic)
- ✅ Media uses replay verification (no new verification logic)

### Worker Runtime (Reuse Exactly)

**Location:** workers/, worker_registry.js

**Capabilities:**
- Worker lifecycle (register, start, complete, fail, unregister)
- Event-sourced worker state
- Replayable worker state reconstruction
- Worker projection
- Worker health monitoring

**Media Reuse:**
- ✅ Media uses worker runtime for all media workers
- ✅ Media uses worker lifecycle (no new worker infrastructure)
- ✅ Media uses worker projection (no new worker projection)
- ✅ Media uses worker health monitoring (no new worker health monitoring)

### PostgreSQL Schema (Reuse Exactly)

**Location:** SCHEMA_REALITY.md

**Capabilities:**
- events table (event_id, event_type, event_data, timestamp, aggregate_id, aggregate_type)
- artifact_registry table (artifact_id, sha256, lineage_root, witness_root)
- authority_objects table (artifact_id, authority_level, title, description, created_at)
- authority_lineage table (ancestor, descendant, relation, metadata)
- lineage table (lineage_id, parent_id, child_id, lineage_type, metadata)
- projections table (payload, payload_hash, projection_hash, created_at)
- authority_supersession table (superseded, superseded_by)
- authority_witness table (artifact_id, witness_root, created_at)
- objects table (object_id, content_hash, lineage_id)

**Media Reuse:**
- ✅ Media uses events table for all media events
- ✅ Media uses artifact_registry for media artifacts
- ✅ Media uses objects table for media objects
- ✅ Media uses lineage table for variant lineage
- ✅ Media uses projections table for media projections
- ✅ No new tables needed

### Mission Control Dashboard (Reuse Exactly)

**Location:** brainos/orchestration/src/mission_control/app.py

**Capabilities:**
- FastAPI application
- 32 existing endpoints
- Health check, infrastructure status, credentials inventory, memory stats, constitutional ingestion/retrieve/documents/query/search/authority, Google Drive status/ingest, web retrieval status/search/pipeline, events recent/summary, lineage graph, replay status, backup status/manual/verify/restore-verify, models capabilities/validate, reasoning health, continuity status, qdrant health, inference models

**Media Reuse:**
- ✅ Media extends Mission Control with Media Authority console section
- ✅ Media uses existing FastAPI application (no new application)
- ✅ Media uses existing health check infrastructure (no new health check)
- ✅ Media uses existing infrastructure status (no new infrastructure monitoring)

### Google Drive Ingestion (Reuse Exactly)

**Location:** runtime/ingestion/drive_ingestor.py

**Capabilities:**
- OAuth 2.0 authorization code flow
- Token refresh
- Drive API integration
- Document listing, search, metadata retrieval
- Google Docs export to text format
- PostgreSQL event emission via observation events
- Uses repository_client.emit_event()

**Media Reuse:**
- ✅ Media extends Google Drive ingestion to support images, videos, design assets
- ✅ Media uses existing OAuth 2.0 flow (no new OAuth implementation)
- ✅ Media uses existing token refresh (no new token refresh)
- ✅ Media uses existing Drive API integration (no new Drive API integration)
- ✅ Media uses existing repository_client.emit_event() (no new event emission)

### Filesystem Worker (Reuse Exactly)

**Location:** filesystem_worker.py

**Capabilities:**
- Filesystem observation
- Event emission via repository_client.emit_event()

**Media Reuse:**
- ✅ Media extends filesystem worker to support media discovery
- ✅ Media uses existing repository_client.emit_event() (no new event emission)

### Adapters (Reuse Exactly)

**Location:** adapters/

**Capabilities:**
- 11 infrastructure adapters (docling, nats, ollama, openai, postgres, qdrant, redis, s3, tika, treesitter, unstructured)
- S3 adapter for S3 storage
- Ollama adapter for inference

**Media Reuse:**
- ✅ Media uses S3 adapter for S3 storage (no new S3 adapter)
- ✅ Media uses existing adapter pattern for new storage adapters (Cloudflare R2, Dropbox, OneDrive, etc.)

---

## Section 2: The Smallest Possible Media Layer

### Media Evidence Type (Extend KnowledgeEvidence)

```typescript
export interface MediaEvidence extends CanonicalEvidenceBase {
  evidence_type: 'media';

  // Core media (required)
  media_type: string;          // image, video, audio, document
  content_type: string;         // image/jpeg, image/png, video/mp4, etc.
  content_format: string;       // jpeg, png, mp4, etc.
  title: string;               // filename
  description?: string;        // description

  // Media metadata (required)
  width?: number;             // image/video width
  height?: number;            // image/video height
  duration?: number;          // video/audio duration in seconds
  file_size: number;           // file size in bytes

  // Hashing (required)
  sha256: string;              // SHA256 hash of content
  phash?: string;             // Perceptual hash (ImageHash)

  // EXIF (optional)
  exif?: Record<string, any>;  // EXIF metadata

  // GPS (optional)
  gps?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
  };

  // Location (optional)
  content_url?: string;       // URL to media
  content_path?: string;      // Path to media

  // Container (optional)
  container_id?: string;      // Container ID (Google Drive folder, etc.)
  container_name?: string;    // Container name

  // Author (optional)
  author_id?: string;         // Author ID
  author_name?: string;       // Author name

  // Access (optional)
  access_level?: string;      // Access level
  access_url?: string;        // Access URL

  // Hash (optional)
  content_hash?: string;      // Content hash (same as sha256)

  // Preview (optional)
  content_preview?: string;   // Content preview (thumbnail base64)
  content_summary?: string;   // Content summary
}
```

### Media Evidence Compiler (Extend Evidence Compiler)

```typescript
class MediaEvidenceCompiler extends BaseEvidenceCompiler {
  provider: string = 'media';

  compile(rawData: RawProviderData, providerId: string): CanonicalEvidence {
    // Use existing EvidencePipeline
    // Extract media-specific metadata (dimensions, EXIF, GPS, etc.)
    // Compute pHash using ImageHash
    // Return MediaEvidence
  }
}
```

### Media Connectors (Extend IConnector)

**Existing Connectors to Extend:**
- GoogleDriveConnector (extend existing google_drive_ingestion.py)
- FilesystemConnector (extend existing filesystem_worker.py)

**New Connectors (implement IConnector):**
- DropboxConnector (use official Dropbox SDK)
- OneDriveConnector (use official Microsoft SDK)
- S3Connector (use boto3)
- R2Connector (use boto3 with different endpoint)
- NASConnector (SMB/NFS)

### Media Events (Reuse Event Sourcing)

**Reuse Existing Event Types:**
- FILE_INGESTED for media ingestion
- OBJECT_CREATED for media object creation
- OBJECT_VERSIONED for variant creation

**No New Event Types Needed.**

### Media Projection (Reuse Projection Authority)

**Reuse Existing Projection:**
- Projection Authority (Qdrant)
- Projection rebuilding from replay
- No new projection infrastructure

**Media Projection Logic:**
- Filter repository replay by media evidence type
- Extract media metadata (SHA256, pHash, filename, EXIF, GPS, dimensions, file size)
- Build search index
- No new projection infrastructure

### Mission Control (Extend Existing)

**Add Media Authority Console Section:**
- Connector status (reuse existing connector infrastructure)
- Discovery timeline (reuse existing repository replay)
- Search console (reuse existing projection search)
- Variant console (reuse existing evidence versioning)
- Duplicate review (reuse existing deduplication logic)

**No New Mission Control Infrastructure.**

---

## Summary

### Section 1: Reusable Infrastructure (100% Coverage)

**Constitutional Authorities:** 5 authorities (Identity, Repository, Hash, Projection, Canonical Event) - Media reuses all

**Object Store:** Content-addressable, immutable, git-style layout, deduplication - Media reuses all

**Connector Interface v2:** IConnector, ConnectorConfig, AuthenticatedSession, RawProviderData, CollectionParams, CollectionResult, BaseConnector - Media reuses all

**Acquisition Manager v2:** Orchestrates acquisition, separates authentication, CompilerRegistry, Constitutional Pipeline - Media reuses all

**Evidence Types:** CanonicalEvidenceBase, IdentityEvidence, CapabilityEvidence, KnowledgeEvidence - Media extends KnowledgeEvidence

**Evidence Pipeline:** Validation → Normalization → Canonicalization → Hash Generation, deterministic, replay-safe, constitutional - Media reuses all

**Event Sourcing:** Append-only, immutable, reconstructable, ordered, event structure, event types, event replay, temporal queries - Media reuses all

**Repository Replay:** Deterministic, reproducible, idempotent, replay state machine, state verification, event verification - Media reuses all

**Worker Runtime:** Worker lifecycle, event-sourced state, replayable reconstruction, worker projection, worker health monitoring - Media reuses all

**PostgreSQL Schema:** events, artifact_registry, authority_objects, authority_lineage, lineage, projections, authority_supersession, authority_witness, objects - Media reuses all

**Mission Control:** FastAPI, 32 endpoints, health check, infrastructure status, credentials inventory, memory stats, constitutional ingestion/retrieve/documents/query/search/authority, Google Drive status/ingest, web retrieval status/search/pipeline, events recent/summary, lineage graph, replay status, backup status/manual/verify/restore-verify, models capabilities/validate, reasoning health, continuity status, qdrant health, inference models - Media extends with console section

**Google Drive Ingestion:** OAuth 2.0, token refresh, Drive API, repository_client.emit_event() - Media extends for media

**Filesystem Worker:** Filesystem observation, repository_client.emit_event() - Media extends for media

**Adapters:** 11 infrastructure adapters (docling, nats, ollama, openai, postgres, qdrant, redis, s3, tika, treesitter, unstructured) - Media uses S3 adapter

### Section 2: Smallest Possible Media Layer

**Media Evidence Type:** Extend KnowledgeEvidence with media-specific fields (media_type, content_type, content_format, width, height, duration, file_size, sha256, phash, exif, gps, content_url, content_path, container_id, container_name, author_id, author_name, access_level, access_url, content_hash, content_preview, content_summary)

**Media Evidence Compiler:** Extend BaseEvidenceCompiler, use existing EvidencePipeline, extract media-specific metadata, compute pHash using ImageHash

**Media Connectors:** Extend GoogleDriveConnector and FilesystemConnector (existing), implement new connectors using IConnector interface (Dropbox, OneDrive, S3, R2, NAS)

**Media Events:** Reuse existing event types (FILE_INGESTED, OBJECT_CREATED, OBJECT_VERSIONED) - no new event types

**Media Projection:** Reuse existing Projection Authority (Qdrant), filter repository replay by media evidence type, extract media metadata, build search index - no new projection infrastructure

**Mission Control:** Extend existing Mission Control with Media Authority console section - no new Mission Control infrastructure

**Image Processing:** Use OSS libraries (Pillow, ImageHash, libvips) via existing worker infrastructure - no new image processing infrastructure

**Storage:** Reuse existing Object Store (content-addressable, immutable, git-style layout, deduplication) - no new storage infrastructure

---

## Conclusion

**Media reuses 100% of existing PING constitutional infrastructure.**

**Media adds:**
1. MediaEvidence type (extends KnowledgeEvidence)
2. MediaEvidenceCompiler (extends BaseEvidenceCompiler)
3. Media connectors (extend IConnector)
4. Image processing via OSS libraries (Pillow, ImageHash, libvips) via existing workers

**Media does NOT add:**
1. New constitutional authorities
2. New event types
3. New projection infrastructure
4. New storage infrastructure
5. New worker infrastructure
6. New Mission Control infrastructure
7. New connector infrastructure (reuses IConnector)
8. New event sourcing infrastructure (reuses existing)
9. New repository replay infrastructure (reuses existing)
10. New object store infrastructure (reuses existing)

**The correct architecture is the one that adds the least code. Media disappears into PING rather than PING expanding around Media.**
