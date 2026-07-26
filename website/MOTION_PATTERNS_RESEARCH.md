# Motion Patterns Research

**Date:** July 26, 2026  
**Project:** Happy Place Carpentry Website  
**Scope:** Research interaction patterns for future implementation

---

## Research Sources

- Motion.dev (Framer Motion documentation)
- Lenis showcase
- Vercel design system
- Linear design system
- Stripe design system
- Codrops
- Aceternity UI
- Magic UI
- 21st.dev

---

## Pattern Categories

### Hero Patterns

#### 1. Parallax Hero Background
**Source:** Vercel, Linear  
**Description:** Background image moves at different speed than foreground content  
**Implementation:** Use Framer Motion's useScroll + useTransform  
**Use Case:** Hero sections, featured content  
**Status:** ✅ Implemented (ParallaxImage component)

#### 2. Text Reveal Stagger
**Source:** Linear, Stripe  
**Description:** Text elements reveal sequentially with staggered timing  
**Implementation:** Use Framer Motion's staggerChildren  
**Use Case:** Hero headlines, feature lists  
**Status:** ✅ Available (heroStagger in motion system)

#### 3. Gradient Overlay Drift
**Source:** Vercel  
**Description:** Subtle gradient overlay moves slowly for depth  
**Implementation:** CSS keyframes or Framer Motion animate  
**Use Case:** Hero backgrounds, dark sections  
**Status:** ⚠️ Partially implemented (CSS heroDrift)

---

### Card Patterns

#### 1. Card Hover Lift
**Source:** Vercel, Linear  
**Description:** Cards lift slightly on hover with shadow increase  
**Implementation:** Framer Motion whileHover + whileTap  
**Use Case:** Service cards, project cards  
**Status:** ✅ Available (hoverLift, cardHover in motion system)

#### 2. Card Stagger Grid
**Source:** Linear, Stripe  
**Description:** Cards in grid reveal with staggered animation  
**Implementation:** Framer Motion staggerChildren  
**Use Case:** Service grids, project galleries  
**Status:** ✅ Available (cardStagger in motion system)

#### 3. Magnetic Card Effect
**Source:** Aceternity UI, Magic UI  
**Description:** Cards follow cursor slightly when hovered  
**Implementation:** Framer Motion useMotionValue + useSpring  
**Use Case:** Featured cards, CTAs  
**Status:** ✅ Available (magneticButton in motion system)

---

### Button Patterns

#### 1. Button Hover Scale
**Source:** Vercel, Stripe  
**Description:** Buttons scale slightly on hover  
**Implementation:** Framer Motion whileHover  
**Use Case:** Primary buttons, secondary buttons  
**Status:** ✅ Available (hoverScale, buttonHover in motion system)

#### 2. Button Shine Effect
**Source:** Stripe, Magic UI  
**Description:** Light sweep effect across button on hover  
**Implementation:** CSS gradient animation or Framer Motion  
**Use Case:** CTA buttons, primary actions  
**Status:** ❌ Not implemented

#### 3. Button Magnetic Effect
**Source:** Aceternity UI  
**Description:** Button follows cursor slightly  
**Implementation:** Framer Motion useMotionValue + useSpring  
**Use Case:** Large CTA buttons  
**Status:** ✅ Available (magneticButton in motion system)

---

### Scroll Patterns

#### 1. Scroll Reveal
**Source:** Vercel, Linear  
**Description:** Elements reveal as they enter viewport  
**Implementation:** Framer Motion whileInView  
**Use Case:** Section content, feature lists  
**Status:** ✅ Implemented (ScrollReveal component)

#### 2. Scroll Progress Bar
**Source:** Linear, Stripe  
**Description:** Progress bar at top shows scroll position  
**Implementation:** Framer Motion useScroll  
**Use Case:** Long-form content, documentation  
**Status:** ❌ Not implemented

