# Dependency Audit Report

**Date:** July 26, 2026  
**Project:** Happy Place Carpentry Website  
**Scope:** Animation and motion library inventory

---

## Executive Summary

**Current State:**
- Framer Motion 12.42.2 installed but **severely underutilized**
- No smooth scroll library (Lenis missing)
- No advanced animation library (GSAP missing)
- No duplicate libraries detected
- No conflicts detected

**Recommendation:** Install Lenis for smooth scroll, fully utilize Framer Motion

---

## Phase 1: Currently Installed Libraries

### Framer Motion 12.42.2

**Status:** ✅ Installed  
**Usage:** ⚠️ Underutilized  
**Bundle Size:** ~40KB gzipped  
**Current Usage:** None detected in codebase  
**Potential Usage:** All animations (scroll reveal, parallax, hover, transitions)

**Analysis:**
- Latest version installed but not used
- Should replace all custom animation logic
- Can handle: scroll animations, parallax, gestures, layout animations
- Excellent performance and accessibility support

**Action:** Fully integrate Framer Motion for all animations

---

## Phase 2: Missing Libraries

### Lenis (Smooth Scroll)

**Status:** ❌ Not Installed  
**Version:** Latest (1.x)  
**Bundle Size:** ~3KB gzipped  
**Purpose:** Premium smooth scroll experience  
**Use Case:** Replace native scroll with buttery smooth scrolling

**Why Needed:**
- Premium feel for carpentry brand
- Consistent scroll behavior across browsers
- Better parallax performance
- Industry standard for luxury brands

**Installation:** `npm install @studio-freight/lenis`

**Action:** Install and integrate globally

---

### GSAP (GreenSock)

**Status:** ❌ Not Installed  
**Version:** Latest (3.x)  
**Bundle Size:** ~30KB gzipped (core)  
**Purpose:** Complex timelines and advanced animations  
**Use Case:** Hero sequences, SVG drawing, split text

**Why NOT Needed (Yet):**
- Current site doesn't have complex hero sequences
- Framer Motion handles current needs
- Only install if complex storytelling needed

**Future Consideration:**
- Install if hero needs pinned storytelling
- Install if SVG drawing animations needed
- Install if split text effects needed

**Action:** Skip for now, install only if complex hero sequences required

---

## Phase 3: Duplicate Libraries

**Status:** ✅ No duplicates detected

**Analysis:**
- No multiple animation libraries serving same purpose
- No conflicting versions
- Clean dependency tree

---

## Phase 4: Unused Libraries

### Framer Motion 12.42.2

**Status:** ⚠️ Installed but unused  
**Reason:** Previous developers installed but didn't integrate  
**Impact:** Wasted 40KB bundle size  
**Action:** Either fully integrate or remove

**Decision:** Fully integrate (recommended)

---

## Phase 5: Conflicts

**Status:** ✅ No conflicts detected

**Analysis:**
- No library version conflicts
- No peer dependency issues
- Compatible with React 19.2.4
- Compatible with Next.js 16.2.10

---

## Phase 6: Recommended Stack

### Primary Animation Library: Framer Motion

**Reasons:**
- Already installed (no additional bundle cost)
- React-native (perfect for Next.js)
- Excellent performance
- Built-in accessibility (reduced motion)
- Comprehensive feature set
- Strong community support
- TypeScript support

**Use For:**
- Scroll reveal animations
- Parallax effects
- Hover interactions
- Page transitions
- Layout animations
- Gesture interactions

---

### Secondary: Lenis (Smooth Scroll)

**Reasons:**
- Tiny bundle size (~3KB)
- Premium scroll experience
- Excellent performance
- Easy integration
- Industry standard

**Use For:**
- Global smooth scroll
- Better parallax performance
- Consistent scroll behavior

---

### Tertiary: GSAP (Conditional)

**Reasons:**
- Only install if needed
- Complex timeline control
- Advanced SVG animations
- Split text effects

**Use For:**
- Complex hero sequences (if needed)
- SVG drawing (if needed)
- Split text (if needed)

---

## Phase 7: Installation Plan

