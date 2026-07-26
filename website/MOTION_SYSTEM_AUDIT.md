# Motion System Audit Report

**Date:** July 26, 2026  
**Project:** Happy Place Carpentry Website  
**Priority:** Priority 2 - Motion System Audit  
**Scope:** Complete audit of all animations in codebase

---

## Executive Summary

**Total Animations Found:** 18  
**Components with Animations:** 8  
**CSS Animations:** 6  
**Framer Motion Components:** 5  
**Custom JavaScript Animations:** 0  
**Reduced Motion Compliance:** Partially compliant

---

## CSS Animations

### 1. heroDrift (globals.css:486-489)
**Type:** @keyframes  
**Duration:** 18s  
**Behavior:** Scale 1.06 → 1.12, translateY 0 → -2.5%  
**Usage:** .hero-parallax class  
**Reduced Motion:** Wrapped in `@media (prefers-reduced-motion: no-preference)` ✅  
**Status:** Compliant

```css
@keyframes heroDrift {
  from { transform: scale(1.06) translateY(0); }
  to { transform: scale(1.12) translateY(-2.5%); }
}
```

---

### 2. shimmer-slow (globals.css:542-551)
**Type:** @keyframes  
**Duration:** 12s  
**Behavior:** Background position sweep  
**Usage:** .animate-shimmer-slow class  
**Reduced Motion:** Disabled in `@media (prefers-reduced-motion: reduce)` ✅  
**Status:** Compliant

```css
@keyframes shimmer-slow {
  0%, 85%, 100% {
    background-position: -200% 0;
    opacity: 0;
  }
  90%, 95% {
    background-position: 100% 0;
    opacity: 1;
  }
}
```

---

### 3. shimmer-fast (globals.css:553-560)
**Type:** @keyframes  
**Duration:** 1s  
**Behavior:** Background position sweep  
**Usage:** .animate-shimmer-fast class  
**Reduced Motion:** Disabled in `@media (prefers-reduced-motion: reduce)` ✅  
**Status:** Compliant

```css
@keyframes shimmer-fast {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
```

---

### 4. happy-gold-sweep (globals.css:589-594)
**Type:** @keyframes  
**Duration:** 6s  
**Behavior:** Background position sweep + opacity  
**Usage:** .animate-happy-gold-idle class  
**Reduced Motion:** Disabled in `@media (prefers-reduced-motion: reduce)` ✅  
**Status:** Compliant

```css
@keyframes happy-gold-sweep {
  0%, 50% { background-position: 200% 0; opacity: 0; }
  55% { opacity: 1; }
  85% { background-position: -100% 0; }
  90%, 100% { opacity: 0; background-position: -100% 0; }
}
```

---

### 5. breathe (globals.css:611-618)
**Type:** @keyframes  
**Duration:** 50s  
**Behavior:** Scale 1 → 1.005  
**Usage:** .animate-breathe class  
**Reduced Motion:** Disabled in `@media (prefers-reduced-motion: reduce)` ✅  
**Status:** Compliant

```css
@keyframes breathe {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.005);
  }
}
```

---

### 6. drift (globals.css:620-627)
**Type:** @keyframes  
**Duration:** 60s  
**Behavior:** TranslateX 0 → 10px  
**Usage:** .animate-drift class  
**Reduced Motion:** Disabled in `@media (prefers-reduced-motion: reduce)` ✅  
**Status:** Compliant

```css
@keyframes drift {
  0%, 100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(10px);
  }
}
```

---

## CSS Transitions

### 1. Link Transitions (globals.css:370-372)
**Type:** CSS transition  
**Duration:** 0.2s  
**Behavior:** color, background-color, border-color  
**Usage:** All `<a>` elements  
**Reduced Motion:** Not specifically disabled ⚠️  
**Status:** Non-compliant (should respect reduced motion)

```css
a {
  transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
}
```

---

