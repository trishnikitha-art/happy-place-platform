# Phase 2: Image Ownership Audit

## Ownership Table

| Component | Authority | Current Status | Action Required |
|-----------|-----------|----------------|----------------|
| **Homepage Hero** | Brand | ✅ Migrated to Brand Authority | None |
| **Homepage Owner Portrait** | Brand | ✅ Migrated to Brand Authority | None |
| **Homepage Service Cards** | Media | ⏳ Using placeholders | Migrate to intent-based lookups |
| **Homepage Reviews** | Reviews + Media | ✅ Correct (Reviews Authority with Media references) | None |
| **Homepage Transformations** | Media | ⏳ Using hardcoded config | Migrate to Media Authority |
| **About Page Portrait** | Brand | ✅ Migrated to Brand Authority | None |
| **Our Work Page Gallery** | Media | ⏳ Using placeholder | Migrate to Media Authority |
| **Our Work Page Recent Projects** | Media | ⏳ Using old project structure | Migrate to Media Authority |
| **Project Spotlight** | Media | ⏳ Using old project structure | Migrate to Media Authority |
| **Project Gallery** | Media | ✅ Using Media Authority adapter | None |
| **Before/After Slider** | Media | ✅ Using Media Authority adapter | None |
| **Featured Review** | Reviews + Media | ✅ Correct (Reviews Authority with Media references) | None |
| **Review Card** | Reviews + Media | ✅ Correct (Reviews Authority with Media references) | None |
| **Service Landing Hero** | Media | ⏳ Not implemented | Implement with Media Authority |
| **Service Landing Gallery** | Media | ⏳ Using gallery adapter | Verify Media Authority |
| **Service Landing Related Services** | Media | ⏳ Using placeholder | Migrate to intent-based lookups |

## Detailed Analysis

### ✅ Correct Ownership

#### Homepage Hero
- **Component:** `src/app/page.tsx`
- **Authority:** Brand Authority
- **Adapter:** `getHomepageHero()` from `src/lib/brand.ts`
- **Status:** ✅ Correct
- **Notes:** Migrated from `heroBackground()` to Brand Authority

#### Homepage Owner Portrait
- **Component:** `src/app/page.tsx`
- **Authority:** Brand Authority
- **Adapter:** `getOwnerPortrait()` from `src/lib/brand.ts`
- **Status:** ✅ Correct
- **Notes:** Migrated from `ownerPortrait()` to Brand Authority

#### About Page Portrait
- **Component:** `src/app/about/page.tsx`
- **Authority:** Brand Authority
- **Adapter:** `getOwnerPortrait()` from `src/lib/brand.ts`
- **Status:** ✅ Correct
- **Notes:** Migrated from `ownerPortrait()` to Brand Authority

#### Featured Review
- **Component:** `src/components/featured-review.tsx`
- **Authority:** Reviews Authority + Media Authority
- **Adapter:** `getProjectById()` + `getMediaById()`
- **Status:** ✅ Correct
- **Notes:** Reviews store media IDs only, never URLs

#### Review Card
- **Component:** `src/components/review-card.tsx`
- **Authority:** Reviews Authority + Media Authority
- **Adapter:** `getProjectById()` + `getMediaById()`
- **Status:** ✅ Correct
- **Notes:** Reviews store media IDs only, never URLs

#### Before/After Slider
- **Component:** `src/components/before-after-slider.tsx`
- **Authority:** Media Authority
- **Adapter:** `getMediaById()` from `src/lib/media.ts`
- **Status:** ✅ Correct
- **Notes:** Project-owned before/after media from media.v1.json

#### Project Gallery
- **Component:** `src/components/project-photos.tsx`
- **Authority:** Media Authority
- **Adapter:** `getProjectMedia()` from `src/lib/media.ts`
- **Status:** ✅ Correct
- **Notes:** Vertical slice validation complete

### ⏳ Needs Migration

#### Homepage Service Cards
- **Component:** `src/components/service-card.tsx`
- **Current Authority:** None (placeholders)
- **Target Authority:** Media Authority
- **Target Adapter:** `getFeaturedServiceMedia()` from `src/lib/media.ts`
- **Status:** ⏳ Placeholder-only
- **Action Required:** Implement intent-based media lookups
- **Priority:** High (Phase 4)

#### Homepage Transformations
- **Component:** `src/app/page.tsx`
- **Current Authority:** Hardcoded config (`src/config/transformations.ts`)
- **Target Authority:** Media Authority
- **Target Adapter:** `getProjectBeforeAfter()` from `src/lib/media.ts`
- **Status:** ⏳ Using hardcoded config
- **Action Required:** Migrate to Media Authority
- **Priority:** Medium (Phase 3)

