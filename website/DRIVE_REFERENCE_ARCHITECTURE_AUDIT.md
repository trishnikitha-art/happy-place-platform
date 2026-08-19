# Drive Reference Architecture Audit

## Current Implementation Analysis

### 1. Drive Explorer Drag Start (src/app/workbench/media/page.tsx:907-944)

**Current Behavior:**
- Only works for already-ingested assets (`isIngested` check)
- Drag payload contains: `assetId`, `source`, `driveFileId`, `sharedDriveId`
- Uses `asset.id` as the drag identity
- Line 1252: `draggable={isIngested}` - gates drag on ingestion status
- Line 1254: `onDragStart={isIngested ? ... : undefined}` - prevents drag for non-ingested files

**Problem:**
- Cannot drag directly from Drive without ingestion
- Asset ID is used as identity, not Drive fileId
- Assumes asset exists in local registry

### 2. Visual-Slot Drop Handler (src/components/visual-slot.tsx:137-183)

**Current Behavior:**
- Extracts `assetId` from DataTransfer
- Extracts structured data from `application/x-workbench-asset`
- PostMessage contains: `assetId`, `source`, `driveFileId`, `sharedDriveId`
- Line 146: `assetId = e.dataTransfer.getData('text/plain')` - uses asset ID as identity

**Problem:**
- Still assumes asset ID exists in local registry
- No handling for Drive file references that don't exist locally

### 3. Slot Message Handler (src/app/workbench/media/page.tsx:181-259)

**Current Behavior:**
- Line 183: Receives `assetId` from postMessage
- Line 206: If `assetId` exists, looks it up in local registry
- Line 213: `resolveAssetId(assetId, assetsRef.current)` - tries to resolve asset ID
- Line 243: `const asset = assetsRef.current.find(a => a.id === canonicalAssetId)` - requires local asset
- Line 252: If asset found, proceeds with slot assignment

**Problem:**
- Only works if asset exists in local registry
- No path to create Drive reference from fileId
- No handling for direct Drive → slot workflow

### 4. Drive Reference API (src/app/api/drive/reference/route.ts)

**Current Behavior:**
- Line 76: Checks for existing record by `drive.fileId === driveId`
- Line 79: Generates media ID from filename + timestamp
- Line 94: Uses thumbnail URL as variant: `web: /api/drive/files/${driveId}/thumbnail`
- Line 109: Sets status to `'referenced'`
- Line 118: Updates existing record or creates new one
- Writes to `media.v1.json` (file system, not KV)

**Problem:**
- Uses file system instead of KV store
- Thumbnail URL is used as variant (presentation, not identity)
- No idempotency based on content hash
- No separation between reference and materialization

### 5. Drive Discovery (src/lib/drive/drive-discovery.ts)

**Current Behavior:**
- Lines 28-39: DriveFile interface includes `thumbnailLink`, `webViewLink`
- Provides Drive file metadata
- No reference-specific API

**Status:**
- Infrastructure is there, but needs to be leveraged for reference creation

### 6. Blob Storage (src/lib/blob-storage.ts)

**Current Behavior:**
- Line 28: `allowOverwrite: true` - overwrites existing blobs
- No idempotency based on content hash

**Problem:**
- `allowOverwrite: true` masks idempotency issues
- Should use content hash for idempotency

---

## Required Changes

### 1. Make Drive Files Draggable Without Ingestion

**Files:**
- `src/app/workbench/media/page.tsx`

**Changes:**
- Remove `isIngested` check from `draggable` prop
- Allow dragging of any Drive file regardless of ingestion status
- Drag payload should contain Drive identity: `{ source: 'google-drive', fileId, driveId, name, mimeType, modifiedTime }`
- Do not use asset ID for non-ingested files

### 2. Update Drop Handler to Support Drive References

**Files:**
- `src/components/visual-slot.tsx`
- `src/app/workbench/media/page.tsx`

**Changes:**
- Slot drop handler should accept Drive file metadata directly
- If `source === 'google-drive'` and no local asset exists:
  - Call reference API to create lightweight Drive reference
  - Use `(source, driveId, fileId)` as identity key
  - Return reference ID for slot assignment
- If local asset exists, use it as before

### 3. Create/Update Reference API

**Files:**
- `src/app/api/drive/reference/route.ts`

**Changes:**
- Change from file system to KV store
- Use `(source, driveId, fileId)` as idempotency key
- Do NOT use thumbnail URL as identity
- Use content hash for true idempotency (if downloaded)
- Separate reference creation from materialization
- Return canonical asset ID

### 4. Implement Content Hash Idempotency

**Files:**
- `src/app/api/drive/ingest/route.ts`
- `src/app/api/drive/reference/route.ts`

**Changes:**
- Remove `allowOverwrite: true` from blob storage
- Use content hash as idempotency key
- Only materialize if content has changed

### 5. Update Slot Assignment to Support References

**Files:**
- `src/app/workbench/media/page.tsx`

**Changes:**
- Slot should accept both local assets and Drive references
- Reference should contain: `{ source: 'google-drive', assetId, drive: { fileId, driveId, name, mimeType, modifiedTime } }`
- Rendering should derive proxy URL from `(fileId, driveId)` at runtime

---

## Implementation Order

1. **Update Drive Explorer drag to emit Drive identity**
2. **Update drop handler to handle Drive references**
3. **Update reference API to use KV and proper idempotency**
4. **Remove ingestion gating from drag**
5. **Update slot assignment to support both reference types**
6. **Remove `allowOverwrite: true` and implement content hash idempotency**
