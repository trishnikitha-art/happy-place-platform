# Google Drive Photo Pipeline Architecture

## Objective

Automate the entire photo intake process from Google Drive to production deployment. Never manually copy images into the repository again.

## Architecture

```
Google Drive (Owner Uploads)
    ↓
Watch Folder / Webhook Trigger
    ↓
Validate Filenames
    ↓
Extract EXIF Metadata
    ↓
Generate WebP Variants
    ↓
Generate BlurHash
    ↓
Detect Orientation
    ↓
Generate Focal Point Placeholder
    ↓
AI-Assisted Tag Suggestions (Optional)
    ↓
Generate Metadata (gallery.json)
    ↓
Detect Duplicates
    ↓
Commit to Repository
    ↓
Open Pull Request
    ↓
Preview Deploy
    ↓
Manual Approval
    ↓
Merge to Main
    ↓
Production Deploy
    ↓
Cache Invalidation
    ↓
Website Updates
```

## Security

### OAuth Configuration
- **Service Account**: Dedicated Google Workspace service account with least privilege
- **Scopes**: 
  - `drive.readonly` (read-only access to specific folder)
  - `drive.metadata.readonly` (metadata only)
- **Environment Variables**: All credentials stored in environment variables, never in code
- **No Client Secrets in Frontend**: All Drive access happens server-side only

### Security Measures
- **Least Privilege OAuth**: Service account has access only to specific photo intake folder
- **Read-Only Drive Scope**: No write access to Drive, only read
- **Signed Automation**: All automated commits signed with GPG key
- **Hash Verification**: SHA-256 hash verification for all images
- **Duplicate Detection**: Prevent duplicate uploads by hash comparison
- **Audit Logging**: All photo operations logged to audit trail
- **Rate Limiting**: API rate limiting to prevent abuse
- **Automatic Rollback**: Automatic rollback on pipeline failure

## Pipeline Stages

### Stage 1: Watch Folder / Webhook Trigger
- **Option A**: Google Drive webhook on folder changes
- **Option B**: Scheduled polling (every 5 minutes)
- **Trigger**: New file detected in `photo-intake/` folder

### Stage 2: Validate Filenames
- **Pattern**: `{category}/{project-name}.{ext}`
- **Valid Extensions**: `.jpg`, `.jpeg`, `.png`, `.heic`
- **Validation**: Reject invalid filenames, log to audit trail

### Stage 3: Extract EXIF Metadata
- **Tool**: `exiftool` or `sharp`
- **Extract**: 
  - Capture date
  - Camera model
  - GPS coordinates (if available)
  - Orientation
  - Image dimensions
  - File size

### Stage 4: Generate WebP Variants
- **Tool**: `sharp` or `cwebp`
- **Variants**:
  - Original (preserved)
  - WebP (lossless, 80% quality)
  - WebP (lossy, 75% quality)
  - Thumbnail (400px width)
  - Mobile (800px width)
  - Desktop (1200px width)
  - Desktop HD (1920px width)

### Stage 5: Generate BlurHash
- **Tool**: `blurhash` library
- **Purpose**: Placeholder for image loading
- **Output**: Base64 blur hash string

### Stage 6: Detect Orientation
- **Tool**: `sharp` with auto-orient
- **Purpose**: Ensure correct display orientation
- **Output**: Corrected image + orientation metadata

### Stage 7: Generate Focal Point Placeholder
- **Tool**: Custom focal point detection
- **Algorithm**: Face detection + saliency detection
- **Output**: `{x, y}` focal point coordinates (0-1 range)

### Stage 8: AI-Assisted Tag Suggestions (Optional)
- **Tool**: OpenAI Vision API or local model
- **Tags**: 
  - Materials (cedar, composite, tile, etc.)
  - Service type (deck, fence, bathroom, etc.)
  - Room type (kitchen, bathroom, outdoor)
  - Style (modern, traditional, rustic)
- **Confidence**: Score 0-1 for each tag

### Stage 9: Generate Metadata (gallery.json)
- **Schema**: Existing `GalleryRecord` schema
- **Fields**:
  - `id`: Generated from filename
  - `title`: Derived from filename or AI
  - `project`: Derived from folder structure
  - `category`: Derived from folder or AI tags
  - `county`: Optional manual override
  - `featured`: AI suggestion (hero score > 0.8)
  - `before`: AI detection (before/after comparison)
  - `after`: AI detection (before/after comparison)
  - `hero`: AI suggestion (hero score > 0.9)
  - `cover`: AI suggestion (cover score > 0.85)
  - `alt`: AI-generated alt text
  - `width`: From EXIF
  - `height`: From EXIF
  - `focal`: From Stage 7
  - `original`: Original filename
  - `src`: WebP variant path
  - `thumbnail`: Thumbnail path
  - `blurDataURL`: From Stage 5
  - `variants`: All generated variants
  - `metadata`:
    - `project`: Project name
    - `service`: Service type
    - `materials`: Material tags
    - `before`: Before/after flag
    - `after`: Before/after flag
    - `heroScore`: AI hero score (0-1)
    - `homepageScore`: AI homepage score (0-1)
    - `galleryScore`: AI gallery score (0-1)
    - `orientation`: Landscape/portrait/square
    - `dominantColors`: Color palette
    - `focalPoint`: {x, y}
    - `copyright`: Copyright notice
    - `photographer`: Photographer name
    - `captureDate`: ISO date string
    - `altTextSuggestion`: AI-generated alt text
    - `confidence`: AI confidence score (0-1)