### 2. Photo Mounted Transitions (globals.css:317)
**Type:** CSS transition  
**Duration:** 0.3s  
**Behavior:** transform, box-shadow  
**Usage:** .photo-mounted class  
**Reduced Motion:** Not specifically disabled ⚠️  
**Status:** Non-compliant (should respect reduced motion)

```css
.photo-mounted {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
```

---

### 3. Float Card Transitions (globals.css:447)
**Type:** CSS transition  
**Duration:** 0.3s  
**Behavior:** box-shadow, border-color  
**Usage:** .float-card class  
**Reduced Motion:** Not specifically disabled ⚠️  
**Status:** Non-compliant (should respect reduced motion)

```css
.float-card {
  transition: box-shadow 0.3s ease-out, border-color 0.3s ease-out;
}
```

---

### 4. CTA Signature Transitions (globals.css:472)
**Type:** CSS transition  
**Duration:** 0.25s  
**Behavior:** transform, box-shadow, background  
**Usage:** .cta-signature class  
**Reduced Motion:** Not specifically disabled ⚠️  
**Status:** Non-compliant (should respect reduced motion)

```css
.cta-signature {
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s cubic-bezier(0.22, 1, 0.36, 1), background 0.25s ease;
}
```

---

### 5. Photo Breathe Transitions (globals.css:491)
**Type:** CSS transition  
**Duration:** 0.7s  
**Behavior:** transform  
**Usage:** .photo-breathe class  
**Reduced Motion:** Wrapped in `@media (prefers-reduced-motion: no-preference)` ✅  
**Status:** Compliant

```css
.photo-breathe {
  transition: transform 0.7s ease-out;
}
```

---

### 6. Reveal Up Transitions (globals.css:498-499)
**Type:** CSS transition  
**Duration:** 0.7s  
**Behavior:** opacity, transform  
**Usage:** .reveal-up class  
**Reduced Motion:** Not specifically disabled ⚠️  
**Status:** Non-compliant (should respect reduced motion)

```css
.reveal-up {
  opacity: 0;
  transform: translateY(18px);
  transition: opacity 0.7s ease-out, transform 0.7s ease-out;
}
```

---

### 7. Animated Input Transitions (animated-input.tsx:56,69)
**Type:** CSS transition  
**Duration:** 0.2s  
**Behavior:** border, label position  
**Usage:** AnimatedInput component  
**Reduced Motion:** Not specifically disabled ⚠️  
**Status:** Non-compliant (should respect reduced motion)

```tsx
className={cn(
  "transition-all duration-200 ease-out",
  // ...
)}
```

---

## Framer Motion Components

### 1. AmbientParticles (ambient-particles.tsx)
**Type:** Framer Motion + requestAnimationFrame  
**Behavior:** 30 floating particles  
**Reduced Motion:** Now compliant ✅ (fixed in Priority 1)  
**Status:** Compliant

---

### 2. ParallaxImage (parallax-image.tsx)
**Type:** Framer Motion useScroll  
**Behavior:** Scroll-based parallax  
**Reduced Motion:** Now compliant ✅ (fixed in Priority 1)  
**Status:** Compliant

---

### 3. CursorSpotlight (cursor-spotlight.tsx)
**Type:** Framer Motion useMotionValue  
**Behavior:** Cursor-following spotlight  
**Reduced Motion:** Now compliant ✅ (fixed in Priority 1)  
**Status:** Compliant

---

### 4. CountUp (count-up.tsx)
**Type:** Framer Motion useMotionValue  
**Behavior:** Animated number counter  
**Reduced Motion:** Now compliant ✅ (fixed in Priority 1)  
**Status:** Compliant

---

### 5. ScrollReveal (scroll-reveal.tsx)
**Type:** Framer Motion whileInView  
**Behavior:** Scroll-triggered reveal  
**Reduced Motion:** Now compliant ✅ (fixed in Priority 1)  
**Status:** Compliant

---

## CSS Reveal Classes

