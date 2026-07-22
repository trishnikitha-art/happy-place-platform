# Architecture Decisions - Contradictions Resolution

## Overview

This document resolves architectural contradictions identified during the Media Authority migration and establishes the four-authority architecture.

---

## Four-Authority Architecture

### 1. Projects Authority (projects.v1.json)
**Owns:**
- Project metadata
- Customer information
- Service classification
- Status and publish state
- Project relationships
- Timeline and completion dates
- Estimate and warranty information
- Story and challenges

**Does NOT own:**
- Image files or URLs
- Photo variants
- Alt text

**Relationships:**
- References Media Authority via media IDs
- References Reviews Authority via review IDs
- References Service Registry via service IDs

---

### 2. Media Authority (media.v1.json)
**Owns:**
- Every image file
- All image variants (original, webp, avif, thumbnail)
- Alt text and captions
- Display ordering
- Hero flags
- Featured flags
- Project relationships (projectId)
- Role assignments (hero, gallery, before, after)
- File metadata (dimensions, focal points)

**Does NOT own:**
- Project metadata
- Review content
- Brand assets

**Relationships:**
- Referenced by Projects Authority via media IDs
- Referenced by Reviews Authority via media IDs
- Referenced by Service Registry for featured projects

---

### 3. Reviews Authority (reviews.v1.json)
**Owns:**
- Review content
- Rating scores
- Reviewer information
- Media references (media IDs only, never URLs)
- Project references (project IDs only, never URLs)
- Owner responses
- Editorial metadata (featured, highlighted, homepage eligibility)
- Google sync metadata

**Does NOT own:**
- Image files
- Project metadata
- Photo URLs

**Relationships:**
- References Projects Authority via project IDs
- References Media Authority via media IDs

---

### 4. Brand Authority (brand.v1.json)
**Owns:**
- Homepage hero selection
- Owner portraits
- Team photos
- Company logos
- Icons and brand assets
- Office photos
- Marketing assets
- Brand colors and typography

**Does NOT own:**
- Project photography
- Review content
- Service configuration

**Relationships:**
- Independent authority
- Referenced by homepage and about pages

---

## Resolved Contradictions

### 1. Service Cards
**Previous Direction:** Remove project photos, show placeholders only.

**Resolved Direction:** Service cards should display real project photos corresponding to that service category using intent-based lookups.

**Implementation:**
```
ServiceCard(service.slug)
    ↓
getFeaturedServiceMedia(service.slug)
    ↓
Media Authority (filters by service, heroEligible, featured)
    ↓
Project Hero Image
```

**Fallback:** Show placeholder only when no images exist for that service category.

---

### 2. Admin Dashboard vs Authority Editor
**Previous:** Admin Dashboard with generic sections.

**Resolved:** Authority Editor with authority-specific sections.

**Navigation:**
```
Authority Editor
├── Dashboard (landing page with metrics)
├── Projects (Project Authority)
├── Media (Media Authority)
├── Reviews (Reviews Authority)
├── Services (Service Registry)
├── SEO (SEO Authority)
├── Settings (Configuration)
└── System (Authority health, diagnostics)
```

**Rule:** Everything edits authorities. Nothing edits JSON directly.

---

### 3. Hero Authority
**Previous:** Two hero systems (heroBackground() for homepage, getProjectMedia() for projects).

**Resolved:** Homepage hero owned by Brand Authority. Project heroes owned by Media Authority.

**Implementation:**
```
Homepage Hero:
    ↓
getHomepageHero()
    ↓
Brand Authority (brand.v1.json)

Project Hero:
    ↓
getProjectHero(projectId)
    ↓
Media Authority (media.v1.json)
```

---

### 4. Owner Portrait
**Previous:** ownerPortrait() function in media.ts.

**Resolved:** Owner portraits owned by Brand Authority.

**Implementation:**
```
getOwnerPortrait()
    ↓
Brand Authority (brand.v1.json)
```

**Rationale:** Separates company branding from project photography. Prevents project photos from becoming mixed with company branding over time.

---

### 5. ProjectSpotlight vs ProjectPhotos
**Previous:** Two photo systems with different data sources.

**Resolved:** Unified through Media Authority adapters.

**Implementation:**
```
Project
    ↓
Hero Media (getProjectHero)
    ↓
Gallery (getProjectMedia)
    ↓
Before/After (getProjectBeforeAfter)
```

