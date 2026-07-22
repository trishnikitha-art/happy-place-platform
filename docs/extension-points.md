# Extension Points Architecture

This document outlines the extension points for the media authority platform. These are planned integration points for future development.

## Overview

The authority-driven architecture is designed to be extensible. All data flows through authorities and adapters, making it straightforward to add new integrations at well-defined points.

## Extension Points

### 1. Google Drive Integration

**Purpose:** Sync media from Google Drive to Media Authority

**Location:** `src/lib/integrations/google-drive.ts` (to be created)

**Interface:**
```typescript
interface GoogleDriveSyncOptions {
  folderId: string;
  syncInterval: number; // minutes
  autoImport: boolean;
}

interface GoogleDriveSyncResult {
  synced: number;
  skipped: number;
  errors: string[];
  lastSync: string;
}

export async function syncGoogleDriveToMediaAuthority(
  options: GoogleDriveSyncOptions
): Promise<GoogleDriveSyncResult>
```

**Implementation Notes:**
- Use Google Drive API to list files in specified folder
- Compare file metadata with existing media.v1.json entries
- Import new files, update changed files
- Generate missing variants (webp, avif, thumbnail)
- Extract EXIF data for auto-tagging
- Update driveId in media manifest

**Adapter Integration:**
- Add `getMediaFromDrive(driveId: string)` to media adapter
- Add `syncMediaFromDrive()` to media adapter
- Authority Editor Media page should show sync status

---

### 2. File Upload Integration

**Purpose:** Direct file upload to Media Authority

**Location:** `src/lib/integrations/uploads.ts` (to be created)

**Interface:**
```typescript
interface UploadOptions {
  projectId?: string;
  roles: string[];
  autoGenerateVariants: boolean;
  extractEXIF: boolean;
}

interface UploadResult {
  mediaId: string;
  variants: Record<string, string>;
  exif?: EXIFData;
}

export async function uploadMediaToAuthority(
  file: File,
  options: UploadOptions
): Promise<UploadResult>
```

**Implementation Notes:**
- Accept file uploads via multipart/form-data
- Validate file type (images only)
- Generate unique media ID
- Store in configured storage (local, S3, etc.)
- Generate variants (webp, avif, thumbnail)
- Extract EXIF data for auto-tagging
- Add entry to media.v1.json
- Associate with project if specified

**Adapter Integration:**
- Add `uploadMedia(file, options)` to media adapter
- Authority Editor Media page should have upload UI
- Project detail page should have upload UI

---

### 3. AI Integration

**Purpose:** Auto-generate alt text, tags, and descriptions

**Location:** `src/lib/integrations/ai.ts` (to be created)

**Interface:**
```typescript
interface AIAnalysisOptions {
  generateAltText: boolean;
  generateTags: boolean;
  generateDescription: boolean;
}

interface AIAnalysisResult {
  altText?: string;
  tags?: string[];
  description?: string;
  confidence: number;
}

export async function analyzeMediaWithAI(
  mediaId: string,
  options: AIAnalysisOptions
): Promise<AIAnalysisResult>
```

**Implementation Notes:**
- Use vision AI model (e.g., GPT-4 Vision, Claude Vision)
- Analyze image content
- Generate descriptive alt text
- Generate relevant tags (materials, styles, features)
- Generate project description
- Update media.v1.json with AI-generated content
- Allow manual review/override in Authority Editor

**Adapter Integration:**
- Add `analyzeMedia(mediaId, options)` to media adapter
- Authority Editor Media page should have AI analysis button
- Show confidence scores and allow manual editing

---

### 4. EXIF Extraction

**Purpose:** Extract metadata from image files

**Location:** `src/lib/integrations/exif.ts` (to be created)

**Interface:**
```typescript
interface EXIFData {
  camera?: string;
  lens?: string;
  datetime?: string;
  orientation?: number;
  gps?: {
    latitude: number;
    longitude: number;
  };
  dimensions?: {
    width: number;
    height: number;
  };
}

export function extractEXIF(filePath: string): EXIFData | null
export function extractEXIFFromBuffer(buffer: Buffer): EXIFData | null
```

