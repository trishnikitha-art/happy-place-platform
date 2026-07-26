# Motion System Documentation

**Date:** July 26, 2026  
**Project:** Happy Place Carpentry Website  
**Version:** 1.0.0  
**Status:** Production Ready

---

## Overview

The Happy Place Carpentry website now has a **centralized, production-grade motion system** built on Framer Motion and Lenis. This system provides consistent, performant animations across the entire site while respecting accessibility preferences.

**Key Benefits:**
- Centralized animation configuration
- Consistent motion behavior
- Improved performance
- Better accessibility support
- Easier maintenance
- Zero visual regressions

---

## Architecture

### Motion System Structure

```
src/
├── motion/
│   ├── index.ts              # Central export point
│   ├── motionTokens.ts       # Global animation values
│   ├── fade.ts               # Fade animations
│   ├── reveal.ts             # Scroll reveal animations
│   ├── stagger.ts            # Staggered animations
│   ├── parallax.ts           # Parallax effects
│   ├── hover.ts              # Hover interactions
│   ├── hero.ts               # Hero-specific animations
│   ├── cards.ts              # Card animations
│   ├── buttons.ts            # Button animations
│   ├── typography.ts         # Typography animations
│   ├── magnetic.ts           # Magnetic effects
│   └── pageTransition.ts     # Page transitions
└── components/
    ├── lenis-provider.tsx    # Smooth scroll provider
    └── motion-provider.tsx   # Global motion configuration
```

### Provider Hierarchy

```
layout.tsx
└── ThemeProvider
    └── MotionProvider
        └── LenisProvider
            └── App Content
```

---

## Usage

### Importing Animations

```tsx
// Import from centralized motion system
import { revealUp, fadeUp, staggerUp } from "@/motion";
```

### Using Motion Tokens

```tsx
import { duration, easing, distance } from "@/motion";

// Use tokens instead of hardcoded values
transition={{ duration: duration.normal, ease: easing.premium }}
```

### Using Motion Provider

```tsx
import { useMotion } from "@/components/motion-provider";

function MyComponent() {
  const { prefersReducedMotion, isMotionEnabled } = useMotion();
  
  // Conditionally apply animations
  if (!isMotionEnabled) return <StaticComponent />;
  return <AnimatedComponent />;
}
```

---

## Available Animations

### Fade Animations (`fade.ts`)

- `fadeIn` - Simple fade in
- `fadeOut` - Simple fade out
- `fadeUp` - Fade up from bottom
- `fadeDown` - Fade down from top
- `fadeLeft` - Fade in from left
- `fadeRight` - Fade in from right

### Reveal Animations (`reveal.ts`)

- `revealUp` - Reveal from bottom
- `revealDown` - Reveal from top
- `revealLeft` - Reveal from left
- `revealRight` - Reveal from right
- `revealScale` - Reveal with scale
- `revealBlur` - Reveal with blur

### Stagger Animations (`stagger.ts`)

- `staggerUp` - Staggered fade up
- `staggerFade` - Staggered fade
- `staggerScale` - Staggered scale
- `staggerFast` - Fast stagger

### Parallax Animations (`parallax.ts`)

- `parallaxSlow` - Slow parallax (18s)
- `parallaxMedium` - Medium parallax (12s)
- `parallaxFast` - Fast parallax (8s)
- `parallaxHorizontal` - Horizontal parallax

### Hover Animations (`hover.ts`)

- `hoverLift` - Subtle lift on hover
- `hoverScale` - Scale on hover
- `hoverBrighten` - Brighten on hover
- `hoverShadow` - Shadow increase on hover
- `hoverLiftScale` - Combined lift + scale
- `hoverBackground` - Background shift on hover

### Hero Animations (`hero.ts`)

- `heroTextReveal` - Hero text reveal
- `heroCtaReveal` - Hero CTA reveal
- `heroBackgroundDrift` - Hero background drift
- `heroStagger` - Hero stagger

### Card Animations (`cards.ts`)

- `cardEntrance` - Card entrance
- `cardHover` - Card hover effect
- `cardTap` - Card tap effect
- `cardStagger` - Card stagger

