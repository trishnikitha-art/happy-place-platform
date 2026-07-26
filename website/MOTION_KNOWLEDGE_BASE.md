# AI Motion Knowledge Base

**Date:** July 26, 2026  
**Project:** Happy Place Carpentry Website  
**Purpose:** Internal catalog for future Oracle workers  
**Scope:** Motion patterns, implementations, and references

---

## Hero Patterns

### Parallax Hero Background
**File:** `src/components/parallax-image.tsx`  
**Motion Primitive:** `src/motion/parallax.ts`  
**Implementation:** Framer Motion useScroll + useTransform  
**Use Case:** Hero sections, featured content  
**Reference:** Vercel, Linear design systems  
**Licensing:** MIT (Framer Motion)  
**Notes:** 
- Speed parameter controls parallax intensity (default 0.3)
- Respects reduced motion preference
- Optimized with passive scroll listeners

### Text Reveal Stagger
**File:** `src/motion/hero.ts`  
**Motion Primitive:** `heroStagger`, `heroStaggerItem`  
**Implementation:** Framer Motion staggerChildren  
**Use Case:** Hero headlines, sequential text reveal  
**Reference:** Linear, Stripe design systems  
**Licensing:** MIT (Framer Motion)  
**Notes:**
- Stagger delay: 0.15s
- Item delay: 0.2s
- Duration: 0.7s
- Easing: premium cubic-bezier

### Hero Background Drift
**File:** `src/motion/hero.ts`  
**Motion Primitive:** `heroBackgroundDrift`  
**Implementation:** Framer Motion animate with repeat  
**Use Case:** Subtle hero background movement  
**Reference:** Vercel design system  
**Licensing:** MIT (Framer Motion)  
**Notes:**
- Duration: 18s (very slow)
- Scale: 1.06 to 1.12
- Y: 0 to -25px
- Repeats infinitely

---

## Cards Patterns

### Card Entrance Animation
**File:** `src/motion/cards.ts`  
**Motion Primitive:** `cardEntrance`  
**Implementation:** Framer Motion variants  
**Use Case:** Card reveal on scroll  
**Reference:** Vercel, Linear design systems  
**Licensing:** MIT (Framer Motion)  
**Notes:**
- Initial: opacity 0, y 20, scale 0.98
- Duration: 0.5s
- Easing: premium cubic-bezier

### Card Hover Effect
**File:** `src/motion/cards.ts`  
**Motion Primitive:** `cardHover`  
**Implementation:** Framer Motion whileHover  
**Use Case:** Interactive card feedback  
**Reference:** Vercel, Linear design systems  
**Licensing:** MIT (Framer Motion)  
**Notes:**
- Lift: -4px
- Scale: 1.02
- Duration: 0.3s
- Easing: premium cubic-bezier

### Card Stagger Grid
**File:** `src/motion/cards.ts`  
**Motion Primitive:** `cardStagger`, `cardStaggerItem`  
**Implementation:** Framer Motion staggerChildren  
**Use Case:** Grid layout card reveal  
**Reference:** Linear, Stripe design systems  
**Licensing:** MIT (Framer Motion)  
**Notes:**
- Stagger delay: 0.1s
- Delay children: 0.2s
- Item duration: 0.5s

---

## Buttons Patterns

### Button Hover Effect
**File:** `src/motion/buttons.ts`  
**Motion Primitive:** `buttonHover`  
**Implementation:** Framer Motion whileHover  
**Use Case:** Interactive button feedback  
**Reference:** Vercel, Stripe design systems  
**Licensing:** MIT (Framer Motion)  
**Notes:**
- Lift: -1px
- Scale: 1.02
- Duration: 0.25s
- Easing: premium cubic-bezier

### CTA Signature Button
**File:** `src/motion/buttons.ts`  
**Motion Primitive:** `ctaSignature`  
**Implementation:** Framer Motion whileHover + shadow transition  
**Use Case:** Primary call-to-action buttons  
**Reference:** Stripe design system  
**Licensing:** MIT (Framer Motion)  
**Notes:**
- Lift: -1px
- Shadow increase on hover
- Duration: 0.25s
- Custom honey shadow

### Magnetic Button Effect
**File:** `src/motion/magnetic.ts`  
**Motion Primitive:** `magneticButton`  
**Implementation:** Framer Motion useMotionValue + useSpring  
**Use Case:** Premium interactive buttons  
**Reference:** Aceternity UI  
**Licensing:** MIT (Aceternity UI)  
**Notes:**
- Spring stiffness: 300
- Spring damping: 20
- Follows cursor slightly

---

## Navigation Patterns

### Smooth Scroll
**File:** `src/components/lenis-provider.tsx`  
**Implementation:** Lenis library  
**Use Case:** Global scroll behavior  
**Reference:** Lenis showcase  
**Licensing:** MIT (Lenis)  
**Notes:**
- Duration: 1.2s
- Custom easing function
- Respects reduced motion
- Disabled on touch devices

