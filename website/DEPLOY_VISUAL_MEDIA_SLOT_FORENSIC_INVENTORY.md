# DEPLOY VISUAL MEDIA SLOT FORENSIC INVENTORY

**Date**: 2026-08-15
**Repository**: happy-place-platform (DEPLOY branch, updated-deploy)
**Objective**: Map every visual media slot to canonical media authority

---

## 1. HOMEPAGE (src/app/page.tsx)

### Slot 1: Homepage Hero Background
- **Component**: Image (Next.js)
- **Route**: /
- **Section**: Hero
- **Visual Role**: Full-width hero background
- **Slot ID**: NONE (hardcoded)
- **Media ID Source**: NONE
- **Media Authority**: NONE (hardcoded path)
- **Physical Path**: `/images/hero-background-enhanced.jpg`
- **Drive ID**: NONE
- **Projection Source**: NONE
- **Runtime Resolution**: Direct path access
- **Status**: HARD CODED - Authority conflict documented

### Slot 2: Owner Portrait (Homepage)
- **Component**: Image (Next.js)
- **Route**: /
- **Section**: Hero/Owner
- **Visual Role**: Owner portrait
- **Slot ID**: NONE (inline)
- **Media ID Source**: brand.v1.json (ownerPortrait.mediaId = "brand-portrait")
- **Media Authority**: Brand Authority → Media Authority
- **Physical Path**: `variants.web || variants.original` (from media.v1.json)
- **Drive ID**: brand-portrait-001
- **Projection Source**: Brand Authority
- **Runtime Resolution**: getOwnerPortrait() → getMediaById() → variants.web
- **Status**: AUTHORITY CHAIN FUNCTIONAL

### Slot 3: Featured Transformation Hero (Before/After)
- **Component**: BeforeAfterSlider
- **Route**: /
- **Section**: Featured Transformation
- **Visual Role**: Before/after slider
- **Slot ID**: NONE (inline)
- **Media ID Source**: projects.v1.json (exterior-painting-001 → media.hero)
- **Media Authority**: Projects Authority → Media Authority
- **Physical Path**: variants.original || variants.webp || variants.avif
- **Drive ID**: From media.v1.json
- **Projection Source**: Projects Authority
- **Runtime Resolution**: getFeaturedProjects() → getProjectBeforeAfter() → getMediaById()
- **Status**: AUTHORITY CHAIN FUNCTIONAL

---

## 2. ABOUT PAGE (src/app/about/page.tsx)

### Slot 4: Logo (About Page)
- **Component**: Image (Next.js)
- **Route**: /about
- **Section**: Header
- **Visual Role**: Brand logo
- **Slot ID**: NONE (inline)
- **Media ID Source**: NONE (hardcoded path)
- **Media Authority**: NONE (hardcoded path)
- **Physical Path**: `/brand/logo.png`
- **Drive ID**: NONE
- **Projection Source**: NONE
- **Runtime Resolution**: Direct path access
- **Status**: HARD CODED BRAND ASSET

### Slot 5: Owner Portrait (About Page)
- **Component**: Image (Next.js)
- **Route**: /about
- **Section**: Hero/Owner
- **Visual Role**: Owner portrait
- **Slot ID**: NONE (inline)
- **Media ID Source**: brand.v1.json (ownerPortrait.mediaId = "brand-portrait")
- **Media Authority**: Brand Authority → Media Authority
- **Physical Path**: `variants.web || variants.original`
- **Drive ID**: brand-portrait-001
- **Projection Source**: Brand Authority
- **Runtime Resolution**: getOwnerPortrait() → getMediaById() → variants.web
- **Status**: AUTHORITY CHAIN FUNCTIONAL

---

## 3. PROJECT DETAIL PAGES (src/app/projects/[slug]/page.tsx)

### Slot 6: Project Hero
- **Component**: ProjectSpotlight
- **Route**: /projects/[slug]
- **Section**: Hero
- **Visual Role**: Project hero image
- **Slot ID**: NONE (inline)
- **Media ID Source**: projects.v1.json (project.media.hero)
- **Media Authority**: Projects Authority → Media Authority
- **Physical Path**: `variants.web || variants.original`
- **Drive ID**: From media.v1.json
- **Projection Source**: Projects Authority
- **Runtime Resolution**: getProjectById() → getMediaById() → variants.web
- **Status**: AUTHORITY CHAIN FUNCTIONAL

