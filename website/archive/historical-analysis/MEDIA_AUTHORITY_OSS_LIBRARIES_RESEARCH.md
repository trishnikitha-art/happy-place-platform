# Media Authority Phase 1 - OSS Libraries Research

**Date:** 2026-08-03
**Objective:** Research battle-tested OSS libraries for Media Authority implementation
**Status:** COMPLETE

---

## Image Processing Libraries

### 1. Pillow (PIL Fork)
**URL:** https://pillow.readthedocs.io/
**Status:** Battle-tested, widely used
**Capabilities:**
- Image processing (resize, crop, rotate, flip)
- Thumbnail generation (preserves aspect ratio)
- Format conversion (JPEG, PNG, WebP, AVIF, GIF, BMP, TIFF)
- Color space conversion
- Image filtering and enhancement
- EXIF metadata extraction
- ICC profile handling

**Installation:**
```bash
pip install Pillow
```

**Thumbnail Generation Example:**
```python
from PIL import Image

with Image.open('image.jpg') as im:
    im.thumbnail((150, 150))
    im.save('thumbnail.jpg', 'JPEG')
```

**Reuse Decision:** REUSE - Battle-tested, Python standard for image processing

### 2. libvips (Python: pyvips)
**URL:** https://libvips.github.io/pyvips/
**Status:** Battle-tested, high-performance
**Capabilities:**
- High-performance image processing (faster than Pillow for large images)
- Thumbnail generation
- Format conversion (JPEG, PNG, WebP, AVIF, TIFF, GIF)
- Image operations (resize, crop, rotate, flip)
- Streaming processing (low memory footprint)
- Multi-threaded processing

**Installation:**
```bash
pip install pyvips
```

**Reuse Decision:** REUSE - For high-performance processing of large images

---

## Perceptual Hashing Libraries

### 1. ImageHash
**URL:** https://github.com/JohannesBuchner/imagehash/
**Status:** Battle-tested, widely used
**Capabilities:**
- Average hashing (aHash)
- Perceptual hashing (pHash)
- Difference hashing (dHash)
- Wavelet hashing (wHash)
- HSV color hashing (colorhash)
- Crop-resistant hashing
- Hamming distance calculation for similarity detection

**Installation:**
```bash
pip install imagehash
```

**Usage Example:**
```python
from PIL import Image
import imagehash

hash1 = imagehash.phash(Image.open('image1.jpg'))
hash2 = imagehash.phash(Image.open('image2.jpg'))

# Hamming distance (lower = more similar)
distance = hash1 - hash2
print(f"Hamming distance: {distance}")
```

**Reuse Decision:** REUSE - Battle-tested, Python standard for perceptual hashing

### 2. idem (Duplicate Detection Tool)
**URL:** https://github.com/arp7/idem
**Status:** Battle-tested tool
**Capabilities:**
- Perceptual hashing (pHash + dHash)
- Exact duplicate detection (SHA-256)
- Video duplicate detection (ffmpeg)
- Interactive web review (Flask)
- Resolution-based deduplication
- Folder/filename heuristics

**Dependencies:**
- Pillow
- imagehash
- pybktree
- Flask (optional)
- ffmpeg (optional for video)

**Reuse Decision:** STUDY - Reference for duplicate detection algorithms, but implement custom constitutional version

### 3. imgdupes (Duplicate Detection Tool)
**URL:** https://github.com/knjcode/imgdupes
**Status:** Battle-tested tool
**Capabilities:**
- Perceptual hashing (ahash, phash, dhash, whash)
- Hamming distance threshold
- Recursive directory scanning
- Near-duplicate detection
- Batch deletion

**Reuse Decision:** STUDY - Reference for duplicate detection algorithms, but implement custom constitutional version

---

## React Image Viewing Libraries

### 1. react-image-gallery
**URL:** https://github.com/benhowdle/react-image-gallery
**Status:** Battle-tested, widely used
**Capabilities:**
- Image gallery with thumbnails
- Fullscreen mode
- Zoom support
- Lazy loading
- Custom renderers
- Touch/swipe support
- Keyboard navigation

**Installation:**
```bash
npm install react-image-gallery
```

**Reuse Decision:** REUSE - Battle-tested React gallery component

### 2. react-images
**URL:** https://github.com/xiaofan9/react-images
**Status:** Battle-tested
**Capabilities:**
- Lightbox gallery
- Fullscreen mode
- Zoom support
- Caption support
- Custom renderers
- Keyboard navigation

**Installation:**
```bash
npm install react-images
```

**Reuse Decision:** REUSE - Battle-tested React lightbox component

### 3. next/image (Next.js Native)
**URL:** https://nextjs.org/docs/api-reference/next/image
**Status:** Next.js built-in
**Capabilities:**
- Automatic image optimization
- Responsive images
- Lazy loading
- Blur placeholders
- WebP/AVIF conversion
- Size optimization

