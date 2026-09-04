# VisualSlots Forensic Architectural Report (2026-09-03)

## A. What VisualSlots Originally Means

**Evidence from Git History**:

**Commit 7ceb837** (Aug 18, 2026): "Add VisualSlot to gallery photos"
- Created: `our-work-gallery-{projectId}-{index}` slot format
- Purpose: Wrap individual gallery images with VisualSlot for Workbench assignment
- Semantic: Individual gallery photo positions, not entire gallery collection

**Commit 51c1dd7** (Aug 18, 2026): "Add VisualSlot to homepage featured project cards"
- Created: `homepage-featured-project-{projectId}` slot format
- Purpose: Wrap individual featured project card images

**Commit 0cffcdc** (Aug 18, 2026): "Add VisualSlot to project detail pages"
- Created: `project-hero-{projectId}` and `project-gallery-{projectId}` slot formats
- Purpose: Wrap project hero and gallery photos

**Commit 2a4f267** (Aug 28, 2026): "Add real bottom visual slots to homepage and about page"
- Created: `homepage-bottom-visual-slot` and `about-bottom-visual-slot`
- Purpose: Specific UI placement slots

**Canonical Slot-ID Scheme** (from website-structure.ts):
```
homepage.hero → homepage-hero-slot
homepage.owner-portrait → homepage-owner-portrait-slot
service.<slug>.image → service-card-slot-<slug>
project.<projectId>.hero → project-<projectId>-hero-slot
project.<projectId>.before → project-<projectId>-before-slot
project.<projectId>.after → project-<projectId>-after-slot
```

**Conclusion**: VisualSlots originally meant **specific UI placement slots** for individual media assignments, NOT gallery collection ordering.

## B. Correct Architecture: HYBRID

**Evidence from Repository**:

**VisualSlots** (from visual-asset-registry.ts):
- Identity: Page-scoped + component-scoped specific UI locations
- Semantic: "This exact UI location may receive a media asset"
- Example: `homepage-hero-slot`, `project-hero-slot-fences`, `service-card-slot-painting`
- Ownership: HPP application domain (Workbench control surface)
- Storage: Runtime registration (slot-registry.ts) via postMessage
- Persistence: Projects.v1.json (individual media assignments)

**Gallery Collection** (from projects.v1.json):
- Identity: Per-project ordered media ID arrays
- Semantic: "These assets belong to this project's gallery, in this order"
- Storage: `project.media.gallery[]` array
- Authority: CAS-protected via `galleryRevision`
- API: `/api/admin/projects/gallery` (PUT with complete ordered array)

**Two Distinct Semantic Layers**:
1. **Media Collection Order** = Which assets belong to project gallery and in what order
2. **Visual Placement** = Which UI location receives which media asset

**Proof of Separation**:
- VisualSlots: Individual slot assignments (hero, before, after, service cards)
- Gallery: Per-project ordered collection (project.media.gallery[])
- Different persistence: VisualSlots = individual assignments, Gallery = ordered arrays
- Different APIs: VisualSlots = individual slot mutations, Gallery = atomic PUT with CAS

**Why HYBRID is correct**:
- Repository evidence shows VisualSlots were used for individual UI placements
- Repository evidence shows gallery has separate collection authority
- They serve different semantic purposes
- Combining them would violate single authority principle

## C. Authority Map

**Media Identity**:
- Authority: `media.v1.json` (canonical media records)
- Source: Drive → materialization → PublishedMediaAsset
- Projection: MEDIA_KV runtime authority
- Consumer: All media-consuming systems

**Collection Membership/Order**:
- Authority: `projects.v1.json` (project.media.gallery[] + galleryRevision)
- Mutation: `/api/admin/projects/gallery` (PUT with CAS)
- API: Gallery Management Panel (complete ordered array)
- Consumer: Our Work page, project detail pages

**Visual Placement**:
- Authority: Individual VisualSlot assignments in projects.v1.json
- Mutation: Slot-specific API endpoints (brand, projects, services)
- Registration: Slot registry (runtime, Workbench communication)
- Consumer: Homepage, About, Services, Projects pages

**Provenance**:
- Authority: Drive → Harvest → Canonical Media Identity
- Preservation: PublishedMediaAsset retains Drive provenance
- Boundary: Public media gate enforces PublishedMediaAsset only

**Projection**:
- Authority: Generated projections (.generated/*.json)
- Consumer: Public website
- Safety: Public site never reaches into operational storage

## D. Existing Systems Preserved

**Preserved**:
- VisualSlot component (slot registration for individual UI placements)
- Slot registry (runtime Workbench communication)
- Per-project gallery arrays (collection membership and order)
- Gallery revision/CAS system (concurrency control)
- Individual slot mutation APIs (brand, projects, services)
- Media authority (media.v1.json)
- Project authority (projects.v1.json)
- Public media gate

**NOT Replaced**:
- Individual slot assignments remain VisualSlot-based
- Gallery collection ordering remains array-based with CAS
- Two semantic layers remain distinct

## E. New Connections

**Current Gap**: You want human-controlled gallery ordering via VisualSlots

**Forensic Finding**: The current system ALREADY has human-controlled gallery ordering via the Gallery Management Panel, but it's a separate UI surface from VisualSlots.

**Missing Connection**: The Gallery Management Panel is a separate "Gallery Management" mode toggle, not integrated into the primary VisualSlots-based Workbench surface.

**Required Connection**: Integrate the existing Gallery Management Panel ordering capabilities into the primary VisualSlots-based Workbench surface without creating duplicate authority.

## F. Duplicate Authorities Eliminated

**Current Duplicate**: The Gallery Management Panel is a separate "Gallery Management" mode toggle that creates a separate gallery UI surface.

**Elimination Required**: Remove the separate "Gallery Management" mode toggle and integrate gallery ordering directly into the primary VisualSlots-based Workbench surface.

**Authority Remains**: 
- Gallery collection order remains in projects.v1.json
- VisualSlots remain for individual UI placements
- No duplicate truth sources created

## G. Security Boundaries

**Enforced**:
- Workbench authentication for all mutations
- Project authorization for project mutations
- Media authority validation (only PublishedMediaAsset allowed)
- CAS for gallery mutations (galleryRevision)
- Public media gate (rejects DriveReference, incomplete records)
- No arbitrary media IDs (must resolve to authoritative media)
- No Drive-prefixed publication
- Materialization boundary enforced

## H. Tests

**PASS**:
- VisualSlot registration and communication
- Individual slot assignment APIs
- Gallery CAS/concurrency protection
- Public media gate validation

**FAIL**:
- Gallery Management Panel is separate duplicate UI surface (not integrated)
- Gallery ordering not accessible from primary VisualSlots surface

**UNPROVEN**:
- Integrated gallery ordering in primary VisualSlots surface
- End-to-end human gallery ordering workflow

## Architectural Verdict

**Architecture**: HYBRID
- VisualSlots = Individual UI placement assignments
- Gallery Collection = Per-project ordered media membership
- Distinct semantic layers that serve different purposes

**Correct Fix**: Remove the separate "Gallery Management" mode toggle and integrate gallery ordering directly into the primary VisualSlots-based Workbench surface.

**DO NOT**:
- Replace gallery arrays with VisualSlots
- Create duplicate gallery authority
- Remove gallery CAS/protection
- Change gallery collection semantic meaning

**DO**:
- Integrate existing Gallery Management Panel capabilities into primary VisualSlots surface
- Remove duplicate "Gallery Management" mode toggle
- Preserve gallery array + CAS authority
- Preserve VisualSlot assignment authority
