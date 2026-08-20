# Work-Page Gate Investigation
**Session: Work-page scroll bug forensic investigation**
**Date: 2026-07-23**
**Baseline Git SHA: e2409e8**

## Executive Summary

Investigation of the Work-page scroll bug reveals multiple competing scroll/animation systems and outdated Lenis package.

---

## Issue 1: Outdated Lenis Package ⚠️

### Current State

**Package**: `@studio-freight/lenis` version `1.0.42`

**Modern Package**: `lenis` (same maintainers, new package name)

### Recommendation

**Investigate modernization**: The repository is using the old `@studio-freight/lenis` package. The modern ecosystem uses the `lenis` package directly. Before adding more patches to the old implementation, we should:

1. Investigate the migration path from `@studio-freight/lenis` to `lenis`
2. Verify API compatibility
3. Test the modern package with our scroll architecture
4. Determine if the modern package resolves any of the current issues

**Action**: Modernization investigation before further Lenis patches.

---

## Issue 2: Competing Scroll/Animation Systems 🔴

### Current Work-Page Architecture

The Work page combines multiple independent systems touching the viewport lifecycle:

1. **Lenis** - Smooth scroll interpolation
2. **ScrollReveal** - Component-level reveal animations
3. **IntersectionObserver** - Intersection-based triggers
4. **Framer Motion** - Animation library
5. **Masonry-style CSS columns** - Layout system
6. **Many image elements** - Media loading
7. **Lazy loading** - Deferred image loading
8. **Image decoding** - Browser image processing
9. **Hover transforms** - User interaction effects
10. **Before/after interactions** - Slider component
11. **Client-side media resolution** - Runtime media lookups

### Problem

Multiple independent authorities responding to the same viewport lifecycle can cause:
- Scroll conflicts
- Animation synchronization issues
- Performance degradation
- Unpredictable behavior

### Recommendation

**Unify under explicit ownership**:
- Lenis owns scroll position/interpolation
- IntersectionObserver observes resulting viewport
- CSS performs cheap visual transitions
- Remove redundant ScrollReveal if covered by other systems
- Explicit gesture boundaries for interactive components

---

## Issue 3: ScrollReveal Suspicious 🔴

### Current Implementation

ScrollReveal component has diagnostic logging/render activity around reveal behavior.

### Problem

For a gallery containing many images, this means scrolling can trigger substantial client work.

### Recommendation

**Simplify reveal system**:
- Remove all nonessential production logging
- Lightweight state transition only
- CSS transform/opacity for visual effects
- Avoid multiple animation systems competing

---

## Issue 4: Framer Motion + Lenis Ownership Model 🔴

### Current State

- Lenis owns scroll position/interpolation
- Framer Motion may independently try to own scroll lifecycle
- IntersectionObserver observes viewport
- No explicit ownership model

### Problem

No clear boundary between scroll authorities.

### Recommendation

**Explicit ownership model**:
```
Lenis → browser scroll state → IntersectionObserver → CSS reveal
```

Instead of:
```
Lenis
Framer Motion
IntersectionObserver
scroll handlers
RAF
```

All independently responding.

---

## Issue 5: ScrollToTop Transition Conflict 🔴

### Current State

Site has route-level scroll-to-top mechanism alongside Lenis.

### Problem

Route transition can cause:
- Browser says scrollY = 0
- Lenis internal state says scroll = 850
- Next animation frame pulls page somewhere unexpected

### Recommendation

**Reconcile with Lenis**:
- Navigation should cancel active Lenis inertia
- Set destination
- Synchronize actual scroll
- One authoritative operation per route transition

---

## Issue 6: Before/After Slider Touch/Drag Collision 🔴

### Current State

Before/after slider manually handles:
- touchstart
- touchmove

While Lenis is simultaneously involved in touch scrolling.

### Problem

Two systems inferring intent from the same gesture.

### Recommendation

**Explicit gesture boundary**:
- During slider gesture: slider owns pointer, page scrolling does not
- Outside slider: Lenis/page owns scroll
- Use Pointer Events and touch-action deliberately

---

## Issue 7: Masonry + Lazy Images Layout Shift 🔴

### Current State

Work page uses CSS-column-style masonry. Images loading later can change:
- Element height
- Column height
- Layout position
- Intersection observations

While user is scrolling.

### Problem

Can cause:
- Jumps
- Reveals firing unexpectedly
- Perceived scroll stalls
- Scroll position changes
- Expensive layout/reflow

### Recommendation

**Media system must provide known intrinsic dimensions before decode**:
- This is another reason why media contract must require dimensions
- Use blur placeholders with correct aspect ratio
- Reserve space before image loads

---

## Required Work-Page Gate Tests

### Scroll Purity Test

**Normal page**:
- Exactly 1 Lenis
- Exactly 1 RAF

**Workbench**:
- Exactly 0 Lenis
- Native scroll

**Workbench iframe**:
- Exactly 0 Lenis

**Mount → unmount**:
- 0 surviving RAFs

**StrictMode**:
- 1 surviving Lenis
- 1 surviving RAF

**HMR**:
- No accumulation

**Before/after slider**:
- Pointer gesture doesn't steal page scroll

**Route transition**:
- No stale Lenis position

**Image loading**:
- No catastrophic layout shift

---

## Investigation Conclusion

**Current Status**: Work-page has enough independent scroll/animation/gesture systems that another Lenis patch alone would be irresponsible.

**Recommendation**: 
1. Investigate Lenis modernization (`@studio-freight/lenis` → `lenis`)
2. Unify scroll/animation authorities under explicit ownership
3. Simplify/redundant animation systems
4. Add explicit gesture boundaries
5. Provide known intrinsic dimensions for images
6. Implement scroll purity tests

**Work-page gate**: NOT PASSED - requires architectural unification before Lenis fixes.

---

## Audit Metadata

- **Auditor**: Devin CLI
- **Baseline Git SHA**: e2409e8
- **Audit Date**: 2026-07-23
- **Scope**: Work-page scroll/animation/gesture systems investigation
- **Method**: Component analysis, dependency review, architecture assessment