#### 3. Parallax Scroll
**Source:** Vercel, Lenis showcase  
**Description:** Elements move at different speeds on scroll  
**Implementation:** Framer Motion useScroll + useTransform  
**Use Case:** Hero images, background elements  
**Status:** ✅ Implemented (ParallaxImage component)

---

### Navigation Patterns

#### 1. Smooth Scroll
**Source:** Lenis showcase, Vercel  
**Description:** Smooth, buttery scroll experience  
**Implementation:** Lenis library  
**Use Case:** Global scroll behavior  
**Status:** ✅ Implemented (LenisProvider)

#### 2. Sticky Header Blur
**Source:** Vercel, Linear  
**Description:** Header blurs background when sticky  
**Implementation:** CSS backdrop-filter + Framer Motion  
**Use Case:** Site header, navigation  
**Status:** ❌ Not implemented

#### 3. Mobile Menu Slide
**Source:** Vercel, Linear  
**Description:** Mobile menu slides in from side  
**Implementation:** Framer Motion AnimatePresence  
**Use Case:** Mobile navigation  
**Status:** ❌ Not implemented

---

### Typography Patterns

#### 1. Text Reveal
**Source:** Linear, Stripe  
**Description:** Text reveals with fade and slide  
**Implementation:** Framer Motion variants  
**Use Case:** Headlines, subheadlines  
**Status:** ✅ Available (headingReveal, bodyReveal in motion system)

#### 2. Character Reveal
**Source:** Stripe, Magic UI  
**Description:** Text reveals character by character  
**Implementation:** Framer Motion stagger on characters  
**Use Case:** Hero headlines, emphasis  
**Status:** ✅ Available (charReveal in motion system)

#### 3. Word Reveal
**Source:** Linear, Vercel  
**Description:** Text reveals word by word  
**Implementation:** Framer Motion stagger on words  
**Use Case:** Hero headlines, feature text  
**Status:** ✅ Available (wordReveal in motion system)

---

### Background Patterns

#### 1. Gradient Mesh
**Source:** Vercel, Stripe  
**Description:** Animated gradient mesh background  
**Implementation:** CSS gradients + Framer Motion  
**Use Case:** Hero backgrounds, dark sections  
**Status:** ❌ Not implemented

#### 2. Particle System
**Source:** Aceternity UI, Magic UI  
**Description:** Floating particles in background  
**Implementation:** Framer Motion or Canvas  
**Use Case:** Hero backgrounds, decorative elements  
**Status:** ✅ Implemented (AmbientParticles component)

#### 3. Grid Pattern
**Source:** Linear, Vercel  
**Description:** Subtle grid pattern background  
**Implementation:** CSS background-image  
**Use Case:** Technical sections, documentation  
**Status**: ❌ Not implemented

---

### Page Transition Patterns

#### 1. Fade Transition
**Source:** Vercel, Linear  
**Description:** Simple fade between pages  
**Implementation:** Framer Motion AnimatePresence  
**Use Case:** Page navigation  
**Status:** ✅ Available (pageFade in motion system)

#### 2. Slide Transition
**Source:** Linear  
**Description:** Content slides in/out on page change  
**Implementation:** Framer Motion AnimatePresence  
**Use Case:** Page navigation  
**Status:** ✅ Available (pageSlideUp in motion system)

#### 3. Scale Transition
**Source:** Stripe  
**Description:** Content scales in/out on page change  
**Implementation:** Framer Motion AnimatePresence  
**Use Case:** Page navigation  
**Status:** ✅ Available (pageScale in motion system)

---

### Form Patterns

#### 1. Input Focus Animation
**Source:** Vercel, Linear  
**Description:** Input border animates on focus  
**Implementation:** CSS transition or Framer Motion  
**Use Case:** Form inputs, search fields  
**Status**: ❌ Not implemented

#### 2. Button Loading State
**Source:** Stripe, Vercel  
**Description:** Button shows loading spinner  
**Implementation:** Framer Motion animate  
**Use Case:** Form submission, async actions  
**Status**: ❌ Not implemented

