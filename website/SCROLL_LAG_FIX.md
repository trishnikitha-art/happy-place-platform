# Scroll Lag Fix - Root Cause and Resolution

## Issue
Recurring scroll lag that appeared after almost every edit, regardless of CSS gradient changes, Lenis configuration, or animation timing adjustments.

## Root Cause
**CSS `scroll-behavior: smooth` conflicting with Lenis smooth scroll**

The application had both native CSS smooth scrolling and Lenis smooth scroll active simultaneously:
```css
html {
  scroll-behavior: smooth; /* CONFLICTED WITH LENIS */
}
```

When two scroll control systems are active, they compete and cause:
- Conflicting scroll physics
- Overshoot/catch-up behavior
- Perceived lag and stuttering
- Inconsistent scroll behavior across edits

## Resolution
Disabled native CSS smooth scrolling to allow Lenis to control scroll exclusively:
```css
html {
  /* scroll-behavior: smooth; */ /* Disabled to avoid conflict with Lenis */
}
```

## Additional Improvements Made During Investigation

### 1. LenisProvider RAF Cancellation
Added proper `cancelAnimationFrame` in cleanup to prevent RAF loop leaks:
```typescript
let frameId: number;
function raf(time: number) {
  lenisInstance.raf(time);
  frameId = requestAnimationFrame(raf);
}

frameId = requestAnimationFrame(raf);

return () => {
  cancelAnimationFrame(frameId); // Added this
  lenisInstance.destroy();
};
```

### 2. Lenis Configuration
Optimized Lenis settings for better performance:
```typescript
const lenisInstance = new Lenis({
  lerp: 0.25, // Higher lerp = snappier feel
  wheelMultiplier: 0.8, // Reduce wheel sensitivity
  touchMultiplier: 0.8, // Reduce touch sensitivity
  duration: 1.2, // Smoother transitions
});
```

## What Did NOT Cause the Issue
- CSS gradients (radial, linear, mask-image)
- mix-blend-mode
- WorkshopAtmosphere component
- ScrollReveal component
- Framer Motion animations
- Lenis RAF loop (was already properly managed)

## Verification Steps
If scroll lag returns in the future:

1. Check if `html { scroll-behavior: smooth; }` was re-enabled
2. Check console for duplicate LenisProvider mounts (should be 1)
3. Check console for duplicate WorkshopAtmosphere mounts (should be 1 on homepage)
4. Verify Lenis RAF cancellation is still in place
5. Run Chrome DevTools Performance trace to identify bottleneck

## Decision: Keep Lenis
Lenis is worth keeping because:
- Provides premium smooth scroll experience
- Enables synchronized parallax effects
- Modern browsers are good, but Lenis offers more control
- The conflict was with native CSS smooth scroll, not Lenis itself

## Files Modified
- `src/app/globals.css` - Disabled html scroll-behavior smooth
- `src/components/lenis-provider.tsx` - Added RAF cancellation and optimized config
- `src/components/workshop-atmosphere.tsx` - Verified proper cleanup (no changes needed)
- `src/components/scroll-reveal.tsx` - Verified no RAF loops (uses Framer Motion)

## Commit Reference
- b27331b: "Disable html scroll-behavior smooth to avoid Lenis conflict"
- a18392b: "Phase X: Animation Lifecycle Audit - Fix LenisProvider RAF leak"
