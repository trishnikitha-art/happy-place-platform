# Motion Audit Report

**Date:** July 26, 2026  
**Project:** Happy Place Carpentry Website  
**Scope:** Complete inventory of all animation and motion systems

---

## Executive Summary

The site currently has a **decentralized motion architecture** with:
- CSS transitions scattered across multiple components
- Custom keyframe animations in globals.css
- 5 custom animation components with duplicated logic
- Framer Motion installed but underutilized
- No centralized motion tokens or configuration
- No global motion provider

**Total Animation Owners:** 12 distinct implementations  
**Bundle Impact:** Framer Motion (12.42.2) installed but minimally used  
**Risk:** High - duplicated logic, no consistency, difficult to maintain

---

## Phase 1: CSS Transitions

### globals.css Transitions

| Location | Property | Duration | Easing | Usage |
|----------|----------|----------|--------|-------|
| Line 371 | color, background-color, border-color | 0.2s | ease | Links |
| Line 317 | transform, box-shadow | 0.3s | cubic-bezier(0.22, 1, 0.36, 1) | photo-mounted |
| Line 447 | box-shadow, border-color | 0.3s | ease-out | float-card |
| Line 472 | transform, box-shadow, background | 0.25s | cubic-bezier(0.22, 1, 0.36, 1) | cta-signature |
| Line 491 | transform | 0.7s | ease-out | photo-breathe |
| Line 498 | opacity, transform | 0.7s | ease-out | reveal-up |

**Issues:**
- Inconsistent durations (0.2s, 0.25s, 0.3s, 0.7s)
- Mixed easing functions (ease, ease-out, custom cubic-bezier)
- No centralized transition tokens
- Hardcoded values throughout

---

## Phase 2: CSS Keyframes

### globals.css Keyframe Animations

| Animation | Duration | Purpose | Location |
|-----------|----------|---------|----------|
| heroDrift | 18s | Hero parallax background drift | Line 486-489 |
| shimmer-slow | 12s | Brand signature slow shimmer | Line 562-564 |
| shimmer-fast | 1s | Brand signature fast shimmer | Line 566-568 |
| happy-gold-sweep | 6s | Happy brand signature gold sweep | Line 589-594 |
| breathe | 50s | Hero atmospheric breathing | Line 611-618 |
| drift | 60s | Hero atmospheric drift | Line 620-627 |

**Issues:**
- Extremely long durations (50s, 60s) - barely perceptible
- No standardized naming convention
- Directly embedded in CSS, not reusable
- No reduced-motion consideration in all cases

---

## Phase 3: Custom Animation Components

### 1. ScrollReveal (`src/components/scroll-reveal.tsx`)

**Technology:** IntersectionObserver  
**Purpose:** Fade/slide animation on viewport entry  
**Current Implementation:**
- Custom IntersectionObserver setup
- Hardcoded threshold: 0.1
- Hardcoded rootMargin: "0px 0px -50px 0px"
- Fixed duration: 700ms
- Fixed easing: ease-out
- Manual transform calculation per direction

**Issues:**
- Duplicated IntersectionObserver logic
- Hardcoded animation values
- No centralized configuration
- Could use Framer Motion's useInView

---

### 2. ParallaxImage (`src/components/parallax-image.tsx`)

**Technology:** Scroll event listener  
**Purpose:** Subtle parallax effect for hero images  
**Current Implementation:**
- Custom scroll event handler
- Manual offset calculation
- Fixed speed: 0.3 (30% of scroll speed)
- Transition: 0.1s ease-out
- Passive scroll listener for performance

**Issues:**
- Custom scroll math instead of proven library
- No smooth damping
- Could use Lenis or Framer Motion's useScroll

---

### 3. CursorSpotlight (`src/components/cursor-spotlight.tsx`)

**Technology:** Mousemove event listener  
**Purpose:** Premium cursor spotlight effect  
**Current Implementation:**
- Mousemove event tracking
- Fixed size: 300px
- Fixed intensity: 0.06
- Transition: 300ms duration
- will-change optimization

**Issues:**
- Custom mouse tracking
- Could use Framer Motion's useMotionValue
- No spring physics

---

### 4. CountUp (`src/components/count-up.tsx`)

**Technology:** requestAnimationFrame + IntersectionObserver  
**Purpose:** Animated number counter for statistics  
**Current Implementation:**
- Custom IntersectionObserver
- Manual requestAnimationFrame loop
- Fixed duration: 800ms
- Custom easeOut cubic calculation
- Manual progress calculation

**Issues:**
- Duplicated IntersectionObserver logic
- Custom animation loop instead of Framer Motion
- Manual easing function

---

### 5. AmbientParticles (`src/components/ambient-particles.tsx`)

**Technology:** Canvas + requestAnimationFrame  
**Purpose:** Floating sawdust particles in hero areas  
**Current Implementation:**
- Canvas-based particle system
- Custom animation loop
- Fixed count: 30 particles
- Fixed color: honey with 0.15 opacity
- Manual particle physics

**Issues:**
- Canvas-based instead of DOM
- Could use Framer Motion for DOM particles
- No configuration options

---

## Phase 4: Dependency Audit

### Currently Installed

| Package | Version | Usage | Status |
|---------|---------|-------|--------|
| framer-motion | 12.42.2 | Installed but underutilized | **Underutilized** |
| next | 16.2.10 | Framework | N/A |
| react | 19.2.4 | Framework | N/A |

### Missing Libraries