**Reuse Decision:** REUSE - Next.js built-in image optimization

---

## Cloud Storage Connector Libraries

### 1. Google Drive API (Python: google-api-python-client)
**URL:** https://github.com/googleapis/python-api-client
**Status:** Official Google library
**Capabilities:**
- Google Drive API access
- OAuth 2.0 authentication
- File listing, search, download
- Folder navigation
- Metadata retrieval

**Installation:**
```bash
pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
```

**Reuse Decision:** REUSE - Official Google library (already used in PING)

### 2. Dropbox API (Python: dropbox)
**URL:** https://github.com/dropbox/dropbox-sdk-python
**Status:** Official Dropbox library
**Capabilities:**
- Dropbox API access
- OAuth 2.0 authentication
- File listing, search, download
- Folder navigation
- Metadata retrieval

**Installation:**
```bash
pip install dropbox
```

**Reuse Decision:** REUSE - Official Dropbox library

### 3. OneDrive API (Python: msal)
**URL:** https://github.com/AzureAD/microsoft-authentication-library-for-python
**Status:** Official Microsoft library
**Capabilities:**
- Microsoft Graph API access
- OAuth 2.0 authentication
- OneDrive file operations
- Folder navigation
- Metadata retrieval

**Installation:**
```bash
pip install msal
```

**Reuse Decision:** REUSE - Official Microsoft library

### 4. AWS S3 (Python: boto3)
**URL:** https://github.com/boto/boto3
**Status:** Official AWS library
**Capabilities:**
- S3 API access
- AWS authentication
- File listing, upload, download
- Bucket operations
- Metadata retrieval

**Installation:**
```bash
pip install boto3
```

**Reuse Decision:** REUSE - Official AWS library

### 5. Cloudflare R2 (Python: boto3)
**URL:** https://developers.cloudflare.com/r2/
**Status:** S3-compatible
**Capabilities:**
- S3-compatible API
- Same as AWS S3
- Use boto3 with different endpoint

**Reuse Decision:** REUSE - S3-compatible, use boto3

---

## Queue Libraries

### 1. Celery (Python)
**URL:** https://docs.celeryq.dev/
**Status:** Battle-tested, widely used
**Capabilities:**
- Distributed task queue
- Worker pool management
- Task scheduling
- Result backend
- Retry logic
- Rate limiting

**Installation:**
```bash
pip install celery redis
```

**Reuse Decision:** REUSE - Battle-tested task queue (if needed for media processing)

### 2. RQ (Redis Queue) (Python)
**URL:** https://python-rq.org/
**Status:** Battle-tested, simple
**Capabilities:**
- Simple job queue
- Redis backend
- Worker management
- Job monitoring
- Failed job handling

**Installation:**
```bash
pip install rq redis
```

**Reuse Decision:** REUSE - Simple task queue (if needed for media processing)

---

## Summary

### Recommended OSS Libraries

**Image Processing:**
- ✅ Pillow (primary) - Battle-tested, Python standard
- ✅ libvips (secondary) - High-performance for large images

**Perceptual Hashing:**
- ✅ ImageHash - Battle-tested, Python standard
- ✅ Study idem/imgdupes for algorithms, implement custom constitutional version

**React Image Viewing:**
- ✅ react-image-gallery - Battle-tested gallery component
- ✅ react-images - Battle-tested lightbox component
- ✅ next/image - Next.js built-in optimization

**Cloud Storage Connectors:**
- ✅ google-api-python-client - Official Google library (already used)
- ✅ dropbox - Official Dropbox library
- ✅ msal - Official Microsoft library
- ✅ boto3 - Official AWS library (S3 + Cloudflare R2)

**Task Queues:**
- ✅ Celery - Battle-tested distributed task queue (if needed)
- ✅ RQ - Simple task queue (if needed)

### Implementation Strategy

1. **Image Processing:** Use Pillow for most operations, libvips for high-performance large image processing
2. **Perceptual Hashing:** Use ImageHash library, study idem/imgdupes for duplicate detection algorithms
3. **Image Viewing:** Use react-image-gallery for gallery, react-images for lightbox, next/image for optimization
4. **Cloud Storage:** Use official SDKs for each provider (Google, Dropbox, OneDrive, S3, R2)
5. **Task Queues:** Use PING's existing worker infrastructure first, consider Celery/RQ if needed for heavy processing

### Constitutional Compliance

All OSS libraries must be used within PING's constitutional constraints:
- Image processing must use MediaCapability contract
- Perceptual hashing must emit observation events
- Cloud storage connectors must implement IMediaConnector interface
- All operations must route through constitutional authorities
- No direct infrastructure access from HTTP layer