### Slot 7: Project Gallery Images
- **Component**: ProjectPhotos
- **Route**: /projects/[slug]
- **Section**: Gallery
- **Visual Role**: Project gallery
- **Slot ID**: NONE (inline)
- **Media ID Source**: projects.v1.json (project.media.gallery[])
- **Media Authority**: Projects Authority → Media Authority
- **Physical Path**: `variants.web || variants.original || variants.thumbnail`
- **Drive ID**: From media.v1.json
- **Projection Source**: Projects Authority
- **Runtime Resolution**: getProjectMedia() → getMediaById() → variants.web
- **Status**: AUTHORITY CHAIN FUNCTIONAL

---

## 4. SERVICES PAGE (src/app/services/[slug]/page.tsx)

### Slot 8: Service Featured Project Hero
- **Component**: ProjectSpotlight
- **Route**: /services/[slug]
- **Section**: Featured Project
- **Visual Role**: Service example project hero
- **Slot ID**: NONE (inline)
- **Media ID Source**: projects.v1.json (via getFeaturedServiceMedia())
- **Media Authority**: Projects Authority → Media Authority
- **Physical Path**: `variants.web || variants.original`
- **Drive ID**: From media.v1.json
- **Projection Source**: Projects Authority (filtered by service)
- **Runtime Resolution**: getFeaturedServiceMedia() → getMediaById() → variants.web
- **Status**: AUTHORITY CHAIN FUNCTIONAL

---

## 5. OUR WORK PAGE (src/app/our-work/OurWorkClient.tsx)

### Slot 9: Featured Transformation (Before/After)
- **Component**: BeforeAfterSlider
- **Route**: /our-work
- **Section**: Featured Transformations
- **Visual Role**: Before/after slider
- **Slot ID**: NONE (inline)
- **Media ID Source**: projects.v1.json (fences-001 → media.before/after)
- **Media Authority**: Projects Authority → Media Authority
- **Physical Path**: variants.original || variants.webp || variants.avif
- **Drive ID**: From media.v1.json
- **Projection Source**: Projects Authority
- **Runtime Resolution**: getProjectBeforeAfter() → getMediaById() → variants.original
- **Status**: AUTHORITY CHAIN FUNCTIONAL

### Slot 10: Project Gallery Images
- **Component**: ProjectPhotos
- **Route**: /our-work
- **Section**: Project Gallery
- **Visual Role**: Project gallery
- **Slot ID**: NONE (inline)
- **Media ID Source**: projects.v1.json (project.media.gallery[])
- **Media Authority**: Projects Authority → Media Authority
- **Physical Path**: `variants.web || variants.original || variants.thumbnail`
- **Drive ID**: From media.v1.json
- **Projection Source**: Projects Authority
- **Runtime Resolution**: getProjectMedia() → getMediaById() → variants.web
- **Status**: AUTHORITY CHAIN FUNCTIONAL

---

## 6. SERVICE CARD COMPONENT (src/components/service-card.tsx)

### Slot 11: Service Card Image
- **Component**: Image (Next.js)
- **Route**: Multiple (homepage, services)
- **Section**: Service cards
- **Visual Role**: Service representative image
- **Slot ID**: NONE (inline)
- **Media ID Source**: projects.v1.json (via getFeaturedServiceMedia())
- **Media Authority**: Projects Authority → Media Authority
- **Physical Path**: `variants.web || variants.original`
- **Drive ID**: From media.v1.json
- **Projection Source**: Projects Authority (filtered by service)
- **Runtime Resolution**: getFeaturedServiceMedia() → getMediaById() → variants.web
- **Status**: AUTHORITY CHAIN FUNCTIONAL

---

## 7. PROJECT SPOTLIGHT COMPONENT (src/components/project-spotlight.tsx)

