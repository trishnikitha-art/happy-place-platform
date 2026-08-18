# SEMANTIC INTEGRATION FORENSIC ANALYSIS

## A. What Actually Owns Image Semantics Today

### Current Production Components Have Full Semantic Context

**Homepage (src/app/page.tsx):**
- **Hero:** Knows it's rendering homepage hero, has Brand Authority mediaId, knows route `/`, section "Hero"
- **Owner portrait:** Knows it's rendering owner portrait, has Brand Authority mediaId, knows route `/`, section "Hero"
- **Service cards:** Knows they're rendering service-specific images, have derived mediaIds, know route `/`, section "Services"
- **Featured projects:** Knows they're rendering project heroes, have Projects Authority mediaIds, know route `/`, section "Featured Projects"

**Project pages (src/components/project-spotlight.tsx):**
- **Project hero:** Knows it's rendering project hero, has Projects Authority mediaId, knows route `/projects/[slug]`, section "Hero"
- **Project gallery:** Knows it's rendering gallery images, has Projects Authority mediaIds array, knows route `/projects/[slug]`, section "Gallery"

**Service pages (src/app/services/[slug]/page.tsx):**
- **Before/after:** Knows it's rendering before/after, has Projects Authority mediaIds, knows route `/services/[slug]`, section "Featured Project"
- **Project gallery:** Knows it's rendering project heroes, has Projects Authority mediaIds, knows route `/services/[slug]`, section "Our Work"

**About page (src/app/about/page.tsx):**
- **Owner portrait:** Knows it's rendering owner portrait, has Brand Authority mediaId, knows route `/about`, section "Hero"

### Authority Ownership Pattern

**Brand Authority (brand.v1.json):**
- Owns: homepageHero.mediaId, ownerPortrait.mediaId
- Components access via: `getHomepageHero()`, `getOwnerPortrait()`
- Semantic meaning: "homepage hero", "owner portrait"

**Projects Authority (projects.v1.json):**
- Owns: project.media.hero, project.media.gallery[], project.media.before, project.media.after
- Components access via: `getProjectById()`, `getAllProjects()`
- Semantic meaning: "project hero", "project gallery", "before/after"

**Media Authority (media.v1.json):**
- Owns: canonical media identity, variants, provenance
- Components access via: `getMediaById()`
- No semantic meaning (pure identity)

### Key Finding: Semantic Meaning Exists in Component + Authority Pair

Every production component that renders an image already has:
1. **Semantic context:** Knows what it's rendering (hero, gallery, portrait, etc.)
2. **Authority access:** Knows which authority owns the mediaId
3. **Route/section context:** Knows where it's in the page structure
4. **Component identity:** Knows its own component name

## B. Where Canonical Media IDs Are Available Today

### Brand Authority Chain
```
src/app/page.tsx
  ↓
getHomepageHero()
  ↓
brand.v1.json homepageHero.mediaId
  ↓
getMediaById(mediaId)
  ↓
media.v1.json record
```

### Projects Authority Chain
```
src/components/project-spotlight.tsx
  ↓
project.media.hero
  ↓
projects.v1.json
  ↓
getMediaById(mediaId)
  ↓
media.v1.json record
```

### Service Authority Chain (Indirect)
```
src/components/service-card.tsx
  ↓
getFeaturedServiceMedia(service.slug)
  ↓
finds highest-ranked project for service
  ↓
project.media.hero
  ↓
projects.v1.json
  ↓
getMediaById(mediaId)
  ↓
media.v1.json record
```

## C. The Smallest Legitimate Integration Point

### VisualSlot Activation Strategy

**Option 1: Wrap every <Image> with VisualSlot**
- Pros: Universal coverage
- Cons: Requires modifying every production component, high blast radius
- Status: NOT RECOMMENDED (too invasive)

**Option 2: Activate VisualSlot at component level**
- Pros: Components already have semantic context, can pass to VisualSlot
- Cons: Still requires modifying production components
- Status: POSSIBLE but still invasive

**Option 3: Create semantic Image component wrapper**
- Pros: Single integration point, can intercept all Image usage
- Cons: Requires new component, may affect rendering behavior
- Status: NEEDS INVESTIGATION

**Option 4: Use existing data layer as integration point**
- Pros: Brand/Projects/Media authorities already have semantic contracts
- Cons: VisualSlot is runtime-only, authorities are server-side
- Status: ARCHITECTURAL MISMATCH

### Critical Finding: Server/Client Boundary

**Current architecture:**
- Brand/Projects/Media authorities: Server-side (config files)
- Components: Server components with data layer
- VisualSlot: Client component (useEffect, useRef)
- Slot registry: Client runtime

**Why VisualSlot was never integrated:**
- VisualSlot is a client component
- Production components are primarily server components
- Server components cannot use client VisualSlot wrapper directly
- Would require converting components to client or creating client wrapper components

### Alternative: Server-Side Slot Registration

**Potential approach:**
- Create server-side slot registration during data access
- Register slots in getHomepageHero(), getProjectById(), etc.
- Generate slot metadata at authority access time
- Pass to client via props or data attributes
- VisualSlot reads from pre-registered data

**Status: REQUIRES FURTHER INVESTIGATION**

## D. Whether VisualSlot Can Be Activated Without Changing Visual Behavior

### VisualSlot Design Analysis

**Current VisualSlot behavior:**
- Normal mode: Transparent wrapper (no visual changes)
- Preview mode: Adds dashed outline, click handler, hover effects
- Uses `className` injection and inline styles

**Visual impact assessment:**
- Normal mode: No visual impact (transparent div wrapper)
- Preview mode: Visual changes are intentional (Workbench UI)
- Performance: Minimal (one extra div per wrapped image)

