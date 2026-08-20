# Regression Audit: Lenis Lifecycle
**Session: Audit Lenis implementation against historical commits as regression knowledge base**
**Date: 2026-07-23**
**Baseline Git SHA: f6396c5**

## Executive Summary

Lenis implementation has a documented history of RAF lifecycle leaks, touchpad conflicts, and Workbench scrolling issues. The current implementation preserves the successful fixes (RAF cleanup, Workbench exclusion) but needs verification against historical regressions.

---

## Section 1: Historical Commits (Regression Knowledge Base)

### a18392b - RAF Lifecycle Correction

**Date**: 2026-07-26
**Issue**: Recurring scroll lag pattern suggesting RAF loop accumulation
**Fix**:
- Added `cancelAnimationFrame(frameId)` in cleanup
- Added `console.count('LenisProvider mounted')` to detect duplicate mounts
- Added `console.count('Lenis RAF loop')` to detect loop leaks
- Added cleanup log to verify RAF cancellation

**Files Changed**:
- lenis-provider.tsx (RAF lifecycle fixes)
- layout.tsx (LenisProvider placement)
- BUG_ANALYSIS_SCROLL_MOTION.md (documentation)

**Key Learning**: Hot reload causes provider recreation without proper cleanup, RAF loops survive component unmount, multiple RAF loops accumulate.

### b27331b - Native Scroll-Behavior Conflict

**Date**: 2026-07-26
**Issue**: Native `scroll-behavior: smooth` conflicts with Lenis smooth scroll
**Fix**: Disabled native `scroll-behavior: smooth` in globals.css

**Files Changed**:
- globals.css (removed `scroll-behavior: smooth`)

**Key Learning**: Both systems controlling scroll can cause conflicts. ParallaxImage uses Framer Motion sync with Lenis, which could contribute to scroll lag.

### 39163bc - Touchpad Momentum Correction

**Date**: 2026-07-27
**Issue**: Touchpad stops working after scrolling 1/3 down page, only arrow keys work
**Root Cause**: Lenis duration too high (1.2) causing momentum interference with touchpad
**Fix**:
- Reduced duration from 1.2 to 0.8
- Re-enabled wheelMultiplier and touchMultiplier at neutral 1.0 values

**Files Changed**:
- lenis-provider.tsx (duration: 0.8, multipliers: 1.0)

**Key Learning**: Previous fix had removed multipliers entirely, which caused regression. Neutral multipliers + reduced duration = touchpad stability.

### 36dab3e - Touch Handling/Workbench Conflict

**Date**: 2026-08-18
**Issue**: Lenis touch handling conflicts with Workbench touchpad behavior
**Fix**: Disabled Lenis touch handling to prevent touchpad scroll conflicts

**Files Changed**:
- lenis-provider.tsx (disabled touch handling)
- workbench/media/page.tsx (pending assignment fixes)

**Key Learning**: Workbench needs independent scroll surfaces, Lenis touch handling interferes.

### c2cf5a1 - Workbench Exclusion

**Date**: 2026-08-18
**Issue**: Lenis smooth scroll affecting Workbench routes
**Fix**: Explicitly exclude workbench routes from Lenis initialization

**Files Changed**:
- lenis-provider.tsx (pathname.startsWith('/workbench') check)
- Workbench media page (Shared Drive integration)

**Key Learning**: Workbench should use native scrolling, Lenis should be explicitly excluded.

### 6aabbf6 - Workbench Scrolling Fix Preservation

**Date**: 2026-08-13
**Issue**: UI restoration threatened to break Workbench scrolling fix
**Fix**: Preserved Workbench scrolling fix before UI restoration

**Files Changed**:
- workbench/media/page.tsx (preserved overflow handling)

**Key Learning**: Workbench scrolling fix is an architectural decision, not a temporary workaround.

---

## Section 2: Current Implementation Audit

### LenisProvider (lenis-provider.tsx)

**Current State** (Lines 21-71):