### Stage 10: Detect Duplicates
- **Method**: SHA-256 hash comparison
- **Action**: Reject duplicates, log to audit trail
- **Threshold**: Exact match only

### Stage 11: Commit to Repository
- **Branch**: `auto/photo-pipeline-{timestamp}`
- **Files**:
  - `public/images/projects/{category}/{filename}.webp`
  - `public/images/projects/{category}/{filename}-thumbnail.webp`
  - `public/images/projects/{category}/{filename}-mobile.webp`
  - `public/images/projects/{category}/{filename}-desktop.webp`
  - `public/images/projects/{category}/{filename}-hd.webp`
  - `src/config/gallery.json` (updated)
- **Commit Message**: Auto-generated with file list

### Stage 12: Open Pull Request
- **Title**: `Photo Pipeline: {category}/{project-name}`
- **Body**: 
  - File list
  - Metadata summary
  - AI tag suggestions
  - Focal point visualization
  - Preview links
- **Labels**: `photo-pipeline`, `auto-generated`

### Stage 13: Preview Deploy
- **Platform**: Vercel preview deployment
- **Trigger**: PR created
- **Purpose**: Visual review before merge

### Stage 14: Manual Approval
- **Reviewer**: Taylor or Lanie
- **Checklist**:
  - [ ] Images are correct project
  - [ ] Metadata is accurate
  - [ ] Focal points are correct
  - [ ] Tags are appropriate
  - [ ] No sensitive information visible
- **Action**: Approve or request changes

### Stage 15: Merge to Main
- **Trigger**: PR approval
- **Action**: Automatic merge
- **Post-merge**: Delete auto-branch

### Stage 16: Production Deploy
- **Platform**: Vercel production
- **Trigger**: Main branch update
- **Action**: Automatic deployment

### Stage 17: Cache Invalidation
- **CDN**: Vercel Edge Network
- **Action**: Purge cache for updated images
- **Timing**: Immediately after deploy

### Stage 18: Website Updates
- **Action**: Images automatically appear on website
- **Locations**:
  - Homepage (if hero score > threshold)
  - Gallery (all images)
  - Service pages (if service matches)
  - Project pages (if project matches)

## Implementation Plan

### Phase 1: Core Pipeline (Week 1-2)
- [ ] OAuth service account setup
- [ ] Drive folder watch / webhook
- [ ] Filename validation
- [ ] EXIF extraction
- [ ] WebP generation
- [ ] BlurHash generation
- [ ] Basic metadata generation

### Phase 2: Advanced Features (Week 3-4)
- [ ] Focal point detection
- [ ] AI tag suggestions
- [ ] Duplicate detection
- [ ] Git automation
- [ ] PR automation

### Phase 3: Integration (Week 5-6)
- [ ] Preview deployment automation
- [ ] Cache invalidation
- [ ] Audit logging
- [ ] Error handling
- [ ] Rollback automation

## Technology Stack

- **OAuth**: Google OAuth 2.0 with service account
- **Image Processing**: `sharp` (Node.js)
- **EXIF Extraction**: `exiftool` CLI or `sharp`
- **BlurHash**: `blurhash` library
- **Focal Point**: Custom saliency detection
- **AI Tags**: OpenAI Vision API (optional)
- **Git Automation**: `simple-git` or GitHub Actions
- **Deployment**: Vercel API
- **Logging**: Structured logging to file + audit trail

## Error Handling

- **Invalid Filename**: Reject, log, notify via email
- **EXIF Extraction Failure**: Use fallback metadata, log warning
- **WebP Generation Failure**: Use original, log error
- **BlurHash Failure**: Use placeholder, log warning
- **Focal Point Failure**: Use center point, log warning
- **Duplicate Detection**: Reject, log, notify via email
- **Git Failure**: Retry 3x, then notify via email
- **Deploy Failure**: Rollback, notify via email

## Monitoring

- **Pipeline Success Rate**: Track success/failure rate
- **Processing Time**: Track average processing time per image
- **Error Rate**: Track error types and frequency
- **Storage Usage**: Track storage usage for images
- **API Usage**: Track Google Drive API usage

## Rollback Plan

- **Git Revert**: Automatic revert on deployment failure
- **Cache Purge**: Purge cache on rollback
- **Notification**: Email notification on rollback
- **Audit Log**: Log rollback to audit trail

## Future Enhancements

- **Before/After Detection**: Automatic before/after pairing
- **Project Grouping**: Automatic project grouping by date/location
- **Quality Scoring**: AI quality scoring for image selection
- **Auto-Curation**: AI-powered homepage curation
- **Smart Cropping**: AI-powered smart cropping for different aspect ratios