#### Our Work Page Gallery
- **Component:** `src/app/our-work/page.tsx`
- **Current Authority:** None (placeholder)
- **Target Authority:** Media Authority
- **Target Adapter:** `getProjectMedia()` from `src/lib/media.ts`
- **Status:** ⏳ Placeholder
- **Action Required:** Implement gallery with Media Authority
- **Priority:** Medium (Phase 3)

#### Our Work Page Recent Projects
- **Component:** `src/app/our-work/page.tsx`
- **Current Authority:** Old project structure (`src/config/projects.ts`)
- **Target Authority:** Media Authority
- **Target Adapter:** `getProjectThumbnail()` from `src/lib/media.ts`
- **Status:** ⏳ Using old structure
- **Action Required:** Migrate to Media Authority
- **Priority:** Medium (Phase 3)

#### Project Spotlight
- **Component:** `src/components/project-spotlight.tsx`
- **Current Authority:** Old project structure
- **Target Authority:** Media Authority
- **Target Adapter:** `getProjectHero()` from `src/lib/media.ts`
- **Status:** ⏳ Using old structure
- **Action Required:** Migrate to Media Authority
- **Priority:** Medium (Phase 3)

#### Service Landing Hero
- **Component:** `src/app/services/[slug]/page.tsx`
- **Current Authority:** Not implemented
- **Target Authority:** Media Authority
- **Target Adapter:** `getFeaturedServiceMedia()` from `src/lib/media.ts`
- **Status:** ⏳ Not implemented
- **Action Required:** Implement with Media Authority
- **Priority:** Low (future feature)

#### Service Landing Gallery
- **Component:** `src/app/services/[slug]/page.tsx`
- **Current Authority:** Gallery adapter (`src/lib/galleries.ts`)
- **Target Authority:** Media Authority
- **Target Adapter:** Verify gallery adapter uses Media Authority
- **Status:** ⏳ Using gallery adapter
- **Action Required:** Verify Media Authority integration
- **Priority:** Medium (Phase 3)

#### Service Landing Related Services
- **Component:** `src/app/services/[slug]/page.tsx`
- **Current Authority:** None (placeholders)
- **Target Authority:** Media Authority
- **Target Adapter:** `getFeaturedServiceMedia()` from `src/lib/media.ts`
- **Status:** ⏳ Placeholder
- **Action Required:** Migrate to intent-based lookups
- **Priority:** Low (future feature)

## Architecture Compliance

### ✅ Compliant Components
- Homepage hero (Brand Authority)
- Homepage owner portrait (Brand Authority)
- About page portrait (Brand Authority)
- Featured review (Reviews + Media Authorities)
- Review card (Reviews + Media Authorities)
- Before/After slider (Media Authority)
- Project gallery (Media Authority)

### ⏳ Non-Compliant Components
- Homepage service cards (no authority)
- Homepage transformations (hardcoded config)
- Our Work gallery (no authority)
- Our Work recent projects (old structure)
- Project spotlight (old structure)
- Service landing hero (not implemented)
- Service landing gallery (needs verification)
- Service landing related services (no authority)

## Migration Priority

### High Priority (Phase 4)
1. **Homepage Service Cards** - Core UI element, currently placeholders
2. **Service Landing Related Services** - Core UI element, currently placeholders

### Medium Priority (Phase 3)
3. **Homepage Transformations** - Hardcoded config, needs migration
4. **Our Work Gallery** - Placeholder, needs Media Authority
5. **Our Work Recent Projects** - Old structure, needs migration
6. **Project Spotlight** - Old structure, needs migration
7. **Service Landing Gallery** - Needs verification

### Low Priority (Future)
8. **Service Landing Hero** - Not implemented yet
9. **Service Landing Related Services** - Future feature

## Recommendations

### Immediate Actions
1. **Complete Phase 4:** Implement `getFeaturedServiceMedia()` fully and migrate service cards
2. **Start Phase 3:** Migrate homepage transformations to Media Authority
3. **Verify Phase 3:** Audit gallery adapter for Media Authority compliance

### Architectural Improvements
1. **Unify Project Access:** Migrate all components from old project structure to Projects Authority
2. **Centralize Gallery Logic:** Ensure all gallery access goes through Media Authority
3. **Remove Hardcoded Config:** Migrate transformations config to Media Authority

### Validation
1. **Audit All Components:** Ensure no component directly imports JSON
2. **Audit All Adapters:** Ensure all adapters use correct authority
3. **Audit All Types:** Ensure TypeScript types match authority schemas

## Success Criteria

### Phase 2 Complete When
- ✅ All components have assigned authority
- ✅ All components use correct authority
- ✅ No hardcoded image paths
- ✅ No direct JSON imports
- ✅ Clear migration plan for non-compliant components

### Overall Complete When
- ✅ Zero components without authority assignment
- ✅ Zero components using wrong authority
- ✅ Zero hardcoded image paths
- ✅ Zero direct JSON imports
- ✅ All migrations completed