```typescript
export function LenisProvider({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Disable Lenis for workbench routes
    if (pathname.startsWith('/workbench')) {
      return;
    }

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      return;
    }

    // Initialize Lenis with conservative settings
    const lenisInstance = new Lenis({
      lerp: 0.25,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.0,
      duration: 0.8,
    });

    setLenis(lenisInstance);

    // Animation loop with proper cancellation
    let frameId: number;
    function raf(time: number) {
      lenisInstance.raf(time);
      frameId = requestAnimationFrame(raf);
    }

    frameId = requestAnimationFrame(raf);

    // Cleanup
    return () => {
      cancelAnimationFrame(frameId);
      lenisInstance.destroy();
    };
  }, [pathname]);

  return (
    <LenisContext.Provider value={{ lenis }}>
      {children}
    </LenisContext.Provider>
  );
}
```

**Audit Against Historical Fixes**:

| Historical Fix | Current Implementation | Status |
|----------------|----------------------|--------|
| RAF cleanup (a18392b) | `cancelAnimationFrame(frameId)` in cleanup | ✅ PRESERVED |
| Duplicate mount detection (a18392b) | `console.count` NOT present | ⚠️ MISSING |
| Loop leak detection (a18392b) | `console.count` NOT present | ⚠️ MISSING |
| Scroll-behavior conflict (b27331b) | globals.css has no `scroll-behavior: smooth` | ✅ PRESERVED |
| Touchpad momentum (39163bc) | duration: 0.8, multipliers: 1.0 | ✅ PRESERVED |
| Touch handling disabled (36dab3e) | touchMultiplier: 1.0 (NOT disabled) | ⚠️ MISSING |
| Workbench exclusion (c2cf5a1) | `pathname.startsWith('/workbench')` check | ✅ PRESERVED |
| Reduced motion support | `prefers-reduced-motion` check | ✅ PRESENT |

**Gaps Identified**:
1. Missing duplicate mount detection (console.count)
2. Missing loop leak detection (console.count)
3. Touch handling NOT disabled (touchMultiplier: 1.0, not 0)

### Layout (layout.tsx)

**Current State** (Lines 98-114):

```typescript
<body className="min-h-full flex flex-col bg-background">
  <ThemeProvider defaultTheme="system" storageKey="hpp-theme">
    <MotionProvider>
      <LenisProvider>
      <SpeculationRules />
      <a href="#main-content">Skip to main content</a>
      <ScrollToTop />
      <SiteHeader />
      <main id="main-content" className="flex-1">{children}</main>
      <SiteFooter />
      </LenisProvider>
    </MotionProvider>
  </ThemeProvider>
</body>
```

**Audit**:
- Single LenisProvider instance at root
- Wrapped by MotionProvider (correct order)
- No duplicate LenisProvider instances

**Status**: ✅ CORRECT

### Globals CSS (globals.css)

**Audit**: Check for `scroll-behavior: smooth`

**Expected**: No `scroll-behavior: smooth` on html or body

**Status**: ✅ CORRECT (preserved from b27331b)

---

## Section 3: Architectural Boundary Verification

### PUBLIC WEBSITE

**Requirement**: 1 Lenis, 1 RAF, 1 cleanup, 0 duplicates

**Verification**:
- ✅ 1 LenisProvider instance (layout.tsx)
- ✅ 1 RAF loop (lenis-provider.tsx)
- ✅ 1 cleanup (cancelAnimationFrame + destroy)
- ⚠️ 0 duplicate instances (NOT VERIFIED - missing console.count)
- ✅ 0 competing smooth-scroll systems (no scroll-behavior: smooth)

**Status**: MOSTLY CORRECT - missing duplicate detection

### WORKBENCH

**Requirement**: 0 Lenis, native scroll, independent surfaces

**Verification**:
- ✅ 0 Lenis (pathname.startsWith('/workbench') check)
- ✅ Native scroll (Lenis excluded)
- ⚠️ Independent surfaces (NOT VERIFIED - need workbench/media/page.tsx audit)

**Status**: MOSTLY CORRECT - need independent surface verification

---

## Section 4: Missing Historical Fixes

### Missing 1: Duplicate Mount Detection