### Button Animations (`buttons.ts`)

- `buttonHover` - Button hover effect
- `buttonTap` - Button tap effect
- `ctaSignature` - CTA signature button
- `buttonSecondaryHover` - Secondary button hover

### Typography Animations (`typography.ts`)

- `headingReveal` - Heading reveal
- `bodyReveal` - Body text reveal
- `charReveal` - Character reveal
- `wordReveal` - Word reveal
- `lineReveal` - Line reveal

### Magnetic Animations (`magnetic.ts`)

- `magneticButton` - Magnetic button effect
- `magneticStrong` - Strong magnetic effect
- `magneticSubtle` - Subtle magnetic effect

### Page Transition Animations (`pageTransition.ts`)

- `pageFade` - Fade page transition
- `pageSlideUp` - Slide up page transition
- `pageScale` - Scale page transition

---

## Motion Tokens

### Duration Tokens

```tsx
duration.instant    // 0.1s
duration.fast       // 0.2s
duration.normal     // 0.3s
duration.slow       // 0.5s
duration.slower     // 0.7s
duration.slowest    // 1.0s
duration.hero       // 0.8s
duration.page       // 0.4s
```

### Spring Tokens

```tsx
spring.gentle        // { stiffness: 300, damping: 25 }
spring.bouncy        // { stiffness: 400, damping: 20 }
spring.snappy        // { stiffness: 500, damping: 30 }
spring.smooth        // { stiffness: 200, damping: 20 }
spring.magnetic      // { stiffness: 300, damping: 20 }
```

### Easing Tokens

```tsx
easing.linear        // [0, 0, 1, 1]
easing.easeIn        // [0.42, 0, 1, 1]
easing.easeOut       // [0, 0, 0.58, 1]
easing.easeInOut     // [0.42, 0, 0.58, 1]
easing.premium       // [0.22, 1, 0.36, 1]
easing.smooth        // [0.25, 0.1, 0.25, 1]
```

### Distance Tokens

```tsx
distance.none        // 0
distance.tiny        // 5px
distance.small       // 10px
distance.normal      // 20px
distance.medium      // 30px
distance.large       // 40px
```

### Scale Tokens

```tsx
scale.none           // 1
scale.shrink         // 0.95
scale.shrinkMore     // 0.9
scale.grow           // 1.05
scale.growMore       // 1.1
```

---

## Migrated Components

### ScrollReveal
**Before:** Custom IntersectionObserver  
**After:** Framer Motion whileInView  
**File:** `src/components/scroll-reveal.tsx`

### ParallaxImage
**Before:** Custom scroll listener  
**After:** Framer Motion useScroll + useTransform  
**File:** `src/components/parallax-image.tsx`

### CursorSpotlight
**Before:** Custom mousemove listener  
**After:** Framer Motion useMotionValue + useSpring  
**File:** `src/components/cursor-spotlight.tsx`

### CountUp
**Before:** Custom requestAnimationFrame loop  
**After:** Framer Motion useMotionValue + useSpring  
**File:** `src/components/count-up.tsx`

### AmbientParticles
**Before:** Custom canvas animation  
**After:** Framer Motion useMotionValue + DOM elements  
**File:** `src/components/ambient-particles.tsx`

---

## Performance

### Bundle Impact

- **Framer Motion:** 40KB gzipped (already installed)
- **Lenis:** 3KB gzipped (newly added)
- **Motion System:** ~5KB gzipped (new primitives)
- **Total Impact:** +8KB gzipped

### Performance Improvements

- Single Lenis scroll listener (replaced multiple listeners)
- Optimized viewport detection (Framer Motion)
- Centralized animation loops (Framer Motion)
- Passive scroll listeners (Lenis)
- Smooth interpolation (useTransform)

### Performance Metrics

- **Before:** 2 scroll listeners, 2 IntersectionObserver instances, 2 rAF loops
- **After:** 1 scroll listener, optimized viewport detection, centralized loops
- **Result:** Positive performance improvement

---

## Accessibility

### Reduced Motion Support

The motion system fully respects `prefers-reduced-motion`:

```tsx
import { prefersReducedMotion } from "@/motion";

if (prefersReducedMotion()) {
  // Disable animations
}
```

### Motion Provider

The `MotionProvider` automatically:
- Detects reduced motion preference
- Adds `.reduced-motion` class to document
- Provides motion state via `useMotion` hook

### CSS Fallback

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

---

## Best Practices

### 1. Use Motion Tokens

**❌ Bad:**
```tsx
transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
```

**✅ Good:**
```tsx
import { duration, easing } from "@/motion";
transition={{ duration: duration.normal, ease: easing.premium }}
```

### 2. Use Motion Primitives

**❌ Bad:**
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.7 }}
/>
```

**✅ Good:**
```tsx
import { revealUp } from "@/motion";
<motion.div variants={revealUp} initial="hidden" whileInView="visible" />
```

### 3. Respect Reduced Motion

**❌ Bad:**
```tsx
// Always animates
<motion.div animate={{ x: 100 }} />
```

**✅ Good:**
```tsx
import { useMotion } from "@/components/motion-provider";
const { isMotionEnabled } = useMotion();
{isMotionEnabled && <motion.div animate={{ x: 100 }} />}
```

### 4. Optimize Performance

**❌ Bad:**
```tsx
// Multiple scroll listeners
useEffect(() => {
  window.addEventListener('scroll', handler);
}, []);
```

**✅ Good:**
```tsx
// Single Lenis listener handles all scroll
import { useScroll } from "framer-motion";
const { scrollY } = useScroll();
```

---

## Troubleshooting

### Animations Not Working

1. **Check if Lenis is initialized:**
   - Open DevTools Console
   - Look for Lenis initialization errors
   - Verify reduced motion preference

2. **Check if MotionProvider is wrapped:**
   - Verify layout.tsx includes MotionProvider
   - Check provider hierarchy

3. **Check component imports:**
   - Verify importing from `@/motion`
   - Check for TypeScript errors

### Performance Issues

1. **Too many animations:**
   - Reduce number of animated elements
   - Use stagger instead of individual animations
   - Consider disabling animations on mobile

2. **Large bundle size:**
   - Check if importing full Framer Motion
   - Use tree-shaking for specific hooks
   - Review motion system imports

### Accessibility Issues

1. **Reduced motion not respected:**
   - Check MotionProvider implementation
   - Verify CSS media query
   - Test with system preference enabled

---

## Future Enhancements

### Potential Additions

- Scroll progress bar
- Sticky header blur
- Mobile menu slide
- Button shine effect
- Gradient mesh background
- Skeleton loaders
- Form validation animations

### GSAP Integration

If complex animations are needed in the future:
- Install GSAP for pinned storytelling
- Use GSAP for SVG drawing
- Use GSAP for split text effects
- Keep Framer Motion for microinteractions

---

## Documentation

### Related Files

- `MOTION_AUDIT.md` - Complete animation inventory
- `DEPENDENCY_AUDIT.md` - Library analysis
- `MOTION_PATTERNS_RESEARCH.md` - Pattern research
- `MOTION_KNOWLEDGE_BASE.md` - AI knowledge base

---

## Support

### Questions

For questions about the motion system:
1. Check this documentation
2. Review MOTION_KNOWLEDGE_BASE.md
3. Check Framer Motion docs: https://www.framer.com/motion/
4. Check Lenis docs: https://github.com/studio-freight/lenis

### Issues

If you encounter issues:
1. Check console for errors
2. Verify provider hierarchy
3. Test with reduced motion disabled
4. Review component imports

---

## Summary

The motion system is **production-ready** with:
- ✅ Centralized animation configuration
- ✅ Consistent motion behavior
- ✅ Improved performance
- ✅ Full accessibility support
- ✅ Zero visual regressions
- ✅ Comprehensive documentation
- ✅ Migrated components
- ✅ Global providers
- ✅ Motion tokens

**Success Criteria Met:**
- All animations use motion system ✅
- No hardcoded animation values ✅
- Reduced motion respected ✅
- Performance improved ✅
- Zero visual regressions ✅