**Rule:** Everything through adapters. No direct JSON access.

---

### 6. Reviews
**Status:** Already using getMediaById() - correct.

**Rule:** Reviews store media IDs only, never image URLs.

---

### 7. Homepage Sections
**Previous:** Multiple image sources (transformations, services, hero, owner, reviews).

**Resolved:** Every image answers "Which authority owns this?"

**Mapping:**
- Homepage hero → Brand Authority
- Owner portrait → Brand Authority
- Service cards → Media Authority (via getFeaturedServiceMedia)
- Transformations → Media Authority (via before/after roles)
- Reviews → Reviews Authority (references Media Authority)

---

### 8. Google Drive
**Status:** Not implemented yet.

**Rule:** Importer comes after authority architecture is complete.

**Pipeline:**
```
Google Drive
    ↓
Importer (future)
    ↓
Media Authority
    ↓
Authority Editor
    ↓
Website
```

**Rule:** UI never talks directly to Google Drive.

---

### 9. Admin Authentication
**Status:** Not decided yet.

**Options:**
- Vercel Authentication
- Clerk
- Better Auth
- Auth.js

**Decision Point:** Must be decided before building Authority Editor editing functionality.

---

### 10. Write Pipeline
**Previous:** Only readers implemented.

**Resolved:** Full write pipeline required.

**Implementation:**
```
Authority Editor
    ↓
Validation
    ↓
Adapter (read/write)
    ↓
Authority JSON
    ↓
Rebuild
    ↓
Site
```

**Rule:** Never Component → JSON. All writes go through adapters with validation.

---

## Migration Priority

### Phase 1: Authority Foundation
1. Create Brand Authority (brand.v1.json)
2. Create Brand adapter (getHomepageHero, getOwnerPortrait)
3. Add getFeaturedServiceMedia to Media adapter
4. Revert ServiceCard to use intent-based media lookups

### Phase 2: Homepage Migration
5. Migrate homepage hero from heroBackground() to Brand Authority
6. Migrate owner portrait from ownerPortrait() to Brand Authority
7. Update homepage to use new adapters

### Phase 3: Project Unification
8. Unify ProjectSpotlight to use Media Authority adapters
9. Update all project pages to use unified adapters
10. Remove legacy functions from media.ts

### Phase 4: Authority Editor
11. Decide authentication strategy
12. Rename admin to Authority Editor
13. Build Authority Editor pages (Projects, Media, Reviews, Services, SEO, Settings, System)
14. Implement write pipeline with validation
15. Implement publish/unpublish workflow
16. Implement draft state for projects

### Phase 5: Validation & Diagnostics
17. Implement activity logging
18. Implement schema validation
19. Implement automated integrity checks
20. Implement repository health checks
21. Implement media diagnostics

### Phase 6: Automation (After Architecture Complete)
22. Google Drive sync
23. Upload functionality
24. EXIF extraction
25. AI tagging
26. Variant generation
27. Hashing and deduplication

---

## Architectural Rules

1. **Four Authorities Only:** Projects, Media, Reviews, Brand. No mixing.
2. **No Direct JSON Access:** Components use adapters only.
3. **No Hardcoded IDs:** UI uses intent-based lookups.
4. **All Writes Validated:** Adapter owns writes with validation.
5. **Single Source of Truth:** Each authority has one JSON file.
6. **TypeScript Types Generated:** From single source per authority.
7. **Integrity Validation:** Missing references, orphaned media, duplicate IDs.
8. **Audit Logging:** Every mutation logged with timestamps.
9. **Admin Uses Same Adapters:** Authority Editor and public site share adapters.
10. **Storage Backends Are Producers:** Google Drive, uploads produce to Media Authority, not UI dependencies.

---

## Success Criteria

**Repository Audit Reports Zero:**
- Conflicting image ownership
- Direct JSON imports in components
- Hardcoded media IDs
- Image URLs stored in non-Media authorities
- Legacy function usage (heroBackground, ownerPortrait, servicePhoto, photoFor, media)

**Authority Health:**
- All authorities valid
- No orphaned media
- No missing references
- No duplicate IDs
- All media has alt text
- All projects have valid media references

**Write Pipeline:**
- All saves go through adapters
- All writes validated
- All mutations logged
- Publish/unpublish workflow functional
- Draft state functional
