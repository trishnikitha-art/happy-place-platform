# Materialization Boundary Audit Report

## /api/workbench/materialize-drive - Boundary Analysis

### Authentication ✅
- Requires Workbench authentication
- Returns 401 if not authenticated
- Cookie forwarding maintains session context

### Input Validation ✅
- fileId: Required
- sharedDriveId: Optional
- fileName: Used for logging only
- mimeType: Early validation (must start with 'image/')
- Returns 400 for missing required fields
- Returns 415 for unsupported file types

### Authorization ✅
- Core /api/drive/ingest endpoint enforces:
  - Drive authentication
  - Workbench authentication
  - Corpus authorization (verifyCorpusAuthorization)
  - Object-level authorization (file must be in authorized corpus)

### Provenance Preservation ✅
- Core /api/drive/ingest creates PublishedMediaAsset with:
  - source: 'local' (Blob, not Drive)
  - provenance: { source: 'google-drive', driveFileId, ... }
  - Original Drive ID preserved in provenance
  - Content hash determines stable identity

### Idempotency ✅
- Core /api/drive/ingest uses content hash for identity
- findMediaByContentHash() checks for existing assets
- Same bytes = same media ID (deterministic)

### Public Gate Enforcement ✅
- Core /api/drive/ingest creates PublishedMediaAsset (not DriveReference)
- PublishedMediaAsset has source: 'local' and storage: 'blob'
- Public gate accepts PublishedMediaAsset
- Public gate rejects DriveReference (drive- prefixes)

### Assignment Update ✅
- Core /api/drive/ingest calls reconcileDriveAssignments()
- Updates Drive-referenced assignments to point to PublishedMediaAsset
- Uses CAS semantics
- Assignment store validates mediaId resolves to PublishedMediaAsset

### Failure Cleanup ✅
- Core /api/drive/ingest fails closed on:
  - Sharp unavailable
  - Blob upload failure
  - KV failure
  - Authorization failure
- No falsely published assets
- No broken assignments

### Cookie Forwarding ✅
- Forwards request.headers.get('cookie') to core endpoint
- Maintains session context across bridge
- No credential exposure

### Error Handling ✅
- Returns detailed error messages
- Preserves core endpoint error codes
- Logs all failures with requestId

## Boundary Assessment: ✅ SECURE

The /api/workbench/materialize-drive endpoint is a correct constitutional bridge:

1. **Authentication**: Enforced (Workbench + Drive)
2. **Authorization**: Enforced (corpus + object-level)
3. **Input Validation**: Early MIME type check
4. **Provenance**: Preserved in PublishedMediaAsset
5. **Public Gate**: Drive references rejected, only PublishedMediaAsset allowed
6. **Idempotency**: Content-based identity
7. **Assignment**: CAS semantics with validation
8. **Failure Safety**: Fail-closed behavior

**No backdoor vulnerabilities found.**