**Conclusion:** VisualSlot CAN be activated without changing production visual behavior

### Server Component Compatibility

**Issue:** Server components cannot use client VisualSlot directly

**Potential solutions:**
1. Convert image sections to client components
2. Create client wrapper components around server Image usage
3. Use data attributes for slot identification, read by client VisualSlot
4. Server-side slot registration, client-side VisualSlot reads

**Status: REQUIRES ARCHITECTURAL DECISION**

## E. Exactly Which Files/Components Would Need Surgical Edits

### If using VisualSlot directly (Option 1 or 2):

**Production components requiring edits:**
1. `src/app/page.tsx` - Wrap hero, owner portrait, service cards, featured projects
2. `src/app/about/page.tsx` - Wrap owner portrait
3. `src/components/project-spotlight.tsx` - Wrap hero, gallery images
4. `src/components/project-photos.tsx` - Wrap gallery images
5. `src/components/service-card.tsx` - Wrap service card image
6. `src/components/before-after-slider.tsx` - Wrap before/after images
7. `src/app/services/[slug]/page.tsx` - Wrap featured project, gallery images
8. `src/app/our-work/OurWorkClient.tsx` - Wrap featured transformations, recent projects, archive

**Edit classification:**
- **Instrumentation-only:** Adding VisualSlot wrapper (no visual change in production)
- **Production behavior change:** None (VisualSlot is transparent in normal mode)
- **Component structure change:** Adding wrapper div around Image/img

**Estimated blast radius:** 8 files, ~15-20 insertion points

### If using data attributes (Option 3):

**Production components requiring edits:**
- Same files as above
- But instead of VisualSlot wrapper, add data attributes:
  - `data-slot-id="homepage-hero"`
  - `data-slot-route="/"`
  - `data-slot-section="Hero"`
  - `data-slot-media-id="brand-hero"`

**Client-side VisualSlot:**
- Modified to scan DOM for data attributes
- Register slots based on found attributes
- No component wrapper needed

**Edit classification:**
- **Instrumentation-only:** Adding data attributes (no visual or behavior change)
- **Production behavior change:** None
- **Component structure change:** Adding attributes to existing Image/img

**Estimated blast radius:** 8 files, ~15-20 attribute additions

## F. Which Edits Are Production Behavior Changes vs Instrumentation-Only

### Instrumentation-Only Edits:
- Adding VisualSlot wrapper (transparent in normal mode)
- Adding data attributes (pure metadata)
- Adding semantic metadata to existing data structures

### Production Behavior Changes:
- **NONE** in both approaches
- VisualSlot is designed to be invisible in production
- Data attributes have no visual effect

### Performance Impact:
- Minimal: One extra DOM node or few attributes per image
- No layout changes
- No rendering changes

## G. Any Remaining Authority-Boundary Violations

### Current Architecture Respects Authority Boundaries

**Brand Authority:**
- homepageHero.mediaId owned by brand.v1.json
- getHomepageHero() is the only access path
- VisualSlot would only read, not modify

**Projects Authority:**
- project.media.* owned by projects.v1.json
- getProjectById() is the only access path
- VisualSlot would only read, not modify

**Media Authority:**
- Canonical identity owned by media.v1.json
- getMediaById() is the only access path
- VisualSlot would only read, not modify

### Potential Boundary Concerns

**None identified** for read-only slot registration

**Write operations:**
- Would go through existing API endpoints (/api/admin/brand/hero, etc.)
- Would not bypass authority boundaries
- Would use existing validation

## H. Revised Verification Plan

### Phase 1: Choose Integration Strategy

**Decision required:** VisualSlot wrapper vs data attributes

**Criteria:**
- VisualSlot wrapper: More explicit, requires component structure changes
- Data attributes: Less invasive, requires DOM scanning logic

### Phase 2: Implement Integration

**If VisualSlot wrapper:**
1. Modify production components to wrap images with VisualSlot
2. Pass semantic context (route, section, slotName, mediaId)
3. Ensure server/client compatibility

**If data attributes:**
1. Modify production components to add data attributes
2. Modify VisualSlot to scan DOM and register based on attributes
3. Handle dynamic content (React remounts, route changes)

### Phase 3: Verify Registration

**Gates:**
- Public `/`: No VisualSlot activation, no dashed outlines
- Workbench preview `/`: VisualSlot activates, dashed outlines appear
- Slot registry receives registrations
- Semantic context preserved (route, section, slotName correct)
- Media IDs match authority records

### Phase 4: Verify SLOT_CLICK

**Gates:**
- Clicking slotted image in preview produces SLOT_CLICK
- Parent receives SLOT_CLICK with correct slot data
- Origin validation works
- Source validation works
- Wrong origin rejected
- Wrong source rejected

### Phase 5: Verify No Production Impact

**Gates:**
- Public website visual appearance unchanged
- Performance unchanged
- No console errors
- No layout shifts
- No rendering changes

## I. Recommended Integration Strategy

### Data Attributes Approach (Recommended)

**Rationale:**
- Less invasive than component wrapper
- No server/client boundary issues
- Easier to add to existing code
- Reversible
- Can be added incrementally

**Implementation:**
1. Add data attributes to key image locations
2. Modify VisualSlot to use MutationObserver to detect and register
3. Handle dynamic content (React remounts)
4. Fallback to component wrapper if data attributes insufficient

**Files to modify:**
- Production components (8 files) - add data attributes
- VisualSlot - add DOM scanning logic
- slot-registry - handle dynamic registration

**This is the smallest legitimate integration point.**