### Slot 12: Project Hero (Spotlight)
- **Component**: Image (Next.js)
- **Route**: Multiple (projects, services)
- **Section**: Project hero
- **Visual Role**: Project hero image
- **Slot ID**: NONE (inline)
- **Media ID Source**: projects.v1.json (project.media.hero)
- **Media Authority**: Projects Authority → Media Authority
- **Physical Path**: `variants.web || variants.original`
- **Drive ID**: From media.v1.json
- **Projection Source**: Projects Authority
- **Runtime Resolution**: getMediaById() → variants.web
- **Status**: AUTHORITY CHAIN FUNCTIONAL

### Slot 13: Project Gallery (Spotlight)
- **Component**: Image (Next.js)
- **Route**: Multiple (projects, services)
- **Section**: Project gallery
- **Visual Role**: Project gallery images
- **Slot ID**: NONE (inline)
- **Media ID Source**: projects.v1.json (project.media.gallery[])
- **Media Authority**: Projects Authority → Media Authority
- **Physical Path**: `variants.web || variants.original`
- **Drive ID**: From media.v1.json
- **Projection Source**: Projects Authority
- **Runtime Resolution**: getProjectMedia() → getMediaById() → variants.web
- **Status**: AUTHORITY CHAIN FUNCTIONAL

---

## 8. BEFORE/AFTER SLIDER COMPONENT (src/components/before-after-slider.tsx)

### Slot 14: Before Image
- **Component**: Image (Next.js)
- **Route**: Multiple (homepage, our-work)
- **Section**: Before/after slider
- **Visual Role**: Before transformation
- **Slot ID**: NONE (inline)
- **Media ID Source**: projects.v1.json (project.media.before)
- **Media Authority**: Projects Authority → Media Authority
- **Physical Path**: `variants.original || variants.webp || variants.avif`
- **Drive ID**: From media.v1.json
- **Projection Source**: Projects Authority
- **Runtime Resolution**: getProjectBeforeAfter() → getMediaById() → variants.original
- **Status**: AUTHORITY CHAIN FUNCTIONAL

### Slot 15: After Image
- **Component**: Image (Next.js)
- **Route**: Multiple (homepage, our-work)
- **Section**: Before/after slider
- **Visual Role**: After transformation
- **Slot ID**: NONE (inline)
- **Media ID Source**: projects.v1.json (project.media.after)
- **Media Authority**: Projects Authority → Media Authority
- **Physical Path**: `variants.original || variants.webp || variants.avif`
- **Drive ID**: From media.v1.json
- **Projection Source**: Projects Authority
- **Runtime Resolution**: getProjectBeforeAfter() → getMediaById() → variants.original
- **Status**: AUTHORITY CHAIN FUNCTIONAL

---

## 9. PROJECT PHOTOS COMPONENT (src/components/project-photos.tsx)

### Slot 16: Gallery Images
- **Component**: Image (Next.js)
- **Route**: Multiple (projects, our-work)
- **Section**: Gallery
- **Visual Role**: Project gallery images
- **Slot ID**: NONE (inline)
- **Media ID Source**: projects.v1.json (project.media.gallery[])
- **Media Authority**: Projects Authority → Media Authority
- **Physical Path**: `variants.web || variants.original || variants.thumbnail`
- **Drive ID**: From media.v1.json
- **Projection Source**: Projects Authority
- **Runtime Resolution**: getProjectMedia() → getMediaById() → variants.web
- **Status**: AUTHORITY CHAIN FUNCTIONAL

---

## 10. BRAND LOGO (Hardcoded Path)

### Slot 17: Logo (Site Header)
- **Component**: Image (Next.js)
- **Route**: All pages
- **Section**: Header
- **Visual Role**: Brand logo
- **Slot ID**: NONE (inline)
- **Media ID Source**: NONE (hardcoded path)
- **Media Authority**: NONE (hardcoded path)
- **Physical Path**: `/brand/logo.png`
- **Drive ID**: NONE
- **Projection Source**: NONE
- **Runtime Resolution**: Direct path access
- **Status**: HARD CODED BRAND ASSET

