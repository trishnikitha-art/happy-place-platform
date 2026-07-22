# Phase 1: Repository Audit - Media Authority Migration

## Audit Summary

This report documents all legacy media lookups that need to be migrated to the new Media Authority architecture.

**Search Terms:**
- heroBackground
- servicePhoto
- photoFor
- media
- getMediaById
- presentation.v1
- gallery.json

---

## Legacy Functions (To Deprecate)

### lib/media.ts

| Function | Line | Current Purpose | Replacement Adapter | Action |
|----------|------|-----------------|-------------------|--------|
| `heroBackground()` | 160 | Primary full-width hero photograph | `getProjectHero()` or new homepage adapter | Deprecate |
| `servicePhoto()` | 136 | Photo for service card by slug | `getFeaturedServiceMedia()` (to be added) | Deprecate |
| `photoFor()` | 112 | Best photo for a role | New intent-based adapters | Deprecate |
| `photoForAny()` | 122 | Best photo for role regardless of quality | New intent-based adapters | Deprecate |
| `featuredTransformation()` | 155 | Single most important image after hero | New intent-based adapter | Deprecate |
| `homepageSelection()` | 166 | Curated homepage set | New homepage adapter | Deprecate |
| `galleryAll()` | 178 | Full museum/archive of photos | New gallery adapter | Deprecate |
| `ownerPortrait()` | 203 | Taylor & Lanie portrait | New brand adapter | Deprecate |
| `hasRealPhotos()` | 207 | Check if real photos exist | New validation adapter | Deprecate |
| `realGalleryItems()` | 213 | Gallery items for lightbox | New gallery adapter | Deprecate |
| `media()` | 255 | Backward-compatible intent resolver | New intent-based adapters | Deprecate |
| `galleryData` | 272 | Export of gallery data | Remove direct access | Delete |

**Imports to Remove:**
- `gallery` from `@/config/gallery.json` (line 27)
- `presentation` from `@/config/presentation.v1.json` (line 28)
- `buildPresentationAuthority` from `./presentation-authority` (line 29)

---

## Legacy Files (To Delete)

### lib/presentation-authority.ts

| Purpose | Replacement Adapter | Action |
|---------|-------------------|--------|
| Presentation Authority index | Integrated into new media adapter | Delete |

### config/gallery.json

| Purpose | Replacement Adapter | Action |
|---------|-------------------|--------|
| Machine-generated image records | media.v1.json | Delete |

### config/presentation.v1.json

| Purpose | Replacement Adapter | Action |
|---------|-------------------|--------|
| Human-curated decisions (roles, priorities) | media.v1.json + service registry | Delete |

---

## Component Usage (To Migrate)

### app/page.tsx (Homepage)

| Function | Line | Current Purpose | Replacement Adapter | Action |
|----------|------|-----------------|-------------------|--------|
| `heroBackground()` | 23 | Primary hero photograph | New homepage hero adapter | Migrate |
| `ownerPortrait()` | 15 | Owner portrait for family section | New brand adapter | Migrate |

### app/about/page.tsx (About)

| Function | Line | Current Purpose | Replacement Adapter | Action |
|----------|------|-----------------|-------------------|--------|
| `ownerPortrait()` | 7, 35 | Owner portrait | New brand adapter | Migrate |

### app/our-work/page.tsx (Our Work)

| Function | Line | Current Purpose | Replacement Adapter | Action |
|----------|------|-----------------|-------------------|--------|
| `galleryAll()` | 10, 25 | Full archive grouped by project | New gallery adapter | Migrate |
| `hasRealPhotos()` | 10, 23 | Check if real photos exist | New validation adapter | Migrate |
| `realGalleryItems()` | 10, 23 | Gallery items for lightbox | New gallery adapter | Migrate |

### app/projects/[slug]/page.tsx (Project Detail)

| Issue | Line | Current Purpose | Replacement Adapter | Action |
|-------|------|-----------------|-------------------|--------|
| Hardcoded project ID | 40 | Vertical slice validation | Use `project.id` from project data | Migrate |

---

## New Adapter Functions (Keep)

### lib/media.ts

| Function | Line | Purpose | Status |
|----------|------|---------|--------|
| `getMediaById()` | 296 | Get media by ID from media.v1.json | **Keep** (new architecture) |
| `getProjectMedia()` | 320 | Get all media for a project | **Keep** (new architecture) |
| `getProjectHero()` | 330 | Get hero image for a project | **Keep** (new architecture) |
| `getProjectThumbnail()` | 338 | Get thumbnail for a project | **Keep** (new architecture) |
| `getProjectBeforeAfter()` | 346 | Get before/after pair for a project | **Keep** (new architecture) |
| `getProjectMediaByRole()` | 357 | Get media by role for a project | **Keep** (new architecture) |

---

## Components Already Using New Architecture

### components/featured-review.tsx

| Function | Line | Purpose | Status |
|----------|------|---------|--------|
| `getMediaById()` | 6, 18 | Get project hero media | **Correct** (new architecture) |
| `getProjectById()` | 5, 16 | Get project data | **Correct** (new architecture) |

### components/review-card.tsx

| Function | Line | Purpose | Status |
|----------|------|---------|--------|
| `getMediaById()` | 6, 18 | Get project hero media | **Correct** (new architecture) |
| `getProjectById()` | 5, 16 | Get project data | **Correct** (new architecture) |

### components/before-after-slider.tsx

| Function | Line | Purpose | Status |
|----------|------|---------|--------|
| `getMediaById()` | 17, 48 | Get before/after media | **Correct** (new architecture) |

---

## Migration Priority

### High Priority (Phase 2)
1. Remove hardcoded project ID in `app/projects/[slug]/page.tsx`
2. Migrate homepage hero in `app/page.tsx`
3. Migrate owner portrait in `app/page.tsx` and `app/about/page.tsx`

### Medium Priority (Phase 3)
4. Migrate gallery functions in `app/our-work/page.tsx`
5. Deprecate legacy functions in `lib/media.ts`
6. Delete legacy files (`presentation-authority.ts`, `gallery.json`, `presentation.v1.json`)

### Low Priority (Phase 4)
7. Add `getFeaturedServiceMedia()` adapter for service cards
8. Migrate service cards to use new adapter
9. Remove all legacy function exports

---

## Architectural Rules to Enforce

1. **No component imports authority JSON directly** - Use adapters only
2. **No hardcoded project IDs or media IDs** - Use intent-based lookups
3. **All writes validated before persistence** - Adapter owns writes
4. **Every authority has TypeScript types** - Single source of truth
5. **Every authority has integrity validation** - Missing references, orphaned media
6. **Every mutation logged with timestamps** - For audit/history support
7. **Admin pages use same adapters as public site** - Single adapter layer
