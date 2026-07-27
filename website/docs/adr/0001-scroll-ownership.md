# ADR 0001: Scroll Ownership - Lenis vs Native Browser Scrolling

## Status
Accepted

## Context
The Happy Place website experienced recurring scroll lag that appeared after almost every edit, regardless of CSS gradient changes, Lenis configuration, or animation timing adjustments. The issue was difficult to diagnose because:

- Multiple variables were changed during debugging (gradients, Lenis settings, animations)
- The lag appeared to return after unrelated edits
- Initial hypotheses focused on CSS gradients, which were not the root cause

## Decision
**Only one system may control page scroll: either native browser scrolling OR Lenis, never both.**

### Chosen Solution
- **Lenis** is the designated scroll controller for the application
- Native CSS `scroll-behavior: smooth` is permanently disabled while Lenis is active
- Lenis configuration includes proper RAF cancellation to prevent memory leaks

### Configuration
```css
html {
  /* scroll-behavior: smooth; */ /* Disabled - Lenis owns scroll */
}
```

```typescript
// LenisProvider with proper lifecycle management
const lenisInstance = new Lenis({
  lerp: 0.25,
  wheelMultiplier: 0.8,
  touchMultiplier: 0.8,
  duration: 1.2,
});

let frameId: number;
function raf(time: number) {
  lenisInstance.raf(time);
  frameId = requestAnimationFrame(raf);
}

frameId = requestAnimationFrame(raf);

return () => {
  cancelAnimationFrame(frameId); // Critical: prevent RAF leaks
  lenisInstance.destroy();
};
```

## Rationale

### Why Lenis?
- Provides premium smooth scroll experience with configurable physics
- Enables synchronized parallax effects via scroll value access
- Better control over scroll interpolation than native CSS
- Industry-proven solution for premium web experiences
- Compatible with Framer Motion for coordinated animations

### Why Disable Native scroll-behavior?
- Two scroll control systems competing causes conflicts
- Results in overshoot/catch-up behavior and perceived lag
- Inconsistent scroll behavior across edits
- Modern browsers are good, but Lenis offers more control for premium feel

### Why RAF Cancellation is Critical
- Prevents requestAnimationFrame loops from surviving component unmount
- Critical for React Fast Refresh and Strict Mode (development mounts twice)
- Without cancellation, multiple RAF loops accumulate across hot reloads
- This was a contributing factor to the recurring lag pattern

## Consequences

### Positive
- Scroll performance is stable and predictable
- No conflicting scroll physics
- Proper lifecycle management prevents memory leaks
- Clear ownership rule prevents future conflicts
- Lenis provides premium smooth scroll experience

### Negative
- Lenis adds a dependency (but minimal, ~3KB gzipped)
- Requires proper lifecycle management (RAF cancellation)
- If Lenis is ever removed, native smooth scroll must be re-enabled

### Alternatives Considered
1. **Native scroll only**: Would lose premium smooth scroll feel and parallax capabilities
2. **Locomotive Scroll**: More complex setup, heavier than Lenis
3. **GSAP ScrollSmoother**: Commercial license required, overkill for this use case
4. **No smooth scroll**: Would lose premium feel, not aligned with brand positioning

## Enforcement

### Code Review Checklist
- [ ] No `scroll-behavior: smooth` in CSS while LenisProvider is active
- [ ] LenisProvider includes `cancelAnimationFrame(frameId)` in cleanup
- [ ] No components add their own scroll event listeners without coordination
- [ ] Parallax components use Lenis scroll value, not native scroll

### Verification Steps
1. Open Chrome DevTools Performance panel
2. Record while scrolling
3. Check for duplicate "Animation Frame Fired" events (should be one per frame)
4. Verify Paint time is stable (no spikes)
5. Check console for duplicate LenisProvider mounts (should be 1)

### Documentation References
- `SCROLL_LAG_FIX.md` - Detailed root cause analysis and resolution
- `src/app/globals.css` - Contains SCROLL OWNERSHIP comment block
- `src/components/lenis-provider.tsx` - Reference implementation

## Related Decisions
- ADR 0002: (Future) Animation System Architecture
- ADR 0003: (Future) Atmospheric Lighting Strategy

## History
- 2026-07-26: Initial decision after scroll lag investigation
- 2026-07-26: Accepted and documented