### Slot 18: Logo (Site Footer)
- **Component**: Image (Next.js)
- **Route**: All pages
- **Section**: Footer
- **Visual Role**: Brand logo
- **Slot ID**: NONE (inline)
- **Media ID Source**: NONE (hardcoded path)
- **Media Authority**: NONE (hardcoded path)
- **Physical Path**: `/brand/logo.png`
- **Drive ID**: NONE
- **Projection Source**: NONE
- **Runtime Resolution**: Direct path access
- **Status**: HARD CODED BRAND ASSET

### Slot 19: Logo (About Page)
- **Component**: Image (Next.js)
- **Route**: /about
- **Section**: Header
- **Visual Role**: Brand logo
- **Slot ID**: NONE (inline)
- **Media ID Source**: NONE (hardcoded path)
- **Media Authority**: NONE (hardcoded path)
- **Physical Path**: `/brand/logo.png`
- **Drive ID**: NONE
- **Projection Source**: NONE
- **Runtime Resolution**: Direct path access
- **Status**: HARD CODED BRAND ASSET

### Slot 20: Logo (Estimate Page)
- **Component**: Image (Next.js)
- **Route**: /estimate
- **Section**: Header
- **Visual Role**: Brand logo
- **Slot ID**: NONE (inline)
- **Media ID Source**: NONE (hardcoded path)
- **Media Authority**: NONE (hardcoded path)
- **Physical Path**: `/brand/logo.png`
- **Drive ID**: NONE
- **Projection Source**: NONE
- **Runtime Resolution**: Direct path access
- **Status**: HARD CODED BRAND ASSET

### Slot 21: Logo (Reviews Page)
- **Component**: Image (Next.js)
- **Route**: /reviews
- **Section**: Header
- **Visual Role**: Brand logo
- **Slot ID**: NONE (inline)
- **Media ID Source**: NONE (hardcoded path)
- **Media Authority**: NONE (hardcoded path)
- **Physical Path**: `/brand/logo.png`
- **Drive ID**: NONE
- **Projection Source**: NONE
- **Runtime Resolution**: Direct path access
- **Status**: HARD CODED BRAND ASSET

### Slot 22: Logo (Newsletter Thank You)
- **Component**: Image (Next.js)
- **Route**: /newsletter/thank-you
- **Section**: Header
- **Visual Role**: Brand logo
- **Slot ID**: NONE (inline)
- **Media ID Source**: NONE (hardcoded path)
- **Media Authority**: NONE (hardcoded path)
- **Physical Path**: `/brand/logo.png`
- **Drive ID**: NONE
- **Projection Source**: NONE
- **Runtime Resolution**: Direct path access
- **Status**: HARD CODED BRAND ASSET

### Slot 23: Logo (Contact Page)
- **Component**: Image (Next.js)
- **Route**: /contact
- **Section**: Header
- **Visual Role**: Brand logo
- **Slot ID**: NONE (inline)
- **Media ID Source**: NONE (hardcoded path)
- **Media Authority**: NONE (hardcoded path)
- **Physical Path**: `/brand/logo.png`
- **Drive ID**: NONE
- **Projection Source**: NONE
- **Runtime Resolution**: Direct path access
- **Status**: HARD CODED BRAND ASSET

### Slot 24: Logo (404 Page)
- **Component**: Image (Next.js)
- **Route**: /404
- **Section**: Header
- **Visual Role**: Brand logo
- **Slot ID**: NONE (inline)
- **Media ID Source**: NONE (hardcoded path)
- **Media Authority**: NONE (hardcoded path)
- **Physical Path**: `/brand/logo.png`
- **Drive ID**: NONE
- **Projection Source**: NONE
- **Runtime Resolution**: Direct path access
- **Status**: HARD CODED BRAND ASSET

---

## 11. REVIEW CARD COMPONENT (src/components/review-card.tsx)

### Slot 25: Review Project Hero
- **Component**: Image (Next.js)
- **Route**: Multiple (homepage, reviews)
- **Section**: Review cards
- **Visual Role**: Review project hero
- **Slot ID**: NONE (inline)
- **Media ID Source**: projects.v1.json (review.projectId → project.media.hero)
- **Media Authority**: Projects Authority → Media Authority
- **Physical Path**: `variants.web || variants.original`
- **Drive ID**: From media.v1.json
- **Projection Source**: Projects Authority
- **Runtime Resolution**: getMediaById() → variants.web
- **Status**: AUTHORITY CHAIN FUNCTIONAL