**Implementation Notes:**
- Use exifreader or similar library
- Extract camera, lens, datetime
- Extract GPS coordinates for location tagging
- Extract orientation for auto-correction
- Extract dimensions for validation
- Store in media.v1.json metadata field

**Adapter Integration:**
- Add `extractEXIF(mediaId)` to media adapter
- Auto-run on file upload
- Display in Authority Editor Media page
- Use GPS for auto-location tagging

---

### 5. File Hashing

**Purpose:** Detect duplicate files and ensure integrity

**Location:** `src/lib/integrations/hashing.ts` (to be created)

**Interface:**
```typescript
export async function generateFileHash(filePath: string): Promise<string>
export async function generateBufferHash(buffer: Buffer): Promise<string>
export function findDuplicateMedia(mediaId: string): string[] | null
```

**Implementation Notes:**
- Use SHA-256 for file hashing
- Store hash in media.v1.json
- Detect duplicates by hash comparison
- Prevent duplicate uploads
- Verify file integrity on sync
- Use for deduplication in Google Drive sync

**Adapter Integration:**
- Add `checkForDuplicates(fileHash)` to media adapter
- Add `generateHash(mediaId)` to media adapter
- Authority Editor should warn on duplicate upload
- Validation pipeline should check for duplicates

---

### 6. Variant Generation

**Purpose:** Generate optimized image variants

**Location:** `src/lib/integrations/variants.ts` (to be created)

**Interface:**
```typescript
interface VariantConfig {
  formats: ("webp" | "avif" | "jpeg")[];
  sizes: number[]; // e.g., [640, 1280, 1920]
  quality: number;
  generateThumbnail: boolean;
}

interface VariantResult {
  variants: Record<string, string>;
  blurDataURL?: string;
}

export async function generateVariants(
  sourcePath: string,
  config: VariantConfig
): Promise<VariantResult>
```

**Implementation Notes:**
- Use sharp or similar image processing library
- Generate webp, avif for modern browsers
- Generate responsive sizes
- Generate thumbnail for previews
- Generate blur data URL for LCP optimization
- Store all variants in media.v1.json
- Cache generated variants

**Adapter Integration:**
- Add `generateVariants(mediaId, config)` to media adapter
- Auto-run on file upload
- Manual regenerate option in Authority Editor
- Validation pipeline should check for missing variants

---

## Integration Architecture

All extensions follow the same pattern:

1. **Integration Module** (`src/lib/integrations/*.ts`)
   - Implements the external API/service
   - Handles authentication and error cases
   - Returns standardized data structures

2. **Adapter Layer** (`src/lib/*.ts`)
   - Exposes integration functions to components
   - Handles caching and performance
   - Enforces authority rules

3. **Authority Editor** (`src/app/authority-editor/*`)
   - Provides UI for manual triggers
   - Displays integration status
   - Shows logs and errors

4. **Validation Pipeline** (`src/lib/validation.ts`)
   - Validates integration results
   - Ensures data integrity
   - Reports issues

## Implementation Priority

1. **High Priority:**
   - File Upload Integration (core functionality)
   - Variant Generation (performance optimization)
   - EXIF Extraction (metadata enrichment)

2. **Medium Priority:**
   - File Hashing (duplicate detection)
   - Google Drive Integration (workflow automation)

3. **Low Priority:**
   - AI Integration (enhanced features, optional)

## Security Considerations

- All external API calls must be authenticated
- File uploads must be validated (type, size, content)
- API keys must be stored securely (environment variables)
- Rate limiting for external services
- Audit logging for all integration actions

## Performance Considerations

- Variant generation should be async/background
- Google Drive sync should be incremental
- AI analysis should be queued/batched
- EXIF extraction should be cached
- Hash generation should use streaming for large files

## Testing Strategy

Each extension should have:
- Unit tests for core functions
- Integration tests with mock services
- End-to-end tests with Authority Editor
- Error handling tests
- Performance benchmarks
