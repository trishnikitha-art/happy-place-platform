# Feature Rollback Guide

This document provides procedures for quickly disabling or rolling back any feature implementation.

## Quick Rollback Methods

### Method 1: Feature Flags (Fastest)
All new features are gated through `src/config/feature-flags.ts`.

To disable a feature:
```typescript
// In src/config/feature-flags.ts
export const featureFlags = {
  tapeMeasureProgress: false, // Change to false to disable
  // ...
};
```

### Method 2: Component Comment-Out
If a feature flag wasn't added, comment out the component usage:

```tsx
{/* <TapeMeasureProgress /> */}
```

### Method 3: Git Revert
For complete removal of a feature:
```bash
git revert <commit-hash>
git push
```

---

## Tier 1 Features - Rollback Procedures

### 1. Tape Measure Navigation Progress
**Files to check:**
- `src/components/tape-measure-progress.tsx` (if created)
- `src/app/layout.tsx` (usage location)

**Rollback steps:**
1. Set `featureFlags.tapeMeasureProgress = false`
2. Or comment out component in layout.tsx
3. Or delete component file and remove import

**Impact:** Reverts to standard progress bar or no progress indicator

---

### 2. Pencil Layout Reveal
**Files to check:**
- `src/motion/pencilReveal.ts` (if created)
- Any component using `pencilReveal` variant

**Rollback steps:**
1. Set `featureFlags.pencilLayoutReveal = false`
2. Replace `pencilReveal` with standard `fadeIn` in motion files
3. Or delete motion variant

**Impact:** Sections use standard fade-in instead of pencil mark reveal

---

### 3. Magnetic Buttons
**Files to check:**
- `src/components/magnetic-button.tsx` (if created)
- Any button components using magnetic effect

**Rollback steps:**
1. Set `featureFlags.magneticButtons = false`
2. Replace `MagneticButton` with standard `<button>`
3. Or remove magnetic wrapper from existing buttons

**Impact:** Buttons have standard hover states, no magnetic attraction

---

### 4. Before/After Slider Physics
**Files to check:**
- `src/components/before-after-slider.tsx` (if created)
- Project detail pages using the slider

**Rollback steps:**
1. Set `featureFlags.inertialSlider = false`
2. Remove inertia physics from slider component
3. Or replace with standard before/after component

**Impact:** Slider follows cursor directly without inertia

---

### 5. Project Image Hover
**Files to check:**
- `src/components/project-card.tsx` (if modified)
- Any project image components

**Rollback steps:**
1. Set `featureFlags.projectImageHover = false`
2. Remove hover transforms (lift, shadow, caption slide)
3. Or replace with standard image component

**Impact:** Images have standard hover states or none

---

## Tier 2 Features - Rollback Procedures

### Blueprint Overlay
**Files to check:**
- `src/components/blueprint-overlay.tsx` (if created)
- Project card components

**Rollback:**
1. Set `featureFlags.blueprintOverlay = false`
2. Remove overlay from project cards

---

### Level Bubble
**Files to check:**
- `src/components/level-bubble.tsx` (if created)
- `src/app/layout.tsx` (if mounted globally)

**Rollback:**
1. Set `featureFlags.levelBubble = false`
2. Remove component from layout

---

### Saw Kerf Transition
**Files to check:**
- `src/components/saw-kerf-transition.tsx` (if created)
- Section divider locations

**Rollback:**
1. Set `featureFlags.sawKerfTransition = false`
2. Replace with standard section dividers

---

### Wood Grain Shift
**Files to check:**
- `src/components/hero.tsx` (if modified)
- Hero background components

**Rollback:**
1. Set `featureFlags.woodGrainShift = false`
2. Remove grain shift animation

---

## Tier 3 Features - Rollback Procedures

### Interactive Timeline
**Files to check:**
- `src/components/interactive-timeline.tsx` (if created)
- Process/service pages

**Rollback:**
1. Set `featureFlags.interactiveTimeline = false`
2. Replace with static timeline

---

### Material Selector
**Files to check:**
- `src/components/material-selector.tsx` (if created)
- Deck/service pages

**Rollback:**
1. Set `featureFlags.materialSelector = false`
2. Remove selector, show static material info

---

### Weather-Aware CTA
**Files to check:**
- `src/components/weather-cta.tsx` (if created)
- CTA components

**Rollback:**
1. Set `featureFlags.weatherAwareCTA = false`
2. Revert to static CTA text

---

### Scroll Storytelling
**Files to check:**
- `src/app/projects/[slug]/page.tsx` (if modified)
- Project detail components

**Rollback:**
1. Set `featureFlags.scrollStorytelling = false`
2. Remove scroll-triggered story progression

---

## Tier 4 Features - Rollback Procedures

### Review Pipeline
**Files to check:**
- `src/app/api/reviews/` (if created)
- Database schemas (if modified)
- Review display components

**Rollback:**
1. Set `featureFlags.reviewPipeline = false`
2. Disable API routes
3. Revert to manual review management

**Note:** This feature involves database changes - may require migration rollback

---

### Photo Reviews
**Files to check:**
- Review display components
- Image upload components

**Rollback:**
1. Set `featureFlags.photoReviews = false`
2. Hide before/after photo display

---

### Review Highlights
**Files to check:**
- Review processing logic
- Badge display components

**Rollback:**
1. Set `featureFlags.reviewHighlights = false`
2. Hide auto-generated badges

---

### Neighborhood Map
**Files to check:**
- `src/components/neighborhood-map.tsx` (if created)
- Review pages

**Rollback:**
1. Set `featureFlags.neighborhoodMap = false`
2. Remove map component

---

### Project Explorer
**Files to check:**
- `src/app/projects/` (if restructured)
- Project data schemas
- Filter components

**Rollback:**
1. Set `featureFlags.projectExplorer = false`
2. Revert to standard project gallery
3. May require data structure rollback

---

## Emergency Rollback - All Features

If multiple features cause issues, disable all at once:

```typescript
// In src/config/feature-flags.ts
export const featureFlags = {
  tapeMeasureProgress: false,
  pencilLayoutReveal: false,
  magneticButtons: false,
  inertialSlider: false,
  projectImageHover: false,
  blueprintOverlay: false,
  levelBubble: false,
  sawKerfTransition: false,
  woodGrainShift: false,
  interactiveTimeline: false,
  materialSelector: false,
  weatherAwareCTA: false,
  scrollStorytelling: false,
  reviewPipeline: false,
  photoReviews: false,
  reviewHighlights: false,
  neighborhoodMap: false,
  projectExplorer: false,
} as const;
```

---

## Testing After Rollback

After any rollback:
1. Run `npm run build` to ensure no TypeScript errors
2. Test affected pages locally
3. Check for console errors
4. Verify performance is acceptable
5. Deploy and test in production

---

## Git Strategy for Features

Each feature should be in its own branch:
```
feature/tape-measure-progress
feature/pencil-layout-reveal
feature/magnetic-buttons
```

Merge to main only after testing. If issues arise:
```bash
git revert <merge-commit>
```

This preserves history while removing the problematic feature.