### Slot 26: Review Project Photo
- **Component**: Image (Next.js)
- **Route**: Multiple (homepage, reviews)
- **Section**: Review cards
- **Visual Role**: Review project photo
- **Slot ID**: NONE (inline)
- **Media ID Source**: projects.v1.json (review.projectId → project.media.gallery[])
- **Media Authority**: Projects Authority → Media Authority
- **Physical Path**: `variants.web || variants.original`
- **Drive ID**: From media.v1.json
- **Projection Source**: Projects Authority
- **Runtime Resolution**: getMediaById() → variants.web
- **Status**: AUTHORITY CHAIN FUNCTIONAL

---

## 12. FEATURED REVIEW COMPONENT (src/components/featured-review.tsx)

### Slot 27: Featured Review Project Hero
- **Component**: Image (Next.js)
- **Route**: Homepage
- **Section**: Featured review
- **Visual Role**: Review project hero
- **Slot ID**: NONE (inline)
- **Media ID Source**: projects.v1.json (review.projectId → project.media.hero)
- **Media Authority**: Projects Authority → Media Authority
- **Physical Path**: `variants.web || variants.original`
- **Drive ID**: From media.v1.json
- **Projection Source**: Projects Authority
- **Runtime Resolution**: getMediaById() → variants.web
- **Status**: AUTHORITY CHAIN FUNCTIONAL

---

## 13. PROJECT LIGHTBOX COMPONENT (src/components/project-lightbox.tsx)

### Slot 28: Lightbox Gallery Images
- **Component**: Image (Next.js)
- **Route**: /projects/[slug]
- **Section**: Lightbox modal
- **Visual Role**: Full-screen gallery
- **Slot ID**: NONE (inline)
- **Media ID Source**: Component state (from project.photos)
- **Media Authority**: Projects Authority → Media Authority
- **Physical Path**: Component-managed (from media.v1.json)
- **Drive ID**: From media.v1.json
- **Projection Source**: Projects Authority
- **Runtime Resolution**: Component state → variants.web
- **Status**: AUTHORITY CHAIN FUNCTIONAL

---

## 14. PARALLAX IMAGE COMPONENT (src/components/parallax-image.tsx)

### Slot 29: Parallax Background
- **Component**: Image (Next.js)
- **Route**: Multiple (decorative)
- **Section**: Decorative parallax
- **Visual Role**: Parallax background
- **Slot ID**: NONE (inline)
- **Media ID Source**: Component prop
- **Media Authority**: Prop-dependent
- **Physical Path**: Component prop
- **Drive ID**: Prop-dependent
- **Projection Source**: Prop-dependent
- **Runtime Resolution**: Component prop
- **Status**: PROP-DEPENDENT (needs investigation)

---

## 15. BEFORE/AFTER CARD COMPONENT (src/components/before-after-card.tsx)

### Slot 30: After Image (Card)
- **Component**: Image (Next.js)
- **Route**: Multiple
- **Section**: Before/after card
- **Visual Role**: After transformation
- **Slot ID**: NONE (inline)
- **Media ID Source**: Component prop
- **Media Authority**: Prop-dependent
- **Physical Path**: `variants.original || "/placeholder.jpg"`
- **Drive ID**: Prop-dependent
- **Projection Source**: Prop-dependent
- **Runtime Resolution**: Component prop
- **Status**: PROP-DEPENDENT (needs investigation)

---

## CRITICAL IMPLEMENTATION CHECKPOINT

**DO NOT begin by editing src/app/page.tsx**

Before any implementation, must establish the exact existing persistence mechanism for a Workbench assignment.

**Required Investigation**:
1. Where does a Workbench assignment (e.g., Homepage Hero → mediaId X) get persisted?
2. Who owns that state (which authority domain)?
3. How does the existing projection/build system consume that state?
4. Is there an existing authoritative write path for visual assignments?

