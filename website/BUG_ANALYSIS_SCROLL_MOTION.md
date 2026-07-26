# Happy Place Platform — Scroll & Motion Bug Analysis

## Scope
This analysis evaluates the Happy Place Platform website for scroll, motion, and atmospheric bug risk during restore and performance regression work.

## Current Baseline
- `src/app/layout.tsx` wraps the app in `<MotionProvider>`.
- `LenisProvider` is currently commented out.
- This means the active runtime baseline is: native browser scroll + Framer Motion reveals + custom CSS atmosphere.
- `html { scroll-behavior: smooth; }` is enabled globally.

## High-Risk Files Identified
- `src/components/lenis-provider.tsx`
- `src/components/workshop-atmosphere.tsx`
- `src/components/scroll-reveal.tsx`
- `src/components/parallax-image.tsx`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/components/scroll-to-top.tsx`

## Findings

### 1. `src/app/layout.tsx`
- `MotionProvider` is enabled.
- `LenisProvider` is intentionally disabled via commented JSX.
- This confirms the safe baseline is the current live site without Lenis active.

### 2. `src/components/lenis-provider.tsx`
- Lenis is configured with:
  - `lerp: 0.25`
  - `wheelMultiplier: 0.8`
  - `touchMultiplier: 0.8`
  - `duration: 1.2`
- The component installs a RAF loop and calls `lenisInstance.raf(time)` on every frame.
- It does not currently use a `cancelAnimationFrame` on cleanup; it relies on `lenisInstance.destroy()` only.
- This component is currently disabled in layout, so it is not contributing to live behavior.

### 3. `src/components/workshop-atmosphere.tsx`
- Uses one `requestAnimationFrame` loop to animate particles in a canvas.
- Uses `ResizeObserver` to resize the canvas.
- It is active in the homepage hero via `<WorkshopAtmosphere particleCount={20} />`.
- This is a single animated visual layer and is the top candidate for stepwise restoration.

### 4. `src/components/scroll-reveal.tsx`
- Uses Framer Motion with `whileInView="visible"` and `viewport={{ once: true, margin: "-50px" }}`.
- This is an intersection-based reveal, not a constant per-frame scroll poll.
- It is widely used throughout `src/app/page.tsx` and `src/app/our-work/OurWorkClient.tsx`.
- It is a controlled motion layer, but still a candidate for regression auditing because it is active on page load and scroll.

### 5. `src/components/parallax-image.tsx`
- Syncs Lenis scroll values to Framer Motion with `useMotionValue`.
- This is a high-risk integration because it couples Lenis with motion transforms.
- I did not find evidence of `ParallaxImage` being used in the homepage or `our-work` pages.
- It may be an inactive or future risk surface.

### 6. `src/app/globals.css`
- Defines global `scroll-behavior: smooth`.
- Declares atmospheric gradients and hero lighting CSS.
- This file is high-risk because changes here affect scroll physics and paint cost across the entire site.

### 7. `src/components/scroll-to-top.tsx`
- Calls `window.scrollTo({ top: 0, left: 0, behavior: "instant" })` on route change.
- This is fine, and it avoids stacked browser smooth-scroll animation on navigation.

## Usage Summary
- `WorkshopAtmosphere` is actively used in the homepage hero.
- `ScrollReveal` is actively used across homepage sections and the our-work page.
- `LenisProvider` is disabled in layout, so Lenis is currently not part of the live path.
- `ParallaxImage` exists but currently appears unused.

## Root Cause Hypothesis
The recurring regressions likely stem from an incomplete restoration process:
- atmosphere and motion systems are being re-enabled piecemeal,
- without an explicit audit for high-risk files,
- and without a strict baseline check after each restore step.

Because `LenisProvider` is currently disabled, the remaining issue is probably not native browser scroll itself; it is more likely a regression in the restore path or stale deployment of earlier code.

## Recommended Restore Plan
1. Restore atmospheric CSS and the current `WorkshopAtmosphere` layer only.
2. Verify performance before enabling any scroll driver or parallax.
3. Keep `LenisProvider` disabled until all visual layers are confirmed safe.
4. Use `ScrollReveal` sparingly and audit its impact if the homepage still feels janky.
5. Add the Phase 7 regression audit workflow to the repo before re-enabling `LenisProvider`.

## Immediate Actionable Fixes
- Keep `LenisProvider` commented out in `src/app/layout.tsx` until after verification.
- Confirm `WorkshopAtmosphere` is the only live animated canvas layer.
- Ensure `globals.css` atmospheric gradients remain subtle and do not add extra blur layers.
- Do not enable `ParallaxImage` until Lenis is stable and proven safe.

## Conclusion
The current bug is not obviously caused by a hidden extra `addEventListener('scroll')` or duplicate `requestAnimationFrame` loop in the live homepage path. The most likely source of future regressions is restoration without audit, especially around `lenis-provider.tsx` and `globals.css`.

If you want, I can now produce a small mitigation patch that:
- keeps `LenisProvider` off,
- centralizes `WorkshopAtmosphere` as a single canvas layer,
- and adds a `TODO: Phase 7 regression audit required` comment in `src/app/layout.tsx` and `globals.css`.