#### 3. Form Validation Shake
**Source:** Vercel  
**Description:** Invalid form fields shake  
**Implementation:** Framer Motion animate  
**Use Case:** Form validation  
**Status**: ❌ Not implemented

---

### Loading Patterns

#### 1. Skeleton Loader
**Source:** Vercel, Linear  
**Description:** Skeleton screens while loading  
**Implementation:** CSS animation or Framer Motion  
**Use Case:** Page loading, content loading  
**Status**: ❌ Not implemented

#### 2. Progress Bar
**Source:** Stripe, Vercel  
**Description:** Progress bar for loading state  
**Implementation:** Framer Motion animate  
**Use Case:** Page loading, file upload  
**Status**: ❌ Not implemented

#### 3. Spinner
**Source:** Vercel, Linear  
**Description:** Rotating spinner for loading  
**Implementation:** CSS animation or Framer Motion  
**Use Case:** Button loading, async actions  
**Status**: ❌ Not implemented

---

## Implementation Priority

### High Priority (Already Implemented)
- ✅ Parallax Hero Background
- ✅ Text Reveal Stagger
- ✅ Card Hover Lift
- ✅ Card Stagger Grid
- ✅ Button Hover Scale
- ✅ Scroll Reveal
- ✅ Parallax Scroll
- ✅ Smooth Scroll
- ✅ Text Reveal
- ✅ Character Reveal
- ✅ Word Reveal
- ✅ Particle System
- ✅ Fade Transition
- ✅ Slide Transition
- ✅ Scale Transition

### Medium Priority (Consider for Future)
- ⚠️ Gradient Overlay Drift (partially implemented)
- ⚠️ Magnetic Card Effect (available, not used)
- ⚠️ Button Magnetic Effect (available, not used)
- ⚠️ Button Shine Effect (not implemented)
- ⚠️ Sticky Header Blur (not implemented)
- ⚠️ Mobile Menu Slide (not implemented)

### Low Priority (Nice to Have)
- ❌ Scroll Progress Bar
- ❌ Gradient Mesh
- ❌ Grid Pattern
- ❌ Input Focus Animation
- ❌ Button Loading State
- ❌ Form Validation Shake
- ❌ Skeleton Loader
- ❌ Progress Bar
- ❌ Spinner

---

## Licensing Notes

### Open Source Libraries
- **Framer Motion:** MIT License
- **Lenis:** MIT License
- **Aceternity UI:** MIT License
- **Magic UI:** MIT License

### Design Systems
- **Vercel:** Open source design patterns
- **Linear:** Open source design patterns
- **Stripe:** Open source design patterns

### Commercial Use
All patterns researched are from open-source sources or publicly available design systems. No proprietary patterns were copied.

---

## Implementation Guidelines

### When to Implement New Patterns

1. **User Experience Impact:** Does it improve UX?
2. **Performance Impact:** Does it hurt performance?
3. **Bundle Size:** Is it worth the additional code?
4. **Maintenance:** Can we maintain it long-term?
5. **Accessibility:** Does it respect reduced motion?

### Implementation Checklist

- [ ] Check if pattern already exists in motion system
- [ ] Review licensing requirements
- [ ] Test performance impact
- [ ] Test reduced motion behavior
- [ ] Test on mobile devices
- [ ] Document usage in MOTION_SYSTEM.md
- [ ] Update motion tokens if needed

---

## Conclusion

The motion system currently implements **14 high-priority patterns** from the research. 

**Next Steps:**
1. Evaluate medium-priority patterns for implementation
2. Monitor user feedback on current motion system
3. Consider low-priority patterns based on specific use cases
4. Continue researching new patterns as they emerge

**Success Criteria:**
- All high-priority patterns implemented ✅
- Motion system is maintainable ✅
- Performance is optimized ✅
- Accessibility is respected ✅