| Package | Purpose | Recommendation |
|---------|---------|----------------|
| Lenis | Smooth scroll | **Install** - for premium scroll experience |
| GSAP | Complex timelines | **Optional** - only if complex hero sequences needed |

### Conflicts

None detected.

### Duplicates

None detected.

---

## Phase 5: IntersectionObserver Usage

**Total Instances:** 2 (ScrollReveal, CountUp)

**Issues:**
- Duplicated IntersectionObserver setup
- Different thresholds (0.1 vs 0.1)
- Different rootMargins (0px 0px -50px 0px vs none)
- No centralized viewport detection

---

## Phase 6: Scroll Handlers

**Total Instances:** 1 (ParallaxImage)

**Issues:**
- Custom scroll math
- No scroll smoothing
- Could use Lenis for consistent scroll behavior

---

## Phase 7: Hover Effects

**CSS Hover Effects:**
- photo-mounted: translateY(-4px) + shadow change
- float-card: box-shadow + border-color change
- cta-signature: translateY(-1px) + background + shadow change

**Issues:**
- Inconsistent hover distances (-4px vs -1px)
- No centralized hover tokens
- Mixed transition durations

---

## Phase 8: Page Transitions

**Current Status:** None

**Issues:**
- No page transition system
- No shared layout animations
- Could use Framer Motion's AnimatePresence

---

## Phase 9: Parallax

**Current Implementation:**
- CSS keyframe: heroDrift (18s, scale + translateY)
- Custom component: ParallaxImage (scroll-based)

**Issues:**
- Two different parallax systems
- No unified parallax configuration
- Could use Lenis or Framer Motion parallax

---

## Phase 10: requestAnimationFrame Usage

**Total Instances:** 2 (CountUp, AmbientParticles)

**Issues:**
- Duplicated animation loop logic
- Manual cleanup
- Could use Framer Motion's animate function

---

## Phase 11: Mouse/Pointer Events

**Total Instances:** 1 (CursorSpotlight)

**Issues:**
- Custom mouse tracking
- Could use Framer Motion's useMotionValue

---

## Phase 12: Reduced Motion Support

**Current Implementation:**
- globals.css: `@media (prefers-reduced-motion: reduce)` block
- Disables animations, transitions, scroll-behavior

**Issues:**
- Global blanket approach
- Not all components respect it
- No per-component reduced motion configuration

---

## Phase 13: Animation Owner Map

### By Component

| Component | Animation Type | Owner | Technology |
|----------|---------------|-------|------------|
| ScrollReveal | Scroll reveal | Custom | IntersectionObserver |
| ParallaxImage | Parallax | Custom | Scroll listener |
| CursorSpotlight | Cursor effect | Custom | Mousemove |
| CountUp | Number counter | Custom | rAF + IO |
| AmbientParticles | Particles | Custom | Canvas + rAF |
| Hero section | Background drift | CSS | Keyframes |
| Brand signature | Shimmer | CSS | Keyframes |
| Photo cards | Hover lift | CSS | Transitions |
| CTA buttons | Hover lift | CSS | Transitions |

### By Technology

| Technology | Count | Components |
|------------|-------|------------|
| CSS Transitions | 6 | Links, photos, cards, buttons |
| CSS Keyframes | 6 | Hero, brand, atmospheric |
| IntersectionObserver | 2 | ScrollReveal, CountUp |
| Scroll listeners | 1 | ParallaxImage |
| Mouse listeners | 1 | CursorSpotlight |
| requestAnimationFrame | 2 | CountUp, AmbientParticles |
| Canvas | 1 | AmbientParticles |
| Framer Motion | 0 | None |

---

## Recommendations

### Immediate Actions

1. **Centralize motion tokens** - Create motionTokens.ts
2. **Create motion system** - Build src/motion/ structure
3. **Install Lenis** - For smooth scroll experience
4. **Migrate to Framer Motion** - Replace custom IntersectionObserver, rAF loops
5. **Create Motion Provider** - Global animation context

### Long-term Actions

1. **Phase out custom components** - Migrate to motion system
2. **Standardize transitions** - Use motion tokens everywhere
3. **Implement page transitions** - Use Framer Motion AnimatePresence
4. **Add GSAP** - Only if complex hero sequences needed
5. **Create animation patterns library** - For future Oracle workers

---

## Bundle Size Impact

**Current:** Framer Motion 12.42.2 (underutilized)  
**After Migration:** Framer Motion (fully utilized) + Lenis (~3KB gzipped)  
**Net Impact:** Minimal - Framer Motion already installed, Lenis is small

---

## Performance Impact

**Current Issues:**
- Multiple scroll listeners (1)
- Multiple IntersectionObserver instances (2)
- Multiple requestAnimationFrame loops (2)
- Canvas-based particles (GPU intensive)

**After Migration:**
- Single Lenis scroll listener
- Framer Motion's optimized viewport detection
- Centralized animation loops
- Potential DOM-based particles (lighter than canvas)

**Expected Impact:** Positive - fewer listeners, optimized by libraries

---

## Accessibility Impact

**Current:** Basic reduced-motion support  
**After Migration:** Comprehensive reduced-motion configuration per component

---

## Conclusion

The site has a **decentralized motion architecture** with:
- 12 distinct animation implementations
- Duplicated logic across components
- No centralized configuration
- Framer Motion installed but underutilized
- Missing smooth scroll (Lenis)

**Success Criteria:**
- Centralized motion system in src/motion/
- Global motion tokens
- Motion provider for consistent behavior
- All animations use motion system
- Zero visual regressions
- Improved performance

**Estimated Effort:** 8-12 hours for full migration