**If no existing authoritative write path exists**: Stop and report the missing boundary. Do not create:
- Temporary local-state
- Browser-state
- JSON-cache
- Workbench-only persistence mechanism

**The first implementation checkpoint must establish**:
- Exact persistence location for assignments
- Authority ownership of that state
- How projection/build consumes it

**Only then modify consumers**.

---

## CONSTITUTIONAL INVARIANT

**A media assignment must never acquire greater authority merely because the Workbench can edit it.**

The Workbench may issue or stage an authorized change, but the resulting state must enter the existing authoritative/provenance pathway.

**A Workbench database/table/JSON file/cache is not authoritative merely because the UI writes to it.**

If no existing authoritative write path exists, stop and report the missing boundary rather than inventing one.

This is particularly important given the PING90/HPP architecture.

---

## REQUIRED SUCCESS CRITERION

**Full Chain** (not merely "Workbench → authority"):

```
Human intent
  ↓
Workbench control surface
  ↓
Authorized assignment/change
  ↓
Authoritative domain state
  ↓
Canonical media identity
  ↓
Projection / variant / build
  ↓
Production consumer
```

**Because "Workbench → authority" is ambiguous**: It could tempt making the Workbench itself the authority.

**The actual constitutional boundary to preserve**:
```
Human intent → authorized mutation → authority → derived representations → consumer
```

**The Vercel thread must prove this entire chain** before allowing it to touch the 30 consumers.

---

## SUMMARY OF AUTHORITY PATTERNS

### 30 CONSUMER/REFERENCE LOCATIONS (Not 30 Independent Semantic Assets)

**Clarification**: This inventory identifies 30 consumer/reference locations, including:
- Repeated component usages (ServiceCard used multiple times)
- 7 logo consumers (same asset, different routes)
- Inline image references in components

**Actual unique semantic assets**: Much smaller (estimated ~8-10 unique visual roles:
- Homepage hero
- Owner portrait
- Brand logo
- Project hero
- Project gallery
- Before/after
- Service card image
- Parallax/background decorative

### AUTHORITY CHAINS (FUNCTIONAL)
1. **Brand Authority → Media Authority**: Owner portrait, homepage hero (OpenGraph)
2. **Projects Authority → Media Authority**: Project heroes, galleries, before/after
3. **Services Authority → Projects Authority → Media Authority**: Service cards

### HARD CODED PATHS (AUTHORITY CONFLICTS)
1. **Homepage hero**: `/images/hero-background-enhanced.jpg` (bypasses Brand/Media Authority)
2. **Brand logo**: `/brand/logo.png` (bypasses Brand/Media Authority - used everywhere)

### PROP-DEPENDENT (NEEDS INVESTIGATION)
1. **Parallax images**: Component prop-dependent
2. **Before/after cards**: Component prop-dependent

### SEMANTIC VS GEOMETRIC SLOTS

**Current State**: NO SEMANTIC SLOT SYSTEM
- No VisualSlot declarations in production code
- No slot IDs in production code
- No slot registry integration in production code
- All image references are INLINE (component-local)

**Workbench State**: HAS SLOT SYSTEM
- VisualSlot component exists
- Slot registry exists
- BUT: Not used in production code
- ONLY used in Workbench preview

**Conclusion**: The website currently uses component-local implicit image locations (Type C), not semantic slots (Type A) or geometric slots (Type B).

---

## ARCHITECTURAL IMPLICATIONS

1. **No semantic slot system exists in production**: The Workbench expects slots, but production code doesn't declare them
2. **All image references are inline**: Each component directly references media IDs or hardcoded paths
3. **Authority chains are functional**: Brand → Media and Projects → Media chains work correctly
4. **Hardcoded paths are authority conflicts**: Homepage hero and brand logo bypass canonical authority
5. **VisualSlot is Workbench-only**: It's not integrated into the production website

---

## NEXT STEPS

To implement a semantic slot system, would require:
1. Adding VisualSlot declarations to all production components
2. Defining semantic slot IDs for every image reference
3. Connecting VisualSlot to existing authority chains
4. Migrating from inline references to slot-based references

This is a major architectural change, not a surgical fix.