---

## Scroll Patterns

### Scroll Reveal
**File:** `src/components/scroll-reveal.tsx`  
**Motion Primitive:** `src/motion/reveal.ts`  
**Implementation:** Framer Motion whileInView  
**Use Case:** Section content reveal  
**Reference:** Vercel, Linear design systems  
**Licensing:** MIT (Framer Motion)  
**Notes:**
- Threshold: 0.1
- Margin: -50px
- Once: true
- Directions: up, down, left, right

### Parallax Scroll
**File:** `src/components/parallax-image.tsx`  
**Motion Primitive:** `src/motion/parallax.ts`  
**Implementation:** Framer Motion useScroll + useTransform  
**Use Case:** Hero images, background elements  
**Reference:** Vercel, Lenis showcase  
**Licensing:** MIT (Framer Motion, Lenis)  
**Notes:**
- Speed parameter controls intensity
- Optimized with useTransform
- Smooth interpolation

---

## Typography Patterns

### Heading Reveal
**File:** `src/motion/typography.ts`  
**Motion Primitive:** `headingReveal`  
**Implementation:** Framer Motion variants  
**Use Case:** Headline animations  
**Reference:** Linear, Stripe design systems  
**Licensing:** MIT (Framer Motion)  
**Notes:**
- Initial: opacity 0, y 30
- Duration: 0.7s
- Easing: premium cubic-bezier

### Body Text Reveal
**File:** `src/motion/typography.ts`  
**Motion Primitive:** `bodyReveal`  
**Implementation:** Framer Motion variants  
**Use Case:** Paragraph animations  
**Reference:** Linear design system  
**Licensing:** MIT (Framer Motion)  
**Notes:**
- Initial: opacity 0, y 15
- Duration: 0.6s
- Easing: premium cubic-bezier

### Character Reveal
**File:** `src/motion/typography.ts`  
**Motion Primitive:** `charReveal`  
**Implementation:** Framer Motion stagger on characters  
**Use Case:** Hero headlines, emphasis  
**Reference:** Stripe, Magic UI  
**Licensing:** MIT (Framer Motion)  
**Notes:**
- Initial: opacity 0, y 10
- Duration: 0.4s
- Easing: premium cubic-bezier

### Word Reveal
**File:** `src/motion/typography.ts`  
**Motion Primitive:** `wordReveal`  
**Implementation:** Framer Motion stagger on words  
**Use Case:** Hero headlines  
**Reference:** Linear, Vercel  
**Licensing:** MIT (Framer Motion)  
**Notes:**
- Initial: opacity 0, y 15
- Duration: 0.5s
- Easing: premium cubic-bezier

---

## Parallax Patterns

### Subtle Parallax
**File:** `src/motion/parallax.ts`  
**Motion Primitive:** `parallaxSlow`  
**Implementation:** Framer Motion animate with repeat  
**Use Case:** Hero backgrounds  
**Reference:** Vercel design system  
**Licensing:** MIT (Framer Motion)  
**Notes:**
- Duration: 18s
- Scale: 1.05 to 1.12
- Y: 0 to -20px
- Repeats infinitely

### Medium Parallax
**File:** `src/motion/parallax.ts`  
**Motion Primitive:** `parallaxMedium`  
**Implementation:** Framer Motion animate with repeat  
**Use Case:** Featured images  
**Reference:** Vercel design system  
**Licensing:** MIT (Framer Motion)  
**Notes:**
- Duration: 12s
- Scale: 1.05 to 1.10
- Y: 0 to -15px
- Repeats infinitely

---

## Backgrounds Patterns

### Particle System
**File:** `src/components/ambient-particles.tsx`  
**Implementation:** Framer Motion useMotionValue + DOM elements  
**Use Case:** Hero backgrounds, decorative elements  
**Reference:** Custom implementation  
**Licensing:** MIT (Framer Motion)  
**Notes:**
- 30 particles by default
- Very slow movement (0.2px per frame)
- Honey color with low opacity
- DOM-based (not canvas)

---

## Page Transition Patterns

### Fade Transition
**File:** `src/motion/pageTransition.ts`  
**Motion Primitive:** `pageFade`  
**Implementation:** Framer Motion AnimatePresence  
**Use Case:** Page navigation  
**Reference:** Vercel, Linear design systems  
**Licensing:** MIT (Framer Motion)  
**Notes:**
- Enter duration: 0.4s
- Exit duration: 0.3s
- Easing: easeOut/easeIn

### Slide Up Transition
**File:** `src/motion/pageTransition.ts`  
**Motion Primitive:** `pageSlideUp`  
**Implementation:** Framer Motion AnimatePresence  
**Use Case:** Page navigation  
**Reference:** Linear design system  
**Licensing:** MIT (Framer Motion)  
**Notes:**
- Enter duration: 0.5s
- Exit duration: 0.3s
- Y: 20 to 0 (enter), 0 to -20 (exit)