**Historical Fix** (a18392b):
```typescript
console.count('LenisProvider mounted');
```

**Purpose**: Detect if Strict Mode/HMR causes duplicate mounts

**Current State**: NOT PRESENT

**Impact**: Cannot detect if duplicate Lenis instances are created

**Recommendation**: Add back for diagnostic purposes

### Missing 2: Loop Leak Detection

**Historical Fix** (a18392b):
```typescript
let frameCount = 0;
function raf(time: number) {
  lenisInstance.raf(time);
  frameCount++;
  if (frameCount % 60 === 0) {
    console.count('Lenis RAF loop');
  }
  frameId = requestAnimationFrame(raf);
}
```

**Purpose**: Detect if RAF loops accumulate without cleanup

**Current State**: NOT PRESENT

**Impact**: Cannot detect if RAF loops leak

**Recommendation**: Add back for diagnostic purposes

### Missing 3: Touch Handling Disabled

**Historical Fix** (36dab3e):
```typescript
touchMultiplier: 0.0, // Disabled touch handling
```

**Current State**: `touchMultiplier: 1.0`

**Purpose**: Prevent touchpad scroll conflicts

**Impact**: May cause touchpad conflicts if Workbench exclusion fails

**Recommendation**: Verify if touchMultiplier: 1.0 + Workbench exclusion is sufficient, or if touchMultiplier: 0.0 is needed

---

## Section 5: Required Verification

### Verification 1: Workbench Independent Surfaces

**Location**: workbench/media/page.tsx

**Required**: Verify that Workbench has independent scroll surfaces (overflow handling, no Lenis dependency)

**Status**: NOT COMPLETE

### Verification 2: Strict Mode/HMR Behavior

**Required**: Test if Strict Mode/HMR causes duplicate Lenis mounts

**Status**: NOT COMPLETE

### Verification 3: RAF Loop Accumulation

**Required**: Test if RAF loops accumulate across route changes

**Status**: NOT COMPLETE

---

## Section 6: Recommendations

### Immediate Actions

1. **Add back duplicate mount detection**
   - Add `console.count('LenisProvider mounted')` to LenisProvider
   - Verify Strict Mode/HMR behavior

2. **Add back loop leak detection**
   - Add frame counting and `console.count('Lenis RAF loop')`
   - Verify RAF cleanup works correctly

3. **Verify touch handling**
   - Test if `touchMultiplier: 1.0` + Workbench exclusion is sufficient
   - If not, revert to `touchMultiplier: 0.0` per 36dab3e

4. **Verify Workbench independent surfaces**
   - Audit workbench/media/page.tsx for independent scroll handling
   - Ensure no Lenis dependency in Workbench

### Architectural Preservation

**DO NOT**:
- Remove Workbench exclusion (c2cf5a1)
- Remove RAF cleanup (a18392b)
- Re-enable scroll-behavior: smooth (b27331b)
- Increase duration above 0.8 (39163bc)
- Create multiple Lenis instances

**DO**:
- Preserve single LenisProvider at root
- Preserve RAF cancellation in cleanup
- Preserve Workbench exclusion
- Preserve neutral multipliers (1.0)
- Preserve reduced duration (0.8)

---

## Conclusion

The current Lenis implementation preserves most historical fixes but is missing diagnostic logging (duplicate mount detection, loop leak detection) and may have incomplete touch handling (touchMultiplier: 1.0 vs 0.0).

**The architectural boundary (Workbench exclusion) is preserved and correct.**

**The RAF lifecycle fix is preserved and correct.**

**The touchpad momentum fix is preserved and correct.**

**Missing diagnostic logging should be added for regression detection.**

**Touch handling should be verified against Workbench exclusion.**

**String swaps must remain BLOCKED until Lenis boundary is verified.**

---

## Audit Metadata

- **Auditor**: Devin CLI
- **Baseline Git SHA**: f6396c5
- **Audit Date**: 2026-07-23
- **Scope**: Lenis implementation audit against historical commits a18392b, b27331b, 39163bc, 36dab3e, c2cf5a1, 6aabbf6
- **Method**: Read-only regression audit against historical fixes