### 1. .reveal-up (globals.css:498-499)
**Type:** CSS class + JavaScript toggle  
**Behavior:** Fade + translateY on scroll  
**Usage:** Non-React sections  
**Reduced Motion:** Not specifically disabled ⚠️  
**Status:** Non-compliant (should respect reduced motion)

---

## JavaScript Animations

### 1. ScrollToTop (scroll-to-top.tsx)
**Type:** window.scrollTo  
**Behavior:** Scroll to top on route change  
**Reduced Motion:** Uses `behavior: "instant"` ✅  
**Status:** Compliant (no animation)

---

## Reduced Motion Compliance Summary

### Compliant Animations ✅

1. heroDrift - Wrapped in `@media (prefers-reduced-motion: no-preference)`
2. shimmer-slow - Disabled in reduced motion media query
3. shimmer-fast - Disabled in reduced motion media query
4. happy-gold-sweep - Disabled in reduced motion media query
5. breathe - Disabled in reduced motion media query
6. drift - Disabled in reduced motion media query
7. photo-breathe - Wrapped in `@media (prefers-reduced-motion: no-preference)`
8. AmbientParticles - Now compliant (Priority 1 fix)
9. ParallaxImage - Now compliant (Priority 1 fix)
10. CursorSpotlight - Now compliant (Priority 1 fix)
11. CountUp - Now compliant (Priority 1 fix)
12. ScrollReveal - Now compliant (Priority 1 fix)
13. ScrollToTop - Uses instant scroll

### Non-Compliant Animations ⚠️

1. **Link Transitions** - Not disabled in reduced motion
2. **Photo Mounted Transitions** - Not disabled in reduced motion
3. **Float Card Transitions** - Not disabled in reduced motion
4. **CTA Signature Transitions** - Not disabled in reduced motion
5. **Reveal Up Transitions** - Not disabled in reduced motion
6. **Animated Input Transitions** - Not disabled in reduced motion

---

## Recommendations

### Priority 1: Fix CSS Transitions

All CSS transitions should respect `prefers-reduced-motion`. Add to globals.css:

```css
@media (prefers-reduced-motion: reduce) {
  a,
  .photo-mounted,
  .float-card,
  .cta-signature,
  .reveal-up,
  .animated-input input,
  .animated-input label {
    transition: none !important;
  }
}
```

### Priority 2: Reveal Up Class

The `.reveal-up` class is a duplicate of ScrollReveal. Should:
- Either migrate all uses to ScrollReveal component
- Or add reduced motion support to the CSS class

### Priority 3: Animated Input

The AnimatedInput component uses CSS transitions. Should:
- Add reduced motion check to component
- Or disable transitions via CSS media query

---

## Motion Philosophy Review

### Animations That Communicate Craftsmanship ✅

1. **Hero Drift** - Subtle, premium feel
2. **Brand Signature Shimmer** - Premium brand feel
3. **Photo Breathe** - Subtle depth
4. **Scroll Reveal** - Content discovery

### Animations That May Be Unnecessary ⚠️

1. **Cursor Spotlight** - Decorative, no usability improvement
2. **Ambient Particles** - Decorative, no usability improvement
3. **Photo Mounted Hover** - Subtle, but may be unnecessary
4. **Float Card Hover** - Subtle, but may be unnecessary

### Recommendation

Consider removing:
- CursorSpotlight (purely decorative)
- AmbientParticles (purely decorative)

Keep:
- Hero animations (brand premium feel)
- Scroll reveal (content discovery)
- Subtle hover effects (usability feedback)

---

## Duplicate Implementations

### Reveal Systems

1. **ScrollReveal** - Framer Motion component
2. **.reveal-up** - CSS class + JavaScript

**Recommendation:** Migrate all to ScrollReveal component for consistency.

---

## Conclusion

**Total Animations:** 18  
**Compliant:** 13  
**Non-Compliant:** 6  
**Decorative (consider removal):** 2

**Next Steps:**
1. Fix CSS transitions for reduced motion
2. Decide on reveal system canonicalization
3. Evaluate decorative animations for removal
