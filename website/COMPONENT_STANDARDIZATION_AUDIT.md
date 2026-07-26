# Component Standardization Audit

**Date:** July 26, 2026  
**Project:** Happy Place Carpentry Website  
**Priority:** Priority 5 - Component Standardization  
**Scope:** Audit for duplicate component implementations

---

## Executive Summary

**Components Audited:** 5 categories  
**Duplicates Found:** 1 (Reveal systems)  
**Canonical Implementations Needed:** 1  
**Status:** Partially complete

---

## Lightboxes

### Finding: Single Implementation

**Components Found:**
- `ProjectLightbox` (src/components/project-lightbox.tsx)

**Components Expected:** None (user mentioned GalleryLightbox but it doesn't exist)

**Status:** ✅ No duplicates

**Analysis:**
- Only one lightbox implementation exists
- Full-featured with keyboard navigation, swipe, zoom
- No duplicate implementations to canonicalize

**Recommendation:** Keep current implementation

---

## Reveal Components

### Finding: Duplicate Implementations

**Components Found:**
1. `ScrollReveal` (src/components/scroll-reveal.tsx) - Framer Motion component
2. `.reveal-up` (src/app/globals.css:498-499) - CSS class + JavaScript

**Status:** ⚠️ Duplicate implementations

**Analysis:**

**ScrollReveal Component:**
- Uses Framer Motion whileInView
- Supports directions: up, down, left, right
- Reduced motion compliant
- Clean, declarative API
- Better performance (optimized viewport detection)

**.reveal-up CSS Class:**
- Uses CSS transitions
- Requires JavaScript to toggle .is-visible class
- Only supports up direction
- Not reduced motion compliant
- Manual IntersectionObserver needed

**Usage in Codebase:**
- ScrollReveal: Used extensively in homepage
- .reveal-up: Not found in current codebase (legacy)

**Recommendation:** 
- Canonicalize on ScrollReveal component
- Remove .reveal-up CSS class from globals.css
- Migrate any legacy uses to ScrollReveal

---

## Cards

### Finding: Multiple Card Types

**Components Found:**
1. `ServiceCard` (src/components/service-card.tsx)
2. `CraftCard` (src/components/ui/card.tsx)
3. `.float-card` (src/app/globals.css:441-465) - CSS class
4. `.photo-mounted` (src/app/globals.css:315-344) - CSS class

**Status:** ⚠️ Multiple implementations for different purposes

**Analysis:**

**ServiceCard:**
- Purpose: Service display cards
- Features: Image, title, description, CTA
- Used in: Homepage services section

**CraftCard:**
- Purpose: Generic card component
- Features: Basic card styling
- Used in: Reviews, generic content

**.float-card:**
- Purpose: CSS-only floating card
- Features: Hover effects, gradient overlay
- Used in: Not actively used (legacy)

**.photo-mounted:**
- Purpose: Photo frame styling
- Features: Image mounting effect, hover lift
- Used in: Homepage, about page

**Recommendation:**
- Keep ServiceCard (service-specific)
- Keep CraftCard (generic)
- Keep .photo-mounted (photo-specific visual)
- Remove .float-card (unused, duplicate functionality)

---

## Modals

### Finding: No Modal Implementations

**Components Found:** None

**Status:** ✅ No duplicates

**Analysis:**
- No modal/dialog components found
- No duplicate implementations

**Recommendation:** None needed

---

## Gallery Layouts

### Finding: Single Implementation

**Components Found:**
- `ProjectLightbox` (full-screen gallery)
- Homepage bento grid (inline implementation)

**Status:** ✅ No duplicate gallery systems

**Analysis:**
- Only one lightbox implementation
- Gallery layouts are inline (not componentized)
- No duplicate gallery rendering systems

**Recommendation:** Keep current approach

---

## Summary Table

| Category | Implementations | Duplicates | Recommendation |
|----------|----------------|------------|----------------|
| Lightboxes | 1 | 0 | Keep ProjectLightbox |
| Reveal | 2 | 1 | Canonicalize on ScrollReveal |
| Cards | 4 | 1 | Remove .float-card |
| Modals | 0 | 0 | None needed |
| Gallery | 1 | 0 | Keep current approach |

---

## Implementation Plan

### Phase 1: Remove .reveal-up CSS Class
- Remove from globals.css
- No migration needed (not used in codebase)
- Commit separately

### Phase 2: Remove .float-card CSS Class
- Remove from globals.css
- No migration needed (not used in codebase)
- Commit separately

### Phase 3: Document Card Usage
- Document when to use ServiceCard
- Document when to use CraftCard
- Document when to use .photo-mounted
- Commit separately

---

## Conclusion

**Duplicates Found:** 1 (Reveal systems)  
**Unused Components:** 2 (.reveal-up, .float-card)  
**Canonicalization Needed:** 1 (Reveal → ScrollReveal)

**Next Steps:**
1. Remove .reveal-up CSS class
2. Remove .float-card CSS class
3. Document card component usage guidelines