### Scale Transition
**File:** `src/motion/pageTransition.ts`  
**Motion Primitive:** `pageScale`  
**Implementation:** Framer Motion AnimatePresence  
**Use Case:** Page navigation  
**Reference:** Stripe design system  
**Licensing:** MIT (Framer Motion)  
**Notes:**
- Enter duration: 0.5s
- Exit duration: 0.3s
- Scale: 0.98 to 1 (enter), 1 to 1.02 (exit)

---

## Loaders Patterns

### Count Up Animation
**File:** `src/components/count-up.tsx`  
**Implementation:** Framer Motion useMotionValue + useSpring  
**Use Case:** Statistics, counters  
**Reference:** Custom implementation  
**Licensing:** MIT (Framer Motion)  
**Notes:**
- Spring stiffness: 100
- Spring damping: 30
- Triggers on viewport entry
- Formats with locale string

---

## Cursor Patterns

### Cursor Spotlight
**File:** `src/components/cursor-spotlight.tsx`  
**Implementation:** Framer Motion useMotionValue + useSpring  
**Use Case:** Premium cursor effect  
**Reference:** Custom implementation  
**Licensing:** MIT (Framer Motion)  
**Notes:**
- Spring stiffness: 300
- Spring damping: 30
- Size: 300px
- Intensity: 0.06
- Follows cursor smoothly

---

## Motion Tokens

### Duration Tokens
**File:** `src/motion/motionTokens.ts`  
**Usage:** Standardized animation durations  
**Values:** instant (0.1s), fast (0.2s), normal (0.3s), slow (0.5s), slower (0.7s), slowest (1.0s)

### Spring Tokens
**File:** `src/motion/motionTokens.ts`  
**Usage:** Standardized spring physics  
**Values:** gentle, bouncy, snappy, smooth, magnetic variants

### Easing Tokens
**File:** `src/motion/motionTokens.ts`  
**Usage:** Standardized easing functions  
**Values:** linear, easeIn, easeOut, easeInOut, premium, smooth, sharp, bounce

### Distance Tokens
**File:** `src/motion/motionTokens.ts`  
**Usage:** Standardized translate distances  
**Values:** none (0), tiny (5px), small (10px), normal (20px), medium (30px), large (40px)

### Scale Tokens
**File:** `src/motion/motionTokens.ts`  
**Usage:** Standardized scale values  
**Values:** none (1), shrink (0.95), shrinkMore (0.9), grow (1.05), growMore (1.1)

---

## Accessibility

### Reduced Motion Support
**File:** `src/components/motion-provider.tsx`  
**Implementation:** Window.matchMedia('(prefers-reduced-motion: reduce)')  
**Behavior:** Disables all animations when user prefers reduced motion  
**Notes:**
- Adds .reduced-motion class to document
- Available via useMotion hook
- Respects system preferences

---

## Implementation Guidelines

### Adding New Patterns

1. **Check Existing:** Search motion system for similar patterns
2. **Use Tokens:** Import from motionTokens.ts for values
3. **Respect Accessibility:** Check reduced motion behavior
4. **Document:** Add entry to this knowledge base
5. **Test:** Verify performance and visual behavior

### Pattern Selection

**Use Framer Motion for:**
- Microinteractions (hover, tap, focus)
- Scroll animations
- Layout animations
- Gesture interactions

**Use Lenis for:**
- Global smooth scroll
- Parallax performance
- Scroll-linked animations

**Use GSAP for:**
- Complex timelines (if needed in future)
- SVG drawing (if needed in future)
- Split text (if needed in future)

---

## Performance Notes

### Optimizations Implemented
- Passive scroll listeners
- useTransform for smooth interpolation
- useSpring for natural motion
- Single Lenis scroll listener
- Optimized viewport detection

### Bundle Impact
- Framer Motion: 40KB gzipped (already installed)
- Lenis: 3KB gzipped (newly added)
- Motion system: ~5KB gzipped (new primitives)
- Total: +8KB gzipped

### Performance Impact
- Positive: Fewer listeners, optimized libraries
- Positive: Centralized animation loops
- Positive: Better viewport detection
- Neutral: Slightly larger bundle

---

## Licensing Summary

All motion patterns use:
- **Framer Motion:** MIT License
- **Lenis:** MIT License
- **Custom Implementations:** MIT License (project)

No proprietary patterns copied. All references are from open-source design systems or publicly available documentation.

---

## Maintenance Notes

### When to Update
- New Framer Motion features released
- New Lenis features released
- Performance issues identified
- User feedback on animations
- New patterns needed for features

### Version Control
- Motion system in `src/motion/`
- Components in `src/components/`
- Tokens in `src/motion/motionTokens.ts`
- Documentation in this file

### Testing Checklist
- [ ] Visual regression testing
- [ ] Performance testing
- [ ] Reduced motion testing
- [ ] Mobile device testing
- [ ] Cross-browser testing