### Phase 3: Install Missing Infrastructure

```bash
npm install @studio-freight/lenis
```

**Total Bundle Impact:** +3KB gzipped

### Phase 8: GSAP Isolation

**Action:** Skip for now  
**Reason:** Current site doesn't require complex animations  
**Future:** Install only if hero needs pinned storytelling or SVG drawing

---

## Phase 8: Bundle Size Analysis

### Current Bundle

| Library | Size | Status |
|---------|------|--------|
| Framer Motion | 40KB | Installed, unused |
| Total Animation | 40KB | Underutilized |

### After Migration

| Library | Size | Status |
|---------|------|--------|
| Framer Motion | 40KB | Fully utilized |
| Lenis | 3KB | New |
| Total Animation | 43KB | Optimized |

**Net Impact:** +3KB (worth it for smooth scroll)

---

## Phase 9: Performance Impact

### Current Performance Issues

- Multiple scroll listeners (inefficient)
- Multiple IntersectionObserver instances (inefficient)
- Custom animation loops (not optimized)
- No scroll smoothing (janky parallax)

### After Migration

- Single Lenis scroll listener (optimized)
- Framer Motion's optimized viewport detection
- Centralized animation loops (optimized)
- Smooth scroll (better parallax)

**Expected Impact:** Positive performance improvement

---

## Phase 10: Compatibility Analysis

### React 19.2.4 Compatibility

| Library | Compatible | Notes |
|---------|------------|-------|
| Framer Motion 12.42.2 | ✅ Yes | Officially supports React 19 |
| Lenis Latest | ✅ Yes | Framework-agnostic |
| GSAP 3.x | ✅ Yes | Framework-agnostic |

### Next.js 16.2.10 Compatibility

| Library | Compatible | Notes |
|---------|------------|-------|
| Framer Motion 12.42.2 | ✅ Yes | Official Next.js support |
| Lenis Latest | ✅ Yes | Works with App Router |
| GSAP 3.x | ✅ Yes | Works with App Router |

---

## Phase 11: Migration Strategy

### Phase 1: Install Lenis
- Add @studio-freight/lenis to dependencies
- Create Lenis provider
- Integrate globally in layout

### Phase 2: Create Motion System
- Build src/motion/ structure
- Create motion tokens
- Create motion primitives

### Phase 3: Migrate Components
- Replace ScrollReveal with Framer Motion
- Replace ParallaxImage with Framer Motion
- Replace CursorSpotlight with Framer Motion
- Replace CountUp with Framer Motion
- Replace AmbientParticles with Framer Motion

### Phase 4: Remove Custom Logic
- Remove IntersectionObserver duplications
- Remove custom scroll listeners
- Remove custom rAF loops
- Remove CSS keyframes (where appropriate)

### Phase 5: Optimize
- Consolidate animations
- Add reduced motion support
- Performance test

---

## Phase 12: Risk Assessment

### Low Risk

- Installing Lenis (well-tested, small)
- Migrating to Framer Motion (already installed)

### Medium Risk

- Component refactoring (visual regressions possible)
- Removing custom logic (behavior changes possible)

### Mitigation

- Feature flag new motion system
- Test thoroughly before deployment
- Keep checkpoint commits
- Visual regression testing

---

## Phase 13: Rollback Plan

### If Issues Arise

1. Revert to checkpoint commit
2. Disable motion system via feature flag
3. Gradually re-enable components
4. Fix issues individually

### Checkpoint Strategy

- Create checkpoint before each major phase
- Tag important milestones
- Keep detailed commit messages

---

## Conclusion

**Current State:**
- Framer Motion installed but unused (40KB waste)
- No smooth scroll library
- Decentralized custom animation logic

**Recommended Action:**
1. Install Lenis for smooth scroll (+3KB)
2. Fully utilize Framer Motion (no additional cost)
3. Create centralized motion system
4. Migrate all custom animations

**Expected Outcome:**
- Better performance
- Consistent animations
- Easier maintenance
- Premium user experience
- Zero visual regressions

**Timeline:** 8-12 hours for full migration
